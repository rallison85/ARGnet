/**
 * TypeScript types for enhanced tasks
 */

export type TaskCategory =
  | 'writing'
  | 'design'
  | 'technical'
  | 'production'
  | 'qa'
  | 'admin'
  | 'communication'
  | 'other';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'blocked' | 'done' | 'cancelled';

export type RecurrenceFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

export interface RecurrencePattern {
  frequency: RecurrenceFrequency;
  day?: string; // e.g., 'monday', 'tuesday', etc. for weekly
  date?: number; // Day of month (1-31) for monthly
  interval?: number; // Every N days/weeks/months
  end_date?: string; // ISO date when recurrence ends
}

export interface Task {
  id: string;
  project_id: string;
  parent_task_id: string | null;

  title: string;
  description: string | null;

  // Assignment
  assigned_to: string | null; // Legacy: single assignee
  assignee_user_ids: string | null; // New: JSON array of user IDs
  assigned_by: string | null;

  // Categorization
  department: string | null; // Legacy field
  task_type: string | null; // Legacy field
  category: TaskCategory | null;

  // Priority and status
  priority: TaskPriority;
  status: TaskStatus;

  // Timing
  due_date: string | null; // ISO date
  estimated_hours: number | null; // Legacy field
  effort_estimate_hours: number | null; // New field
  actual_hours: number | null;

  // Dependencies
  blocked_by_task_ids: string | null; // JSON array

  // Relations
  related_entity_type: string | null; // Legacy field
  related_content_type: string | null; // New field
  related_entity_id: string | null; // Legacy field
  related_content_id: string | null; // New field

  // Recurring tasks
  is_recurring: number; // SQLite boolean (0 or 1)
  recurrence_pattern: string | null; // JSON

