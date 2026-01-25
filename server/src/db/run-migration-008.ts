/**
 * Run migration 008: Enhance digital_properties
 */
import 'dotenv/config';
import { up } from './migrations/008-enhance-digital-properties.js';

console.log('🗄️  Running migration 008: Enhance digital_properties...');

try {
  up();
  console.log('✅ Migration 008 completed successfully!');
} catch (error) {
  console.error('❌ Migration 008 failed:', error);
  process.exit(1);
}
