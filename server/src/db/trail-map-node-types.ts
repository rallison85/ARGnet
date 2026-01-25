/**
 * TypeScript types for enhanced trail map nodes
 */

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
  | 'convergence'; // Legacy type

export type TrailMapLayer = 'narrative' | 'physical';

export type UnlockConditionType =
  | 'always'
  | 'puzzle_solved'
  | 'time_reached'
  | 'node_completed'
  | 'manual_trigger'
  | 'player_count'
  | 'external_event';

export type CompletionConditionType =
  | 'automatic'
  | 'puzzle_solved'
  | 'manual'
  | 'time_based';

export type NodeVisibility = 'always_visible' | 'hidden_until_unlocked' | 'teased';

export type NodeStatus = 'planned' | 'built' | 'testing' | 'live';

// Unlock condition configurations
export interface PuzzleSolvedCondition {
  puzzle_id: string;
}

export interface TimeReachedCondition {
  datetime: string; // ISO datetime
  timezone?: string;
}

export interface NodeCompletedCondition {
  node_id: string;
  all_required?: boolean; // If true, all required nodes must be completed
}

export interface PlayerCountCondition {
  min_players?: number;
  max_players?: number;
}

export interface ExternalEventCondition {
  event_name: string;
  event_data?: Record<string, any>;
}

export type UnlockConditionConfig =
  | PuzzleSolvedCondition
  | TimeReachedCondition
  | NodeCompletedCondition
  | PlayerCountCondition
  | ExternalEventCondition
  | Record<string, any>; // For custom conditions

// Completion condition configurations
export interface PuzzleSolvedCompletion {
  puzzle_id: string;
}

export interface TimeBasedCompletion {
  duration_minutes: number; // Time after node is unlocked
}

export type CompletionConditionConfig =
  | PuzzleSolvedCompletion
  | TimeBasedCompletion
  | Record<string, any>; // For custom conditions

export interface TrailMapNode {
  id: string;
  project_id: string;

  name: string;
  node_type: TrailMapNodeType;
  description: string | null;

  // Visual positioning
  position_x: number;
  position_y: number;
  layer: TrailMapLayer;

  // Content associations
  content_type: string | null;
  content_id: string | null;

  // Unlock conditions
  unlock_condition_type: UnlockConditionType;
  unlock_condition_config: string | null; // JSON

  // Completion conditions
  completion_condition_type: CompletionConditionType;
  completion_condition_config: string | null; // JSON

  // Metadata
  estimated_duration_minutes: number | null;
  is_required: number; // SQLite boolean (0 or 1)
  visibility: NodeVisibility;

  // Live tracking
  is_unlocked: number; // SQLite boolean (0 or 1)
  is_completed: number; // SQLite boolean (0 or 1)

  // Organization
  sort_order: number;

  // Legacy fields
  discovery_method: string | null;
  estimated_discovery_time: string | null;
  status: NodeStatus;

  created_at: string;
  updated_at: string;
}

// Parsed version with JSON fields as objects
export interface TrailMapNodeParsed extends Omit<TrailMapNode, 'unlock_condition_config' | 'completion_condition_config'> {
  unlock_condition_config: UnlockConditionConfig | null;
  completion_condition_config: CompletionConditionConfig | null;
}

// Helper type for creating nodes (without id and timestamps)
export type CreateTrailMapNode = Omit<TrailMapNode, 'id' | 'created_at' | 'updated_at'>;

// Helper type for updating nodes
export type UpdateTrailMapNode = Partial<Omit<TrailMapNode, 'id' | 'project_id' | 'created_at'>>;

// Extended type with related data for display
export interface TrailMapNodeWithRelations extends TrailMapNodeParsed {
  content?: {
    type: string;
    id: string;
    name: string;
    data?: any;
  };
  incoming_edges_count?: number;
  outgoing_edges_count?: number;
  prerequisites?: Array<{
    id: string;
    name: string;
    is_completed: boolean;
  }>;
  unlocks?: Array<{
    id: string;
    name: string;
  }>;
}