  // Completion
  completed_at: string | null; // ISO datetime
  completed_by: string | null;

  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Parsed version with JSON fields as objects/arrays
export interface TaskParsed extends Omit<Task, 'assignee_user_ids' | 'blocked_by_task_ids' | 'recurrence_pattern'> {
  assignee_user_ids: string[] | null;
  blocked_by_task_ids: string[] | null;
  recurrence_pattern: RecurrencePattern | null;
}

// Helper type for creating tasks (without id and timestamps)
export type CreateTask = Omit<Task, 'id' | 'created_at' | 'updated_at'>;

// Helper type for updating tasks
export type UpdateTask = Partial<Omit<Task, 'id' | 'project_id' | 'created_at'>>;

// Extended type with related data for display
export interface TaskWithRelations extends TaskParsed {
  assigned_by_username?: string;
  assigned_by_name?: string;
  completed_by_username?: string;
  completed_by_name?: string;
  parent_task_title?: string;
  assignees?: Array<{
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  }>;
  blocked_by_tasks?: Array<{
    id: string;
    title: string;
    status: TaskStatus;
  }>;
  blocking_tasks?: Array<{
    id: string;
    title: string;
    status: TaskStatus;
  }>;
  subtasks?: Array<{
    id: string;
    title: string;
    status: TaskStatus;
    priority: TaskPriority;
  }>;
  days_until_due?: number;
  days_overdue?: number;
  is_overdue?: boolean;
}

// Helper functions for working with task data
export const TaskHelpers = {
  /**
   * Parse JSON fields from database task record
   */
  parse(task: Task): TaskParsed {
    return {
      ...task,
      assignee_user_ids: task.assignee_user_ids ? JSON.parse(task.assignee_user_ids) : null,
      blocked_by_task_ids: task.blocked_by_task_ids ? JSON.parse(task.blocked_by_task_ids) : null,
      recurrence_pattern: task.recurrence_pattern ? JSON.parse(task.recurrence_pattern) : null,
    };
  },

  /**
   * Stringify parsed task for database storage
   */
  stringify(task: Partial<TaskParsed>): Partial<Task> {
    const result: Partial<Task> = { ...task } as any;

    if (task.assignee_user_ids !== undefined) {
      result.assignee_user_ids = task.assignee_user_ids
        ? JSON.stringify(task.assignee_user_ids)
        : null;
    }
    if (task.blocked_by_task_ids !== undefined) {
      result.blocked_by_task_ids = task.blocked_by_task_ids
        ? JSON.stringify(task.blocked_by_task_ids)
        : null;
    }
    if (task.recurrence_pattern !== undefined) {
      result.recurrence_pattern = task.recurrence_pattern
        ? JSON.stringify(task.recurrence_pattern)
        : null;
    }

    return result;
  },

  /**
   * Check if task is completed
   */
  isCompleted(task: Task | TaskParsed): boolean {
    return task.status === 'done';
  },

  /**
   * Check if task is blocked
   */
  isBlocked(task: Task | TaskParsed): boolean {
    return task.status === 'blocked';
  },

  /**
   * Check if task is cancelled
   */
  isCancelled(task: Task | TaskParsed): boolean {
    return task.status === 'cancelled';
  },

  /**
   * Check if task is in progress
   */
  isInProgress(task: Task | TaskParsed): boolean {
    return task.status === 'in_progress';
  },

  /**
   * Check if task is recurring
   */
  isRecurring(task: Task | TaskParsed): boolean {
    return task.is_recurring === 1;
  },

  /**
   * Check if task has dependencies
   */
  hasDependencies(task: TaskParsed): boolean {
    return task.blocked_by_task_ids !== null && task.blocked_by_task_ids.length > 0;
  },

  /**
   * Check if task has subtasks (is a parent)
   */
  hasSubtasks(tasks: (Task | TaskParsed)[], taskId: string): boolean {
    return tasks.some(t => t.parent_task_id === taskId);
  },

  /**
   * Check if task is overdue
   */
  isOverdue(task: Task | TaskParsed, now: Date = new Date()): boolean {
    if (!task.due_date || this.isCompleted(task) || this.isCancelled(task)) {
      return false;
    }
    const dueDate = new Date(task.due_date);
    return dueDate < now;
  },

  /**
   * Get days until due date
   */
  getDaysUntilDue(task: Task | TaskParsed, now: Date = new Date()): number | null {
    if (!task.due_date) {
      return null;
    }
    const dueDate = new Date(task.due_date);
    const diff = dueDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  },

  /**
   * Get days overdue
   */
  getDaysOverdue(task: Task | TaskParsed, now: Date = new Date()): number | null {
    if (!this.isOverdue(task, now)) {
      return null;
    }
    const daysUntil = this.getDaysUntilDue(task, now);
    return daysUntil !== null ? Math.abs(daysUntil) : null;
  },

  /**
   * Get effort estimate (prefers new field, falls back to legacy)
   */
  getEffortEstimate(task: Task | TaskParsed): number | null {
    return task.effort_estimate_hours ?? task.estimated_hours;
  },

  /**
   * Get related content reference (prefers new field, falls back to legacy)
   */
  getRelatedContent(task: Task | TaskParsed): { type: string | null; id: string | null } {
    return {
      type: task.related_content_type ?? task.related_entity_type,
      id: task.related_content_id ?? task.related_entity_id,
    };
  },

  /**
   * Check if user is assigned to task
   */
  isAssignedTo(task: TaskParsed, userId: string): boolean {
    if (task.assigned_to === userId) {
      return true;
    }
    if (task.assignee_user_ids) {
      return task.assignee_user_ids.includes(userId);
    }
    return false;
  },

  /**
   * Get all assignee IDs (combines legacy and new fields)
   */
  getAllAssigneeIds(task: TaskParsed): string[] {
    const ids = new Set<string>();

    if (task.assigned_to) {
      ids.add(task.assigned_to);
    }
    if (task.assignee_user_ids) {
      task.assignee_user_ids.forEach(id => ids.add(id));
    }

    return Array.from(ids);
  },

  /**
   * Calculate next recurrence date
   */
  getNextRecurrenceDate(task: TaskParsed, fromDate: Date = new Date()): Date | null {
    if (!this.isRecurring(task) || !task.recurrence_pattern) {
      return null;
    }

    const pattern = task.recurrence_pattern;
    const next = new Date(fromDate);

    switch (pattern.frequency) {
      case 'daily':
        next.setDate(next.getDate() + (pattern.interval || 1));
        break;

      case 'weekly':
        next.setDate(next.getDate() + (pattern.interval || 1) * 7);
        break;

      case 'biweekly':
        next.setDate(next.getDate() + 14);
        break;

      case 'monthly':
        next.setMonth(next.getMonth() + (pattern.interval || 1));
        if (pattern.date) {
          next.setDate(pattern.date);
        }
        break;

      case 'quarterly':
        next.setMonth(next.getMonth() + 3);
        break;

      case 'yearly':
        next.setFullYear(next.getFullYear() + (pattern.interval || 1));
        break;
    }

    // Check if recurrence has ended
    if (pattern.end_date && next > new Date(pattern.end_date)) {
      return null;
    }

    return next;
  },

  /**
   * Sort tasks by priority (urgent first)
   */
  sortByPriority(tasks: (Task | TaskParsed)[]): typeof tasks {
    const priorityOrder: Record<TaskPriority, number> = {
      urgent: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    return [...tasks].sort((a, b) => {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  },

  /**
   * Sort tasks by due date (soonest first)
   */
  sortByDueDate(tasks: (Task | TaskParsed)[]): typeof tasks {
    return [...tasks].sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  },

  /**
   * Sort tasks by status
   */
  sortByStatus(tasks: (Task | TaskParsed)[]): typeof tasks {
    const statusOrder: Record<TaskStatus, number> = {
      blocked: 0,
      in_progress: 1,
      review: 2,
      todo: 3,
      done: 4,
      cancelled: 5,
    };

    return [...tasks].sort((a, b) => {
      return statusOrder[a.status] - statusOrder[b.status];
    });
  },

  /**
   * Sort tasks by creation date (most recent first)
   */
  sortByDate(tasks: (Task | TaskParsed)[]): typeof tasks {
    return [...tasks].sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  },

  /**
   * Filter tasks by status
   */
  filterByStatus(
    tasks: (Task | TaskParsed)[],
    status: TaskStatus | TaskStatus[]
  ): typeof tasks {
    const statuses = Array.isArray(status) ? status : [status];
    return tasks.filter(t => statuses.includes(t.status));
  },

  /**
   * Filter tasks by priority
   */
  filterByPriority(
    tasks: (Task | TaskParsed)[],
    priority: TaskPriority | TaskPriority[]
  ): typeof tasks {
    const priorities = Array.isArray(priority) ? priority : [priority];
    return tasks.filter(t => priorities.includes(t.priority));
  },

  /**
   * Filter tasks by category
   */
  filterByCategory(
    tasks: (Task | TaskParsed)[],
    category: TaskCategory | TaskCategory[]
  ): typeof tasks {
    const categories = Array.isArray(category) ? category : [category];
    return tasks.filter(t => t.category && categories.includes(t.category));
  },

  /**
   * Filter active tasks (not done or cancelled)
   */
  filterActive(tasks: (Task | TaskParsed)[]): typeof tasks {
    return tasks.filter(t => !this.isCompleted(t) && !this.isCancelled(t));
  },

  /**
   * Filter overdue tasks
   */
  filterOverdue(tasks: (Task | TaskParsed)[]): typeof tasks {
    return tasks.filter(t => this.isOverdue(t));
  },

  /**
   * Filter blocked tasks
   */
  filterBlocked(tasks: (Task | TaskParsed)[]): typeof tasks {
    return tasks.filter(t => this.isBlocked(t));
  },

  /**
   * Filter tasks assigned to user
   */
  filterAssignedTo(tasks: TaskParsed[], userId: string): TaskParsed[] {
    return tasks.filter(t => this.isAssignedTo(t, userId));
  },

  /**
   * Filter tasks due within N days
   */
  filterDueSoon(tasks: (Task | TaskParsed)[], days: number = 7): typeof tasks {
    return tasks.filter(t => {
      const daysUntil = this.getDaysUntilDue(t);
      return daysUntil !== null && daysUntil >= 0 && daysUntil <= days;
    });
  },

  /**
   * Get subtasks of a parent task
   */
  getSubtasks(tasks: (Task | TaskParsed)[], parentId: string): typeof tasks {
    return tasks.filter(t => t.parent_task_id === parentId);
  },

  /**
   * Get tasks created by user
   */
  getByCreator(
    tasks: (Task | TaskParsed)[],
    userId: string
  ): typeof tasks {
    return tasks.filter(t => t.created_by === userId);
  },

  /**
   * Group tasks by status
   */
  groupByStatus(
    tasks: (Task | TaskParsed)[]
  ): Record<TaskStatus, typeof tasks> {
    const groups: Record<string, typeof tasks> = {
      todo: [],
      in_progress: [],
      review: [],
      blocked: [],
      done: [],
      cancelled: [],
    };

    tasks.forEach(task => {
      groups[task.status].push(task);
    });

    return groups as Record<TaskStatus, typeof tasks>;
  },

  /**
   * Group tasks by category
   */
  groupByCategory(
    tasks: (Task | TaskParsed)[]
  ): Record<TaskCategory | 'uncategorized', typeof tasks> {
    const groups: Record<string, typeof tasks> = {};

    tasks.forEach(task => {
      const key = task.category || 'uncategorized';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(task);
    });

    return groups as Record<TaskCategory | 'uncategorized', typeof tasks>;
  },

  /**
   * Calculate completion percentage for a set of tasks
   */
  getCompletionPercentage(tasks: (Task | TaskParsed)[]): number {
    if (tasks.length === 0) return 0;
    const completed = tasks.filter(t => this.isCompleted(t)).length;
    return Math.round((completed / tasks.length) * 100);
  },

  /**
   * Calculate total effort (estimated)
   */
  getTotalEffortEstimate(tasks: (Task | TaskParsed)[]): number {
    return tasks.reduce((sum, task) => {
      const effort = this.getEffortEstimate(task);
      return sum + (effort || 0);
    }, 0);
  },

  /**
   * Calculate total actual hours
   */
  getTotalActualHours(tasks: (Task | TaskParsed)[]): number {
    return tasks.reduce((sum, task) => {
      return sum + (task.actual_hours || 0);
    }, 0);
  },

  /**
   * Validate task data
   */
  validate(task: Partial<Task>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!task.title || task.title.trim() === '') {
      errors.push('Title is required');
    }

    if (task.title && task.title.length > 500) {
      errors.push('Title must be 500 characters or less');
    }

    if (task.effort_estimate_hours !== undefined && task.effort_estimate_hours !== null && task.effort_estimate_hours < 0) {
      errors.push('Effort estimate must be non-negative');
    }

    if (task.actual_hours !== undefined && task.actual_hours !== null && task.actual_hours < 0) {
      errors.push('Actual hours must be non-negative');
    }

    if (task.due_date) {
      const dueDate = new Date(task.due_date);
      if (isNaN(dueDate.getTime())) {
        errors.push('Invalid due date format');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },
};
