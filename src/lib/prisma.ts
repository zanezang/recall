import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';

/**
 * The app's shared Prisma client. Server-only: never import this from a client component.
 *
 * The database location comes from DATABASE_URL, the same variable the Prisma CLI reads
 * through prisma.config.ts, so migrations and the running app always use the same file.
 */

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env and try again.');
  }

  const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
  return new PrismaClient({ adapter });
}

// In development, Next.js re-evaluates modules on every hot reload. Caching the client on
// globalThis reuses one instance across reloads instead of opening a new connection each time.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
