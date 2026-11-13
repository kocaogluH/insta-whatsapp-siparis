import { PrismaClient } from '@prisma/client';

const resolvedDbUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

if (resolvedDbUrl && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = resolvedDbUrl;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(
    resolvedDbUrl
      ? {
          datasources: {
            db: { url: resolvedDbUrl },
          },
        }
      : undefined
  );

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
