"use client";

import React, { useState, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Calculator, Sparkles, TrendingUp, DollarSign, Calendar, RefreshCw, Table } from "lucide-react";

const brl = (v: number) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CompoundInterestSimulator() {
  const [initialAmount, setInitialAmount] = useState<number | "">(1000);
  const [monthlyAmount, setMonthlyAmount] = useState<number | "">(200);
  const [rate, setRate]                   = useState<number | "">(12);
  const [rateType, setRateType]           = useState<"ANNUAL" | "MONTHLY">("ANNUAL");
  const [period, setPeriod]               = useState<number | "">(5);
  const [periodType, setPeriodType]       = useState<"YEARS" | "MONTHS">("YEARS");
  const [showTable, setShowTable]         = useState(false);

  const simulation = useMemo(() => {
    const pInit  = typeof initialAmount === "number" ? initialAmount : 0;
    const pMonth = typeof monthlyAmount === "number" ? monthlyAmount : 0;
    const rRaw   = typeof rate === "number" ? rate : 0;
    const tRaw   = typeof period === "number" ? period : 0;

    const totalMonths = periodType === "YEARS" ? tRaw * 12 : tRaw;
    const monthlyRate = rateType === "ANNUAL"
      ? Math.pow(1 + rRaw / 100, 1 / 12) - 1
      : rRaw / 100;

    let currentTotal  = pInit;
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
      currentTotal  = (currentTotal + pMonth) * (1 + monthlyRate);
      totalInvested += pMonth;
      const interestEarned = currentTotal - totalInvested;

      if (totalMonths <= 24 || m % 12 === 0 || m === totalMonths) {
        const yearNum  = Math.floor(m / 12);
        const monthRem = m % 12;
        const label    = periodType === "YEARS" && monthRem === 0 ? `${yearNum}º Ano` : `Mês ${m}`;

        timeline.push({
          month: m,
          label,
          total: Math.round(currentTotal * 100) / 100,
          invested: Math.round(totalInvested * 100) / 100,
          interest: Math.round(Math.max(0, interestEarned) * 100) / 100,
        });
      }
    }

    const finalTotal       = currentTotal;
    const finalInvested    = totalInvested;
    const finalInterest    = finalTotal - finalInvested;
    const yieldPercentage  = finalInvested > 0 ? (finalInterest / finalInvested) * 100 : 0;

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
    <div className="card-glow p-6 flex flex-col gap-6 select-none font-sans text-slate-100">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 border border-indigo-400/30">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2">
              Simulador de Juros Compostos <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            </h3>
            <p className="text-xs text-secondary-light font-semibold">
              Calcule a projeção real de crescimento do seu patrimônio com aportes recorrentes.
            </p>
          </div>
        </div>

        <button
          onClick={resetForm}
          className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 w-fit cursor-pointer border border-slate-700"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Redefinir
        </button>
      </div>

      {/* Inputs Form Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Valor Inicial */}
        <div className="flex flex-col gap-1.5 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
          <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-indigo-400" /> Aporte Inicial
          </label>
          <input
            type="number"
            min="0"
            step="100"
            value={initialAmount}
            onChange={(e) => setInitialAmount(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="0,00"
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-black text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>

        {/* Aporte Mensal */}
        <div className="flex flex-col gap-1.5 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
          <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" /> Aporte Mensal
          </label>
          <input
            type="number"
            min="0"
            step="50"
            value={monthlyAmount}
            onChange={(e) => setMonthlyAmount(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="0,00"
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-black text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>

        {/* Taxa de Juros */}
        <div className="flex flex-col gap-1.5 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider">Taxa de Juros (%)</label>
            <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[9px] font-bold">
              <button
                type="button"
                onClick={() => setRateType("ANNUAL")}
                className={`px-1.5 py-0.5 rounded ${rateType === "ANNUAL" ? "bg-indigo-600 text-white" : "text-slate-400"}`}
              >
                /ano
              </button>
              <button
                type="button"
                onClick={() => setRateType("MONTHLY")}
                className={`px-1.5 py-0.5 rounded ${rateType === "MONTHLY" ? "bg-indigo-600 text-white" : "text-slate-400"}`}
              >
                /mês
              </button>
            </div>
          </div>
          <input
            type="number"
            min="0"
            step="0.1"
            value={rate}
            onChange={(e) => setRate(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="12"
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-black text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>

        {/* Período */}
        <div className="flex flex-col gap-1.5 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3 text-purple-400" /> Período
            </label>
            <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[9px] font-bold">
              <button
                type="button"
                onClick={() => setPeriodType("YEARS")}
                className={`px-1.5 py-0.5 rounded ${periodType === "YEARS" ? "bg-purple-600 text-white" : "text-slate-400"}`}
              >
                Anos
              </button>
              <button
                type="button"
                onClick={() => setPeriodType("MONTHS")}
                className={`px-1.5 py-0.5 rounded ${periodType === "MONTHS" ? "bg-purple-600 text-white" : "text-slate-400"}`}
              >
                Meses
              </button>
            </div>
          </div>
          <input
            type="number"
            min="1"
            max="600"
            value={period}
            onChange={(e) => setPeriod(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="5"
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-black text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
          />
        </div>
      </div>

      {/* Results Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Final */}
        <div className="bg-gradient-to-br from-indigo-900/40 via-purple-900/30 to-slate-900 p-4 rounded-2xl border border-indigo-500/30 shadow-md">
          <span className="text-[10px] font-black text-indigo-300 uppercase tracking-wider">Valor Total Acumulado</span>
          <p className="text-2xl font-black text-white mt-1 font-tnum tabular-nums">{brl(simulation.finalTotal)}</p>
          <span className="text-[10px] font-extrabold text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded-full inline-block mt-2">
            Rendimento +{simulation.yieldPercentage.toFixed(1)}%
          </span>
        </div>

        {/* Total Investido */}
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider">Total Investido (Do Bolso)</span>
          <p className="text-xl font-black text-slate-200 mt-1 font-tnum tabular-nums">{brl(simulation.finalInvested)}</p>
          <span className="text-[10px] font-semibold text-slate-400 block mt-2">
            Aportes diretos efetuados
          </span>
        </div>

        {/* Total Juros */}
        <div className="bg-gradient-to-br from-emerald-900/40 via-slate-900 to-slate-900 p-4 rounded-2xl border border-emerald-500/30 shadow-md">
          <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider">Total em Juros Ganhos</span>
          <p className="text-xl font-black text-emerald-400 mt-1 font-tnum tabular-nums">+{brl(simulation.finalInterest)}</p>
          <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full inline-block mt-2">
            Efeito Juros Compostos 🚀
          </span>
        </div>
      </div>

      {/* Visual Chart */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-400" /> Curva de Crescimento Patrimonial
          </h4>
          <button
            type="button"
            onClick={() => setShowTable((prev) => !prev)}
            className="text-[10px] font-extrabold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-400/20 cursor-pointer"
          >
            <Table className="w-3 h-3" />
            {showTable ? "Ocultar Tabela" : "Ver Tabela Mês a Mês"}
          </button>
        </div>

        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={simulation.timeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.3} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => (v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${v}`)}
              />
              <Tooltip formatter={(val: any) => [brl(Number(val)), ""]} />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
              <Area type="monotone" dataKey="total" name="Patrimônio Total" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTotal)" />
              <Area type="monotone" dataKey="invested" name="Total Investido" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorInvested)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Optional Table Breakdown */}
      {showTable && (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 max-h-60 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-300 font-black uppercase text-[9px] sticky top-0 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Período</th>
                <th className="py-2.5 px-3 text-right">Total Investido</th>
                <th className="py-2.5 px-3 text-right">Juros Acumulados</th>
                <th className="py-2.5 px-3 text-right">Patrimônio Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-semibold text-slate-200">
              {simulation.timeline.map((row) => (
                <tr key={row.month} className="hover:bg-slate-800/40">
                  <td className="py-2 px-3">{row.label}</td>
                  <td className="py-2 px-3 text-right font-tnum text-slate-300">{brl(row.invested)}</td>
                  <td className="py-2 px-3 text-right font-tnum text-emerald-400">+{brl(row.interest)}</td>
                  <td className="py-2 px-3 text-right font-tnum font-black text-white">{brl(row.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