// Helper functions for working with trail map node data
export const TrailMapNodeHelpers = {
  /**
   * Parse JSON fields from database node record
   */
  parse(node: TrailMapNode): TrailMapNodeParsed {
    return {
      ...node,
      unlock_condition_config: node.unlock_condition_config
        ? JSON.parse(node.unlock_condition_config)
        : null,
      completion_condition_config: node.completion_condition_config
        ? JSON.parse(node.completion_condition_config)
        : null,
    };
  },

  /**
   * Stringify parsed node for database storage
   */
  stringify(node: Partial<TrailMapNodeParsed>): Partial<TrailMapNode> {
    const result: Partial<TrailMapNode> = { ...node } as any;

    if (node.unlock_condition_config !== undefined) {
      result.unlock_condition_config = node.unlock_condition_config
        ? JSON.stringify(node.unlock_condition_config)
        : null;
    }
    if (node.completion_condition_config !== undefined) {
      result.completion_condition_config = node.completion_condition_config
        ? JSON.stringify(node.completion_condition_config)
        : null;
    }

    return result;
  },

  /**
   * Check if node is unlocked
   */
  isUnlocked(node: TrailMapNode | TrailMapNodeParsed): boolean {
    return node.is_unlocked === 1;
  },

  /**
   * Check if node is completed
   */
  isCompleted(node: TrailMapNode | TrailMapNodeParsed): boolean {
    return node.is_completed === 1;
  },

  /**
   * Check if node is required for story completion
   */
  isRequired(node: TrailMapNode | TrailMapNodeParsed): boolean {
    return node.is_required === 1;
  },

  /**
   * Check if node is visible
   */
  isVisible(node: TrailMapNode | TrailMapNodeParsed): boolean {
    return node.visibility === 'always_visible' || (
      node.visibility === 'hidden_until_unlocked' && this.isUnlocked(node)
    );
  },

  /**
   * Check if node is an entry point
   */
  isEntryPoint(node: TrailMapNode | TrailMapNodeParsed): boolean {
    return node.node_type === 'entry_point';
  },

  /**
   * Check if node is a finale
   */
  isFinale(node: TrailMapNode | TrailMapNodeParsed): boolean {
    return node.node_type === 'finale';
  },

  /**
   * Check if node is a branching point
   */
  isBranchingPoint(node: TrailMapNode | TrailMapNodeParsed): boolean {
    return node.node_type === 'branch' || node.node_type === 'gate';
  },

  /**
   * Check if node is on narrative layer
   */
  isNarrativeLayer(node: TrailMapNode | TrailMapNodeParsed): boolean {
    return node.layer === 'narrative';
  },

  /**
   * Check if node is on physical layer
   */
  isPhysicalLayer(node: TrailMapNode | TrailMapNodeParsed): boolean {
    return node.layer === 'physical';
  },

  /**
   * Check if node has content associated
   */
  hasContent(node: TrailMapNode | TrailMapNodeParsed): boolean {
    return node.content_type !== null && node.content_id !== null;
  },

  /**
   * Check if node is always unlocked
   */
  isAlwaysUnlocked(node: TrailMapNode | TrailMapNodeParsed): boolean {
    return node.unlock_condition_type === 'always';
  },

  /**
   * Check if node auto-completes
   */
  autoCompletes(node: TrailMapNode | TrailMapNodeParsed): boolean {
    return node.completion_condition_type === 'automatic';
  },

  /**
   * Check if node is live
   */
  isLive(node: TrailMapNode | TrailMapNodeParsed): boolean {
    return node.status === 'live';
  },

  /**
   * Sort nodes by sort_order
   */
  sortByOrder(nodes: (TrailMapNode | TrailMapNodeParsed)[]): typeof nodes {
    return [...nodes].sort((a, b) => a.sort_order - b.sort_order);
  },

  /**
   * Sort nodes by name
   */
  sortByName(nodes: (TrailMapNode | TrailMapNodeParsed)[]): typeof nodes {
    return [...nodes].sort((a, b) => a.name.localeCompare(b.name));
  },

  /**
   * Filter nodes by type
   */
  filterByType(
    nodes: (TrailMapNode | TrailMapNodeParsed)[],
    type: TrailMapNodeType | TrailMapNodeType[]
  ): typeof nodes {
    const types = Array.isArray(type) ? type : [type];
    return nodes.filter(n => types.includes(n.node_type));
  },

  /**
   * Filter nodes by layer
   */
  filterByLayer(
    nodes: (TrailMapNode | TrailMapNodeParsed)[],
    layer: TrailMapLayer
  ): typeof nodes {
    return nodes.filter(n => n.layer === layer);
  },

  /**
   * Filter nodes by status
   */
  filterByStatus(
    nodes: (TrailMapNode | TrailMapNodeParsed)[],
    status: NodeStatus | NodeStatus[]
  ): typeof nodes {
    const statuses = Array.isArray(status) ? status : [status];
    return nodes.filter(n => statuses.includes(n.status));
  },

  /**
   * Filter unlocked nodes
   */
  filterUnlocked(nodes: (TrailMapNode | TrailMapNodeParsed)[]): typeof nodes {
    return nodes.filter(n => this.isUnlocked(n));
  },

  /**
   * Filter locked nodes
   */
  filterLocked(nodes: (TrailMapNode | TrailMapNodeParsed)[]): typeof nodes {
    return nodes.filter(n => !this.isUnlocked(n));
  },

  /**
   * Filter completed nodes
   */
  filterCompleted(nodes: (TrailMapNode | TrailMapNodeParsed)[]): typeof nodes {
    return nodes.filter(n => this.isCompleted(n));
  },

  /**
   * Filter incomplete nodes
   */
  filterIncomplete(nodes: (TrailMapNode | TrailMapNodeParsed)[]): typeof nodes {
    return nodes.filter(n => !this.isCompleted(n));
  },

  /**
   * Filter required nodes
   */
  filterRequired(nodes: (TrailMapNode | TrailMapNodeParsed)[]): typeof nodes {
    return nodes.filter(n => this.isRequired(n));
  },

  /**
   * Filter optional nodes
   */
  filterOptional(nodes: (TrailMapNode | TrailMapNodeParsed)[]): typeof nodes {
    return nodes.filter(n => !this.isRequired(n));
  },

  /**
   * Filter visible nodes
   */
  filterVisible(nodes: (TrailMapNode | TrailMapNodeParsed)[]): typeof nodes {
    return nodes.filter(n => this.isVisible(n));
  },

  /**
   * Get entry point nodes
   */
  getEntryPoints(nodes: (TrailMapNode | TrailMapNodeParsed)[]): typeof nodes {
    return this.filterByType(nodes, 'entry_point');
  },

  /**
   * Get finale nodes
   */
  getFinales(nodes: (TrailMapNode | TrailMapNodeParsed)[]): typeof nodes {
    return this.filterByType(nodes, 'finale');
  },

  /**
   * Group nodes by type
   */
  groupByType(
    nodes: (TrailMapNode | TrailMapNodeParsed)[]
  ): Record<TrailMapNodeType, typeof nodes> {
    const groups: Record<string, typeof nodes> = {};

    nodes.forEach(node => {
      const key = node.node_type;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(node);
    });

    return groups as Record<TrailMapNodeType, typeof nodes>;
  },

  /**
   * Group nodes by layer
   */
  groupByLayer(
    nodes: (TrailMapNode | TrailMapNodeParsed)[]
  ): Record<TrailMapLayer, typeof nodes> {
    const groups: Record<TrailMapLayer, typeof nodes> = {
      narrative: [],
      physical: [],
    };

    nodes.forEach(node => {
      groups[node.layer].push(node);
    });

    return groups;
  },

  /**
   * Group nodes by status
   */
  groupByStatus(
    nodes: (TrailMapNode | TrailMapNodeParsed)[]
  ): Record<NodeStatus, typeof nodes> {
    const groups: Record<string, typeof nodes> = {
      planned: [],
      built: [],
      testing: [],
      live: [],
    };

    nodes.forEach(node => {
      groups[node.status].push(node);
    });

    return groups as Record<NodeStatus, typeof nodes>;
  },

  /**
   * Calculate completion percentage
   */
  getCompletionPercentage(nodes: (TrailMapNode | TrailMapNodeParsed)[]): number {
    if (nodes.length === 0) return 0;
    const completed = nodes.filter(n => this.isCompleted(n)).length;
    return Math.round((completed / nodes.length) * 100);
  },

  /**
   * Calculate required nodes completion percentage
   */
  getRequiredCompletionPercentage(nodes: (TrailMapNode | TrailMapNodeParsed)[]): number {
    const required = this.filterRequired(nodes);
    return this.getCompletionPercentage(required);
  },

  /**
   * Get total estimated duration in minutes
   */
  getTotalEstimatedDuration(nodes: (TrailMapNode | TrailMapNodeParsed)[]): number {
    return nodes.reduce((sum, node) => {
      return sum + (node.estimated_duration_minutes || 0);
    }, 0);
  },

  /**
   * Find node by content reference
   */
  findByContent(
    nodes: (TrailMapNode | TrailMapNodeParsed)[],
    contentType: string,
    contentId: string
  ): (TrailMapNode | TrailMapNodeParsed) | undefined {
    return nodes.find(n => n.content_type === contentType && n.content_id === contentId);
  },

  /**
   * Check if unlock condition is met
   */
  checkUnlockCondition(
    node: TrailMapNodeParsed,
    context: {
      completedNodes?: string[];
      solvedPuzzles?: string[];
      currentTime?: Date;
      playerCount?: number;
      externalEvents?: string[];
    }
  ): boolean {
    if (node.unlock_condition_type === 'always') {
      return true;
    }

    if (!node.unlock_condition_config) {
      return false;
    }

    switch (node.unlock_condition_type) {
      case 'puzzle_solved': {
        const config = node.unlock_condition_config as PuzzleSolvedCondition;
        return context.solvedPuzzles?.includes(config.puzzle_id) ?? false;
      }

      case 'time_reached': {
        const config = node.unlock_condition_config as TimeReachedCondition;
        const targetTime = new Date(config.datetime);
        const currentTime = context.currentTime || new Date();
        return currentTime >= targetTime;
      }

      case 'node_completed': {
        const config = node.unlock_condition_config as NodeCompletedCondition;
        return context.completedNodes?.includes(config.node_id) ?? false;
      }

      case 'player_count': {
        const config = node.unlock_condition_config as PlayerCountCondition;
        const count = context.playerCount || 0;
        if (config.min_players && count < config.min_players) return false;
        if (config.max_players && count > config.max_players) return false;
        return true;
      }

      case 'external_event': {
        const config = node.unlock_condition_config as ExternalEventCondition;
        return context.externalEvents?.includes(config.event_name) ?? false;
      }

      default:
        return false;
    }
  },

  /**
   * Validate node data
   */
  validate(node: Partial<TrailMapNode>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!node.name || node.name.trim() === '') {
      errors.push('Name is required');
    }

    if (node.name && node.name.length > 255) {
      errors.push('Name must be 255 characters or less');
    }

    if (node.position_x !== undefined && isNaN(node.position_x)) {
      errors.push('Invalid position_x value');
    }

    if (node.position_y !== undefined && isNaN(node.position_y)) {
      errors.push('Invalid position_y value');
    }

    if (node.estimated_duration_minutes !== undefined && node.estimated_duration_minutes !== null) {
      if (node.estimated_duration_minutes < 0) {
        errors.push('Estimated duration must be non-negative');
      }
    }

    if (node.sort_order !== undefined && node.sort_order < 0) {
      errors.push('Sort order must be non-negative');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },
};
