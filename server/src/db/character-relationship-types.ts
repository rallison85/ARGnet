/**
 * TypeScript types for character relationships
 */

export type RelationshipType =
  | 'ally'
  | 'enemy'
  | 'family'
  | 'romantic'
  | 'professional'
  | 'secret_identity'
  | 'reports_to'
  | 'controls'
  | 'unknown_to'
  | 'custom';

export interface CharacterRelationship {
  id: string;
  project_id: string;
  character_a_id: string;
  character_b_id: string;
  relationship_type: RelationshipType;
  relationship_label: string | null; // Display label (e.g., "brother of", "secretly works for")
  is_bidirectional: number; // SQLite boolean (0 or 1)
  is_known_to_players: number; // SQLite boolean (0 or 1)
  description: string | null; // Internal notes
  created_at: string;
  updated_at: string;
}

// Helper type for creating relationships (without id and timestamps)
export type CreateCharacterRelationship = Omit<CharacterRelationship, 'id' | 'created_at' | 'updated_at'>;

// Helper type for updating relationships
export type UpdateCharacterRelationship = Partial<Omit<CharacterRelationship, 'id' | 'project_id' | 'created_at'>>;

// Extended type with character details for display
export interface CharacterRelationshipWithDetails extends CharacterRelationship {
  character_a_name?: string;
  character_a_avatar_url?: string;
  character_b_name?: string;
  character_b_avatar_url?: string;
}
