/**
 * TypeScript types for trail map edges
 */

export type TrailMapEdgeType =
  | 'automatic'
  | 'choice'
  | 'puzzle'
  | 'time'
  | 'manual'
  | 'conditional';

// Edge condition configurations
export interface PuzzleCondition {
  puzzle_id: string;
  must_solve?: boolean; // Default true
}

export interface TimeCondition {
  delay_minutes?: number; // Time delay after source node completion
  absolute_time?: string; // ISO datetime
  timezone?: string;
}

export interface ConditionalConfig {
  condition_type: string;
  condition_data: Record<string, any>;
}

export type EdgeConditionConfig =
  | PuzzleCondition
  | TimeCondition
  | ConditionalConfig
  | Record<string, any>; // For custom conditions

export interface TrailMapEdge {
  id: string;
  project_id: string;

  source_node_id: string;
  target_node_id: string;

  edge_type: TrailMapEdgeType;
  condition_config: string | null; // JSON

  is_bidirectional: number; // SQLite boolean (0 or 1)
  label: string | null;
  is_active: number; // SQLite boolean (0 or 1)

  created_at: string;
  updated_at: string;
}

// Parsed version with JSON fields as objects
export interface TrailMapEdgeParsed extends Omit<TrailMapEdge, 'condition_config'> {
  condition_config: EdgeConditionConfig | null;
}

// Helper type for creating edges (without id and timestamps)
export type CreateTrailMapEdge = Omit<TrailMapEdge, 'id' | 'created_at' | 'updated_at'>;

// Helper type for updating edges
export type UpdateTrailMapEdge = Partial<Omit<TrailMapEdge, 'id' | 'project_id' | 'created_at'>>;

// Extended type with related data for display
export interface TrailMapEdgeWithRelations extends TrailMapEdgeParsed {
  source_node?: {
    id: string;
    name: string;
    node_type: string;
  };
  target_node?: {
    id: string;
    name: string;
    node_type: string;
  };
  puzzle?: {
    id: string;
    title: string;
    status: string;
  };
}

