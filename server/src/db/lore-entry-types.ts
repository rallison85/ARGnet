/**
 * TypeScript types for enhanced lore entries
 */

export type LoreCategory =
  | 'history'
  | 'science'
  | 'culture'
  | 'geography'
  | 'organizations'
  | 'technology'
  | 'religion'
  | 'language'
  | 'economy'
  | 'characters'
  | 'other';

export type CanonicalStatus = 'canon' | 'semi_canon' | 'retconned' | 'speculation';

export interface LoreEntry {
  id: string;
  project_id: string;
  parent_entry_id: string | null;

  title: string;
  category: LoreCategory | null;
  subcategory: string | null;
  content: string | null;

  // Metadata
  tags: string | null; // JSON array
  timeline_position: string | null;

  // Canonical status
  canonical_status: CanonicalStatus;
  in_world_source: string | null;
  contradiction_notes: string | null;

  // Reveal tracking
  is_revealed_to_players: number; // SQLite boolean (0 or 1)
  revealed_at: string | null; // ISO datetime
  reveal_method: string | null;

  // Relations
  related_characters: string | null; // JSON array
  related_locations: string | null; // JSON array

  // Organization
  sort_order: number;

  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Parsed version with JSON fields as objects/arrays
export interface LoreEntryParsed extends Omit<LoreEntry, 'tags' | 'related_characters' | 'related_locations'> {
  tags: string[] | null;
  related_characters: string[] | null;
  related_locations: string[] | null;
}

// Helper type for creating lore entries (without id and timestamps)
export type CreateLoreEntry = Omit<LoreEntry, 'id' | 'created_at' | 'updated_at'>;

// Helper type for updating lore entries
export type UpdateLoreEntry = Partial<Omit<LoreEntry, 'id' | 'project_id' | 'created_at'>>;

// Extended type with related data for display
export interface LoreEntryWithRelations extends LoreEntryParsed {
  created_by_username?: string;
  created_by_name?: string;
  parent_entry_title?: string;
  child_entries?: Array<{
    id: string;
    title: string;
    category: LoreCategory | null;
    sort_order: number;
  }>;
  characters?: Array<{
    id: string;
    name: string;
    avatar_url: string | null;
  }>;
  locations?: Array<{
    id: string;
    name: string;
    location_type: string;
  }>;
  days_since_revealed?: number;
}

// Helper functions for working with lore entry data
export const LoreEntryHelpers = {
  /**
   * Parse JSON fields from database lore entry record
   */
  parse(entry: LoreEntry): LoreEntryParsed {
    return {
      ...entry,
      tags: entry.tags ? JSON.parse(entry.tags) : null,
      related_characters: entry.related_characters ? JSON.parse(entry.related_characters) : null,
      related_locations: entry.related_locations ? JSON.parse(entry.related_locations) : null,
    };
  },

  /**
   * Stringify parsed lore entry for database storage
   */
  stringify(entry: Partial<LoreEntryParsed>): Partial<LoreEntry> {
    const result: Partial<LoreEntry> = { ...entry } as any;

    if (entry.tags !== undefined) {
      result.tags = entry.tags ? JSON.stringify(entry.tags) : null;
    }
    if (entry.related_characters !== undefined) {
      result.related_characters = entry.related_characters
        ? JSON.stringify(entry.related_characters)
        : null;
    }
    if (entry.related_locations !== undefined) {
      result.related_locations = entry.related_locations
        ? JSON.stringify(entry.related_locations)
        : null;
    }

    return result;
  },

  /**
   * Check if entry is revealed to players
   */
  isRevealed(entry: LoreEntry | LoreEntryParsed): boolean {
    return entry.is_revealed_to_players === 1;
  },

  /**
   * Check if entry is canonical
   */
  isCanonical(entry: LoreEntry | LoreEntryParsed): boolean {
    return entry.canonical_status === 'canon';
  },

  /**
   * Check if entry has been retconned
   */
  isRetconned(entry: LoreEntry | LoreEntryParsed): boolean {
    return entry.canonical_status === 'retconned';
  },

  /**
   * Check if entry is speculation/uncertain
   */
  isSpeculation(entry: LoreEntry | LoreEntryParsed): boolean {
    return entry.canonical_status === 'speculation';
  },

  /**
   * Check if entry has a parent (is a sub-entry)
   */
  hasParent(entry: LoreEntry | LoreEntryParsed): boolean {
    return entry.parent_entry_id !== null;
  },

  /**
   * Check if entry has contradictions noted
   */
  hasContradictions(entry: LoreEntry | LoreEntryParsed): boolean {
    return entry.contradiction_notes !== null && entry.contradiction_notes.trim() !== '';
  },

  /**
   * Get days since revealed
   */
  getDaysSinceRevealed(entry: LoreEntry | LoreEntryParsed, now: Date = new Date()): number | null {
    if (!entry.revealed_at) {
      return null;
    }
    const revealed = new Date(entry.revealed_at);
    const diff = now.getTime() - revealed.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  },

  /**
   * Sort entries by sort_order
   */
  sortByOrder(entries: (LoreEntry | LoreEntryParsed)[]): typeof entries {
    return [...entries].sort((a, b) => a.sort_order - b.sort_order);
  },

  /**
   * Sort entries by title
   */
  sortByTitle(entries: (LoreEntry | LoreEntryParsed)[]): typeof entries {
    return [...entries].sort((a, b) => a.title.localeCompare(b.title));
  },

  /**
   * Sort entries by creation date (most recent first)
   */
  sortByDate(entries: (LoreEntry | LoreEntryParsed)[]): typeof entries {
    return [...entries].sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  },

  /**
   * Filter entries by category
   */
  filterByCategory(
    entries: (LoreEntry | LoreEntryParsed)[],
    category: LoreCategory | LoreCategory[]
  ): typeof entries {
    const categories = Array.isArray(category) ? category : [category];
    return entries.filter(e => e.category && categories.includes(e.category));
  },

  /**
   * Filter entries by canonical status
   */
  filterByStatus(
    entries: (LoreEntry | LoreEntryParsed)[],
    status: CanonicalStatus | CanonicalStatus[]
  ): typeof entries {
    const statuses = Array.isArray(status) ? status : [status];
    return entries.filter(e => statuses.includes(e.canonical_status));
  },

  /**
   * Filter revealed entries
   */
  filterRevealed(entries: (LoreEntry | LoreEntryParsed)[]): typeof entries {
    return entries.filter(e => this.isRevealed(e));
  },

  /**
   * Filter unrevealed entries
   */
  filterUnrevealed(entries: (LoreEntry | LoreEntryParsed)[]): typeof entries {
    return entries.filter(e => !this.isRevealed(e));
  },

  /**
   * Filter canonical entries only
   */
  filterCanonical(entries: (LoreEntry | LoreEntryParsed)[]): typeof entries {
    return entries.filter(e => this.isCanonical(e));
  },

  /**
   * Filter top-level entries (no parent)
   */
  filterTopLevel(entries: (LoreEntry | LoreEntryParsed)[]): typeof entries {
    return entries.filter(e => !this.hasParent(e));
  },

  /**
   * Get child entries of a specific parent
   */
  getChildren(
    entries: (LoreEntry | LoreEntryParsed)[],
    parentId: string
  ): typeof entries {
    return entries.filter(e => e.parent_entry_id === parentId);
  },

  /**
   * Filter entries by tag
   */
  filterByTag(entries: LoreEntryParsed[], tag: string): LoreEntryParsed[] {
    return entries.filter(e => e.tags && e.tags.includes(tag));
  },

  /**
   * Get all unique tags from entries
   */
  getAllTags(entries: LoreEntryParsed[]): string[] {
    const tagSet = new Set<string>();
    entries.forEach(entry => {
      if (entry.tags) {
        entry.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  },

  /**
   * Get all unique categories from entries
   */
  getAllCategories(entries: (LoreEntry | LoreEntryParsed)[]): LoreCategory[] {
    const categories = new Set<LoreCategory>();
    entries.forEach(entry => {
      if (entry.category) {
        categories.add(entry.category);
      }
    });
    return Array.from(categories).sort();
  },

  /**
   * Get all unique subcategories for a category
   */
  getSubcategories(
    entries: (LoreEntry | LoreEntryParsed)[],
    category: LoreCategory
  ): string[] {
    const subcategories = new Set<string>();
    entries.forEach(entry => {
      if (entry.category === category && entry.subcategory) {
        subcategories.add(entry.subcategory);
      }
    });
    return Array.from(subcategories).sort();
  },

  /**
   * Build hierarchical tree structure from flat list
   */
  buildTree(entries: LoreEntryParsed[]): LoreEntryWithRelations[] {
    const topLevel = this.filterTopLevel(entries);
    const sorted = this.sortByOrder(topLevel);

    return sorted.map(entry => {
      const children = this.getChildren(entries, entry.id);
      return {
        ...entry,
        child_entries: this.sortByOrder(children).map(child => ({
          id: child.id,
          title: child.title,
          category: child.category,
          sort_order: child.sort_order,
        })),
      };
    });
  },

  /**
   * Get breadcrumb path from entry to root
   */
  getBreadcrumbs(
    entries: (LoreEntry | LoreEntryParsed)[],
    entryId: string
  ): Array<{ id: string; title: string }> {
    const breadcrumbs: Array<{ id: string; title: string }> = [];
    let currentId: string | null = entryId;

    while (currentId) {
      const entry = entries.find(e => e.id === currentId);
      if (!entry) break;

      breadcrumbs.unshift({ id: entry.id, title: entry.title });
      currentId = entry.parent_entry_id;
    }

    return breadcrumbs;
  },

  /**
   * Search entries by keyword (searches title, content, tags)
   */
  search(entries: LoreEntryParsed[], keyword: string): LoreEntryParsed[] {
    const lowerKeyword = keyword.toLowerCase();
    return entries.filter(entry => {
      const titleMatch = entry.title.toLowerCase().includes(lowerKeyword);
      const contentMatch = entry.content?.toLowerCase().includes(lowerKeyword);
      const tagMatch = entry.tags?.some(tag => tag.toLowerCase().includes(lowerKeyword));

      return titleMatch || contentMatch || tagMatch;
    });
  },

  /**
   * Get entries by creator
   */
  getByCreator(
    entries: (LoreEntry | LoreEntryParsed)[],
    userId: string
  ): typeof entries {
    return entries.filter(e => e.created_by === userId);
  },

  /**
   * Get recently revealed entries
   */
  getRecentlyRevealed(
    entries: (LoreEntry | LoreEntryParsed)[],
    days: number = 7
  ): typeof entries {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return entries.filter(e => {
      if (!e.revealed_at) return false;
      return new Date(e.revealed_at) > cutoff;
    });
  },

  /**
   * Get entries needing attention (unrevealed but should be)
   */
  getNeedingReveal(entries: (LoreEntry | LoreEntryParsed)[]): typeof entries {
    // Entries that have a reveal method planned but haven't been revealed yet
    return entries.filter(e => !this.isRevealed(e) && e.reveal_method !== null);
  },

  /**
   * Get entries with contradictions
   */
  getWithContradictions(entries: (LoreEntry | LoreEntryParsed)[]): typeof entries {
    return entries.filter(e => this.hasContradictions(e));
  },

  /**
   * Group entries by category
   */
  groupByCategory(
    entries: (LoreEntry | LoreEntryParsed)[]
  ): Record<LoreCategory | 'uncategorized', typeof entries> {
    const groups: Record<string, typeof entries> = {};

    entries.forEach(entry => {
      const key = entry.category || 'uncategorized';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(entry);
    });

    return groups as Record<LoreCategory | 'uncategorized', typeof entries>;
  },

  /**
   * Get timeline of entries (sorted by timeline_position)
   */
  getTimeline(entries: (LoreEntry | LoreEntryParsed)[]): typeof entries {
    return entries
      .filter(e => e.timeline_position !== null)
      .sort((a, b) => {
        // Simple string comparison - could be enhanced for complex timeline formats
        if (!a.timeline_position) return 1;
        if (!b.timeline_position) return -1;
        return a.timeline_position.localeCompare(b.timeline_position);
      });
  },

  /**
   * Validate lore entry data
   */
  validate(entry: Partial<LoreEntry>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!entry.title || entry.title.trim() === '') {
      errors.push('Title is required');
    }

    if (entry.title && entry.title.length > 255) {
      errors.push('Title must be 255 characters or less');
    }

    if (entry.sort_order !== undefined && entry.sort_order < 0) {
      errors.push('Sort order must be non-negative');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },
};
