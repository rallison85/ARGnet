/**
 * TypeScript types for enhanced digital properties
 */

export type DigitalPropertyType =
  | 'website'
  | 'social_media'
  | 'email'
  | 'phone'
  | 'app'
  | 'document'
  | 'video_channel'
  | 'podcast'
  | 'discord_server'
  | 'forum'
  | 'blog'
  | 'newsletter'
  | 'other';

export type DigitalPropertyStatus =
  | 'planning'
  | 'created'
  | 'active'
  | 'dormant'
  | 'archived';

export interface DigitalProperty {
  id: string;
  project_id: string;
  name: string;
  property_type: DigitalPropertyType;

  // Details
  url: string | null;
  platform: string | null; // e.g., "twitter", "instagram", "tiktok"
  username: string | null;
  description: string | null;
  purpose: string | null; // What this property is used for in the ARG

  // In-world details
  character_id: string | null; // Who "owns" this in the narrative
  creation_date: string | null; // Date when account was made (for aging)
  backstory: string | null; // In-world history

  // Operations
  managed_by_user_ids: string | null; // JSON array of user IDs
  content_guidelines: string | null;
  posting_schedule: string | null; // Legacy field
  posting_frequency: string | null; // e.g., "2-3 times per week"

  // Cross-promotion
  linked_property_ids: string | null; // JSON array of property IDs

  // Metrics
  follower_count: number | null;
  follower_goal: number | null;
  verification_status: number; // SQLite boolean (0 or 1)
  last_post_at: string | null; // ISO datetime

  // Access
  credentials: string | null; // Legacy: Encrypted JSON (deprecated)
  credentials_reference: string | null; // Reference to password manager entry

