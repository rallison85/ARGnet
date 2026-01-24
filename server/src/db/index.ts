import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DATABASE_PATH || './data/argnet.db';
const dbDir = path.dirname(dbPath);

// Ensure database directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');

export default db;

// Helper function to run transactions
export function transaction<T>(fn: () => T): T {
  return db.transaction(fn)();
}

// Helper for converting to JSON strings for storage
export function toJSON(value: unknown): string {
  return JSON.stringify(value);
}

// Helper for parsing JSON from storage
export function fromJSON<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
