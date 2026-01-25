/**
 * TypeScript types for enhanced puzzles
 */

export type PuzzleType =
  | 'cipher'
  | 'code'
  | 'riddle'
  | 'physical'
  | 'digital'
  | 'social'
  | 'meta'
  | 'audio'
  | 'visual'
  | 'coordinates'
  | 'steganography'
  | 'osint'
  | 'geocache'
  | 'phone_tree'
  | 'email_chain'
  | 'collaborative'
  | 'timed'
  | 'live_event'
  | 'artefact'
  | 'other';

export type PuzzleStatus =
  | 'draft'
  | 'review'
  | 'testing'
  | 'approved'
  | 'live'
  | 'solved'
  | 'archived';

// Alternative solution structure (stored as JSON)
export interface AlternativeSolution {
  solution: string;
  notes: string;
}

// Red herring structure (stored as JSON)
export interface RedHerring {
  herring: string;
  why_wrong: string;
}

// Test result structure (stored as JSON, legacy)
export interface TestResult {
  tester: string;
  date: string;
  time_minutes: number;
  solved: boolean;
  feedback: string;
  [key: string]: unknown;
}

export interface Puzzle {
  id: string;
  project_id: string;
  story_beat_id: string | null;

  title: string;
  puzzle_code: string | null; // e.g., "PZ-001"
  description: string | null;
  puzzle_type: PuzzleType | null;

  // Difficulty and timing
  difficulty: number; // 1-5
  estimated_solve_time: string | null; // Legacy: "30 minutes"
  estimated_solve_minutes: number | null; // New: 30

  // Collaboration
  is_collaborative: number; // SQLite boolean (0 or 1)

  // The puzzle itself
  setup: string | null; // How the puzzle is presented
  solution: string | null; // The answer/solution
  solution_method: string | null; // How to solve it
  hints: string | null; // JSON array (legacy, will be replaced)

  // Alternative solutions and red herrings
  alternative_solutions: string | null; // JSON string
  red_herrings: string | null; // JSON string

  // Requirements
  prerequisites: string | null; // JSON array of puzzle IDs
  required_tools: string | null; // Legacy field
  required_materials: string | null; // JSON array: ["internet", "printer"]
  required_knowledge: string | null;

  // Accessibility
  accessibility_alternative: string | null;

  // Rewards
  reward_type: string | null;
  reward_description: string | null;
  unlocks: string | null; // JSON array

  // Status
  status: PuzzleStatus;
  is_optional: number; // SQLite boolean (0 or 1)
  is_hidden: number; // SQLite boolean (0 or 1)

  // Testing
  test_results: string | null; // JSON array (legacy)
  testing_notes: string | null;
  average_solve_time: string | null; // Legacy: "45 minutes"
  average_solve_minutes: number | null; // New: 45.5

  // Live tracking
  live_solve_count: number;
  live_hint_usage_count: number;

  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Parsed version with JSON fields as objects/arrays
export interface PuzzleParsed extends Omit<Puzzle,
  'alternative_solutions' | 'red_herrings' | 'prerequisites' |
  'required_materials' | 'unlocks' | 'test_results' | 'hints'
> {
  alternative_solutions: AlternativeSolution[] | null;
  red_herrings: RedHerring[] | null;
  prerequisites: string[] | null; // Array of puzzle IDs
  required_materials: string[] | null;
  unlocks: string[] | null;
  test_results: TestResult[] | null;
  hints: string[] | null; // Legacy, array of hint strings
}

// Helper type for creating puzzles (without id and timestamps)
export type CreatePuzzle = Omit<Puzzle, 'id' | 'created_at' | 'updated_at'>;

// Helper type for updating puzzles
export type UpdatePuzzle = Partial<Omit<Puzzle, 'id' | 'project_id' | 'created_at'>>;

// Extended type with related data for display
export interface PuzzleWithRelations extends PuzzleParsed {
  created_by_username?: string;
  created_by_name?: string;
  story_beat_title?: string;
  prerequisite_puzzles?: Array<{
    id: string;
    title: string;
    puzzle_code: string | null;
  }>;
  unlocked_content?: Array<{
    type: string;
    id: string;
    name: string;
  }>;
  linked_story_beats?: Array<{
    id: string;
    title: string;
    relationship: 'requires' | 'unlocks' | 'references';
  }>;
  linked_events?: Array<{
    id: string;
    title: string;
  }>;
}

// Helper functions for working with puzzle data
export const PuzzleHelpers = {
  /**
   * Parse JSON fields from database puzzle record
   */
  parse(puzzle: Puzzle): PuzzleParsed {
    return {
      ...puzzle,
      alternative_solutions: puzzle.alternative_solutions
        ? JSON.parse(puzzle.alternative_solutions)
        : null,
      red_herrings: puzzle.red_herrings
        ? JSON.parse(puzzle.red_herrings)
        : null,
      prerequisites: puzzle.prerequisites
        ? JSON.parse(puzzle.prerequisites)
        : null,
      required_materials: puzzle.required_materials
        ? JSON.parse(puzzle.required_materials)
        : null,
      unlocks: puzzle.unlocks
        ? JSON.parse(puzzle.unlocks)
        : null,
      test_results: puzzle.test_results
        ? JSON.parse(puzzle.test_results)
        : null,
      hints: puzzle.hints
        ? JSON.parse(puzzle.hints)
        : null,
    };
  },

  /**
   * Stringify parsed puzzle for database storage
   */
  stringify(puzzle: Partial<PuzzleParsed>): Partial<Puzzle> {
    const result: Partial<Puzzle> = { ...puzzle } as any;

    if (puzzle.alternative_solutions !== undefined) {
      result.alternative_solutions = puzzle.alternative_solutions
        ? JSON.stringify(puzzle.alternative_solutions)
        : null;
    }
    if (puzzle.red_herrings !== undefined) {
      result.red_herrings = puzzle.red_herrings
        ? JSON.stringify(puzzle.red_herrings)
        : null;
    }
    if (puzzle.prerequisites !== undefined) {
      result.prerequisites = puzzle.prerequisites
        ? JSON.stringify(puzzle.prerequisites)
        : null;
    }
    if (puzzle.required_materials !== undefined) {
      result.required_materials = puzzle.required_materials
        ? JSON.stringify(puzzle.required_materials)
        : null;
    }
    if (puzzle.unlocks !== undefined) {
      result.unlocks = puzzle.unlocks
        ? JSON.stringify(puzzle.unlocks)
        : null;
    }
    if (puzzle.test_results !== undefined) {
      result.test_results = puzzle.test_results
        ? JSON.stringify(puzzle.test_results)
        : null;
    }
    if (puzzle.hints !== undefined) {
      result.hints = puzzle.hints
        ? JSON.stringify(puzzle.hints)
        : null;
    }

    return result;
  }
};
