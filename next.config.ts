import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ─── Redirects ───────────────────────────────────────────────────────────
  async redirects() {
    return [
      { source: "/despesas", destination: "/contas", permanent: true },
      { source: "/conta-corrente", destination: "/contas", permanent: true },
      { source: "/historico", destination: "/contas", permanent: true },
      { source: "/historico-pagamentos", destination: "/contas", permanent: true },
      { source: "/radar", destination: "/gestao-financeira/radar-gastos", permanent: false },
      { source: "/radar-de-gastos", destination: "/gestao-financeira/radar-gastos", permanent: false },
      { source: "/fechamento-mensal", destination: "/gestao-financeira/radar-gastos", permanent: false },
      { source: "/objetivos", destination: "/metas", permanent: false },
      { source: "/viagens", destination: "/planejamento", permanent: false },
      { source: "/orcamentos", destination: "/gestao-financeira/orcamentos", permanent: false },
      { source: "/calculadoras", destination: "/metas", permanent: false },
    ];
  },

  // ─── Headers de Segurança (CSP Permitindo unsafe-eval para bibliotecas/extensões) ──
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob:",
              "style-src 'self' 'unsafe-inline' https:",
              "font-src 'self' data: https:",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https: wss:",
              "worker-src 'self' blob:",
              "frame-ancestors 'none'",
            ].join("; "),
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },

  // ─── Otimização de Bundle das Serverless Functions ───────────────────────
  // Remove da function tudo que não é necessário em runtime na Vercel (Linux x64)
  outputFileTracingExcludes: {
    "*": [
      // Binários Prisma para plataformas que NÃO são a Vercel (Linux)
      "node_modules/.prisma/client/query_engine-windows*",
      "node_modules/.prisma/client/query_engine-darwin*",
      "node_modules/.prisma/client/libquery_engine-darwin*",
      "node_modules/.prisma/client/libquery_engine-windows*",
      "node_modules/.prisma/client/*.tmp*",
      // Prisma CLI — só necessário em build time (está em devDependencies)
      "node_modules/prisma/**",
      // Binários SWC para plataformas que não são Linux (cada ~30 MB)
      "node_modules/@next/swc-darwin-arm64/**",
      "node_modules/@next/swc-darwin-x64/**",
      "node_modules/@next/swc-win32-arm64-msvc/**",
      "node_modules/@next/swc-win32-ia32-msvc/**",
      "node_modules/@next/swc-win32-x64-msvc/**",
      // lucide-react — exclui bundle CJS (só ESM é necessário com tree-shaking)
      "node_modules/lucide-react/dist/cjs/**",
      // recharts só roda no cliente — não precisa estar na function
      "node_modules/recharts/es/**",
      // Arquivos de teste e desenvolvimento
      "node_modules/**/*.test.js",
      "node_modules/**/*.spec.js",
      "node_modules/**/*.test.ts",
      "node_modules/**/__tests__/**",
      "node_modules/**/test/**",
      "node_modules/**/tests/**",
      // Documentação e metadados desnecessários
      "node_modules/**/*.md",
      "node_modules/**/*.d.ts",
      "node_modules/**/docs/**",
      "node_modules/**/CHANGELOG*",
      "node_modules/**/LICENSE*",
      "node_modules/**/README*",
      // Source maps de node_modules (não necessários em produção)
      "node_modules/**/*.map",
    ],
  },

  // Next.js 16 usa Turbopack por padrão — isolamento de módulos server-only
  // é gerenciado automaticamente pelo App Router, sem necessidade de webpack config.
  turbopack: {},
};

export default nextConfig;
