/**
 * Migration: Enhance assets table
 * Adds metadata, versioning, and workflow fields
 */
import db from '../index.js';

export function up() {
  console.log('🔄 Enhancing assets table...');

  // Check if we need to migrate (check if new columns exist)
  const tableInfo = db.prepare("PRAGMA table_info(assets)").all() as Array<{ name: string }>;
  const hasVersionNumber = tableInfo.some(col => col.name === 'version_number');

  if (hasVersionNumber) {
    console.log('✅ assets table already enhanced, skipping...');
    return;
  }

  // Temporarily disable foreign key constraints for migration
  db.exec('PRAGMA foreign_keys = OFF;');

  // Clean up any failed previous attempts
  db.exec('DROP TABLE IF EXISTS assets_new;');

  // 1. Create new table with enhanced schema
  db.exec(`
    CREATE TABLE assets_new (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

      name TEXT NOT NULL,
      asset_type TEXT CHECK(asset_type IN (
        'image_prop', 'image_digital', 'image_reference',
        'video_diegetic', 'video_production',
        'audio_diegetic', 'audio_production',
        'document_diegetic', 'document_production',
        'model_3d', 'code_technical', 'print_ready',
        'image', 'video', 'audio', 'document', 'code', '3d_model', 'font', 'archive', 'other' -- Legacy types
      )),

      -- File info
      file_path TEXT NOT NULL,
      file_size INTEGER, -- Legacy field
      file_size_bytes INTEGER, -- New precise field (bigint stored as INTEGER in SQLite)
      mime_type TEXT,

      -- Metadata
      description TEXT,
      tags TEXT, -- JSON array
      category TEXT, -- For organization

      -- Versioning
      version INTEGER DEFAULT 1, -- Legacy field
      version_number TEXT, -- New field: "1.0", "2.1", etc.
      parent_asset_id TEXT REFERENCES assets(id),

      -- Dimensions (stored as JSON)
      dimensions TEXT, -- For images: {width, height}, video: {width, height, duration_seconds}, audio: {duration_seconds}

      -- Usage
      usage_rights TEXT, -- License info, attribution requirements
      production_notes TEXT, -- Special instructions for use
      is_diegetic INTEGER DEFAULT 1, -- Boolean: is this an in-world asset or production-only
      used_in TEXT, -- JSON array of references where this asset is used

      -- Status and workflow
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'review', 'approved', 'published', 'archived')),
      created_by_user_id TEXT REFERENCES users(id), -- Standardized naming (replaces uploaded_by)
      approved_by_user_id TEXT REFERENCES users(id),
      approved_at DATETIME,

      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Copy existing data, converting types where needed
  db.exec(`
    INSERT INTO assets_new
      (id, project_id, name, asset_type,
       file_path, file_size, file_size_bytes, mime_type,
       description, tags, category,
       version, parent_asset_id, used_in,
       status, created_by_user_id,
       created_at, updated_at)
    SELECT
      id, project_id, name,
      CASE
        WHEN asset_type IN (
          'image_prop', 'image_digital', 'image_reference',
          'video_diegetic', 'video_production',
          'audio_diegetic', 'audio_production',
          'document_diegetic', 'document_production',
          'model_3d', 'code_technical', 'print_ready',
          'image', 'video', 'audio', 'document', 'code', '3d_model', 'font', 'archive', 'other'
        )
        THEN asset_type
        ELSE 'other'
      END as asset_type,
      file_path, file_size, file_size, mime_type,
      description, tags, category,
      version, parent_asset_id, used_in,
      status, uploaded_by as created_by_user_id,
      created_at, updated_at
    FROM assets;
  `);

  // Set version_number from integer version
  db.exec(`
    UPDATE assets_new SET version_number = CAST(version AS TEXT) || '.0';
  `);

  // 3. Drop old table
  db.exec('DROP TABLE assets;');

  // 4. Rename new table
  db.exec('ALTER TABLE assets_new RENAME TO assets;');

  // 5. Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_assets_project ON assets(project_id);
    CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(asset_type);
    CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
    CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);
    CREATE INDEX IF NOT EXISTS idx_assets_parent ON assets(parent_asset_id);
    CREATE INDEX IF NOT EXISTS idx_assets_created_by ON assets(created_by_user_id);
    CREATE INDEX IF NOT EXISTS idx_assets_is_diegetic ON assets(is_diegetic);
  `);

  // Re-enable foreign key constraints
  db.exec('PRAGMA foreign_keys = ON;');

  console.log('✅ assets table enhanced successfully!');
}

export function down() {
  console.log('⏪ Reverting assets enhancement...');

  // Temporarily disable foreign key constraints
  db.exec('PRAGMA foreign_keys = OFF;');

  // Create old table structure
  db.exec(`
    CREATE TABLE assets_old (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

      name TEXT NOT NULL,
      asset_type TEXT CHECK(asset_type IN ('image', 'video', 'audio', 'document', 'code', '3d_model', 'font', 'archive', 'other')),

      file_path TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,

      description TEXT,
      tags TEXT,
      category TEXT,

      used_in TEXT,

      version INTEGER DEFAULT 1,
      parent_asset_id TEXT REFERENCES assets(id),

      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'review', 'approved', 'published', 'archived')),

      uploaded_by TEXT REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Copy data back, dropping new fields
  db.exec(`
    INSERT INTO assets_old
      (id, project_id, name, asset_type,
       file_path, file_size, mime_type,
       description, tags, category, used_in,
       version, parent_asset_id, status, uploaded_by,
       created_at, updated_at)
    SELECT
      id, project_id, name,
      CASE
        WHEN asset_type LIKE 'image%' THEN 'image'
        WHEN asset_type LIKE 'video%' THEN 'video'
        WHEN asset_type LIKE 'audio%' THEN 'audio'
        WHEN asset_type LIKE 'document%' THEN 'document'
        WHEN asset_type = 'code_technical' THEN 'code'
        WHEN asset_type = 'model_3d' THEN '3d_model'
        WHEN asset_type IN ('image', 'video', 'audio', 'document', 'code', '3d_model', 'font', 'archive', 'other')
        THEN asset_type
        ELSE 'other'
      END as asset_type,
      file_path, COALESCE(file_size_bytes, file_size) as file_size, mime_type,
      description, tags, category, used_in,
      version, parent_asset_id, status, created_by_user_id as uploaded_by,
      created_at, updated_at
    FROM assets;
  `);

  db.exec('DROP TABLE assets;');
  db.exec('ALTER TABLE assets_old RENAME TO assets;');
  db.exec('CREATE INDEX IF NOT EXISTS idx_assets_project ON assets(project_id);');

  // Re-enable foreign key constraints
  db.exec('PRAGMA foreign_keys = ON;');

  console.log('✅ assets reverted successfully!');
}
