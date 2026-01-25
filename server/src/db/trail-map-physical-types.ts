/**
 * TypeScript types for physical trail map layer
 */

export type PhysicalPointType = 'start' | 'waypoint' | 'checkpoint' | 'cache' | 'finale' | 'optional';

export type TravelMode = 'walking' | 'driving' | 'transit' | 'any';

// Coordinate interface
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface TrailMapPhysicalPoint {
  id: string;
  project_id: string;

  // Associations
  node_id: string | null; // Link to narrative node
  location_id: string | null; // Link to location entry

  // Point details
  name: string;
  latitude: number; // Decimal degrees
  longitude: number; // Decimal degrees
  radius_meters: number; // Detection radius

  point_type: PhysicalPointType | null;

  // Player instructions
  instructions: string | null;
  hint_if_stuck: string | null;

  // Physical interaction
  requires_physical_presence: number; // SQLite boolean (0 or 1)
  qr_code_data: string | null;
  nfc_tag_id: string | null;

  // Logistics
  accessibility_notes: string | null;
  travel_notes: string | null;

  // Management
  is_active: number; // SQLite boolean (0 or 1)
  sort_order: number;

  created_at: string;
  updated_at: string;
}

export interface TrailMapPhysicalRoute {
  id: string;
  project_id: string;

  from_point_id: string;
  to_point_id: string;

  travel_mode: TravelMode;

  // Travel estimates
  estimated_minutes: number | null;
  distance_meters: number | null;

  route_notes: string | null;

  created_at: string;
}

// Helper type for creating physical points (without id and timestamps)
export type CreatePhysicalPoint = Omit<TrailMapPhysicalPoint, 'id' | 'created_at' | 'updated_at'>;

// Helper type for updating physical points
export type UpdatePhysicalPoint = Partial<Omit<TrailMapPhysicalPoint, 'id' | 'project_id' | 'created_at'>>;

// Helper type for creating routes (without id and timestamp)
export type CreatePhysicalRoute = Omit<TrailMapPhysicalRoute, 'id' | 'created_at'>;

// Helper type for updating routes
export type UpdatePhysicalRoute = Partial<Omit<TrailMapPhysicalRoute, 'id' | 'project_id' | 'created_at'>>;

// Extended type with related data for display
export interface PhysicalPointWithRelations extends TrailMapPhysicalPoint {
  node?: {
    id: string;
    name: string;
    node_type: string;
  };
  location?: {
    id: string;
    name: string;
    location_type: string;
  };
  outgoing_routes?: TrailMapPhysicalRoute[];
  incoming_routes?: TrailMapPhysicalRoute[];
}

export interface PhysicalRouteWithRelations extends TrailMapPhysicalRoute {
  from_point?: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
  };
  to_point?: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
  };
}

