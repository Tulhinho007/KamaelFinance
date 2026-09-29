"use client";

import { useEffect } from "react";

/**
 * Componente invisivel que dispara o warmup da Serverless Function da Vercel
 * assim que o layout e montado - antes que o usuario clique em qualquer pagina.
 * Elimina o cold start (~5-15s) que ocorre quando a funcao ficou inativa.
 */
export function WarmupTrigger() {
  useEffect(() => {
    // Fire-and-forget silencioso - nao bloqueia nada
    fetch("/api/warmup", { method: "GET", cache: "no-store" }).catch(() => {});
  }, []);

  return null;
}
