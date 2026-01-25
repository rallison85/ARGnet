/**
 * TypeScript types for enhanced events
 */

export type EventType =
  | 'performance'
  | 'installation'
  | 'meetup'
  | 'drop'
  | 'broadcast'
  | 'online'
  | 'hybrid'
  | 'dead_drop'
  | 'phone_call'
  | 'livestream'
  | 'puzzle_release'
  | 'content_update'
  | 'player_milestone';

export type EventStatus =
  | 'planning'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'postponed';

export type EventVisibility =
  | 'public'
  | 'secret'
  | 'invite_only';

// Contingency plan structure (stored as JSON)
export interface ContingencyPlan {
  scenario: string;
  response: string;
}

export interface Event {
  id: string;
  project_id: string;
  story_beat_id: string | null;
  location_id: string | null;

  title: string;
  event_type: EventType | null;
  description: string | null;

  // Timing
  scheduled_start: string | null; // ISO datetime
  scheduled_end: string | null; // ISO datetime
  timezone: string;

  // Location (physical and virtual)
  virtual_location_url: string | null;

  // Team
  assigned_team_members: string | null; // JSON array of user IDs

  // Participant info
  min_attendees: number | null;
  max_participants: number | null;
  registration_required: number; // SQLite boolean (0 or 1) - legacy
  rsvp_required: number; // SQLite boolean (0 or 1)
  registration_url: string | null;
  visibility: EventVisibility;

  // Resources
  equipment_needed: string | null; // JSON array of items
  budget_cents: number | null; // Budget in cents

  // Planning
  script: string | null; // Legacy field
  runsheet: string | null; // Detailed minute-by-minute plan
  requirements: string | null; // Legacy field
  contingencies: string | null; // Legacy field (text)
  contingency_plans: string | null; // JSON array of ContingencyPlan
  post_event_tasks: string | null; // JSON array of tasks
  staff_required: string | null; // JSON array of roles (legacy)

  // Status
  status: EventStatus;

