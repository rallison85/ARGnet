/**
 * Run migration 009: Enhance assets
 */
import 'dotenv/config';
import { up } from './migrations/009-enhance-assets.js';

console.log('🗄️  Running migration 009: Enhance assets...');

try {
  up();
  console.log('✅ Migration 009 completed successfully!');
} catch (error) {
  console.error('❌ Migration 009 failed:', error);
  process.exit(1);
}
