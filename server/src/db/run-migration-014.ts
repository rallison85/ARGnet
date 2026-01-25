/**
 * Run migration 014: Create physical trail map layer
 */
import 'dotenv/config';
import { up } from './migrations/014-create-physical-trail-map.js';

console.log('🗄️  Running migration 014: Create physical trail map layer...');

try {
  up();
  console.log('✅ Migration 014 completed successfully!');
} catch (error) {
  console.error('❌ Migration 014 failed:', error);
  process.exit(1);
}
