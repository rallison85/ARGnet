/**
 * Migration: Enhance puzzles table
 * Adds testing, timing, accessibility, and tracking fields
 */
import db from '../index.js';

export function up() {
  console.log('🔄 Enhancing puzzles table...');

  // Check if we need to migrate (check if new columns exist)
  const tableInfo = db.prepare("PRAGMA table_info(puzzles)").all() as Array<{ name: string }>;
  const hasPuzzleCode = tableInfo.some(col => col.name === 'puzzle_code');

  if (hasPuzzleCode) {
    console.log('✅ puzzles table already enhanced, skipping...');
    return;
  }

  // Temporarily disable foreign key constraints for migration
  db.exec('PRAGMA foreign_keys = OFF;');

  // Clean up any failed previous attempts
  db.exec('DROP TABLE IF EXISTS puzzles_new;');

  // 1. Create new table with enhanced schema
  db.exec(`
    CREATE TABLE puzzles_new (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      story_beat_id TEXT REFERENCES story_beats(id),

      title TEXT NOT NULL,
      puzzle_code TEXT, -- e.g., "PZ-001" for easy reference
      description TEXT,
      puzzle_type TEXT CHECK(puzzle_type IN (
        'cipher', 'code', 'riddle', 'physical', 'digital', 'social', 'meta',
        'audio', 'visual', 'coordinates', 'steganography', 'osint', 'geocache',
        'phone_tree', 'email_chain', 'collaborative', 'timed', 'live_event',
        'artefact', 'other'
      )),

      -- Difficulty and timing
      difficulty INTEGER DEFAULT 3 CHECK(difficulty BETWEEN 1 AND 5),
      estimated_solve_time TEXT, -- Legacy field (e.g., "30 minutes")
      estimated_solve_minutes INTEGER, -- New precise field

      -- Collaboration
      is_collaborative INTEGER DEFAULT 0, -- Requires multiple players

      -- The puzzle itself
      setup TEXT, -- How the puzzle is presented
      solution TEXT, -- The answer/solution
      solution_method TEXT, -- How to solve it
      hints TEXT, -- JSON array of progressive hints (legacy, will be replaced in Chunk 1.5)

      -- Alternative solutions and red herrings
      alternative_solutions TEXT, -- JSON: [{solution: string, notes: string}]
      red_herrings TEXT, -- JSON: [{herring: string, why_wrong: string}]

      -- Requirements
      prerequisites TEXT, -- JSON array of puzzle IDs that must be solved first
      required_tools TEXT, -- What players need to solve this (legacy)
      required_materials TEXT, -- JSON array: ["internet", "printer", "smartphone"]
      required_knowledge TEXT,

      -- Accessibility
      accessibility_alternative TEXT, -- How players with disabilities can engage

      -- Rewards
      reward_type TEXT, -- story_unlock, item, information, access, etc.
      reward_description TEXT,
      unlocks TEXT, -- JSON array of what solving this unlocks

      -- Status
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'review', 'testing', 'approved', 'live', 'solved', 'archived')),
      is_optional INTEGER DEFAULT 0,
      is_hidden INTEGER DEFAULT 0, -- Secret puzzle

      -- Testing
      test_results TEXT, -- JSON array of test session results (legacy)
      testing_notes TEXT, -- Structured testing notes
      average_solve_time TEXT, -- Legacy field
      average_solve_minutes REAL, -- New precise field

      -- Live tracking
      live_solve_count INTEGER DEFAULT 0,
      live_hint_usage_count INTEGER DEFAULT 0,

      created_by TEXT REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Copy existing data, converting types where needed
  db.exec(`
    INSERT INTO puzzles_new
      (id, project_id, story_beat_id, title, description,
       puzzle_type, difficulty, estimated_solve_time, setup, solution, solution_method,
       hints, prerequisites, required_tools, required_knowledge,
       reward_type, reward_description, unlocks,
       status, is_optional, is_hidden, test_results, average_solve_time,
       created_by, created_at, updated_at)
    SELECT
      id, project_id, story_beat_id, title, description,
      CASE
        WHEN puzzle_type IN (
          'cipher', 'code', 'riddle', 'physical', 'digital', 'social', 'meta',
          'audio', 'visual', 'artefact', 'coordinates', 'other'
        )
        THEN puzzle_type
        ELSE 'other'
      END as puzzle_type,
      difficulty, estimated_solve_time, setup, solution, solution_method,
      hints, prerequisites, required_tools, required_knowledge,
      reward_type, reward_description, unlocks,
      status, is_optional, is_hidden, test_results, average_solve_time,
      created_by, created_at, updated_at
    FROM puzzles;
  `);

  // 3. Drop old table
  db.exec('DROP TABLE puzzles;');

  // 4. Rename new table
  db.exec('ALTER TABLE puzzles_new RENAME TO puzzles;');

  // 5. Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_puzzles_project ON puzzles(project_id);
    CREATE INDEX IF NOT EXISTS idx_puzzles_story_beat ON puzzles(story_beat_id);
    CREATE INDEX IF NOT EXISTS idx_puzzles_status ON puzzles(status);
    CREATE INDEX IF NOT EXISTS idx_puzzles_type ON puzzles(puzzle_type);
    CREATE INDEX IF NOT EXISTS idx_puzzles_difficulty ON puzzles(difficulty);
    CREATE INDEX IF NOT EXISTS idx_puzzles_code ON puzzles(project_id, puzzle_code);
  `);

  // Re-enable foreign key constraints
  db.exec('PRAGMA foreign_keys = ON;');

  console.log('✅ puzzles table enhanced successfully!');
}

