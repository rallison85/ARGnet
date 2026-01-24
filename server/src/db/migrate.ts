import 'dotenv/config';
import db from './index.js';
import { schema } from './schema.js';

console.log('🗄️  Running database migrations...');

try {
  // Execute the schema
  db.exec(schema);
  console.log('✅ Database migrations completed successfully!');
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}
