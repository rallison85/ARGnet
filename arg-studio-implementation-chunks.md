# ARG Studio Implementation Chunks for Claude Code

## Implementation Philosophy

Each chunk is designed to:
- Be completable in a single Claude Code session (15-45 min of focused work)
- Not break existing functionality
- Be independently testable
- Build logically on previous chunks
- Stay within Claude Code's context limits

**Chunk Sizing Principles:**
- 1-3 new components OR 1 significant feature enhancement per chunk
- Database/schema changes are separate chunks from UI
- API endpoints grouped with their direct consumers
- Refactors isolated from feature additions
- Each prompt is self-contained with necessary context

**Total Chunks:** 69 (including dependencies setup and integration prerequisites)
**Estimated Total Implementation Time:** 40-60 hours of Claude Code sessions

---

# PHASE 0: DEPENDENCIES
*Chunk 0.1 | Install all required packages upfront*

---

## Chunk 0.1: Install All Dependencies

**Purpose:** Install all npm packages needed across all phases so they're available when needed.

**Claude Code Prompt:**
```
Install the following npm packages for ARG Studio. These will be used across various features we'll build:

Frontend/UI packages:
npm install reactflow @reactflow/core @reactflow/controls @reactflow/minimap @reactflow/background
npm install @fullcalendar/react @fullcalendar/core @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/list @fullcalendar/interaction
npm install leaflet react-leaflet @types/leaflet
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder
npm install react-hotkeys-hook
npm install date-fns date-fns-tz

Backend/Integration packages:
npm install nodemailer @types/nodemailer
npm install ical-generator

Dev dependencies (if not already installed):
npm install -D @types/leaflet

Do not modify any existing code. Just install these packages and confirm they installed successfully by checking package.json.
```

**Notes:**
- `reactflow` - Trail Map canvas (Phase 2)
- `@fullcalendar/*` - Calendar views (Phases 3, 10)
- `leaflet/react-leaflet` - Map views for locations (Phase 3)
- `@tiptap/*` - Rich text editor for communications (Phase 5)
- `react-hotkeys-hook` - Keyboard shortcuts (Phase 11)
- `date-fns` - Date manipulation and timezone handling
- `nodemailer` - Email sending (Phase 7)
- `ical-generator` - Calendar export (Phase 10)

**Optional packages** (install only if you plan to implement these integrations):
```
# Discord bot integration (Phase 7.4)
npm install discord.js

# If you want QR code generation for locations/physical trail
npm install qrcode @types/qrcode
```

---

# PHASE 1: DATA MODEL & FOUNDATION
*Chunks 1.1 - 1.12 | Establish data structures everything else depends on*

---

## Chunk 1.1: Content Linking Schema - Junction Tables

**Purpose:** Create database tables for many-to-many relationships between content types.

**Claude Code Prompt:**
```
In ARG Studio, create database schema for content linking. Add these junction tables:

1. story_beat_characters (id, story_beat_id, character_id, role: enum ['featured', 'mentioned', 'background'], created_at)

2. story_beat_puzzles (id, story_beat_id, puzzle_id, relationship: enum ['requires', 'unlocks', 'references'], created_at)

3. story_beat_locations (id, story_beat_id, location_id, created_at)

4. puzzle_prerequisites (id, puzzle_id, prerequisite_puzzle_id, created_at) - self-referential for puzzle ordering

5. puzzle_unlocks (id, puzzle_id, unlockable_type: enum ['story_beat', 'character', 'location', 'puzzle', 'event'], unlockable_id, created_at)

6. event_characters (id, event_id, character_id, involvement: enum ['appears', 'operates', 'mentioned'], created_at)

7. event_locations (id, event_id, location_id, is_primary: boolean, created_at)

8. event_puzzles (id, event_id, puzzle_id, created_at)

Create the migration file, add foreign key constraints, and create TypeScript types for all tables. Add indexes on the foreign key columns for query performance.
```

---

## Chunk 1.2: Character Relationships Schema

**Purpose:** Enable relationship mapping between characters.

**Claude Code Prompt:**
```
In ARG Studio, add a character_relationships table for mapping relationships between characters:

Table: character_relationships
- id (primary key)
- project_id (foreign key to projects)
- character_a_id (foreign key to characters)
- character_b_id (foreign key to characters)
- relationship_type: enum ['ally', 'enemy', 'family', 'romantic', 'professional', 'secret_identity', 'reports_to', 'controls', 'unknown_to', 'custom']
- relationship_label (string, for display - e.g., "brother of", "secretly works for")
- is_bidirectional (boolean, default true)
- is_known_to_players (boolean, default false)
- description (text, optional internal notes)
- created_at, updated_at

Create migration, TypeScript types, and add a unique constraint preventing duplicate relationships between the same two characters in the same project.
```

---

## Chunk 1.3: Enhanced Story Beat Fields

**Purpose:** Expand story beats with trigger conditions and delivery tracking.

**Claude Code Prompt:**
```
In ARG Studio, enhance the story_beats table with new columns:

Add columns:
- beat_type: enum ['chapter', 'scene', 'flashback', 'revelation', 'branch_point', 'convergence', 'ending', 'secret'] (default 'chapter')
- trigger_type: enum ['manual', 'puzzle_solved', 'date_reached', 'node_completed', 'player_action'] (nullable)
- trigger_config: jsonb (stores trigger details like puzzle_id or date)
- delivery_method: enum ['website', 'social_post', 'email', 'physical_drop', 'live_event', 'automatic', 'in_app'] (nullable)
- player_facing_content: text (what players see)
- internal_notes: text (production notes)
- canonical_status: enum ['canon', 'semi_canon', 'non_canon', 'retconned'] (default 'canon')
- reading_time_minutes: integer (nullable)
- content_warnings: text[] (array of warning tags)

Create migration and update the TypeScript Story Beat type. Don't modify any UI yet.
```

---

## Chunk 1.4: Enhanced Puzzle Fields

**Purpose:** Expand puzzles with testing, timing, and accessibility fields.

**Claude Code Prompt:**
```
In ARG Studio, enhance the puzzles table with new columns:

Add columns:
- puzzle_code: varchar(20) unique per project (e.g., "PZ-001" for easy reference)
- estimated_solve_minutes: integer (nullable)
- is_collaborative: boolean (default false, requires multiple players)
- required_materials: text[] (array of strings like "internet", "printer", "smartphone")
- accessibility_alternative: text (how players with disabilities can engage)
- alternative_solutions: jsonb (array of objects with {solution: string, notes: string})
- red_herrings: jsonb (array of objects with {herring: string, why_wrong: string})
- testing_notes: text
- live_solve_count: integer (default 0, for live tracking later)
- live_hint_usage_count: integer (default 0)
- average_solve_minutes: decimal (nullable, calculated from live data later)

Also expand the puzzle type enum to include: 'cipher', 'code', 'riddle', 'physical', 'digital', 'social', 'meta', 'audio', 'visual', 'coordinates', 'steganography', 'osint', 'geocache', 'phone_tree', 'email_chain', 'collaborative', 'timed', 'live_event', 'other'

Create migration and update TypeScript types. Don't modify UI yet.
```

---

## Chunk 1.5: Structured Hints Schema

**Purpose:** Replace single hints field with structured progressive hint system.

**Claude Code Prompt:**
```
In ARG Studio, create a new puzzle_hints table to replace the current hints text field:

Table: puzzle_hints
- id (primary key)
- puzzle_id (foreign key to puzzles)
- hint_order: integer (1, 2, 3, etc.)
- hint_text: text (the actual hint)
- release_trigger: enum ['manual', 'time_based', 'request_count', 'automatic']
- release_config: jsonb (e.g., {minutes_after_start: 30} or {request_threshold: 5})
- is_released: boolean (default false, for live tracking)
- released_at: timestamp (nullable)
- created_at, updated_at

Create migration and TypeScript types. Add a unique constraint on (puzzle_id, hint_order). Keep the old hints column for now - we'll migrate data later.
```

---

## Chunk 1.6: Enhanced Character Fields

**Purpose:** Expand characters with voice guides and operational fields.

**Claude Code Prompt:**
```
In ARG Studio, enhance the characters table with new columns:

Add columns:
- aliases: text[] (array of other names this character uses)
- communication_channels: jsonb (array of objects like {platform: "twitter", handle: "@character"})
- voice_guide: text (vocabulary, speech patterns, topics to discuss/avoid)
- sample_responses: jsonb (array of 3-5 example messages in character voice)
- availability_schedule: jsonb (when can this character be "online", e.g., {weekdays: "9am-5pm", timezone: "EST"})
- operator_user_ids: uuid[] (team members who can play this character)
- knowledge_boundaries: text (what this character knows and doesn't know)
- is_active: boolean (default true, can be "retired" from active use)
- appearance_count: integer (default 0, track public appearances)
- last_appearance_at: timestamp (nullable)

Also expand character type enum to include: 'protagonist', 'antagonist', 'npc', 'puppet_master', 'autonomous_ai', 'organization', 'historical', 'player_created'

Create migration and update TypeScript types. Don't modify UI yet.
```

---

## Chunk 1.7: Enhanced Location Fields

**Purpose:** Expand locations with GPS, accessibility, and operational data.

**Claude Code Prompt:**
```
In ARG Studio, enhance the locations table with new columns:

Add columns:
- latitude: decimal(10, 8) (nullable)
- longitude: decimal(11, 8) (nullable)
- plus_code: varchar(20) (Google Plus Code, nullable)
- access_instructions: text (how to find/enter)
- hours_of_operation: jsonb (e.g., {monday: "9-5", tuesday: "9-5", notes: "Closed holidays"})
- contact_info: text (who to call if issues)
- accessibility_notes: text (wheelchair, transit, parking)
- safety_notes: text (any hazards or concerns)
- permission_status: enum ['not_needed', 'obtained', 'pending', 'denied'] (default 'not_needed')
- permission_documentation: text (notes or file references)
- scouting_notes: text (team observations from site visits)
- weather_sensitive: boolean (default false)
- backup_location_id: uuid (nullable, foreign key to locations)
- is_fictional: boolean (default false)

Expand location type enum to: 'physical_permanent', 'physical_temporary', 'physical_mobile', 'virtual_website', 'virtual_social', 'virtual_platform', 'hybrid', 'fictional_referenced', 'fictional_detailed'

Create migration and update TypeScript types.
```

---

## Chunk 1.8: Enhanced Event Fields

**Purpose:** Expand events with full production management fields.

**Claude Code Prompt:**
```
In ARG Studio, enhance the events table with new columns:

Add columns:
- end_time: timestamp (nullable)
- location_id: uuid (foreign key to locations, nullable)
- virtual_location_url: text (for online events)
- assigned_team_members: uuid[] (user ids responsible)
- min_attendees: integer (nullable)
- max_attendees: integer (nullable)
- rsvp_required: boolean (default false)
- visibility: enum ['public', 'secret', 'invite_only'] (default 'public')
- equipment_needed: text[] (array of required items)
- budget_cents: integer (nullable, store in cents for precision)
- runsheet: text (detailed minute-by-minute plan)
- contingency_plans: jsonb (array of {scenario: string, response: string})
- post_event_tasks: text[] (array of follow-up items)
- recording_url: text (nullable, where recording is stored)
- status: enum ['planning', 'confirmed', 'in_progress', 'completed', 'cancelled'] (default 'planning')

Expand event type enum to: 'performance', 'installation', 'meetup', 'drop', 'broadcast', 'online', 'hybrid', 'dead_drop', 'phone_call', 'livestream', 'puzzle_release', 'content_update', 'player_milestone'

Create migration and update TypeScript types.
```

---

## Chunk 1.9: Enhanced Digital Properties Fields

**Purpose:** Expand digital properties with operational tracking.

**Claude Code Prompt:**
```
In ARG Studio, enhance the digital_properties table with new columns:

Add columns:
- character_id: uuid (nullable, foreign key to characters - who "owns" this property in-world)
- managed_by_user_ids: uuid[] (team members with access)
- status: enum ['planning', 'created', 'active', 'dormant', 'archived'] (default 'planning')
- creation_date: date (nullable, when account was made for aging purposes)
- backstory: text (in-world history of this property)
- content_guidelines: text (what can/cannot be posted)
- posting_frequency: varchar(100) (e.g., "2-3 times per week")
- linked_property_ids: uuid[] (cross-promotion relationships)
- follower_count: integer (nullable, for tracking growth)
- follower_goal: integer (nullable)
- verification_status: boolean (default false)
- last_post_at: timestamp (nullable)
- credentials_reference: text (reference to password manager entry, NOT actual passwords)

Expand type enum to: 'website', 'social_media', 'email', 'phone', 'app', 'video_channel', 'podcast', 'discord_server', 'forum', 'blog', 'newsletter'

Create migration and update TypeScript types.
```

---

## Chunk 1.10: Enhanced Asset Fields

**Purpose:** Expand assets with metadata, versioning, and workflow fields.

**Claude Code Prompt:**
```
In ARG Studio, enhance the assets table with new columns:

Add columns:
- tags: text[] (searchable keywords)
- description: text
- version_number: varchar(20) (e.g., "1.0", "2.1")
- previous_version_id: uuid (nullable, foreign key to assets for version history)
- status: enum ['draft', 'review', 'approved', 'deprecated'] (default 'draft')
- created_by_user_id: uuid (foreign key to users)
- approved_by_user_id: uuid (nullable)
- approved_at: timestamp (nullable)
- file_size_bytes: bigint
- mime_type: varchar(100)
- dimensions: jsonb (for images: {width: int, height: int}, for video: {width, height, duration_seconds}, for audio: {duration_seconds})
- usage_rights: text (license info, attribution requirements)
- production_notes: text (special instructions for use)
- is_diegetic: boolean (default true, is this an in-world asset or production-only)

Expand asset type enum to: 'image_prop', 'image_digital', 'image_reference', 'video_diegetic', 'video_production', 'audio_diegetic', 'audio_production', 'document_diegetic', 'document_production', 'model_3d', 'code_technical', 'print_ready', 'other'

Create migration and update TypeScript types.
```

