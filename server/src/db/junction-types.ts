/**
 * TypeScript types for junction tables (many-to-many relationships)
 * These tables link various content types together
 */

// Story Beat to Characters
export interface StoryBeatCharacter {
  id: string;
  story_beat_id: string;
  character_id: string;
  role: 'featured' | 'mentioned' | 'background';
  created_at: string;
}

// Story Beat to Puzzles
export interface StoryBeatPuzzle {
  id: string;
  story_beat_id: string;
  puzzle_id: string;
  relationship: 'requires' | 'unlocks' | 'references';
  created_at: string;
}

// Story Beat to Locations
export interface StoryBeatLocation {
  id: string;
  story_beat_id: string;
  location_id: string;
  created_at: string;
}

// Puzzle Prerequisites (self-referential)
export interface PuzzlePrerequisite {
  id: string;
  puzzle_id: string;
  prerequisite_puzzle_id: string;
  created_at: string;
}

// Puzzle Unlocks (polymorphic)
export interface PuzzleUnlock {
  id: string;
  puzzle_id: string;
  unlockable_type: 'story_beat' | 'character' | 'location' | 'puzzle' | 'event';
  unlockable_id: string;
  created_at: string;
}

// Event to Characters
export interface EventCharacter {
  id: string;
  event_id: string;
  character_id: string;
  involvement: 'appears' | 'operates' | 'mentioned';
  created_at: string;
}

// Event to Locations
export interface EventLocation {
  id: string;
  event_id: string;
  location_id: string;
  is_primary: number; // SQLite boolean (0 or 1)
  created_at: string;
}

// Event to Puzzles
export interface EventPuzzle {
  id: string;
  event_id: string;
  puzzle_id: string;
  created_at: string;
}

// Helper types for creating records (without id and timestamps)
export type CreateStoryBeatCharacter = Omit<StoryBeatCharacter, 'id' | 'created_at'>;
export type CreateStoryBeatPuzzle = Omit<StoryBeatPuzzle, 'id' | 'created_at'>;
export type CreateStoryBeatLocation = Omit<StoryBeatLocation, 'id' | 'created_at'>;
export type CreatePuzzlePrerequisite = Omit<PuzzlePrerequisite, 'id' | 'created_at'>;
export type CreatePuzzleUnlock = Omit<PuzzleUnlock, 'id' | 'created_at'>;
export type CreateEventCharacter = Omit<EventCharacter, 'id' | 'created_at'>;
export type CreateEventLocation = Omit<EventLocation, 'id' | 'created_at'>;
export type CreateEventPuzzle = Omit<EventPuzzle, 'id' | 'created_at'>;
