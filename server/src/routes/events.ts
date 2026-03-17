import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';
import db from '../db/index.js';
import { authenticate, requireProjectAccess, AuthRequest } from '../middleware/auth.js';
import { logActivity } from '../utils/activity.js';

const router = Router({ mergeParams: true });

// List events
router.get('/', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const { status, event_type } = req.query;

  let query = `
    SELECT
      e.*,
      u.username as created_by_username,
      u.display_name as created_by_name,
      l.name as location_name,
      sb.title as story_beat_title,
      (SELECT COUNT(*) FROM event_staff WHERE event_id = e.id) as staff_count,
      (SELECT COUNT(*) FROM event_staff WHERE event_id = e.id AND confirmed = 1) as confirmed_staff_count
    FROM events e
    LEFT JOIN users u ON u.id = e.created_by
    LEFT JOIN locations l ON l.id = e.location_id
    LEFT JOIN story_beats sb ON sb.id = e.story_beat_id
    WHERE e.project_id = ?
  `;

  const params: string[] = [req.params.projectId];

  if (status) {
    query += ' AND e.status = ?';
    params.push(status as string);
  }
  if (event_type) {
    query += ' AND e.event_type = ?';
    params.push(event_type as string);
  }

  query += ' ORDER BY e.scheduled_start ASC';

  const events = db.prepare(query).all(...params);

  res.json((events as Record<string, unknown>[]).map(e => ({
    ...e,
    staff_required: e.staff_required ? JSON.parse(e.staff_required as string) : []
  })));
});

