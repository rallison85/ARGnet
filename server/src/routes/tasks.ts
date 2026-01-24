import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';
import db from '../db/index.js';
import { authenticate, requireProjectAccess, AuthRequest } from '../middleware/auth.js';
import { logActivity } from '../utils/activity.js';

const router = Router({ mergeParams: true });

// List tasks
router.get('/', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const { status, priority, assigned_to, department, task_type } = req.query;

  let query = `
    SELECT
      t.*,
      ua.username as assigned_to_username,
      ua.display_name as assigned_to_name,
      ua.avatar_url as assigned_to_avatar,
      uc.username as created_by_username,
      uc.display_name as created_by_name,
      (SELECT COUNT(*) FROM tasks WHERE parent_task_id = t.id) as subtask_count,
      (SELECT COUNT(*) FROM tasks WHERE parent_task_id = t.id AND status = 'done') as subtasks_done
    FROM tasks t
    LEFT JOIN users ua ON ua.id = t.assigned_to
    LEFT JOIN users uc ON uc.id = t.created_by
    WHERE t.project_id = ?
  `;

  const params: string[] = [req.params.projectId];

  if (status) {
    query += ' AND t.status = ?';
    params.push(status as string);
  }
  if (priority) {
    query += ' AND t.priority = ?';
    params.push(priority as string);
  }
  if (assigned_to) {
    query += ' AND t.assigned_to = ?';
    params.push(assigned_to as string);
  }
  if (department) {
    query += ' AND t.department = ?';
    params.push(department as string);
  }
  if (task_type) {
    query += ' AND t.task_type = ?';
    params.push(task_type as string);
  }

  query += ' ORDER BY CASE t.priority WHEN \'urgent\' THEN 1 WHEN \'high\' THEN 2 WHEN \'medium\' THEN 3 ELSE 4 END, t.due_date ASC NULLS LAST, t.created_at DESC';

  const tasks = db.prepare(query).all(...params);

  res.json(tasks);
});

// Get my tasks
router.get('/mine', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const tasks = db.prepare(`
    SELECT
      t.*,
      uc.username as created_by_username,
      uc.display_name as created_by_name
    FROM tasks t
    LEFT JOIN users uc ON uc.id = t.created_by
    WHERE t.project_id = ? AND t.assigned_to = ?
    ORDER BY CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, t.due_date ASC NULLS LAST
  `).all(req.params.projectId, req.user!.id);

  res.json(tasks);
});

// Get task board (grouped by status)
router.get('/board', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const statuses = ['todo', 'in_progress', 'review', 'blocked', 'done'];
  const board: Record<string, unknown[]> = {};

  for (const status of statuses) {
    board[status] = db.prepare(`
      SELECT
        t.*,
        ua.username as assigned_to_username,
        ua.display_name as assigned_to_name,
        ua.avatar_url as assigned_to_avatar
      FROM tasks t
      LEFT JOIN users ua ON ua.id = t.assigned_to
      WHERE t.project_id = ? AND t.status = ? AND t.parent_task_id IS NULL
      ORDER BY CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END
    `).all(req.params.projectId, status);
  }

  res.json(board);
});