---

## Chunk 1.11: Enhanced Lore Fields

**Purpose:** Expand lore entries with organization and visibility tracking.

**Claude Code Prompt:**
```
In ARG Studio, enhance the lore_entries table (or create if doesn't exist) with these fields:

Table: lore_entries
- id (primary key)
- project_id (foreign key)
- title: varchar(255)
- category: enum ['history', 'science', 'culture', 'geography', 'organizations', 'technology', 'religion', 'language', 'economy', 'characters', 'other']
- subcategory: varchar(100) (nullable)
- content: text
- tags: text[]
- timeline_position: varchar(255) (nullable, when in world's history this applies)
- canonical_status: enum ['canon', 'semi_canon', 'retconned', 'speculation'] (default 'canon')
- in_world_source: text (nullable, where does this info come from in-world)
- is_revealed_to_players: boolean (default false)
- revealed_at: timestamp (nullable)
- reveal_method: text (nullable, how/when revealed)
- contradiction_notes: text (nullable, conflicts with other lore)
- parent_entry_id: uuid (nullable, for hierarchical organization)
- sort_order: integer (default 0)
- created_at, updated_at

Create migration and TypeScript types.
```

---

## Chunk 1.12: Enhanced Task Fields

**Purpose:** Expand tasks with assignments, dates, and dependencies.

**Claude Code Prompt:**
```
In ARG Studio, enhance the tasks table with new columns:

Add columns:
- assignee_user_ids: uuid[] (team members responsible)
- due_date: timestamp (nullable)
- category: enum ['writing', 'design', 'technical', 'production', 'qa', 'admin', 'communication', 'other'] (nullable)
- effort_estimate_hours: decimal (nullable)
- actual_hours: decimal (nullable)
- blocked_by_task_ids: uuid[] (task dependencies)
- related_content_type: varchar(50) (nullable, e.g., 'puzzle', 'story_beat', 'event')
- related_content_id: uuid (nullable)
- is_recurring: boolean (default false)
- recurrence_pattern: jsonb (nullable, e.g., {frequency: 'weekly', day: 'monday'})
- completed_at: timestamp (nullable)

Create migration and update TypeScript types. Ensure backwards compatibility with existing task data.
```

---

# PHASE 2: TRAIL MAP REBUILD
*Chunks 2.1 - 2.8 | Critical rebuild of the narrative flow system*

---

## Chunk 2.1: Trail Map Node Schema Redesign

**Purpose:** Create enhanced node schema supporting complex ARG flows.

**Claude Code Prompt:**
```
In ARG Studio, redesign the trail map nodes schema. Create or replace the trail_map_nodes table:

Table: trail_map_nodes
- id (primary key)
- project_id (foreign key)
- name: varchar(255)
- node_type: enum ['entry_point', 'waypoint', 'branch', 'gate', 'merge', 'secret', 'bonus', 'finale', 'dead_end', 'hub']
- description: text (nullable)
- position_x: decimal (for visual positioning)
- position_y: decimal
- layer: enum ['narrative', 'physical'] (default 'narrative')

-- Content associations (what this node represents)
- content_type: varchar(50) (nullable, e.g., 'story_beat', 'puzzle', 'event', 'location')
- content_id: uuid (nullable)

-- Unlock conditions
- unlock_condition_type: enum ['always', 'puzzle_solved', 'time_reached', 'node_completed', 'manual_trigger', 'player_count', 'external_event'] (default 'always')
- unlock_condition_config: jsonb (stores condition details)

-- Completion conditions  
- completion_condition_type: enum ['automatic', 'puzzle_solved', 'manual', 'time_based'] (default 'automatic')
- completion_condition_config: jsonb

-- Metadata
- estimated_duration_minutes: integer (nullable)
- is_required: boolean (default true, required for story completion)
- visibility: enum ['always_visible', 'hidden_until_unlocked', 'teased'] (default 'always_visible')
- is_unlocked: boolean (default false, for live tracking)
- is_completed: boolean (default false)
- sort_order: integer (default 0)
- created_at, updated_at

Create migration and TypeScript types.
```

---

## Chunk 2.2: Trail Map Edges Schema

**Purpose:** Create edge/connection schema for node relationships.

**Claude Code Prompt:**
```
In ARG Studio, create trail_map_edges table for connections between nodes:

Table: trail_map_edges
- id (primary key)
- project_id (foreign key)
- source_node_id: uuid (foreign key to trail_map_nodes)
- target_node_id: uuid (foreign key to trail_map_nodes)
- edge_type: enum ['automatic', 'choice', 'puzzle', 'time', 'manual', 'conditional']
- condition_config: jsonb (nullable, stores condition details like {puzzle_id: uuid} or {delay_minutes: 60})
- is_bidirectional: boolean (default false)
- label: varchar(255) (nullable, what this transition represents)
- is_active: boolean (default true, for live management)
- created_at, updated_at

Add unique constraint on (source_node_id, target_node_id) to prevent duplicate edges.

Create migration and TypeScript types.
```

---

## Chunk 2.3: Physical Trail Map Layer Schema

**Purpose:** Add GPS-based physical location layer to trail map.

**Claude Code Prompt:**
```
In ARG Studio, create schema for physical trail map layer:

Table: trail_map_physical_points
- id (primary key)
- project_id (foreign key)
- node_id: uuid (nullable, foreign key to trail_map_nodes if associated with narrative node)
- location_id: uuid (nullable, foreign key to locations)
- name: varchar(255)
- latitude: decimal(10, 8)
- longitude: decimal(11, 8)
- radius_meters: integer (default 50, for "find within this area" gameplay)
- point_type: enum ['start', 'waypoint', 'checkpoint', 'cache', 'finale', 'optional']
- instructions: text (nullable, what players do here)
- hint_if_stuck: text (nullable)
- requires_physical_presence: boolean (default true)
- qr_code_data: text (nullable, for QR placement)
- nfc_tag_id: varchar(100) (nullable)
- accessibility_notes: text (nullable)
- travel_notes: text (nullable, parking, transit info)
- is_active: boolean (default true)
- sort_order: integer
- created_at, updated_at

Also create trail_map_physical_routes for suggested paths between points:

Table: trail_map_physical_routes
- id (primary key)
- project_id (foreign key)
- from_point_id: uuid (foreign key to trail_map_physical_points)
- to_point_id: uuid (foreign key to trail_map_physical_points)
- travel_mode: enum ['walking', 'driving', 'transit', 'any']
- estimated_minutes: integer (nullable)
- distance_meters: integer (nullable)
- route_notes: text (nullable)
- created_at

Create migrations and TypeScript types for both tables.
```

---

## Chunk 2.4: Trail Map API Endpoints

**Purpose:** Create API endpoints for trail map CRUD operations.

**Claude Code Prompt:**
```
In ARG Studio, create API endpoints for the enhanced trail map system:

Endpoints needed:

GET /api/projects/:projectId/trail-map
- Returns all nodes and edges for a project
- Include associated content details (story beat title, puzzle name, etc.)
- Support ?layer=narrative|physical|all query param

POST /api/projects/:projectId/trail-map/nodes
- Create a new node
- Validate unlock_condition_config based on unlock_condition_type
- Return created node with id

PATCH /api/projects/:projectId/trail-map/nodes/:nodeId
- Update node properties
- Validate position doesn't conflict with other nodes

DELETE /api/projects/:projectId/trail-map/nodes/:nodeId
- Delete node and all connected edges
- Soft delete or cascade based on your existing patterns

POST /api/projects/:projectId/trail-map/edges
- Create edge between two nodes
- Validate both nodes exist and belong to same project
- Prevent duplicate edges

PATCH /api/projects/:projectId/trail-map/edges/:edgeId
- Update edge properties

DELETE /api/projects/:projectId/trail-map/edges/:edgeId
- Remove edge

GET /api/projects/:projectId/trail-map/validate
- Return validation results: orphan nodes, unreachable nodes, missing entry points, deadlock detection

Follow existing API patterns in the codebase for auth, error handling, and response formatting.
```

---

## Chunk 2.5: Trail Map Canvas Component - Basic

**Purpose:** Create the foundational visual canvas for trail map.

**Claude Code Prompt:**
```
In ARG Studio, create a new TrailMapCanvas component that replaces the current trail map visualization.

Requirements:
- Use React Flow (npm: reactflow) or similar for node-based visualization
- Support pan and zoom (existing minimap concept)
- Render nodes as styled cards showing:
  - Node name
  - Node type icon
  - Visual indicator if has content associated
  - Lock icon if unlock_condition_type !== 'always'
- Render edges as lines/arrows between nodes
- Different node colors/borders based on node_type
- Support click to select node
- Support drag to reposition nodes (update position_x, position_y on drop)

Create the component in a new file. Don't integrate into the page yet - just the component.

Include basic styling that matches the existing dark theme (purple/blue accents on dark background).
```

---

## Chunk 2.6: Trail Map Canvas - Node Interactions

**Purpose:** Add node creation, editing, and deletion to canvas.

**Claude Code Prompt:**
```
In ARG Studio, enhance the TrailMapCanvas component with node interactions:

Add features:
1. "Add Node" button that opens a modal with:
   - Name field
   - Node type dropdown
   - Layer selection (narrative/physical)
   - Content association dropdowns (optionally link to story beat, puzzle, event, or location)
   - Save creates node at center of current viewport

2. Double-click node to open edit modal with:
   - All fields from creation
   - Unlock condition type and config
   - Completion condition type and config
   - Estimated duration
   - Is required checkbox
   - Visibility dropdown
   - Delete button with confirmation

3. Right-click context menu on nodes with:
   - Edit
   - Delete
   - Mark as unlocked (for testing)
   - View associated content

4. Visual feedback:
   - Selected node has highlight border
   - Hover shows tooltip with node details

Connect to the API endpoints from Chunk 2.4.
```

---

## Chunk 2.7: Trail Map Canvas - Edge Interactions

**Purpose:** Add edge creation and editing to canvas.

**Claude Code Prompt:**
```
In ARG Studio, enhance the TrailMapCanvas component with edge interactions:

Add features:
1. Edge creation mode:
   - Button to enter "connect mode"
   - Click source node, then click target node to create edge
   - Or drag from node handle to another node
   - Modal appears to configure:
     - Edge type (automatic, choice, puzzle, time, manual, conditional)
     - Condition config (show puzzle selector if type is 'puzzle', time input if 'time', etc.)
     - Is bidirectional checkbox
     - Label field
   - Visual preview line while connecting

2. Click edge to select it, showing:
   - Edge details panel or modal
   - Edit edge type and conditions
   - Delete button

3. Edge styling:
   - Different line styles for different edge types (solid, dashed, dotted)
   - Arrows showing direction
   - Labels displayed on edges
   - Bidirectional edges show arrows on both ends

4. Right-click context menu on edges with:
   - Edit
   - Delete
   - Reverse direction

Connect to the API endpoints from Chunk 2.4.
```

---

## Chunk 2.8: Trail Map Page Integration

**Purpose:** Integrate new trail map canvas into the existing page.

**Claude Code Prompt:**
```
In ARG Studio, integrate the new TrailMapCanvas into the Trail Map page, replacing the old implementation:

Requirements:
1. Replace current trail map content with TrailMapCanvas component

2. Add layer toggle in header:
   - "Narrative" / "Physical" / "Both" tabs or toggle
   - Physical layer shows map background (use placeholder or simple grid for now - map integration is separate chunk)

3. Add toolbar with:
   - Add Node button
   - Connect Mode toggle
   - Fit View button (zoom to show all nodes)
   - Validation button (shows warnings about orphan nodes, missing entry points, etc.)
   - Save indicator (show when changes are saved)

4. Add legend showing:
   - Node type colors/icons
   - Edge type line styles

5. Add sidebar that shows:
   - Selected node details
   - Quick stats: total nodes, entry points, finales, completion paths

6. Migrate any existing trail map data to new schema (create a migration script if needed)

Ensure the page is responsive and maintains the existing app styling.
```

---

# PHASE 3: UI UPDATES FOR ENHANCED SCHEMAS
*Chunks 3.1 - 3.12 | Update existing UIs to use new fields*

---

## Chunk 3.1: Story Beat Form Enhancement

**Purpose:** Update story beat creation/edit form with new fields.

**Claude Code Prompt:**
```
In ARG Studio, enhance the Story Beat form (creation and editing) with the new fields:

Add to the form:
1. Beat Type dropdown (chapter, scene, flashback, revelation, branch_point, convergence, ending, secret)

2. Trigger section (collapsible):
   - Trigger Type dropdown
   - Dynamic config based on type:
     - puzzle_solved: puzzle selector
     - date_reached: date picker
     - node_completed: node selector
     - player_action: text description
     - manual: no config needed

3. Delivery Method dropdown

4. Two content fields:
   - "Player-Facing Content" (rich text) - what players see
   - "Internal Notes" (plain text) - production notes

5. Canonical Status dropdown

6. Estimated Reading Time (number input, minutes)

7. Content Warnings (tag input, allow multiple)

Keep existing fields (title, summary, content, status). Reorganize into logical sections with clear labels. Follow existing form patterns in the codebase.
```

