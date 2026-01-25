/**
 * Run migration 005: Enhance characters
 */
import 'dotenv/config';
import { up } from './migrations/005-enhance-characters.js';

console.log('🗄️  Running migration 005: Enhance characters...');

try {
  up();
  console.log('✅ Migration 005 completed successfully!');
} catch (error) {
  console.error('❌ Migration 005 failed:', error);
  process.exit(1);
}
