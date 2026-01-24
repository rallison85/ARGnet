import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';
import db from '../db/index.js';
import { authenticate, requireProjectAccess, AuthRequest } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

// Get comments for an entity
router.get('/:entityType/:entityId', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const comments = db.prepare(`
    SELECT
      c.*,
      u.username as author_username,
      u.display_name as author_display_name,
      u.avatar_url as author_avatar
    FROM comments c
    JOIN users u ON u.id = c.author_id
    WHERE c.project_id = ? AND c.entity_type = ? AND c.entity_id = ?
    ORDER BY c.created_at ASC
  `).all(req.params.projectId, req.params.entityType, req.params.entityId);

  // Build thread structure
  interface CommentNode {
    id: string;
    parent_comment_id: string | null;
    replies: CommentNode[];
    [key: string]: unknown;
  }

  const commentMap = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  comments.forEach(comment => {
    commentMap.set((comment as { id: string }).id, { ...comment, replies: [] } as CommentNode);
  });

  comments.forEach(comment => {
    const node = commentMap.get((comment as { id: string }).id)!;
    const parentId = (comment as { parent_comment_id: string | null }).parent_comment_id;
    if (parentId && commentMap.has(parentId)) {
      commentMap.get(parentId)!.replies.push(node);
    } else {
      roots.push(node);
    }
  });

  res.json(roots);
});

// Create comment
router.post('/:entityType/:entityId', authenticate, requireProjectAccess('contributor'), [
  body('content').notEmpty().isLength({ max: 5000 })
], (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { content, parent_comment_id } = req.body;

  const commentId = uuidv4();

  db.prepare(`
    INSERT INTO comments (id, project_id, entity_type, entity_id, content, parent_comment_id, author_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    commentId,
    req.params.projectId,
    req.params.entityType,
    req.params.entityId,
    content,
    parent_comment_id || null,
    req.user!.id
  );

  const comment = db.prepare(`
    SELECT c.*, u.username as author_username, u.display_name as author_display_name, u.avatar_url as author_avatar
    FROM comments c
    JOIN users u ON u.id = c.author_id
    WHERE c.id = ?
  `).get(commentId);

  res.status(201).json(comment);
});

// Update comment
router.patch('/:entityType/:entityId/:commentId', authenticate, requireProjectAccess('contributor'), [
  body('content').optional().isLength({ max: 5000 }),
  body('is_resolved').optional().isBoolean(),
  body('is_pinned').optional().isBoolean()
], (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  // Check ownership (only author can edit content, but others can resolve/pin)
  const comment = db.prepare('SELECT author_id FROM comments WHERE id = ?').get(req.params.commentId) as { author_id: string } | undefined;

  if (!comment) {
    res.status(404).json({ error: 'Comment not found' });
    return;
  }

  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (req.body.content !== undefined) {
    // Only author can edit content
    if (comment.author_id !== req.user!.id) {
      res.status(403).json({ error: 'Only the author can edit the comment' });
      return;
    }
    updates.push('content = ?');
    values.push(req.body.content);
  }

  if (req.body.is_resolved !== undefined) {
    updates.push('is_resolved = ?');
    values.push(req.body.is_resolved ? 1 : 0);
  }

  if (req.body.is_pinned !== undefined) {
    updates.push('is_pinned = ?');
    values.push(req.body.is_pinned ? 1 : 0);
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(req.params.commentId);

  db.prepare(`UPDATE comments SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const updatedComment = db.prepare(`
    SELECT c.*, u.username as author_username, u.display_name as author_display_name, u.avatar_url as author_avatar
    FROM comments c
    JOIN users u ON u.id = c.author_id
    WHERE c.id = ?
  `).get(req.params.commentId);

  res.json(updatedComment);
});

// Delete comment
router.delete('/:entityType/:entityId/:commentId', authenticate, requireProjectAccess('contributor'), (req: AuthRequest, res: Response) => {
  const comment = db.prepare('SELECT author_id FROM comments WHERE id = ?').get(req.params.commentId) as { author_id: string } | undefined;

  if (!comment) {
    res.status(404).json({ error: 'Comment not found' });
    return;
  }

  // Only author or admins can delete
  if (comment.author_id !== req.user!.id && req.projectRole !== 'admin' && req.projectRole !== 'owner') {
    res.status(403).json({ error: 'Only the author or admins can delete the comment' });
    return;
  }

  // Delete replies first
  db.prepare('DELETE FROM comments WHERE parent_comment_id = ?').run(req.params.commentId);
  db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.commentId);

  res.json({ message: 'Comment deleted' });
});

export default router;
