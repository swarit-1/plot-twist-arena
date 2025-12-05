import { db } from './client';

async function migrate() {
  try {
    console.log('Running database migrations...');
    await db.initialize();
    console.log('Database migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