---

## Chunk 3.2: Story Beat Content Linking UI

**Purpose:** Add UI for linking story beats to other content.

**Claude Code Prompt:**
```
In ARG Studio, add content linking UI to the Story Beat form/detail view:

Add a "Connections" section (can be a tab or expandable section) with:

1. Characters Involved:
   - Multi-select dropdown of project characters
   - For each selected, show role dropdown (featured, mentioned, background)
   - Display as chips/tags with role indicator
   - Add/remove capability

2. Locations Involved:
   - Multi-select dropdown of project locations
   - Display as chips/tags
   - Add/remove capability

3. Related Puzzles:
   - Multi-select with relationship type
   - For each: show relationship dropdown (requires, unlocks, references)
   - Display as chips with relationship indicator

4. Save connections when saving the beat
5. On beat detail view, show these connections as clickable links to the related content

Use the junction tables created in Chunk 1.1. Create necessary API endpoints if they don't exist:
- GET/POST/DELETE /api/story-beats/:id/characters
- GET/POST/DELETE /api/story-beats/:id/locations  
- GET/POST/DELETE /api/story-beats/:id/puzzles
```

---

## Chunk 3.3: Character Form Enhancement

**Purpose:** Update character form with new fields.

**Claude Code Prompt:**
```
In ARG Studio, enhance the Character form with new fields:

Reorganize into tabbed sections:

Tab 1 - Basic Info:
- Name (existing)
- Type dropdown (expanded enum: protagonist, antagonist, npc, puppet_master, autonomous_ai, organization, historical, player_created)
- Aliases (tag input for multiple names)
- Description (existing)
- Backstory (existing)
- Is Active checkbox

Tab 2 - Voice & Personality:
- Personality (existing)
- Voice Guide (large text area with placeholder: "Vocabulary, speech patterns, topics they discuss/avoid...")
- Sample Responses (repeatable section - add up to 5 example messages)

Tab 3 - Operations:
- Communication Channels (repeatable: platform dropdown + handle input)
- Operator(s) (multi-select of team members)
- Availability Schedule (simple text or structured: timezone + hours)
- Knowledge Boundaries (text area: what does this character know/not know)

Keep the form manageable - use collapsible sections or tabs. Maintain existing styling.
```

---

## Chunk 3.4: Character Relationship Editor

**Purpose:** Add visual relationship mapping between characters.

**Claude Code Prompt:**
```
In ARG Studio, create a Character Relationship Editor component and integrate it into the Characters section:

Requirements:
1. Add a "Relationships" tab or view to the Characters page

2. Create a simple visual graph showing:
   - Characters as nodes (show avatar/initial and name)
   - Relationships as labeled lines between them
   - Different line colors for different relationship types
   - Use a simple force-directed layout or manual positioning

3. Add Relationship modal:
   - Character A (pre-filled if opened from a character)
   - Character B (dropdown)
   - Relationship Type dropdown
   - Custom Label (e.g., "brother of")
   - Is Bidirectional checkbox
   - Is Known to Players checkbox
   - Description (internal notes)
   - Save/Delete buttons

4. Click a relationship line to edit it

5. On individual Character detail page, show a "Relationships" section listing:
   - Related characters with relationship type
   - Clickable to view other character

Use the character_relationships table from Chunk 1.2.
```

---

## Chunk 3.5: Puzzle Form Enhancement

**Purpose:** Update puzzle form with new fields.

**Claude Code Prompt:**
```
In ARG Studio, enhance the Puzzle form with new fields:

Reorganize into sections:

Section 1 - Basic Info:
- Title (existing)
- Puzzle Code (auto-generate suggestion like "PZ-001", editable)
- Type dropdown (expanded enum with all new types)
- Difficulty 1-5 (existing)
- Description (existing)
- Estimated Solve Time (minutes)
- Is Collaborative checkbox

Section 2 - Content:
- Setup / How It's Presented (existing)
- Solution (existing)
- Alternative Solutions (repeatable: solution + notes)
- Red Herrings (repeatable: herring + why it's wrong)

Section 3 - Requirements:
- Required Materials (tag input: internet, printer, smartphone, etc.)
- Accessibility Alternative (text area)

Section 4 - Hints:
- Replace single hints field with repeatable hint entries:
  - Hint text
  - Release trigger (manual, time_based, request_count, automatic)
  - Trigger config (time input or count input based on type)
- Add/remove hints, reorder with drag

Section 5 - Testing:
- Testing Notes (text area)
- Status (existing)

Save hints to the puzzle_hints table from Chunk 1.5.
```

---

## Chunk 3.6: Puzzle Dependency Editor

**Purpose:** Add UI for puzzle prerequisites and unlocks.

**Claude Code Prompt:**
```
In ARG Studio, add dependency management UI to puzzles:

Add a "Dependencies" section to the Puzzle form/detail view:

1. Prerequisites:
   - "This puzzle requires solving first:" label
   - Multi-select of other puzzles in the project
   - Display as ordered list (solve order matters)
   - Validate no circular dependencies

2. Unlocks:
   - "Solving this puzzle unlocks:" label
   - Repeatable entry with:
     - Content type dropdown (story_beat, character, location, puzzle, event)
     - Content selector (dynamic based on type)
   - Display as list with content type icons

3. Visual mini-graph showing this puzzle's position:
   - Show immediate prerequisites and what this puzzle unlocks
   - Clickable to navigate to related puzzles

4. On the main Puzzles list page, add optional "Dependency View":
   - Toggle from list view to graph view
   - Show all puzzles as nodes with prerequisite edges
   - Highlight critical path

Use junction tables from Chunk 1.1.
```

---

## Chunk 3.7: Event Form Enhancement

**Purpose:** Update event form with new fields.

**Claude Code Prompt:**
```
In ARG Studio, enhance the Event form with new fields:

Reorganize into sections:

Section 1 - Basic Info:
- Title (existing)
- Type dropdown (expanded enum)
- Start Time (existing)
- End Time (new datetime picker)
- Status dropdown (planning, confirmed, in_progress, completed, cancelled)
- Visibility dropdown (public, secret, invite_only)

Section 2 - Location:
- Location dropdown (select from project locations, or "Virtual Only")
- Virtual Location URL (for online events)

Section 3 - Attendance:
- RSVP Required checkbox
- Min Attendees (number)
- Max Attendees (number)

Section 4 - Team & Resources:
- Assigned Team Members (multi-select)
- Equipment Needed (tag input)
- Budget (currency input)

Section 5 - Planning:
- Runsheet (large text area with placeholder for minute-by-minute plan)
- Contingency Plans (repeatable: scenario + response)
- Post-Event Tasks (tag/list input)

Section 6 - Recording:
- Recording URL (after event)

Also add connection selectors:
- Characters Involved (multi-select)
- Related Puzzles (multi-select)

Use junction tables from Chunk 1.1.
```

---

## Chunk 3.8: Event Calendar View

**Purpose:** Add calendar visualization for events.

**Claude Code Prompt:**
```
In ARG Studio, add a Calendar view to the Events page:

Requirements:
1. Add view toggle: "List" (existing) | "Calendar"

2. Calendar view using a library like react-big-calendar or @fullcalendar/react:
   - Month view (default)
   - Week view
   - Day view
   - Events displayed on their dates
   - Color-coded by event type or status
   - Click event to open detail/edit modal

3. Calendar features:
   - Navigate between months
   - Today button
   - Click empty date to create event on that date
   - Drag events to reschedule (updates start_time)

4. Mini-calendar in sidebar or header showing current month with event indicators

5. Filter controls:
   - Filter by event type
   - Filter by status
   - Filter by assigned team member

Ensure timezone handling is correct (use project timezone if set, otherwise user's local).
```

---

## Chunk 3.9: Location Form Enhancement

**Purpose:** Update location form with GPS and operational fields.

**Claude Code Prompt:**
```
In ARG Studio, enhance the Location form with new fields:

Reorganize into sections:

Section 1 - Basic Info:
- Name (existing)
- Type dropdown (expanded enum)
- Is Fictional checkbox (if checked, hide physical fields)

Section 2 - Physical Location (hide if fictional):
- Address (existing, renamed from "Address or URL")
- GPS Coordinates:
  - Latitude input
  - Longitude input
  - "Pick on Map" button (opens map picker - use Leaflet or similar)
  - "Get from Address" button (geocoding)
- Plus Code (auto-generate from coordinates, or manual entry)

Section 3 - Virtual Location:
- URL (for virtual/hybrid locations)

Section 4 - Access & Operations:
- Access Instructions (text area)
- Hours of Operation (structured input or text)
- Contact Info (text)
- Accessibility Notes (text area)
- Safety Notes (text area)
- Weather Sensitive checkbox

Section 5 - Permissions:
- Permission Status dropdown (not_needed, obtained, pending, denied)
- Permission Documentation (text area for notes)

Section 6 - Planning:
- Scouting Notes (text area)
- Backup Location (dropdown of other locations)

Section 7 - Description (existing)
```

---

## Chunk 3.10: Location Map View

**Purpose:** Add map visualization for physical locations.

**Claude Code Prompt:**
```
In ARG Studio, add a Map view to the Locations page:

Requirements:
1. Add view toggle: "List" (existing) | "Map"

2. Map view using Leaflet with OpenStreetMap:
   - Show all physical locations as markers
   - Different marker icons/colors for different location types
   - Click marker to show popup with:
     - Location name
     - Type
     - Brief description
     - "View Details" link
   - Cluster markers when zoomed out

3. Map controls:
   - Zoom in/out
   - Fit all locations
   - Toggle layers (if multiple physical location types)

4. Location list sidebar alongside map:
   - Scrollable list of locations
   - Click to pan map to that location
   - Search/filter

5. On individual Location detail page (for physical locations):
   - Show small map with single marker
   - "Open in Google Maps" / "Open in Apple Maps" links
   - "Generate QR Code" button for the coordinates

6. Batch actions:
   - Calculate distances between selected locations
   - Suggested route order
```

---

## Chunk 3.11: Digital Properties Form Enhancement

**Purpose:** Update digital properties form with new fields.

**Claude Code Prompt:**
```
In ARG Studio, enhance the Digital Properties form with new fields:

Reorganize into sections:

Section 1 - Basic Info:
- Property Name (existing)
- Type dropdown (expanded enum)
- Platform (existing, dynamic based on type)
- Username/Handle (existing)
- URL (existing)
- Status dropdown (planning, created, active, dormant, archived)

Section 2 - In-World Details:
- Character Owner (dropdown of characters - who "owns" this in the narrative)
- Creation Date (date picker - when the account was made, for aging)
- Backstory (text area - in-world history)

Section 3 - Operations:
- Managed By (multi-select team members)
- Content Guidelines (text area)
- Posting Frequency (text input, e.g., "2-3 times per week")
- Credentials Reference (text - NOT the password, just reference like "see 1Password vault")

Section 4 - Metrics (for active properties):
- Current Follower Count (number)
- Follower Goal (number)
- Verified checkbox
- Last Post Date (auto-updated or manual)

Section 5 - Linked Properties:
- Multi-select other digital properties for cross-promotion tracking
- Display (existing)
```

---

## Chunk 3.12: Asset Management Enhancement

**Purpose:** Improve asset upload and management UI.

**Claude Code Prompt:**
```
In ARG Studio, enhance the Assets management UI:

1. Improve upload flow:
   - Drag-and-drop zone (larger, more prominent)
   - Multi-file upload support
   - During upload, show:
     - Progress bar
     - Thumbnail preview (for images)
   - After upload, show edit modal for each:
     - Auto-detected: type, mime type, file size, dimensions
     - User enters: description, tags
     - User selects: status, is_diegetic
     - Save individually or "Save All"

2. Improved asset listing:
   - Grid view (default for images) with thumbnails
   - List view (for documents/other)
   - Toggle between views
   - Sort by: name, date, type, status
   - Filter by: type, tags, status, is_diegetic

3. Asset detail view:
   - Large preview (image viewer, audio player, video player as appropriate)
   - Edit all metadata fields from Chunk 1.10
   - Version history (list of previous versions if any)
   - "Upload New Version" button
   - Usage tracking: "Used in" section showing linked content (implement in later chunk)
   - Download button
   - Delete with confirmation

4. Bulk operations:
   - Select multiple assets
   - Bulk add tags
   - Bulk change status
   - Bulk delete

5. Search:
   - Search by filename
   - Search by tags
   - Search by description
```

---

# PHASE 4: PLAYER MANAGEMENT SYSTEM
*Chunks 4.1 - 4.6 | New module for tracking players*

---

## Chunk 4.1: Player Schema

**Purpose:** Create database schema for player tracking.

**Claude Code Prompt:**
```
In ARG Studio, create the player management schema:

Table: players
- id (primary key)
- project_id (foreign key)
- external_id: varchar(255) (nullable, their ID from registration system if any)
- display_name: varchar(255)
- email: varchar(255) (nullable, with consent)
- contact_method: varchar(255) (nullable, preferred contact)
- registration_date: timestamp (default now)
- acquisition_source: varchar(255) (nullable, how they found the ARG)
- status: enum ['active', 'casual', 'lurker', 'dropped', 'completed', 'banned'] (default 'active')
- consent_given: boolean (default false)
- consent_details: jsonb (what they consented to)
- team_id: uuid (nullable, for collaborative ARGs)
- notes: text (team observations)
- tags: text[] (for segmentation)
- created_at, updated_at

Table: player_teams
- id (primary key)
- project_id (foreign key)
- name: varchar(255)
- created_at

Table: player_progress
- id (primary key)
- player_id (foreign key to players)
- content_type: varchar(50) (e.g., 'puzzle', 'node', 'story_beat', 'event')
- content_id: uuid
- status: enum ['discovered', 'in_progress', 'completed', 'skipped']
- started_at: timestamp (nullable)
- completed_at: timestamp (nullable)
- attempts: integer (default 0, for puzzles)
- hints_used: integer (default 0)
- notes: text (nullable)
- created_at, updated_at

Add unique constraint on (player_id, content_type, content_id) for player_progress.

Create migrations and TypeScript types.
```

