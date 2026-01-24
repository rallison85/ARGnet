import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';

export function logActivity(
  projectId: string | null,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  entityName?: string,
  changes?: Record<string, unknown>
): void {
  db.prepare(`
    INSERT INTO activity_log (id, project_id, user_id, action, entity_type, entity_id, entity_name, changes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    uuidv4(),
    projectId,
    userId,
    action,
    entityType,
    entityId,
    entityName || null,
    changes ? JSON.stringify(changes) : null
  );
}

export function getActivityForProject(projectId: string, limit: number = 50): unknown[] {
  return db.prepare(`
    SELECT
      al.*,
      u.username,
      u.display_name,
      u.avatar_url
    FROM activity_log al
    LEFT JOIN users u ON u.id = al.user_id
    WHERE al.project_id = ?
    ORDER BY al.created_at DESC
    LIMIT ?
  `).all(projectId, limit);
}

export function getActivityForUser(userId: string, limit: number = 50): unknown[] {
  return db.prepare(`
    SELECT
      al.*,
      p.name as project_name,
      p.slug as project_slug
    FROM activity_log al
    LEFT JOIN projects p ON p.id = al.project_id
    WHERE al.user_id = ?
    ORDER BY al.created_at DESC
    LIMIT ?
  `).all(userId, limit);
}
