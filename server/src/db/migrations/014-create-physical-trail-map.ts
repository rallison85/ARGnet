/**
 * Migration: Create physical trail map layer
 * Adds GPS-based physical points and routes for location-based ARG gameplay
 */
import db from '../index.js';

export function up() {
  console.log('🔄 Creating physical trail map tables...');

  // Check if tables already exist
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('trail_map_physical_points', 'trail_map_physical_routes')").all() as Array<{ name: string }>;

  if (tables.length > 0) {
    console.log('✅ Physical trail map tables already exist, skipping...');
    return;
  }

  // Temporarily disable foreign key constraints for migration
  db.exec('PRAGMA foreign_keys = OFF;');

  // 1. Create trail_map_physical_points table
  db.exec(`
    CREATE TABLE trail_map_physical_points (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

      -- Associations
      node_id TEXT REFERENCES trail_map_nodes(id) ON DELETE SET NULL, -- Link to narrative node
      location_id TEXT REFERENCES locations(id) ON DELETE SET NULL, -- Link to location entry

      -- Point details
      name TEXT NOT NULL,
      latitude REAL NOT NULL, -- Decimal degrees (e.g., 37.7749)
      longitude REAL NOT NULL, -- Decimal degrees (e.g., -122.4194)
      radius_meters INTEGER DEFAULT 50, -- Detection radius for "player arrived" gameplay

      point_type TEXT CHECK(point_type IN ('start', 'waypoint', 'checkpoint', 'cache', 'finale', 'optional')),

      -- Player instructions
      instructions TEXT, -- What players do at this location
      hint_if_stuck TEXT, -- Help text if players can't find it

      -- Physical interaction
      requires_physical_presence INTEGER DEFAULT 1, -- Boolean: must be at location
      qr_code_data TEXT, -- QR code content for scanning
      nfc_tag_id TEXT, -- NFC tag identifier

      -- Logistics
      accessibility_notes TEXT, -- Wheelchair access, stairs, etc.
      travel_notes TEXT, -- Parking, transit info, best times to visit

      -- Management
      is_active INTEGER DEFAULT 1, -- Boolean: for live management
      sort_order INTEGER DEFAULT 0,

      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Create trail_map_physical_routes table
  db.exec(`
    CREATE TABLE trail_map_physical_routes (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

      from_point_id TEXT NOT NULL REFERENCES trail_map_physical_points(id) ON DELETE CASCADE,
      to_point_id TEXT NOT NULL REFERENCES trail_map_physical_points(id) ON DELETE CASCADE,

      travel_mode TEXT DEFAULT 'walking' CHECK(travel_mode IN ('walking', 'driving', 'transit', 'any')),

      -- Travel estimates
      estimated_minutes INTEGER,
      distance_meters INTEGER,

      route_notes TEXT, -- Special directions, warnings, etc.

      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

      UNIQUE(from_point_id, to_point_id, travel_mode)
    );
  `);

  // 3. Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_physical_points_project ON trail_map_physical_points(project_id);
    CREATE INDEX IF NOT EXISTS idx_physical_points_node ON trail_map_physical_points(node_id);
    CREATE INDEX IF NOT EXISTS idx_physical_points_location ON trail_map_physical_points(location_id);
    CREATE INDEX IF NOT EXISTS idx_physical_points_type ON trail_map_physical_points(point_type);
    CREATE INDEX IF NOT EXISTS idx_physical_points_active ON trail_map_physical_points(is_active);
    CREATE INDEX IF NOT EXISTS idx_physical_points_coords ON trail_map_physical_points(latitude, longitude);
    CREATE INDEX IF NOT EXISTS idx_physical_points_sort ON trail_map_physical_points(project_id, sort_order);

    CREATE INDEX IF NOT EXISTS idx_physical_routes_project ON trail_map_physical_routes(project_id);
    CREATE INDEX IF NOT EXISTS idx_physical_routes_from ON trail_map_physical_routes(from_point_id);
    CREATE INDEX IF NOT EXISTS idx_physical_routes_to ON trail_map_physical_routes(to_point_id);
    CREATE INDEX IF NOT EXISTS idx_physical_routes_mode ON trail_map_physical_routes(travel_mode);
  `);

  // Re-enable foreign key constraints
  db.exec('PRAGMA foreign_keys = ON;');

  console.log('✅ Physical trail map tables created successfully!');
}

export function down() {
  console.log('⏪ Dropping physical trail map tables...');

  // Temporarily disable foreign key constraints
  db.exec('PRAGMA foreign_keys = OFF;');

  db.exec('DROP TABLE IF EXISTS trail_map_physical_routes;');
  db.exec('DROP TABLE IF EXISTS trail_map_physical_points;');

  // Re-enable foreign key constraints
  db.exec('PRAGMA foreign_keys = ON;');

  console.log('✅ Physical trail map tables dropped successfully!');
}
