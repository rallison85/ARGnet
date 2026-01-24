import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../db/index.js';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  role: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
  projectRole?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key';

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    const user = db.prepare(`
      SELECT id, email, username, display_name, role
      FROM users
      WHERE id = ?
    `).get(decoded.userId) as AuthUser | undefined;

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    const user = db.prepare(`
      SELECT id, email, username, display_name, role
      FROM users
      WHERE id = ?
    `).get(decoded.userId) as AuthUser | undefined;

    if (user) {
      req.user = user;
    }
  } catch {
    // Token invalid, continue without auth
  }

  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

export function requireProjectAccess(minRole: string = 'viewer') {
  const roleHierarchy: Record<string, number> = {
    viewer: 1,
    contributor: 2,
    lead: 3,
    admin: 4,
    owner: 5
  };

  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const projectId = req.params.projectId;

    if (!projectId) {
      res.status(400).json({ error: 'Project ID required' });
      return;
    }

    // Check if user is a member of the project
    const membership = db.prepare(`
      SELECT role FROM project_members
      WHERE project_id = ? AND user_id = ?
    `).get(projectId, req.user.id) as { role: string } | undefined;

    // System admins have full access
    if (req.user.role === 'admin') {
      req.projectRole = 'admin';
      next();
      return;
    }

    if (!membership) {
      // Check if project is public
      const project = db.prepare(`
        SELECT visibility FROM projects WHERE id = ?
      `).get(projectId) as { visibility: string } | undefined;

      if (project?.visibility === 'public' && minRole === 'viewer') {
        req.projectRole = 'viewer';
        next();
        return;
      }

      res.status(403).json({ error: 'Access denied to this project' });
      return;
    }

    const userRoleLevel = roleHierarchy[membership.role] || 0;
    const requiredRoleLevel = roleHierarchy[minRole] || 0;

    if (userRoleLevel < requiredRoleLevel) {
      res.status(403).json({ error: `Requires ${minRole} access or higher` });
      return;
    }

    req.projectRole = membership.role;
    next();
  };
}
