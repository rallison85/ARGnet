import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';
import db from '../db/index.js';
import { authenticate, requireProjectAccess, AuthRequest } from '../middleware/auth.js';
import { logActivity } from '../utils/activity.js';

const router = Router({ mergeParams: true });

// List digital properties
router.get('/', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const { property_type, status, platform } = req.query;

  let query = `
    SELECT
      dp.*,
      c.name as owner_character_name,
      u.username as created_by_username,
      u.display_name as created_by_name
    FROM digital_properties dp
    LEFT JOIN characters c ON c.id = dp.character_id
    LEFT JOIN users u ON u.id = dp.created_by
    WHERE dp.project_id = ?
  `;

  const params: string[] = [req.params.projectId];

  if (property_type) {
    query += ' AND dp.property_type = ?';
    params.push(property_type as string);
  }
  if (status) {
    query += ' AND dp.status = ?';
    params.push(status as string);
  }
  if (platform) {
    query += ' AND dp.platform = ?';
    params.push(platform as string);
  }

  query += ' ORDER BY dp.name ASC';

  const properties = db.prepare(query).all(...params);

  // Don't expose credentials in list view
  res.json(properties.map(p => {
    const prop = { ...p } as Record<string, unknown>;
    delete prop.credentials;
    return prop;
  }));
});

// Create digital property
router.post('/', authenticate, requireProjectAccess('contributor'), [
  body('name').notEmpty().isLength({ max: 100 }),
  body('property_type').isIn(['website', 'social_media', 'email', 'phone', 'app', 'document', 'video_channel', 'podcast', 'other'])
], (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const {
    name, property_type, url, platform, username, description, purpose,
    content_guidelines, posting_schedule, credentials, owner_character_id,
    status, launch_date
  } = req.body;

  const propertyId = uuidv4();

  db.prepare(`
    INSERT INTO digital_properties (
      id, project_id, name, property_type, url, platform, username, description,
      purpose, content_guidelines, posting_schedule, credentials, character_id,
      status, launch_date, created_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    propertyId,
    req.params.projectId,
    name,
    property_type,
    url || null,
    platform || null,
    username || null,
    description || null,
    purpose || null,
    content_guidelines || null,
    posting_schedule || null,
    credentials ? JSON.stringify(credentials) : null,
    owner_character_id || null,
    status || 'planning',
    launch_date || null,
    req.user!.id
  );

  logActivity(req.params.projectId, req.user!.id, 'created', 'digital_property', propertyId, name);

  const property = db.prepare('SELECT * FROM digital_properties WHERE id = ?').get(propertyId) as Record<string, unknown>;
  delete property.credentials;

  res.status(201).json(property);
});

// Get single digital property
router.get('/:propertyId', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const property = db.prepare(`
    SELECT
      dp.*,
      c.name as owner_character_name,
      c.avatar_url as owner_character_avatar,
      u.username as created_by_username,
      u.display_name as created_by_name
    FROM digital_properties dp
    LEFT JOIN characters c ON c.id = dp.character_id
    LEFT JOIN users u ON u.id = dp.created_by
    WHERE dp.id = ? AND dp.project_id = ?
  `).get(req.params.propertyId, req.params.projectId) as Record<string, unknown> | undefined;

  if (!property) {
    res.status(404).json({ error: 'Digital property not found' });
    return;
  }

  // Only show credentials to leads and above
  if (req.projectRole !== 'owner' && req.projectRole !== 'admin' && req.projectRole !== 'lead') {
    delete property.credentials;
  } else if (property.credentials) {
    property.credentials = JSON.parse(property.credentials as string);
  }

  res.json(property);
});

// Update digital property
router.patch('/:propertyId', authenticate, requireProjectAccess('contributor'), (req: AuthRequest, res: Response) => {
  const allowedFields = [
    'name', 'property_type', 'url', 'platform', 'username', 'description',
    'purpose', 'content_guidelines', 'posting_schedule', 'character_id',
    'status', 'launch_date'
  ];

  const updates: string[] = [];
  const values: (string | null)[] = [];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(req.body[field]);
    }
  }

  // Only leads and above can update credentials
  if (req.body.credentials !== undefined) {
    if (req.projectRole !== 'owner' && req.projectRole !== 'admin' && req.projectRole !== 'lead') {
      res.status(403).json({ error: 'Only leads and above can update credentials' });
      return;
    }
    updates.push('credentials = ?');
    values.push(JSON.stringify(req.body.credentials));
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(req.params.propertyId);
  values.push(req.params.projectId);

  db.prepare(`
    UPDATE digital_properties SET ${updates.join(', ')} WHERE id = ? AND project_id = ?
  `).run(...values);

  logActivity(req.params.projectId, req.user!.id, 'updated', 'digital_property', req.params.propertyId, req.body.name);

  const property = db.prepare('SELECT * FROM digital_properties WHERE id = ?').get(req.params.propertyId) as Record<string, unknown>;
  delete property.credentials;

  res.json(property);
});

// Delete digital property
router.delete('/:propertyId', authenticate, requireProjectAccess('lead'), (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM digital_properties WHERE id = ? AND project_id = ?')
    .run(req.params.propertyId, req.params.projectId);

  logActivity(req.params.projectId, req.user!.id, 'deleted', 'digital_property', req.params.propertyId);

  res.json({ message: 'Digital property deleted' });
});

export default router;
