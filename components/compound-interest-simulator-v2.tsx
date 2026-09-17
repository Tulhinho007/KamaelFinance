"use client";

import React, { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import {
  Calculator,
  Sparkles,
  TrendingUp,
  DollarSign,
  Calendar,
  RefreshCw,
  Percent,
  PiggyBank,
  Check,
  Copy,
  Info
} from "lucide-react";
import { useTheme } from "@/components/theme-context";

const brl = (v: number) =>
  (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface CompoundInterestSimulatorV2Props {
  currentNetWorth?: number;
}

export function CompoundInterestSimulatorV2({
  currentNetWorth
}: CompoundInterestSimulatorV2Props) {
  const { theme } = useTheme();

  // Estados dos inputs
  const [initialAmount, setInitialAmount] = useState<number>(5000);
  const [monthlyAmount, setMonthlyAmount] = useState<number>(800);
  const [annualRate, setAnnualRate] = useState<number>(12);
  const [years, setYears] = useState<number>(10);
  const [showTable, setShowTable] = useState(false);
  const [copied, setCopied] = useState(false);

  // Motor de cálculo de Juros Compostos v2.0
  const calculation = useMemo(() => {
    const pInit = Math.max(0, initialAmount || 0);
    const pMonth = Math.max(0, monthlyAmount || 0);
    const rAnnual = Math.max(0, annualRate || 0) / 100;
    const totalMonths = Math.max(1, years * 12);

    // Fórmula da taxa efetiva mensal: i_mensal = (1 + i_anual)^(1/12) - 1
    const monthlyRate =
      rAnnual > 0 ? Math.pow(1 + rAnnual, 1 / 12) - 1 : 0;

    let currentBalance = pInit;
    let investedCapital = pInit;

    const timeline: Array<{
      month: number;
      label: string;
      startBalance: number;
      deposit: number;
      interestEarned: number;
      investedCapital: number;
      totalBalance: number;
    }> = [];

    // Ponto inicial (Mês 0)
    timeline.push({
      month: 0,
      label: "Início",
      startBalance: 0,
      deposit: pInit,
      interestEarned: 0,
      investedCapital: pInit,
      totalBalance: pInit
    });

    for (let m = 1; m <= totalMonths; m++) {
      const startBalance = currentBalance;
      const interestEarned = currentBalance * monthlyRate;
      const deposit = pMonth;

      currentBalance = startBalance + interestEarned + deposit;
      investedCapital += deposit;

      const isYearEnd = m % 12 === 0;
      const label = isYearEnd ? `${m / 12}º Ano` : `Mês ${m}`;

      timeline.push({
        month: m,
        label,
        startBalance,
        deposit,
        interestEarned,
        investedCapital,
        totalBalance: currentBalance
      });
    }

    const finalAmount = currentBalance;
    const totalInvested = investedCapital;
    const totalInterest = Math.max(0, finalAmount - totalInvested);
    const wealthMultiplier =
      totalInvested > 0 ? (finalAmount / totalInvested).toFixed(2) : "0.00";
    const profitPercentage =
      totalInvested > 0
        ? ((totalInterest / totalInvested) * 100).toFixed(0)
        : "0";

    // Amostragem para o gráfico
    const chartData = timeline.filter((item) => {
      if (totalMonths <= 36) return true;
      return item.month === 0 || item.month % 6 === 0 || item.month === totalMonths;
    });

    return {
      monthlyRate,
      finalAmount,
      totalInvested,
      totalInterest,
      wealthMultiplier,
      profitPercentage,
      timeline,
      chartData,
      totalMonths
    };
  }, [initialAmount, monthlyAmount, annualRate, years]);

  const resetForm = () => {
    setInitialAmount(5000);
    setMonthlyAmount(800);
    setAnnualRate(12);
    setYears(10);
  };

  const handleCopySummary = () => {
    const text =
      `📊 *Simulação de Juros Compostos v2.0 (Kamael Finance)*\n` +
      `• Aporte Inicial: ${brl(initialAmount)}\n` +
      `• Aporte Mensal: ${brl(monthlyAmount)}\n` +
      `• Taxa Anual: ${annualRate}% a.a. (${(calculation.monthlyRate * 100).toFixed(2)}% a.m.)\n` +
      `• Prazo: ${years} anos (${calculation.totalMonths} meses)\n` +
      `------------------------------------\n` +
      `💰 *Montante Final: ${brl(calculation.finalAmount)}*\n` +
      `🏦 Total Investido: ${brl(calculation.totalInvested)}\n` +
      `✨ Lucro em Juros: ${brl(calculation.totalInterest)} (+${calculation.profitPercentage}% / ${calculation.wealthMultiplier}x)`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="card-glow p-6 sm:p-7 flex flex-col gap-6 select-none font-sans bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm text-slate-900 dark:text-slate-100 transition-all">
      {/* ── 1. HEADER DO SIMULADOR V2.0 ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-500/30 shadow-xs">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                Versão 2.0 Pro
              </span>
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Calculadora de Juros Compostos & Evolução Patrimonial
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Simulação matemática de juros compostos com cálculo em tempo real e curva exponencial.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={resetForm}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 cursor-pointer shadow-xs"
            title="Redefinir Valores Padrão"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Redefinir
          </button>
          <button
            onClick={handleCopySummary}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" /> Copiado!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Copiar Resumo
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── 2. CARDS DE KPI (DESTAQUES NO TOPO) ──────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        {/* Card 1: Montante Acumulado */}
        <div className="bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900/90 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-4.5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Montante Acumulado</span>
            <PiggyBank className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {brl(calculation.finalAmount)}
          </div>
          <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{calculation.wealthMultiplier}x o valor investido</span>
          </div>
        </div>

        {/* Card 2: Total Investido (Do Bolso) */}
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4.5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-sky-600 dark:text-sky-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Investido (Bolso)</span>
            <DollarSign className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {brl(calculation.totalInvested)}
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-semibold">
            {years} anos ({calculation.totalMonths} meses) de aportes
          </div>
        </div>

        {/* Card 3: Total em Juros Ganhos */}
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4.5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-teal-600 dark:text-teal-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total em Juros Ganhos</span>
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-teal-600 dark:text-teal-300 tracking-tight">
            {brl(calculation.totalInterest)}
          </div>
          <div className="mt-2 text-xs text-teal-600 dark:text-teal-400 font-bold">
            +{calculation.profitPercentage}% de lucro puro
          </div>
        </div>

        {/* Card 4: Taxa Efetiva Mensal */}
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4.5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Taxa Efetiva Mensal</span>
            <Percent className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {(calculation.monthlyRate * 100).toFixed(2)}%{" "}
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">a.m.</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-semibold">
            Equivalente a {annualRate}% ao ano
          </div>
        </div>
      </div>

      {/* ── 3. GRID PRINCIPAL: CONTROLES + GRÁFICO ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Painel de Controles */}
        <div className="lg:col-span-5 bg-slate-50/70 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Parâmetros de Simulação
            </h4>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Tempo real</span>
          </div>

          {/* 1. Valor Inicial */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Valor Inicial (R$)</label>
              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">{brl(initialAmount)}</span>
            </div>
            <input
              type="number"
              min="0"
              step="500"
              value={initialAmount}
              onChange={(e) => setInitialAmount(Math.max(0, Number(e.target.value)))}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-emerald-500 transition-colors shadow-xs"
            />
            <input
              type="range"
              min="0"
              max="200000"
              step="1000"
              value={initialAmount}
              onChange={(e) => setInitialAmount(Number(e.target.value))}
              className="w-full mt-2 accent-emerald-500 cursor-pointer"
            />
            {/* Presets */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[0, 5000, 20000, 50000].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setInitialAmount(v)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-bold transition-all cursor-pointer ${
                    initialAmount === v
                      ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40"
                      : "bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  {v === 0 ? "R$ 0" : `R$ ${(v / 1000).toFixed(0)}k`}
                </button>
              ))}
              {currentNetWorth !== undefined && currentNetWorth > 0 && (
                <button
                  type="button"
                  onClick={() => setInitialAmount(Math.round(currentNetWorth))}
                  className="text-[11px] px-2.5 py-1 rounded-lg border font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-400/30 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" /> Meu Patrimônio ({brl(currentNetWorth)})
                </button>
              )}
            </div>
          </div>

          {/* 2. Aporte Mensal */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Aporte Mensal (R$)</label>
              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">{brl(monthlyAmount)}</span>
            </div>
            <input
              type="number"
              min="0"
              step="100"
              value={monthlyAmount}
              onChange={(e) => setMonthlyAmount(Math.max(0, Number(e.target.value)))}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-emerald-500 transition-colors shadow-xs"
            />
            <input
              type="range"
              min="0"
              max="20000"
              step="100"
              value={monthlyAmount}
              onChange={(e) => setMonthlyAmount(Number(e.target.value))}
              className="w-full mt-2 accent-emerald-500 cursor-pointer"
            />
            {/* Presets */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[0, 300, 500, 1000, 2500].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setMonthlyAmount(v)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-bold transition-all cursor-pointer ${
                    monthlyAmount === v
                      ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40"
                      : "bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  {v === 0 ? "Sem aporte (R$ 0)" : `+${v}`}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Taxa de Juros Anual */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Taxa Anual (% a.a.)</label>
              <span className="text-xs font-extrabold text-teal-600 dark:text-teal-400">{annualRate}% a.a.</span>
            </div>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={annualRate}
              onChange={(e) => setAnnualRate(Math.max(0, Number(e.target.value)))}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-teal-500 transition-colors shadow-xs"
            />
            <input
              type="range"
              min="0"
              max="30"
              step="0.25"
              value={annualRate}
              onChange={(e) => setAnnualRate(Number(e.target.value))}
              className="w-full mt-2 accent-teal-500 cursor-pointer"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[
                { label: "8% (IPCA+)", val: 8 },
                { label: "10.5% (Conservador)", val: 10.5 },
                { label: "13.65% (CDI)", val: 13.65 },
                { label: "18% (Ações)", val: 18 }
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => setAnnualRate(p.val)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-bold transition-all cursor-pointer ${
                    annualRate === p.val
                      ? "bg-teal-50 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-500/40"
                      : "bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Prazo em Anos */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Prazo de Aplicação (Anos)</label>
              <span className="text-xs font-extrabold text-sky-600 dark:text-sky-400">
                {years} anos ({calculation.totalMonths} meses)
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="40"
              step="1"
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[1, 5, 10, 20, 30].map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setYears(y)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-bold transition-all cursor-pointer ${
                    years === y
                      ? "bg-sky-50 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-500/40"
                      : "bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  {y} {y === 1 ? "ano" : "anos"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Gráfico de Evolução */}
        <div className="lg:col-span-7 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base">Curva Exponencial de Patrimônio</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Comparação real entre capital investido (do bolso) e juros compostos
                </p>
              </div>
              <button
                onClick={() => setShowTable(!showTable)}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold transition-colors cursor-pointer"
              >
                {showTable ? "Ocultar Tabela" : "Ver Tabela"}
              </button>
            </div>

            <div className="h-72 sm:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={calculation.chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="v2ColorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="v2ColorInvested" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={theme === "dark" ? "#1e293b" : "#f1f5f9"}
                    opacity={0.8}
                  />
                  <XAxis
                    dataKey="label"
                    stroke={theme === "dark" ? "#64748b" : "#94a3b8"}
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke={theme === "dark" ? "#64748b" : "#94a3b8"}
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => {
                      if (val >= 1000000) return `R$ ${(val / 1000000).toFixed(1)}M`;
                      if (val >= 1000) return `R$ ${(val / 1000).toFixed(0)}k`;
                      return `R$ ${val}`;
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme === "dark" ? "#0f172a" : "#ffffff",
                      borderColor: theme === "dark" ? "#334155" : "#e2e8f0",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                      color: theme === "dark" ? "#f8fafc" : "#0f172a",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
                    }}
                    formatter={(val: any, name: any) => [
                      brl(Number(val)),
                      name === "totalBalance" ? "Montante Total" : "Capital Investido"
                    ]}
                    labelFormatter={(label) => `Período: ${label}`}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                    formatter={(value) =>
                      value === "totalBalance" ? "Montante Total (Com Juros)" : "Capital Investido (Do Bolso)"
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="totalBalance"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#v2ColorTotal)"
                  />
                  <Area
                    type="monotone"
                    dataKey="investedCapital"
                    stroke="#0284c7"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#v2ColorInvested)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3.5 mt-4 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>Efeito Bola de Neve:</strong> Conforme os anos avançam, a linha verde se descola exponencialmente da linha azul de aportes. Isso acontece porque os rendimentos passam a render sobre rendimentos anteriores.
            </span>
          </div>
        </div>
      </div>

      {/* ── 4. TABELA DEMONSTRATIVA EXPANSÍVEL ──────────────────────────── */}
      {showTable && (
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 overflow-hidden shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
              Evolução Mês a Mês da Aplicação ({calculation.timeline.length - 1} meses)
            </h4>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Valores nominais</span>
          </div>
          <div className="max-h-96 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-bold border-b border-slate-200 dark:border-slate-800 z-10">
                <tr>
                  <th className="py-2.5 px-4">Período</th>
                  <th className="py-2.5 px-4">Saldo Inicial</th>
                  <th className="py-2.5 px-4">Aporte</th>
                  <th className="py-2.5 px-4">Juros Ganhos</th>
                  <th className="py-2.5 px-4">Capital Investido</th>
                  <th className="py-2.5 px-4">Saldo Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {calculation.timeline.map((row) => (
                  <tr key={row.month} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-4 font-bold text-slate-900 dark:text-white">{row.label}</td>
                    <td className="py-2 px-4">{brl(row.startBalance)}</td>
                    <td className="py-2 px-4 text-sky-600 dark:text-sky-400">
                      {row.month === 0 ? "-" : `+${brl(row.deposit)}`}
                    </td>
                    <td className="py-2 px-4 text-teal-600 dark:text-teal-400">
                      {row.month === 0 ? "-" : `+${brl(row.interestEarned)}`}
                    </td>
                    <td className="py-2 px-4">{brl(row.investedCapital)}</td>
                    <td className="py-2 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                      {brl(row.totalBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
