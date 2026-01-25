/**
 * TypeScript types for puzzle hints (structured progressive hint system)
 */

export type HintReleaseTrigger =
  | 'manual'
  | 'time_based'
  | 'request_count'
  | 'automatic';

// Release configuration structure (stored as JSON)
export interface HintReleaseConfig {
  // For time_based trigger
  minutes_after_start?: number;

  // For request_count trigger
  request_threshold?: number;

  // For automatic trigger
  auto_release_conditions?: {
    player_stuck_minutes?: number;
    no_progress_minutes?: number;
    [key: string]: unknown;
  };

  // Generic additional data
  [key: string]: unknown;
}

export interface PuzzleHint {
  id: string;
  puzzle_id: string;
  hint_order: number; // 1, 2, 3, etc. - order matters!
  hint_text: string;
  release_trigger: HintReleaseTrigger;
  release_config: string | null; // JSON string
  is_released: number; // SQLite boolean (0 or 1)
  released_at: string | null; // ISO datetime
  created_at: string;
  updated_at: string;
}

// Parsed version with JSON fields as objects
export interface PuzzleHintParsed extends Omit<PuzzleHint, 'release_config'> {
  release_config: HintReleaseConfig | null;
}

// Helper type for creating hints (without id and timestamps)
export type CreatePuzzleHint = Omit<PuzzleHint, 'id' | 'created_at' | 'updated_at'>;

// Helper type for updating hints
export type UpdatePuzzleHint = Partial<Omit<PuzzleHint, 'id' | 'puzzle_id' | 'created_at'>>;

// Extended type with usage stats for live tracking
export interface PuzzleHintWithStats extends PuzzleHintParsed {
  times_requested?: number;
  players_used_count?: number;
  average_time_before_request?: number; // minutes
}

// Helper functions for working with puzzle hint data
export const PuzzleHintHelpers = {
  /**
   * Parse JSON fields from database hint record
   */
  parse(hint: PuzzleHint): PuzzleHintParsed {
    return {
      ...hint,
      release_config: hint.release_config
        ? JSON.parse(hint.release_config)
        : null,
    };
  },

  /**
   * Stringify parsed hint for database storage
   */
  stringify(hint: Partial<PuzzleHintParsed>): Partial<PuzzleHint> {
    const result: Partial<PuzzleHint> = { ...hint } as any;

    if (hint.release_config !== undefined) {
      result.release_config = hint.release_config
        ? JSON.stringify(hint.release_config)
        : null;
    }

    return result;
  },

  /**
   * Sort hints by order (ascending)
   */
  sortByOrder(hints: PuzzleHint[] | PuzzleHintParsed[]): typeof hints {
    return [...hints].sort((a, b) => a.hint_order - b.hint_order);
  },

  /**
   * Get next unreleased hint for a puzzle
   */
  getNextUnreleased(hints: (PuzzleHint | PuzzleHintParsed)[]): typeof hints[0] | null {
    const sorted = this.sortByOrder(hints);
    return sorted.find(h => h.is_released === 0) || null;
  },

  /**
   * Get all released hints for a puzzle
   */
  getReleased(hints: (PuzzleHint | PuzzleHintParsed)[]): typeof hints {
    return this.sortByOrder(hints.filter(h => h.is_released === 1));
  },

  /**
   * Check if hint should be auto-released based on config
   */
  shouldAutoRelease(hint: PuzzleHintParsed, context: {
    puzzle_start_time?: Date;
    current_time?: Date;
    hint_request_count?: number;
  }): boolean {
    if (hint.release_trigger === 'manual') {
      return false;
    }

    if (hint.release_trigger === 'automatic') {
      // Always auto-release if trigger is automatic
      return true;
    }

    if (!hint.release_config) {
      return false;
    }

    if (hint.release_trigger === 'time_based') {
      const { minutes_after_start } = hint.release_config;
      if (minutes_after_start && context.puzzle_start_time && context.current_time) {
        const elapsed = (context.current_time.getTime() - context.puzzle_start_time.getTime()) / 1000 / 60;
        return elapsed >= minutes_after_start;
      }
    }

    if (hint.release_trigger === 'request_count') {
      const { request_threshold } = hint.release_config;
      if (request_threshold && context.hint_request_count !== undefined) {
        return context.hint_request_count >= request_threshold;
      }
    }

    return false;
  }
};
