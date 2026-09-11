import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/historico", destination: "/historico-pagamentos", permanent: false },
      { source: "/radar", destination: "/gestao-financeira/radar-gastos", permanent: false },
      { source: "/objetivos", destination: "/metas", permanent: false },
      { source: "/viagens", destination: "/planejamento", permanent: false },
      { source: "/orcamentos", destination: "/gestao-financeira/orcamentos", permanent: false },
    ];
  },
};

export default nextConfig;