// Create task
router.post('/', authenticate, requireProjectAccess('contributor'), [
  body('title').notEmpty().isLength({ max: 200 }),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('status').optional().isIn(['todo', 'in_progress', 'review', 'blocked', 'done', 'cancelled'])
], (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const {
    title, description, assigned_to, department, task_type, priority, status,
    due_date, estimated_hours, parent_task_id, related_entity_type, related_entity_id
  } = req.body;

  const taskId = uuidv4();

  db.prepare(`
    INSERT INTO tasks (
      id, project_id, parent_task_id, title, description, assigned_to, assigned_by,
      department, task_type, priority, status, due_date, estimated_hours,
      related_entity_type, related_entity_id, created_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    taskId,
    req.params.projectId,
    parent_task_id || null,
    title,
    description || null,
    assigned_to || null,
    assigned_to ? req.user!.id : null,
    department || null,
    task_type || null,
    priority || 'medium',
    status || 'todo',
    due_date || null,
    estimated_hours || null,
    related_entity_type || null,
    related_entity_id || null,
    req.user!.id
  );

  logActivity(req.params.projectId, req.user!.id, 'created', 'task', taskId, title);

  const task = db.prepare(`
    SELECT t.*, ua.username as assigned_to_username, ua.display_name as assigned_to_name
    FROM tasks t
    LEFT JOIN users ua ON ua.id = t.assigned_to
    WHERE t.id = ?
  `).get(taskId);

  res.status(201).json(task);
});

// Get single task
router.get('/:taskId', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const task = db.prepare(`
    SELECT
      t.*,
      ua.username as assigned_to_username,
      ua.display_name as assigned_to_name,
      ua.avatar_url as assigned_to_avatar,
      uc.username as created_by_username,
      uc.display_name as created_by_name,
      ucomp.username as completed_by_username,
      ucomp.display_name as completed_by_name
    FROM tasks t
    LEFT JOIN users ua ON ua.id = t.assigned_to
    LEFT JOIN users uc ON uc.id = t.created_by
    LEFT JOIN users ucomp ON ucomp.id = t.completed_by
    WHERE t.id = ? AND t.project_id = ?
  `).get(req.params.taskId, req.params.projectId);

  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  // Get subtasks
  const subtasks = db.prepare(`
    SELECT t.*, ua.username as assigned_to_username, ua.display_name as assigned_to_name
    FROM tasks t
    LEFT JOIN users ua ON ua.id = t.assigned_to
    WHERE t.parent_task_id = ?
    ORDER BY t.created_at ASC
  `).all(req.params.taskId);

  // Get parent task if exists
  let parentTask = null;
  if ((task as { parent_task_id: string | null }).parent_task_id) {
    parentTask = db.prepare('SELECT id, title, status FROM tasks WHERE id = ?')
      .get((task as { parent_task_id: string }).parent_task_id);
  }

  res.json({
    ...task,
    subtasks,
    parentTask
  });
});

// Update task
router.patch('/:taskId', authenticate, requireProjectAccess('contributor'), (req: AuthRequest, res: Response) => {
  const allowedFields = [
    'title', 'description', 'assigned_to', 'department', 'task_type',
    'priority', 'status', 'due_date', 'estimated_hours', 'actual_hours',
    'parent_task_id', 'related_entity_type', 'related_entity_id'
  ];

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(req.body[field]);
    }
  }

  // Handle status change to done
  if (req.body.status === 'done') {
    const currentTask = db.prepare('SELECT status FROM tasks WHERE id = ?').get(req.params.taskId) as { status: string };
    if (currentTask.status !== 'done') {
      updates.push('completed_at = CURRENT_TIMESTAMP');
      updates.push('completed_by = ?');
      values.push(req.user!.id);
    }
  }

  // If assigning to someone new, record who assigned
  if (req.body.assigned_to !== undefined) {
    updates.push('assigned_by = ?');
    values.push(req.user!.id);
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(req.params.taskId);
  values.push(req.params.projectId);

  db.prepare(`
    UPDATE tasks SET ${updates.join(', ')} WHERE id = ? AND project_id = ?
  `).run(...values);

  logActivity(req.params.projectId, req.user!.id, 'updated', 'task', req.params.taskId, req.body.title);

  const task = db.prepare(`
    SELECT t.*, ua.username as assigned_to_username, ua.display_name as assigned_to_name
    FROM tasks t
    LEFT JOIN users ua ON ua.id = t.assigned_to
    WHERE t.id = ?
  `).get(req.params.taskId);

  res.json(task);
});

// Bulk update tasks (for drag-and-drop)
router.patch('/bulk/status', authenticate, requireProjectAccess('contributor'), [
  body('tasks').isArray(),
  body('tasks.*.id').isUUID(),
  body('tasks.*.status').isIn(['todo', 'in_progress', 'review', 'blocked', 'done', 'cancelled'])
], (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { tasks } = req.body;

  const updateStmt = db.prepare(`
    UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND project_id = ?
  `);

  const updateMany = db.transaction((items: Array<{ id: string; status: string }>) => {
    for (const item of items) {
      updateStmt.run(item.status, item.id, req.params.projectId);
    }
  });

  updateMany(tasks);

  res.json({ message: 'Tasks updated' });
});

// Delete task
router.delete('/:taskId', authenticate, requireProjectAccess('lead'), (req: AuthRequest, res: Response) => {
  // Delete subtasks first
  db.prepare('DELETE FROM tasks WHERE parent_task_id = ? AND project_id = ?')
    .run(req.params.taskId, req.params.projectId);

  db.prepare('DELETE FROM tasks WHERE id = ? AND project_id = ?')
    .run(req.params.taskId, req.params.projectId);

  logActivity(req.params.projectId, req.user!.id, 'deleted', 'task', req.params.taskId);

  res.json({ message: 'Task deleted' });
});

export default router;
