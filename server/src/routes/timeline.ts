import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';
import db from '../db/index.js';
import { authenticate, requireProjectAccess, AuthRequest } from '../middleware/auth.js';
import { logActivity } from '../utils/activity.js';

const router = Router({ mergeParams: true });

// List timeline events
router.get('/', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const { event_type, significance, is_public } = req.query;

  let query = `
    SELECT
      te.*,
      sb.title as story_beat_title
    FROM timeline_events te
    LEFT JOIN story_beats sb ON sb.id = te.story_beat_id
    WHERE te.project_id = ?
  `;

  const params: (string | number)[] = [req.params.projectId];

  if (event_type) {
    query += ' AND te.event_type = ?';
    params.push(event_type as string);
  }
  if (significance) {
    query += ' AND te.significance = ?';
    params.push(significance as string);
  }
  if (is_public !== undefined) {
    query += ' AND te.is_public = ?';
    params.push(is_public === 'true' ? 1 : 0);
  }

  query += ' ORDER BY te.event_date ASC';

  const events = db.prepare(query).all(...params);

  res.json(events.map(e => ({
    ...e,
    related_characters: (e as { related_characters: string | null }).related_characters ? JSON.parse((e as { related_characters: string }).related_characters) : [],
    related_locations: (e as { related_locations: string | null }).related_locations ? JSON.parse((e as { related_locations: string }).related_locations) : []
  })));
});

// Create timeline event
router.post('/', authenticate, requireProjectAccess('contributor'), [
  body('title').notEmpty().isLength({ max: 200 }),
  body('event_date').notEmpty(),
  body('significance').optional().isIn(['minor', 'moderate', 'major', 'critical'])
], (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const {
    title, description, event_date, event_date_precision, is_approximate,
    event_type, significance, is_public, related_characters, related_locations,
    story_beat_id
  } = req.body;

  const eventId = uuidv4();

  db.prepare(`
    INSERT INTO timeline_events (
      id, project_id, title, description, event_date, event_date_precision,
      is_approximate, event_type, significance, is_public, related_characters,
      related_locations, story_beat_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    eventId,
    req.params.projectId,
    title,
    description || null,
    event_date,
    event_date_precision || 'day',
    is_approximate ? 1 : 0,
    event_type || null,
    significance || 'moderate',
    is_public ? 1 : 0,
    related_characters ? JSON.stringify(related_characters) : null,
    related_locations ? JSON.stringify(related_locations) : null,
    story_beat_id || null
  );

  logActivity(req.params.projectId, req.user!.id, 'created', 'timeline_event', eventId, title);

  const event = db.prepare('SELECT * FROM timeline_events WHERE id = ?').get(eventId);
  res.status(201).json({
    ...event,
    related_characters: (event as { related_characters: string | null }).related_characters ? JSON.parse((event as { related_characters: string }).related_characters) : [],
    related_locations: (event as { related_locations: string | null }).related_locations ? JSON.parse((event as { related_locations: string }).related_locations) : []
  });
});

// Get single timeline event
router.get('/:eventId', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const event = db.prepare(`
    SELECT
      te.*,
      sb.title as story_beat_title
    FROM timeline_events te
    LEFT JOIN story_beats sb ON sb.id = te.story_beat_id
    WHERE te.id = ? AND te.project_id = ?
  `).get(req.params.eventId, req.params.projectId) as Record<string, unknown> | undefined;

  if (!event) {
    res.status(404).json({ error: 'Timeline event not found' });
    return;
  }

  res.json({
    ...event,
    related_characters: event.related_characters ? JSON.parse(event.related_characters as string) : [],
    related_locations: event.related_locations ? JSON.parse(event.related_locations as string) : []
  });
});

// Update timeline event
router.patch('/:eventId', authenticate, requireProjectAccess('contributor'), (req: AuthRequest, res: Response) => {
  const allowedFields = [
    'title', 'description', 'event_date', 'event_date_precision', 'is_approximate',
    'event_type', 'significance', 'is_public', 'story_beat_id'
  ];

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      if (field === 'is_approximate' || field === 'is_public') {
        values.push(req.body[field] ? 1 : 0);
      } else {
        values.push(req.body[field]);
      }
    }
  }

  if (req.body.related_characters !== undefined) {
    updates.push('related_characters = ?');
    values.push(JSON.stringify(req.body.related_characters));
  }
  if (req.body.related_locations !== undefined) {
    updates.push('related_locations = ?');
    values.push(JSON.stringify(req.body.related_locations));
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(req.params.eventId);
  values.push(req.params.projectId);

  db.prepare(`
    UPDATE timeline_events SET ${updates.join(', ')} WHERE id = ? AND project_id = ?
  `).run(...values);

  const event = db.prepare('SELECT * FROM timeline_events WHERE id = ?').get(req.params.eventId);
  res.json({
    ...event,
    related_characters: (event as { related_characters: string | null }).related_characters ? JSON.parse((event as { related_characters: string }).related_characters) : [],
    related_locations: (event as { related_locations: string | null }).related_locations ? JSON.parse((event as { related_locations: string }).related_locations) : []
  });
});

// Delete timeline event
router.delete('/:eventId', authenticate, requireProjectAccess('lead'), (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM timeline_events WHERE id = ? AND project_id = ?')
    .run(req.params.eventId, req.params.projectId);

  logActivity(req.params.projectId, req.user!.id, 'deleted', 'timeline_event', req.params.eventId);

  res.json({ message: 'Timeline event deleted' });
});

export default router;
