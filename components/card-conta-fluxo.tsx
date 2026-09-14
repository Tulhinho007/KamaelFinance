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
  title = "Saldo Disponível (Caixa Geral)",
  badgeLabel = "Fluxo Livre",
  subtitle = "Controle direto sem lançamentos miúdos",
  className = "",
  isLoading = false,
}: CardContaFluxoProps) {
  return (
    <div
      className={`bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between ${className}`}
    >
      {/* Glow de fundo */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />

      {/* Cabeçalho do Card */}
      <div className="flex items-center justify-between gap-2 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Wallet className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
            {title}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 py-1 px-2.5 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 rounded-full text-[10px] font-black tracking-wide shrink-0">
          <Sparkles className="w-2.5 h-2.5" />
          {badgeLabel}
        </span>
      </div>

      {/* Saldo Numérico */}
      <div className="mt-4 relative z-10">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-sans tracking-tight font-tnum tabular-nums">
          {isLoading ? (
            <span className="inline-block w-36 h-8 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
          ) : (
            <CurrencyValue value={saldo} />
          )}
        </h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
          {subtitle}
        </p>
      </div>

      {/* Botões de Ação Rápida */}
      <div className="mt-5 grid grid-cols-2 gap-2.5 relative z-10">
        <button
          type="button"
          onClick={onAdicionarSaldo}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-emerald-600/20 cursor-pointer"
          title="Adicionar saldo / Depósito / Injeção"
        >
          <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>+ Adicionar Saldo</span>
        </button>

        <button
          type="button"
          onClick={onRetirarSaldo}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 active:scale-[0.98] text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl transition-all border border-rose-200/80 dark:border-rose-900/60 cursor-pointer"
          title="Retirar / Saque / Abate do caixa"
        >
          <ArrowDownRight className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>- Retirar / Abater</span>
        </button>
      </div>
    </div>
  );
}
