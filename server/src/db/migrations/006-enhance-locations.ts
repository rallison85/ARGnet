/**
 * Migration: Enhance locations table
 * Adds GPS, accessibility, operational, and permission fields
 */
import db from '../index.js';

export function up() {
  console.log('🔄 Enhancing locations table...');

  // Check if we need to migrate (check if new columns exist)
  const tableInfo = db.prepare("PRAGMA table_info(locations)").all() as Array<{ name: string }>;
  const hasPlusCode = tableInfo.some(col => col.name === 'plus_code');

  if (hasPlusCode) {
    console.log('✅ locations table already enhanced, skipping...');
    return;
  }

  // Temporarily disable foreign key constraints for migration
  db.exec('PRAGMA foreign_keys = OFF;');

  // Clean up any failed previous attempts
  db.exec('DROP TABLE IF EXISTS locations_new;');

  // 1. Create new table with enhanced schema
  db.exec(`
    CREATE TABLE locations_new (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

      name TEXT NOT NULL,
      location_type TEXT CHECK(location_type IN (
        'physical_permanent', 'physical_temporary', 'physical_mobile',
        'virtual_website', 'virtual_social', 'virtual_platform',
        'hybrid', 'fictional_referenced', 'fictional_detailed',
        'physical', 'virtual', 'fictional' -- Legacy types for compatibility
      )),

      -- Physical location
      address TEXT,
      latitude REAL,
      longitude REAL,
      plus_code TEXT, -- Google Plus Code

      -- Virtual location
      url TEXT,
      access_instructions TEXT,

      -- Hours and contact
      hours_of_operation TEXT, -- JSON: {monday: "9-5", tuesday: "9-5", notes: "Closed holidays"}
      contact_info TEXT, -- Who to call if issues

      -- Details
      description TEXT,
      significance TEXT, -- Why this location matters
      imagery TEXT, -- JSON array of image URLs

      -- Accessibility and safety
      accessibility_notes TEXT,
      safety_notes TEXT, -- Any hazards or concerns

      -- Permissions
      permissions_required TEXT, -- Legacy field
      permission_status TEXT DEFAULT 'not_needed' CHECK(permission_status IN ('not_needed', 'obtained', 'pending', 'denied')),
      permission_documentation TEXT, -- Notes or file references

      -- Planning
      scouting_notes TEXT, -- Team observations from site visits
      weather_sensitive INTEGER DEFAULT 0, -- Boolean
      backup_location_id TEXT REFERENCES locations(id), -- Backup location

      -- Classification
      is_fictional INTEGER DEFAULT 0, -- Boolean

      -- Usage
      events TEXT, -- JSON array of event IDs using this location (legacy)

      -- Status
      status TEXT DEFAULT 'planned' CHECK(status IN ('planned', 'scouted', 'confirmed', 'active', 'archived')),

      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Copy existing data, converting types where needed
  db.exec(`
    INSERT INTO locations_new
      (id, project_id, name, location_type,
       address, latitude, longitude, url, access_instructions,
       description, significance, imagery, events,
       accessibility_notes, permissions_required,
       status, created_at, updated_at)
    SELECT
      id, project_id, name,
      CASE
        WHEN location_type IN (
          'physical_permanent', 'physical_temporary', 'physical_mobile',
          'virtual_website', 'virtual_social', 'virtual_platform',
          'hybrid', 'fictional_referenced', 'fictional_detailed',
          'physical', 'virtual', 'fictional'
        )
        THEN location_type
        ELSE 'physical'
      END as location_type,
      address, latitude, longitude, url, access_instructions,
      description, significance, imagery, events,
      accessibility_notes, permissions_required,
      status, created_at, updated_at
    FROM locations;
  `);

  // 3. Drop old table
  db.exec('DROP TABLE locations;');

  // 4. Rename new table
  db.exec('ALTER TABLE locations_new RENAME TO locations;');

  // 5. Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_locations_project ON locations(project_id);
    CREATE INDEX IF NOT EXISTS idx_locations_type ON locations(location_type);
    CREATE INDEX IF NOT EXISTS idx_locations_status ON locations(status);
    CREATE INDEX IF NOT EXISTS idx_locations_coords ON locations(latitude, longitude);
    CREATE INDEX IF NOT EXISTS idx_locations_fictional ON locations(is_fictional);
    CREATE INDEX IF NOT EXISTS idx_locations_permission ON locations(permission_status);
  `);

  // Re-enable foreign key constraints
  db.exec('PRAGMA foreign_keys = ON;');

  console.log('✅ locations table enhanced successfully!');
}

export function down() {
  console.log('⏪ Reverting locations enhancement...');

  // Temporarily disable foreign key constraints
  db.exec('PRAGMA foreign_keys = OFF;');

  // Create old table structure
  db.exec(`
    CREATE TABLE locations_old (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

      name TEXT NOT NULL,
      location_type TEXT CHECK(location_type IN ('physical', 'virtual', 'hybrid', 'fictional')),

      address TEXT,
      latitude REAL,
      longitude REAL,

      url TEXT,
      access_instructions TEXT,

      description TEXT,
      significance TEXT,
      imagery TEXT,

      events TEXT,
      accessibility_notes TEXT,
      permissions_required TEXT,

      status TEXT DEFAULT 'planned' CHECK(status IN ('planned', 'scouted', 'confirmed', 'active', 'archived')),

      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Copy data back, dropping new fields and converting types
  db.exec(`
    INSERT INTO locations_old
      (id, project_id, name, location_type,
       address, latitude, longitude, url, access_instructions,
       description, significance, imagery, events,
       accessibility_notes, permissions_required,
       status, created_at, updated_at)
    SELECT
      id, project_id, name,
      CASE
        WHEN location_type LIKE 'physical%' THEN 'physical'
        WHEN location_type LIKE 'virtual%' THEN 'virtual'
        WHEN location_type LIKE 'fictional%' THEN 'fictional'
        WHEN location_type IN ('physical', 'virtual', 'hybrid', 'fictional')
        THEN location_type
        ELSE 'physical'
      END as location_type,
      address, latitude, longitude, url, access_instructions,
      description, significance, imagery, events,
      accessibility_notes, permissions_required,
      status, created_at, updated_at
    FROM locations;
  `);

  db.exec('DROP TABLE locations;');
  db.exec('ALTER TABLE locations_old RENAME TO locations;');
  db.exec('CREATE INDEX IF NOT EXISTS idx_locations_project ON locations(project_id);');

  // Re-enable foreign key constraints
  db.exec('PRAGMA foreign_keys = ON;');

  console.log('✅ locations reverted successfully!');
}
