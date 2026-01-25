/**
 * Migration: Enhance story_beats table
 * Adds trigger conditions, delivery tracking, and content management fields
 */
import db from '../index.js';

export function up() {
  console.log('🔄 Enhancing story_beats table...');

  // Check if we need to migrate (check if new columns exist)
  const tableInfo = db.prepare("PRAGMA table_info(story_beats)").all() as Array<{ name: string }>;
  const hasTriggerType = tableInfo.some(col => col.name === 'trigger_type');

  if (hasTriggerType) {
    console.log('✅ story_beats table already enhanced, skipping...');
    return;
  }

  // SQLite doesn't support ALTER COLUMN for constraints
  // We need to recreate the table with enhanced schema

  // Temporarily disable foreign key constraints for migration
  db.exec('PRAGMA foreign_keys = OFF;');

  // Clean up any failed previous attempts
  db.exec('DROP TABLE IF EXISTS story_beats_new;');

  // 1. Create new table with enhanced schema
  db.exec(`
    CREATE TABLE story_beats_new (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      parent_id TEXT REFERENCES story_beats(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      content TEXT, -- Rich text content (existing internal content)
      summary TEXT,
      beat_type TEXT DEFAULT 'chapter' CHECK(beat_type IN ('chapter', 'scene', 'flashback', 'revelation', 'branch_point', 'convergence', 'ending', 'secret')),
      sequence_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'review', 'approved', 'locked')),

      -- Timeline positioning
      story_date TEXT, -- In-universe date/time
      real_world_trigger TEXT, -- When this beat should be revealed (legacy field)

      -- New trigger system
      trigger_type TEXT CHECK(trigger_type IN ('manual', 'puzzle_solved', 'date_reached', 'node_completed', 'player_action')),
      trigger_config TEXT, -- JSON: stores trigger details like puzzle_id or date

      -- Delivery
      delivery_method TEXT CHECK(delivery_method IN ('website', 'social_post', 'email', 'physical_drop', 'live_event', 'automatic', 'in_app')),

      -- Content split
      player_facing_content TEXT, -- What players see
      internal_notes TEXT, -- Production notes

      -- Content metadata
      canonical_status TEXT DEFAULT 'canon' CHECK(canonical_status IN ('canon', 'semi_canon', 'non_canon', 'retconned')),
      reading_time_minutes INTEGER,
      content_warnings TEXT, -- JSON array of warning tags

      -- Existing metadata
      mood TEXT,
      location_id TEXT,
      notes TEXT, -- General notes (legacy)

      created_by TEXT REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Copy existing data
  db.exec(`
    INSERT INTO story_beats_new
      (id, project_id, parent_id, title, content, summary, beat_type, sequence_order, status,
       story_date, real_world_trigger, mood, location_id, notes, created_by, created_at, updated_at)
    SELECT
      id, project_id, parent_id, title, content, summary,
      CASE
        WHEN beat_type IN ('chapter', 'scene', 'flashback', 'revelation', 'branch_point', 'convergence', 'ending', 'secret')
        THEN beat_type
        WHEN beat_type = 'act' THEN 'chapter'
        WHEN beat_type = 'moment' THEN 'scene'
        WHEN beat_type = 'parallel' THEN 'scene'
        ELSE 'chapter'
      END as beat_type,
      sequence_order, status, story_date, real_world_trigger, mood, location_id, notes,
      created_by, created_at, updated_at
    FROM story_beats;
  `);

  // 3. Drop old table
  db.exec('DROP TABLE story_beats;');

  // 4. Rename new table
  db.exec('ALTER TABLE story_beats_new RENAME TO story_beats;');

  // 5. Recreate indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_story_beats_project ON story_beats(project_id);
    CREATE INDEX IF NOT EXISTS idx_story_beats_parent ON story_beats(parent_id);
    CREATE INDEX IF NOT EXISTS idx_story_beats_trigger_type ON story_beats(trigger_type);
    CREATE INDEX IF NOT EXISTS idx_story_beats_status ON story_beats(status);
  `);

  // Re-enable foreign key constraints
  db.exec('PRAGMA foreign_keys = ON;');

  console.log('✅ story_beats table enhanced successfully!');
}

export function down() {
  console.log('⏪ Reverting story_beats enhancement...');

  // Temporarily disable foreign key constraints
  db.exec('PRAGMA foreign_keys = OFF;');

  // Create old table structure
  db.exec(`
    CREATE TABLE story_beats_old (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      parent_id TEXT REFERENCES story_beats(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      content TEXT,
      summary TEXT,
      beat_type TEXT DEFAULT 'chapter' CHECK(beat_type IN ('act', 'chapter', 'scene', 'moment', 'flashback', 'parallel')),
      sequence_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'review', 'approved', 'locked')),
      story_date TEXT,
      real_world_trigger TEXT,
      mood TEXT,
      location_id TEXT,
      notes TEXT,
      created_by TEXT REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Copy data back
  db.exec(`
    INSERT INTO story_beats_old
      (id, project_id, parent_id, title, content, summary, beat_type, sequence_order, status,
       story_date, real_world_trigger, mood, location_id, notes, created_by, created_at, updated_at)
    SELECT
      id, project_id, parent_id, title, content, summary, beat_type, sequence_order, status,
      story_date, real_world_trigger, mood, location_id,
      COALESCE(notes, internal_notes) as notes,
      created_by, created_at, updated_at
    FROM story_beats;
  `);

  db.exec('DROP TABLE story_beats;');
  db.exec('ALTER TABLE story_beats_old RENAME TO story_beats;');
  db.exec('CREATE INDEX IF NOT EXISTS idx_story_beats_project ON story_beats(project_id);');

  // Re-enable foreign key constraints
  db.exec('PRAGMA foreign_keys = ON;');

  console.log('✅ story_beats reverted successfully!');
}
