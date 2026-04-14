import mongoose from 'mongoose';

/** True after a successful `connectMongo()` when MONGODB_URI is set and connection succeeds. */
export let hasDatabase = false;

export class DatabaseUnavailableError extends Error {
  override name = 'DatabaseUnavailableError';
  constructor() {
    super('Database is not configured. Set MONGODB_URI in the environment.');
  }
}

/**
 * Connect once and reuse the Mongoose connection for all requests.
 * Uses process.env.MONGODB_URI only — never hardcode credentials.
 */
export async function connectMongo(): Promise<void> {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    console.warn('[ndma-db] MONGODB_URI is not set — API will run in degraded mode without persistence.');
    hasDatabase = false;
    return;
  }

  try {
    // Mongoose 6+ always uses the new URL parser and unified topology; legacy flags are unnecessary.
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15_000,
    });
    hasDatabase = true;
    console.log('[ndma-db] Connected to MongoDB');
  } catch (err) {
    console.error('[ndma-db] MongoDB connection failed:', err);
    hasDatabase = false;
  }
}

export function assertDb(): void {
  if (!hasDatabase || mongoose.connection.readyState !== 1) {
    throw new DatabaseUnavailableError();
  }
}
