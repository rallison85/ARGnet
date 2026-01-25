/**
 * Migration: Enhance tasks table
 * Adds assignment arrays, dependencies, and recurring task support
 */
import db from '../index.js';

export function up() {
  console.log('🔄 Enhancing tasks table...');

  // Check if we need to migrate (check if new columns exist)
  const tableInfo = db.prepare("PRAGMA table_info(tasks)").all() as Array<{ name: string }>;
  const hasAssigneeUserIds = tableInfo.some(col => col.name === 'assignee_user_ids');

  if (hasAssigneeUserIds) {
    console.log('✅ tasks table already enhanced, skipping...');
    return;
  }

  // Temporarily disable foreign key constraints for migration
  db.exec('PRAGMA foreign_keys = OFF;');

  // Clean up any failed previous attempts
  db.exec('DROP TABLE IF EXISTS tasks_new;');

  // 1. Create new table with enhanced schema
  db.exec(`
    CREATE TABLE tasks_new (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      parent_task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,

      title TEXT NOT NULL,
      description TEXT,

      -- Assignment
      assigned_to TEXT REFERENCES users(id), -- Legacy: single assignee
      assignee_user_ids TEXT, -- New: JSON array of user IDs
      assigned_by TEXT REFERENCES users(id),

      -- Categorization
      department TEXT, -- Legacy field
      task_type TEXT, -- Legacy: writing, design, code, art, production, qa, etc.
      category TEXT CHECK(category IN ('writing', 'design', 'technical', 'production', 'qa', 'admin', 'communication', 'other')),

      -- Priority and status
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
      status TEXT DEFAULT 'todo' CHECK(status IN ('todo', 'in_progress', 'review', 'blocked', 'done', 'cancelled')),

      -- Timing
      due_date DATE,
      estimated_hours REAL, -- Legacy field name
      effort_estimate_hours REAL, -- New field name (alias)
      actual_hours REAL,

      -- Dependencies
      blocked_by_task_ids TEXT, -- JSON array of task IDs that block this task

      -- Relations
      related_entity_type TEXT, -- Legacy field name
      related_content_type TEXT, -- New field name (alias)
      related_entity_id TEXT, -- Legacy field name
      related_content_id TEXT, -- New field name (alias)

      -- Recurring tasks
      is_recurring INTEGER DEFAULT 0, -- Boolean
      recurrence_pattern TEXT, -- JSON: {frequency: 'weekly', day: 'monday'}

      -- Completion
      completed_at DATETIME,
      completed_by TEXT REFERENCES users(id),

      created_by TEXT REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Copy existing data, converting types where needed
  db.exec(`
    INSERT INTO tasks_new
      (id, project_id, parent_task_id,
       title, description,
       assigned_to, assigned_by,
       department, task_type,
       priority, status,
       due_date, estimated_hours, effort_estimate_hours, actual_hours,
       related_entity_type, related_content_type,
       related_entity_id, related_content_id,
       completed_at, completed_by,
       created_by, created_at, updated_at)
    SELECT
      id, project_id, parent_task_id,
      title, description,
      assigned_to, assigned_by,
      department, task_type,
      priority, status,
      due_date, estimated_hours, estimated_hours as effort_estimate_hours, actual_hours,
      related_entity_type, related_entity_type as related_content_type,
      related_entity_id, related_entity_id as related_content_id,
      completed_at, completed_by,
      created_by, created_at, updated_at
    FROM tasks;
  `);

  // Migrate assigned_to to assignee_user_ids (create JSON array)
  db.exec(`
    UPDATE tasks_new
    SET assignee_user_ids = json_array(assigned_to)
    WHERE assigned_to IS NOT NULL;
  `);

  // Map task_type to category where possible
  db.exec(`
    UPDATE tasks_new
    SET category = CASE
      WHEN task_type IN ('writing', 'design', 'production', 'qa', 'admin', 'communication') THEN task_type
      WHEN task_type IN ('code', 'technical', 'tech') THEN 'technical'
      WHEN task_type = 'art' THEN 'design'
      ELSE 'other'
    END
    WHERE task_type IS NOT NULL;
  `);

  // 3. Drop old table
  db.exec('DROP TABLE tasks;');

  // 4. Rename new table
  db.exec('ALTER TABLE tasks_new RENAME TO tasks;');

  // 5. Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
    CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
    CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
    CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_recurring ON tasks(is_recurring);
    CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed_at);
  `);

  // Re-enable foreign key constraints
  db.exec('PRAGMA foreign_keys = ON;');

  console.log('✅ tasks table enhanced successfully!');
}

export function down() {
  console.log('⏪ Reverting tasks enhancement...');

  // Temporarily disable foreign key constraints
  db.exec('PRAGMA foreign_keys = OFF;');

  // Create old table structure
  db.exec(`
    CREATE TABLE tasks_old (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      parent_task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,

      title TEXT NOT NULL,
      description TEXT,

      assigned_to TEXT REFERENCES users(id),
      assigned_by TEXT REFERENCES users(id),

      department TEXT,
      task_type TEXT,

      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
      status TEXT DEFAULT 'todo' CHECK(status IN ('todo', 'in_progress', 'review', 'blocked', 'done', 'cancelled')),

      due_date DATE,
      estimated_hours REAL,
      actual_hours REAL,

      related_entity_type TEXT,
      related_entity_id TEXT,

      completed_at DATETIME,
      completed_by TEXT REFERENCES users(id),

      created_by TEXT REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Copy data back, dropping new fields
  db.exec(`
    INSERT INTO tasks_old
      (id, project_id, parent_task_id,
       title, description,
       assigned_to, assigned_by,
       department, task_type,
       priority, status,
       due_date, estimated_hours, actual_hours,
       related_entity_type, related_entity_id,
       completed_at, completed_by,
       created_by, created_at, updated_at)
    SELECT
      id, project_id, parent_task_id,
      title, description,
      assigned_to, assigned_by,
      department, task_type,
      priority, status,
      due_date, estimated_hours, actual_hours,
      COALESCE(related_content_type, related_entity_type) as related_entity_type,
      COALESCE(related_content_id, related_entity_id) as related_entity_id,
      completed_at, completed_by,
      created_by, created_at, updated_at
    FROM tasks;
  `);

  db.exec('DROP TABLE tasks;');
  db.exec('ALTER TABLE tasks_old RENAME TO tasks;');
  db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);');

  // Re-enable foreign key constraints
  db.exec('PRAGMA foreign_keys = ON;');

  console.log('✅ tasks reverted successfully!');
}
