/**
 * Migration: Enhance character_relationships table
 * Adds new fields and constraints for improved relationship mapping
 */
import db from '../index.js';

export function up() {
  console.log('🔄 Enhancing character_relationships table...');

  // Check if we need to migrate (check if new columns exist)
  const tableInfo = db.prepare("PRAGMA table_info(character_relationships)").all() as Array<{ name: string }>;
  const hasRelationshipLabel = tableInfo.some(col => col.name === 'relationship_label');

  if (hasRelationshipLabel) {
    console.log('✅ character_relationships table already enhanced, skipping...');
    return;
  }

  // SQLite doesn't support adding constraints to existing columns easily
  // We need to recreate the table with the new schema

  // 1. Create new table with enhanced schema
  db.exec(`
    CREATE TABLE character_relationships_new (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      character_a_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      character_b_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      relationship_type TEXT DEFAULT 'custom' CHECK(relationship_type IN ('ally', 'enemy', 'family', 'romantic', 'professional', 'secret_identity', 'reports_to', 'controls', 'unknown_to', 'custom')),
      relationship_label TEXT, -- Display label like "brother of", "secretly works for"
      is_bidirectional INTEGER DEFAULT 1, -- Boolean: does the relationship go both ways?
      is_known_to_players INTEGER DEFAULT 0, -- Boolean: do players know about this?
      description TEXT, -- Internal notes
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(project_id, character_a_id, character_b_id)
    );
  `);

  // 2. Copy existing data, mapping old fields to new
  db.exec(`
    INSERT INTO character_relationships_new
      (id, project_id, character_a_id, character_b_id, relationship_type,
       relationship_label, is_bidirectional, is_known_to_players, description, created_at, updated_at)
    SELECT
      id,
      project_id,
      character_a_id,
      character_b_id,
      CASE
        WHEN relationship_type IN ('ally', 'enemy', 'family', 'romantic', 'professional', 'secret_identity', 'reports_to', 'controls', 'unknown_to')
        THEN relationship_type
        ELSE 'custom'
      END as relationship_type,
      relationship_type as relationship_label, -- Use old type as label
      1 as is_bidirectional,
      is_public as is_known_to_players,
      description,
      created_at,
      created_at as updated_at
    FROM character_relationships;
  `);

  // 3. Drop old table
  db.exec('DROP TABLE character_relationships;');

  // 4. Rename new table
  db.exec('ALTER TABLE character_relationships_new RENAME TO character_relationships;');

  // 5. Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_character_relationships_project ON character_relationships(project_id);
    CREATE INDEX IF NOT EXISTS idx_character_relationships_char_a ON character_relationships(character_a_id);
    CREATE INDEX IF NOT EXISTS idx_character_relationships_char_b ON character_relationships(character_b_id);
  `);

  console.log('✅ character_relationships table enhanced successfully!');
}

export function down() {
  console.log('⏪ Reverting character_relationships enhancement...');

  // Recreate original table structure
  db.exec(`
    CREATE TABLE character_relationships_old (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      character_a_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      character_b_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      relationship_type TEXT NOT NULL,
      description TEXT,
      is_public INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Copy data back
  db.exec(`
    INSERT INTO character_relationships_old
      (id, project_id, character_a_id, character_b_id, relationship_type, description, is_public, created_at)
    SELECT
      id, project_id, character_a_id, character_b_id,
      COALESCE(relationship_label, relationship_type) as relationship_type,
      description, is_known_to_players as is_public, created_at
    FROM character_relationships;
  `);

  db.exec('DROP TABLE character_relationships;');
  db.exec('ALTER TABLE character_relationships_old RENAME TO character_relationships;');

  console.log('✅ character_relationships reverted successfully!');
}
