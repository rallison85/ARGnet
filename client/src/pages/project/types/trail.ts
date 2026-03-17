// Canonical type definitions for Trail Map entities.
// All trail-related components should import from this file.

export type TrailMapNodeType =
  | 'entry_point'
  | 'waypoint'
  | 'branch'
  | 'gate'
  | 'merge'
  | 'secret'
  | 'bonus'
  | 'finale'
  | 'dead_end'
  | 'hub'
  | 'convergence';

export type UnlockConditionType =
  | 'always'
  | 'puzzle_solved'
  | 'time_reached'
  | 'node_completed'
  | 'manual_trigger'
  | 'player_count'
  | 'external_event';

export type TrailMapEdgeType =
  | 'automatic'
  | 'choice'
  | 'puzzle'
  | 'time'
  | 'manual'
  | 'conditional';

export interface TrailMapNode {
  id: string;
  project_id: string;
  name: string;
  node_type: TrailMapNodeType;
  description: string | null;
  position_x: number;
  position_y: number;
  layer: 'narrative' | 'physical';
  content_type: string | null;
  content_id: string | null;
  unlock_condition_type: UnlockConditionType;
  unlock_condition_config: string | null;
  completion_condition_type: string;
  completion_condition_config: string | null;
  estimated_duration_minutes: number | null;
  is_required: number;
  visibility: string;
  is_unlocked: number;
  is_completed: number;
  sort_order: number;
  discovery_method: string | null;
  estimated_discovery_time: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TrailMapEdge {
  id: string;
  project_id: string;
  source_node_id: string;
  target_node_id: string;
  edge_type: TrailMapEdgeType;
  condition_config: string | null;
  is_bidirectional: number;
  label: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}
