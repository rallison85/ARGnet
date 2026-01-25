/**
 * Run migration 011: Enhance tasks
 */
import 'dotenv/config';
import { up } from './migrations/011-enhance-tasks.js';

console.log('🗄️  Running migration 011: Enhance tasks...');

try {
  up();
  console.log('✅ Migration 011 completed successfully!');
} catch (error) {
  console.error('❌ Migration 011 failed:', error);
  process.exit(1);
}
