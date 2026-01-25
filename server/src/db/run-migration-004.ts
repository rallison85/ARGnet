/**
 * Run migration 004: Add puzzle_hints table
 */
import 'dotenv/config';
import { up } from './migrations/004-add-puzzle-hints-table.js';

console.log('🗄️  Running migration 004: Add puzzle_hints table...');

try {
  up();
  console.log('✅ Migration 004 completed successfully!');
} catch (error) {
  console.error('❌ Migration 004 failed:', error);
  process.exit(1);
}
