import { PrismaClient } from "@prisma/client";

// Evita criar uma nova conexão a cada hot-reload em desenvolvimento.
// Em produção (serverless), uma instância por invocação é o padrão recomendado.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
