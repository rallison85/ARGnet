/**
 * TypeScript types for enhanced story beats
 */

export type BeatType =
  | 'chapter'
  | 'scene'
  | 'flashback'
  | 'revelation'
  | 'branch_point'
  | 'convergence'
  | 'ending'
  | 'secret';

export type TriggerType =
  | 'manual'
  | 'puzzle_solved'
  | 'date_reached'
  | 'node_completed'
  | 'player_action';

export type DeliveryMethod =
  | 'website'
  | 'social_post'
  | 'email'
  | 'physical_drop'
  | 'live_event'
  | 'automatic'
  | 'in_app';

export type CanonicalStatus =
  | 'canon'
  | 'semi_canon'
  | 'non_canon'
  | 'retconned';

export type StoryBeatStatus =
  | 'draft'
  | 'review'
  | 'approved'
  | 'locked';

// Trigger configuration types (stored as JSON)
export interface TriggerConfig {
  // For puzzle_solved trigger
  puzzle_id?: string;

  // For date_reached trigger
  date?: string;
  timezone?: string;

  // For node_completed trigger
  node_id?: string;

  // For player_action trigger
  action_description?: string;

  // Generic additional data
  [key: string]: unknown;
}

export interface StoryBeat {
  id: string;
  project_id: string;
  parent_id: string | null;
  title: string;
  content: string | null; // Rich text content (internal)
  summary: string | null;
  beat_type: BeatType;
  sequence_order: number;
  status: StoryBeatStatus;

  // Timeline
  story_date: string | null; // In-universe date/time
  real_world_trigger: string | null; // Legacy field

  // Trigger system
  trigger_type: TriggerType | null;
  trigger_config: string | null; // JSON string

  // Delivery
  delivery_method: DeliveryMethod | null;

  // Content split
  player_facing_content: string | null; // What players see
  internal_notes: string | null; // Production notes

  // Content metadata
  canonical_status: CanonicalStatus;
  reading_time_minutes: number | null;
  content_warnings: string | null; // JSON array of strings

  // Metadata
  mood: string | null;
  location_id: string | null;
  notes: string | null; // General notes (legacy)

  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Parsed version with JSON fields as objects
export interface StoryBeatParsed extends Omit<StoryBeat, 'trigger_config' | 'content_warnings'> {
  trigger_config: TriggerConfig | null;
  content_warnings: string[] | null;
}

// Helper type for creating story beats (without id and timestamps)
export type CreateStoryBeat = Omit<StoryBeat, 'id' | 'created_at' | 'updated_at'>;

// Helper type for updating story beats
export type UpdateStoryBeat = Partial<Omit<StoryBeat, 'id' | 'project_id' | 'created_at'>>;

// Extended type with related data for display
export interface StoryBeatWithRelations extends StoryBeatParsed {
  created_by_username?: string;
  created_by_name?: string;
  children_count?: number;
  location_name?: string;
  characters?: Array<{
    id: string;
    name: string;
    role: 'featured' | 'mentioned' | 'background';
  }>;
  puzzles?: Array<{
    id: string;
    title: string;
    relationship: 'requires' | 'unlocks' | 'references';
  }>;
  locations?: Array<{
    id: string;
    name: string;
  }>;
}
