/**
 * TypeScript types for enhanced locations
 */

export type LocationType =
  | 'physical_permanent'
  | 'physical_temporary'
  | 'physical_mobile'
  | 'virtual_website'
  | 'virtual_social'
  | 'virtual_platform'
  | 'hybrid'
  | 'fictional_referenced'
  | 'fictional_detailed'
  | 'physical' // Legacy
  | 'virtual' // Legacy
  | 'fictional'; // Legacy

export type LocationStatus =
  | 'planned'
  | 'scouted'
  | 'confirmed'
  | 'active'
  | 'archived';

export type PermissionStatus =
  | 'not_needed'
  | 'obtained'
  | 'pending'
  | 'denied';

// Hours of operation structure (stored as JSON)
export interface HoursOfOperation {
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  sunday?: string;
  notes?: string;
  timezone?: string;
  [key: string]: string | undefined;
}

// GPS Coordinates helper
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Location {
  id: string;
  project_id: string;

  name: string;
  location_type: LocationType | null;

  // Physical location
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  plus_code: string | null; // Google Plus Code

  // Virtual location
  url: string | null;
  access_instructions: string | null;

  // Hours and contact
  hours_of_operation: string | null; // JSON string
  contact_info: string | null;

  // Details
  description: string | null;
  significance: string | null; // Why this location matters
  imagery: string | null; // JSON array of image URLs

  // Accessibility and safety
  accessibility_notes: string | null;
  safety_notes: string | null;

  // Permissions
  permissions_required: string | null; // Legacy field
  permission_status: PermissionStatus;
  permission_documentation: string | null;

  // Planning
  scouting_notes: string | null;
  weather_sensitive: number; // SQLite boolean (0 or 1)
  backup_location_id: string | null;

  // Classification
  is_fictional: number; // SQLite boolean (0 or 1)

  // Usage
  events: string | null; // JSON array of event IDs (legacy)

  // Status
  status: LocationStatus;

  created_at: string;
  updated_at: string;
}

// Parsed version with JSON fields as objects/arrays
export interface LocationParsed extends Omit<Location, 'hours_of_operation' | 'imagery' | 'events'> {
  hours_of_operation: HoursOfOperation | null;
  imagery: string[] | null;
  events: string[] | null;
  coordinates?: Coordinates | null; // Computed field
}

// Helper type for creating locations (without id and timestamps)
export type CreateLocation = Omit<Location, 'id' | 'created_at' | 'updated_at'>;

// Helper type for updating locations
export type UpdateLocation = Partial<Omit<Location, 'id' | 'project_id' | 'created_at'>>;

// Extended type with related data for display
export interface LocationWithRelations extends LocationParsed {
  backup_location_name?: string;
  linked_story_beats?: Array<{
    id: string;
    title: string;
  }>;
  linked_events?: Array<{
    id: string;
    title: string;
    is_primary: boolean;
  }>;
  event_count?: number;
  distance_from?: number; // Distance from reference point (in km or miles)
}

// Helper functions for working with location data
export const LocationHelpers = {
  /**
   * Parse JSON fields from database location record
   */
  parse(location: Location): LocationParsed {
    const parsed: LocationParsed = {
      ...location,
      hours_of_operation: location.hours_of_operation
        ? JSON.parse(location.hours_of_operation)
        : null,
      imagery: location.imagery ? JSON.parse(location.imagery) : null,
      events: location.events ? JSON.parse(location.events) : null,
    };

    // Add computed coordinates field
    if (location.latitude !== null && location.longitude !== null) {
      parsed.coordinates = {
        latitude: location.latitude,
        longitude: location.longitude,
      };
    }

    return parsed;
  },

  /**
   * Stringify parsed location for database storage
   */
  stringify(location: Partial<LocationParsed>): Partial<Location> {
    const result: Partial<Location> = { ...location } as any;

    if (location.hours_of_operation !== undefined) {
      result.hours_of_operation = location.hours_of_operation
        ? JSON.stringify(location.hours_of_operation)
        : null;
    }
    if (location.imagery !== undefined) {
      result.imagery = location.imagery ? JSON.stringify(location.imagery) : null;
    }
    if (location.events !== undefined) {
      result.events = location.events ? JSON.stringify(location.events) : null;
    }

    // Remove computed fields
    delete (result as any).coordinates;

    return result;
  },

  /**
   * Check if location is physical (has coordinates)
   */
  isPhysical(location: Location | LocationParsed): boolean {
    return location.latitude !== null && location.longitude !== null;
  },

  /**
   * Check if location is virtual
   */
  isVirtual(location: Location | LocationParsed): boolean {
    if (location.location_type) {
      return location.location_type.startsWith('virtual');
    }
    return location.url !== null;
  },

  /**
   * Check if location is fictional
   */
  isFictional(location: Location | LocationParsed): boolean {
    return location.is_fictional === 1;
  },

  /**
   * Calculate distance between two locations (Haversine formula)
   * Returns distance in kilometers
   */
  calculateDistance(loc1: Coordinates, loc2: Coordinates): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(loc2.latitude - loc1.latitude);
    const dLon = this.toRadians(loc2.longitude - loc1.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(loc1.latitude)) *
        Math.cos(this.toRadians(loc2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  /**
   * Convert degrees to radians
   */
  toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  },

  /**
   * Generate Google Maps URL for location
   */
  getGoogleMapsUrl(location: Location | LocationParsed): string | null {
    if (location.latitude !== null && location.longitude !== null) {
      return `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
    }
    if (location.address) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address)}`;
    }
    return null;
  },

  /**
   * Generate Apple Maps URL for location
   */
  getAppleMapsUrl(location: Location | LocationParsed): string | null {
    if (location.latitude !== null && location.longitude !== null) {
      return `https://maps.apple.com/?q=${location.latitude},${location.longitude}`;
    }
    if (location.address) {
      return `https://maps.apple.com/?address=${encodeURIComponent(location.address)}`;
    }
    return null;
  },

  /**
   * Check if location is currently open (simplified)
   * Returns true if no hours specified (always open) or if within hours
   */
  isOpen(location: LocationParsed, time: Date = new Date()): boolean {
    if (!location.hours_of_operation) {
      return true; // No hours means always open
    }

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[time.getDay()];
    const hours = location.hours_of_operation[dayName];

    if (!hours) {
      return false; // No hours for this day means closed
    }

    // Simplified check - actual implementation would parse time ranges
    return hours.toLowerCase() !== 'closed';
  },

  /**
   * Check if permission is granted
   */
  hasPermission(location: Location | LocationParsed): boolean {
    return (
      location.permission_status === 'not_needed' ||
      location.permission_status === 'obtained'
    );
  },

  /**
   * Sort locations by distance from a reference point
   */
  sortByDistance(
    locations: LocationParsed[],
    reference: Coordinates
  ): LocationParsed[] {
    return [...locations]
      .filter(loc => loc.coordinates)
      .map(loc => ({
        ...loc,
        distance_from: loc.coordinates
          ? this.calculateDistance(reference, loc.coordinates)
          : Infinity,
      }))
      .sort((a, b) => (a.distance_from || 0) - (b.distance_from || 0));
  }
};
