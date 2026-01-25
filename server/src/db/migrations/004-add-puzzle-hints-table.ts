/**
 * Migration: Add puzzle_hints table
 * Creates structured progressive hint system to replace single hints field
 */
import db from '../index.js';

export function up() {
  console.log('🔄 Creating puzzle_hints table...');

  // Check if table already exists
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name='puzzle_hints'
  `).get();

  if (tableExists) {
    console.log('✅ puzzle_hints table already exists, skipping...');
    return;
  }

  // Create puzzle_hints table
  db.exec(`
    CREATE TABLE puzzle_hints (
      id TEXT PRIMARY KEY,
      puzzle_id TEXT NOT NULL REFERENCES puzzles(id) ON DELETE CASCADE,
      hint_order INTEGER NOT NULL,
      hint_text TEXT NOT NULL,
      release_trigger TEXT DEFAULT 'manual' CHECK(release_trigger IN ('manual', 'time_based', 'request_count', 'automatic')),
      release_config TEXT, -- JSON: {minutes_after_start: 30} or {request_threshold: 5}
      is_released INTEGER DEFAULT 0, -- Boolean: for live tracking
      released_at DATETIME, -- When this hint was released
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(puzzle_id, hint_order)
    );
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_puzzle_hints_puzzle ON puzzle_hints(puzzle_id);
    CREATE INDEX IF NOT EXISTS idx_puzzle_hints_order ON puzzle_hints(puzzle_id, hint_order);
    CREATE INDEX IF NOT EXISTS idx_puzzle_hints_released ON puzzle_hints(is_released);
  `);

  console.log('✅ puzzle_hints table created successfully!');
  console.log('ℹ️  Note: Old hints column in puzzles table is preserved for backward compatibility');
}

export function down() {
  console.log('⏪ Dropping puzzle_hints table...');

  db.exec('DROP TABLE IF EXISTS puzzle_hints;');

  console.log('✅ puzzle_hints table dropped successfully!');
}
