import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';
import db from '../db/index.js';
import { authenticate, requireProjectAccess, AuthRequest } from '../middleware/auth.js';
import { logActivity } from '../utils/activity.js';

const router = Router({ mergeParams: true });

// Get trail (nodes and connections)
router.get('/', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const nodes = db.prepare(`
    SELECT * FROM trail_nodes
    WHERE project_id = ?
    ORDER BY created_at ASC
  `).all(req.params.projectId);

  const connections = db.prepare(`
    SELECT * FROM trail_connections
    WHERE project_id = ?
  `).all(req.params.projectId);

  res.json({ nodes, connections });
});

// Create node
router.post('/nodes', authenticate, requireProjectAccess('contributor'), [
  body('name').notEmpty().isLength({ max: 100 }),
  body('node_type').optional().isIn(['entry_point', 'waypoint', 'branch', 'convergence', 'dead_end', 'secret', 'finale'])
], (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const {
    name, node_type, description, content_type, content_id,
    position_x, position_y, discovery_method, estimated_discovery_time, status
  } = req.body;

  const nodeId = uuidv4();

  db.prepare(`
    INSERT INTO trail_nodes (
      id, project_id, name, node_type, description, content_type, content_id,
      position_x, position_y, discovery_method, estimated_discovery_time, status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    nodeId,
    req.params.projectId,
    name,
    node_type || 'waypoint',
    description || null,
    content_type || null,
    content_id || null,
    position_x || 0,
    position_y || 0,
    discovery_method || null,
    estimated_discovery_time || null,
    status || 'planned'
  );

  logActivity(req.params.projectId, req.user!.id, 'created', 'trail_node', nodeId, name);

  const node = db.prepare('SELECT * FROM trail_nodes WHERE id = ?').get(nodeId);
  res.status(201).json(node);
});

// Get single node
router.get('/nodes/:nodeId', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const node = db.prepare(`
    SELECT * FROM trail_nodes
    WHERE id = ? AND project_id = ?
  `).get(req.params.nodeId, req.params.projectId);

  if (!node) {
    res.status(404).json({ error: 'Node not found' });
    return;
  }

  // Get incoming connections
  const incomingConnections = db.prepare(`
    SELECT tc.*, tn.name as from_node_name
    FROM trail_connections tc
    JOIN trail_nodes tn ON tn.id = tc.from_node_id
    WHERE tc.to_node_id = ?
  `).all(req.params.nodeId);

  // Get outgoing connections
  const outgoingConnections = db.prepare(`
    SELECT tc.*, tn.name as to_node_name
    FROM trail_connections tc
    JOIN trail_nodes tn ON tn.id = tc.to_node_id
    WHERE tc.from_node_id = ?
  `).all(req.params.nodeId);

  // Get content details if available
  let content = null;
  const nodeData = node as { content_type: string | null; content_id: string | null };
  if (nodeData.content_type && nodeData.content_id) {
    const tableMap: Record<string, string> = {
      puzzle: 'puzzles',
      character: 'characters',
      story_beat: 'story_beats',
      event: 'events',
      location: 'locations'
    };
    const table = tableMap[nodeData.content_type];
    if (table) {
      content = db.prepare(`SELECT id, ${table === 'puzzles' ? 'title' : 'name'} as name FROM ${table} WHERE id = ?`).get(nodeData.content_id);
    }
  }

  res.json({
    ...node,
    incomingConnections,
    outgoingConnections,
    content
  });
});

// Update node
router.patch('/nodes/:nodeId', authenticate, requireProjectAccess('contributor'), (req: AuthRequest, res: Response) => {
  const allowedFields = [
    'name', 'node_type', 'description', 'content_type', 'content_id',
    'position_x', 'position_y', 'discovery_method', 'estimated_discovery_time', 'status'
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
  values.push(req.params.nodeId);
  values.push(req.params.projectId);

  db.prepare(`
    UPDATE trail_nodes SET ${updates.join(', ')} WHERE id = ? AND project_id = ?
  `).run(...values);

  const node = db.prepare('SELECT * FROM trail_nodes WHERE id = ?').get(req.params.nodeId);
  res.json(node);
});

// Delete node
router.delete('/nodes/:nodeId', authenticate, requireProjectAccess('lead'), (req: AuthRequest, res: Response) => {
  // Delete connections
  db.prepare('DELETE FROM trail_connections WHERE from_node_id = ? OR to_node_id = ?')
    .run(req.params.nodeId, req.params.nodeId);

  db.prepare('DELETE FROM trail_nodes WHERE id = ? AND project_id = ?')
    .run(req.params.nodeId, req.params.projectId);

  logActivity(req.params.projectId, req.user!.id, 'deleted', 'trail_node', req.params.nodeId);

  res.json({ message: 'Node deleted' });
});

// Bulk update node positions
router.patch('/nodes/positions', authenticate, requireProjectAccess('contributor'), [
  body('nodes').isArray(),
  body('nodes.*.id').isUUID(),
  body('nodes.*.position_x').isNumeric(),
  body('nodes.*.position_y').isNumeric()
], (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { nodes } = req.body;

  const updateStmt = db.prepare(`
    UPDATE trail_nodes SET position_x = ?, position_y = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND project_id = ?
  `);

  const updateMany = db.transaction((items: Array<{ id: string; position_x: number; position_y: number }>) => {
    for (const item of items) {
      updateStmt.run(item.position_x, item.position_y, item.id, req.params.projectId);
    }
  });

  updateMany(nodes);

  res.json({ message: 'Positions updated' });
});

// Connections

// Create connection
router.post('/connections', authenticate, requireProjectAccess('contributor'), [
  body('from_node_id').isUUID(),
  body('to_node_id').isUUID(),
  body('connection_type').optional().isIn(['sequential', 'optional', 'secret', 'conditional'])
], (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { from_node_id, to_node_id, connection_type, condition, description } = req.body;

  // Check for existing connection
  const existing = db.prepare(`
    SELECT id FROM trail_connections
    WHERE from_node_id = ? AND to_node_id = ? AND project_id = ?
  `).get(from_node_id, to_node_id, req.params.projectId);

  if (existing) {
    res.status(409).json({ error: 'Connection already exists' });
    return;
  }

  const connectionId = uuidv4();

  db.prepare(`
    INSERT INTO trail_connections (id, project_id, from_node_id, to_node_id, connection_type, condition, description)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    connectionId,
    req.params.projectId,
    from_node_id,
    to_node_id,
    connection_type || 'sequential',
    condition || null,
    description || null
  );

  const connection = db.prepare('SELECT * FROM trail_connections WHERE id = ?').get(connectionId);
  res.status(201).json(connection);
});

// Update connection
router.patch('/connections/:connectionId', authenticate, requireProjectAccess('contributor'), (req: AuthRequest, res: Response) => {
  const allowedFields = ['connection_type', 'condition', 'description'];
  const updates: string[] = [];
  const values: (string | null)[] = [];

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

  values.push(req.params.connectionId);
  values.push(req.params.projectId);

  db.prepare(`
    UPDATE trail_connections SET ${updates.join(', ')} WHERE id = ? AND project_id = ?
  `).run(...values);

  const connection = db.prepare('SELECT * FROM trail_connections WHERE id = ?').get(req.params.connectionId);
  res.json(connection);
});

// Delete connection
router.delete('/connections/:connectionId', authenticate, requireProjectAccess('contributor'), (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM trail_connections WHERE id = ? AND project_id = ?')
    .run(req.params.connectionId, req.params.projectId);

  res.json({ message: 'Connection deleted' });
});

export default router;
