/**
 * TypeScript types for enhanced characters
 */

export type CharacterType =
  | 'protagonist'
  | 'antagonist'
  | 'npc'
  | 'puppet_master'
  | 'autonomous_ai'
  | 'organization'
  | 'historical'
  | 'player_created'
  | 'ai'; // Legacy type, maps to autonomous_ai

export type CharacterStatus =
  | 'active'
  | 'inactive'
  | 'deceased'
  | 'unknown'
  | 'hidden';

// Communication channel structure (stored as JSON)
export interface CommunicationChannel {
  platform: string; // e.g., "twitter", "instagram", "email", "phone"
  handle: string; // e.g., "@charactername" or "character@example.com"
  url?: string; // Optional direct URL
  notes?: string; // Optional internal notes
}

// Availability schedule structure (stored as JSON)
export interface AvailabilitySchedule {
  timezone: string; // e.g., "EST", "PST", "UTC"
  weekdays?: string; // e.g., "9am-5pm"
  weekends?: string; // e.g., "10am-2pm"
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  sunday?: string;
  notes?: string;
  [key: string]: string | undefined;
}

export interface Character {
  id: string;
  project_id: string;
  name: string;
  aliases: string | null; // JSON array of alternative names
  character_type: CharacterType;

  // Character details
  description: string | null;
  backstory: string | null;
  personality: string | null;
  motivations: string | null;
  secrets: string | null; // Hidden from players

  // Visual
  avatar_url: string | null;
  gallery: string | null; // JSON array of image URLs

  // Voice/Communication style
  voice_notes: string | null; // Legacy field
  voice_guide: string | null; // Comprehensive voice guide
  speech_patterns: string | null; // Legacy field
  sample_responses: string | null; // JSON array of example messages
  communication_channels: string | null; // JSON array of channel objects

  // Operations
  availability_schedule: string | null; // JSON object
  operator_user_ids: string | null; // JSON array of user IDs
  knowledge_boundaries: string | null; // What character knows/doesn't know

  // Status
  status: CharacterStatus;
  is_active: number; // SQLite boolean (0 or 1)
  introduction_beat_id: string | null;

  // Tracking
  appearance_count: number;
  last_appearance_at: string | null;

  // Metadata
  tags: string | null; // JSON array
  notes: string | null;

  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Parsed version with JSON fields as objects/arrays
export interface CharacterParsed extends Omit<Character,
  'aliases' | 'gallery' | 'sample_responses' | 'communication_channels' |
  'availability_schedule' | 'operator_user_ids' | 'tags'
> {
  aliases: string[] | null;
  gallery: string[] | null;
  sample_responses: string[] | null;
  communication_channels: CommunicationChannel[] | null;
  availability_schedule: AvailabilitySchedule | null;
  operator_user_ids: string[] | null;
  tags: string[] | null;
}

// Helper type for creating characters (without id and timestamps)
export type CreateCharacter = Omit<Character, 'id' | 'created_at' | 'updated_at'>;

// Helper type for updating characters
export type UpdateCharacter = Partial<Omit<Character, 'id' | 'project_id' | 'created_at'>>;

// Extended type with related data for display
export interface CharacterWithRelations extends CharacterParsed {
  created_by_username?: string;
  created_by_name?: string;
  introduction_beat_title?: string;
  operators?: Array<{
    id: string;
    username: string;
    display_name: string;
  }>;
  relationships?: Array<{
    id: string;
    related_character_id: string;
    related_character_name: string;
    relationship_type: string;
    relationship_label: string;
    is_bidirectional: boolean;
  }>;
  linked_story_beats?: Array<{
    id: string;
    title: string;
    role: 'featured' | 'mentioned' | 'background';
  }>;
  linked_events?: Array<{
    id: string;
    title: string;
    involvement: 'appears' | 'operates' | 'mentioned';
  }>;
}

// Helper functions for working with character data
export const CharacterHelpers = {
  /**
   * Parse JSON fields from database character record
   */
  parse(character: Character): CharacterParsed {
    return {
      ...character,
      aliases: character.aliases ? JSON.parse(character.aliases) : null,
      gallery: character.gallery ? JSON.parse(character.gallery) : null,
      sample_responses: character.sample_responses
        ? JSON.parse(character.sample_responses)
        : null,
      communication_channels: character.communication_channels
        ? JSON.parse(character.communication_channels)
        : null,
      availability_schedule: character.availability_schedule
        ? JSON.parse(character.availability_schedule)
        : null,
      operator_user_ids: character.operator_user_ids
        ? JSON.parse(character.operator_user_ids)
        : null,
      tags: character.tags ? JSON.parse(character.tags) : null,
    };
  },

  /**
   * Stringify parsed character for database storage
   */
  stringify(character: Partial<CharacterParsed>): Partial<Character> {
    const result: Partial<Character> = { ...character } as any;

    if (character.aliases !== undefined) {
      result.aliases = character.aliases ? JSON.stringify(character.aliases) : null;
    }
    if (character.gallery !== undefined) {
      result.gallery = character.gallery ? JSON.stringify(character.gallery) : null;
    }
    if (character.sample_responses !== undefined) {
      result.sample_responses = character.sample_responses
        ? JSON.stringify(character.sample_responses)
        : null;
    }
    if (character.communication_channels !== undefined) {
      result.communication_channels = character.communication_channels
        ? JSON.stringify(character.communication_channels)
        : null;
    }
    if (character.availability_schedule !== undefined) {
      result.availability_schedule = character.availability_schedule
        ? JSON.stringify(character.availability_schedule)
        : null;
    }
    if (character.operator_user_ids !== undefined) {
      result.operator_user_ids = character.operator_user_ids
        ? JSON.stringify(character.operator_user_ids)
        : null;
    }
    if (character.tags !== undefined) {
      result.tags = character.tags ? JSON.stringify(character.tags) : null;
    }

    return result;
  },

  /**
   * Check if character is available at given time
   */
  isAvailable(character: CharacterParsed, time: Date = new Date()): boolean {
    if (!character.is_active || character.status !== 'active') {
      return false;
    }

    if (!character.availability_schedule) {
      return true; // No schedule means always available
    }

    const schedule = character.availability_schedule;
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[time.getDay()];
    const isWeekend = time.getDay() === 0 || time.getDay() === 6;

    // Check day-specific schedule first
    if (schedule[dayName]) {
      return true; // Simplified check - actual implementation would parse time ranges
    }

    // Check weekdays/weekends
    if (!isWeekend && schedule.weekdays) {
      return true;
    }
    if (isWeekend && schedule.weekends) {
      return true;
    }

    return false;
  },

  /**
   * Get all communication channels for a specific platform
   */
  getChannelsByPlatform(character: CharacterParsed, platform: string): CommunicationChannel[] {
    if (!character.communication_channels) {
      return [];
    }
    return character.communication_channels.filter(
      ch => ch.platform.toLowerCase() === platform.toLowerCase()
    );
  },

  /**
   * Check if a user can operate this character
   */
  canOperate(character: CharacterParsed, userId: string): boolean {
    if (!character.operator_user_ids || character.operator_user_ids.length === 0) {
      return true; // No restrictions means anyone can operate
    }
    return character.operator_user_ids.includes(userId);
  },

  /**
   * Increment appearance count
   */
  recordAppearance(character: Character): Partial<Character> {
    return {
      appearance_count: character.appearance_count + 1,
      last_appearance_at: new Date().toISOString(),
    };
  }
};
