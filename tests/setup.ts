import { beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';

// Test database setup
let testDb: Pool;

beforeAll(async () => {
  // Use separate test database
  const connectionString = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  console.log(`🧪 Test DB Connection: ${connectionString?.substring(0, 20)}...`);
  testDb = new Pool({
    connectionString,
  });
});

afterAll(async () => {
  await testDb.end();
});

export { testDb };
