/**
 * Run migration 013: Create trail_map_edges
 */
import 'dotenv/config';
import { up } from './migrations/013-create-trail-map-edges.js';

console.log('🗄️  Running migration 013: Create trail_map_edges...');

try {
  up();
  console.log('✅ Migration 013 completed successfully!');
} catch (error) {
  console.error('❌ Migration 013 failed:', error);
  process.exit(1);
}
