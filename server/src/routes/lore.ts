import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';
import db from '../db/index.js';
import { authenticate, requireProjectAccess, AuthRequest } from '../middleware/auth.js';
import { logActivity } from '../utils/activity.js';

const router = Router({ mergeParams: true });

// List lore entries
router.get('/', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const { category, is_public } = req.query;

  let query = `
    SELECT
      le.*,
      u.username as created_by_username,
      u.display_name as created_by_name,
      (SELECT COUNT(*) FROM lore_entries WHERE parent_id = le.id) as children_count
    FROM lore_entries le
    LEFT JOIN users u ON u.id = le.created_by
    WHERE le.project_id = ?
  `;

  const params: (string | number)[] = [req.params.projectId];

  if (category) {
    query += ' AND le.category = ?';
    params.push(category as string);
  }
  if (is_public !== undefined) {
    query += ' AND le.is_public = ?';
    params.push(is_public === 'true' ? 1 : 0);
  }

  query += ' ORDER BY le.category ASC, le.title ASC';

  const entries = db.prepare(query).all(...params);

  res.json(entries.map(e => ({
    ...e,
    related_characters: (e as { related_characters: string | null }).related_characters ? JSON.parse((e as { related_characters: string }).related_characters) : [],
    related_locations: (e as { related_locations: string | null }).related_locations ? JSON.parse((e as { related_locations: string }).related_locations) : [],
    tags: (e as { tags: string | null }).tags ? JSON.parse((e as { tags: string }).tags) : []
  })));
});

// Get lore tree (hierarchical)
router.get('/tree', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const entries = db.prepare(`
    SELECT
      le.*,
      u.username as created_by_username
    FROM lore_entries le
    LEFT JOIN users u ON u.id = le.created_by
    WHERE le.project_id = ?
    ORDER BY le.category ASC, le.title ASC
  `).all(req.params.projectId) as Array<{
    id: string;
    parent_id: string | null;
    [key: string]: unknown;
  }>;

  // Group by category first, then build tree
  const categories = new Map<string, unknown[]>();

  entries.forEach(entry => {
    const category = (entry.category as string) || 'uncategorized';
    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category)!.push({
      ...entry,
      related_characters: entry.related_characters ? JSON.parse(entry.related_characters as string) : [],
      related_locations: entry.related_locations ? JSON.parse(entry.related_locations as string) : [],
      tags: entry.tags ? JSON.parse(entry.tags as string) : []
    });
  });

  res.json(Object.fromEntries(categories));
});

