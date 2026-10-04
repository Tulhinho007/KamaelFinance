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

  let url = rawUrl;

  // Garante pgbouncer=true caso use o transaction pooler do Supabase (porta 6543)
  if (url.includes(":6543") || url.includes("pooler.supabase.com")) {
    if (!url.includes("pgbouncer=true")) {
      url += (url.includes("?") ? "&" : "?") + "pgbouncer=true";
    }
  }

  // IMPORTANTE: NUNCA limitar o pool serverless a 1 conexão (connection_limit=1).
  // connection_limit=1 transforma qualquer Promise.all em fila estritamente serial.
  // Usa regex delimitado para NUNCA transformar connection_limit=10 em connection_limit=100.
  if (/(?:[?&])connection_limit=1(?=[&#]|$)/.test(url)) {
    url = url.replace(/([?&])connection_limit=1(?=[&#]|$)/, "$1connection_limit=10");
  } else if (!/(?:[?&])connection_limit=\d+/.test(url)) {
    url += (url.includes("?") ? "&" : "?") + "connection_limit=10";
  }

  if (!url.includes("pool_timeout=")) {
    url += (url.includes("?") ? "&" : "?") + "pool_timeout=15";
  }

  return url;
}

const optimizedUrl = getOptimizedDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(optimizedUrl ? { datasources: { db: { url: optimizedUrl } } } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

globalForPrisma.prisma = prisma;

