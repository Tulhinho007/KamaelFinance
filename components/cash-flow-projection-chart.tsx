"use client";

import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from "lucide-react";
import { CurrencyValue } from "@/components/currency-value";
import { getCashFlowProjectionAction } from "@/lib/actions";

interface CashFlowProjectionChartProps {
  initialDays?: number;
  className?: string;
}

export function CashFlowProjectionChart({
  initialDays = 60,
  className = "",
}: CashFlowProjectionChartProps) {
  const [horizon, setHorizon] = useState<30 | 60>(60);
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);

  const loadProjection = async () => {
    setLoading(true);
    try {
      const res = await getCashFlowProjectionAction(60);
      setData(res);
    } catch (err) {
      console.error("Erro ao carregar projeção de fluxo de caixa:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjection();
  }, []);

  const displayPoints = data?.points
    ? data.points.filter((p: any) => p.dayIndex <= horizon)
    : [];

  const lowestPointInHorizon = displayPoints.reduce((min: number, p: any) => {
    return p.saldo < min ? p.saldo : min;
  }, displayPoints[0]?.saldo ?? 0);

  const hasNegativeInHorizon = lowestPointInHorizon < 0;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-xl text-xs space-y-2 min-w-[200px]">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
            <span className="font-extrabold text-slate-900 dark:text-white">{p.label} ({p.fullDate})</span>
            {p.isToday && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                HOJE
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Saldo Projetado:</span>
            <CurrencyValue
              value={p.saldo}
              className={`font-black font-tnum tabular-nums text-sm ${
                p.saldo < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
              }`}
            />
          </div>

          {(p.entradas > 0 || p.saidas > 0) && (
            <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1 text-[11px]">
              {p.entradas > 0 && (
                <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                  <span className="flex items-center gap-1 font-medium">
                    <ArrowUpRight className="w-3 h-3" /> Receitas do dia:
                  </span>
                  <CurrencyValue value={p.entradas} prefix="+" className="font-bold font-tnum" />
                </div>
              )}
              {p.saidas > 0 && (
                <div className="flex justify-between items-center text-rose-600 dark:text-rose-400">
                  <span className="flex items-center gap-1 font-medium">
                    <ArrowDownRight className="w-3 h-3" /> Faturas/Boletos:
                  </span>
                  <CurrencyValue value={p.saidas} prefix="-" className="font-bold font-tnum" />
                </div>
              )}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className={`bg-white dark:bg-slate-900/70 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm dark:shadow-xl flex flex-col gap-5 ${className}`}
    >
      {/* 1. Header do Gráfico */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Projeção de Fluxo de Caixa
            </h3>
            <span className="bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {horizon === 30 ? "D+30" : "D+60"}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Curva diária cumulativa considerando saldo de hoje, receitas a receber e vencimentos de faturas
          </p>
        </div>

        {/* Toggle de Horizonte (D+30 vs D+60) + Refresh */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setHorizon(30)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                horizon === 30
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              D+30 (30 dias)
            </button>
            <button
              onClick={() => setHorizon(60)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                horizon === 60
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              D+60 (60 dias)
            </button>
          </div>

          <button
            onClick={loadProjection}
            title="Recarregar Projeção"
            className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. Métricas de Resumo da Projeção */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Saldo Hoje */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Saldo em Conta Hoje
            </span>
            <div className="my-1">
              <CurrencyValue
                value={data.saldoInicialHoje}
                className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-tnum tabular-nums"
              />
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              Ponto de partida real
            </span>
          </div>

          {/* Card 2: Saldo em D+30 */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/40 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
              Projeção em D+30
            </span>
            <div className="my-1">
              <CurrencyValue
                value={data.saldoD30}
                className={`text-base sm:text-lg font-black font-tnum tabular-nums ${
                  data.saldoD30 < 0 ? "text-rose-600 dark:text-rose-400" : "text-indigo-600 dark:text-indigo-300"
                }`}
              />
            </div>
            <span className="text-[10px] text-indigo-600/80 dark:text-indigo-400 font-medium">
              Saldo estimado em 30 dias
            </span>
          </div>

          {/* Card 3: Saldo em D+60 */}
          <div className="p-3.5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900/40 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
              Projeção em D+60
            </span>
            <div className="my-1">
              <CurrencyValue
                value={data.saldoD60}
                className={`text-base sm:text-lg font-black font-tnum tabular-nums ${
                  data.saldoD60 < 0 ? "text-rose-600 dark:text-rose-400" : "text-purple-600 dark:text-purple-300"
                }`}
              />
            </div>
            <span className="text-[10px] text-purple-600/80 dark:text-purple-400 font-medium">
              Saldo estimado em 60 dias
            </span>
          </div>

          {/* Card 4: Menor Saldo no Horizonte */}
          <div className={`p-3.5 rounded-2xl border flex flex-col justify-between ${
            hasNegativeInHorizon
              ? "bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50"
              : "bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-900/40"
          }`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${
              hasNegativeInHorizon ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"
            }`}>
              Menor Saldo Projetado
            </span>
            <div className="my-1">
              <CurrencyValue
                value={lowestPointInHorizon}
                className={`text-base sm:text-lg font-black font-tnum tabular-nums ${
                  hasNegativeInHorizon ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                }`}
              />
            </div>
            <span className={`text-[10px] font-medium ${
              hasNegativeInHorizon ? "text-rose-600 dark:text-rose-400 font-bold" : "text-emerald-600/80 dark:text-emerald-400"
            }`}>
              {hasNegativeInHorizon ? "🚨 Risco de saldo negativo!" : "✓ Liquidez positiva mantida"}
            </span>
          </div>
        </div>
      )}

      {/* 3. Gráfico de Área com Recharts */}
      <div className="w-full h-[280px] sm:h-[320px] relative">
        {loading && !data ? (
          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-400 animate-pulse">
            Calculando projeção diária de fluxo de caixa...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={displayPoints} margin={{ top: 15, right: 20, left: 10, bottom: 10 }}>
              <defs>
                <linearGradient id="colorCashFlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={hasNegativeInHorizon ? "#f43f5e" : "#10B981"} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={hasNegativeInHorizon ? "#f43f5e" : "#10B981"} stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e2e8f0"
                className="dark:stroke-[#334155]"
                strokeOpacity={0.4}
                vertical={false}
              />

              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#64748b", fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                dy={6}
              />

              <YAxis
                tick={{ fontSize: 10, fill: "#64748b", fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => {
                  if (Math.abs(v) >= 1000) {
                    return `R$ ${(v / 1000).toFixed(1)}k`;
                  }
                  return `R$ ${v}`;
                }}
                dx={-4}
              />

              <Tooltip content={<CustomTooltip />} />

              {/* Linha Guia Zero para Alertar Terreno Negativo */}
              <ReferenceLine
                y={0}
                stroke="#ef4444"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: "Linha Zero (Risco)",
                  position: "insideBottomRight",
                  fill: "#ef4444",
                  fontSize: 10,
                  fontWeight: 800,
                }}
              />

              <Area
                type="monotone"
                dataKey="saldo"
                stroke={hasNegativeInHorizon ? "#f43f5e" : "#10B981"}
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorCashFlow)"
                name="Saldo Projetado"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 4. Alerta Contextual se Houver Saldo Negativo */}
      {hasNegativeInHorizon && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>
              <strong>Alerta de Liquidez:</strong> A curva projetada entra em saldo negativo no dia{" "}
              <strong>{data.primeiroDiaNegativo}</strong>. Considere postergar despesas ou antecipar receitas.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
