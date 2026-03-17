import { Router, Response } from 'express';
import db from '../db/index.js';
import { authenticate, requireProjectAccess, AuthRequest } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

// Get project activity
router.get('/', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const offset = parseInt(req.query.offset as string) || 0;
  const { entity_type, user_id } = req.query;

  let query = `
    SELECT
      al.*,
      u.username,
      u.display_name,
      u.avatar_url
    FROM activity_log al
    LEFT JOIN users u ON u.id = al.user_id
    WHERE al.project_id = ?
  `;

  const params: (string | number)[] = [req.params.projectId];

  if (entity_type) {
    query += ' AND al.entity_type = ?';
    params.push(entity_type as string);
  }
  if (user_id) {
    query += ' AND al.user_id = ?';
    params.push(user_id as string);
  }

  query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const activities = db.prepare(query).all(...params);

  // Get total count
  let countQuery = 'SELECT COUNT(*) as count FROM activity_log WHERE project_id = ?';
  const countParams: string[] = [req.params.projectId];

  if (entity_type) {
    countQuery += ' AND entity_type = ?';
    countParams.push(entity_type as string);
  }
  if (user_id) {
    countQuery += ' AND user_id = ?';
    countParams.push(user_id as string);
  }

  const { count } = db.prepare(countQuery).get(...countParams) as { count: number };

  res.json({
    activities: (activities as Record<string, unknown>[]).map(a => ({
      ...a,
      changes: (a as { changes: string | null }).changes ? JSON.parse((a as { changes: string }).changes) : null
    })),
    total: count,
    limit,
    offset
  });
});

// Get activity summary (for dashboard)
router.get('/summary', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const days = parseInt(req.query.days as string) || 7;
  const since = new Date();
  since.setDate(since.getDate() - days);

  // Activity by day
  const activityByDay = db.prepare(`
    SELECT
      DATE(created_at) as date,
      COUNT(*) as count
    FROM activity_log
    WHERE project_id = ? AND created_at >= ?
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `).all(req.params.projectId, since.toISOString());

  // Activity by type
  const activityByType = db.prepare(`
    SELECT
      entity_type,
      COUNT(*) as count
    FROM activity_log
    WHERE project_id = ? AND created_at >= ?
    GROUP BY entity_type
    ORDER BY count DESC
  `).all(req.params.projectId, since.toISOString());

  // Most active users
  const activeUsers = db.prepare(`
    SELECT
      u.id,
      u.username,
      u.display_name,
      u.avatar_url,
      COUNT(*) as activity_count
    FROM activity_log al
    JOIN users u ON u.id = al.user_id
    WHERE al.project_id = ? AND al.created_at >= ?
    GROUP BY u.id
    ORDER BY activity_count DESC
    LIMIT 10
  `).all(req.params.projectId, since.toISOString());

  // Recent activity
  const recentActivity = db.prepare(`
    SELECT
      al.*,
      u.username,
      u.display_name,
      u.avatar_url
    FROM activity_log al
    LEFT JOIN users u ON u.id = al.user_id
    WHERE al.project_id = ?
    ORDER BY al.created_at DESC
    LIMIT 10
  `).all(req.params.projectId);

  res.json({
    activityByDay,
    activityByType,
    activeUsers,
    recentActivity: (recentActivity as Record<string, unknown>[]).map(a => ({
      ...a,
      changes: (a as { changes: string | null }).changes ? JSON.parse((a as { changes: string }).changes) : null
    }))
  });
});

export default router;