export function down() {
  console.log('⏪ Reverting puzzles enhancement...');

  // Temporarily disable foreign key constraints
  db.exec('PRAGMA foreign_keys = OFF;');

  // Create old table structure
  db.exec(`
    CREATE TABLE puzzles_old (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      story_beat_id TEXT REFERENCES story_beats(id),

      title TEXT NOT NULL,
      description TEXT,
      puzzle_type TEXT CHECK(puzzle_type IN ('cipher', 'code', 'riddle', 'physical', 'digital', 'social', 'meta', 'audio', 'visual', 'artefact', 'coordinates', 'other')),

      difficulty INTEGER DEFAULT 3 CHECK(difficulty BETWEEN 1 AND 5),
      estimated_solve_time TEXT,

      setup TEXT,
      solution TEXT,
      solution_method TEXT,
      hints TEXT,

      prerequisites TEXT,
      required_tools TEXT,
      required_knowledge TEXT,

      reward_type TEXT,
      reward_description TEXT,
      unlocks TEXT,

      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'review', 'testing', 'approved', 'live', 'solved', 'archived')),
      is_optional INTEGER DEFAULT 0,
      is_hidden INTEGER DEFAULT 0,

      test_results TEXT,
      average_solve_time TEXT,

      created_by TEXT REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Copy data back, dropping new fields
  db.exec(`
    INSERT INTO puzzles_old
      (id, project_id, story_beat_id, title, description,
       puzzle_type, difficulty, estimated_solve_time, setup, solution, solution_method,
       hints, prerequisites, required_tools, required_knowledge,
       reward_type, reward_description, unlocks,
       status, is_optional, is_hidden, test_results, average_solve_time,
       created_by, created_at, updated_at)
    SELECT
      id, project_id, story_beat_id, title, description,
      puzzle_type, difficulty, estimated_solve_time, setup, solution, solution_method,
      hints, prerequisites, required_tools, required_knowledge,
      reward_type, reward_description, unlocks,
      status, is_optional, is_hidden, test_results, average_solve_time,
      created_by, created_at, updated_at
    FROM puzzles;
  `);

  db.exec('DROP TABLE puzzles;');
  db.exec('ALTER TABLE puzzles_old RENAME TO puzzles;');
  db.exec('CREATE INDEX IF NOT EXISTS idx_puzzles_project ON puzzles(project_id);');

  // Re-enable foreign key constraints
  db.exec('PRAGMA foreign_keys = ON;');

  console.log('✅ puzzles reverted successfully!');
}
