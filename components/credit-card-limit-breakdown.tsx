"use client";

import React from "react";
import { CurrencyValue } from "@/components/currency-value";
import { ShieldCheck, Info, CheckCircle2, Clock, CalendarDays, Sparkles } from "lucide-react";

export interface CreditCardLimitBreakdownProps {
  limiteTotal: number;
  faturaCorrente: number;
  faturasFuturas: number;
  isInvoicePaid?: boolean;
  cardTitle?: string;
  className?: string;
}

export function CreditCardLimitBreakdown({
  limiteTotal,
  faturaCorrente,
  faturasFuturas,
  isInvoicePaid = false,
  cardTitle,
  className = "",
}: CreditCardLimitBreakdownProps) {
  const faturaCorrenteEfetiva = isInvoicePaid ? 0 : Math.max(0, faturaCorrente);
  const faturasFuturasEfetivas = Math.max(0, faturasFuturas);
  const totalComprometido = faturaCorrenteEfetiva + faturasFuturasEfetivas;
  const limiteDisponivel = Math.max(0, limiteTotal - totalComprometido);

  const pctLivre = limiteTotal > 0 ? Math.min(100, Math.max(0, (limiteDisponivel / limiteTotal) * 100)) : 0;
  const pctFatura = limiteTotal > 0 ? Math.min(100, Math.max(0, (faturaCorrenteEfetiva / limiteTotal) * 100)) : 0;
  const pctFuturas = limiteTotal > 0 ? Math.min(100, Math.max(0, (faturasFuturasEfetivas / limiteTotal) * 100)) : 0;

  return (
    <div
      className={`bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl flex flex-col gap-5 ${className}`}
    >
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Gestão de Limite Comprometido Real
              {cardTitle && (
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 font-normal">
                  • {cardTitle}
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Decomposição transparente: fatura corrente vs. parcelas futuras a vencer
            </p>
          </div>
        </div>

        {/* Badge de Status do Limite */}
        <div className="flex items-center gap-2">
          {pctLivre >= 40 ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/80 px-3 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {pctLivre.toFixed(0)}% Disponível
            </span>
          ) : pctLivre >= 15 ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-black text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/80 px-3 py-1 rounded-full">
              <Clock className="w-3.5 h-3.5" />
              {pctLivre.toFixed(0)}% Limite Apertado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-black text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border border-rose-200/80 dark:border-rose-800/80 px-3 py-1 rounded-full">
              🚨 Limite Crítico ({pctLivre.toFixed(0)}% livre)
            </span>
          )}
        </div>
      </div>

      {/* ── BARRA DE PROGRESSO SEGMENTADA (3 CORES) ─────────────────────────── */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center text-xs font-bold">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
            Uso Total do Limite:{" "}
            <strong className="text-slate-900 dark:text-white font-tnum tabular-nums">
              {((totalComprometido / (limiteTotal || 1)) * 100).toFixed(1)}%
            </strong>
          </span>
          <span className="text-slate-500 dark:text-slate-400">
            Total: <CurrencyValue value={limiteTotal} className="text-slate-900 dark:text-white font-black" />
          </span>
        </div>

        {/* Barra de 3 cores */}
        <div className="w-full h-4 sm:h-5 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-800 flex gap-0.5 shadow-inner">
          {/* 1. Verde: Limite Real Disponível */}
          {pctLivre > 0 && (
            <div
              style={{ width: `${pctLivre}%` }}
              className="h-full bg-emerald-500 hover:bg-emerald-400 rounded-l-full transition-all duration-500 cursor-help relative group"
              title={`Livre: ${pctLivre.toFixed(1)}%`}
            />
          )}

          {/* 2. Roxo: Fatura do Mês */}
          {pctFatura > 0 && (
            <div
              style={{ width: `${pctFatura}%` }}
              className={`h-full bg-indigo-600 hover:bg-indigo-500 transition-all duration-500 cursor-help relative group ${
                pctLivre <= 0 ? "rounded-l-full" : ""
              } ${pctFuturas <= 0 ? "rounded-r-full" : ""}`}
              title={`Fatura do Mês: ${pctFatura.toFixed(1)}%`}
            />
          )}

          {/* 3. Laranja/Âmbar: Parcelas Futuras Comprometidas */}
          {pctFuturas > 0 && (
            <div
              style={{ width: `${pctFuturas}%` }}
              className="h-full bg-amber-500 hover:bg-amber-400 rounded-r-full transition-all duration-500 cursor-help relative group"
              title={`Parcelas Futuras: ${pctFuturas.toFixed(1)}%`}
            />
          )}
        </div>

        {/* Legenda visual das 3 cores */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-600 dark:text-slate-300 font-semibold">
              Livre / Disponível:{" "}
              <strong className="text-emerald-700 dark:text-emerald-400 font-bold font-tnum">
                {pctLivre.toFixed(0)}%
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
            <span className="text-slate-600 dark:text-slate-300 font-semibold">
              Fatura Corrente:{" "}
              <strong className="text-indigo-600 dark:text-indigo-400 font-bold font-tnum">
                {pctFatura.toFixed(0)}%
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-600 dark:text-slate-300 font-semibold">
              Parcelas Futuras (D+30+):{" "}
              <strong className="text-amber-600 dark:text-amber-400 font-bold font-tnum">
                {pctFuturas.toFixed(0)}%
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* ── 4 CARDS DE VALORES DETALHADOS ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
        {/* 1. Limite Total */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            1. Limite Total Contratado
          </span>
          <div className="my-1.5">
            <CurrencyValue
              value={limiteTotal}
              className="text-lg font-black text-slate-900 dark:text-white font-tnum tabular-nums"
            />
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            Teto máximo do emissor
          </span>
        </div>

        {/* 2. Fatura Corrente */}
        <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/40 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
            2. Fatura Corrente (Mês)
          </span>
          <div className="my-1.5">
            <CurrencyValue
              value={faturaCorrenteEfetiva}
              className="text-lg font-black text-indigo-700 dark:text-indigo-300 font-tnum tabular-nums"
            />
          </div>
          <span className="text-[10px] text-indigo-600/80 dark:text-indigo-400 font-medium">
            {isInvoicePaid ? "✓ Já liquidada no período" : "Compromisso em aberto"}
          </span>
        </div>

        {/* 3. Faturas Futuras */}
        <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
            3. Parcelas a Vencer (D+30+)
          </span>
          <div className="my-1.5">
            <CurrencyValue
              value={faturasFuturasEfetivas}
              className="text-lg font-black text-amber-700 dark:text-amber-300 font-tnum tabular-nums"
            />
          </div>
          <span className="text-[10px] text-amber-600/80 dark:text-amber-400 font-medium">
            Compras parceladas futuras
          </span>
        </div>

        {/* 4. Limite Real Disponível */}
        <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            4. Limite Real Disponível
          </span>
          <div className="my-1.5">
            <CurrencyValue
              value={limiteDisponivel}
              className="text-lg font-black text-emerald-700 dark:text-emerald-300 font-tnum tabular-nums"
            />
          </div>
          <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400 font-medium">
            Poder de compra restante
          </span>
        </div>
      </div>

      {/* Fórmula Explicativa */}
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-2">
        <Info className="w-4 h-4 text-indigo-500 shrink-0" />
        <span>
          <strong>Fórmula de Liquidez:</strong> Limite Disponível = Limite Total − (Fatura Corrente + Parcelas Futuras).
        </span>
      </div>
    </div>
  );
}
