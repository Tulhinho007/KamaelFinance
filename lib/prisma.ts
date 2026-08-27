import { PrismaClient } from "@prisma/client";

// Singleton do PrismaClient para reaproveitar o pool de conexões e evitar estouro de clientes (EMAXCONNSESSION)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

globalForPrisma.prisma = prisma;

