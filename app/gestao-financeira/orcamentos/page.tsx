"use client";

import Link from "next/link";
import { Wrench, ArrowLeft, CreditCard } from "lucide-react";

export default function OrcamentosPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0D1526] flex items-center justify-center p-6">
      <div className="w-full max-w-lg mx-auto flex flex-col items-center text-center gap-6 animate-in fade-in zoom-in-95 duration-300">

        {/* Ícone central */}
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-amber-100 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 flex items-center justify-center shadow-xl shadow-amber-500/10">
            <Wrench className="w-11 h-11 text-amber-500 dark:text-amber-400" strokeWidth={1.5} />
          </div>
          {/* Pulsing ring */}
          <div className="absolute inset-0 rounded-3xl border-2 border-amber-400/40 animate-ping" style={{ animationDuration: "2.5s" }} />
        </div>

        {/* Badge de status */}
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-4 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">
            Manutenção Programada
          </span>
        </div>

        {/* Textos */}
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
            Gestão de Orçamentos<br />em Atualização
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed max-w-md">
            Estamos aprimorando o sistema de tetos e metas de gastos para trazer uma experiência mais precisa e intuitiva.
            Esta funcionalidade voltará a ficar disponível em breve.
          </p>
        </div>

        {/* Divider decorativo */}
        <div className="w-full flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Enquanto isso
          </span>
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
        </div>

        {/* Botões de ação */}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Link
            href="/despesas"
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white px-5 py-3.5 rounded-2xl font-bold text-sm shadow-lg shadow-indigo-600/25 transition-all hover:scale-[1.01]"
          >
            <CreditCard className="w-4 h-4" />
            Despesas &amp; Contas
          </Link>
          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-5 py-3.5 rounded-2xl font-bold text-sm transition-all hover:scale-[1.01]"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Dashboard
          </Link>
        </div>

      </div>
    </div>
  );
}
