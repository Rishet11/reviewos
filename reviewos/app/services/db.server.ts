import { PrismaClient } from "@prisma/client";

// Standard singleton pattern for Prisma with React Router / Remix dev servers.
// Vite/HMR reloads this module often; without caching the client on globalThis
// each reload would open a new connection pool and eventually exhaust SQLite
// file handles / connection limits.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
