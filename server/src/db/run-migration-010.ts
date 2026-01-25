/**
 * Run migration 010: Enhance lore_entries
 */
import 'dotenv/config';
import { up } from './migrations/010-enhance-lore-entries.js';

console.log('🗄️  Running migration 010: Enhance lore_entries...');

try {
  up();
  console.log('✅ Migration 010 completed successfully!');
} catch (error) {
  console.error('❌ Migration 010 failed:', error);
  process.exit(1);
}