---

## Chunk 4.2: Player Communication Log Schema

**Purpose:** Create schema for tracking player interactions.

**Claude Code Prompt:**
```
In ARG Studio, create schema for player communication logging:

Table: player_communications
- id (primary key)
- project_id (foreign key)
- player_id (foreign key to players)
- character_id (foreign key to characters, nullable - null if out-of-character)
- direction: enum ['inbound', 'outbound']
- channel: varchar(100) (e.g., 'email', 'twitter_dm', 'discord', 'in_person')
- platform_message_id: varchar(255) (nullable, for linking to external systems)
- subject: varchar(255) (nullable)
- content: text
- attachments: jsonb (nullable, array of {filename, url})
- sentiment: enum ['positive', 'neutral', 'negative', 'unknown'] (nullable)
- handled_by_user_id: uuid (nullable, team member who responded)
- response_time_minutes: integer (nullable, calculated for inbound messages)
- is_flagged: boolean (default false, for important/concerning messages)
- flag_reason: text (nullable)
- tags: text[]
- sent_at: timestamp (when the message was sent/received)
- created_at

Create indexes on: player_id, character_id, sent_at, is_flagged

Create migration and TypeScript types.
```

---

## Chunk 4.3: Player Management API

**Purpose:** Create API endpoints for player management.

**Claude Code Prompt:**
```
In ARG Studio, create API endpoints for player management:

Endpoints:

GET /api/projects/:projectId/players
- List all players with pagination
- Support filters: status, team_id, tags, search (name/email)
- Support sort: name, registration_date, status, last_activity
- Include summary stats in response header or meta

POST /api/projects/:projectId/players
- Create new player
- Validate email uniqueness within project if provided

GET /api/projects/:projectId/players/:playerId
- Get player details
- Include: basic info, team, progress summary, recent communications

PATCH /api/projects/:projectId/players/:playerId
- Update player info
- Support status change, notes update, tag management

DELETE /api/projects/:projectId/players/:playerId
- Soft delete or anonymize (GDPR compliance consideration)

GET /api/projects/:projectId/players/:playerId/progress
- Get detailed progress (all nodes, puzzles, etc.)
- Group by content type

POST /api/projects/:projectId/players/:playerId/progress
- Log progress (discovered, completed, etc.)

GET /api/projects/:projectId/players/:playerId/communications
- Get communication history with pagination
- Filter by channel, direction, date range

POST /api/projects/:projectId/players/:playerId/communications
- Log a communication (useful for manual entry)

GET /api/projects/:projectId/player-stats
- Aggregate stats: total players, by status, completion rates, etc.

Follow existing API patterns. Add proper authorization checks.
```

---

## Chunk 4.4: Player List Page

**Purpose:** Create the player management list view.

**Claude Code Prompt:**
```
In ARG Studio, create a new Players page/section within projects:

1. Add "Players" to the project sidebar navigation (after Tasks or near Events)

2. Players List Page:
   - Header with:
     - "Players" title
     - Player count
     - "+ Add Player" button
     - Export button (CSV)
   
   - Filter bar:
     - Status dropdown (All, Active, Casual, Lurker, Dropped, Completed, Banned)
     - Team dropdown
     - Search input (name/email)
     - Tags filter
   
   - Stats summary cards:
     - Total Players
     - Active Players
     - Completion Rate
     - Avg Progress %
   
   - Player table with columns:
     - Name (with avatar placeholder)
     - Status (color-coded badge)
     - Team
     - Progress (progress bar showing % completion)
     - Registration Date
     - Last Activity
     - Actions (view, edit)
   
   - Pagination

3. Add Player modal:
   - Display Name (required)
   - Email (optional)
   - Contact Method (optional)
   - Acquisition Source (optional)
   - Team (dropdown)
   - Consent checkbox
   - Notes
   - Tags

Follow existing page and component patterns.
```

---

## Chunk 4.5: Player Detail Page

**Purpose:** Create individual player detail view.

**Claude Code Prompt:**
```
In ARG Studio, create a Player Detail page:

URL: /projects/:projectId/players/:playerId

Layout with tabs or sections:

Section 1 - Overview (always visible):
- Player name, status badge
- Quick stats: Progress %, Puzzles Solved, Events Attended
- Edit button
- Status change dropdown (quick action)

Tab 1 - Profile:
- All player info (editable inline or via modal)
- Registration date
- Team assignment
- Tags (editable)
- Notes (editable text area with save)

Tab 2 - Journey:
- Visual progress through trail map (read-only map view with player position highlighted)
- Or: List of all content items with status
  - Group by: Trail nodes, Puzzles, Events, Story beats
  - Show: item name, status (discovered/in_progress/completed), timestamp
  - For puzzles: attempts, hints used
- Timeline view of key milestones

Tab 3 - Communications:
- List of all communications (inbound and outbound)
- Filter by channel, date
- Each entry shows:
  - Date/time
  - Direction (arrow icon)
  - Channel
  - Character (if in-character)
  - Preview of content
  - Click to expand full message
- "+ Log Communication" button for manual entry
- Quick reply button (links to Communications Hub - future chunk)

Tab 4 - Activity Log:
- Chronological list of all player activity
- Generated from player_progress and player_communications
- Filterable by type

Delete/Archive player button with confirmation.
```

---

## Chunk 4.6: Player Import/Export

**Purpose:** Add bulk player management capabilities.

**Claude Code Prompt:**
```
In ARG Studio, add player import and export functionality:

1. Export:
   - On Players list page, "Export" button
   - Options modal:
     - Format: CSV or JSON
     - Include: checkboxes for which fields
     - Filter: export all or only filtered/selected
   - Generate and download file
   - Respect privacy: option to exclude emails if consent not given

2. Import:
   - On Players list page, "Import" button
   - Upload CSV/JSON file
   - Field mapping screen:
     - Show detected columns
     - Map to player fields
     - Preview first 5 rows
   - Import options:
     - Create new players only
     - Update existing (match by email or external_id)
     - Skip duplicates
   - Validation:
     - Show errors/warnings before import
     - Required fields check
   - Run import:
     - Progress indicator
     - Summary: X created, Y updated, Z errors
   - Download error report for failed rows

3. Bulk actions on player list:
   - Select multiple players
   - Bulk update status
   - Bulk add tags
   - Bulk assign to team
   - Bulk delete (with confirmation)

Add API endpoints:
POST /api/projects/:projectId/players/import
GET /api/projects/:projectId/players/export
POST /api/projects/:projectId/players/bulk-update
```

---

# PHASE 5: COMMUNICATIONS HUB
*Chunks 5.1 - 5.6 | Unified messaging system*

---

## Chunk 5.1: Communication Templates Schema

**Purpose:** Create schema for reusable message templates.

**Claude Code Prompt:**
```
In ARG Studio, create schema for communication templates:

Table: communication_templates
- id (primary key)
- project_id (foreign key)
- character_id (foreign key to characters, nullable - null for OOC templates)
- name: varchar(255) (e.g., "Welcome Message", "Hint Response")
- channel: varchar(100) (nullable - specific to channel or any)
- subject_template: varchar(255) (nullable, for email)
- body_template: text (the message content with placeholders)
- placeholders: jsonb (array of {key: string, description: string, example: string})
  - e.g., [{key: "{{player_name}}", description: "Player's display name", example: "Alex"}]
- category: varchar(100) (nullable, for organization)
- usage_count: integer (default 0)
- last_used_at: timestamp (nullable)
- created_by_user_id: uuid
- created_at, updated_at

Table: auto_responses
- id (primary key)
- project_id (foreign key)
- character_id (foreign key to characters, nullable)
- trigger_type: enum ['keyword', 'out_of_hours', 'first_contact', 'custom']
- trigger_config: jsonb (e.g., {keywords: ["hello", "hi"]} or {hours: {start: "09:00", end: "17:00"}})
- template_id: uuid (foreign key to communication_templates, nullable)
- response_text: text (nullable, if not using template)
- is_active: boolean (default true)
- channels: text[] (which channels this applies to, empty = all)
- priority: integer (default 0, higher = checked first)
- created_at, updated_at

Create migrations and TypeScript types.
```

---

## Chunk 5.2: Communications Hub API

**Purpose:** Create API endpoints for communications management.

**Claude Code Prompt:**
```
In ARG Studio, create API endpoints for the Communications Hub:

Message Management:
GET /api/projects/:projectId/communications
- List all communications across all players
- Filters: channel, character_id, direction, date_range, is_flagged, handled_by
- Pagination
- Include player name in response

GET /api/projects/:projectId/communications/inbox
- Inbound messages only
- Filter: unread/all, channel, character
- Sort by newest first

POST /api/projects/:projectId/communications
- Log a communication (create new entry)
- Used for manual logging or when sending

PATCH /api/projects/:projectId/communications/:commId
- Update: sentiment, is_flagged, flag_reason, handled_by_user_id

Templates:
GET /api/projects/:projectId/communication-templates
- List templates, filter by character_id, channel, category

POST /api/projects/:projectId/communication-templates
- Create template

PATCH /api/projects/:projectId/communication-templates/:templateId
- Update template

DELETE /api/projects/:projectId/communication-templates/:templateId
- Delete template

POST /api/projects/:projectId/communication-templates/:templateId/render
- Render template with provided variables
- Return rendered subject and body

Auto-Responses:
GET /api/projects/:projectId/auto-responses
POST /api/projects/:projectId/auto-responses
PATCH /api/projects/:projectId/auto-responses/:id
DELETE /api/projects/:projectId/auto-responses/:id

Stats:
GET /api/projects/:projectId/communications/stats
- Total messages, by channel, avg response time, messages this week
```

---

## Chunk 5.3: Communications Hub Page - Inbox

**Purpose:** Create the unified inbox view.

**Claude Code Prompt:**
```
In ARG Studio, create a Communications Hub page with inbox view:

1. Add "Communications" to project sidebar navigation

2. Communications Hub layout:
   - Left sidebar (narrow):
     - Inbox (count)
     - Sent
     - Flagged (count)
     - By Character (expandable list)
     - By Channel (expandable list)
   
   - Middle panel (message list):
     - Filter bar: channel dropdown, date range
     - Search input
     - Message list:
       - Each row shows: player avatar, player name, character (if any), channel icon, preview, time
       - Unread indicator (bold or dot)
       - Flagged indicator
       - Click to select and show in right panel
   
   - Right panel (message detail):
     - Full message content
     - Metadata: player, character, channel, time, handled by
     - Player quick info card (click to go to player)
     - Actions:
       - Flag/unflag
       - Mark as handled
       - View conversation thread
       - Quick reply button (see next chunk)
       - Add note

3. Empty state messaging when no communications

4. Stats bar at top:
   - Unread count
   - Avg response time
   - Messages today

Use the communications API from Chunk 5.2.
```

---

## Chunk 5.4: Communications Hub - Compose & Reply

**Purpose:** Add message composition and reply functionality.

**Claude Code Prompt:**
```
In ARG Studio, add compose and reply functionality to Communications Hub:

1. "Compose" button in Communications Hub:
   - Opens compose modal/panel

2. Compose interface:
   - To: Player selector (search by name)
   - As: Character dropdown (or "Out of Character")
   - Via: Channel dropdown (filtered to channels that character uses)
   - Subject: text input (for email)
   - Message: rich text editor
   
   - Voice Guide sidebar:
     - When character selected, show their voice guide
     - Sample responses for reference
   
   - Template button:
     - Opens template selector
     - Filter by character/channel
     - Select template
     - Shows preview with placeholders highlighted
     - Fill in placeholder values
     - "Use Template" populates message
   
   - Schedule toggle:
     - If on, show datetime picker
     - Message saved as scheduled
   
   - Send button (or Schedule button)
   - Logs to player_communications

3. Reply from message detail:
   - "Reply" button pre-fills:
     - To: same player
     - As: same character (or default if inbound)
     - Via: same channel
   - Shows original message for reference

4. Conversation thread view:
   - When viewing a message, show full thread
   - All messages with this player on this channel
   - Chronological order
   - Clearly mark inbound vs outbound

Note: This chunk does NOT implement actual sending via external platforms (that's integrations). This logs intended messages.
```

---

## Chunk 5.5: Communication Templates Manager

**Purpose:** Create UI for managing message templates.

**Claude Code Prompt:**
```
In ARG Studio, create a Templates section within Communications Hub:

1. Add "Templates" tab/section in Communications Hub sidebar

2. Templates list page:
   - Filter by: character, channel, category
   - Search by name
   - Templates grid/list showing:
     - Name
     - Character (or "Any")
     - Channel (or "Any")
     - Category
     - Usage count
     - Last used
     - Actions: edit, duplicate, delete

3. Create/Edit Template modal:
   - Name (required)
   - Character (dropdown, optional)
   - Channel (dropdown, optional)
   - Category (dropdown or text input)
   - Subject Template (for email, supports placeholders)
   - Body Template (rich text, supports placeholders)
   
   - Placeholder helper:
     - "+ Add Placeholder" button
     - Inserts placeholder at cursor: {{placeholder_name}}
     - List of common placeholders:
       - {{player_name}}
       - {{player_email}}
       - {{current_date}}
       - {{character_name}}
     - Custom placeholder input
   
   - Preview panel:
     - Shows rendered template
     - Input fields for placeholder values to test

4. Duplicate template action:
   - Opens create modal pre-filled with template content
   - Appends " (Copy)" to name

5. Template categories management:
   - Extract unique categories from existing templates
   - Or: separate small UI to manage category list
```