// Create lore entry
router.post('/', authenticate, requireProjectAccess('contributor'), [
  body('title').notEmpty().isLength({ max: 200 }),
  body('category').optional().isLength({ max: 50 })
], (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const {
    title, parent_id, category, content, is_public, revelation_trigger,
    related_characters, related_locations, tags
  } = req.body;

  const entryId = uuidv4();

  db.prepare(`
    INSERT INTO lore_entries (
      id, project_id, parent_id, title, category, content, is_public,
      revelation_trigger, related_characters, related_locations, tags, created_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    entryId,
    req.params.projectId,
    parent_id || null,
    title,
    category || null,
    content || null,
    is_public ? 1 : 0,
    revelation_trigger || null,
    related_characters ? JSON.stringify(related_characters) : null,
    related_locations ? JSON.stringify(related_locations) : null,
    tags ? JSON.stringify(tags) : null,
    req.user!.id
  );

  logActivity(req.params.projectId, req.user!.id, 'created', 'lore_entry', entryId, title);

  const entry = db.prepare('SELECT * FROM lore_entries WHERE id = ?').get(entryId);
  res.status(201).json({
    ...entry,
    related_characters: (entry as { related_characters: string | null }).related_characters ? JSON.parse((entry as { related_characters: string }).related_characters) : [],
    related_locations: (entry as { related_locations: string | null }).related_locations ? JSON.parse((entry as { related_locations: string }).related_locations) : [],
    tags: (entry as { tags: string | null }).tags ? JSON.parse((entry as { tags: string }).tags) : []
  });
});

// Get single lore entry
router.get('/:entryId', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const entry = db.prepare(`
    SELECT
      le.*,
      u.username as created_by_username,
      u.display_name as created_by_name,
      p.title as parent_title
    FROM lore_entries le
    LEFT JOIN users u ON u.id = le.created_by
    LEFT JOIN lore_entries p ON p.id = le.parent_id
    WHERE le.id = ? AND le.project_id = ?
  `).get(req.params.entryId, req.params.projectId) as Record<string, unknown> | undefined;

  if (!entry) {
    res.status(404).json({ error: 'Lore entry not found' });
    return;
  }

  // Get children
  const children = db.prepare(`
    SELECT id, title, category, is_public
    FROM lore_entries
    WHERE parent_id = ?
    ORDER BY title ASC
  `).all(req.params.entryId);

  // Get related characters details
  let characters: unknown[] = [];
  if (entry.related_characters) {
    const charIds = JSON.parse(entry.related_characters as string);
    if (charIds.length > 0) {
      const placeholders = charIds.map(() => '?').join(',');
      characters = db.prepare(`
        SELECT id, name, character_type, avatar_url
        FROM characters
        WHERE id IN (${placeholders})
      `).all(...charIds);
    }
  }

  // Get related locations details
  let locations: unknown[] = [];
  if (entry.related_locations) {
    const locIds = JSON.parse(entry.related_locations as string);
    if (locIds.length > 0) {
      const placeholders = locIds.map(() => '?').join(',');
      locations = db.prepare(`
        SELECT id, name, location_type
        FROM locations
        WHERE id IN (${placeholders})
      `).all(...locIds);
    }
  }

  res.json({
    ...entry,
    related_characters: entry.related_characters ? JSON.parse(entry.related_characters as string) : [],
    related_locations: entry.related_locations ? JSON.parse(entry.related_locations as string) : [],
    tags: entry.tags ? JSON.parse(entry.tags as string) : [],
    children,
    characters,
    locations
  });
});

// Update lore entry
router.patch('/:entryId', authenticate, requireProjectAccess('contributor'), (req: AuthRequest, res: Response) => {
  const allowedFields = ['title', 'parent_id', 'category', 'content', 'is_public', 'revelation_trigger'];
  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      if (field === 'is_public') {
        values.push(req.body[field] ? 1 : 0);
      } else {
        values.push(req.body[field]);
      }
    }
  }

  // Handle JSON fields
  if (req.body.related_characters !== undefined) {
    updates.push('related_characters = ?');
    values.push(JSON.stringify(req.body.related_characters));
  }
  if (req.body.related_locations !== undefined) {
    updates.push('related_locations = ?');
    values.push(JSON.stringify(req.body.related_locations));
  }
  if (req.body.tags !== undefined) {
    updates.push('tags = ?');
    values.push(JSON.stringify(req.body.tags));
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(req.params.entryId);
  values.push(req.params.projectId);

  db.prepare(`
    UPDATE lore_entries SET ${updates.join(', ')} WHERE id = ? AND project_id = ?
  `).run(...values);

  logActivity(req.params.projectId, req.user!.id, 'updated', 'lore_entry', req.params.entryId, req.body.title);

  const entry = db.prepare('SELECT * FROM lore_entries WHERE id = ?').get(req.params.entryId);
  res.json({
    ...entry,
    related_characters: (entry as { related_characters: string | null }).related_characters ? JSON.parse((entry as { related_characters: string }).related_characters) : [],
    related_locations: (entry as { related_locations: string | null }).related_locations ? JSON.parse((entry as { related_locations: string }).related_locations) : [],
    tags: (entry as { tags: string | null }).tags ? JSON.parse((entry as { tags: string }).tags) : []
  });
});

// Delete lore entry
router.delete('/:entryId', authenticate, requireProjectAccess('lead'), (req: AuthRequest, res: Response) => {
  // Update children to have no parent
  db.prepare('UPDATE lore_entries SET parent_id = NULL WHERE parent_id = ?').run(req.params.entryId);

  db.prepare('DELETE FROM lore_entries WHERE id = ? AND project_id = ?')
    .run(req.params.entryId, req.params.projectId);

  logActivity(req.params.projectId, req.user!.id, 'deleted', 'lore_entry', req.params.entryId);

  res.json({ message: 'Lore entry deleted' });
});

export default router;
