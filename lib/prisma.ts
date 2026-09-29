import { PrismaClient } from "@prisma/client";

export const PRISMA_TX_OPTIONS = {
  maxWait: 15000, // Tempo máximo aguardando conexão no pooler (15s)
  timeout: 30000, // Tempo limite estendido para a transação executar (30s)
};

// Singleton do PrismaClient para reaproveitar o pool de conexões e evitar estouro de clientes (EMAXCONNSESSION)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getOptimizedDatabaseUrl(): string | undefined {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) return undefined;

  // Se estiver usando a porta de sessão 5432 do Supabase, migra para o Transaction Pooler na porta 6543
  if (rawUrl.includes("supabase") && rawUrl.includes(":5432")) {
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

