/**
 * Migration: Enhance characters table
 * Adds voice guides, operational fields, and expanded character types
 */
import db from '../index.js';

export function up() {
  console.log('🔄 Enhancing characters table...');

  // Check if we need to migrate (check if new columns exist)
  const tableInfo = db.prepare("PRAGMA table_info(characters)").all() as Array<{ name: string }>;
  const hasVoiceGuide = tableInfo.some(col => col.name === 'voice_guide');

  if (hasVoiceGuide) {
    console.log('✅ characters table already enhanced, skipping...');
    return;
  }

  // Temporarily disable foreign key constraints for migration
  db.exec('PRAGMA foreign_keys = OFF;');

  // Clean up any failed previous attempts
  db.exec('DROP TABLE IF EXISTS characters_new;');

  // 1. Create new table with enhanced schema
  db.exec(`
    CREATE TABLE characters_new (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      aliases TEXT, -- JSON array of alternative names (existing)
      character_type TEXT DEFAULT 'npc' CHECK(character_type IN (
        'protagonist', 'antagonist', 'npc', 'puppet_master', 'autonomous_ai',
        'organization', 'historical', 'player_created', 'ai'
      )),

      -- Character details
      description TEXT,
      backstory TEXT,
      personality TEXT,
      motivations TEXT,
      secrets TEXT, -- Hidden from players

      -- Visual
      avatar_url TEXT,
      gallery TEXT, -- JSON array of image URLs

      -- Voice/Communication style
      voice_notes TEXT, -- Legacy field
      voice_guide TEXT, -- Comprehensive voice guide (new)
      speech_patterns TEXT, -- Legacy field
      sample_responses TEXT, -- JSON array of 3-5 example messages
      communication_channels TEXT, -- JSON array of objects {platform, handle}

      -- Operations
      availability_schedule TEXT, -- JSON object with timezone and hours
      operator_user_ids TEXT, -- JSON array of user IDs who can play this character
      knowledge_boundaries TEXT, -- What this character knows and doesn't know

      -- Status
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'deceased', 'unknown', 'hidden')),
      is_active INTEGER DEFAULT 1, -- Boolean: can be "retired" from active use
      introduction_beat_id TEXT REFERENCES story_beats(id),

      -- Tracking
      appearance_count INTEGER DEFAULT 0, -- Track public appearances
      last_appearance_at DATETIME, -- Last time character appeared

      -- Metadata
      tags TEXT, -- JSON array
      notes TEXT,

      created_by TEXT REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Copy existing data, converting types where needed
  db.exec(`
    INSERT INTO characters_new
      (id, project_id, name, aliases, character_type,
       description, backstory, personality, motivations, secrets,
       avatar_url, gallery, voice_notes, speech_patterns,
       status, introduction_beat_id, tags, notes,
       created_by, created_at, updated_at)
    SELECT
      id, project_id, name, aliases,
      CASE
        WHEN character_type IN ('protagonist', 'antagonist', 'npc', 'puppet_master', 'ai', 'organization')
        THEN CASE
          WHEN character_type = 'ai' THEN 'autonomous_ai'
          ELSE character_type
        END
        ELSE 'npc'
      END as character_type,
      description, backstory, personality, motivations, secrets,
      avatar_url, gallery, voice_notes, speech_patterns,
      status, introduction_beat_id, tags, notes,
      created_by, created_at, updated_at
    FROM characters;
  `);

  // 3. Drop old table
  db.exec('DROP TABLE characters;');

  // 4. Rename new table
  db.exec('ALTER TABLE characters_new RENAME TO characters;');

  // 5. Recreate indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_characters_project ON characters(project_id);
    CREATE INDEX IF NOT EXISTS idx_characters_type ON characters(character_type);
    CREATE INDEX IF NOT EXISTS idx_characters_status ON characters(status);
    CREATE INDEX IF NOT EXISTS idx_characters_active ON characters(is_active);
  `);

  // Re-enable foreign key constraints
  db.exec('PRAGMA foreign_keys = ON;');

  console.log('✅ characters table enhanced successfully!');
}

export function down() {
  console.log('⏪ Reverting characters enhancement...');

  // Temporarily disable foreign key constraints
  db.exec('PRAGMA foreign_keys = OFF;');

  // Create old table structure
  db.exec(`
    CREATE TABLE characters_old (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      aliases TEXT,
      character_type TEXT DEFAULT 'npc' CHECK(character_type IN ('protagonist', 'antagonist', 'npc', 'puppet_master', 'ai', 'organization')),

      description TEXT,
      backstory TEXT,
      personality TEXT,
      motivations TEXT,
      secrets TEXT,

      avatar_url TEXT,
      gallery TEXT,

      voice_notes TEXT,
      speech_patterns TEXT,

      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'deceased', 'unknown', 'hidden')),
      introduction_beat_id TEXT REFERENCES story_beats(id),

      tags TEXT,
      notes TEXT,

      created_by TEXT REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Copy data back, dropping new fields
  db.exec(`
    INSERT INTO characters_old
      (id, project_id, name, aliases, character_type,
       description, backstory, personality, motivations, secrets,
       avatar_url, gallery, voice_notes, speech_patterns,
       status, introduction_beat_id, tags, notes,
       created_by, created_at, updated_at)
    SELECT
      id, project_id, name, aliases,
      CASE
        WHEN character_type = 'autonomous_ai' THEN 'ai'
        WHEN character_type IN ('protagonist', 'antagonist', 'npc', 'puppet_master', 'ai', 'organization')
        THEN character_type
        ELSE 'npc'
      END as character_type,
      description, backstory, personality, motivations, secrets,
      avatar_url, gallery, voice_notes, speech_patterns,
      status, introduction_beat_id, tags, notes,
      created_by, created_at, updated_at
    FROM characters;
  `);

  db.exec('DROP TABLE characters;');
  db.exec('ALTER TABLE characters_old RENAME TO characters;');
  db.exec('CREATE INDEX IF NOT EXISTS idx_characters_project ON characters(project_id);');

  // Re-enable foreign key constraints
  db.exec('PRAGMA foreign_keys = ON;');

  console.log('✅ characters reverted successfully!');
}
