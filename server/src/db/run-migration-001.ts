/**
 * Run migration 001: Enhance character_relationships
 */
import 'dotenv/config';
import { up } from './migrations/001-enhance-character-relationships.js';

console.log('🗄️  Running migration 001: Enhance character_relationships...');

try {
  up();
  console.log('✅ Migration 001 completed successfully!');
} catch (error) {
  console.error('❌ Migration 001 failed:', error);
  process.exit(1);
}
