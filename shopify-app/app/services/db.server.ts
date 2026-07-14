// Re-export the app's single Prisma client (shared with PrismaSessionStorage).
// Services import `{ prisma } from "./db.server"` unchanged from the demo port;
// do NOT instantiate a second PrismaClient here (one connection pool only).
export { default as prisma } from "../db.server";
