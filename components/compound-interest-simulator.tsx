"use client";

import React, { useState, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Calculator, Sparkles, TrendingUp, DollarSign, Calendar, RefreshCw, Table } from "lucide-react";

const brl = (v: number) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CompoundInterestSimulator() {
  const [initialAmount, setInitialAmount] = useState<number | "">(1000);
  const [monthlyAmount, setMonthlyAmount] = useState<number | "">(200);
  const [rate, setRate] = useState<number | "">(12);
  const [rateType, setRateType] = useState<"ANNUAL" | "MONTHLY">("ANNUAL");
  const [period, setPeriod] = useState<number | "">(5);
  const [periodType, setPeriodType] = useState<"YEARS" | "MONTHS">("YEARS");
  const [showTable, setShowTable] = useState(false);

  const simulation = useMemo(() => {
    const pInit = typeof initialAmount === "number" ? initialAmount : 0;
    const pMonth = typeof monthlyAmount === "number" ? monthlyAmount : 0;
    const rRaw = typeof rate === "number" ? rate : 0;
    const tRaw = typeof period === "number" ? period : 0;

    const totalMonths = periodType === "YEARS" ? tRaw * 12 : tRaw;
    const monthlyRate = rateType === "ANNUAL"
      ? Math.pow(1 + rRaw / 100, 1 / 12) - 1
      : rRaw / 100;

    let currentTotal = pInit;
    let totalInvested = pInit;
    const timeline: Array<{
      month: number;
      label: string;
      total: number;
      invested: number;
      interest: number;
    }> = [];

    timeline.push({
      month: 0,
      label: "Início",
      total: Math.round(pInit * 100) / 100,
      invested: Math.round(pInit * 100) / 100,
      interest: 0,
    });

    for (let m = 1; m <= totalMonths; m++) {
      currentTotal = (currentTotal + pMonth) * (1 + monthlyRate);
      totalInvested += pMonth;
      const interestEarned = currentTotal - totalInvested;

      // Adiciona ao gráfico a cada ano ou a cada mês se o período for curto
      if (totalMonths <= 24 || m % 12 === 0 || m === totalMonths) {
        const yearNum = Math.floor(m / 12);
        const monthRem = m % 12;
        const label = periodType === "YEARS" && monthRem === 0 ? `${yearNum}º Ano` : `Mês ${m}`;

        timeline.push({
          month: m,
          label,
          total: Math.round(currentTotal * 100) / 100,
          invested: Math.round(totalInvested * 100) / 100,
          interest: Math.round(Math.max(0, interestEarned) * 100) / 100,
        });
      }
    }

    const finalTotal = currentTotal;
    const finalInvested = totalInvested;
    const finalInterest = finalTotal - finalInvested;
    const yieldPercentage = finalInvested > 0 ? (finalInterest / finalInvested) * 100 : 0;

    return {
      finalTotal,
      finalInvested,
      finalInterest,
      yieldPercentage,
      timeline,
      totalMonths,
    };
  }, [initialAmount, monthlyAmount, rate, rateType, period, periodType]);

  const resetForm = () => {
    setInitialAmount(1000);
    setMonthlyAmount(200);
    setRate(12);
    setRateType("ANNUAL");
    setPeriod(5);
    setPeriodType("YEARS");
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col gap-6 select-none font-sans text-slate-900 dark:text-slate-100">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/60 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Simulador de Juros Compostos <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Calcule a projeção real de crescimento do seu patrimônio com aportes recorrentes.
            </p>
          </div>
        </div>

        <button
          onClick={resetForm}
          className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 w-fit cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Redefinir
        </button>
      </div>

      {/* Inputs Form Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Aporte Inicial */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Valor Inicial (R$)
          </label>
          <div className="relative">
            <DollarSign className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="number"
              min="0"
              value={initialAmount}
              onChange={(e) => setInitialAmount(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="1000"
              className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-tnum"
            />
          </div>
        </div>

        {/* Aporte Mensal */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Aporte Mensal (R$)
          </label>
          <div className="relative">
            <TrendingUp className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="number"
              min="0"
              value={monthlyAmount}
              onChange={(e) => setMonthlyAmount(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="200"
              className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-tnum"
            />
          </div>
        </div>

        {/* Taxa de Juros */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Taxa de Juros (%)
            </label>
            <div className="flex gap-1 text-[9px] font-extrabold">
              <button
                type="button"
                onClick={() => setRateType("ANNUAL")}
                className={`px-1.5 py-0.5 rounded-md ${rateType === "ANNUAL" ? "bg-indigo-600 text-white" : "text-slate-400"}`}
              >
                /Ano
              </button>
              <button
                type="button"
                onClick={() => setRateType("MONTHLY")}
                className={`px-1.5 py-0.5 rounded-md ${rateType === "MONTHLY" ? "bg-indigo-600 text-white" : "text-slate-400"}`}
              >
                /Mês
              </button>
            </div>
          </div>
          <input
            type="number"
            step="0.1"
            min="0"
            value={rate}
            onChange={(e) => setRate(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="12"
            className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-tnum"
          />
        </div>

        {/* Período / Prazo */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Prazo de Aplicação
            </label>
            <div className="flex gap-1 text-[9px] font-extrabold">
              <button
                type="button"
                onClick={() => setPeriodType("YEARS")}
                className={`px-1.5 py-0.5 rounded-md ${periodType === "YEARS" ? "bg-indigo-600 text-white" : "text-slate-400"}`}
              >
                Anos
              </button>
              <button
                type="button"
                onClick={() => setPeriodType("MONTHS")}
                className={`px-1.5 py-0.5 rounded-md ${periodType === "MONTHS" ? "bg-indigo-600 text-white" : "text-slate-400"}`}
              >
                Meses
              </button>
            </div>
          </div>
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="number"
              min="1"
              value={period}
              onChange={(e) => setPeriod(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="5"
              className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-tnum"
            />
          </div>
        </div>

      </div>

      {/* Results Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
        <div>
          <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Montante Final Acumulado
          </span>
          <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight font-tnum mt-0.5">
            {brl(simulation.finalTotal)}
          </p>
        </div>

        <div>
          <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Total Investido (Aportes)
          </span>
          <p className="text-lg font-bold text-slate-700 dark:text-slate-300 font-tnum mt-0.5">
            {brl(simulation.finalInvested)}
          </p>
        </div>

        <div>
          <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Total em Juros Compostos
          </span>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-tnum mt-0.5">
            +{brl(simulation.finalInterest)}
          </p>
        </div>

        <div>
          <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Rendimento do Capital
          </span>
          <p className="text-lg font-bold text-amber-500 font-tnum mt-0.5">
            +{simulation.yieldPercentage.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Chart Section */}
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Evolução Temporal do Patrimônio
          </span>
          <button
            onClick={() => setShowTable(!showTable)}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Table className="w-3.5 h-3.5" />
            {showTable ? "Ocultar Tabela" : "Ver Tabela Detalhada"}
          </button>
        </div>

        {/* Recharts Area Chart */}
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={simulation.timeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorInterest" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.15} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => Math.abs(v) >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${v}`}
              />
              <Tooltip
                formatter={(value: any, name: any) => [brl(Number(value)), name === "invested" ? "Total Investido" : "Montante com Juros"]}
              />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
              <Area type="monotone" dataKey="invested" name="Total Investido (R$)" stroke="#6366F1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorInvested)" />
              <Area type="monotone" dataKey="total" name="Montante com Juros (R$)" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorInterest)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela Detalhada opcional */}
      {showTable && (
        <div className="overflow-x-auto max-h-60 border border-slate-100 dark:border-slate-800 rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Período</th>
                <th className="py-2.5 px-4 text-right">Total Investido</th>
                <th className="py-2.5 px-4 text-right">Juros Acumulados</th>
                <th className="py-2.5 px-4 text-right">Montante Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {simulation.timeline.map((row) => (
                <tr key={row.month} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                  <td className="py-2 px-4 font-bold">{row.label}</td>
                  <td className="py-2 px-4 text-right tabular-nums font-tnum">{brl(row.invested)}</td>
                  <td className="py-2 px-4 text-right text-emerald-600 dark:text-emerald-400 tabular-nums font-tnum">+{brl(row.interest)}</td>
                  <td className="py-2 px-4 text-right font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums font-tnum">{brl(row.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
