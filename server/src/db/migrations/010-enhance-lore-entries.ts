/**
 * Migration: Enhance lore_entries table
 * Adds organization, canonical status, and reveal tracking
 */
import db from '../index.js';

export function up() {
  console.log('🔄 Enhancing lore_entries table...');

  // Check if we need to migrate (check if new columns exist)
  const tableInfo = db.prepare("PRAGMA table_info(lore_entries)").all() as Array<{ name: string }>;
  const hasCanonicalStatus = tableInfo.some(col => col.name === 'canonical_status');

  if (hasCanonicalStatus) {
    console.log('✅ lore_entries table already enhanced, skipping...');
    return;
  }

  // Temporarily disable foreign key constraints for migration
  db.exec('PRAGMA foreign_keys = OFF;');

  // Clean up any failed previous attempts
  db.exec('DROP TABLE IF EXISTS lore_entries_new;');

  // 1. Create new table with enhanced schema
  db.exec(`
    CREATE TABLE lore_entries_new (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      parent_entry_id TEXT REFERENCES lore_entries(id), -- Renamed from parent_id for clarity

      title TEXT NOT NULL,
      category TEXT CHECK(category IN (
        'history', 'science', 'culture', 'geography', 'organizations',
        'technology', 'religion', 'language', 'economy', 'characters', 'other'
      )),
      subcategory TEXT, -- For finer categorization

      content TEXT,

      -- Metadata
      tags TEXT, -- JSON array
      timeline_position TEXT, -- When in world's history this applies

      -- Canonical status
      canonical_status TEXT DEFAULT 'canon' CHECK(canonical_status IN ('canon', 'semi_canon', 'retconned', 'speculation')),
      in_world_source TEXT, -- Where does this info come from in-world
      contradiction_notes TEXT, -- Conflicts with other lore

      -- Reveal tracking (renamed from is_public/revelation_trigger for clarity)
      is_revealed_to_players INTEGER DEFAULT 0, -- Boolean
      revealed_at DATETIME,
      reveal_method TEXT, -- How/when revealed

      -- Relations
      related_characters TEXT, -- JSON array of character IDs
      related_locations TEXT, -- JSON array of location IDs

      -- Organization
      sort_order INTEGER DEFAULT 0,

      created_by TEXT REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Copy existing data, converting types where needed
  db.exec(`
    INSERT INTO lore_entries_new
      (id, project_id, parent_entry_id,
       title, category, content,
       tags, is_revealed_to_players, reveal_method,
       related_characters, related_locations,
       created_by, created_at, updated_at)
    SELECT
      id, project_id, parent_id as parent_entry_id,
      title,
      CASE
        WHEN category IN (
          'history', 'science', 'culture', 'geography', 'organizations',
          'technology', 'religion', 'language', 'economy', 'characters', 'other'
        )
        THEN category
        WHEN category = 'organization' THEN 'organizations'
        ELSE 'other'
      END as category,
      content,
      tags, is_public as is_revealed_to_players, revelation_trigger as reveal_method,
      related_characters, related_locations,
      created_by, created_at, updated_at
    FROM lore_entries;
  `);

  // 3. Drop old table
  db.exec('DROP TABLE lore_entries;');

  // 4. Rename new table
  db.exec('ALTER TABLE lore_entries_new RENAME TO lore_entries;');

  // 5. Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_lore_entries_project ON lore_entries(project_id);
    CREATE INDEX IF NOT EXISTS idx_lore_entries_category ON lore_entries(category);
    CREATE INDEX IF NOT EXISTS idx_lore_entries_parent ON lore_entries(parent_entry_id);
    CREATE INDEX IF NOT EXISTS idx_lore_entries_canonical ON lore_entries(canonical_status);
    CREATE INDEX IF NOT EXISTS idx_lore_entries_revealed ON lore_entries(is_revealed_to_players);
    CREATE INDEX IF NOT EXISTS idx_lore_entries_sort ON lore_entries(project_id, sort_order);
  `);

  // Re-enable foreign key constraints
  db.exec('PRAGMA foreign_keys = ON;');

  console.log('✅ lore_entries table enhanced successfully!');
}

export function down() {
  console.log('⏪ Reverting lore_entries enhancement...');

  // Temporarily disable foreign key constraints
  db.exec('PRAGMA foreign_keys = OFF;');

  // Create old table structure
  db.exec(`
    CREATE TABLE lore_entries_old (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      parent_id TEXT REFERENCES lore_entries(id),

      title TEXT NOT NULL,
      category TEXT,
      content TEXT,

      is_public INTEGER DEFAULT 0,
      revelation_trigger TEXT,

      related_characters TEXT,
      related_locations TEXT,

      tags TEXT,

      created_by TEXT REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Copy data back, dropping new fields
  db.exec(`
    INSERT INTO lore_entries_old
      (id, project_id, parent_id,
       title, category, content,
       is_public, revelation_trigger,
       related_characters, related_locations, tags,
       created_by, created_at, updated_at)
    SELECT
      id, project_id, parent_entry_id as parent_id,
      title, category, content,
      is_revealed_to_players as is_public, reveal_method as revelation_trigger,
      related_characters, related_locations, tags,
      created_by, created_at, updated_at
    FROM lore_entries;
  `);

  db.exec('DROP TABLE lore_entries;');
  db.exec('ALTER TABLE lore_entries_old RENAME TO lore_entries;');
  db.exec('CREATE INDEX IF NOT EXISTS idx_lore_entries_project ON lore_entries(project_id);');

  // Re-enable foreign key constraints
  db.exec('PRAGMA foreign_keys = ON;');

  console.log('✅ lore_entries reverted successfully!');
}
