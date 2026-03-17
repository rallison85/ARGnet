import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { body, validationResult } from 'express-validator';
import db from '../db/index.js';
import { authenticate, requireProjectAccess, AuthRequest } from '../middleware/auth.js';
import { logActivity } from '../utils/activity.js';

const router = Router({ mergeParams: true });

// Configure multer for file uploads
const uploadDir = process.env.UPLOAD_DIR || './uploads';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const projectDir = path.join(uploadDir, (req as AuthRequest).params.projectId);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }
    cb(null, projectDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800') // 50MB default
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'video/mp4', 'video/webm', 'video/quicktime',
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm',
      'application/pdf', 'application/zip', 'application/x-zip-compressed',
      'text/plain', 'text/html', 'text/css', 'text/javascript',
      'application/json', 'application/xml',
      'font/ttf', 'font/otf', 'font/woff', 'font/woff2'
    ];

    if (allowedTypes.includes(file.mimetype) || file.mimetype.startsWith('text/')) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  }
});

// Determine asset type from mime type
function getAssetType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('font/')) return 'font';
  if (mimeType === 'application/pdf' || mimeType.startsWith('text/')) return 'document';
  if (mimeType.includes('zip')) return 'archive';
  return 'other';
}

// List assets
router.get('/', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const { asset_type, category, status } = req.query;

  let query = `
    SELECT
      a.*,
      u.username as uploaded_by_username,
      u.display_name as uploaded_by_name
    FROM assets a
    LEFT JOIN users u ON u.id = a.uploaded_by
    WHERE a.project_id = ?
  `;

  const params: string[] = [req.params.projectId];

  if (asset_type) {
    query += ' AND a.asset_type = ?';
    params.push(asset_type as string);
  }
  if (category) {
    query += ' AND a.category = ?';
    params.push(category as string);
  }
  if (status) {
    query += ' AND a.status = ?';
    params.push(status as string);
  }

  query += ' ORDER BY a.created_at DESC';

  const assets = db.prepare(query).all(...params);

  res.json((assets as Record<string, unknown>[]).map(a => ({
    ...a,
    tags: a.tags ? JSON.parse(a.tags as string) : [],
    used_in: a.used_in ? JSON.parse(a.used_in as string) : []
  })));
});

