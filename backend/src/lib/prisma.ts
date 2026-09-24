import "./env.js";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/** Set PRISMA_LOG_QUERIES=1 to print every SQL statement during local debugging. */
const logQueries = process.env.PRISMA_LOG_QUERIES === "1";

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? logQueries
          ? ["query", "error", "warn"]
          : ["error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
