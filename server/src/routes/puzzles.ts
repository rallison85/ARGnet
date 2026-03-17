import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';
import db from '../db/index.js';
import { authenticate, requireProjectAccess, AuthRequest } from '../middleware/auth.js';
import { logActivity } from '../utils/activity.js';

const router = Router({ mergeParams: true });

// List puzzles
router.get('/', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const { status, puzzle_type, difficulty } = req.query;

  let query = `
    SELECT
      p.*,
      u.username as created_by_username,
      u.display_name as created_by_name,
      sb.title as story_beat_title,
      (SELECT COUNT(*) FROM puzzle_clues WHERE puzzle_id = p.id) as clue_count
    FROM puzzles p
    LEFT JOIN users u ON u.id = p.created_by
    LEFT JOIN story_beats sb ON sb.id = p.story_beat_id
    WHERE p.project_id = ?
  `;

  const params: (string | number)[] = [req.params.projectId];

  if (status) {
    query += ' AND p.status = ?';
    params.push(status as string);
  }
  if (puzzle_type) {
    query += ' AND p.puzzle_type = ?';
    params.push(puzzle_type as string);
  }
  if (difficulty) {
    query += ' AND p.difficulty = ?';
    params.push(parseInt(difficulty as string));
  }

  query += ' ORDER BY p.created_at DESC';

  const puzzles = db.prepare(query).all(...params);

  res.json((puzzles as Record<string, unknown>[]).map(p => ({
    ...p,
    hints: p.hints ? JSON.parse(p.hints as string) : [],
    prerequisites: p.prerequisites ? JSON.parse(p.prerequisites as string) : [],
    unlocks: p.unlocks ? JSON.parse(p.unlocks as string) : [],
    test_results: p.test_results ? JSON.parse(p.test_results as string) : []
  })));
});

