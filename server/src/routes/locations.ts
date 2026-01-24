import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';
import db from '../db/index.js';
import { authenticate, requireProjectAccess, AuthRequest } from '../middleware/auth.js';
import { logActivity } from '../utils/activity.js';

const router = Router({ mergeParams: true });

// List locations
router.get('/', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const { location_type, status } = req.query;

  let query = `
    SELECT
      l.*,
      (SELECT COUNT(*) FROM events WHERE location_id = l.id) as event_count,
      (SELECT COUNT(*) FROM story_beats WHERE location_id = l.id) as story_beat_count
    FROM locations l
    WHERE l.project_id = ?
  `;

  const params: string[] = [req.params.projectId];

  if (location_type) {
    query += ' AND l.location_type = ?';
    params.push(location_type as string);
  }
  if (status) {
    query += ' AND l.status = ?';
    params.push(status as string);
  }

  query += ' ORDER BY l.name ASC';

  const locations = db.prepare(query).all(...params);

  res.json(locations.map(loc => ({
    ...loc,
    imagery: (loc as { imagery: string | null }).imagery ? JSON.parse((loc as { imagery: string }).imagery) : [],
    events: (loc as { events: string | null }).events ? JSON.parse((loc as { events: string }).events) : []
  })));
});

// Create location
router.post('/', authenticate, requireProjectAccess('contributor'), [
  body('name').notEmpty().isLength({ max: 200 }),
  body('location_type').optional().isIn(['physical', 'virtual', 'hybrid', 'fictional'])
], (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const {
    name, location_type, address, latitude, longitude, url, access_instructions,
    description, significance, imagery, accessibility_notes, permissions_required, status
  } = req.body;

  const locationId = uuidv4();

  db.prepare(`
    INSERT INTO locations (
      id, project_id, name, location_type, address, latitude, longitude, url,
      access_instructions, description, significance, imagery, accessibility_notes,
      permissions_required, status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    locationId,
    req.params.projectId,
    name,
    location_type || 'physical',
    address || null,
    latitude || null,
    longitude || null,
    url || null,
    access_instructions || null,
    description || null,
    significance || null,
    imagery ? JSON.stringify(imagery) : null,
    accessibility_notes || null,
    permissions_required || null,
    status || 'planned'
  );

  logActivity(req.params.projectId, req.user!.id, 'created', 'location', locationId, name);

  const location = db.prepare('SELECT * FROM locations WHERE id = ?').get(locationId);
  res.status(201).json({
    ...location,
    imagery: (location as { imagery: string | null }).imagery ? JSON.parse((location as { imagery: string }).imagery) : [],
    events: (location as { events: string | null }).events ? JSON.parse((location as { events: string }).events) : []
  });
});

// Get single location
router.get('/:locationId', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const location = db.prepare(`
    SELECT * FROM locations
    WHERE id = ? AND project_id = ?
  `).get(req.params.locationId, req.params.projectId) as Record<string, unknown> | undefined;

  if (!location) {
    res.status(404).json({ error: 'Location not found' });
    return;
  }

  // Get events at this location
  const events = db.prepare(`
    SELECT id, title, event_type, scheduled_start, status
    FROM events
    WHERE location_id = ?
    ORDER BY scheduled_start ASC
  `).all(req.params.locationId);

  // Get story beats at this location
  const storyBeats = db.prepare(`
    SELECT id, title, beat_type, status
    FROM story_beats
    WHERE location_id = ?
  `).all(req.params.locationId);

  res.json({
    ...location,
    imagery: location.imagery ? JSON.parse(location.imagery as string) : [],
    events,
    storyBeats
  });
});

// Update location
router.patch('/:locationId', authenticate, requireProjectAccess('contributor'), (req: AuthRequest, res: Response) => {
  const allowedFields = [
    'name', 'location_type', 'address', 'latitude', 'longitude', 'url',
    'access_instructions', 'description', 'significance', 'accessibility_notes',
    'permissions_required', 'status'
  ];

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(req.body[field]);
    }
  }

  if (req.body.imagery !== undefined) {
    updates.push('imagery = ?');
    values.push(JSON.stringify(req.body.imagery));
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(req.params.locationId);
  values.push(req.params.projectId);

  db.prepare(`
    UPDATE locations SET ${updates.join(', ')} WHERE id = ? AND project_id = ?
  `).run(...values);

  logActivity(req.params.projectId, req.user!.id, 'updated', 'location', req.params.locationId, req.body.name);

  const location = db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.locationId);
  res.json({
    ...location,
    imagery: (location as { imagery: string | null }).imagery ? JSON.parse((location as { imagery: string }).imagery) : []
  });
});

// Delete location
router.delete('/:locationId', authenticate, requireProjectAccess('lead'), (req: AuthRequest, res: Response) => {
  // Clear location references
  db.prepare('UPDATE events SET location_id = NULL WHERE location_id = ?').run(req.params.locationId);
  db.prepare('UPDATE story_beats SET location_id = NULL WHERE location_id = ?').run(req.params.locationId);

  db.prepare('DELETE FROM locations WHERE id = ? AND project_id = ?')
    .run(req.params.locationId, req.params.projectId);

  logActivity(req.params.projectId, req.user!.id, 'deleted', 'location', req.params.locationId);

  res.json({ message: 'Location deleted' });
});

export default router;