---

## Chunk 5.6: Auto-Response Configuration

**Purpose:** Create UI for configuring automated responses.

**Claude Code Prompt:**
```
In ARG Studio, create Auto-Response configuration UI:

1. Add "Auto-Responses" tab in Communications Hub

2. Auto-responses list:
   - Active/Inactive toggle per item
   - Shows: name/type, character, channels, trigger summary, priority
   - Drag to reorder priority (or up/down buttons)
   - Edit/delete actions

3. Create/Edit Auto-Response:
   - Trigger Type dropdown:
     - keyword: show keyword list input
     - out_of_hours: show hours configuration
     - first_contact: no additional config
     - custom: show custom condition description
   
   - Trigger Configuration (dynamic based on type):
     - Keywords: tag input for keywords, match type (exact/contains)
     - Out of Hours: timezone, start hour, end hour, days
     - First Contact: no config needed
   
   - Response:
     - Option 1: Select existing template
     - Option 2: Write custom response
   
   - Character (required for in-character responses)
   - Channels (multi-select, empty = all)
   - Is Active checkbox
   - Priority (number input)

4. Preview/Test:
   - "Test" button
   - Input: sample incoming message
   - Output: which auto-response would trigger, preview of response

5. Note in UI: "Auto-responses are templates for your reference. Actual automatic sending requires platform integrations (coming soon)."
```

---

# PHASE 6: PUPPET MASTER COMMAND CENTER
*Chunks 6.1 - 6.8 | Live operation control panel*

---

## Chunk 6.1: Command Center Dashboard Schema

**Purpose:** Create schema for live ARG state tracking.

**Claude Code Prompt:**
```
In ARG Studio, create schema for live ARG state management:

Table: project_live_state
- id (primary key)
- project_id (unique, foreign key)
- is_live: boolean (default false)
- went_live_at: timestamp (nullable)
- paused_at: timestamp (nullable)
- is_paused: boolean (default false)
- current_phase: varchar(100) (nullable, e.g., "Act 1", "Finale")
- active_player_count: integer (default 0, updated periodically)
- last_activity_at: timestamp (nullable)
- updated_at

Table: live_alerts
- id (primary key)
- project_id (foreign key)
- alert_type: enum ['stuck_player', 'unread_message', 'approaching_event', 'puzzle_anomaly', 'custom']
- severity: enum ['info', 'warning', 'urgent']
- title: varchar(255)
- description: text
- related_type: varchar(50) (nullable, e.g., 'player', 'event', 'puzzle')
- related_id: uuid (nullable)
- is_dismissed: boolean (default false)
- dismissed_by_user_id: uuid (nullable)
- dismissed_at: timestamp (nullable)
- created_at

Table: shift_handoff_notes
- id (primary key)
- project_id (foreign key)
- created_by_user_id (foreign key)
- shift_ended_at: timestamp
- notes: text
- active_conversations: jsonb (array of {player_id, summary})
- upcoming_items: jsonb (array of {type, id, description, time})
- issues_to_watch: text
- created_at

Create migrations and TypeScript types.
```

---

## Chunk 6.2: Command Center API

**Purpose:** Create API endpoints for live operation.

**Claude Code Prompt:**
```
In ARG Studio, create API endpoints for the Command Center:

Live State:
GET /api/projects/:projectId/live-state
- Return current live state

PATCH /api/projects/:projectId/live-state
- Update live state (go live, pause, unpause, update phase)
- Validate state transitions (can't unpause if not paused)

POST /api/projects/:projectId/live-state/go-live
- Set is_live=true, went_live_at=now

POST /api/projects/:projectId/live-state/pause
- Set is_paused=true, paused_at=now

POST /api/projects/:projectId/live-state/resume
- Set is_paused=false

Alerts:
GET /api/projects/:projectId/alerts
- List alerts, filter by: severity, type, is_dismissed
- Default: is_dismissed=false, sort by severity then created_at

POST /api/projects/:projectId/alerts
- Create manual alert

PATCH /api/projects/:projectId/alerts/:alertId
- Dismiss alert

POST /api/projects/:projectId/alerts/generate
- Trigger alert generation (checks for stuck players, unread messages, etc.)
- Called periodically or manually

Shift Handoff:
GET /api/projects/:projectId/shift-notes
- List recent handoff notes

POST /api/projects/:projectId/shift-notes
- Create handoff note for shift end

Quick Stats:
GET /api/projects/:projectId/command-center/stats
- Active players (last 24h)
- Pending messages (unread inbound)
- Events today
- Puzzles with low solve rate
- Players stuck (no progress in X days)
```

---

## Chunk 6.3: Command Center Page - Main Dashboard

**Purpose:** Create the main Command Center dashboard.

**Claude Code Prompt:**
```
In ARG Studio, create the Command Center page:

1. Add "Command Center" to project sidebar (prominent position, maybe with icon)
   - Only show if project is_live or has live_state record
   - Or always show with "Go Live" prompt

2. Command Center layout:

   Top Bar:
   - ARG Status: LIVE (green) / PAUSED (yellow) / OFFLINE (gray)
   - Go Live / Pause / Resume buttons based on state
   - Current phase display (editable inline)
   - "Emergency Pause" red button (if live)
   - Clock showing current time

   Main Grid:

   Card 1 - Active Now:
   - Active players count (last 1h)
   - Trend indicator (up/down from yesterday)
   - Link to player list filtered to active

   Card 2 - Pending Actions:
   - Unread messages count (clickable to Communications Hub inbox)
   - Pending puzzles/hints to release
   - Manual triggers waiting

   Card 3 - Upcoming Events:
   - Next 3 events with countdown
   - Click to view event details

   Card 4 - Alerts:
   - List of active alerts (urgent first)
   - Click to see details
   - Dismiss button per alert
   - "View All" link

   Bottom Section:

   Quick Actions Panel:
   - "Send Broadcast" button
   - "Release Hint" dropdown (select puzzle, then hint)
   - "Trigger Event" dropdown
   - "Unlock Node" dropdown

   Activity Feed:
   - Real-time-ish feed of recent activity
   - Player completions, new messages, events triggered
   - Auto-refresh every 30 seconds or manual refresh
```

---

## Chunk 6.4: Command Center - Character Quick-Switch

**Purpose:** Add rapid character switching for puppet masters.

**Claude Code Prompt:**
```
In ARG Studio, add Character Quick-Switch panel to Command Center:

1. Add "Characters" panel/tab in Command Center:

   Character selector:
   - List of active characters (is_active=true with operator assignments)
   - Current "active" character highlighted
   - Click to switch
   - Shows for each:
     - Avatar/initial
     - Name
     - Unread messages for this character
     - Last activity timestamp

2. When character is selected, show:
   
   Voice Guide Quick Reference:
   - Character name and type
   - Collapsible voice guide text
   - Sample responses (expandable)
   - "Do" and "Don't" bullet points from voice guide

   Recent Activity:
   - Last 5 messages sent as this character
   - Last 5 messages received for this character

   Quick Compose:
   - Compact compose form
   - Pre-selected character
   - Player search
   - Channel dropdown
   - Message field
   - "Send" button

3. Character status indicators:
   - Online indicator (if current user is "operating" them)
   - Last response time
   - Pending messages needing response

4. Global character switcher:
   - Small floating widget showing current active character
   - Dropdown to switch
   - Persists across Command Center views
```

---

## Chunk 6.5: Command Center - Player Tracker

**Purpose:** Add live player status tracking view.

**Claude Code Prompt:**
```
In ARG Studio, add Player Tracker view to Command Center:

1. Add "Player Tracker" tab in Command Center

2. Player Tracker layout:

   Map View (primary):
   - Trail map visualization (simplified from Phase 2)
   - Player position markers:
     - Dots/markers where players currently are
     - Color-coded by activity (active=green, idle=yellow, stuck=red)
     - Cluster if many players at same node
   - Click node to see list of players there
   - Hover for quick count

   Filter bar:
   - Status filter (all, active, idle, stuck)
   - Team filter
   - Search player

   Side panel (when node or player selected):
   - If node: list of players, their status, last activity
   - If player: summary card with:
     - Name, status
     - Current node
     - Time at current node
     - Recent activity
     - Quick actions: message, view full profile

3. Stuck Player Detection:
   - Highlight players with no progress in X hours/days (configurable)
   - "Stuck Players" quick filter
   - Bulk action: send hint or message to all stuck players

4. Activity heatmap toggle:
   - Colors nodes by activity level
   - Shows where players are congregating

5. Real-time updates:
   - Poll or websocket for position updates
   - Visual indicator when player moves
```

---

## Chunk 6.6: Command Center - Event Triggers

**Purpose:** Add manual trigger controls for content.

**Claude Code Prompt:**
```
In ARG Studio, add Event Triggers panel to Command Center:

1. Add "Triggers" tab in Command Center

2. Pending Triggers section:
   - List of items ready to be triggered:
     - Trail nodes set to manual unlock
     - Puzzle hints set to manual release
     - Story beats set to manual trigger
     - Events set to manual start
   - Shows: type icon, name, description, ready since
   - "Trigger Now" button per item
   - Bulk trigger selected items

3. Scheduled Items section:
   - Items with future time-based triggers
   - Shows: type, name, scheduled time, countdown
   - Actions: trigger early, reschedule, cancel

4. Quick Triggers section:
   - "Unlock Node" dropdown:
     - Select from locked nodes
     - Confirm unlock
     - Logs who unlocked and when
   
   - "Release Hint" dropdown:
     - Select puzzle
     - Select which hint level
     - Confirm release
     - Option to target specific player(s) or all
   
   - "Start Event" dropdown:
     - Select from upcoming events
     - Confirm start
     - Updates event status to in_progress

5. Trigger History:
   - Log of recent manual triggers
   - Shows: what, who triggered, when
   - Filter by type, user, date

6. Confirmation dialogs for all triggers:
   - "Are you sure you want to unlock [Node Name]? This will be visible to X players."
```

---

## Chunk 6.7: Command Center - Broadcast System

**Purpose:** Add broadcast messaging to all or segments of players.

**Claude Code Prompt:**
```
In ARG Studio, add Broadcast System to Command Center:

1. Add "Broadcast" button prominently in Command Center (opens modal)

2. Broadcast Modal:

   Type selection:
   - In-Character (select character)
   - Out-of-Character / System Message

   Audience selection:
   - All Players
   - By Status (checkboxes: active, casual, lurker)
   - By Team (multi-select teams)
   - By Progress (players who have/haven't reached a node)
   - Custom (player multi-select)
   
   Show count: "This will reach X players"

   Channel selection:
   - All channels
   - Specific channel(s) - based on character's channels if in-character

   Message composition:
   - Subject (for email channel)
   - Message body
   - Use template button
   
   Scheduling:
   - Send immediately
   - Schedule for later (datetime picker)

   Preview:
   - Sample of how message will look
   - List of first 10 recipients

   Confirm & Send button

3. Broadcast History:
   - List of past broadcasts
   - Shows: date, audience, character, preview
   - Delivery stats: sent, delivered, opened (if trackable)

4. Safety features:
   - Require confirmation for broadcasts to all players
   - Rate limiting (can't send more than X broadcasts per hour)
   - Undo option for scheduled broadcasts

5. API endpoint:
   POST /api/projects/:projectId/broadcasts
   GET /api/projects/:projectId/broadcasts (history)
   DELETE /api/projects/:projectId/broadcasts/:id (cancel scheduled)
```

---

## Chunk 6.8: Command Center - Shift Handoff

**Purpose:** Add shift handoff functionality for PM teams.

**Claude Code Prompt:**
```
In ARG Studio, add Shift Handoff feature to Command Center:

1. Add "End Shift" button in Command Center header

2. End Shift modal:
   
   Auto-populated sections:
   - Current active conversations:
     - Pull from recent communications
     - Player name, last message time, brief context
     - Checkbox to include in handoff
   
   - Pending items:
     - Upcoming events in next 24h
     - Unresolved alerts
     - Pending triggers
   
   Manual entry sections:
   - Shift notes (rich text):
     - What happened this shift
     - Issues encountered
     - Decisions made
   
   - Issues to watch (text list):
     - Specific players to monitor
     - Ongoing situations
   
   - Recommendations for next shift

   Save & End Shift button:
   - Creates shift_handoff_notes record
   - Timestamps the handoff

3. View Handoff Notes:
   - Section/tab in Command Center: "Shift Notes"
   - List of recent handoff notes
   - Click to expand full note
   - Filter by date, author

4. Shift Start:
   - When opening Command Center after a handoff:
     - Show latest handoff note prominently
     - "Acknowledge" button to dismiss
   - Badge on Command Center nav if unread handoff note

5. Optional: Shift scheduling
   - (Future) Calendar showing who is on PM duty when
   - For now, just manual notes
```

---

# PHASE 7: INTEGRATIONS FRAMEWORK
*Chunks 7.0 - 7.6 | External platform connections*

---

## Chunk 7.0: Integration Testing Prerequisites (Manual Setup)

**Purpose:** Set up external accounts and tools needed to test integrations.

**This is NOT a Claude Code prompt—these are manual steps you must complete before testing integration code.**

### Required for Testing:

