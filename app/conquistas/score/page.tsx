"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Activity, ArrowLeft, CheckCircle2, Sparkles, HelpCircle, Info, X, Coins, ShieldCheck, CreditCard, PieChart } from "lucide-react";
import { calculateHealthScoreAction, HealthScoreResult } from "@/lib/health-score-actions";

export default function HealthScorePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData]       = useState<HealthScoreResult | null>(null);
  const [showExplainModal, setShowExplainModal] = useState(false);

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

      {/* Header com botão explicativo */}
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

        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={() => setShowExplainModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300 font-extrabold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-indigo-500" />
            <span>Como funciona a pontuação?</span>
          </button>

          <div className="px-3.5 py-1.5 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 text-purple-600 dark:text-purple-300 font-extrabold text-xs flex items-center gap-2">
            <Activity className="w-4 h-4" />
            <span>Diagnóstico</span>
          </div>
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
            <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3 group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">1. Taxa de Poupança</span>
                  <div
                    className="relative cursor-pointer"
                    title="Mede (Receita - Despesa) / Receita. Nota máxima ao guardar 30% ou mais da renda."
                  >
                    <Info className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                  </div>
                </div>
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
            <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3 group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">2. Cumprimento do Orçamento</span>
                  <div
                    className="relative cursor-pointer"
                    title="Inicia com 250 pts e perde 50 pts para cada categoria com teto estourado no mês."
                  >
                    <Info className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                  </div>
                </div>
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
            <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3 group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">3. Reserva de Emergência</span>
                  <div
                    className="relative cursor-pointer"
                    title="Mede Liquidez / Custo de Vida Médio. Nota máxima ao acumular 6 meses ou mais de reserva."
                  >
                    <Info className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                  </div>
                </div>
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
            <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3 group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">4. Nível de Endividamento</span>
                  <div
                    className="relative cursor-pointer"
                    title="Mede Faturas do Cartão / Receita. Nota máxima quando o comprometimento é de até 20% da renda."
                  >
                    <Info className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                  </div>
                </div>
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

      {/* Modal Explicativo da Lógica de Cálculo do Score */}
      {showExplainModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Entenda seu Score de Saúde Financeira
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">
                    Metodologia de cálculo composta de 0 a 1000 pontos
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExplainModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Sua pontuação é avaliada em tempo real através da combinação ponderada de 4 pilares financeiros essenciais. Quanto maior a sua nota, mais protegido e estruturado está seu patrimônio:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Pilar 1 */}
              <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                    1. Taxa de Poupança
                  </span>
                  <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                    Máx. 300 pts
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  Compara a sobra líquida contra a receita total: <code className="text-emerald-600 font-bold">(Receita - Despesa) / Receita</code>. Atinge os 300 pontos ao poupar <strong>≥ 30%</strong> da sua renda.
                </p>
              </div>

              {/* Pilar 2 */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-800 dark:text-indigo-300 uppercase tracking-wider">
                    2. Cumprimento do Orçamento
                  </span>
                  <span className="text-xs font-black px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                    Máx. 250 pts
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  Avalia a disciplina nos limites cadastrados no Teto de Gastos. Começa com 250 pts e penaliza com <strong>-50 pts</strong> para cada categoria estourada no mês.
                </p>
              </div>

              {/* Pilar 3 */}
              <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-purple-800 dark:text-purple-300 uppercase tracking-wider">
                    3. Reserva de Emergência
                  </span>
                  <span className="text-xs font-black px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                    Máx. 250 pts
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  Calcula <code className="text-purple-600 font-bold">Saldo Líquido / Custo de Vida Médio</code>. Pontuação máxima de 250 pts ao garantir <strong>≥ 6 meses</strong> de custo de vida coberto.
                </p>
              </div>

              {/* Pilar 4 */}
              <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                    4. Nível de Endividamento
                  </span>
                  <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
                    Máx. 200 pts
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  Mede a proporção <code className="text-amber-600 font-bold">Faturas de Cartão / Receita</code>. Pontuação máxima de 200 pts quando o comprometimento é <strong>≤ 20%</strong> da sua renda.
                </p>
              </div>

            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowExplainModal(false)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-extrabold text-xs shadow-md transition-all cursor-pointer"
              >
                Entendi!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
