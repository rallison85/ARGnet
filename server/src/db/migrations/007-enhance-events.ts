/**
 * Migration: Enhance events table
 * Adds full production management fields for event planning and execution
 */
import db from '../index.js';

export function up() {
  console.log('🔄 Enhancing events table...');

  // Check if we need to migrate (check if new columns exist)
  const tableInfo = db.prepare("PRAGMA table_info(events)").all() as Array<{ name: string }>;
  const hasVirtualLocationUrl = tableInfo.some(col => col.name === 'virtual_location_url');

  if (hasVirtualLocationUrl) {
    console.log('✅ events table already enhanced, skipping...');
    return;
  }

  // Temporarily disable foreign key constraints for migration
  db.exec('PRAGMA foreign_keys = OFF;');

  // Clean up any failed previous attempts
  db.exec('DROP TABLE IF EXISTS events_new;');

  // 1. Create new table with enhanced schema
  db.exec(`
    CREATE TABLE events_new (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      story_beat_id TEXT REFERENCES story_beats(id),
      location_id TEXT REFERENCES locations(id),

      title TEXT NOT NULL,
      event_type TEXT CHECK(event_type IN (
        'performance', 'installation', 'meetup', 'drop', 'broadcast', 'online', 'hybrid',
        'dead_drop', 'phone_call', 'livestream', 'puzzle_release', 'content_update',
        'player_milestone'
      )),
      description TEXT,

      -- Timing
      scheduled_start DATETIME,
      scheduled_end DATETIME,
      timezone TEXT DEFAULT 'UTC',

      -- Location (physical and virtual)
      virtual_location_url TEXT, -- For online/hybrid events

      -- Team
      assigned_team_members TEXT, -- JSON array of user IDs

      -- Participant info
      min_attendees INTEGER,
      max_participants INTEGER,
      registration_required INTEGER DEFAULT 0, -- Legacy: rsvp_required
      rsvp_required INTEGER DEFAULT 0, -- New alias
      registration_url TEXT,
      visibility TEXT DEFAULT 'public' CHECK(visibility IN ('public', 'secret', 'invite_only')),

      -- Resources
      equipment_needed TEXT, -- JSON array of required items
      budget_cents INTEGER, -- Store in cents for precision

      -- Planning
      script TEXT, -- Legacy: runsheet
      runsheet TEXT, -- Detailed minute-by-minute plan
      requirements TEXT, -- Legacy field
      contingencies TEXT, -- Legacy field (text)
      contingency_plans TEXT, -- JSON array of {scenario, response}
      post_event_tasks TEXT, -- JSON array of follow-up items
      staff_required TEXT, -- JSON array of roles needed (legacy)

      -- Status
      status TEXT DEFAULT 'planning' CHECK(status IN ('planning', 'confirmed', 'in_progress', 'completed', 'cancelled', 'postponed')),

      -- Post-event
      actual_attendance INTEGER,
      event_notes TEXT,
      recording_url TEXT, -- Where recording is stored

      created_by TEXT REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Copy existing data, converting types where needed
  db.exec(`
    INSERT INTO events_new
      (id, project_id, story_beat_id, location_id,
       title, event_type, description,
       scheduled_start, scheduled_end, timezone,
       max_participants, registration_required, registration_url,
       script, requirements, contingencies, staff_required,
       status, actual_attendance, event_notes,
       created_by, created_at, updated_at)
    SELECT
      id, project_id, story_beat_id, location_id,
      title,
      CASE
        WHEN event_type IN (
          'performance', 'installation', 'meetup', 'drop', 'broadcast',
          'online', 'hybrid', 'phone_call'
        )
        THEN event_type
        ELSE 'meetup'
      END as event_type,
      description,
      scheduled_start, scheduled_end, timezone,
      max_participants, registration_required, registration_url,
      script, requirements, contingencies, staff_required,
      CASE
        WHEN status IN ('planning', 'confirmed', 'in_progress', 'completed', 'cancelled')
        THEN status
        WHEN status = 'planned' THEN 'planning'
        ELSE 'planning'
      END as status,
      actual_attendance, event_notes,
      created_by, created_at, updated_at
    FROM events;
  `);

  // Set rsvp_required same as registration_required
  db.exec(`
    UPDATE events_new SET rsvp_required = registration_required;
  `);

  // 3. Drop old table
  db.exec('DROP TABLE events;');

  // 4. Rename new table
  db.exec('ALTER TABLE events_new RENAME TO events;');

  // 5. Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_events_project ON events(project_id);
    CREATE INDEX IF NOT EXISTS idx_events_story_beat ON events(story_beat_id);
    CREATE INDEX IF NOT EXISTS idx_events_location ON events(location_id);
    CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
    CREATE INDEX IF NOT EXISTS idx_events_date ON events(scheduled_start);
    CREATE INDEX IF NOT EXISTS idx_events_visibility ON events(visibility);
  `);

  // Re-enable foreign key constraints
  db.exec('PRAGMA foreign_keys = ON;');

  console.log('✅ events table enhanced successfully!');
}

export function down() {
  console.log('⏪ Reverting events enhancement...');

  // Temporarily disable foreign key constraints
  db.exec('PRAGMA foreign_keys = OFF;');

  // Create old table structure
  db.exec(`
    CREATE TABLE events_old (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      story_beat_id TEXT REFERENCES story_beats(id),
      location_id TEXT REFERENCES locations(id),

      title TEXT NOT NULL,
      event_type TEXT CHECK(event_type IN ('performance', 'installation', 'meetup', 'drop', 'broadcast', 'phone_call', 'online', 'hybrid')),
      description TEXT,

      scheduled_start DATETIME,
      scheduled_end DATETIME,
      timezone TEXT DEFAULT 'UTC',

      script TEXT,
      requirements TEXT,
      contingencies TEXT,

      staff_required TEXT,

      max_participants INTEGER,
      registration_required INTEGER DEFAULT 0,
      registration_url TEXT,

      status TEXT DEFAULT 'planned' CHECK(status IN ('planned', 'confirmed', 'in_progress', 'completed', 'cancelled', 'postponed')),

      actual_attendance INTEGER,
      event_notes TEXT,

      created_by TEXT REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Copy data back, dropping new fields
  db.exec(`
    INSERT INTO events_old
      (id, project_id, story_beat_id, location_id,
       title, event_type, description,
       scheduled_start, scheduled_end, timezone,
       script, requirements, contingencies, staff_required,
       max_participants, registration_required, registration_url,
       status, actual_attendance, event_notes,
       created_by, created_at, updated_at)
    SELECT
      id, project_id, story_beat_id, location_id,
      title, event_type, description,
      scheduled_start, scheduled_end, timezone,
      COALESCE(runsheet, script) as script,
      requirements, contingencies, staff_required,
      max_participants, registration_required, registration_url,
      CASE
        WHEN status = 'planning' THEN 'planned'
        WHEN status IN ('planned', 'confirmed', 'in_progress', 'completed', 'cancelled', 'postponed')
        THEN status
        ELSE 'planned'
      END as status,
      actual_attendance, event_notes,
      created_by, created_at, updated_at
    FROM events;
  `);

  db.exec('DROP TABLE events;');
  db.exec('ALTER TABLE events_old RENAME TO events;');
  db.exec('CREATE INDEX IF NOT EXISTS idx_events_project ON events(project_id);');

  // Re-enable foreign key constraints
  db.exec('PRAGMA foreign_keys = ON;');

  console.log('✅ events reverted successfully!');
}
