/**
 * Migration: Enhance digital_properties table
 * Adds operational tracking and management fields
 */
import db from '../index.js';

export function up() {
  console.log('🔄 Enhancing digital_properties table...');

  // Check if we need to migrate (check if new columns exist)
  const tableInfo = db.prepare("PRAGMA table_info(digital_properties)").all() as Array<{ name: string }>;
  const hasCharacterId = tableInfo.some(col => col.name === 'character_id');

  if (hasCharacterId) {
    console.log('✅ digital_properties table already enhanced, skipping...');
    return;
  }

  // Temporarily disable foreign key constraints for migration
  db.exec('PRAGMA foreign_keys = OFF;');

  // Clean up any failed previous attempts
  db.exec('DROP TABLE IF EXISTS digital_properties_new;');

  // 1. Create new table with enhanced schema
  db.exec(`
    CREATE TABLE digital_properties_new (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      property_type TEXT NOT NULL CHECK(property_type IN (
        'website', 'social_media', 'email', 'phone', 'app', 'document',
        'video_channel', 'podcast', 'discord_server', 'forum', 'blog', 'newsletter',
        'other'
      )),

      -- Details
      url TEXT,
      platform TEXT, -- For social media: twitter, instagram, tiktok, etc.
      username TEXT,
      description TEXT,
      purpose TEXT, -- What this property is used for in the ARG

      -- In-world details
      character_id TEXT REFERENCES characters(id), -- Who "owns" this in the narrative (replaces owner_character_id)
      creation_date DATE, -- When account was made, for aging purposes
      backstory TEXT, -- In-world history of this property

      -- Operations
      managed_by_user_ids TEXT, -- JSON array of team members with access
      content_guidelines TEXT,
      posting_schedule TEXT, -- Legacy field
      posting_frequency TEXT, -- e.g., "2-3 times per week"

      -- Cross-promotion
      linked_property_ids TEXT, -- JSON array of related property IDs

      -- Metrics
      follower_count INTEGER,
      follower_goal INTEGER,
      verification_status INTEGER DEFAULT 0, -- Boolean
      last_post_at DATETIME,

      -- Access
      credentials TEXT, -- Legacy: Encrypted JSON with login info (deprecated)
      credentials_reference TEXT, -- Reference to password manager entry (NOT actual passwords)

      -- Status
      status TEXT DEFAULT 'planning' CHECK(status IN ('planning', 'created', 'active', 'dormant', 'archived')),
      launch_date DATE,

      created_by TEXT REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Copy existing data, converting types where needed
  db.exec(`
    INSERT INTO digital_properties_new
      (id, project_id, name, property_type,
       url, platform, username, description, purpose,
       character_id, content_guidelines, posting_schedule,
       credentials, status, launch_date,
       created_by, created_at, updated_at)
    SELECT
      id, project_id, name,
      CASE
        WHEN property_type IN (
          'website', 'social_media', 'email', 'phone', 'app', 'document',
          'video_channel', 'podcast', 'other'
        )
        THEN property_type
        ELSE 'other'
      END as property_type,
      url, platform, username, description, purpose,
      owner_character_id as character_id,
      content_guidelines, posting_schedule,
      credentials,
      CASE
        WHEN status IN ('planning', 'created', 'active', 'dormant', 'archived')
        THEN status
        WHEN status = 'planned' THEN 'planning'
        ELSE 'planning'
      END as status,
      launch_date,
      created_by, created_at, updated_at
    FROM digital_properties;
  `);

  // 3. Drop old table
  db.exec('DROP TABLE digital_properties;');

  // 4. Rename new table
  db.exec('ALTER TABLE digital_properties_new RENAME TO digital_properties;');

  // 5. Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_digital_properties_project ON digital_properties(project_id);
    CREATE INDEX IF NOT EXISTS idx_digital_properties_type ON digital_properties(property_type);
    CREATE INDEX IF NOT EXISTS idx_digital_properties_status ON digital_properties(status);
    CREATE INDEX IF NOT EXISTS idx_digital_properties_character ON digital_properties(character_id);
    CREATE INDEX IF NOT EXISTS idx_digital_properties_platform ON digital_properties(platform);
  `);

  // Re-enable foreign key constraints
  db.exec('PRAGMA foreign_keys = ON;');

  console.log('✅ digital_properties table enhanced successfully!');
}

export function down() {
  console.log('⏪ Reverting digital_properties enhancement...');

  // Temporarily disable foreign key constraints
  db.exec('PRAGMA foreign_keys = OFF;');

  // Create old table structure
  db.exec(`
    CREATE TABLE digital_properties_old (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      property_type TEXT NOT NULL CHECK(property_type IN ('website', 'social_media', 'email', 'phone', 'app', 'document', 'video_channel', 'podcast', 'other')),

      url TEXT,
      platform TEXT,
      username TEXT,
      description TEXT,
      purpose TEXT,

      content_guidelines TEXT,
      posting_schedule TEXT,

      credentials TEXT,
      owner_character_id TEXT REFERENCES characters(id),

      status TEXT DEFAULT 'planned' CHECK(status IN ('planned', 'created', 'active', 'dormant', 'archived')),
      launch_date DATE,

      created_by TEXT REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Copy data back, dropping new fields
  db.exec(`
    INSERT INTO digital_properties_old
      (id, project_id, name, property_type,
       url, platform, username, description, purpose,
       content_guidelines, posting_schedule,
       credentials, owner_character_id, status, launch_date,
       created_by, created_at, updated_at)
    SELECT
      id, project_id, name, property_type,
      url, platform, username, description, purpose,
      content_guidelines, posting_schedule,
      credentials, character_id as owner_character_id,
      CASE
        WHEN status = 'planning' THEN 'planned'
        WHEN status IN ('planned', 'created', 'active', 'dormant', 'archived')
        THEN status
        ELSE 'planned'
      END as status,
      launch_date,
      created_by, created_at, updated_at
    FROM digital_properties;
  `);

  db.exec('DROP TABLE digital_properties;');
  db.exec('ALTER TABLE digital_properties_old RENAME TO digital_properties;');
  db.exec('CREATE INDEX IF NOT EXISTS idx_digital_properties_project ON digital_properties(project_id);');

  // Re-enable foreign key constraints
  db.exec('PRAGMA foreign_keys = ON;');

  console.log('✅ digital_properties reverted successfully!');
}
