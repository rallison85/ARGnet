/**
 * Migration: Create trail_map_edges table
 * Replaces trail_connections with enhanced edge schema
 */
import db from '../index.js';

export function up() {
  console.log('🔄 Creating trail_map_edges table...');

  // Check if table already exists
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='trail_map_edges'").all() as Array<{ name: string }>;

  if (tables.length > 0) {
    console.log('✅ trail_map_edges table already exists, skipping...');
    return;
  }

  // Temporarily disable foreign key constraints for migration
  db.exec('PRAGMA foreign_keys = OFF;');

  // 1. Create new trail_map_edges table
  db.exec(`
    CREATE TABLE trail_map_edges (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

      source_node_id TEXT NOT NULL REFERENCES trail_map_nodes(id) ON DELETE CASCADE,
      target_node_id TEXT NOT NULL REFERENCES trail_map_nodes(id) ON DELETE CASCADE,

      edge_type TEXT DEFAULT 'automatic' CHECK(edge_type IN (
        'automatic', 'choice', 'puzzle', 'time', 'manual', 'conditional'
      )),

      condition_config TEXT, -- JSON: stores condition details

      is_bidirectional INTEGER DEFAULT 0, -- Boolean
      label TEXT, -- What this transition represents
      is_active INTEGER DEFAULT 1, -- Boolean: for live management

      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

      UNIQUE(source_node_id, target_node_id)
    );
  `);

  // 2. Migrate data from trail_connections to trail_map_edges
  db.exec(`
    INSERT INTO trail_map_edges
      (id, project_id, source_node_id, target_node_id, edge_type, label, created_at)
    SELECT
      id,
      project_id,
      from_node_id as source_node_id,
      to_node_id as target_node_id,
      CASE
        WHEN connection_type = 'sequential' THEN 'automatic'
        WHEN connection_type = 'optional' THEN 'choice'
        WHEN connection_type = 'conditional' THEN 'conditional'
        WHEN connection_type = 'secret' THEN 'conditional'
        ELSE 'automatic'
      END as edge_type,
      description as label,
      created_at
    FROM trail_connections;
  `);

  // Migrate condition text to condition_config JSON where available
  db.exec(`
    UPDATE trail_map_edges
    SET condition_config = json_object('description', (
      SELECT condition FROM trail_connections WHERE trail_connections.id = trail_map_edges.id
    ))
    WHERE EXISTS (
      SELECT 1 FROM trail_connections
      WHERE trail_connections.id = trail_map_edges.id
      AND trail_connections.condition IS NOT NULL
    );
  `);

  // 3. Drop old trail_connections table
  db.exec('DROP TABLE trail_connections;');

  // 4. Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_trail_map_edges_project ON trail_map_edges(project_id);
    CREATE INDEX IF NOT EXISTS idx_trail_map_edges_source ON trail_map_edges(source_node_id);
    CREATE INDEX IF NOT EXISTS idx_trail_map_edges_target ON trail_map_edges(target_node_id);
    CREATE INDEX IF NOT EXISTS idx_trail_map_edges_type ON trail_map_edges(edge_type);
    CREATE INDEX IF NOT EXISTS idx_trail_map_edges_active ON trail_map_edges(is_active);
    CREATE INDEX IF NOT EXISTS idx_trail_map_edges_bidirectional ON trail_map_edges(is_bidirectional);
  `);

  // Re-enable foreign key constraints
  db.exec('PRAGMA foreign_keys = ON;');

  console.log('✅ trail_map_edges table created successfully!');
}

export function down() {
  console.log('⏪ Reverting trail_map_edges creation...');

  // Temporarily disable foreign key constraints
  db.exec('PRAGMA foreign_keys = OFF;');

  // Create old trail_connections table
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

  // Copy data back from trail_map_edges
  db.exec(`
    INSERT INTO trail_connections
      (id, project_id, from_node_id, to_node_id, connection_type, description, created_at)
    SELECT
      id,
      project_id,
      source_node_id as from_node_id,
      target_node_id as to_node_id,
      CASE
        WHEN edge_type = 'automatic' THEN 'sequential'
        WHEN edge_type = 'choice' THEN 'optional'
        WHEN edge_type IN ('puzzle', 'time', 'conditional') THEN 'conditional'
        WHEN edge_type = 'manual' THEN 'sequential'
        ELSE 'sequential'
      END as connection_type,
      label as description,
      created_at
    FROM trail_map_edges;
  `);

  db.exec('DROP TABLE trail_map_edges;');

  // Re-enable foreign key constraints
  db.exec('PRAGMA foreign_keys = ON;');

  console.log('✅ trail_connections restored successfully!');
}
