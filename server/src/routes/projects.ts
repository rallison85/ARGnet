import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';
import db from '../db/index.js';
import { authenticate, requireProjectAccess, AuthRequest } from '../middleware/auth.js';
import { logActivity } from '../utils/activity.js';

const router = Router();

// List projects for current user
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const projects = db.prepare(`
    SELECT
      p.*,
      pm.role as member_role,
      u.username as owner_username,
      u.display_name as owner_display_name,
      (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
    FROM projects p
    JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
    JOIN users u ON u.id = p.owner_id
    ORDER BY p.updated_at DESC
  `).all(req.user!.id);

  res.json(projects.map(p => ({
    ...p,
    themes: p.themes ? JSON.parse(p.themes as string) : [],
    settings: p.settings ? JSON.parse(p.settings as string) : {}
  })));
});

// Get public projects
router.get('/public', (req: AuthRequest, res: Response) => {
  const projects = db.prepare(`
    SELECT
      p.id, p.name, p.slug, p.description, p.tagline, p.status, p.genre,
      p.themes, p.cover_image_url, p.created_at,
      u.username as owner_username,
      u.display_name as owner_display_name,
      (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
    FROM projects p
    JOIN users u ON u.id = p.owner_id
    WHERE p.visibility = 'public'
    ORDER BY p.created_at DESC
  `).all();

  res.json(projects.map(p => ({
    ...p,
    themes: p.themes ? JSON.parse(p.themes as string) : []
  })));
});