  // Status
  status: DigitalPropertyStatus;
  launch_date: string | null; // Date

  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Parsed version with JSON fields as objects/arrays
export interface DigitalPropertyParsed extends Omit<DigitalProperty,
  'managed_by_user_ids' | 'linked_property_ids'
> {
  managed_by_user_ids: string[] | null;
  linked_property_ids: string[] | null;
}

// Helper type for creating digital properties (without id and timestamps)
export type CreateDigitalProperty = Omit<DigitalProperty, 'id' | 'created_at' | 'updated_at'>;

// Helper type for updating digital properties
export type UpdateDigitalProperty = Partial<Omit<DigitalProperty, 'id' | 'project_id' | 'created_at'>>;

// Extended type with related data for display
export interface DigitalPropertyWithRelations extends DigitalPropertyParsed {
  created_by_username?: string;
  created_by_name?: string;
  character_name?: string;
  character_avatar_url?: string;
  managers?: Array<{
    id: string;
    username: string;
    display_name: string;
  }>;
  linked_properties?: Array<{
    id: string;
    name: string;
    property_type: DigitalPropertyType;
    url: string | null;
  }>;
  days_since_launch?: number;
  days_since_last_post?: number;
  follower_progress_percent?: number;
}

// Helper functions for working with digital property data
export const DigitalPropertyHelpers = {
  /**
   * Parse JSON fields from database digital property record
   */
  parse(property: DigitalProperty): DigitalPropertyParsed {
    return {
      ...property,
      managed_by_user_ids: property.managed_by_user_ids
        ? JSON.parse(property.managed_by_user_ids)
        : null,
      linked_property_ids: property.linked_property_ids
        ? JSON.parse(property.linked_property_ids)
        : null,
    };
  },

  /**
   * Stringify parsed digital property for database storage
   */
  stringify(property: Partial<DigitalPropertyParsed>): Partial<DigitalProperty> {
    const result: Partial<DigitalProperty> = { ...property } as any;

    if (property.managed_by_user_ids !== undefined) {
      result.managed_by_user_ids = property.managed_by_user_ids
        ? JSON.stringify(property.managed_by_user_ids)
        : null;
    }
    if (property.linked_property_ids !== undefined) {
      result.linked_property_ids = property.linked_property_ids
        ? JSON.stringify(property.linked_property_ids)
        : null;
    }

    return result;
  },

  /**
   * Check if property is verified
   */
  isVerified(property: DigitalProperty | DigitalPropertyParsed): boolean {
    return property.verification_status === 1;
  },

  /**
   * Check if property is active
   */
  isActive(property: DigitalProperty | DigitalPropertyParsed): boolean {
    return property.status === 'active';
  },

  /**
   * Check if property is social media
   */
  isSocialMedia(property: DigitalProperty | DigitalPropertyParsed): boolean {
    return property.property_type === 'social_media';
  },

  /**
   * Get days since launch
   */
  getDaysSinceLaunch(property: DigitalProperty | DigitalPropertyParsed, now: Date = new Date()): number | null {
    if (!property.launch_date) {
      return null;
    }
    const launch = new Date(property.launch_date);
    const diff = now.getTime() - launch.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  },

  /**
   * Get days since last post
   */
  getDaysSinceLastPost(property: DigitalProperty | DigitalPropertyParsed, now: Date = new Date()): number | null {
    if (!property.last_post_at) {
      return null;
    }
    const lastPost = new Date(property.last_post_at);
    const diff = now.getTime() - lastPost.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  },

  /**
   * Calculate follower progress percentage
   */
  getFollowerProgress(property: DigitalProperty | DigitalPropertyParsed): number | null {
    if (property.follower_count === null || property.follower_goal === null || property.follower_goal === 0) {
      return null;
    }
    return Math.min(100, (property.follower_count / property.follower_goal) * 100);
  },

  /**
   * Check if property needs attention (inactive for too long)
   */
  needsAttention(property: DigitalProperty | DigitalPropertyParsed, daysThreshold: number = 7): boolean {
    if (property.status !== 'active') {
      return false;
    }
    const daysSincePost = this.getDaysSinceLastPost(property);
    if (daysSincePost === null) {
      // No posts yet - needs attention if launched more than threshold days ago
      const daysSinceLaunch = this.getDaysSinceLaunch(property);
      return daysSinceLaunch !== null && daysSinceLaunch > daysThreshold;
    }
    return daysSincePost > daysThreshold;
  },

  /**
   * Get platform-specific URL if available
   */
  getPlatformUrl(property: DigitalProperty | DigitalPropertyParsed): string | null {
    if (property.url) {
      return property.url;
    }

    // Generate URLs for common platforms based on username
    if (property.username && property.platform) {
      const platform = property.platform.toLowerCase();
      switch (platform) {
        case 'twitter':
        case 'x':
          return `https://twitter.com/${property.username.replace('@', '')}`;
        case 'instagram':
          return `https://instagram.com/${property.username.replace('@', '')}`;
        case 'tiktok':
          return `https://tiktok.com/@${property.username.replace('@', '')}`;
        case 'facebook':
          return `https://facebook.com/${property.username}`;
        case 'youtube':
          return `https://youtube.com/@${property.username.replace('@', '')}`;
        case 'reddit':
          return `https://reddit.com/u/${property.username.replace('u/', '')}`;
        case 'discord':
          // Discord usernames don't have direct URLs
          return null;
        default:
          return null;
      }
    }

    return null;
  },

  /**
   * Check if user can manage this property
   */
  canManage(property: DigitalPropertyParsed, userId: string): boolean {
    if (!property.managed_by_user_ids || property.managed_by_user_ids.length === 0) {
      return true; // No restrictions means anyone can manage
    }
    return property.managed_by_user_ids.includes(userId);
  },

  /**
   * Sort properties by follower count (descending)
   */
  sortByFollowers(properties: (DigitalProperty | DigitalPropertyParsed)[]): typeof properties {
    return [...properties].sort((a, b) => {
      const aCount = a.follower_count || 0;
      const bCount = b.follower_count || 0;
      return bCount - aCount;
    });
  },

  /**
   * Sort properties by last post date (most recent first)
   */
  sortByActivity(properties: (DigitalProperty | DigitalPropertyParsed)[]): typeof properties {
    return [...properties].sort((a, b) => {
      if (!a.last_post_at) return 1;
      if (!b.last_post_at) return -1;
      return new Date(b.last_post_at).getTime() - new Date(a.last_post_at).getTime();
    });
  },

  /**
   * Filter properties by type
   */
  filterByType(
    properties: (DigitalProperty | DigitalPropertyParsed)[],
    type: DigitalPropertyType
  ): typeof properties {
    return properties.filter(p => p.property_type === type);
  },

  /**
   * Get properties managed by a specific user
   */
  getManagedBy(
    properties: DigitalPropertyParsed[],
    userId: string
  ): DigitalPropertyParsed[] {
    return properties.filter(p => this.canManage(p, userId));
  }
};
