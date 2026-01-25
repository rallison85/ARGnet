/**
 * Run migration 006: Enhance locations
 */
import 'dotenv/config';
import { up } from './migrations/006-enhance-locations.js';

console.log('🗄️  Running migration 006: Enhance locations...');

try {
  up();
  console.log('✅ Migration 006 completed successfully!');
} catch (error) {
  console.error('❌ Migration 006 failed:', error);
  process.exit(1);
}