// Create project
router.post('/', authenticate, [
  body('name').notEmpty().isLength({ max: 100 }),
  body('description').optional().isLength({ max: 2000 }),
  body('tagline').optional().isLength({ max: 200 }),
  body('genre').optional().isLength({ max: 50 }),
  body('themes').optional().isArray()
], (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { name, description, tagline, genre, themes, visibility } = req.body;

  // Generate slug
  const baseSlug = name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  // Ensure unique slug
  let slug = baseSlug;
  let counter = 1;
  while (db.prepare('SELECT id FROM projects WHERE slug = ?').get(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  const projectId = uuidv4();

  db.prepare(`
    INSERT INTO projects (id, name, slug, description, tagline, genre, themes, visibility, owner_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    projectId,
    name,
    slug,
    description || null,
    tagline || null,
    genre || null,
    themes ? JSON.stringify(themes) : null,
    visibility || 'private',
    req.user!.id
  );

  // Add owner as project member
  db.prepare(`
    INSERT INTO project_members (id, project_id, user_id, role, department, title)
    VALUES (?, ?, ?, 'owner', 'production', 'Project Owner')
  `).run(uuidv4(), projectId, req.user!.id);

  logActivity(projectId, req.user!.id, 'created', 'project', projectId, name);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);

  res.status(201).json({
    ...project,
    themes: (project as { themes: string | null }).themes ? JSON.parse((project as { themes: string }).themes) : [],
    settings: (project as { settings: string | null }).settings ? JSON.parse((project as { settings: string }).settings) : {}
  });
});

// Get single project
router.get('/:projectId', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const project = db.prepare(`
    SELECT
      p.*,
      u.username as owner_username,
      u.display_name as owner_display_name
    FROM projects p
    JOIN users u ON u.id = p.owner_id
    WHERE p.id = ?
  `).get(req.params.projectId) as Record<string, unknown> | undefined;

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  // Get members
  const members = db.prepare(`
    SELECT
      pm.*,
      u.username,
      u.display_name,
      u.avatar_url,
      u.email
    FROM project_members pm
    JOIN users u ON u.id = pm.user_id
    WHERE pm.project_id = ?
  `).all(req.params.projectId);

  // Get stats
  const stats = {
    story_beats: (db.prepare('SELECT COUNT(*) as count FROM story_beats WHERE project_id = ?').get(req.params.projectId) as { count: number }).count,
    characters: (db.prepare('SELECT COUNT(*) as count FROM characters WHERE project_id = ?').get(req.params.projectId) as { count: number }).count,
    puzzles: (db.prepare('SELECT COUNT(*) as count FROM puzzles WHERE project_id = ?').get(req.params.projectId) as { count: number }).count,
    events: (db.prepare('SELECT COUNT(*) as count FROM events WHERE project_id = ?').get(req.params.projectId) as { count: number }).count,
    tasks: (db.prepare('SELECT COUNT(*) as count FROM tasks WHERE project_id = ?').get(req.params.projectId) as { count: number }).count,
    tasks_completed: (db.prepare('SELECT COUNT(*) as count FROM tasks WHERE project_id = ? AND status = ?').get(req.params.projectId, 'done') as { count: number }).count
  };

  res.json({
    ...project,
    themes: project.themes ? JSON.parse(project.themes as string) : [],
    settings: project.settings ? JSON.parse(project.settings as string) : {},
    members,
    stats,
    currentUserRole: req.projectRole
  });
});

// Update project
router.patch('/:projectId', authenticate, requireProjectAccess('admin'), [
  body('name').optional().isLength({ max: 100 }),
  body('description').optional().isLength({ max: 2000 }),
  body('tagline').optional().isLength({ max: 200 }),
  body('status').optional().isIn(['planning', 'development', 'testing', 'live', 'concluded', 'archived']),
  body('visibility').optional().isIn(['private', 'team', 'public'])
], (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const allowedFields = ['name', 'description', 'tagline', 'status', 'visibility', 'genre', 'target_audience', 'estimated_duration', 'start_date', 'end_date', 'launch_date', 'cover_image_url'];
  const updates: string[] = [];
  const values: (string | null)[] = [];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(req.body[field]);
    }
  }

  if (req.body.themes !== undefined) {
    updates.push('themes = ?');
    values.push(JSON.stringify(req.body.themes));
  }

  if (req.body.settings !== undefined) {
    updates.push('settings = ?');
    values.push(JSON.stringify(req.body.settings));
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(req.params.projectId);

  db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  logActivity(req.params.projectId, req.user!.id, 'updated', 'project', req.params.projectId, req.body.name);

  res.json({ message: 'Project updated' });
});

// Delete project
router.delete('/:projectId', authenticate, requireProjectAccess('owner'), (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.projectId);
  res.json({ message: 'Project deleted' });
});

// Get project members
router.get('/:projectId/members', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const members = db.prepare(`
    SELECT
      pm.*,
      u.username,
      u.display_name,
      u.avatar_url,
      u.email,
      u.bio,
      u.skills
    FROM project_members pm
    JOIN users u ON u.id = pm.user_id
    WHERE pm.project_id = ?
  `).all(req.params.projectId);

  res.json(members.map(m => ({
    ...m,
    skills: (m as { skills: string | null }).skills ? JSON.parse((m as { skills: string }).skills) : [],
    permissions: (m as { permissions: string | null }).permissions ? JSON.parse((m as { permissions: string }).permissions) : {}
  })));
});

// Add project member
router.post('/:projectId/members', authenticate, requireProjectAccess('admin'), [
  body('user_id').optional().isUUID(),
  body('email').optional().isEmail(),
  body('role').isIn(['admin', 'lead', 'contributor', 'viewer']),
  body('department').optional(),
  body('title').optional()
], (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { user_id, email, role, department, title } = req.body;

  let userId = user_id;

  // Find user by email if user_id not provided
  if (!userId && email) {
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined;
    if (!user) {
      res.status(404).json({ error: 'User not found with that email' });
      return;
    }
    userId = user.id;
  }

  if (!userId) {
    res.status(400).json({ error: 'Must provide user_id or email' });
    return;
  }

  // Check if already a member
  const existing = db.prepare(`
    SELECT id FROM project_members WHERE project_id = ? AND user_id = ?
  `).get(req.params.projectId, userId);

  if (existing) {
    res.status(409).json({ error: 'User is already a project member' });
    return;
  }

  const memberId = uuidv4();
  db.prepare(`
    INSERT INTO project_members (id, project_id, user_id, role, department, title)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(memberId, req.params.projectId, userId, role, department || null, title || null);

  const member = db.prepare(`
    SELECT pm.*, u.username, u.display_name, u.avatar_url, u.email
    FROM project_members pm
    JOIN users u ON u.id = pm.user_id
    WHERE pm.id = ?
  `).get(memberId);

  logActivity(req.params.projectId, req.user!.id, 'added_member', 'project_member', memberId, (member as { display_name: string | null; username: string }).display_name || (member as { username: string }).username);

  res.status(201).json(member);
});

// Update project member
router.patch('/:projectId/members/:memberId', authenticate, requireProjectAccess('admin'), [
  body('role').optional().isIn(['admin', 'lead', 'contributor', 'viewer']),
  body('department').optional(),
  body('title').optional()
], (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  // Prevent changing owner role
  const member = db.prepare('SELECT role FROM project_members WHERE id = ?').get(req.params.memberId) as { role: string } | undefined;
  if (member?.role === 'owner' && req.body.role && req.body.role !== 'owner') {
    res.status(403).json({ error: 'Cannot change owner role' });
    return;
  }

  const updates: string[] = [];
  const values: (string | null)[] = [];

  if (req.body.role !== undefined) {
    updates.push('role = ?');
    values.push(req.body.role);
  }
  if (req.body.department !== undefined) {
    updates.push('department = ?');
    values.push(req.body.department);
  }
  if (req.body.title !== undefined) {
    updates.push('title = ?');
    values.push(req.body.title);
  }
  if (req.body.permissions !== undefined) {
    updates.push('permissions = ?');
    values.push(JSON.stringify(req.body.permissions));
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  values.push(req.params.memberId);
  values.push(req.params.projectId);

  db.prepare(`UPDATE project_members SET ${updates.join(', ')} WHERE id = ? AND project_id = ?`).run(...values);

  res.json({ message: 'Member updated' });
});

// Remove project member
router.delete('/:projectId/members/:memberId', authenticate, requireProjectAccess('admin'), (req: AuthRequest, res: Response) => {
  // Prevent removing owner
  const member = db.prepare('SELECT role FROM project_members WHERE id = ?').get(req.params.memberId) as { role: string } | undefined;
  if (member?.role === 'owner') {
    res.status(403).json({ error: 'Cannot remove project owner' });
    return;
  }

  db.prepare('DELETE FROM project_members WHERE id = ? AND project_id = ?').run(req.params.memberId, req.params.projectId);

  res.json({ message: 'Member removed' });
});

export default router;
