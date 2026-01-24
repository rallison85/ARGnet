import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';
import db from '../db/index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('username').isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/),
  body('password').isLength({ min: 6 }),
  body('display_name').optional().isLength({ max: 100 })
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { email, username, password, display_name } = req.body;

  try {
    // Check if user exists
    const existingUser = db.prepare(`
      SELECT id FROM users WHERE email = ? OR username = ?
    `).get(email, username);

    if (existingUser) {
      res.status(409).json({ error: 'Email or username already exists' });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const userId = uuidv4();
    db.prepare(`
      INSERT INTO users (id, email, username, password_hash, display_name)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, email, username, passwordHash, display_name || username);

    // Generate token
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.status(201).json({
      token,
      user: {
        id: userId,
        email,
        username,
        display_name: display_name || username
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { email, password } = req.body;

  try {
    const user = db.prepare(`
      SELECT id, email, username, password_hash, display_name, role, avatar_url, bio, skills
      FROM users
      WHERE email = ?
    `).get(email) as {
      id: string;
      email: string;
      username: string;
      password_hash: string;
      display_name: string | null;
      role: string;
      avatar_url: string | null;
      bio: string | null;
      skills: string | null;
    } | undefined;

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Update last login
    db.prepare(`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?`).run(user.id);

    // Generate token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        display_name: user.display_name,
        role: user.role,
        avatar_url: user.avatar_url,
        bio: user.bio,
        skills: user.skills ? JSON.parse(user.skills) : []
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authenticate, (req: AuthRequest, res: Response) => {
  const user = db.prepare(`
    SELECT id, email, username, display_name, role, avatar_url, bio, skills, created_at
    FROM users
    WHERE id = ?
  `).get(req.user!.id) as {
    id: string;
    email: string;
    username: string;
    display_name: string | null;
    role: string;
    avatar_url: string | null;
    bio: string | null;
    skills: string | null;
    created_at: string;
  };

  res.json({
    ...user,
    skills: user.skills ? JSON.parse(user.skills) : []
  });
});

// Update profile
router.patch('/me', authenticate, [
  body('display_name').optional().isLength({ max: 100 }),
  body('bio').optional().isLength({ max: 500 }),
  body('skills').optional().isArray()
], (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { display_name, bio, skills } = req.body;

  const updates: string[] = [];
  const values: (string | null)[] = [];

  if (display_name !== undefined) {
    updates.push('display_name = ?');
    values.push(display_name);
  }
  if (bio !== undefined) {
    updates.push('bio = ?');
    values.push(bio);
  }
  if (skills !== undefined) {
    updates.push('skills = ?');
    values.push(JSON.stringify(skills));
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(req.user!.id);

  db.prepare(`
    UPDATE users SET ${updates.join(', ')} WHERE id = ?
  `).run(...values);

  res.json({ message: 'Profile updated' });
});

// Change password
router.post('/change-password', authenticate, [
  body('current_password').notEmpty(),
  body('new_password').isLength({ min: 6 })
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { current_password, new_password } = req.body;

  const user = db.prepare(`
    SELECT password_hash FROM users WHERE id = ?
  `).get(req.user!.id) as { password_hash: string };

  const validPassword = await bcrypt.compare(current_password, user.password_hash);
  if (!validPassword) {
    res.status(401).json({ error: 'Current password is incorrect' });
    return;
  }

  const newHash = await bcrypt.hash(new_password, 12);
  db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(newHash, req.user!.id);

  res.json({ message: 'Password changed successfully' });
});

export default router;
