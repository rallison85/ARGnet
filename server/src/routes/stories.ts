import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';
import db from '../db/index.js';
import { authenticate, requireProjectAccess, AuthRequest } from '../middleware/auth.js';
import { logActivity } from '../utils/activity.js';

const router = Router({ mergeParams: true });

// List story beats
router.get('/', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const beats = db.prepare(`
    SELECT
      sb.*,
      u.username as created_by_username,
      u.display_name as created_by_name,
      (SELECT COUNT(*) FROM story_beats WHERE parent_id = sb.id) as children_count
    FROM story_beats sb
    LEFT JOIN users u ON u.id = sb.created_by
    WHERE sb.project_id = ?
    ORDER BY sb.sequence_order ASC, sb.created_at ASC
  `).all(req.params.projectId);

  res.json(beats);
});

// Get story tree (hierarchical)
router.get('/tree', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const beats = db.prepare(`
    SELECT
      sb.*,
      u.username as created_by_username,
      u.display_name as created_by_name
    FROM story_beats sb
    LEFT JOIN users u ON u.id = sb.created_by
    WHERE sb.project_id = ?
    ORDER BY sb.sequence_order ASC, sb.created_at ASC
  `).all(req.params.projectId) as Array<{
    id: string;
    parent_id: string | null;
    [key: string]: unknown;
  }>;

  // Build tree structure
  interface TreeNode {
    id: string;
    parent_id: string | null;
    children: TreeNode[];
    [key: string]: unknown;
  }

  const beatMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  beats.forEach(beat => {
    beatMap.set(beat.id, { ...beat, children: [] });
  });

  beats.forEach(beat => {
    const node = beatMap.get(beat.id)!;
    if (beat.parent_id && beatMap.has(beat.parent_id)) {
      beatMap.get(beat.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  res.json(roots);
});

// Create story beat
router.post('/', authenticate, requireProjectAccess('contributor'), [
  body('title').notEmpty().isLength({ max: 200 }),
  body('content').optional(),
  body('summary').optional().isLength({ max: 500 }),
  body('beat_type').optional().isIn(['act', 'chapter', 'scene', 'moment', 'flashback', 'parallel']),
  body('parent_id').optional().isUUID(),
  body('sequence_order').optional().isInt()
], (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const {
    title, content, summary, beat_type, parent_id, sequence_order,
    story_date, real_world_trigger, mood, location_id, notes
  } = req.body;

  const beatId = uuidv4();

  db.prepare(`
    INSERT INTO story_beats (
      id, project_id, parent_id, title, content, summary, beat_type,
      sequence_order, story_date, real_world_trigger, mood, location_id, notes, created_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    beatId,
    req.params.projectId,
    parent_id || null,
    title,
    content || null,
    summary || null,
    beat_type || 'chapter',
    sequence_order || 0,
    story_date || null,
    real_world_trigger || null,
    mood || null,
    location_id || null,
    notes || null,
    req.user!.id
  );

  logActivity(req.params.projectId, req.user!.id, 'created', 'story_beat', beatId, title);

  const beat = db.prepare('SELECT * FROM story_beats WHERE id = ?').get(beatId);
  res.status(201).json(beat);
});

// Get single story beat
router.get('/:beatId', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const beat = db.prepare(`
    SELECT
      sb.*,
      u.username as created_by_username,
      u.display_name as created_by_name,
      l.name as location_name
    FROM story_beats sb
    LEFT JOIN users u ON u.id = sb.created_by
    LEFT JOIN locations l ON l.id = sb.location_id
    WHERE sb.id = ? AND sb.project_id = ?
  `).get(req.params.beatId, req.params.projectId);

  if (!beat) {
    res.status(404).json({ error: 'Story beat not found' });
    return;
  }

  // Get related characters
  const characters = db.prepare(`
    SELECT c.id, c.name, c.character_type, c.avatar_url
    FROM characters c
    WHERE c.project_id = ? AND c.introduction_beat_id = ?
  `).all(req.params.projectId, req.params.beatId);

  // Get related puzzles
  const puzzles = db.prepare(`
    SELECT p.id, p.title, p.puzzle_type, p.difficulty, p.status
    FROM puzzles p
    WHERE p.story_beat_id = ?
  `).all(req.params.beatId);

  // Get children
  const children = db.prepare(`
    SELECT id, title, beat_type, sequence_order, status
    FROM story_beats
    WHERE parent_id = ?
    ORDER BY sequence_order ASC
  `).all(req.params.beatId);

  res.json({
    ...beat,
    characters,
    puzzles,
    children
  });
});

// Update story beat
router.patch('/:beatId', authenticate, requireProjectAccess('contributor'), (req: AuthRequest, res: Response) => {
  const allowedFields = [
    'title', 'content', 'summary', 'beat_type', 'parent_id', 'sequence_order',
    'status', 'story_date', 'real_world_trigger', 'mood', 'location_id', 'notes'
  ];

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(req.body[field]);
    }
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(req.params.beatId);
  values.push(req.params.projectId);

  db.prepare(`
    UPDATE story_beats SET ${updates.join(', ')} WHERE id = ? AND project_id = ?
  `).run(...values);

  logActivity(req.params.projectId, req.user!.id, 'updated', 'story_beat', req.params.beatId, req.body.title);

  const beat = db.prepare('SELECT * FROM story_beats WHERE id = ?').get(req.params.beatId);
  res.json(beat);
});

// Reorder story beats
router.post('/reorder', authenticate, requireProjectAccess('contributor'), [
  body('beats').isArray(),
  body('beats.*.id').isUUID(),
  body('beats.*.sequence_order').isInt()
], (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { beats } = req.body;

  const updateStmt = db.prepare(`
    UPDATE story_beats SET sequence_order = ? WHERE id = ? AND project_id = ?
  `);

  const updateMany = db.transaction((items: Array<{ id: string; sequence_order: number }>) => {
    for (const item of items) {
      updateStmt.run(item.sequence_order, item.id, req.params.projectId);
    }
  });

  updateMany(beats);

  res.json({ message: 'Beats reordered' });
});

// Delete story beat
router.delete('/:beatId', authenticate, requireProjectAccess('lead'), (req: AuthRequest, res: Response) => {
  // Update children to have no parent
  db.prepare(`
    UPDATE story_beats SET parent_id = NULL WHERE parent_id = ? AND project_id = ?
  `).run(req.params.beatId, req.params.projectId);

  db.prepare('DELETE FROM story_beats WHERE id = ? AND project_id = ?').run(req.params.beatId, req.params.projectId);

  logActivity(req.params.projectId, req.user!.id, 'deleted', 'story_beat', req.params.beatId);

  res.json({ message: 'Story beat deleted' });
});

export default router;
