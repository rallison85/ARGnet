/**
 * Run migration 012: Redesign trail map nodes
 */
import 'dotenv/config';
import { up } from './migrations/012-redesign-trail-map-nodes.js';

console.log('🗄️  Running migration 012: Redesign trail map nodes...');

try {
  up();
  console.log('✅ Migration 012 completed successfully!');
} catch (error) {
  console.error('❌ Migration 012 failed:', error);
  process.exit(1);
}
