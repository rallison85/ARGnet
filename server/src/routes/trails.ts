import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';
import db from '../db/index.js';
import { authenticate, requireProjectAccess, AuthRequest } from '../middleware/auth.js';
import { logActivity } from '../utils/activity.js';
import { TrailMapNodeHelpers } from '../db/trail-map-node-types.js';
import { TrailMapEdgeHelpers } from '../db/trail-map-edge-types.js';
import { PhysicalPointHelpers, PhysicalRouteHelpers } from '../db/trail-map-physical-types.js';

const router = Router({ mergeParams: true });

// Valid enum values for validation
const VALID_NODE_TYPES = [
  'entry_point', 'waypoint', 'branch', 'gate', 'merge', 'secret', 'bonus',
  'finale', 'dead_end', 'hub', 'convergence'
];

const VALID_UNLOCK_CONDITION_TYPES = [
  'always', 'puzzle_solved', 'time_reached', 'node_completed',
  'manual_trigger', 'player_count', 'external_event'
];

const VALID_COMPLETION_CONDITION_TYPES = [
  'automatic', 'puzzle_solved', 'manual', 'time_based'
];

const VALID_VISIBILITY_VALUES = ['always_visible', 'hidden_until_unlocked', 'teased'];

const VALID_EDGE_TYPES = ['automatic', 'choice', 'puzzle', 'time', 'manual', 'conditional'];

const VALID_PHYSICAL_POINT_TYPES = ['start', 'waypoint', 'checkpoint', 'cache', 'finale', 'optional'];

const VALID_TRAVEL_MODES = ['walking', 'driving', 'transit', 'any'];

// Get trail map (nodes and edges)
router.get('/', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const { layer } = req.query;

  // Build node query with optional layer filter
  let nodeQuery = `
    SELECT * FROM trail_map_nodes
    WHERE project_id = ?
  `;
  const nodeParams: any[] = [req.params.projectId];

  if (layer && layer !== 'all') {
    nodeQuery += ` AND layer = ?`;
    nodeParams.push(layer);
  }

  nodeQuery += ` ORDER BY created_at ASC`;

  const nodes = db.prepare(nodeQuery).all(...nodeParams);

  const edges = db.prepare(`
    SELECT * FROM trail_map_edges
    WHERE project_id = ?
  `).all(req.params.projectId);

  res.json({ nodes, edges });
});

