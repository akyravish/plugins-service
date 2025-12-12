/**
 * Prisma client singleton.
 * Provides a single shared database connection for all plugins.
 */

import { PrismaClient } from '@prisma/client';
import { config } from '../../config';

// Extend global to prevent multiple instances in development
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * Create Prisma client with appropriate logging based on environment.
 */
function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: config.isDevelopment
      ? ['query', 'info', 'warn', 'error']
      : ['error'],
    datasourceUrl: config.databaseUrl,
  });
}

/**
 * Singleton Prisma client instance.
 * In development, uses global to prevent multiple instances during hot reload.
 */
export const prisma: PrismaClient = globalThis.prisma ?? createPrismaClient();

if (config.isDevelopment) {
  globalThis.prisma = prisma;
}

/**
 * Connect to the database.
 * Should be called during application startup.
 */
export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
}

/**
 * Disconnect from the database.
 * Should be called during application shutdown.
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

/**
 * Health check for database connection.
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

