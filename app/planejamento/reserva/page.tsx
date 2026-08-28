"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Building2, Zap, TrendingUp, HelpCircle, Sparkles } from "lucide-react";
import { getEmergencyFundOverviewAction } from "@/lib/emergency-fund-actions";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function EmergencyFundPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData]       = useState<any>(null);

  // Slider de Simulação de Aporte Mensal
  const [simulatedAporte, setSimulatedAporte] = useState<number>(500);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getEmergencyFundOverviewAction();
      setData(res);
    } catch (e) {
      console.error("Erro ao carregar fundo de emergência:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Projeção do tempo para atingir 6 meses de reserva
  let monthsToGoal = 0;
  if (data && data.remainingFor6Months > 0 && simulatedAporte > 0) {
    monthsToGoal = Math.ceil(data.remainingFor6Months / simulatedAporte);
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto flex flex-col gap-8 select-none font-sans text-slate-900 dark:text-white">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/planejamento"
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Calculadora de Fundo de Emergência
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium pl-11">
            Descubra exatamente quantos meses de custo de vida a sua reserva atual cobre.
          </p>
        </div>

        <div className="px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-300 font-extrabold text-xs flex items-center gap-2 self-start md:self-auto">
          <ShieldCheck className="w-4 h-4" />
          <span>Proteção Financeira</span>
        </div>
      </div>

      {loading || !data ? (
        <div className="py-12 text-center text-xs text-slate-400 font-medium">Calculando reserva de emergência...</div>
      ) : (
        <div className="space-y-6">
          {/* Card Principal Gauge de Cobertura */}
          <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
            <div className="space-y-3 max-w-md">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">Status de Cobertura Atual</span>
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-black text-slate-900 dark:text-white font-tnum">
                  {data.monthsCovered}
                </span>
                <span className="text-xl font-bold text-slate-500 dark:text-slate-400">meses de reserva</span>
              </div>

              <div className="pt-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${
                  data.shieldLevel === "ARMORED"
                    ? "bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 border-purple-200 dark:border-purple-800/60"
                    : data.shieldLevel === "SOLID"
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60"
                    : data.shieldLevel === "MODERATE"
                    ? "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-800/60"
                    : "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/60"
                }`}>
                  {data.shieldLevel === "ARMORED" && "🟣 Blindagem Total (12+ Meses)"}
                  {data.shieldLevel === "SOLID" && "🟢 Reserva Sólida (6+ Meses Recomendados)"}
                  {data.shieldLevel === "MODERATE" && "🟡 Reserva Moderada (3 a 5 Meses)"}
                  {data.shieldLevel === "CRITICAL" && "🔴 Reserva Inicial (< 3 Meses)"}
                </span>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium pt-1">
                Com base no seu custo de vida médio de <strong>{brl(data.monthlyAverageCost)}/mês</strong> dos últimos 6 meses, sua liquidez atual em contas garante seu padrão de vida por <strong>{data.monthsCovered} meses</strong> sem necessidade de novas receitas.
              </p>
            </div>

            {/* Barra de Progresso Visual de 0 a 12 Meses */}
            <div className="w-full md:w-80 bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500">Meta Padrão (6 Meses):</span>
                <span className="text-slate-900 dark:text-white font-tnum">{brl(data.target6Months)}</span>
              </div>

              <div className="w-full h-4 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-300 dark:border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-500 rounded-full"
                  style={{ width: `${Math.min(100, Math.round((data.monthsCovered / 12) * 100))}%` }}
                />
              </div>

              <div className="flex justify-between text-[10px] text-slate-400 font-extrabold uppercase">
                <span>0 Meses</span>
                <span>6 Meses</span>
                <span>12+ Meses</span>
              </div>
            </div>
          </div>

          {/* Cards Secundários com Métricas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Patrimônio de Liquidez</span>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 font-tnum">{brl(data.totalLiquidity)}</p>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Soma disponível em contas bancárias</span>
            </div>

            <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Custo de Vida Médio/Mês</span>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1 font-tnum">{brl(data.monthlyAverageCost)}</p>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Média móvel dos últimos 6 meses</span>
            </div>

            <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Falta para 6 Meses</span>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-tnum">{brl(data.remainingFor6Months)}</p>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Valor adicional necessário</span>
            </div>
          </div>

          {/* Simulador Interativo de Aportes Mensais */}
          <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Simulador de Aportes para Meta de 6 Meses</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500">Aporte Mensal Simulado:</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-tnum text-base font-black">{brl(simulatedAporte)}/mês</span>
              </div>

              <input
                type="range"
                min="100"
                max="5000"
                step="100"
                value={simulatedAporte}
                onChange={e => setSimulatedAporte(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />

              <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-800/60 text-xs font-medium text-slate-700 dark:text-slate-300">
                {monthsToGoal > 0 ? (
                  <p>
                    Aportando <strong>{brl(simulatedAporte)}</strong> por mês, você atingirá a meta recomendada de 6 meses de reserva em aproximadamente <strong>{monthsToGoal} meses</strong>.
                  </p>
                ) : (
                  <p className="text-emerald-600 dark:text-emerald-400 font-bold">
                    ✓ Parabéns! Sua reserva atual já atinge ou supera a meta recomendada de 6 meses de custo de vida.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
