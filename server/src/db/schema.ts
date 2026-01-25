// ARGnet Database Schema
// Comprehensive schema for Alternate Reality Game collaboration platform

export const schema = `
-- Users and Authentication
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  role TEXT DEFAULT 'member' CHECK(role IN ('admin', 'member')),
  skills TEXT, -- JSON array of skills: writer, artist, programmer, designer, producer, etc.
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME
);

-- ARG Projects
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  tagline TEXT,
  status TEXT DEFAULT 'planning' CHECK(status IN ('planning', 'development', 'testing', 'live', 'concluded', 'archived')),
  visibility TEXT DEFAULT 'private' CHECK(visibility IN ('private', 'team', 'public')),
  cover_image_url TEXT,

  -- Project metadata
  genre TEXT, -- horror, mystery, sci-fi, fantasy, etc.
  themes TEXT, -- JSON array
  target_audience TEXT,
  estimated_duration TEXT, -- e.g., "3 months", "6 weeks"

  -- Timeline
  start_date DATE,
  end_date DATE,
  launch_date DATE,

  -- Settings
  settings TEXT, -- JSON object for project-specific settings

  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Project Team Members
CREATE TABLE IF NOT EXISTS project_members (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'contributor' CHECK(role IN ('owner', 'admin', 'lead', 'contributor', 'viewer')),
  department TEXT, -- writing, art, programming, design, production, qa
  title TEXT, -- Custom title like "Lead Writer", "Puzzle Designer"
  permissions TEXT, -- JSON object of specific permissions
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, user_id)
);

-- Narrative Elements - Story Beats/Chapters (Enhanced)
CREATE TABLE IF NOT EXISTS story_beats (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES story_beats(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT, -- Rich text content (existing internal content)
  summary TEXT,
  beat_type TEXT DEFAULT 'chapter' CHECK(beat_type IN ('chapter', 'scene', 'flashback', 'revelation', 'branch_point', 'convergence', 'ending', 'secret')),
  sequence_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'review', 'approved', 'locked')),

  -- Timeline positioning
  story_date TEXT, -- In-universe date/time
  real_world_trigger TEXT, -- When this beat should be revealed (legacy field)

  -- Trigger system
  trigger_type TEXT CHECK(trigger_type IN ('manual', 'puzzle_solved', 'date_reached', 'node_completed', 'player_action')),
  trigger_config TEXT, -- JSON: stores trigger details like puzzle_id or date

  -- Delivery
  delivery_method TEXT CHECK(delivery_method IN ('website', 'social_post', 'email', 'physical_drop', 'live_event', 'automatic', 'in_app')),

  -- Content split
  player_facing_content TEXT, -- What players see
  internal_notes TEXT, -- Production notes

  -- Content metadata
  canonical_status TEXT DEFAULT 'canon' CHECK(canonical_status IN ('canon', 'semi_canon', 'non_canon', 'retconned')),
  reading_time_minutes INTEGER,
  content_warnings TEXT, -- JSON array of warning tags

  -- Metadata
  mood TEXT,
  location_id TEXT,
  notes TEXT, -- General notes (legacy)

  created_by TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Characters (In-game personas and NPCs) (Enhanced)
CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  aliases TEXT, -- JSON array of alternative names
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
  voice_guide TEXT, -- Comprehensive voice guide (vocabulary, patterns, topics)
  speech_patterns TEXT, -- Legacy field
  sample_responses TEXT, -- JSON array of 3-5 example messages in character voice
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

-- Character Relationships (Enhanced)
CREATE TABLE IF NOT EXISTS character_relationships (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  character_a_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  character_b_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  relationship_type TEXT DEFAULT 'custom' CHECK(relationship_type IN ('ally', 'enemy', 'family', 'romantic', 'professional', 'secret_identity', 'reports_to', 'controls', 'unknown_to', 'custom')),
  relationship_label TEXT, -- Display label like "brother of", "secretly works for"
  is_bidirectional INTEGER DEFAULT 1, -- Boolean: does the relationship go both ways?
  is_known_to_players INTEGER DEFAULT 0, -- Boolean: do players know about this relationship?
  description TEXT, -- Internal notes
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, character_a_id, character_b_id)
);

-- In-game Websites/Digital Properties (Enhanced)
CREATE TABLE IF NOT EXISTS digital_properties (
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
  character_id TEXT REFERENCES characters(id), -- Who "owns" this in the narrative
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

-- Puzzles and Challenges (Enhanced)
CREATE TABLE IF NOT EXISTS puzzles (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  story_beat_id TEXT REFERENCES story_beats(id),

  title TEXT NOT NULL,
  puzzle_code TEXT, -- e.g., "PZ-001" for easy reference
  description TEXT,
  puzzle_type TEXT CHECK(puzzle_type IN (
    'cipher', 'code', 'riddle', 'physical', 'digital', 'social', 'meta',
    'audio', 'visual', 'coordinates', 'steganography', 'osint', 'geocache',
    'phone_tree', 'email_chain', 'collaborative', 'timed', 'live_event',
    'artefact', 'other'
  )),

  -- Difficulty and timing
  difficulty INTEGER DEFAULT 3 CHECK(difficulty BETWEEN 1 AND 5),
  estimated_solve_time TEXT, -- Legacy field (e.g., "30 minutes")
  estimated_solve_minutes INTEGER, -- New precise field

  -- Collaboration
  is_collaborative INTEGER DEFAULT 0, -- Requires multiple players

  -- The puzzle itself
  setup TEXT, -- How the puzzle is presented
  solution TEXT, -- The answer/solution
  solution_method TEXT, -- How to solve it
  hints TEXT, -- JSON array of progressive hints (legacy, will be replaced in Chunk 1.5)

  -- Alternative solutions and red herrings
  alternative_solutions TEXT, -- JSON: [{solution: string, notes: string}]
  red_herrings TEXT, -- JSON: [{herring: string, why_wrong: string}]

  -- Requirements
  prerequisites TEXT, -- JSON array of puzzle IDs that must be solved first
  required_tools TEXT, -- What players need to solve this (legacy)
  required_materials TEXT, -- JSON array: ["internet", "printer", "smartphone"]
  required_knowledge TEXT,

  -- Accessibility
  accessibility_alternative TEXT, -- How players with disabilities can engage

  -- Rewards
  reward_type TEXT, -- story_unlock, item, information, access, etc.
  reward_description TEXT,
  unlocks TEXT, -- JSON array of what solving this unlocks

  -- Status
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'review', 'testing', 'approved', 'live', 'solved', 'archived')),
  is_optional INTEGER DEFAULT 0,
  is_hidden INTEGER DEFAULT 0, -- Secret puzzle

  -- Testing
  test_results TEXT, -- JSON array of test session results (legacy)
  testing_notes TEXT, -- Structured testing notes
  average_solve_time TEXT, -- Legacy field
  average_solve_minutes REAL, -- New precise field

  -- Live tracking
  live_solve_count INTEGER DEFAULT 0,
  live_hint_usage_count INTEGER DEFAULT 0,

  created_by TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Puzzle Components/Clues
CREATE TABLE IF NOT EXISTS puzzle_clues (
  id TEXT PRIMARY KEY,
  puzzle_id TEXT NOT NULL REFERENCES puzzles(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  clue_type TEXT CHECK(clue_type IN ('text', 'image', 'audio', 'video', 'file', 'physical', 'location', 'interaction')),
  content TEXT,
  asset_url TEXT,

  -- Delivery
  delivery_method TEXT, -- How the clue reaches players
  delivery_location TEXT, -- Where the clue is found
  delivery_trigger TEXT, -- What triggers the clue's availability

  sequence_order INTEGER DEFAULT 0,
  is_red_herring INTEGER DEFAULT 0,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Puzzle Hints (Structured Progressive Hint System)
CREATE TABLE IF NOT EXISTS puzzle_hints (
  id TEXT PRIMARY KEY,
  puzzle_id TEXT NOT NULL REFERENCES puzzles(id) ON DELETE CASCADE,
  hint_order INTEGER NOT NULL,
  hint_text TEXT NOT NULL,
  release_trigger TEXT DEFAULT 'manual' CHECK(release_trigger IN ('manual', 'time_based', 'request_count', 'automatic')),
  release_config TEXT, -- JSON: {minutes_after_start: 30} or {request_threshold: 5}
  is_released INTEGER DEFAULT 0, -- Boolean: for live tracking
  released_at DATETIME, -- When this hint was released
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(puzzle_id, hint_order)
);

-- Trail/Rabbit Hole - The discovery path
CREATE TABLE IF NOT EXISTS trail_nodes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  node_type TEXT CHECK(node_type IN ('entry_point', 'waypoint', 'branch', 'convergence', 'dead_end', 'secret', 'finale')),
  description TEXT,

  -- What this node contains/reveals
  content_type TEXT, -- puzzle, story, character, location, etc.
  content_id TEXT, -- Reference to the actual content

  -- Visual positioning for trail map
  position_x REAL DEFAULT 0,
  position_y REAL DEFAULT 0,

  -- Metadata
  discovery_method TEXT, -- How players find this node
  estimated_discovery_time TEXT,

  status TEXT DEFAULT 'planned' CHECK(status IN ('planned', 'built', 'testing', 'live')),

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Trail Connections
CREATE TABLE IF NOT EXISTS trail_connections (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  from_node_id TEXT NOT NULL REFERENCES trail_nodes(id) ON DELETE CASCADE,
  to_node_id TEXT NOT NULL REFERENCES trail_nodes(id) ON DELETE CASCADE,

  connection_type TEXT DEFAULT 'sequential' CHECK(connection_type IN ('sequential', 'optional', 'secret', 'conditional')),
  condition TEXT, -- What must be true for this path
  description TEXT,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Locations (Physical and Virtual) (Enhanced)
CREATE TABLE IF NOT EXISTS locations (
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

-- Live Events (Enhanced)
CREATE TABLE IF NOT EXISTS events (
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

-- Event Staff Assignments
CREATE TABLE IF NOT EXISTS event_staff (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- actor, coordinator, tech, support, etc.
  character_id TEXT REFERENCES characters(id), -- If playing a character
  notes TEXT,
  confirmed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, user_id)
);

-- Assets (Files, Media) (Enhanced)
CREATE TABLE IF NOT EXISTS assets (
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

-- World Building - Lore Entries
CREATE TABLE IF NOT EXISTS lore_entries (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES lore_entries(id),

  title TEXT NOT NULL,
  category TEXT, -- history, technology, culture, organization, etc.
  content TEXT,

  -- Classification
  is_public INTEGER DEFAULT 0, -- Player-facing or internal only
  revelation_trigger TEXT, -- When/how this becomes known

  -- Relations
  related_characters TEXT, -- JSON array of character IDs
  related_locations TEXT, -- JSON array of location IDs

  tags TEXT,

  created_by TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Timeline Events (In-universe chronology)
CREATE TABLE IF NOT EXISTS timeline_events (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,

  -- When (in-universe)
  event_date TEXT NOT NULL, -- Can be "2024-03-15" or "300 years ago" etc.
  event_date_precision TEXT DEFAULT 'day' CHECK(event_date_precision IN ('exact', 'day', 'month', 'year', 'decade', 'era', 'unknown')),
  is_approximate INTEGER DEFAULT 0,

  -- Classification
  event_type TEXT, -- founding, death, discovery, catastrophe, etc.
  significance TEXT CHECK(significance IN ('minor', 'moderate', 'major', 'critical')),

  -- Visibility
  is_public INTEGER DEFAULT 0,

  -- Relations
  related_characters TEXT,
  related_locations TEXT,
  story_beat_id TEXT REFERENCES story_beats(id),

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tasks (Internal project management)
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,

  -- Assignment
  assigned_to TEXT REFERENCES users(id),
  assigned_by TEXT REFERENCES users(id),

  -- Categorization
  department TEXT,
  task_type TEXT, -- writing, design, code, art, production, qa, etc.

  -- Priority and status
  priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'todo' CHECK(status IN ('todo', 'in_progress', 'review', 'blocked', 'done', 'cancelled')),

  -- Timing
  due_date DATE,
  estimated_hours REAL,
  actual_hours REAL,

  -- Relations
  related_entity_type TEXT, -- puzzle, character, event, etc.
  related_entity_id TEXT,

  -- Completion
  completed_at DATETIME,
  completed_by TEXT REFERENCES users(id),

  created_by TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Comments (Universal commenting system)
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- What this comment is on
  entity_type TEXT NOT NULL, -- puzzle, character, story_beat, etc.
  entity_id TEXT NOT NULL,

  -- Comment content
  content TEXT NOT NULL,

  -- Threading
  parent_comment_id TEXT REFERENCES comments(id) ON DELETE CASCADE,

  -- Metadata
  is_resolved INTEGER DEFAULT 0,
  is_pinned INTEGER DEFAULT 0,

  author_id TEXT NOT NULL REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Activity Log (Audit trail)
CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,

  action TEXT NOT NULL, -- created, updated, deleted, commented, etc.
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_name TEXT, -- For display purposes

  -- Change details
  changes TEXT, -- JSON object of what changed

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Player Tracking (For live ARGs)
CREATE TABLE IF NOT EXISTS player_sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  player_identifier TEXT NOT NULL, -- Could be username, email hash, etc.
  session_name TEXT,

  -- Progress
  puzzles_solved TEXT, -- JSON array of puzzle IDs
  story_beats_reached TEXT, -- JSON array of beat IDs
  trail_nodes_discovered TEXT, -- JSON array of node IDs

  -- Engagement
  first_contact DATETIME,
  last_activity DATETIME,
  total_interactions INTEGER DEFAULT 0,

  -- Notes
  notes TEXT, -- PM notes about this player/group

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,

  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,

  -- Link to related content
  entity_type TEXT,
  entity_id TEXT,

  is_read INTEGER DEFAULT 0,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Junction Tables for Content Linking

-- Story Beat to Characters (many-to-many)
CREATE TABLE IF NOT EXISTS story_beat_characters (
  id TEXT PRIMARY KEY,
  story_beat_id TEXT NOT NULL REFERENCES story_beats(id) ON DELETE CASCADE,
  character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'mentioned' CHECK(role IN ('featured', 'mentioned', 'background')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(story_beat_id, character_id)
);

-- Story Beat to Puzzles (many-to-many with relationship type)
CREATE TABLE IF NOT EXISTS story_beat_puzzles (
  id TEXT PRIMARY KEY,
  story_beat_id TEXT NOT NULL REFERENCES story_beats(id) ON DELETE CASCADE,
  puzzle_id TEXT NOT NULL REFERENCES puzzles(id) ON DELETE CASCADE,
  relationship TEXT DEFAULT 'references' CHECK(relationship IN ('requires', 'unlocks', 'references')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(story_beat_id, puzzle_id)
);

-- Story Beat to Locations (many-to-many)
CREATE TABLE IF NOT EXISTS story_beat_locations (
  id TEXT PRIMARY KEY,
  story_beat_id TEXT NOT NULL REFERENCES story_beats(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(story_beat_id, location_id)
);

-- Puzzle Prerequisites (self-referential many-to-many)
CREATE TABLE IF NOT EXISTS puzzle_prerequisites (
  id TEXT PRIMARY KEY,
  puzzle_id TEXT NOT NULL REFERENCES puzzles(id) ON DELETE CASCADE,
  prerequisite_puzzle_id TEXT NOT NULL REFERENCES puzzles(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(puzzle_id, prerequisite_puzzle_id),
  CHECK(puzzle_id != prerequisite_puzzle_id)
);

-- Puzzle Unlocks (polymorphic relationship to various content types)
CREATE TABLE IF NOT EXISTS puzzle_unlocks (
  id TEXT PRIMARY KEY,
  puzzle_id TEXT NOT NULL REFERENCES puzzles(id) ON DELETE CASCADE,
  unlockable_type TEXT NOT NULL CHECK(unlockable_type IN ('story_beat', 'character', 'location', 'puzzle', 'event')),
  unlockable_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(puzzle_id, unlockable_type, unlockable_id)
);

-- Event to Characters (many-to-many with involvement type)
CREATE TABLE IF NOT EXISTS event_characters (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  involvement TEXT DEFAULT 'appears' CHECK(involvement IN ('appears', 'operates', 'mentioned')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, character_id)
);

-- Event to Locations (many-to-many with primary flag)
CREATE TABLE IF NOT EXISTS event_locations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  is_primary INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, location_id)
);

-- Event to Puzzles (many-to-many)
CREATE TABLE IF NOT EXISTS event_puzzles (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  puzzle_id TEXT NOT NULL REFERENCES puzzles(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, puzzle_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_story_beats_project ON story_beats(project_id);
CREATE INDEX IF NOT EXISTS idx_story_beats_parent ON story_beats(parent_id);
CREATE INDEX IF NOT EXISTS idx_story_beats_trigger_type ON story_beats(trigger_type);
CREATE INDEX IF NOT EXISTS idx_story_beats_status ON story_beats(status);
CREATE INDEX IF NOT EXISTS idx_characters_project ON characters(project_id);
CREATE INDEX IF NOT EXISTS idx_characters_type ON characters(character_type);
CREATE INDEX IF NOT EXISTS idx_characters_status ON characters(status);
CREATE INDEX IF NOT EXISTS idx_characters_active ON characters(is_active);
CREATE INDEX IF NOT EXISTS idx_character_relationships_project ON character_relationships(project_id);
CREATE INDEX IF NOT EXISTS idx_character_relationships_char_a ON character_relationships(character_a_id);
CREATE INDEX IF NOT EXISTS idx_character_relationships_char_b ON character_relationships(character_b_id);
CREATE INDEX IF NOT EXISTS idx_puzzles_project ON puzzles(project_id);
CREATE INDEX IF NOT EXISTS idx_puzzles_story_beat ON puzzles(story_beat_id);
CREATE INDEX IF NOT EXISTS idx_puzzles_status ON puzzles(status);
CREATE INDEX IF NOT EXISTS idx_puzzles_type ON puzzles(puzzle_type);
CREATE INDEX IF NOT EXISTS idx_puzzles_difficulty ON puzzles(difficulty);
CREATE INDEX IF NOT EXISTS idx_puzzles_code ON puzzles(project_id, puzzle_code);
CREATE INDEX IF NOT EXISTS idx_trail_nodes_project ON trail_nodes(project_id);
CREATE INDEX IF NOT EXISTS idx_events_project ON events(project_id);
CREATE INDEX IF NOT EXISTS idx_events_story_beat ON events(story_beat_id);
CREATE INDEX IF NOT EXISTS idx_events_location ON events(location_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_events_visibility ON events(visibility);
CREATE INDEX IF NOT EXISTS idx_locations_project ON locations(project_id);
CREATE INDEX IF NOT EXISTS idx_locations_type ON locations(location_type);
CREATE INDEX IF NOT EXISTS idx_locations_status ON locations(status);
CREATE INDEX IF NOT EXISTS idx_locations_coords ON locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_locations_fictional ON locations(is_fictional);
CREATE INDEX IF NOT EXISTS idx_locations_permission ON locations(permission_status);
CREATE INDEX IF NOT EXISTS idx_assets_project ON assets(project_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);
CREATE INDEX IF NOT EXISTS idx_assets_parent ON assets(parent_asset_id);
CREATE INDEX IF NOT EXISTS idx_assets_created_by ON assets(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_assets_is_diegetic ON assets(is_diegetic);
CREATE INDEX IF NOT EXISTS idx_digital_properties_project ON digital_properties(project_id);
CREATE INDEX IF NOT EXISTS idx_digital_properties_type ON digital_properties(property_type);
CREATE INDEX IF NOT EXISTS idx_digital_properties_status ON digital_properties(status);
CREATE INDEX IF NOT EXISTS idx_digital_properties_character ON digital_properties(character_id);
CREATE INDEX IF NOT EXISTS idx_digital_properties_platform ON digital_properties(platform);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_project ON activity_log(project_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- Puzzle hints indexes
CREATE INDEX IF NOT EXISTS idx_puzzle_hints_puzzle ON puzzle_hints(puzzle_id);
CREATE INDEX IF NOT EXISTS idx_puzzle_hints_order ON puzzle_hints(puzzle_id, hint_order);
CREATE INDEX IF NOT EXISTS idx_puzzle_hints_released ON puzzle_hints(is_released);

-- Junction table indexes
CREATE INDEX IF NOT EXISTS idx_story_beat_characters_beat ON story_beat_characters(story_beat_id);
CREATE INDEX IF NOT EXISTS idx_story_beat_characters_character ON story_beat_characters(character_id);
CREATE INDEX IF NOT EXISTS idx_story_beat_puzzles_beat ON story_beat_puzzles(story_beat_id);
CREATE INDEX IF NOT EXISTS idx_story_beat_puzzles_puzzle ON story_beat_puzzles(puzzle_id);
CREATE INDEX IF NOT EXISTS idx_story_beat_locations_beat ON story_beat_locations(story_beat_id);
CREATE INDEX IF NOT EXISTS idx_story_beat_locations_location ON story_beat_locations(location_id);
CREATE INDEX IF NOT EXISTS idx_puzzle_prerequisites_puzzle ON puzzle_prerequisites(puzzle_id);
CREATE INDEX IF NOT EXISTS idx_puzzle_prerequisites_prereq ON puzzle_prerequisites(prerequisite_puzzle_id);
CREATE INDEX IF NOT EXISTS idx_puzzle_unlocks_puzzle ON puzzle_unlocks(puzzle_id);
CREATE INDEX IF NOT EXISTS idx_puzzle_unlocks_unlockable ON puzzle_unlocks(unlockable_type, unlockable_id);
CREATE INDEX IF NOT EXISTS idx_event_characters_event ON event_characters(event_id);
CREATE INDEX IF NOT EXISTS idx_event_characters_character ON event_characters(character_id);
CREATE INDEX IF NOT EXISTS idx_event_locations_event ON event_locations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_locations_location ON event_locations(location_id);
CREATE INDEX IF NOT EXISTS idx_event_puzzles_event ON event_puzzles(event_id);
CREATE INDEX IF NOT EXISTS idx_event_puzzles_puzzle ON event_puzzles(puzzle_id);
`;
