/**
 * Run migration 002: Enhance story_beats
 */
import 'dotenv/config';
import { up } from './migrations/002-enhance-story-beats.js';

console.log('🗄️  Running migration 002: Enhance story_beats...');

try {
  up();
  console.log('✅ Migration 002 completed successfully!');
} catch (error) {
  console.error('❌ Migration 002 failed:', error);
  process.exit(1);
}