// Create node
router.post('/nodes', authenticate, requireProjectAccess('contributor'), [
  body('name').notEmpty().isLength({ max: 255 }),
  body('node_type').optional().isIn(VALID_NODE_TYPES),
  body('layer').optional().isIn(['narrative', 'physical']),
  body('unlock_condition_type').optional().isIn(VALID_UNLOCK_CONDITION_TYPES),
  body('completion_condition_type').optional().isIn(VALID_COMPLETION_CONDITION_TYPES),
  body('visibility').optional().isIn(VALID_VISIBILITY_VALUES)
], (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const {
    name, node_type, description, content_type, content_id,
    position_x, position_y, layer,
    unlock_condition_type, unlock_condition_config,
    completion_condition_type, completion_condition_config,
    visibility, is_unlocked, is_completed, is_required,
    estimated_duration_minutes, sort_order,
    // Legacy fields
    discovery_method, estimated_discovery_time, status
  } = req.body;

  // Validate and parse JSON config fields
  let parsedUnlockConfig = null;
  let parsedCompletionConfig = null;

  if (unlock_condition_config) {
    try {
      parsedUnlockConfig = typeof unlock_condition_config === 'string'
        ? unlock_condition_config
        : JSON.stringify(unlock_condition_config);
    } catch (error) {
      res.status(400).json({ error: 'Invalid unlock_condition_config JSON' });
      return;
    }
  }

  if (completion_condition_config) {
    try {
      parsedCompletionConfig = typeof completion_condition_config === 'string'
        ? completion_condition_config
        : JSON.stringify(completion_condition_config);
    } catch (error) {
      res.status(400).json({ error: 'Invalid completion_condition_config JSON' });
      return;
    }
  }

  const nodeId = uuidv4();

  db.prepare(`
    INSERT INTO trail_map_nodes (
      id, project_id, name, node_type, description, content_type, content_id,
      position_x, position_y, layer,
      unlock_condition_type, unlock_condition_config,
      completion_condition_type, completion_condition_config,
      visibility, is_unlocked, is_completed, is_required,
      estimated_duration_minutes, sort_order,
      discovery_method, estimated_discovery_time, status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    layer || 'narrative',
    unlock_condition_type || 'always',
    parsedUnlockConfig,
    completion_condition_type || 'automatic',
    parsedCompletionConfig,
    visibility || 'always_visible',
    is_unlocked !== undefined ? (is_unlocked ? 1 : 0) : 0,
    is_completed !== undefined ? (is_completed ? 1 : 0) : 0,
    is_required !== undefined ? (is_required ? 1 : 0) : 1,
    estimated_duration_minutes || null,
    sort_order || 0,
    discovery_method || null,
    estimated_discovery_time || null,
    status || 'planned'
  );

  logActivity(req.params.projectId, req.user!.id, 'created', 'trail_map_node', nodeId, name);

  const node = db.prepare('SELECT * FROM trail_map_nodes WHERE id = ?').get(nodeId);
  res.status(201).json(node);
});

// Bulk update node positions (MUST be before /nodes/:nodeId routes)
router.patch('/nodes/positions', authenticate, requireProjectAccess('contributor'), [
  body('nodes').isArray()
], (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { nodes } = req.body;

  // Validate each node has required fields
  for (const node of nodes) {
    if (!node.id || typeof node.position_x !== 'number' || typeof node.position_y !== 'number') {
      res.status(400).json({ error: 'Each node must have id, position_x (number), and position_y (number)' });
      return;
    }
  }

  const updateStmt = db.prepare(`
    UPDATE trail_map_nodes SET position_x = ?, position_y = ?, updated_at = CURRENT_TIMESTAMP
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

// Get single node
router.get('/nodes/:nodeId', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const node = db.prepare(`
    SELECT * FROM trail_map_nodes
    WHERE id = ? AND project_id = ?
  `).get(req.params.nodeId, req.params.projectId);

  if (!node) {
    res.status(404).json({ error: 'Node not found' });
    return;
  }

  // Get incoming edges
  const incomingEdges = db.prepare(`
    SELECT te.*, tn.name as source_node_name
    FROM trail_map_edges te
    JOIN trail_map_nodes tn ON tn.id = te.source_node_id
    WHERE te.target_node_id = ?
  `).all(req.params.nodeId);

  // Get outgoing edges
  const outgoingEdges = db.prepare(`
    SELECT te.*, tn.name as target_node_name
    FROM trail_map_edges te
    JOIN trail_map_nodes tn ON tn.id = te.target_node_id
    WHERE te.source_node_id = ?
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
    incomingEdges,
    outgoingEdges,
    content
  });
});

// Update node
router.patch('/nodes/:nodeId', authenticate, requireProjectAccess('contributor'), (req: AuthRequest, res: Response) => {
  const allowedFields = [
    'name', 'node_type', 'description', 'content_type', 'content_id',
    'position_x', 'position_y', 'layer',
    'unlock_condition_type', 'unlock_condition_config',
    'completion_condition_type', 'completion_condition_config',
    'visibility', 'is_unlocked', 'is_completed', 'is_required',
    'estimated_duration_minutes', 'sort_order',
    'discovery_method', 'estimated_discovery_time', 'status'
  ];

  // Validate enum fields if provided
  if (req.body.node_type && !VALID_NODE_TYPES.includes(req.body.node_type)) {
    res.status(400).json({ error: 'Invalid node_type' });
    return;
  }
  if (req.body.unlock_condition_type && !VALID_UNLOCK_CONDITION_TYPES.includes(req.body.unlock_condition_type)) {
    res.status(400).json({ error: 'Invalid unlock_condition_type' });
    return;
  }
  if (req.body.completion_condition_type && !VALID_COMPLETION_CONDITION_TYPES.includes(req.body.completion_condition_type)) {
    res.status(400).json({ error: 'Invalid completion_condition_type' });
    return;
  }
  if (req.body.visibility && !VALID_VISIBILITY_VALUES.includes(req.body.visibility)) {
    res.status(400).json({ error: 'Invalid visibility' });
    return;
  }

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      // Handle JSON config fields
      if (field === 'unlock_condition_config' || field === 'completion_condition_config') {
        try {
          const configValue = req.body[field];
          values.push(configValue === null ? null : (typeof configValue === 'string' ? configValue : JSON.stringify(configValue)));
          updates.push(`${field} = ?`);
        } catch (error) {
          res.status(400).json({ error: `Invalid ${field} JSON` });
          return;
        }
      }
      // Handle boolean fields (convert to 0/1)
      else if (field === 'is_unlocked' || field === 'is_completed' || field === 'is_required') {
        values.push(req.body[field] ? 1 : 0);
        updates.push(`${field} = ?`);
      }
      else {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
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
    UPDATE trail_map_nodes SET ${updates.join(', ')} WHERE id = ? AND project_id = ?
  `).run(...values);

  const node = db.prepare('SELECT * FROM trail_map_nodes WHERE id = ?').get(req.params.nodeId);
  res.json(node);
});

// Delete node
router.delete('/nodes/:nodeId', authenticate, requireProjectAccess('lead'), (req: AuthRequest, res: Response) => {
  // Delete edges
  db.prepare('DELETE FROM trail_map_edges WHERE source_node_id = ? OR target_node_id = ?')
    .run(req.params.nodeId, req.params.nodeId);

  db.prepare('DELETE FROM trail_map_nodes WHERE id = ? AND project_id = ?')
    .run(req.params.nodeId, req.params.projectId);

  logActivity(req.params.projectId, req.user!.id, 'deleted', 'trail_map_node', req.params.nodeId);

  res.json({ message: 'Node deleted' });
});

// Edges (formerly connections)

// Create edge
router.post('/edges', authenticate, requireProjectAccess('contributor'), [
  body('source_node_id').optional().isUUID(),
  body('target_node_id').optional().isUUID(),
  body('from_node_id').optional().isUUID(), // Legacy support
  body('to_node_id').optional().isUUID(), // Legacy support
  body('edge_type').optional().isIn(VALID_EDGE_TYPES),
  body('connection_type').optional() // Legacy support
], (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  // Support both old and new field names for backward compatibility
  const sourceNodeId = req.body.source_node_id || req.body.from_node_id;
  const targetNodeId = req.body.target_node_id || req.body.to_node_id;
  const edgeType = req.body.edge_type || req.body.connection_type || 'automatic';
  const conditionConfig = req.body.condition_config || req.body.condition || null;
  const label = req.body.label || req.body.description || null;
  const isBidirectional = req.body.is_bidirectional !== undefined ? (req.body.is_bidirectional ? 1 : 0) : 0;
  const isActive = req.body.is_active !== undefined ? (req.body.is_active ? 1 : 0) : 1;

  if (!sourceNodeId || !targetNodeId) {
    res.status(400).json({ error: 'source_node_id and target_node_id are required' });
    return;
  }

  // Prevent self-loop edges
  if (sourceNodeId === targetNodeId) {
    res.status(400).json({ error: 'Self-loop edges are not allowed (source and target must differ)' });
    return;
  }

  // Validate both nodes exist and belong to the same project
  const sourceNode = db.prepare('SELECT id FROM trail_map_nodes WHERE id = ? AND project_id = ?')
    .get(sourceNodeId, req.params.projectId);
  const targetNode = db.prepare('SELECT id FROM trail_map_nodes WHERE id = ? AND project_id = ?')
    .get(targetNodeId, req.params.projectId);

  if (!sourceNode || !targetNode) {
    res.status(404).json({ error: 'One or both nodes not found in this project' });
    return;
  }

  // Check for existing edge
  const existing = db.prepare(`
    SELECT id FROM trail_map_edges
    WHERE source_node_id = ? AND target_node_id = ? AND project_id = ?
  `).get(sourceNodeId, targetNodeId, req.params.projectId);

  if (existing) {
    res.status(409).json({ error: 'Edge already exists' });
    return;
  }

  // Parse and validate condition_config if provided
  let parsedConditionConfig = null;
  if (conditionConfig) {
    try {
      parsedConditionConfig = typeof conditionConfig === 'string'
        ? conditionConfig
        : JSON.stringify(conditionConfig);
    } catch (error) {
      res.status(400).json({ error: 'Invalid condition_config JSON' });
      return;
    }
  }

  const edgeId = uuidv4();

  db.prepare(`
    INSERT INTO trail_map_edges (
      id, project_id, source_node_id, target_node_id,
      edge_type, condition_config, is_bidirectional, label, is_active
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    edgeId,
    req.params.projectId,
    sourceNodeId,
    targetNodeId,
    edgeType,
    parsedConditionConfig,
    isBidirectional,
    label,
    isActive
  );

  logActivity(req.params.projectId, req.user!.id, 'created', 'trail_map_edge', edgeId);

  const edge = db.prepare('SELECT * FROM trail_map_edges WHERE id = ?').get(edgeId);
  res.status(201).json(edge);
});

// Update edge
router.patch('/edges/:edgeId', authenticate, requireProjectAccess('contributor'), (req: AuthRequest, res: Response) => {
  const allowedFields = ['source_node_id', 'target_node_id', 'edge_type', 'condition_config', 'is_bidirectional', 'label', 'is_active'];

  // Validate edge_type if provided
  if (req.body.edge_type && !VALID_EDGE_TYPES.includes(req.body.edge_type)) {
    res.status(400).json({ error: 'Invalid edge_type' });
    return;
  }

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      // Handle JSON config field
      if (field === 'condition_config') {
        try {
          const configValue = req.body[field];
          values.push(configValue === null ? null : (typeof configValue === 'string' ? configValue : JSON.stringify(configValue)));
          updates.push(`${field} = ?`);
        } catch (error) {
          res.status(400).json({ error: 'Invalid condition_config JSON' });
          return;
        }
      }
      // Handle boolean fields
      else if (field === 'is_bidirectional' || field === 'is_active') {
        values.push(req.body[field] ? 1 : 0);
        updates.push(`${field} = ?`);
      }
      else {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    }
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(req.params.edgeId);
  values.push(req.params.projectId);

  db.prepare(`
    UPDATE trail_map_edges SET ${updates.join(', ')} WHERE id = ? AND project_id = ?
  `).run(...values);

  const edge = db.prepare('SELECT * FROM trail_map_edges WHERE id = ?').get(req.params.edgeId);
  res.json(edge);
});

// Delete edge
router.delete('/edges/:edgeId', authenticate, requireProjectAccess('contributor'), (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM trail_map_edges WHERE id = ? AND project_id = ?')
    .run(req.params.edgeId, req.params.projectId);

  logActivity(req.params.projectId, req.user!.id, 'deleted', 'trail_map_edge', req.params.edgeId);

  res.json({ message: 'Edge deleted' });
});

// Legacy connections endpoints (backward compatibility)
router.post('/connections', authenticate, requireProjectAccess('contributor'), [
  body('from_node_id').isUUID(),
  body('to_node_id').isUUID(),
  body('connection_type').optional()
], (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  // Map old field names to new ones
  const sourceNodeId = req.body.from_node_id;
  const targetNodeId = req.body.to_node_id;
  const edgeType = req.body.connection_type || 'automatic';
  const conditionConfig = req.body.condition || null;
  const label = req.body.description || null;

  // Prevent self-loop edges
  if (sourceNodeId === targetNodeId) {
    res.status(400).json({ error: 'Self-loop edges are not allowed (source and target must differ)' });
    return;
  }

  // Validate both nodes exist
  const sourceNode = db.prepare('SELECT id FROM trail_map_nodes WHERE id = ? AND project_id = ?')
    .get(sourceNodeId, req.params.projectId);
  const targetNode = db.prepare('SELECT id FROM trail_map_nodes WHERE id = ? AND project_id = ?')
    .get(targetNodeId, req.params.projectId);

  if (!sourceNode || !targetNode) {
    res.status(404).json({ error: 'One or both nodes not found in this project' });
    return;
  }

  // Check for existing edge
  const existing = db.prepare(`
    SELECT id FROM trail_map_edges
    WHERE source_node_id = ? AND target_node_id = ? AND project_id = ?
  `).get(sourceNodeId, targetNodeId, req.params.projectId);

  if (existing) {
    res.status(409).json({ error: 'Connection already exists' });
    return;
  }

  let parsedConditionConfig = null;
  if (conditionConfig) {
    try {
      parsedConditionConfig = typeof conditionConfig === 'string'
        ? conditionConfig
        : JSON.stringify(conditionConfig);
    } catch (error) {
      res.status(400).json({ error: 'Invalid condition JSON' });
      return;
    }
  }

  const edgeId = uuidv4();

  db.prepare(`
    INSERT INTO trail_map_edges (
      id, project_id, source_node_id, target_node_id,
      edge_type, condition_config, is_bidirectional, label, is_active
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    edgeId,
    req.params.projectId,
    sourceNodeId,
    targetNodeId,
    edgeType,
    parsedConditionConfig,
    0,
    label,
    1
  );

  logActivity(req.params.projectId, req.user!.id, 'created', 'trail_map_edge', edgeId);

  const edge = db.prepare('SELECT * FROM trail_map_edges WHERE id = ?').get(edgeId);
  res.status(201).json(edge);
});

router.patch('/connections/:connectionId', authenticate, requireProjectAccess('contributor'), (req: AuthRequest, res: Response) => {
  const allowedFields = ['connection_type', 'condition', 'description'];
  const updates: string[] = [];
  const values: (string | null)[] = [];

  // Map old field names to new schema
  if (req.body.connection_type !== undefined) {
    updates.push('edge_type = ?');
    values.push(req.body.connection_type);
  }
  if (req.body.condition !== undefined) {
    try {
      const configValue = req.body.condition;
      values.push(configValue === null ? null : (typeof configValue === 'string' ? configValue : JSON.stringify(configValue)));
      updates.push('condition_config = ?');
    } catch (error) {
      res.status(400).json({ error: 'Invalid condition JSON' });
      return;
    }
  }
  if (req.body.description !== undefined) {
    updates.push('label = ?');
    values.push(req.body.description);
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(req.params.connectionId);
  values.push(req.params.projectId);

  db.prepare(`
    UPDATE trail_map_edges SET ${updates.join(', ')} WHERE id = ? AND project_id = ?
  `).run(...values);

  const edge = db.prepare('SELECT * FROM trail_map_edges WHERE id = ?').get(req.params.connectionId);
  res.json(edge);
});

router.delete('/connections/:connectionId', authenticate, requireProjectAccess('contributor'), (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM trail_map_edges WHERE id = ? AND project_id = ?')
    .run(req.params.connectionId, req.params.projectId);

  logActivity(req.params.projectId, req.user!.id, 'deleted', 'trail_map_edge', req.params.connectionId);

  res.json({ message: 'Connection deleted' });
});

// Validate trail map
router.get('/validate', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const nodes = db.prepare('SELECT * FROM trail_map_nodes WHERE project_id = ?')
    .all(req.params.projectId) as any[];

  const edges = db.prepare('SELECT * FROM trail_map_edges WHERE project_id = ?')
    .all(req.params.projectId) as any[];

  const issues: {
    orphanNodes: Array<{ id: string; name: string }>;
    unreachableNodes: Array<{ id: string; name: string }>;
    missingEntryPoint: boolean;
    circularPaths: string[][];
  } = {
    orphanNodes: [],
    unreachableNodes: [],
    missingEntryPoint: true,
    circularPaths: []
  };

  // Check for entry points
  const entryPoints = nodes.filter(n => n.node_type === 'entry_point');
  issues.missingEntryPoint = entryPoints.length === 0;

  // Build adjacency map for reachability check
  const adjacencyMap = new Map<string, Set<string>>();
  nodes.forEach(node => {
    adjacencyMap.set(node.id, new Set());
  });

  edges.forEach(edge => {
    const targets = adjacencyMap.get(edge.source_node_id);
    if (targets) {
      targets.add(edge.target_node_id);
    }
    // Handle bidirectional edges
    if (edge.is_bidirectional === 1) {
      const reverseTargets = adjacencyMap.get(edge.target_node_id);
      if (reverseTargets) {
        reverseTargets.add(edge.source_node_id);
      }
    }
  });

  // Find orphan nodes (nodes with no edges)
  nodes.forEach(node => {
    const outgoing = adjacencyMap.get(node.id)?.size || 0;
    const incoming = edges.filter(e =>
      e.target_node_id === node.id || (e.is_bidirectional === 1 && e.source_node_id === node.id)
    ).length;

    if (outgoing === 0 && incoming === 0) {
      issues.orphanNodes.push({ id: node.id, name: node.name });
    }
  });

  // Find unreachable nodes (BFS from entry points)
  const reachable = new Set<string>();
  const queue: string[] = [...entryPoints.map(n => n.id)];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (reachable.has(current)) continue;

    reachable.add(current);
    const neighbors = adjacencyMap.get(current);
    if (neighbors) {
      neighbors.forEach(neighbor => {
        if (!reachable.has(neighbor)) {
          queue.push(neighbor);
        }
      });
    }
  }

  nodes.forEach(node => {
    if (!reachable.has(node.id) && node.node_type !== 'entry_point') {
      issues.unreachableNodes.push({ id: node.id, name: node.name });
    }
  });

  // Detect circular paths from each entry point
  const allCircularPaths: string[][] = [];
  entryPoints.forEach(entryPoint => {
    const cycles = TrailMapEdgeHelpers.findCircularPaths(edges, entryPoint.id);
    allCircularPaths.push(...cycles);
  });

  // Deduplicate circular paths
  const uniquePaths = new Set(allCircularPaths.map(p => JSON.stringify(p.sort())));
  issues.circularPaths = Array.from(uniquePaths).map(p => JSON.parse(p));

  const valid =
    issues.orphanNodes.length === 0 &&
    issues.unreachableNodes.length === 0 &&
    !issues.missingEntryPoint &&
    issues.circularPaths.length === 0;

  res.json({ valid, issues });
});

// Physical Points Endpoints

// Get physical points
router.get('/physical/points', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const { active } = req.query;

  let query = 'SELECT * FROM trail_map_physical_points WHERE project_id = ?';
  const params: any[] = [req.params.projectId];

  if (active === 'true') {
    query += ' AND is_active = 1';
  }

  query += ' ORDER BY sort_order ASC, created_at ASC';

  const points = db.prepare(query).all(...params);
  res.json(points);
});

// Create physical point
router.post('/physical/points', authenticate, requireProjectAccess('contributor'), [
  body('name').notEmpty().isLength({ max: 255 }),
  body('latitude').isFloat({ min: -90, max: 90 }),
  body('longitude').isFloat({ min: -180, max: 180 }),
  body('radius_meters').optional().isFloat({ min: 0 }),
  body('point_type').optional().isIn(VALID_PHYSICAL_POINT_TYPES)
], (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const {
    node_id, location_id, name, latitude, longitude, radius_meters,
    point_type, instructions, hint_if_stuck,
    requires_physical_presence, qr_code_data, nfc_tag_id,
    accessibility_notes, travel_notes, is_active, sort_order
  } = req.body;

  const pointId = uuidv4();

  db.prepare(`
    INSERT INTO trail_map_physical_points (
      id, project_id, node_id, location_id, name, latitude, longitude,
      radius_meters, point_type, instructions, hint_if_stuck,
      requires_physical_presence, qr_code_data, nfc_tag_id,
      accessibility_notes, travel_notes, is_active, sort_order
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    pointId,
    req.params.projectId,
    node_id || null,
    location_id || null,
    name,
    latitude,
    longitude,
    radius_meters || 10,
    point_type || null,
    instructions || null,
    hint_if_stuck || null,
    requires_physical_presence !== undefined ? (requires_physical_presence ? 1 : 0) : 1,
    qr_code_data || null,
    nfc_tag_id || null,
    accessibility_notes || null,
    travel_notes || null,
    is_active !== undefined ? (is_active ? 1 : 0) : 1,
    sort_order || 0
  );

  logActivity(req.params.projectId, req.user!.id, 'created', 'trail_map_physical_point', pointId, name);

  const point = db.prepare('SELECT * FROM trail_map_physical_points WHERE id = ?').get(pointId);
  res.status(201).json(point);
});

// Get single physical point
router.get('/physical/points/:pointId', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const point = db.prepare(`
    SELECT * FROM trail_map_physical_points
    WHERE id = ? AND project_id = ?
  `).get(req.params.pointId, req.params.projectId);

  if (!point) {
    res.status(404).json({ error: 'Physical point not found' });
    return;
  }

  // Get associated node if available
  let node = null;
  const pointData = point as { node_id: string | null };
  if (pointData.node_id) {
    node = db.prepare('SELECT id, name, node_type FROM trail_map_nodes WHERE id = ?')
      .get(pointData.node_id);
  }

  // Get associated location if available
  let location = null;
  const locationData = point as { location_id: string | null };
  if (locationData.location_id) {
    location = db.prepare('SELECT id, name, location_type FROM locations WHERE id = ?')
      .get(locationData.location_id);
  }

  res.json({
    ...point,
    node,
    location
  });
});

// Update physical point
router.patch('/physical/points/:pointId', authenticate, requireProjectAccess('contributor'), (req: AuthRequest, res: Response) => {
  const allowedFields = [
    'node_id', 'location_id', 'name', 'latitude', 'longitude',
    'radius_meters', 'point_type', 'instructions', 'hint_if_stuck',
    'requires_physical_presence', 'qr_code_data', 'nfc_tag_id',
    'accessibility_notes', 'travel_notes', 'is_active', 'sort_order'
  ];

  // Validate latitude/longitude if provided
  if (req.body.latitude !== undefined) {
    const lat = parseFloat(req.body.latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      res.status(400).json({ error: 'Invalid latitude (must be between -90 and 90)' });
      return;
    }
  }
  if (req.body.longitude !== undefined) {
    const lon = parseFloat(req.body.longitude);
    if (isNaN(lon) || lon < -180 || lon > 180) {
      res.status(400).json({ error: 'Invalid longitude (must be between -180 and 180)' });
      return;
    }
  }

  // Validate point_type if provided
  if (req.body.point_type && !VALID_PHYSICAL_POINT_TYPES.includes(req.body.point_type)) {
    res.status(400).json({ error: 'Invalid point_type' });
    return;
  }

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      // Handle boolean fields
      if (field === 'requires_physical_presence' || field === 'is_active') {
        values.push(req.body[field] ? 1 : 0);
        updates.push(`${field} = ?`);
      }
      else {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    }
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(req.params.pointId);
  values.push(req.params.projectId);

  db.prepare(`
    UPDATE trail_map_physical_points SET ${updates.join(', ')} WHERE id = ? AND project_id = ?
  `).run(...values);

  const point = db.prepare('SELECT * FROM trail_map_physical_points WHERE id = ?').get(req.params.pointId);
  res.json(point);
});

// Delete physical point
router.delete('/physical/points/:pointId', authenticate, requireProjectAccess('lead'), (req: AuthRequest, res: Response) => {
  // Delete associated routes
  db.prepare('DELETE FROM trail_map_physical_routes WHERE from_point_id = ? OR to_point_id = ?')
    .run(req.params.pointId, req.params.pointId);

  db.prepare('DELETE FROM trail_map_physical_points WHERE id = ? AND project_id = ?')
    .run(req.params.pointId, req.params.projectId);

  logActivity(req.params.projectId, req.user!.id, 'deleted', 'trail_map_physical_point', req.params.pointId);

  res.json({ message: 'Physical point deleted' });
});

// Physical Routes Endpoints

// Get physical routes
router.get('/physical/routes', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const { from_point_id, to_point_id } = req.query;

  let query = 'SELECT * FROM trail_map_physical_routes WHERE project_id = ?';
  const params: any[] = [req.params.projectId];

  if (from_point_id) {
    query += ' AND from_point_id = ?';
    params.push(from_point_id);
  }

  if (to_point_id) {
    query += ' AND to_point_id = ?';
    params.push(to_point_id);
  }

  query += ' ORDER BY created_at ASC';

  const routes = db.prepare(query).all(...params);
  res.json(routes);
});

// Create physical route
router.post('/physical/routes', authenticate, requireProjectAccess('contributor'), [
  body('from_point_id').isUUID(),
  body('to_point_id').isUUID(),
  body('travel_mode').optional().isIn(VALID_TRAVEL_MODES)
], (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const {
    from_point_id, to_point_id, travel_mode,
    estimated_minutes, distance_meters, route_notes
  } = req.body;

  // Validate both points exist
  const fromPoint = db.prepare('SELECT id FROM trail_map_physical_points WHERE id = ? AND project_id = ?')
    .get(from_point_id, req.params.projectId);
  const toPoint = db.prepare('SELECT id FROM trail_map_physical_points WHERE id = ? AND project_id = ?')
    .get(to_point_id, req.params.projectId);

  if (!fromPoint || !toPoint) {
    res.status(404).json({ error: 'One or both points not found in this project' });
    return;
  }

  // Check for existing route
  const existing = db.prepare(`
    SELECT id FROM trail_map_physical_routes
    WHERE from_point_id = ? AND to_point_id = ? AND travel_mode = ? AND project_id = ?
  `).get(from_point_id, to_point_id, travel_mode || 'walking', req.params.projectId);

  if (existing) {
    res.status(409).json({ error: 'Route already exists for this travel mode' });
    return;
  }

  const routeId = uuidv4();

  db.prepare(`
    INSERT INTO trail_map_physical_routes (
      id, project_id, from_point_id, to_point_id, travel_mode,
      estimated_minutes, distance_meters, route_notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    routeId,
    req.params.projectId,
    from_point_id,
    to_point_id,
    travel_mode || 'walking',
    estimated_minutes || null,
    distance_meters || null,
    route_notes || null
  );

  logActivity(req.params.projectId, req.user!.id, 'created', 'trail_map_physical_route', routeId);

  const route = db.prepare('SELECT * FROM trail_map_physical_routes WHERE id = ?').get(routeId);
  res.status(201).json(route);
});

// Delete physical route
router.delete('/physical/routes/:routeId', authenticate, requireProjectAccess('contributor'), (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM trail_map_physical_routes WHERE id = ? AND project_id = ?')
    .run(req.params.routeId, req.params.projectId);

  logActivity(req.params.projectId, req.user!.id, 'deleted', 'trail_map_physical_route', req.params.routeId);

  res.json({ message: 'Physical route deleted' });
});

export default router;
