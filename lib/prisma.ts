import { PrismaClient } from "@prisma/client";

// Singleton do PrismaClient para reaproveitar o pool de conexões e evitar estouro de clientes (EMAXCONNSESSION)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getOptimizedDatabaseUrl(): string | undefined {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) return undefined;

  // Se estiver usando o pooler da Supabase na porta de sessão 5432, migra para a porta de transação 6543 recomendada para Serverless
  if (rawUrl.includes("pooler.supabase.com:5432")) {
    let url = rawUrl.replace(":5432", ":6543");
    if (!url.includes("pgbouncer=true")) {
      url += (url.includes("?") ? "&" : "?") + "pgbouncer=true&connection_limit=1";
    }
    return url;
  }
  return rawUrl;
}

const optimizedUrl = getOptimizedDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(optimizedUrl ? { datasources: { db: { url: optimizedUrl } } } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

globalForPrisma.prisma = prisma;

