"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";

export default function CartoesErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro na seção de cartões:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] p-6 md:p-10 max-w-xl mx-auto flex flex-col items-center justify-center text-center gap-6 select-none animate-in fade-in duration-200">
      <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shadow-2xl">
        <AlertTriangle className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-black text-white">Ops! Algo deu errado nos cartões</h2>
        <p className="text-xs text-slate-400 font-medium max-w-md leading-relaxed mx-auto">
          Não foi possível carregar os cartões ou contas neste momento. Clique em tentar novamente ou retorne ao dashboard.
        </p>
        {error?.message && (
          <div className="mt-4 p-3.5 bg-slate-900 border border-slate-800 rounded-2xl text-left max-w-md mx-auto">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Erro Detectado</span>
            <p className="text-[11px] font-mono text-rose-400 break-all">{error.message}</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          onClick={() => reset()}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Tentar Novamente
        </button>

        <Link
          href="/despesas"
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Despesas
        </Link>
      </div>
    </div>
  );
}