// Create puzzle
router.post('/', authenticate, requireProjectAccess('contributor'), [
  body('title').notEmpty().isLength({ max: 200 }),
  body('puzzle_type').optional().isIn(['cipher', 'code', 'riddle', 'physical', 'digital', 'social', 'meta', 'audio', 'visual', 'artefact', 'coordinates', 'other']),
  body('difficulty').optional().isInt({ min: 1, max: 5 }),
  body('hints').optional().isArray()
], (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const {
    title, description, puzzle_type, difficulty, estimated_solve_time,
    setup, solution, solution_method, hints, prerequisites, required_tools,
    required_knowledge, reward_type, reward_description, unlocks, status,
    is_optional, is_hidden, story_beat_id
  } = req.body;

  const puzzleId = uuidv4();

  db.prepare(`
    INSERT INTO puzzles (
      id, project_id, story_beat_id, title, description, puzzle_type, difficulty,
      estimated_solve_time, setup, solution, solution_method, hints, prerequisites,
      required_tools, required_knowledge, reward_type, reward_description, unlocks,
      status, is_optional, is_hidden, created_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    puzzleId,
    req.params.projectId,
    story_beat_id || null,
    title,
    description || null,
    puzzle_type || 'other',
    difficulty || 3,
    estimated_solve_time || null,
    setup || null,
    solution || null,
    solution_method || null,
    hints ? JSON.stringify(hints) : null,
    prerequisites ? JSON.stringify(prerequisites) : null,
    required_tools || null,
    required_knowledge || null,
    reward_type || null,
    reward_description || null,
    unlocks ? JSON.stringify(unlocks) : null,
    status || 'draft',
    is_optional ? 1 : 0,
    is_hidden ? 1 : 0,
    req.user!.id
  );

  logActivity(req.params.projectId, req.user!.id, 'created', 'puzzle', puzzleId, title);

  const puzzle = db.prepare('SELECT * FROM puzzles WHERE id = ?').get(puzzleId) as Record<string, unknown>;
  res.status(201).json({
    ...puzzle,
    hints: puzzle.hints ? JSON.parse(puzzle.hints as string) : [],
    prerequisites: puzzle.prerequisites ? JSON.parse(puzzle.prerequisites as string) : [],
    unlocks: puzzle.unlocks ? JSON.parse(puzzle.unlocks as string) : []
  });
});

// Get single puzzle
router.get('/:puzzleId', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const puzzle = db.prepare(`
    SELECT
      p.*,
      u.username as created_by_username,
      u.display_name as created_by_name,
      sb.title as story_beat_title
    FROM puzzles p
    LEFT JOIN users u ON u.id = p.created_by
    LEFT JOIN story_beats sb ON sb.id = p.story_beat_id
    WHERE p.id = ? AND p.project_id = ?
  `).get(req.params.puzzleId, req.params.projectId) as Record<string, unknown> | undefined;

  if (!puzzle) {
    res.status(404).json({ error: 'Puzzle not found' });
    return;
  }

  // Get clues
  const clues = db.prepare(`
    SELECT * FROM puzzle_clues
    WHERE puzzle_id = ?
    ORDER BY sequence_order ASC
  `).all(req.params.puzzleId);

  // Get prerequisite puzzles
  let prerequisitePuzzles: unknown[] = [];
  if (puzzle.prerequisites) {
    const prereqIds = JSON.parse(puzzle.prerequisites as string);
    if (prereqIds.length > 0) {
      const placeholders = prereqIds.map(() => '?').join(',');
      prerequisitePuzzles = db.prepare(`
        SELECT id, title, status, difficulty
        FROM puzzles
        WHERE id IN (${placeholders})
      `).all(...prereqIds);
    }
  }

  res.json({
    ...puzzle,
    hints: puzzle.hints ? JSON.parse(puzzle.hints as string) : [],
    prerequisites: puzzle.prerequisites ? JSON.parse(puzzle.prerequisites as string) : [],
    unlocks: puzzle.unlocks ? JSON.parse(puzzle.unlocks as string) : [],
    test_results: puzzle.test_results ? JSON.parse(puzzle.test_results as string) : [],
    clues,
    prerequisitePuzzles
  });
});

// Update puzzle
router.patch('/:puzzleId', authenticate, requireProjectAccess('contributor'), (req: AuthRequest, res: Response) => {
  const allowedFields = [
    'title', 'description', 'puzzle_type', 'difficulty', 'estimated_solve_time',
    'setup', 'solution', 'solution_method', 'required_tools', 'required_knowledge',
    'reward_type', 'reward_description', 'status', 'is_optional', 'is_hidden',
    'story_beat_id', 'average_solve_time'
  ];

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      if (field === 'is_optional' || field === 'is_hidden') {
        values.push(req.body[field] ? 1 : 0);
      } else {
        values.push(req.body[field]);
      }
    }
  }

  // Handle JSON fields
  if (req.body.hints !== undefined) {
    updates.push('hints = ?');
    values.push(JSON.stringify(req.body.hints));
  }
  if (req.body.prerequisites !== undefined) {
    updates.push('prerequisites = ?');
    values.push(JSON.stringify(req.body.prerequisites));
  }
  if (req.body.unlocks !== undefined) {
    updates.push('unlocks = ?');
    values.push(JSON.stringify(req.body.unlocks));
  }
  if (req.body.test_results !== undefined) {
    updates.push('test_results = ?');
    values.push(JSON.stringify(req.body.test_results));
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(req.params.puzzleId);
  values.push(req.params.projectId);

  db.prepare(`
    UPDATE puzzles SET ${updates.join(', ')} WHERE id = ? AND project_id = ?
  `).run(...values);

  logActivity(req.params.projectId, req.user!.id, 'updated', 'puzzle', req.params.puzzleId, req.body.title);

  const puzzle = db.prepare('SELECT * FROM puzzles WHERE id = ?').get(req.params.puzzleId) as Record<string, unknown>;
  res.json({
    ...puzzle,
    hints: puzzle.hints ? JSON.parse(puzzle.hints as string) : [],
    prerequisites: puzzle.prerequisites ? JSON.parse(puzzle.prerequisites as string) : [],
    unlocks: puzzle.unlocks ? JSON.parse(puzzle.unlocks as string) : []
  });
});

// Delete puzzle
router.delete('/:puzzleId', authenticate, requireProjectAccess('lead'), (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM puzzle_clues WHERE puzzle_id = ?').run(req.params.puzzleId);
  db.prepare('DELETE FROM puzzles WHERE id = ? AND project_id = ?').run(req.params.puzzleId, req.params.projectId);

  logActivity(req.params.projectId, req.user!.id, 'deleted', 'puzzle', req.params.puzzleId);

  res.json({ message: 'Puzzle deleted' });
});

// Puzzle Clues

// List clues for puzzle
router.get('/:puzzleId/clues', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const clues = db.prepare(`
    SELECT * FROM puzzle_clues
    WHERE puzzle_id = ?
    ORDER BY sequence_order ASC
  `).all(req.params.puzzleId);

  res.json(clues);
});

// Create clue
router.post('/:puzzleId/clues', authenticate, requireProjectAccess('contributor'), [
  body('title').notEmpty().isLength({ max: 200 }),
  body('clue_type').optional().isIn(['text', 'image', 'audio', 'video', 'file', 'physical', 'location', 'interaction'])
], (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const {
    title, clue_type, content, asset_url, delivery_method,
    delivery_location, delivery_trigger, sequence_order, is_red_herring
  } = req.body;

  const clueId = uuidv4();

  db.prepare(`
    INSERT INTO puzzle_clues (
      id, puzzle_id, title, clue_type, content, asset_url, delivery_method,
      delivery_location, delivery_trigger, sequence_order, is_red_herring
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    clueId,
    req.params.puzzleId,
    title,
    clue_type || 'text',
    content || null,
    asset_url || null,
    delivery_method || null,
    delivery_location || null,
    delivery_trigger || null,
    sequence_order || 0,
    is_red_herring ? 1 : 0
  );

  const clue = db.prepare('SELECT * FROM puzzle_clues WHERE id = ?').get(clueId);
  res.status(201).json(clue);
});

// Update clue
router.patch('/:puzzleId/clues/:clueId', authenticate, requireProjectAccess('contributor'), (req: AuthRequest, res: Response) => {
  const allowedFields = [
    'title', 'clue_type', 'content', 'asset_url', 'delivery_method',
    'delivery_location', 'delivery_trigger', 'sequence_order', 'is_red_herring'
  ];

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      if (field === 'is_red_herring') {
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

  values.push(req.params.clueId);
  values.push(req.params.puzzleId);

  db.prepare(`
    UPDATE puzzle_clues SET ${updates.join(', ')} WHERE id = ? AND puzzle_id = ?
  `).run(...values);

  const clue = db.prepare('SELECT * FROM puzzle_clues WHERE id = ?').get(req.params.clueId);
  res.json(clue);
});

// Delete clue
router.delete('/:puzzleId/clues/:clueId', authenticate, requireProjectAccess('contributor'), (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM puzzle_clues WHERE id = ? AND puzzle_id = ?').run(req.params.clueId, req.params.puzzleId);
  res.json({ message: 'Clue deleted' });
});

// Record test result
router.post('/:puzzleId/test', authenticate, requireProjectAccess('contributor'), [
  body('solved').isBoolean(),
  body('time_taken').optional(),
  body('notes').optional()
], (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const puzzle = db.prepare('SELECT test_results FROM puzzles WHERE id = ?').get(req.params.puzzleId) as { test_results: string | null } | undefined;

  if (!puzzle) {
    res.status(404).json({ error: 'Puzzle not found' });
    return;
  }

  const testResults = puzzle.test_results ? JSON.parse(puzzle.test_results) : [];
  testResults.push({
    tester_id: req.user!.id,
    tester_username: req.user!.username,
    solved: req.body.solved,
    time_taken: req.body.time_taken,
    notes: req.body.notes,
    tested_at: new Date().toISOString()
  });

  db.prepare(`
    UPDATE puzzles SET test_results = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(JSON.stringify(testResults), req.params.puzzleId);

  res.json({ message: 'Test result recorded' });
});

export default router;
