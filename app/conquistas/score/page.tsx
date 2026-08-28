"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Activity, ShieldCheck, ArrowLeft, CheckCircle2, AlertCircle, Sparkles, PieChart, CreditCard, Wallet } from "lucide-react";
import { calculateHealthScoreAction, HealthScoreResult } from "@/lib/health-score-actions";

export default function HealthScorePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData]       = useState<HealthScoreResult | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await calculateHealthScoreAction();
      setData(res);
    } catch (e) {
      console.error("Erro ao calcular score de saúde:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto flex flex-col gap-8 select-none font-sans text-slate-900 dark:text-white">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Score de Saúde Financeira
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium pl-11">
            Indicador composto de 0 a 1000 avaliando poupança, orçamento, reserva e endividamento.
          </p>
        </div>

        <div className="px-3.5 py-1.5 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 text-purple-600 dark:text-purple-300 font-extrabold text-xs flex items-center gap-2 self-start md:self-auto">
          <Activity className="w-4 h-4" />
          <span>Diagnóstico Inteligente</span>
        </div>
      </div>

      {loading || !data ? (
        <div className="py-12 text-center text-xs text-slate-400 font-medium">Calculando Score de Saúde Financeira...</div>
      ) : (
        <div className="space-y-6">

          {/* Card Principal do Score */}
          <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
            <div className="space-y-3 max-w-md">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">Pontuação Geral Atual</span>

              <div className="flex items-baseline gap-4">
                <span className="text-6xl font-black text-slate-900 dark:text-white font-tnum">
                  {data.score}
                </span>
                <span className="text-xl font-bold text-slate-400">/ 1000 pts</span>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <span className="px-4 py-1.5 rounded-2xl text-lg font-black bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Rating {data.rating}
                </span>
                <span className={`text-xs font-extrabold ${data.colorClass}`}>
                  {data.statusText}
                </span>
              </div>
            </div>

            {/* Barra Visual de Score 0-1000 */}
            <div className="w-full md:w-80 bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-400 block">Nível de Saúde:</span>

              <div className="w-full h-4 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-300 dark:border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 via-amber-500 via-emerald-400 to-purple-500 transition-all duration-500 rounded-full"
                  style={{ width: `${Math.min(100, Math.round((data.score / 1000) * 100))}%` }}
                />
              </div>

              <div className="flex justify-between text-[10px] text-slate-400 font-extrabold uppercase pt-1">
                <span>0 (Crítico)</span>
                <span>550 (C)</span>
                <span>1000 (A+)</span>
              </div>
            </div>
          </div>

          {/* Breakdown dos 4 Pilares da Nota */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

            {/* Pilar 1: Taxa de Poupança */}
            <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">1. Taxa de Poupança</span>
                <span className="text-xs font-black text-slate-900 dark:text-white font-tnum">
                  {data.subscores.savings.score} / {data.subscores.savings.max} pts
                </span>
              </div>

              <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${data.subscores.savings.percentage}%` }}
                />
              </div>
              <span className="text-xs text-slate-500 font-medium block">{data.subscores.savings.label}</span>
            </div>

            {/* Pilar 2: Orçamento por Categoria */}
            <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">2. Cumprimento do Orçamento</span>
                <span className="text-xs font-black text-slate-900 dark:text-white font-tnum">
                  {data.subscores.budget.score} / {data.subscores.budget.max} pts
                </span>
              </div>

              <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${data.subscores.budget.percentage}%` }}
                />
              </div>
              <span className="text-xs text-slate-500 font-medium block">{data.subscores.budget.label}</span>
            </div>

            {/* Pilar 3: Reserva de Emergência */}
            <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">3. Reserva de Emergência</span>
                <span className="text-xs font-black text-slate-900 dark:text-white font-tnum">
                  {data.subscores.reserve.score} / {data.subscores.reserve.max} pts
                </span>
              </div>

              <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{ width: `${data.subscores.reserve.percentage}%` }}
                />
              </div>
              <span className="text-xs text-slate-500 font-medium block">{data.subscores.reserve.label}</span>
            </div>

            {/* Pilar 4: Nível de Endividamento */}
            <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">4. Nível de Endividamento</span>
                <span className="text-xs font-black text-slate-900 dark:text-white font-tnum">
                  {data.subscores.debt.score} / {data.subscores.debt.max} pts
                </span>
              </div>

              <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${data.subscores.debt.percentage}%` }}
                />
              </div>
              <span className="text-xs text-slate-500 font-medium block">{data.subscores.debt.label}</span>
            </div>
          </div>

          {/* Recomendações Personalizadas */}
          <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Recomendações Personalizadas para Subir de Nível</h3>
            </div>

            <ul className="space-y-2">
              {data.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