// Helper functions for working with physical trail map data
export const PhysicalPointHelpers = {
  /**
   * Check if point is active
   */
  isActive(point: TrailMapPhysicalPoint): boolean {
    return point.is_active === 1;
  },

  /**
   * Check if physical presence is required
   */
  requiresPhysicalPresence(point: TrailMapPhysicalPoint): boolean {
    return point.requires_physical_presence === 1;
  },

  /**
   * Check if point has QR code
   */
  hasQRCode(point: TrailMapPhysicalPoint): boolean {
    return point.qr_code_data !== null && point.qr_code_data.trim() !== '';
  },

  /**
   * Check if point has NFC tag
   */
  hasNFCTag(point: TrailMapPhysicalPoint): boolean {
    return point.nfc_tag_id !== null && point.nfc_tag_id.trim() !== '';
  },

  /**
   * Get coordinates as object
   */
  getCoordinates(point: TrailMapPhysicalPoint): Coordinates {
    return {
      latitude: point.latitude,
      longitude: point.longitude,
    };
  },

  /**
   * Calculate distance between two points using Haversine formula (in meters)
   */
  calculateDistance(point1: Coordinates, point2: Coordinates): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = (point1.latitude * Math.PI) / 180;
    const φ2 = (point2.latitude * Math.PI) / 180;
    const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  },

  /**
   * Calculate distance between two physical points
   */
  distanceBetweenPoints(
    point1: TrailMapPhysicalPoint,
    point2: TrailMapPhysicalPoint
  ): number {
    return this.calculateDistance(
      this.getCoordinates(point1),
      this.getCoordinates(point2)
    );
  },

  /**
   * Check if coordinates are within detection radius
   */
  isWithinRadius(
    point: TrailMapPhysicalPoint,
    playerCoords: Coordinates
  ): boolean {
    const distance = this.calculateDistance(this.getCoordinates(point), playerCoords);
    return distance <= point.radius_meters;
  },

  /**
   * Format coordinates as string
   */
  formatCoordinates(point: TrailMapPhysicalPoint, precision: number = 6): string {
    return `${point.latitude.toFixed(precision)}, ${point.longitude.toFixed(precision)}`;
  },

  /**
   * Generate Google Maps link
   */
  getGoogleMapsLink(point: TrailMapPhysicalPoint): string {
    return `https://www.google.com/maps?q=${point.latitude},${point.longitude}`;
  },

  /**
   * Generate Apple Maps link
   */
  getAppleMapsLink(point: TrailMapPhysicalPoint): string {
    return `https://maps.apple.com/?q=${point.latitude},${point.longitude}`;
  },

  /**
   * Sort points by sort_order
   */
  sortByOrder(points: TrailMapPhysicalPoint[]): TrailMapPhysicalPoint[] {
    return [...points].sort((a, b) => a.sort_order - b.sort_order);
  },

  /**
   * Sort points by name
   */
  sortByName(points: TrailMapPhysicalPoint[]): TrailMapPhysicalPoint[] {
    return [...points].sort((a, b) => a.name.localeCompare(b.name));
  },

  /**
   * Sort points by distance from given coordinates (nearest first)
   */
  sortByDistance(
    points: TrailMapPhysicalPoint[],
    fromCoords: Coordinates
  ): TrailMapPhysicalPoint[] {
    return [...points].sort((a, b) => {
      const distA = this.calculateDistance(this.getCoordinates(a), fromCoords);
      const distB = this.calculateDistance(this.getCoordinates(b), fromCoords);
      return distA - distB;
    });
  },

  /**
   * Filter points by type
   */
  filterByType(
    points: TrailMapPhysicalPoint[],
    type: PhysicalPointType | PhysicalPointType[]
  ): TrailMapPhysicalPoint[] {
    const types = Array.isArray(type) ? type : [type];
    return points.filter(p => p.point_type && types.includes(p.point_type));
  },

  /**
   * Filter active points
   */
  filterActive(points: TrailMapPhysicalPoint[]): TrailMapPhysicalPoint[] {
    return points.filter(p => this.isActive(p));
  },

  /**
   * Filter points within radius of given coordinates
   */
  filterNearby(
    points: TrailMapPhysicalPoint[],
    coords: Coordinates,
    maxDistanceMeters: number
  ): TrailMapPhysicalPoint[] {
    return points.filter(p => {
      const distance = this.calculateDistance(this.getCoordinates(p), coords);
      return distance <= maxDistanceMeters;
    });
  },

  /**
   * Get points with QR codes
   */
  filterWithQRCode(points: TrailMapPhysicalPoint[]): TrailMapPhysicalPoint[] {
    return points.filter(p => this.hasQRCode(p));
  },

  /**
   * Get points with NFC tags
   */
  filterWithNFC(points: TrailMapPhysicalPoint[]): TrailMapPhysicalPoint[] {
    return points.filter(p => this.hasNFCTag(p));
  },

  /**
   * Group points by type
   */
  groupByType(
    points: TrailMapPhysicalPoint[]
  ): Record<PhysicalPointType | 'untyped', TrailMapPhysicalPoint[]> {
    const groups: Record<string, TrailMapPhysicalPoint[]> = {
      start: [],
      waypoint: [],
      checkpoint: [],
      cache: [],
      finale: [],
      optional: [],
      untyped: [],
    };

    points.forEach(point => {
      const key = point.point_type || 'untyped';
      groups[key].push(point);
    });

    return groups as Record<PhysicalPointType | 'untyped', TrailMapPhysicalPoint[]>;
  },

  /**
   * Validate point data
   */
  validate(point: Partial<TrailMapPhysicalPoint>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!point.name || point.name.trim() === '') {
      errors.push('Name is required');
    }

    if (point.name && point.name.length > 255) {
      errors.push('Name must be 255 characters or less');
    }

    if (point.latitude !== undefined) {
      if (isNaN(point.latitude)) {
        errors.push('Invalid latitude value');
      } else if (point.latitude < -90 || point.latitude > 90) {
        errors.push('Latitude must be between -90 and 90');
      }
    }

    if (point.longitude !== undefined) {
      if (isNaN(point.longitude)) {
        errors.push('Invalid longitude value');
      } else if (point.longitude < -180 || point.longitude > 180) {
        errors.push('Longitude must be between -180 and 180');
      }
    }

    if (point.radius_meters !== undefined && point.radius_meters < 0) {
      errors.push('Radius must be non-negative');
    }

    if (point.sort_order !== undefined && point.sort_order < 0) {
      errors.push('Sort order must be non-negative');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },
};