  // Post-event
  actual_attendance: number | null;
  event_notes: string | null;
  recording_url: string | null;

  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Parsed version with JSON fields as objects/arrays
export interface EventParsed extends Omit<Event,
  'assigned_team_members' | 'equipment_needed' | 'contingency_plans' |
  'post_event_tasks' | 'staff_required'
> {
  assigned_team_members: string[] | null;
  equipment_needed: string[] | null;
  contingency_plans: ContingencyPlan[] | null;
  post_event_tasks: string[] | null;
  staff_required: string[] | null;
}

// Helper type for creating events (without id and timestamps)
export type CreateEvent = Omit<Event, 'id' | 'created_at' | 'updated_at'>;

// Helper type for updating events
export type UpdateEvent = Partial<Omit<Event, 'id' | 'project_id' | 'created_at'>>;

// Extended type with related data for display
export interface EventWithRelations extends EventParsed {
  created_by_username?: string;
  created_by_name?: string;
  story_beat_title?: string;
  location_name?: string;
  location_address?: string;
  assigned_members?: Array<{
    id: string;
    username: string;
    display_name: string;
  }>;
  linked_characters?: Array<{
    id: string;
    name: string;
    involvement: 'appears' | 'operates' | 'mentioned';
  }>;
  linked_locations?: Array<{
    id: string;
    name: string;
    is_primary: boolean;
  }>;
  linked_puzzles?: Array<{
    id: string;
    title: string;
  }>;
  days_until_event?: number;
  hours_until_event?: number;
}

// Helper functions for working with event data
export const EventHelpers = {
  /**
   * Parse JSON fields from database event record
   */
  parse(event: Event): EventParsed {
    return {
      ...event,
      assigned_team_members: event.assigned_team_members
        ? JSON.parse(event.assigned_team_members)
        : null,
      equipment_needed: event.equipment_needed
        ? JSON.parse(event.equipment_needed)
        : null,
      contingency_plans: event.contingency_plans
        ? JSON.parse(event.contingency_plans)
        : null,
      post_event_tasks: event.post_event_tasks
        ? JSON.parse(event.post_event_tasks)
        : null,
      staff_required: event.staff_required
        ? JSON.parse(event.staff_required)
        : null,
    };
  },

  /**
   * Stringify parsed event for database storage
   */
  stringify(event: Partial<EventParsed>): Partial<Event> {
    const result: Partial<Event> = { ...event } as any;

    if (event.assigned_team_members !== undefined) {
      result.assigned_team_members = event.assigned_team_members
        ? JSON.stringify(event.assigned_team_members)
        : null;
    }
    if (event.equipment_needed !== undefined) {
      result.equipment_needed = event.equipment_needed
        ? JSON.stringify(event.equipment_needed)
        : null;
    }
    if (event.contingency_plans !== undefined) {
      result.contingency_plans = event.contingency_plans
        ? JSON.stringify(event.contingency_plans)
        : null;
    }
    if (event.post_event_tasks !== undefined) {
      result.post_event_tasks = event.post_event_tasks
        ? JSON.stringify(event.post_event_tasks)
        : null;
    }
    if (event.staff_required !== undefined) {
      result.staff_required = event.staff_required
        ? JSON.stringify(event.staff_required)
        : null;
    }

    return result;
  },

  /**
   * Check if event is in the future
   */
  isUpcoming(event: Event | EventParsed, now: Date = new Date()): boolean {
    if (!event.scheduled_start) {
      return false;
    }
    return new Date(event.scheduled_start) > now;
  },

  /**
   * Check if event is currently happening
   */
  isInProgress(event: Event | EventParsed, now: Date = new Date()): boolean {
    if (!event.scheduled_start) {
      return false;
    }
    const start = new Date(event.scheduled_start);
    const end = event.scheduled_end ? new Date(event.scheduled_end) : null;

    if (end) {
      return now >= start && now <= end;
    }
    // If no end time, consider in progress for 24 hours
    const dayAfter = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return now >= start && now <= dayAfter;
  },

  /**
   * Check if event has passed
   */
  isPast(event: Event | EventParsed, now: Date = new Date()): boolean {
    if (!event.scheduled_start) {
      return false;
    }
    const end = event.scheduled_end
      ? new Date(event.scheduled_end)
      : new Date(event.scheduled_start);
    return now > end;
  },

  /**
   * Get time until event starts (in milliseconds)
   */
  getTimeUntilStart(event: Event | EventParsed, now: Date = new Date()): number | null {
    if (!event.scheduled_start) {
      return null;
    }
    return new Date(event.scheduled_start).getTime() - now.getTime();
  },

  /**
   * Get duration of event (in milliseconds)
   */
  getDuration(event: Event | EventParsed): number | null {
    if (!event.scheduled_start || !event.scheduled_end) {
      return null;
    }
    return new Date(event.scheduled_end).getTime() - new Date(event.scheduled_start).getTime();
  },

  /**
   * Format duration as human-readable string
   */
  formatDuration(milliseconds: number): string {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
  },

  /**
   * Check if user is assigned to this event
   */
  isUserAssigned(event: EventParsed, userId: string): boolean {
    if (!event.assigned_team_members) {
      return false;
    }
    return event.assigned_team_members.includes(userId);
  },

  /**
   * Calculate total budget in dollars
   */
  getBudgetDollars(event: Event | EventParsed): number | null {
    if (event.budget_cents === null) {
      return null;
    }
    return event.budget_cents / 100;
  },

  /**
   * Format budget as currency string
   */
  formatBudget(event: Event | EventParsed, currency: string = 'USD'): string | null {
    const dollars = this.getBudgetDollars(event);
    if (dollars === null) {
      return null;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(dollars);
  },

  /**
   * Check if event needs attention (upcoming but not confirmed)
   */
  needsAttention(event: Event | EventParsed, hoursThreshold: number = 48): boolean {
    if (event.status === 'confirmed' || event.status === 'completed' || event.status === 'cancelled') {
      return false;
    }
    const timeUntil = this.getTimeUntilStart(event);
    if (timeUntil === null) {
      return false;
    }
    const hoursUntil = timeUntil / (1000 * 60 * 60);
    return hoursUntil <= hoursThreshold && hoursUntil > 0;
  },

  /**
   * Sort events by scheduled start time
   */
  sortByDate(events: (Event | EventParsed)[], ascending: boolean = true): typeof events {
    return [...events].sort((a, b) => {
      if (!a.scheduled_start) return 1;
      if (!b.scheduled_start) return -1;
      const diff = new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime();
      return ascending ? diff : -diff;
    });
  }
};
