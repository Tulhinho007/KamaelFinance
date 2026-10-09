"use client";

import React from "react";
import { ArrowUpRight, ArrowDownRight, Wallet, Sparkles } from "lucide-react";
import { CurrencyValue } from "@/components/currency-value";

export interface CardContaFluxoProps {
  saldo: number;
  onAdicionarSaldo: () => void;
  onRetirarSaldo: () => void;
  title?: string;
  badgeLabel?: string;
  subtitle?: string;
  className?: string;
  isLoading?: boolean;
}

export function CardContaFluxo({
  saldo,
  onAdicionarSaldo,
  onRetirarSaldo,
  title = "SALDO CONSOLIDADO (TODAS AS CONTAS)",
  badgeLabel = "Todas as Contas",
  subtitle = "Soma dos saldos em conta corrente",
  className = "",
  isLoading = false,
}: CardContaFluxoProps) {
  return (
    <div
      className={`bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-sm dark:shadow-lg dark:shadow-black/20 hover:border-slate-300 dark:hover:border-white/[0.16] transition-all relative overflow-hidden flex flex-col justify-between ${className}`}
    >
      {/* Glow de fundo */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />

      {/* Cabeçalho do Card */}
      <div className="flex items-center justify-between gap-2 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800/70 border border-slate-200/80 dark:border-white/[0.08] flex items-center justify-center text-indigo-500 dark:text-indigo-400 shrink-0">
            <Wallet className="w-4 h-4" strokeWidth={1.5} />
          </div>
          <span className="text-xs font-medium uppercase text-slate-500 dark:text-zinc-400 tracking-wider">
            {title}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 py-1 px-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-medium tracking-wide shrink-0">
          <Sparkles className="w-2.5 h-2.5" />
          {badgeLabel}
        </span>
      </div>

      {/* Saldo Numérico */}
      <div className="mt-4 relative z-10">
        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-zinc-100 font-sans tracking-tight font-tnum tabular-nums">
          {isLoading ? (
            <span className="inline-block w-36 h-8 bg-slate-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
          ) : (
            <CurrencyValue value={saldo} />
          )}
        </h2>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 font-normal">
          {subtitle}
        </p>
      </div>

      {/* Botões de Ação Rápida */}
      <div className="mt-5 grid grid-cols-2 gap-2.5 relative z-10">
        <button
          type="button"
          onClick={onAdicionarSaldo}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
          title="Adicionar saldo / Depósito / Injeção"
        >
          <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.75} />
          <span>+ Adicionar Saldo</span>
        </button>

        <button
          type="button"
          onClick={onRetirarSaldo}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
          title="Retirar / Saque / Abate do caixa"
        >
          <ArrowDownRight className="w-3.5 h-3.5" strokeWidth={1.75} />
          <span>- Retirar / Abater</span>
        </button>
      </div>
    </div>
  );
}