// Create event
router.post('/', authenticate, requireProjectAccess('contributor'), [
  body('title').notEmpty().isLength({ max: 200 }),
  body('event_type').optional().isIn(['performance', 'installation', 'meetup', 'drop', 'broadcast', 'phone_call', 'online', 'hybrid'])
], (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const {
    title, event_type, description, scheduled_start, scheduled_end, timezone,
    script, requirements, contingencies, staff_required, max_participants,
    registration_required, registration_url, story_beat_id, location_id, status
  } = req.body;

  const eventId = uuidv4();

  db.prepare(`
    INSERT INTO events (
      id, project_id, story_beat_id, location_id, title, event_type, description,
      scheduled_start, scheduled_end, timezone, script, requirements, contingencies,
      staff_required, max_participants, registration_required, registration_url, status, created_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    eventId,
    req.params.projectId,
    story_beat_id || null,
    location_id || null,
    title,
    event_type || 'meetup',
    description || null,
    scheduled_start || null,
    scheduled_end || null,
    timezone || 'UTC',
    script || null,
    requirements || null,
    contingencies || null,
    staff_required ? JSON.stringify(staff_required) : null,
    max_participants || null,
    registration_required ? 1 : 0,
    registration_url || null,
    status || 'planned',
    req.user!.id
  );

  logActivity(req.params.projectId, req.user!.id, 'created', 'event', eventId, title);

  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId) as Record<string, unknown>;
  res.status(201).json({
    ...event,
    staff_required: event.staff_required ? JSON.parse(event.staff_required as string) : []
  });
});

// Get single event
router.get('/:eventId', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const event = db.prepare(`
    SELECT
      e.*,
      u.username as created_by_username,
      u.display_name as created_by_name,
      l.name as location_name,
      l.address as location_address,
      l.latitude as location_lat,
      l.longitude as location_lng,
      sb.title as story_beat_title
    FROM events e
    LEFT JOIN users u ON u.id = e.created_by
    LEFT JOIN locations l ON l.id = e.location_id
    LEFT JOIN story_beats sb ON sb.id = e.story_beat_id
    WHERE e.id = ? AND e.project_id = ?
  `).get(req.params.eventId, req.params.projectId) as Record<string, unknown> | undefined;

  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }

  // Get staff
  const staff = db.prepare(`
    SELECT
      es.*,
      u.username,
      u.display_name,
      u.avatar_url,
      c.name as character_name
    FROM event_staff es
    JOIN users u ON u.id = es.user_id
    LEFT JOIN characters c ON c.id = es.character_id
    WHERE es.event_id = ?
  `).all(req.params.eventId);

  res.json({
    ...event,
    staff_required: event.staff_required ? JSON.parse(event.staff_required as string) : [],
    staff
  });
});

// Update event
router.patch('/:eventId', authenticate, requireProjectAccess('contributor'), (req: AuthRequest, res: Response) => {
  const allowedFields = [
    'title', 'event_type', 'description', 'scheduled_start', 'scheduled_end',
    'timezone', 'script', 'requirements', 'contingencies', 'max_participants',
    'registration_required', 'registration_url', 'story_beat_id', 'location_id',
    'status', 'actual_attendance', 'event_notes'
  ];

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      if (field === 'registration_required') {
        values.push(req.body[field] ? 1 : 0);
      } else {
        values.push(req.body[field]);
      }
    }
  }

  if (req.body.staff_required !== undefined) {
    updates.push('staff_required = ?');
    values.push(JSON.stringify(req.body.staff_required));
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(req.params.eventId);
  values.push(req.params.projectId);

  db.prepare(`
    UPDATE events SET ${updates.join(', ')} WHERE id = ? AND project_id = ?
  `).run(...values);

  logActivity(req.params.projectId, req.user!.id, 'updated', 'event', req.params.eventId, req.body.title);

  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.eventId) as Record<string, unknown>;
  res.json({
    ...event,
    staff_required: event.staff_required ? JSON.parse(event.staff_required as string) : []
  });
});

// Delete event
router.delete('/:eventId', authenticate, requireProjectAccess('lead'), (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM event_staff WHERE event_id = ?').run(req.params.eventId);
  db.prepare('DELETE FROM events WHERE id = ? AND project_id = ?').run(req.params.eventId, req.params.projectId);

  logActivity(req.params.projectId, req.user!.id, 'deleted', 'event', req.params.eventId);

  res.json({ message: 'Event deleted' });
});

// Event Staff

// Add staff
router.post('/:eventId/staff', authenticate, requireProjectAccess('contributor'), [
  body('user_id').isUUID(),
  body('role').notEmpty()
], (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { user_id, role, character_id, notes } = req.body;

  // Check if already assigned
  const existing = db.prepare('SELECT id FROM event_staff WHERE event_id = ? AND user_id = ?')
    .get(req.params.eventId, user_id);

  if (existing) {
    res.status(409).json({ error: 'User already assigned to this event' });
    return;
  }

  const staffId = uuidv4();

  db.prepare(`
    INSERT INTO event_staff (id, event_id, user_id, role, character_id, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(staffId, req.params.eventId, user_id, role, character_id || null, notes || null);

  const staff = db.prepare(`
    SELECT es.*, u.username, u.display_name, u.avatar_url
    FROM event_staff es
    JOIN users u ON u.id = es.user_id
    WHERE es.id = ?
  `).get(staffId);

  res.status(201).json(staff);
});

// Update staff assignment
router.patch('/:eventId/staff/:staffId', authenticate, requireProjectAccess('contributor'), (req: AuthRequest, res: Response) => {
  const allowedFields = ['role', 'character_id', 'notes', 'confirmed'];
  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      if (field === 'confirmed') {
        values.push(req.body[field] ? 1 : 0);
      } else {
        values.push(req.body[field]);
      }
    }
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  values.push(req.params.staffId);
  values.push(req.params.eventId);

  db.prepare(`UPDATE event_staff SET ${updates.join(', ')} WHERE id = ? AND event_id = ?`).run(...values);

  const staff = db.prepare('SELECT * FROM event_staff WHERE id = ?').get(req.params.staffId);
  res.json(staff);
});

// Confirm own attendance
router.post('/:eventId/confirm', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const result = db.prepare(`
    UPDATE event_staff SET confirmed = 1 WHERE event_id = ? AND user_id = ?
  `).run(req.params.eventId, req.user!.id);

  if (result.changes === 0) {
    res.status(404).json({ error: 'You are not assigned to this event' });
    return;
  }

  res.json({ message: 'Attendance confirmed' });
});

// Remove staff
router.delete('/:eventId/staff/:staffId', authenticate, requireProjectAccess('contributor'), (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM event_staff WHERE id = ? AND event_id = ?').run(req.params.staffId, req.params.eventId);
  res.json({ message: 'Staff removed' });
});

export default router;