**1. Discord Bot (for Chunk 7.4)**
- Go to https://discord.com/developers/applications
- Click "New Application" and name it (e.g., "ARG Studio Test Bot")
- Go to "Bot" in left sidebar, click "Add Bot"
- Under "Token", click "Copy" (save this securely—you'll need it)
- Enable these Privileged Gateway Intents: MESSAGE CONTENT INTENT
- Go to "OAuth2" > "URL Generator"
  - Select scopes: `bot`
  - Select permissions: `Send Messages`, `Read Message History`, `View Channels`
  - Copy the generated URL, open it, and invite bot to a test Discord server you control
- Save: Bot Token, Server ID (right-click server > Copy ID with Developer Mode on)
- **Time required:** ~10 minutes
- **Cost:** Free

**2. Email SMTP (for Chunk 7.5)**

*Option A - Ethereal.email (Recommended for development):*
- Go to https://ethereal.email/
- Click "Create Ethereal Account"
- Copy the provided credentials (host, port, username, password)
- Emails "sent" will appear in Ethereal's web inbox (nothing actually sends)
- **Time required:** 1 minute
- **Cost:** Free

*Option B - Gmail (for staging/production testing):*
- Use a Gmail account with 2FA enabled
- Go to Google Account > Security > 2-Step Verification > App passwords
- Generate an app password for "Mail"
- SMTP settings: host=smtp.gmail.com, port=587, TLS=true
- **Time required:** 5 minutes
- **Cost:** Free

*Option C - Resend/SendGrid/Mailgun (for production):*
- Create account at https://resend.com (easiest) or similar
- Verify a domain or use their test domain
- Get API key
- **Time required:** 15-30 minutes
- **Cost:** Free tier available

**3. Webhooks (for Chunk 7.6)**

*Outbound webhook testing:*
- Go to https://webhook.site
- Copy your unique URL (shown immediately)
- Use this as the webhook destination for testing
- **Time required:** 0 minutes (instant, no signup)
- **Cost:** Free

*Inbound webhook testing:*
- No setup needed—you'll curl your own local endpoint
- Or use a tool like ngrok to expose localhost for external testing

### Deferred/Optional:

**Twitter/X API (NOT RECOMMENDED currently)**
- Twitter now requires paid API access ($100/month minimum for Basic tier)
- Recommendation: Skip Twitter integration or mark as "Coming Soon" in UI
- If you must test: https://developer.twitter.com/en/portal/dashboard

**Twilio SMS/Voice (Optional)**
- Go to https://www.twilio.com/try-twilio
- Create free trial account (requires phone verification)
- Get Account SID, Auth Token, and a trial phone number
- Trial has limitations: can only send to verified numbers
- **Time required:** 10 minutes
- **Cost:** Free trial with ~$15 credit

**Google Maps API (Optional, for enhanced location features)**
- Go to https://console.cloud.google.com/
- Create a project, enable Maps JavaScript API and Geocoding API
- Create an API key with appropriate restrictions
- **Time required:** 15 minutes
- **Cost:** Free tier includes $200/month credit

---

### Quick Reference Card

Save these credentials somewhere secure (password manager recommended):

```
DISCORD_BOT_TOKEN=
DISCORD_GUILD_ID=
DISCORD_TEST_CHANNEL_ID=

SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

WEBHOOK_TEST_URL=

# Optional
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

GOOGLE_MAPS_API_KEY=
```

Once you have these, proceed to Chunk 7.1.

---

## Chunk 7.1: Integration Schema & Framework

**Purpose:** Create foundation for external integrations.

**Claude Code Prompt:**
```
In ARG Studio, create the integrations framework schema:

Table: integrations
- id (primary key)
- project_id (foreign key)
- integration_type: enum ['discord', 'twitter', 'email_smtp', 'twilio', 'google_maps', 'webhook_outbound', 'webhook_inbound']
  (Note: Include 'twitter' in enum for future use, but it won't be implemented yet due to API costs)
- name: varchar(255) (user-friendly name for this integration)
- config: jsonb (encrypted sensitive data - connection details)
  - Structure varies by type, e.g.:
  - discord: {bot_token, guild_id, channel_ids}
  - email_smtp: {host, port, username, password, from_address}
  - webhook: {url, secret, events}
- status: enum ['pending', 'active', 'error', 'disabled'] (default 'pending')
- last_sync_at: timestamp (nullable)
- last_error: text (nullable)
- error_count: integer (default 0)
- created_by_user_id: uuid
- created_at, updated_at

Table: integration_logs
- id (primary key)
- integration_id (foreign key)
- event_type: varchar(100) (e.g., 'message_sent', 'message_received', 'error', 'sync')
- direction: enum ['inbound', 'outbound']
- payload: jsonb (the data sent/received, sanitized)
- status: enum ['success', 'failed', 'pending']
- error_message: text (nullable)
- created_at

Create index on integration_logs (integration_id, created_at).

Note on security: In a production app, the config field should be encrypted at rest. For this chunk, just store as JSONB with a note that encryption should be added.

Create migrations and TypeScript types.
```

---

## Chunk 7.2: Integration Management API

**Purpose:** Create API endpoints for managing integrations.

**Claude Code Prompt:**
```
In ARG Studio, create API endpoints for integration management:

GET /api/projects/:projectId/integrations
- List all integrations for project
- Include status, last sync, error count
- Don't return sensitive config fields (redact tokens/passwords)

POST /api/projects/:projectId/integrations
- Create new integration
- Validate config based on integration_type
- Set status to 'pending'

GET /api/projects/:projectId/integrations/:integrationId
- Get integration details
- Redact sensitive config fields

PATCH /api/projects/:projectId/integrations/:integrationId
- Update integration config
- Allow enabling/disabling

DELETE /api/projects/:projectId/integrations/:integrationId
- Delete integration and logs

POST /api/projects/:projectId/integrations/:integrationId/test
- Test the integration connection
- Return success/failure with message
- Don't update status, just test

POST /api/projects/:projectId/integrations/:integrationId/sync
- Manually trigger sync (for applicable integrations)
- Update last_sync_at

GET /api/projects/:projectId/integrations/:integrationId/logs
- Get recent logs for this integration
- Pagination, filter by status/event_type

Available integration types to validate:
- discord: requires bot_token, guild_id
- twitter: requires api_key, api_secret, access_token, access_secret
- email_smtp: requires host, port, username, password, from_address
- twilio: requires account_sid, auth_token, phone_number
- webhook_outbound: requires url, optional secret
- webhook_inbound: generates a unique URL/key for receiving webhooks
```

---

## Chunk 7.3: Integration Settings UI

**Purpose:** Create UI for managing integrations.

**Claude Code Prompt:**
```
In ARG Studio, create Integrations settings page:

1. Add "Integrations" to project Settings section or as standalone page

2. Integrations page layout:

   Header:
   - Title: "Integrations"
   - Subtitle: "Connect external platforms to your ARG"

   Available Integrations grid:
   Show cards for each integration type:
   - Discord: icon, description, Configure/Connected status
   - Twitter/X: icon, description, "Coming Soon" badge (disabled, not clickable - API costs prohibitive)
   - Email (SMTP): icon, description, status
   - Twilio (SMS/Voice): icon, description, status
   - Webhooks: icon, description, status
   
   Each card shows:
   - Icon/logo
   - Integration name
   - Brief description
   - Status badge (Not Connected / Connected / Error)
   - "Configure" button (or "Manage" if connected)

3. When clicking Configure/Manage, open modal for that integration:

   Header:
   - Integration name and icon
   - Status indicator
   
   Configuration form (dynamic based on type):
   - Discord:
     - Bot Token (password field)
     - Server ID
     - Channel selection (after connection)
   - Email SMTP:
     - Host, Port
     - Username, Password
     - From Address
     - TLS toggle
   - Etc. (each type has specific fields)
   
   Actions:
   - "Test Connection" button
   - "Save" button
   - "Disconnect" button (if connected)
   - "View Logs" link

4. Integration logs view:
   - Table showing recent activity
   - Event type, direction, status, timestamp
   - Expand to see payload details
   - Filter/search

5. Help text:
   - Link to documentation for setup
   - Security notes about credential storage
```

---

## Chunk 7.4: Discord Integration Implementation

**Purpose:** Implement Discord bot integration.

**Claude Code Prompt:**
```
In ARG Studio, implement Discord integration:

Note: This is a reference implementation. Actual Discord bot hosting may require separate infrastructure.

1. Create Discord integration service:
   - Service file: services/integrations/discord.ts
   - Methods:
     - validateConfig(config): check bot token and guild ID
     - testConnection(config): attempt to fetch guild info
     - sendMessage(config, channelId, message): send a message
     - getChannels(config): list available channels in guild
     - setupWebhook(config): set up incoming message webhook

2. Discord configuration validation:
   - Bot token format check
   - Guild ID format check
   - Test that bot has access to guild

3. In Integration Settings UI:
   - After saving Discord config, show:
     - "Select Channels" - checkboxes for which channels to monitor
     - Channel mapping to characters (optional)
   - Show bot invite link if not in server

4. Message sending:
   - When sending via Communications Hub to Discord channel:
     - Call discord.sendMessage
     - Log to integration_logs
     - Update player_communications with platform_message_id

5. Message receiving (webhook):
   - Create endpoint: POST /api/webhooks/discord/:projectId
   - Verify Discord signature
   - Parse incoming message
   - Create player_communications record
   - Match player by Discord user ID (need to store in player record)
   - Create alert if no player match found

6. Add to digital_properties:
   - When type is 'discord_server', allow linking to integration
   - Show connection status
```

---

## Chunk 7.5: Email Integration Implementation

**Purpose:** Implement SMTP email integration.

**Claude Code Prompt:**
```
In ARG Studio, implement Email SMTP integration:

1. Create Email integration service:
   - Service file: services/integrations/email.ts
   - Use nodemailer or similar
   - Methods:
     - validateConfig(config): check all required fields
     - testConnection(config): send test email to self
     - sendEmail(config, to, subject, body, replyTo): send email
     - parseIncoming(rawEmail): parse received email (for webhooks)

2. SMTP configuration:
   - Host
   - Port
   - Username
   - Password
   - From Address
   - From Name
   - Reply-To (optional, can be character-specific)
   - TLS/SSL toggle
   - Test email recipient

3. Sending emails:
   - When sending via Communications Hub with email channel:
     - Check if email integration is configured and active
     - Get player email (must have email and consent)
     - Call email.sendEmail
     - Log to integration_logs
     - Store in player_communications

4. Receiving emails:
   - Option A: Webhook endpoint for email forwarding services:
     - POST /api/webhooks/email/:projectId
     - Parse incoming webhook (support common formats: SendGrid, Mailgun, etc.)
   - Option B: IMAP polling (more complex):
     - Scheduled job to check inbox
     - Parse and log new emails
   
   - Match player by email address
   - Create player_communications record
   - Create alert if from unknown email

5. Email templates:
   - Support HTML emails
   - Basic template with header/footer
   - Inline CSS for compatibility

6. Error handling:
   - Retry logic for transient failures
   - Bounce handling
   - Update integration status on errors
```

---

## Chunk 7.6: Webhook Integration (Generic)

**Purpose:** Implement generic webhook support for custom integrations.

**Claude Code Prompt:**
```
In ARG Studio, implement generic webhook integrations:

1. Outbound Webhooks (ARG Studio sends to external):
   
   Configuration:
   - Webhook URL
   - Secret key (for signing)
   - Events to trigger on (checkboxes):
     - player_registered
     - player_progress
     - puzzle_solved
     - event_started
     - message_received
     - custom
   - Headers (key-value pairs)
   
   Implementation:
   - Service: services/integrations/webhook.ts
   - sendWebhook(config, event, payload): POST to URL
   - Sign payload with secret (HMAC-SHA256 in header)
   - Retry on failure (exponential backoff)
   - Log all attempts

   Trigger points:
   - Add webhook dispatch calls to relevant actions
   - Use event queue/job system if available

2. Inbound Webhooks (external sends to ARG Studio):
   
   Configuration:
   - Generate unique endpoint URL: /api/webhooks/custom/:projectId/:webhookId
   - Generate secret key for verification
   - Show URL and secret to user
   - Event mapping: what does this webhook represent
   
   Endpoint:
   - POST /api/webhooks/custom/:projectId/:webhookId
   - Verify signature
   - Log payload
   - Process based on configuration:
     - Create player_communication
     - Trigger event
     - Update player progress
     - Create alert
     - Custom action (just log for manual review)

3. UI additions:
   - Outbound webhooks section:
     - Add webhook
     - Configure events and URL
     - Test button (sends sample payload)
     - View delivery logs
   
   - Inbound webhooks section:
     - Create new inbound webhook
     - Show generated URL and secret
     - Instructions for external system
     - View received payloads

4. Documentation:
   - Generate sample payloads for each event type
   - Show expected format for inbound webhooks
```

---

# PHASE 8: ANALYTICS & MONITORING
*Chunks 8.1 - 8.4 | Understanding player behavior and ARG health*

---

## Chunk 8.1: Analytics Schema

**Purpose:** Create schema for analytics data.

**Claude Code Prompt:**
```
In ARG Studio, create analytics schema:

Table: analytics_events
- id (primary key)
- project_id (foreign key)
- event_type: varchar(100) (e.g., 'player_registered', 'puzzle_started', 'puzzle_solved', 'node_reached', 'hint_used', 'event_attended', 'message_sent')
- player_id: uuid (nullable, foreign key to players)
- content_type: varchar(50) (nullable, related content type)
- content_id: uuid (nullable, related content id)
- event_data: jsonb (additional event-specific data)
- session_id: varchar(100) (nullable, for grouping user sessions)
- occurred_at: timestamp (when the event happened)
- created_at

Create index on (project_id, event_type, occurred_at).
Create index on (project_id, player_id, occurred_at).

Table: analytics_daily_summaries
- id (primary key)
- project_id (foreign key)
- date: date
- metric_type: varchar(100) (e.g., 'active_players', 'new_players', 'puzzles_solved', 'messages_sent', 'completion_rate')
- metric_value: decimal
- breakdown: jsonb (optional breakdown, e.g., by status, by puzzle)
- created_at, updated_at

Create unique index on (project_id, date, metric_type).

Note: In production, consider time-series database or analytics service. This schema works for moderate scale.

Create migrations and TypeScript types.
```

---

## Chunk 8.2: Analytics API & Event Tracking

**Purpose:** Create API for analytics and event tracking.

**Claude Code Prompt:**
```
In ARG Studio, create analytics API:

Event Logging:
POST /api/projects/:projectId/analytics/events
- Log an analytics event
- Fields: event_type, player_id, content_type, content_id, event_data
- Used internally by other parts of the app

Add analytics event logging to existing actions:
- Player registration -> 'player_registered'
- Puzzle started -> 'puzzle_started'
- Puzzle solved -> 'puzzle_solved'
- Hint requested -> 'hint_requested'
- Node completed -> 'node_completed'
- Event attended -> 'event_attended'
- Message sent/received -> 'message_sent', 'message_received'

Dashboard Stats:
GET /api/projects/:projectId/analytics/overview
- Return summary stats:
  - Total players
  - Active players (last 24h, 7d, 30d)
  - Completion rate
  - Avg progress
  - Messages this week
  - Puzzles solved this week

GET /api/projects/:projectId/analytics/players
- Player engagement metrics:
  - New players over time (daily/weekly)
  - Active players over time
  - Player status breakdown
  - Retention (% still active after X days)

GET /api/projects/:projectId/analytics/content
- Content performance:
  - Per puzzle: attempts, solve rate, avg time, hint usage
  - Per node: visits, completion rate, avg time spent
  - Bottlenecks (lowest completion rate)

GET /api/projects/:projectId/analytics/funnel
- Player journey funnel:
  - % of players reaching each major node
  - Drop-off points

Time-based queries should support:
- Date range filter
- Granularity (daily, weekly, monthly)

Daily Aggregation Job:
Create a function/endpoint to calculate daily summaries:
POST /api/projects/:projectId/analytics/aggregate-daily
- Calculate and store metrics for previous day
- Run via cron or manual trigger
```

---

## Chunk 8.3: Analytics Dashboard Page

**Purpose:** Create analytics visualization page.

**Claude Code Prompt:**
```
In ARG Studio, create Analytics page:

1. Add "Analytics" to project sidebar navigation

2. Analytics page layout:

   Date range selector:
   - Preset buttons: Last 7 days, Last 30 days, All time
   - Custom date range picker
   - Apply button

   Overview Cards (top row):
   - Total Players (with trend)
   - Active Players (last 7d, with trend)
   - Completion Rate (%)
   - Avg Response Time

   Charts Section:

   Chart 1 - Player Activity:
   - Line chart
   - Daily active players over time
   - Optional: overlay new registrations
   - Use recharts or Chart.js

   Chart 2 - Player Status Breakdown:
   - Pie or donut chart
   - Active, Casual, Lurker, Completed, Dropped

   Chart 3 - Content Funnel:
   - Funnel or horizontal bar chart
   - Show major nodes/milestones
   - Percentage reaching each

   Chart 4 - Puzzle Performance:
   - Table or bar chart
   - Puzzles ranked by difficulty (actual solve rate)
   - Columns: Name, Attempts, Solve Rate, Avg Time, Hint Usage

   Bottlenecks Section:
   - List of potential problem areas:
     - "Players stuck at [Node X]: 15 players, avg 3 days"
     - "Puzzle [Y] has only 20% solve rate"
   - Action buttons: view players, send hint

3. Export:
   - "Export Report" button
   - CSV download of current view data
   - Or: generate PDF summary (future)

4. Refresh:
   - Auto-refresh toggle
   - Manual refresh button
   - Last updated timestamp
```

---

## Chunk 8.4: Real-Time Activity Monitor

**Purpose:** Add live activity feed for monitoring.

**Claude Code Prompt:**
```
In ARG Studio, add real-time activity monitoring:

1. Add "Activity" tab or section to Analytics (or Command Center):

2. Live Activity Feed:
   - Scrolling list of recent events
   - Shows:
     - Timestamp
     - Event type icon
     - Player name (clickable)
     - Description (e.g., "solved [Puzzle Name]", "reached [Node Name]")
     - Related content link
   
   - Filter controls:
     - Event types (checkboxes)
     - Player filter (search)
     - Content filter
   
   - Auto-refresh every 10-30 seconds
   - Or: websocket for real-time push (if infrastructure supports)
   - New items highlight animation
   - "Pause" toggle to stop auto-refresh

3. Activity map visualization:
   - Simplified trail map view
   - Animated dots showing recent player movements
   - "X players active" indicator
   - Click node to see recent activity there

4. Alerts integration:
   - Activity patterns trigger alerts:
     - Unusual spike in activity
     - Multiple players stuck at same point
     - Sudden drop in activity
   - Alert rules (configurable in settings):
     - If > X players stuck at node for > Y hours
     - If puzzle solve rate drops below Z%
     - If no activity for X hours during expected peak

5. API endpoint:
   GET /api/projects/:projectId/analytics/activity-feed
   - Return recent events
   - Support since_id or since_timestamp for polling
   - Limit parameter
   - Filters

6. Performance consideration:
   - Limit feed to last 100-500 events
   - Indexed query on occurred_at
   - Consider caching recent events
```

---

# PHASE 9: TESTING & QA MODULE
*Chunks 9.1 - 9.3 | Quality assurance workflows*

---

## Chunk 9.1: Puzzle Testing Schema & Workflow

**Purpose:** Create structured puzzle testing system.

**Claude Code Prompt:**
```
In ARG Studio, create puzzle testing schema and workflow:

Table: puzzle_tests
- id (primary key)
- puzzle_id (foreign key to puzzles)
- tester_user_id (foreign key to users, nullable - can be external)
- tester_name: varchar(255) (for external testers)
- tester_email: varchar(255) (nullable)
- status: enum ['assigned', 'in_progress', 'completed', 'abandoned']
- started_at: timestamp (nullable)
- completed_at: timestamp (nullable)
- time_to_solve_minutes: integer (nullable)
- solved_successfully: boolean (nullable)
- difficulty_rating: integer (1-5, nullable)
- clarity_rating: integer (1-5, how clear was the puzzle, nullable)
- feedback: text (nullable)
- stuck_points: text (nullable, where did they get stuck)
- hints_needed: integer (nullable)
- used_hints: text[] (which hints they used)
- alternative_approach: text (nullable, did they try a different method)
- created_at, updated_at

Table: puzzle_test_invites
- id (primary key)
- puzzle_id (foreign key)
- invite_code: varchar(50) (unique)
- tester_email: varchar(255) (nullable)
- max_uses: integer (default 1)
- uses: integer (default 0)
- expires_at: timestamp (nullable)
- created_by_user_id (foreign key)
- created_at

Create migrations and TypeScript types.

API endpoints:
GET /api/projects/:projectId/puzzles/:puzzleId/tests
POST /api/projects/:projectId/puzzles/:puzzleId/tests - create test assignment
PATCH /api/projects/:projectId/puzzles/:puzzleId/tests/:testId - update test
POST /api/projects/:projectId/puzzles/:puzzleId/test-invites - create invite link
GET /api/puzzle-test/:inviteCode - public endpoint for external testers
POST /api/puzzle-test/:inviteCode/submit - submit test results
```

---

## Chunk 9.2: Puzzle Testing UI

**Purpose:** Create UI for managing puzzle tests.

**Claude Code Prompt:**
```
In ARG Studio, create puzzle testing UI:

1. Add "Testing" tab to Puzzle detail page:

   Summary stats:
   - Tests completed: X
   - Average solve time: Y min
   - Average difficulty: 3.5/5
   - Solve rate: Z%

   Test assignments table:
   - Tester name
   - Status badge
   - Assigned date
   - Completed date
   - Time to solve
   - Difficulty rating
   - Actions: view details, send reminder

   "Assign Tester" button:
   - Modal:
     - Select team member, or
     - Enter external tester name/email
     - Optional: due date
     - Send notification checkbox

   "Create Test Link" button:
   - Generates public URL
   - Options: max uses, expiration
   - Copy link button
   - QR code for link

2. Test details modal:
   - All feedback fields from tester
   - Stuck points
   - Suggestions
   - Notes from puzzle creator

3. External tester page (public, no auth):
   - URL: /puzzle-test/:inviteCode
   - Shows puzzle setup (not solution)
   - Start button (begins timer)
   - Hint buttons (reveal progressive hints)
   - "I solved it" / "I give up" buttons
   - Feedback form:
     - Time to solve (auto-filled)
     - Did you solve it?
     - Difficulty rating
     - Clarity rating
     - Where did you get stuck?
     - Feedback/suggestions
   - Submit button

4. On Puzzles list page:
   - Add "Testing" filter/view
   - Show puzzles needing tests
   - Show test status badge on each puzzle

5. Aggregate testing dashboard (optional):
   - All puzzles testing status
   - Which need more testers
   - Problematic puzzles (low solve rate in testing)
```

---

## Chunk 9.3: Content Review Workflow

**Purpose:** Create approval workflow for content.

**Claude Code Prompt:**
```
In ARG Studio, create content review workflow:

1. Add review status to relevant content types:
   
   Add review_status column to: story_beats, characters, puzzles, events, lore_entries
   - enum: ['draft', 'pending_review', 'in_review', 'approved', 'needs_changes', 'rejected']
   - default: 'draft'
   
   Add review fields:
   - submitted_for_review_at: timestamp (nullable)
   - submitted_by_user_id: uuid (nullable)
   - reviewed_by_user_id: uuid (nullable)
   - reviewed_at: timestamp (nullable)
   - review_notes: text (nullable)

2. Review comments table:
   Table: content_reviews
   - id
   - content_type: varchar(50)
   - content_id: uuid
   - reviewer_user_id: uuid
   - comment: text
   - status_change: varchar(50) (nullable, if this review changed status)
   - created_at

3. UI additions:

   On content forms (story beats, puzzles, etc.):
   - Show current review status badge
   - "Submit for Review" button (changes status to pending_review)
   - For reviewers:
     - "Start Review" button (changes to in_review)
     - Comment text area
     - "Approve" / "Request Changes" / "Reject" buttons
     - Each action logs to content_reviews

   Review inbox/dashboard:
   - Add to project navigation: "Reviews" (with count badge)
   - List all content pending review
   - Filter by content type, submitted date
   - Click to open content with review panel

   Content list pages:
   - Add review status filter
   - Show status badges
   - Sort by review status

4. Notifications (basic):
   - When submitted: notify potential reviewers
   - When reviewed: notify submitter
   - (Basic: in-app indicator; advanced: email)

5. API endpoints:
   POST /api/:contentType/:id/submit-review
   POST /api/:contentType/:id/review (approve/reject/request-changes)
   GET /api/projects/:projectId/pending-reviews
   GET /api/:contentType/:id/reviews (get review history)
```

---

# PHASE 10: SCHEDULING & CALENDAR
*Chunks 10.1 - 10.2 | Unified scheduling system*

---

## Chunk 10.1: Scheduling Schema & API

**Purpose:** Create unified scheduling across content types.

**Claude Code Prompt:**
```
In ARG Studio, create unified scheduling schema:

Table: scheduled_items
- id (primary key)
- project_id (foreign key)
- item_type: enum ['event', 'content_drop', 'social_post', 'puzzle_release', 'hint_release', 'node_unlock', 'broadcast', 'custom']
- item_id: uuid (nullable, reference to actual item if applicable)
- title: varchar(255)
- description: text (nullable)
- scheduled_for: timestamp
- end_time: timestamp (nullable, for events with duration)
- timezone: varchar(50)
- status: enum ['scheduled', 'triggered', 'completed', 'cancelled', 'failed']
- trigger_type: enum ['automatic', 'manual_confirm']
- assigned_to_user_ids: uuid[] (nullable)
- recurrence_rule: varchar(255) (nullable, iCal RRULE format for recurring items)
- parent_scheduled_item_id: uuid (nullable, for recurring instances)
- created_by_user_id: uuid
- triggered_at: timestamp (nullable)
- completed_at: timestamp (nullable)
- notes: text (nullable)
- created_at, updated_at

Create indexes on (project_id, scheduled_for, status).

API endpoints:

GET /api/projects/:projectId/schedule
- List scheduled items
- Filters: date range, item_type, status, assigned_to
- Support calendar view (group by date) or list view

POST /api/projects/:projectId/schedule
- Create scheduled item
- Validate scheduled_for is in future

PATCH /api/projects/:projectId/schedule/:itemId
- Update item (reschedule, reassign, add notes)

DELETE /api/projects/:projectId/schedule/:itemId
- Cancel scheduled item

POST /api/projects/:projectId/schedule/:itemId/trigger
- Manually trigger item now
- Update status to triggered, set triggered_at

GET /api/projects/:projectId/schedule/upcoming
- Next X items
- Used for dashboard widgets

Also: create function to generate recurring instances from RRULE.
```

---

## Chunk 10.2: Calendar Page & Integration

**Purpose:** Create unified calendar view.

**Claude Code Prompt:**
```
In ARG Studio, create unified Calendar page:

1. Add "Calendar" to project sidebar navigation

2. Calendar page layout:

   Header:
   - View toggles: Month / Week / Day / Agenda
   - Navigation: Previous / Today / Next
   - Current date range display
   - "+ Schedule" button (create new scheduled item)
   - Filter dropdown: show/hide item types (color-coded)

   Calendar view (use @fullcalendar/react):
   - Month view: items as bars/dots on dates
   - Week view: time grid with items
   - Day view: detailed hour-by-hour
   - Agenda view: list sorted by date
   
   Item display:
   - Color-coded by item_type
   - Icon for type
   - Title
   - Time
   - Assigned to indicator
   
   Interactions:
   - Click item: open detail popover/modal
   - Drag item: reschedule (update scheduled_for)
   - Click empty slot: create new item at that time

3. Schedule item modal (create/edit):
   - Type dropdown
   - If type has linked content (puzzle_release, node_unlock):
     - Show content selector
   - Title
   - Description
   - Scheduled date/time
   - End time (optional)
   - Timezone selector
   - Trigger type (automatic or manual confirm)
   - Assigned to (team member multi-select)
   - Recurrence (None, Daily, Weekly, Custom)
   - Notes

4. Agenda sidebar (optional):
   - Show alongside calendar
   - List of upcoming items this week
   - Quick actions

5. Auto-population:
   - When events are created with start_time, auto-create scheduled_item
   - When story beats have trigger_type=date_reached, auto-create
   - Keep in sync (update scheduled_item when source changes)

6. iCal export:
   - "Export Calendar" button
   - Generate .ics file with all scheduled items
   - Subscribe URL for live calendar feed (GET endpoint returning iCal)
```

---

# PHASE 11: POLISH & QUALITY OF LIFE
*Chunks 11.1 - 11.6 | Refinements and improvements*

---

## Chunk 11.1: Global Search

**Purpose:** Add search across all content types.

**Claude Code Prompt:**
```
In ARG Studio, implement global search:

1. Add search input to header/navigation:
   - Search icon that expands to input
   - Or: always-visible search bar
   - Keyboard shortcut: Cmd/Ctrl + K

2. Search modal/dropdown:
   - As user types, show results
   - Debounce input (300ms)
   - Results grouped by type:
     - Story Beats
     - Characters
     - Puzzles
     - Events
     - Locations
     - Lore
     - Players
     - Tasks
   - Show max 3-5 per type with "See all X results" link
   - Each result shows: icon, title, brief context, match highlight

3. Search results page:
   - Full results when clicking "See all" or pressing Enter
   - Filter sidebar by content type
   - Sort by relevance or date
   - Pagination

4. API endpoint:
   GET /api/projects/:projectId/search?q=query&type=all|specific
   - Search across all relevant tables
   - Search fields: title, name, description, content
   - Use ILIKE for basic search, or full-text search if available
   - Return type, id, title, snippet, relevance score

5. Recent searches:
   - Store last 5 searches in localStorage
   - Show when opening search with no query

6. Quick actions in search:
   - Type "/" to see commands
   - "/new puzzle" -> create puzzle
   - "/go players" -> navigate to players
```

---

## Chunk 11.2: Notifications System

**Purpose:** Add in-app notifications.

**Claude Code Prompt:**
```
In ARG Studio, create notifications system:

Table: notifications
- id (primary key)
- user_id (foreign key to users)
- project_id (foreign key, nullable - null for system notifications)
- type: varchar(100)
- title: varchar(255)
- message: text
- link: varchar(500) (nullable, URL to navigate to)
- related_type: varchar(50) (nullable)
- related_id: uuid (nullable)
- is_read: boolean (default false)
- read_at: timestamp (nullable)
- created_at

Create index on (user_id, is_read, created_at).

Notification types:
- 'task_assigned' - task assigned to you
- 'review_requested' - content submitted for review
- 'review_completed' - your content was reviewed
- 'mention' - someone mentioned you
- 'event_reminder' - upcoming event
- 'message_received' - new player message (for PMs)
- 'alert' - system alert

API:
GET /api/notifications - user's notifications, filter by is_read
PATCH /api/notifications/:id/read - mark as read
POST /api/notifications/mark-all-read
DELETE /api/notifications/:id

UI:
1. Bell icon in header with unread count badge
2. Click to open notifications dropdown:
   - List of recent notifications
   - Mark all as read
   - View all link
3. Notification item shows:
   - Icon by type
   - Title
   - Time ago
   - Click to navigate and mark read
4. Notifications page:
   - Full list with filters
   - Settings link

Create notifications when:
- Task assigned
- Review submitted/completed
- Event starting soon (trigger via scheduled job)
- New player message (if user is PM on duty)
```

---

## Chunk 11.3: Activity Log & Audit Trail

**Purpose:** Track all changes for accountability.

**Claude Code Prompt:**
```
In ARG Studio, create activity logging system:

Table: activity_logs
- id (primary key)
- project_id (foreign key)
- user_id (foreign key to users)
- action: varchar(100) (e.g., 'create', 'update', 'delete', 'trigger', 'send')
- target_type: varchar(50) (e.g., 'puzzle', 'story_beat', 'player')
- target_id: uuid
- target_name: varchar(255) (snapshot of name at time of action)
- changes: jsonb (nullable, for updates: {field: {old: x, new: y}})
- metadata: jsonb (nullable, additional context)
- ip_address: varchar(50) (nullable)
- user_agent: varchar(500) (nullable)
- created_at

Create index on (project_id, created_at).
Create index on (target_type, target_id).

Implementation:
1. Create logging service/utility:
   - logActivity(projectId, userId, action, targetType, targetId, targetName, changes?, metadata?)
   - Call from API routes after successful operations

2. Add logging to all create/update/delete operations:
   - Content CRUD (puzzles, beats, characters, etc.)
   - Player status changes
   - Communication sent
   - Triggers activated
   - Settings changed

3. API endpoints:
   GET /api/projects/:projectId/activity
   - List activity with pagination
   - Filters: user_id, action, target_type, date range

   GET /api/projects/:projectId/activity/for/:targetType/:targetId
   - Activity for specific item

4. UI:
   - "Activity" section in project settings or as sidebar panel
   - Filter bar
   - Activity list:
     - User avatar and name
     - Action description: "User created Puzzle 'Cipher X'"
     - Time ago
     - Click to expand and see changes diff

5. On content detail pages:
   - "History" tab or section
   - Shows activity for this specific item
   - Who changed what, when
```

---

## Chunk 11.4: User Preferences & Project Settings

**Purpose:** Expand user and project configuration options.

**Claude Code Prompt:**
```
In ARG Studio, enhance user preferences and project settings:

1. User Preferences (per-user, applies to all projects):

   Add user_preferences table or column:
   - theme: 'dark' | 'light' | 'system' (default 'dark')
   - timezone: varchar (default from browser)
   - date_format: 'US' | 'EU' | 'ISO'
   - notifications_email: boolean
   - notifications_in_app: boolean
   - default_view_tasks: 'kanban' | 'list'
   - default_view_calendar: 'month' | 'week'
   - command_center_refresh_rate: integer (seconds)

   UI:
   - User menu -> Settings/Preferences
   - Preferences page with sections:
     - Appearance
     - Regional
     - Notifications
     - Defaults

2. Project Settings (expand existing):

   Add to projects table or separate project_settings table:
   - timezone: varchar (primary timezone for scheduling)
   - launch_date: date (nullable)
   - end_date: date (nullable)
   - status: 'planning' | 'pre_production' | 'testing' | 'soft_launch' | 'live' | 'completed' | 'archived'
   - player_registration: 'open' | 'application' | 'invite_only' | 'closed'
   - default_puzzle_difficulty: integer
   - stuck_player_threshold_hours: integer (when to alert)
   - auto_hint_enabled: boolean
   - content_warnings: text[] (project-level warnings)
   - emergency_contact: text
   - public_page_enabled: boolean
   - public_page_slug: varchar (for public landing page, future)

   UI:
   - Project Settings page (already exists partially)
   - Add sections:
     - General (name, description, status)
     - Timeline (launch date, end date)
     - Players (registration, stuck threshold)
     - Content (default difficulty, warnings)
     - Emergency (contact info)
     - Danger Zone (archive, delete)

3. Settings apply throughout:
   - Use user timezone for date displays
   - Use project timezone for scheduling
   - Respect notification preferences
```

---

## Chunk 11.5: Keyboard Shortcuts

**Purpose:** Add keyboard shortcuts for power users.

**Claude Code Prompt:**
```
In ARG Studio, implement keyboard shortcuts:

1. Create keyboard shortcut system:
   - Use a hook: useKeyboardShortcuts()
   - Register shortcuts globally
   - Prevent when user is typing in input/textarea

2. Shortcuts to implement:

   Global:
   - Cmd/Ctrl + K: Open search
   - Cmd/Ctrl + /: Open keyboard shortcuts help
   - G then D: Go to Dashboard
   - G then P: Go to Players
   - G then C: Go to Communications
   - G then M: Go to Command Center
   - Escape: Close modal/panel

   In lists:
   - J: Move selection down
   - K: Move selection up
   - Enter: Open selected item
   - N: New item (context-aware)

   In forms:
   - Cmd/Ctrl + Enter: Save
   - Escape: Cancel

   In Command Center:
   - P: Toggle pause
   - B: Open broadcast
   - R: Refresh activity feed

3. UI:
   - Keyboard shortcuts modal:
     - Triggered by Cmd/Ctrl + /
     - Or: "?" icon in corner
     - Grouped by context
     - Show key combinations

   - Hint text:
     - Show shortcuts next to buttons (subtle)
     - e.g., "Save (⌘+Enter)"

4. Make shortcuts configurable (optional, future):
   - User preferences to customize
   - For now, fixed shortcuts are fine

5. Implementation:
   - Create ShortcutsProvider context
   - Register shortcuts in components
   - Central handler to dispatch actions
   - Consider library: react-hotkeys-hook or similar
```

---

## Chunk 11.6: Onboarding & Empty States

**Purpose:** Improve new user experience.

**Claude Code Prompt:**
```
In ARG Studio, improve onboarding and empty states:

1. Project Creation Wizard (enhance existing):
   - After basic setup, offer guided steps:
     - "Add your first character"
     - "Create your first puzzle"
     - "Set up your trail map entry point"
   - Each step has skip option
   - Show progress indicator

2. Empty States (enhance throughout):
   
   For each section, when empty, show:
   - Friendly illustration or icon
   - Explanation of what this section is for
   - Primary action button
   - Optional: link to help documentation
   
   Examples:
   - Characters: "No characters yet. Characters are the people and entities in your ARG world. Create your protagonist, antagonists, and NPCs. [+ Create Character]"
   - Puzzles: "No puzzles yet. Puzzles drive player engagement and progression. Start with an entry puzzle to hook players. [+ Create Puzzle] [📖 Puzzle Design Tips]"
   - Trail Map: "Your trail map is empty. Start by adding an Entry Point - this is where players begin. [+ Add Entry Point]"
   - Players: "No players yet. Players will appear here once your ARG goes live. You can also manually add players for testing. [+ Add Test Player]"

3. First-time tooltips:
   - On first visit to a section, show tooltip highlighting key features
   - "Got it" button to dismiss
   - Store dismissed state in localStorage or user_preferences

4. Help links:
   - Add "?" icon next to section headers
   - Link to contextual help (future: documentation site)
   - For now: tooltip with brief explanation

5. Sample project template (optional):
   - "Start from Template" option in project creation
   - Creates project with sample content:
     - 2-3 characters
     - A few story beats
     - 2-3 puzzles
     - Basic trail map
   - Clearly marked as sample data
   - User can modify or delete

6. Checklist widget:
   - On project overview, show setup checklist:
     - ☑ Project created
     - ☐ First character added
     - ☐ First puzzle created
     - ☐ Trail map started
     - ☐ First event scheduled
   - Collapses after all checked
   - Can be dismissed
```

---

# IMPLEMENTATION NOTES

## Order of Operations

Phases are designed to be implemented in order, but within each phase, chunks can sometimes be parallelized by different developers.

**Critical Path:**
1. Phase 1 (Schema) must come first
2. Phase 2 (Trail Map) can start after Chunk 1.1
3. Phase 3 (UI Updates) can start after relevant Phase 1 chunks
4. Phase 4 (Players) needs Chunk 1.1
5. Phase 5 (Communications) needs Phase 4
6. Phase 6 (Command Center) needs Phases 4 & 5
7. Phases 7-11 can be interleaved based on priority

## Testing Each Chunk

After each chunk:
1. Run existing tests (ensure no regression)
2. Test new functionality manually
3. Verify database migrations work (up and down)
4. Check for TypeScript errors
5. Test on development environment before committing

## Rollback Plan

If a chunk causes issues:
1. Database migrations should have down() methods
2. Keep git commits per chunk for easy revert
3. Feature flags can be used to disable new features without code revert

## Estimated Timeline

At 1-2 chunks per day:
- Phase 1: 6-12 days
- Phase 2: 4-8 days
- Phase 3: 6-12 days
- Phase 4: 3-6 days
- Phase 5: 3-6 days
- Phase 6: 4-8 days
- Phase 7: 3-6 days
- Phase 8: 2-4 days
- Phase 9: 2-3 days
- Phase 10: 1-2 days
- Phase 11: 3-6 days

**Total: 37-73 days** depending on complexity and debugging needs.

Recommend prioritizing through Phase 6 for MVP of "ARG OS" functionality, then adding Phases 7-11 iteratively.