// Upload asset
router.post('/', authenticate, requireProjectAccess('contributor'), upload.single('file'), (req: AuthRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const { name, description, category, tags, status } = req.body;
  const assetType = getAssetType(req.file.mimetype);

  const assetId = uuidv4();
  const filePath = `/uploads/${req.params.projectId}/${req.file.filename}`;

  db.prepare(`
    INSERT INTO assets (
      id, project_id, name, asset_type, file_path, file_size, mime_type,
      description, tags, category, status, uploaded_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    assetId,
    req.params.projectId,
    name || req.file.originalname,
    assetType,
    filePath,
    req.file.size,
    req.file.mimetype,
    description || null,
    tags ? JSON.stringify(Array.isArray(tags) ? tags : JSON.parse(tags)) : null,
    category || null,
    status || 'draft',
    req.user!.id
  );

  logActivity(req.params.projectId, req.user!.id, 'uploaded', 'asset', assetId, name || req.file.originalname);

  const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(assetId) as Record<string, unknown>;
  res.status(201).json({
    ...asset,
    tags: asset.tags ? JSON.parse(asset.tags as string) : [],
    used_in: asset.used_in ? JSON.parse(asset.used_in as string) : []
  });
});

// Get single asset
router.get('/:assetId', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const asset = db.prepare(`
    SELECT
      a.*,
      u.username as uploaded_by_username,
      u.display_name as uploaded_by_name
    FROM assets a
    LEFT JOIN users u ON u.id = a.uploaded_by
    WHERE a.id = ? AND a.project_id = ?
  `).get(req.params.assetId, req.params.projectId) as Record<string, unknown> | undefined;

  if (!asset) {
    res.status(404).json({ error: 'Asset not found' });
    return;
  }

  // Get version history
  const versions = db.prepare(`
    SELECT id, name, version, file_path, created_at
    FROM assets
    WHERE parent_asset_id = ?
    ORDER BY version DESC
  `).all(req.params.assetId);

  res.json({
    ...asset,
    tags: asset.tags ? JSON.parse(asset.tags as string) : [],
    used_in: asset.used_in ? JSON.parse(asset.used_in as string) : [],
    versions
  });
});

// Update asset metadata
router.patch('/:assetId', authenticate, requireProjectAccess('contributor'), (req: AuthRequest, res: Response) => {
  const allowedFields = ['name', 'description', 'category', 'status'];
  const updates: string[] = [];
  const values: (string | null)[] = [];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(req.body[field]);
    }
  }

  if (req.body.tags !== undefined) {
    updates.push('tags = ?');
    values.push(JSON.stringify(req.body.tags));
  }

  if (req.body.used_in !== undefined) {
    updates.push('used_in = ?');
    values.push(JSON.stringify(req.body.used_in));
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(req.params.assetId);
  values.push(req.params.projectId);

  db.prepare(`
    UPDATE assets SET ${updates.join(', ')} WHERE id = ? AND project_id = ?
  `).run(...values);

  const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.assetId) as Record<string, unknown>;
  res.json({
    ...asset,
    tags: asset.tags ? JSON.parse(asset.tags as string) : [],
    used_in: asset.used_in ? JSON.parse(asset.used_in as string) : []
  });
});

// Upload new version
router.post('/:assetId/version', authenticate, requireProjectAccess('contributor'), upload.single('file'), (req: AuthRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  // Get current asset
  const currentAsset = db.prepare('SELECT * FROM assets WHERE id = ? AND project_id = ?')
    .get(req.params.assetId, req.params.projectId) as Record<string, unknown> | undefined;

  if (!currentAsset) {
    res.status(404).json({ error: 'Asset not found' });
    return;
  }

  const newVersion = ((currentAsset.version as number) || 1) + 1;
  const assetType = getAssetType(req.file.mimetype);
  const filePath = `/uploads/${req.params.projectId}/${req.file.filename}`;

  const newAssetId = uuidv4();

  db.prepare(`
    INSERT INTO assets (
      id, project_id, name, asset_type, file_path, file_size, mime_type,
      description, tags, category, status, version, parent_asset_id, uploaded_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    newAssetId,
    req.params.projectId,
    currentAsset.name,
    assetType,
    filePath,
    req.file.size,
    req.file.mimetype,
    currentAsset.description,
    currentAsset.tags,
    currentAsset.category,
    'draft',
    newVersion,
    req.params.assetId,
    req.user!.id
  );

  // Update main asset reference
  db.prepare(`
    UPDATE assets SET
      file_path = ?,
      file_size = ?,
      mime_type = ?,
      version = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(filePath, req.file.size, req.file.mimetype, newVersion, req.params.assetId);

  logActivity(req.params.projectId, req.user!.id, 'updated_version', 'asset', req.params.assetId, currentAsset.name as string);

  const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.assetId) as Record<string, unknown>;
  res.json({
    ...asset,
    tags: asset.tags ? JSON.parse(asset.tags as string) : [],
    used_in: asset.used_in ? JSON.parse(asset.used_in as string) : []
  });
});

// Delete asset
router.delete('/:assetId', authenticate, requireProjectAccess('lead'), (req: AuthRequest, res: Response) => {
  const asset = db.prepare('SELECT file_path FROM assets WHERE id = ? AND project_id = ?')
    .get(req.params.assetId, req.params.projectId) as { file_path: string } | undefined;

  if (!asset) {
    res.status(404).json({ error: 'Asset not found' });
    return;
  }

  // Delete file from disk
  const fullPath = path.join(process.cwd(), asset.file_path);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }

  // Delete version files
  const versions = db.prepare('SELECT file_path FROM assets WHERE parent_asset_id = ?').all(req.params.assetId) as Array<{ file_path: string }>;
  for (const version of versions) {
    const versionPath = path.join(process.cwd(), version.file_path);
    if (fs.existsSync(versionPath)) {
      fs.unlinkSync(versionPath);
    }
  }

  // Delete from database
  db.prepare('DELETE FROM assets WHERE parent_asset_id = ?').run(req.params.assetId);
  db.prepare('DELETE FROM assets WHERE id = ?').run(req.params.assetId);

  logActivity(req.params.projectId, req.user!.id, 'deleted', 'asset', req.params.assetId);

  res.json({ message: 'Asset deleted' });
});

export default router;
