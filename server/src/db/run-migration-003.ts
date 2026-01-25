/**
 * Run migration 003: Enhance puzzles
 */
import 'dotenv/config';
import { up } from './migrations/003-enhance-puzzles.js';

console.log('🗄️  Running migration 003: Enhance puzzles...');

try {
  up();
  console.log('✅ Migration 003 completed successfully!');
} catch (error) {
  console.error('❌ Migration 003 failed:', error);
  process.exit(1);
}