// Helper functions for working with trail map edge data
export const TrailMapEdgeHelpers = {
  /**
   * Parse JSON fields from database edge record
   */
  parse(edge: TrailMapEdge): TrailMapEdgeParsed {
    return {
      ...edge,
      condition_config: edge.condition_config
        ? JSON.parse(edge.condition_config)
        : null,
    };
  },

  /**
   * Stringify parsed edge for database storage
   */
  stringify(edge: Partial<TrailMapEdgeParsed>): Partial<TrailMapEdge> {
    const result: Partial<TrailMapEdge> = { ...edge } as any;

    if (edge.condition_config !== undefined) {
      result.condition_config = edge.condition_config
        ? JSON.stringify(edge.condition_config)
        : null;
    }

    return result;
  },

  /**
   * Check if edge is bidirectional
   */
  isBidirectional(edge: TrailMapEdge | TrailMapEdgeParsed): boolean {
    return edge.is_bidirectional === 1;
  },

  /**
   * Check if edge is active
   */
  isActive(edge: TrailMapEdge | TrailMapEdgeParsed): boolean {
    return edge.is_active === 1;
  },

  /**
   * Check if edge is automatic (no conditions)
   */
  isAutomatic(edge: TrailMapEdge | TrailMapEdgeParsed): boolean {
    return edge.edge_type === 'automatic';
  },

  /**
   * Check if edge requires a choice
   */
  isChoice(edge: TrailMapEdge | TrailMapEdgeParsed): boolean {
    return edge.edge_type === 'choice';
  },

  /**
   * Check if edge has conditions
   */
  hasCondition(edge: TrailMapEdgeParsed): boolean {
    return edge.condition_config !== null;
  },

  /**
   * Check if edge requires puzzle completion
   */
  requiresPuzzle(edge: TrailMapEdgeParsed): boolean {
    return edge.edge_type === 'puzzle';
  },

  /**
   * Check if edge has time-based activation
   */
  isTimeBased(edge: TrailMapEdgeParsed): boolean {
    return edge.edge_type === 'time';
  },

  /**
   * Get puzzle ID from edge condition if applicable
   */
  getPuzzleId(edge: TrailMapEdgeParsed): string | null {
    if (!this.requiresPuzzle(edge) || !edge.condition_config) {
      return null;
    }

    const config = edge.condition_config as PuzzleCondition;
    return config.puzzle_id || null;
  },

  /**
   * Get time delay in minutes if applicable
   */
  getTimeDelay(edge: TrailMapEdgeParsed): number | null {
    if (!this.isTimeBased(edge) || !edge.condition_config) {
      return null;
    }

    const config = edge.condition_config as TimeCondition;
    return config.delay_minutes || null;
  },

  /**
   * Check if edge condition is met
   */
  checkCondition(
    edge: TrailMapEdgeParsed,
    context: {
      solvedPuzzles?: string[];
      sourceNodeCompletedAt?: Date;
      currentTime?: Date;
    }
  ): boolean {
    if (this.isAutomatic(edge)) {
      return true;
    }

    if (!edge.condition_config) {
      return false;
    }

    switch (edge.edge_type) {
      case 'puzzle': {
        const config = edge.condition_config as PuzzleCondition;
        return context.solvedPuzzles?.includes(config.puzzle_id) ?? false;
      }

      case 'time': {
        const config = edge.condition_config as TimeCondition;
        const currentTime = context.currentTime || new Date();

        // Check absolute time
        if (config.absolute_time) {
          const targetTime = new Date(config.absolute_time);
          return currentTime >= targetTime;
        }

        // Check delay time
        if (config.delay_minutes && context.sourceNodeCompletedAt) {
          const delayMs = config.delay_minutes * 60 * 1000;
          const targetTime = new Date(context.sourceNodeCompletedAt.getTime() + delayMs);
          return currentTime >= targetTime;
        }

        return false;
      }

      case 'choice':
      case 'manual':
        // These require explicit player action
        return false;

      default:
        return false;
    }
  },

  /**
   * Sort edges by creation date
   */
  sortByDate(edges: (TrailMapEdge | TrailMapEdgeParsed)[]): typeof edges {
    return [...edges].sort((a, b) => {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  },

  /**
   * Filter edges by type
   */
  filterByType(
    edges: (TrailMapEdge | TrailMapEdgeParsed)[],
    type: TrailMapEdgeType | TrailMapEdgeType[]
  ): typeof edges {
    const types = Array.isArray(type) ? type : [type];
    return edges.filter(e => types.includes(e.edge_type));
  },

  /**
   * Filter active edges
   */
  filterActive(edges: (TrailMapEdge | TrailMapEdgeParsed)[]): typeof edges {
    return edges.filter(e => this.isActive(e));
  },

  /**
   * Filter inactive edges
   */
  filterInactive(edges: (TrailMapEdge | TrailMapEdgeParsed)[]): typeof edges {
    return edges.filter(e => !this.isActive(e));
  },

  /**
   * Filter bidirectional edges
   */
  filterBidirectional(edges: (TrailMapEdge | TrailMapEdgeParsed)[]): typeof edges {
    return edges.filter(e => this.isBidirectional(e));
  },

  /**
   * Get outgoing edges from a node
   */
  getOutgoingEdges(
    edges: (TrailMapEdge | TrailMapEdgeParsed)[],
    nodeId: string
  ): typeof edges {
    return edges.filter(e => e.source_node_id === nodeId);
  },

  /**
   * Get incoming edges to a node
   */
  getIncomingEdges(
    edges: (TrailMapEdge | TrailMapEdgeParsed)[],
    nodeId: string
  ): typeof edges {
    return edges.filter(e => e.target_node_id === nodeId);
  },

  /**
   * Get all edges connected to a node (incoming + outgoing + bidirectional)
   */
  getConnectedEdges(
    edges: (TrailMapEdge | TrailMapEdgeParsed)[],
    nodeId: string
  ): typeof edges {
    return edges.filter(e => {
      const isConnected = e.source_node_id === nodeId || e.target_node_id === nodeId;
      return isConnected;
    });
  },

  /**
   * Get neighboring node IDs
   */
  getNeighborNodeIds(
    edges: (TrailMapEdge | TrailMapEdgeParsed)[],
    nodeId: string
  ): string[] {
    const neighbors = new Set<string>();

    edges.forEach(edge => {
      if (edge.source_node_id === nodeId) {
        neighbors.add(edge.target_node_id);
      }
      if (edge.target_node_id === nodeId && this.isBidirectional(edge)) {
        neighbors.add(edge.source_node_id);
      }
    });

    return Array.from(neighbors);
  },

  /**
   * Check if two nodes are directly connected
   */
  areNodesConnected(
    edges: (TrailMapEdge | TrailMapEdgeParsed)[],
    nodeId1: string,
    nodeId2: string
  ): boolean {
    return edges.some(edge => {
      const forwardConnection = edge.source_node_id === nodeId1 && edge.target_node_id === nodeId2;
      const reverseConnection = this.isBidirectional(edge) &&
        edge.source_node_id === nodeId2 && edge.target_node_id === nodeId1;
      return forwardConnection || reverseConnection;
    });
  },

  /**
   * Find edge between two nodes
   */
  findEdge(
    edges: (TrailMapEdge | TrailMapEdgeParsed)[],
    sourceId: string,
    targetId: string
  ): (TrailMapEdge | TrailMapEdgeParsed) | undefined {
    return edges.find(e => e.source_node_id === sourceId && e.target_node_id === targetId);
  },

  /**
   * Group edges by type
   */
  groupByType(
    edges: (TrailMapEdge | TrailMapEdgeParsed)[]
  ): Record<TrailMapEdgeType, typeof edges> {
    const groups: Record<string, typeof edges> = {
      automatic: [],
      choice: [],
      puzzle: [],
      time: [],
      manual: [],
      conditional: [],
    };

    edges.forEach(edge => {
      groups[edge.edge_type].push(edge);
    });

    return groups as Record<TrailMapEdgeType, typeof edges>;
  },

  /**
   * Get edge statistics
   */
  getStatistics(edges: (TrailMapEdge | TrailMapEdgeParsed)[]): {
    total: number;
    active: number;
    inactive: number;
    bidirectional: number;
    byType: Record<TrailMapEdgeType, number>;
  } {
    const byType = this.groupByType(edges);

    return {
      total: edges.length,
      active: this.filterActive(edges).length,
      inactive: this.filterInactive(edges).length,
      bidirectional: this.filterBidirectional(edges).length,
      byType: {
        automatic: byType.automatic.length,
        choice: byType.choice.length,
        puzzle: byType.puzzle.length,
        time: byType.time.length,
        manual: byType.manual.length,
        conditional: byType.conditional.length,
      },
    };
  },

  /**
   * Find circular dependencies in edge graph
   */
  findCircularPaths(
    edges: (TrailMapEdge | TrailMapEdgeParsed)[],
    startNodeId: string,
    visited: Set<string> = new Set(),
    path: string[] = []
  ): string[][] {
    if (visited.has(startNodeId)) {
      // Found a cycle
      const cycleStart = path.indexOf(startNodeId);
      if (cycleStart !== -1) {
        return [path.slice(cycleStart)];
      }
      return [];
    }

    visited.add(startNodeId);
    path.push(startNodeId);

    const cycles: string[][] = [];
    const outgoing = this.getOutgoingEdges(edges, startNodeId);

    for (const edge of outgoing) {
      const subCycles = this.findCircularPaths(
        edges,
        edge.target_node_id,
        new Set(visited),
        [...path]
      );
      cycles.push(...subCycles);
    }

    return cycles;
  },

  /**
   * Validate edge data
   */
  validate(edge: Partial<TrailMapEdge>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!edge.source_node_id) {
      errors.push('Source node ID is required');
    }

    if (!edge.target_node_id) {
      errors.push('Target node ID is required');
    }

    if (edge.source_node_id === edge.target_node_id) {
      errors.push('Source and target nodes cannot be the same (self-loop)');
    }

    if (edge.label && edge.label.length > 255) {
      errors.push('Label must be 255 characters or less');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },
};
