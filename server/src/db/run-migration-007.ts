/**
 * Run migration 007: Enhance events
 */
import 'dotenv/config';
import { up } from './migrations/007-enhance-events.js';

console.log('🗄️  Running migration 007: Enhance events...');

try {
  up();
  console.log('✅ Migration 007 completed successfully!');
} catch (error) {
  console.error('❌ Migration 007 failed:', error);
  process.exit(1);
}