// Helper functions for working with physical route data
export const PhysicalRouteHelpers = {
  /**
   * Format distance in human-readable format
   */
  formatDistance(meters: number | null): string {
    if (meters === null) return 'Unknown';
    if (meters < 1000) {
      return `${meters}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  },

  /**
   * Format estimated time
   */
  formatEstimatedTime(minutes: number | null): string {
    if (minutes === null) return 'Unknown';
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  },

  /**
   * Calculate walking speed (meters per minute)
   */
  getWalkingSpeed(): number {
    return 80; // Average: ~4.8 km/h = 80 m/min
  },

  /**
   * Estimate walking time based on distance
   */
  estimateWalkingTime(distanceMeters: number): number {
    return Math.ceil(distanceMeters / this.getWalkingSpeed());
  },

  /**
   * Sort routes by distance (shortest first)
   */
  sortByDistance(routes: TrailMapPhysicalRoute[]): TrailMapPhysicalRoute[] {
    return [...routes].sort((a, b) => {
      const distA = a.distance_meters || Infinity;
      const distB = b.distance_meters || Infinity;
      return distA - distB;
    });
  },

  /**
   * Sort routes by estimated time (fastest first)
   */
  sortByTime(routes: TrailMapPhysicalRoute[]): TrailMapPhysicalRoute[] {
    return [...routes].sort((a, b) => {
      const timeA = a.estimated_minutes || Infinity;
      const timeB = b.estimated_minutes || Infinity;
      return timeA - timeB;
    });
  },

  /**
   * Filter routes by travel mode
   */
  filterByMode(
    routes: TrailMapPhysicalRoute[],
    mode: TravelMode | TravelMode[]
  ): TrailMapPhysicalRoute[] {
    const modes = Array.isArray(mode) ? mode : [mode];
    return routes.filter(r => modes.includes(r.travel_mode));
  },

  /**
   * Get routes from a specific point
   */
  getFromPoint(
    routes: TrailMapPhysicalRoute[],
    pointId: string
  ): TrailMapPhysicalRoute[] {
    return routes.filter(r => r.from_point_id === pointId);
  },

  /**
   * Get routes to a specific point
   */
  getToPoint(
    routes: TrailMapPhysicalRoute[],
    pointId: string
  ): TrailMapPhysicalRoute[] {
    return routes.filter(r => r.to_point_id === pointId);
  },

  /**
   * Find route between two points
   */
  findRoute(
    routes: TrailMapPhysicalRoute[],
    fromPointId: string,
    toPointId: string,
    mode?: TravelMode
  ): TrailMapPhysicalRoute | undefined {
    return routes.find(r =>
      r.from_point_id === fromPointId &&
      r.to_point_id === toPointId &&
      (!mode || r.travel_mode === mode)
    );
  },

  /**
   * Get total route distance
   */
  getTotalDistance(routes: TrailMapPhysicalRoute[]): number {
    return routes.reduce((sum, route) => sum + (route.distance_meters || 0), 0);
  },

  /**
   * Get total route time
   */
  getTotalTime(routes: TrailMapPhysicalRoute[]): number {
    return routes.reduce((sum, route) => sum + (route.estimated_minutes || 0), 0);
  },

  /**
   * Validate route data
   */
  validate(route: Partial<TrailMapPhysicalRoute>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!route.from_point_id) {
      errors.push('From point ID is required');
    }

    if (!route.to_point_id) {
      errors.push('To point ID is required');
    }

    if (route.from_point_id === route.to_point_id) {
      errors.push('From and to points cannot be the same');
    }

    if (route.estimated_minutes !== undefined && route.estimated_minutes !== null && route.estimated_minutes < 0) {
      errors.push('Estimated time must be non-negative');
    }

    if (route.distance_meters !== undefined && route.distance_meters !== null && route.distance_meters < 0) {
      errors.push('Distance must be non-negative');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },
};
