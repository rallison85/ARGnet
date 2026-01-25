/**
 * Migration: Redesign trail map nodes
 * Enhances trail_nodes with unlock/completion conditions and renames to trail_map_nodes
 */
import db from '../index.js';

export function up() {
  console.log('🔄 Redesigning trail map nodes...');

  // Check if we need to migrate (check if new columns exist)
  const tableInfo = db.prepare("PRAGMA table_info(trail_nodes)").all() as Array<{ name: string }>;
  const hasLayer = tableInfo.some(col => col.name === 'layer');

  if (hasLayer) {
    console.log('✅ trail_nodes already redesigned, skipping...');
    return;
  }

  // Temporarily disable foreign key constraints for migration
  db.exec('PRAGMA foreign_keys = OFF;');

  // Clean up any failed previous attempts
  db.exec('DROP TABLE IF EXISTS trail_map_nodes;');

  // 1. Create new table with enhanced schema
  db.exec(`
    CREATE TABLE trail_map_nodes (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

      name TEXT NOT NULL,
      node_type TEXT CHECK(node_type IN (
        'entry_point', 'waypoint', 'branch', 'gate', 'merge', 'secret',
        'bonus', 'finale', 'dead_end', 'hub',
        'convergence' -- Legacy type for backward compatibility
      )),
      description TEXT,

      -- Visual positioning
      position_x REAL DEFAULT 0,
      position_y REAL DEFAULT 0,
      layer TEXT DEFAULT 'narrative' CHECK(layer IN ('narrative', 'physical')),

      -- Content associations (what this node represents)
      content_type TEXT, -- story_beat, puzzle, event, location, etc.
      content_id TEXT,

      -- Unlock conditions
      unlock_condition_type TEXT DEFAULT 'always' CHECK(unlock_condition_type IN (
        'always', 'puzzle_solved', 'time_reached', 'node_completed',
        'manual_trigger', 'player_count', 'external_event'
      )),
      unlock_condition_config TEXT, -- JSON: stores condition details

      -- Completion conditions
      completion_condition_type TEXT DEFAULT 'automatic' CHECK(completion_condition_type IN (
        'automatic', 'puzzle_solved', 'manual', 'time_based'
      )),
      completion_condition_config TEXT, -- JSON: stores completion details

      -- Metadata
      estimated_duration_minutes INTEGER,
      is_required INTEGER DEFAULT 1, -- Boolean: required for story completion
      visibility TEXT DEFAULT 'always_visible' CHECK(visibility IN (
        'always_visible', 'hidden_until_unlocked', 'teased'
      )),

      -- Live tracking
      is_unlocked INTEGER DEFAULT 0, -- Boolean: for live tracking
      is_completed INTEGER DEFAULT 0, -- Boolean: for live tracking

      -- Organization
      sort_order INTEGER DEFAULT 0,

      -- Legacy fields
      discovery_method TEXT, -- How players find this node
      estimated_discovery_time TEXT,
      status TEXT DEFAULT 'planned' CHECK(status IN ('planned', 'built', 'testing', 'live')),

      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Copy existing data, converting types where needed
  db.exec(`
    INSERT INTO trail_map_nodes
      (id, project_id, name, node_type, description,
       position_x, position_y, content_type, content_id,
       discovery_method, estimated_discovery_time, status,
       created_at, updated_at)
    SELECT
      id, project_id, name,
      CASE
        WHEN node_type IN (
          'entry_point', 'waypoint', 'branch', 'secret', 'finale', 'dead_end', 'convergence'
        )
        THEN node_type
        ELSE 'waypoint'
      END as node_type,
      description,
      position_x, position_y, content_type, content_id,
      discovery_method, estimated_discovery_time, status,
      created_at, updated_at
    FROM trail_nodes;
  `);

  // Set reasonable defaults for new fields
  // Entry points are always unlocked
  db.exec(`
    UPDATE trail_map_nodes
    SET is_unlocked = 1
    WHERE node_type = 'entry_point';
  `);

  // Secret and bonus nodes are hidden until unlocked
  db.exec(`
    UPDATE trail_map_nodes
    SET visibility = 'hidden_until_unlocked'
    WHERE node_type IN ('secret', 'bonus');
  `);

  // 3. Update trail_connections to reference new table
  // (trail_connections will be replaced in next chunk, so just update the foreign keys)
  db.exec(`
    CREATE TABLE trail_connections_temp AS
    SELECT * FROM trail_connections;
  `);

  db.exec('DROP TABLE trail_connections;');

  db.exec(`
    CREATE TABLE trail_connections (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      from_node_id TEXT NOT NULL REFERENCES trail_map_nodes(id) ON DELETE CASCADE,
      to_node_id TEXT NOT NULL REFERENCES trail_map_nodes(id) ON DELETE CASCADE,
      connection_type TEXT DEFAULT 'sequential' CHECK(connection_type IN ('sequential', 'optional', 'secret', 'conditional')),
      condition TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.exec(`
    INSERT INTO trail_connections
    SELECT * FROM trail_connections_temp;
  `);

  db.exec('DROP TABLE trail_connections_temp;');

  // 4. Drop old table
  db.exec('DROP TABLE trail_nodes;');

  // 5. Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_trail_map_nodes_project ON trail_map_nodes(project_id);
    CREATE INDEX IF NOT EXISTS idx_trail_map_nodes_type ON trail_map_nodes(node_type);
    CREATE INDEX IF NOT EXISTS idx_trail_map_nodes_layer ON trail_map_nodes(layer);
    CREATE INDEX IF NOT EXISTS idx_trail_map_nodes_status ON trail_map_nodes(status);
    CREATE INDEX IF NOT EXISTS idx_trail_map_nodes_unlocked ON trail_map_nodes(is_unlocked);
    CREATE INDEX IF NOT EXISTS idx_trail_map_nodes_completed ON trail_map_nodes(is_completed);
    CREATE INDEX IF NOT EXISTS idx_trail_map_nodes_visibility ON trail_map_nodes(visibility);
    CREATE INDEX IF NOT EXISTS idx_trail_map_nodes_content ON trail_map_nodes(content_type, content_id);
    CREATE INDEX IF NOT EXISTS idx_trail_map_nodes_sort ON trail_map_nodes(project_id, sort_order);
  `);

  // Re-enable foreign key constraints
  db.exec('PRAGMA foreign_keys = ON;');

  console.log('✅ trail_map_nodes redesigned successfully!');
}

export function down() {
  console.log('⏪ Reverting trail map nodes redesign...');

  // Temporarily disable foreign key constraints
  db.exec('PRAGMA foreign_keys = OFF;');

  // Create old table structure
  db.exec(`
    CREATE TABLE trail_nodes (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      node_type TEXT CHECK(node_type IN ('entry_point', 'waypoint', 'branch', 'convergence', 'dead_end', 'secret', 'finale')),
      description TEXT,
      content_type TEXT,
      content_id TEXT,
      position_x REAL DEFAULT 0,
      position_y REAL DEFAULT 0,
      discovery_method TEXT,
      estimated_discovery_time TEXT,
      status TEXT DEFAULT 'planned' CHECK(status IN ('planned', 'built', 'testing', 'live')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Copy data back, dropping new fields
  db.exec(`
    INSERT INTO trail_nodes
      (id, project_id, name, node_type, description,
       content_type, content_id,
       position_x, position_y,
       discovery_method, estimated_discovery_time, status,
       created_at, updated_at)
    SELECT
      id, project_id, name,
      CASE
        WHEN node_type IN ('entry_point', 'waypoint', 'branch', 'convergence', 'dead_end', 'secret', 'finale')
        THEN node_type
        WHEN node_type = 'merge' THEN 'convergence'
        WHEN node_type IN ('gate', 'bonus', 'hub') THEN 'waypoint'
        ELSE 'waypoint'
      END as node_type,
      description,
      content_type, content_id,
      position_x, position_y,
      discovery_method, estimated_discovery_time, status,
      created_at, updated_at
    FROM trail_map_nodes;
  `);

  // Update trail_connections to reference old table
  db.exec(`
    CREATE TABLE trail_connections_temp AS
    SELECT * FROM trail_connections;
  `);

  db.exec('DROP TABLE trail_connections;');

  db.exec(`
    CREATE TABLE trail_connections (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      from_node_id TEXT NOT NULL REFERENCES trail_nodes(id) ON DELETE CASCADE,
      to_node_id TEXT NOT NULL REFERENCES trail_nodes(id) ON DELETE CASCADE,
      connection_type TEXT DEFAULT 'sequential' CHECK(connection_type IN ('sequential', 'optional', 'secret', 'conditional')),
      condition TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.exec(`
    INSERT INTO trail_connections
    SELECT * FROM trail_connections_temp;
  `);

  db.exec('DROP TABLE trail_connections_temp;');

  db.exec('DROP TABLE trail_map_nodes;');
  db.exec('CREATE INDEX IF NOT EXISTS idx_trail_nodes_project ON trail_nodes(project_id);');

  // Re-enable foreign key constraints
  db.exec('PRAGMA foreign_keys = ON;');

  console.log('✅ trail_nodes reverted successfully!');
}
