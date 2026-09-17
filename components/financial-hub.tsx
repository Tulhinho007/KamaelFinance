"use client";

import React, { useState, useMemo } from "react";
import {
  Calculator,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Percent,
  CheckCircle2,
  Zap,
  Info,
  PiggyBank,
  Flame,
  Check,
  Copy,
  Plus,
  Trash2,
  RotateCcw,
  BarChart3,
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  ReferenceLine
} from "recharts";
import {
  calculateCompoundInterest,
  calculateEmergencyFund,
  formatBRL,
  EmploymentProfile
} from "@/lib/financial-engine";
import { useTheme } from "@/components/theme-context";

type CalculatorType = "compound" | "emergency";
type CompoundVersion = "v1" | "v2";

interface CalculatorCardInfo {
  id: CalculatorType;
  title: string;
  shortDesc: string;
  timeEstimate: string;
  icon: React.ElementType;
  accentColor: string;
  badge: string;
}

const CALCULATORS: CalculatorCardInfo[] = [
  {
    id: "compound",
    title: "Juros Compostos & Performance",
    shortDesc: "Simule a projeção tradicional ou audite seu extrato real de lucros e perdas mês a mês.",
    timeEstimate: "⚡ 1 min",
    icon: TrendingUp,
    accentColor: "emerald",
    badge: "Versões 1.0 & 2.0"
  },
  {
    id: "emergency",
    title: "Reserva de Emergência",
    shortDesc: "Calcule a blindagem necessária de acordo com sua estabilidade profissional.",
    timeEstimate: "⚡ 1 min",
    icon: ShieldCheck,
    accentColor: "sky",
    badge: "Proteção"
  }
];

export function FinancialHub() {
  const [activeTab, setActiveTab] = useState<CalculatorType>("compound");
  const [compoundVersion, setCompoundVersion] = useState<CompoundVersion>("v1");
  const [copied, setCopied] = useState(false);

  // ==========================================
  // ESTADOS - 1. JUROS COMPOSTOS V1.0 (TRADICIONAL)
  // ==========================================
  const [ciInitial, setCiInitial] = useState<number>(5000);
  const [ciMonthly, setCiMonthly] = useState<number>(800);
  const [ciAnnualRate, setCiAnnualRate] = useState<number>(12); // % a.a.
  const [ciYears, setCiYears] = useState<number>(10);
  const [ciShowTable, setCiShowTable] = useState<boolean>(false);

  const compoundResult = useMemo(() => {
    return calculateCompoundInterest(
      ciInitial,
      ciMonthly,
      ciAnnualRate / 100,
      ciYears * 12
    );
  }, [ciInitial, ciMonthly, ciAnnualRate, ciYears]);

  // ==========================================
  // ESTADOS - 2. SIMULAÇÃO POR EXTRATO V2.0 (PERFORMANCE)
  // ==========================================
  const [initialCapitalV2, setInitialCapitalV2] = useState<number>(10000);
  const [monthlyEntries, setMonthlyEntries] = useState<Array<{ id: number; label: string; plAmount: number }>>([
    { id: 1, label: "Mês 1", plAmount: 420 },
    { id: 2, label: "Mês 2", plAmount: 580 },
    { id: 3, label: "Mês 3", plAmount: -190 },
    { id: 4, label: "Mês 4", plAmount: 640 },
    { id: 5, label: "Mês 5", plAmount: 810 },
    { id: 6, label: "Mês 6", plAmount: -120 },
    { id: 7, label: "Mês 7", plAmount: 950 },
    { id: 8, label: "Mês 8", plAmount: 720 },
    { id: 9, label: "Mês 9", plAmount: 1100 },
    { id: 10, label: "Mês 10", plAmount: -340 },
    { id: 11, label: "Mês 11", plAmount: 1250 },
    { id: 12, label: "Mês 12", plAmount: 1400 },
  ]);

  const performanceResult = useMemo(() => {
    let runningBalance = initialCapitalV2;
    let totalProfitLoss = 0;
    let winMonths = 0;
    let lossMonths = 0;

    let bestMonth = { label: "-", pl: -Infinity, roi: -Infinity };
    let worstMonth = { label: "-", pl: Infinity, roi: Infinity };

    const timeline: Array<{
      month: number;
      label: string;
      startBalance: number;
      plAmount: number;
      roiPercent: number;
      finalBalance: number;
      cumulativePL: number;
    }> = [];

    // Ponto zero
    timeline.push({
      month: 0,
      label: "Início",
      startBalance: initialCapitalV2,
      plAmount: 0,
      roiPercent: 0,
      finalBalance: initialCapitalV2,
      cumulativePL: 0
    });

    monthlyEntries.forEach((entry, idx) => {
      const startBalance = runningBalance;
      const pl = entry.plAmount || 0;
      const roiPercent = startBalance > 0 ? (pl / startBalance) * 100 : 0;
      const finalBalance = startBalance + pl;

      runningBalance = finalBalance;
      totalProfitLoss += pl;

      if (pl >= 0) winMonths++;
      else lossMonths++;

      if (pl > bestMonth.pl) {
        bestMonth = { label: entry.label, pl, roi: roiPercent };
      }
      if (pl < worstMonth.pl) {
        worstMonth = { label: entry.label, pl, roi: roiPercent };
      }

      timeline.push({
        month: idx + 1,
        label: entry.label,
        startBalance,
        plAmount: pl,
        roiPercent,
        finalBalance,
        cumulativePL: totalProfitLoss
      });
    });

    const totalROI = initialCapitalV2 > 0 ? (totalProfitLoss / initialCapitalV2) * 100 : 0;
    const finalBalance = runningBalance;
    const winRate = monthlyEntries.length > 0 ? (winMonths / monthlyEntries.length) * 100 : 0;

    return {
      finalBalance,
      totalProfitLoss,
      totalROI,
      winRate,
      winMonths,
      lossMonths,
      bestMonth: bestMonth.pl === -Infinity ? { label: "-", pl: 0, roi: 0 } : bestMonth,
      worstMonth: worstMonth.pl === Infinity ? { label: "-", pl: 0, roi: 0 } : worstMonth,
      timeline
    };
  }, [initialCapitalV2, monthlyEntries]);

  // ==========================================
  // ESTADOS - 3. RESERVA DE EMERGÊNCIA
  // ==========================================
  const [efCost, setEfCost] = useState<number>(4500);
  const [efProfile, setEfProfile] = useState<EmploymentProfile>("clt");
  const [efSavings, setEfSavings] = useState<number>(13500);

  const emergencyResult = useMemo(() => {
    return calculateEmergencyFund(efCost, efProfile, efSavings);
  }, [efCost, efProfile, efSavings]);

  // Copiar resumo da simulação
  const handleCopySummary = () => {
    let text = "";
    if (activeTab === "compound") {
      if (compoundVersion === "v1") {
        text = `📊 *Simulação de Juros Compostos v1.0 (Kamael Finance)*\n- Aporte Inicial: ${formatBRL(ciInitial)}\n- Aporte Mensal: ${formatBRL(ciMonthly)}\n- Taxa Anual: ${ciAnnualRate}%\n- Prazo: ${ciYears} anos\n👉 *Montante Final: ${formatBRL(compoundResult.finalAmount)}*\n- Total Investido: ${formatBRL(compoundResult.totalInvested)}\n- Total em Juros: ${formatBRL(compoundResult.totalInterest)} (${compoundResult.wealthMultiplier}x do capital investido)`;
      } else {
        text = `📈 *Extrato de Performance v2.0 (Kamael Finance)*\n- Capital Inicial: ${formatBRL(initialCapitalV2)}\n- Saldo Atual: ${formatBRL(performanceResult.finalBalance)}\n- Lucro Total (P/L): ${formatBRL(performanceResult.totalProfitLoss)} (${performanceResult.totalROI.toFixed(2)}% ROI)\n- Taxa de Acerto: ${performanceResult.winRate.toFixed(0)}% (${performanceResult.winMonths} vitórias / ${performanceResult.lossMonths} derrotas)\n- Melhor Mês: ${performanceResult.bestMonth.label} (+${formatBRL(performanceResult.bestMonth.pl)})\n- Pior Mês: ${performanceResult.worstMonth.label} (${formatBRL(performanceResult.worstMonth.pl)})`;
      }
    } else if (activeTab === "emergency") {
      text = `🛡️ *Reserva de Emergência (Kamael Finance)*\n- Custo Fixo: ${formatBRL(efCost)}/mês\n- Perfil: ${efProfile.toUpperCase()}\n- Meta (${emergencyResult.recommendedMonths} meses): ${formatBRL(emergencyResult.targetAmount)}\n- Saldo Atual: ${formatBRL(efSavings)} (${emergencyResult.coverageMonths} meses)\n👉 *Status: ${emergencyResult.statusLabel} (${emergencyResult.coveragePercentage}%)*`;
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      {/* HEADER PRINCIPAL */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Central de Inteligência
              </span>
              <span className="px-2.5 py-0.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md">
                Motor Matemático v2.0
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              Calculadoras Financeiras Pessoais
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base mt-1 max-w-2xl">
              Tome decisões financeiras com precisão matemática pura. Simule juros compostos, dimensione sua reserva e audite extratos de rendimentos reais.
            </p>
          </div>

          <button
            onClick={handleCopySummary}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/70 text-slate-700 dark:text-slate-200 text-sm font-medium transition-all shadow-xs hover:border-slate-300 dark:hover:border-slate-600 active:scale-95 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Resumo Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-400" />
                <span>Copiar Simulação</span>
              </>
            )}
          </button>
        </div>

        {/* GRID DE SELEÇÃO DE CALCULADORAS PRINCIPAIS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {CALCULATORS.map((calc) => {
            const Icon = calc.icon;
            const isActive = activeTab === calc.id;
            return (
              <button
                key={calc.id}
                onClick={() => setActiveTab(calc.id)}
                className={`relative flex flex-col text-left p-5 rounded-2xl transition-all duration-200 border cursor-pointer ${
                  isActive
                    ? "bg-white dark:bg-slate-900/95 border-emerald-500/60 ring-2 ring-emerald-500/20 shadow-md shadow-emerald-500/5"
                    : "bg-white/80 hover:bg-white dark:bg-slate-900/40 dark:hover:bg-slate-900/70 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700/70 shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                      isActive
                        ? "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-500/30"
                        : "bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700/40">
                      {calc.timeEstimate}
                    </span>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isActive
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                          : "bg-slate-100 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-transparent"
                      }`}
                    >
                      {calc.badge}
                    </span>
                  </div>
                </div>

                <h3 className={`text-base font-bold mb-1 ${isActive ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-200"}`}>
                  {calc.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {calc.shortDesc}
                </p>

                {isActive && (
                  <div className="absolute bottom-0 left-6 right-6 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTEÚDO DINÂMICO */}
      <div className="max-w-7xl mx-auto">
        {activeTab === "compound" && (
          <div className="space-y-6">
            {/* CHAVEADOR DE VERSÃO (TABS / TOGGLE V1 vs V2) */}
            <div className="flex items-center justify-between flex-wrap gap-3 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-2 rounded-2xl shadow-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCompoundVersion("v1")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    compoundVersion === "v1"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" /> Versão 1.0 (Projeção Composta Tradicional)
                </button>
                <button
                  type="button"
                  onClick={() => setCompoundVersion("v2")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    compoundVersion === "v2"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" /> Versão 2.0 (Simulação por Extrato & Performance)
                </button>
              </div>

              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium px-2">
                {compoundVersion === "v1"
                  ? "Aportes fixos + juros exponenciais matemáticos"
                  : "Controle de lucros/prejuízos reais mês a mês (P/L e ROI)"}
              </span>
            </div>

            {/* RENDERIZAÇÃO DA VERSÃO ESCOLHIDA */}
            {compoundVersion === "v1" ? (
              <CompoundInterestView
                initial={ciInitial}
                setInitial={setCiInitial}
                monthly={ciMonthly}
                setMonthly={setCiMonthly}
                annualRate={ciAnnualRate}
                setAnnualRate={setCiAnnualRate}
                years={ciYears}
                setYears={setCiYears}
                result={compoundResult}
                showTable={ciShowTable}
                setShowTable={setCiShowTable}
              />
            ) : (
              <PerformanceExtratoView
                initialCapital={initialCapitalV2}
                setInitialCapital={setInitialCapitalV2}
                entries={monthlyEntries}
                setEntries={setMonthlyEntries}
                result={performanceResult}
              />
            )}
          </div>
        )}

        {activeTab === "emergency" && (
          <EmergencyFundView
            cost={efCost}
            setCost={setEfCost}
            profile={efProfile}
            setProfile={setEfProfile}
            savings={efSavings}
            setSavings={setEfSavings}
            result={emergencyResult}
          />
        )}
      </div>
    </div>
  );
}

// =====================================================================
// VIEW 1: JUROS COMPOSTOS V1.0 (PROJEÇÃO TRADICIONAL)
// =====================================================================

interface CompoundProps {
  initial: number;
  setInitial: (v: number) => void;
  monthly: number;
  setMonthly: (v: number) => void;
  annualRate: number;
  setAnnualRate: (v: number) => void;
  years: number;
  setYears: (v: number) => void;
  result: ReturnType<typeof calculateCompoundInterest>;
  showTable: boolean;
  setShowTable: (v: boolean) => void;
}

function CompoundInterestView({
  initial,
  setInitial,
  monthly,
  setMonthly,
  annualRate,
  setAnnualRate,
  years,
  setYears,
  result,
  showTable,
  setShowTable,
}: CompoundProps) {
  const { theme } = useTheme();

  const chartData = useMemo(() => {
    return result.timeline.filter((item) => {
      if (result.periodMonths <= 36) return true;
      return item.month === 0 || item.month % 6 === 0 || item.month === result.periodMonths;
    });
  }, [result]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* CARDS DE KPI DE RESULTADOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900/90 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-5 relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Montante Acumulado</span>
            <PiggyBank className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {formatBRL(result.finalAmount)}
          </div>
          <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400/90 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{result.wealthMultiplier}x o valor investido</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-sky-600 dark:text-sky-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Investido (Do Bolso)</span>
            <DollarSign className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {formatBRL(result.totalInvested)}
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {years} anos ({result.periodMonths} meses) de aportes
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-teal-600 dark:text-teal-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total em Juros Ganhos</span>
            <Sparkles className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-teal-600 dark:text-teal-300 tracking-tight">
            {formatBRL(result.totalInterest)}
          </div>
          <div className="mt-2 text-xs text-teal-600/90 dark:text-teal-400/80 font-medium">
            {result.totalInvested > 0 ? ((result.totalInterest / result.totalInvested) * 100).toFixed(0) : 0}% de lucro puro
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Taxa Efetiva Mensal</span>
            <Percent className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {(result.monthlyEffectiveRate * 100).toFixed(2)}% <span className="text-sm font-normal text-slate-500 dark:text-slate-400">a.m.</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Equivalente a {annualRate}% ao ano
          </div>
        </div>
      </div>

      {/* GRID: FORMULÁRIO DE CONTROLES + GRÁFICO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* PAINEL DE CONTROLES */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h4 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> Parâmetros da Simulação
            </h4>
            <span className="text-xs text-slate-500 dark:text-slate-400">Atualização em tempo real</span>
          </div>

          {/* Aporte Inicial */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Valor Inicial (R$)</label>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatBRL(initial)}</span>
            </div>
            <input
              type="number"
              min="0"
              step="500"
              value={initial}
              onChange={(e) => setInitial(Math.max(0, Number(e.target.value)))}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
            />
            <input
              type="range"
              min="0"
              max="200000"
              step="1000"
              value={initial}
              onChange={(e) => setInitial(Number(e.target.value))}
              className="w-full mt-2 accent-emerald-500 cursor-pointer"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[0, 5000, 20000, 50000].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setInitial(v)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-bold transition-all cursor-pointer ${
                    initial === v
                      ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40"
                      : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                  }`}
                >
                  {v === 0 ? "R$ 0" : `R$ ${(v / 1000).toFixed(0)}k`}
                </button>
              ))}
            </div>
          </div>

          {/* Aporte Mensal */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Aporte Mensal (R$)</label>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatBRL(monthly)}</span>
            </div>
            <input
              type="number"
              min="0"
              step="100"
              value={monthly}
              onChange={(e) => setMonthly(Math.max(0, Number(e.target.value)))}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
            />
            <input
              type="range"
              min="0"
              max="20000"
              step="100"
              value={monthly}
              onChange={(e) => setMonthly(Number(e.target.value))}
              className="w-full mt-2 accent-emerald-500 cursor-pointer"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[0, 300, 500, 1000, 2500].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setMonthly(val)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-bold transition-all cursor-pointer ${
                    monthly === val
                      ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40"
                      : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                  }`}
                >
                  {val === 0 ? "Sem aporte (R$ 0)" : `+${val}`}
                </button>
              ))}
            </div>
          </div>

          {/* Taxa de Juros Anual */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Taxa de Juros Anual (% a.a.)</label>
              <span className="text-sm font-bold text-teal-600 dark:text-teal-400">{annualRate}% a.a.</span>
            </div>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={annualRate}
              onChange={(e) => setAnnualRate(Math.max(0, Number(e.target.value)))}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
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
            <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              <span>0% (Sem rend.)</span>
              <span>10% (Conservador)</span>
              <span>13% (CDI)</span>
              <span>18%+ (Ações)</span>
            </div>
          </div>

          {/* Período em Anos */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Prazo de Aplicação (Anos)</label>
              <span className="text-sm font-bold text-sky-600 dark:text-sky-400">{years} anos ({years * 12} meses)</span>
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
                      : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                  }`}
                >
                  {y} {y === 1 ? "ano" : "anos"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* GRÁFICO DE EVOLUÇÃO TEMPORAL */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base">Curva Exponencial de Patrimônio</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Aporte inicial, aportes acumulados e juros compostos</p>
              </div>
              <button
                onClick={() => setShowTable(!showTable)}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer font-bold"
              >
                {showTable ? "Ocultar Tabela" : "Ver Tabela"}
              </button>
            </div>

            <div className="h-72 sm:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#334155" : "#e2e8f0"} opacity={0.6} />
                  <XAxis dataKey="label" stroke={theme === "dark" ? "#64748b" : "#94a3b8"} fontSize={11} />
                  <YAxis
                    stroke={theme === "dark" ? "#64748b" : "#94a3b8"}
                    fontSize={11}
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
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
                    }}
                    formatter={(val: any, name: any) => [
                      formatBRL(Number(val)),
                      name === "totalBalance" ? "Montante Total" : name === "investedCapital" ? "Total Investido" : "Juros"
                    ]}
                    labelFormatter={(label) => `Período: ${label}`}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                    formatter={(value) =>
                      value === "totalBalance" ? "Montante Total" : "Capital Investido"
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="totalBalance"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorTotal)"
                  />
                  <Area
                    type="monotone"
                    dataKey="investedCapital"
                    stroke="#0284c7"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorInvested)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3.5 mt-4 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-teal-500 dark:text-teal-400 shrink-0 mt-0.5" />
            <span>
              <strong>Efeito Bola de Neve:</strong> Se o aporte mensal for zero, o capital investido mantém-se constante em linha reta enquanto os juros compostos multiplicam seu patrimônio exponencialmente.
            </span>
          </div>
        </div>
      </div>

      {/* TABELA DE EVOLUÇÃO (OPCIONAL) */}
      {showTable && (
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 overflow-hidden shadow-xs">
          <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-3">Detalhamento Anual dos Juros Compostos</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-4">Ano / Mês</th>
                  <th className="py-2.5 px-4">Capital Investido</th>
                  <th className="py-2.5 px-4">Juros Acumulados</th>
                  <th className="py-2.5 px-4">Montante Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {result.timeline
                  .filter((row) => row.month === 0 || row.month % 12 === 0 || row.month === result.periodMonths)
                  .map((row) => (
                    <tr key={row.month} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-2 px-4 font-semibold text-slate-900 dark:text-white">{row.label}</td>
                      <td className="py-2 px-4 text-sky-600 dark:text-sky-400">{formatBRL(row.investedCapital)}</td>
                      <td className="py-2 px-4 text-teal-600 dark:text-teal-400">{formatBRL(row.interestAccumulated)}</td>
                      <td className="py-2 px-4 font-bold text-emerald-600 dark:text-emerald-400">{formatBRL(row.totalBalance)}</td>
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

// =====================================================================
// VIEW 2: SIMULAÇÃO POR EXTRATO DE RENDIMENTOS V2.0 (PERFORMANCE P/L)
// =====================================================================

interface PerformanceProps {
  initialCapital: number;
  setInitialCapital: (v: number) => void;
  entries: Array<{ id: number; label: string; plAmount: number }>;
  setEntries: React.Dispatch<React.SetStateAction<Array<{ id: number; label: string; plAmount: number }>>>;
  result: {
    finalBalance: number;
    totalProfitLoss: number;
    totalROI: number;
    winRate: number;
    winMonths: number;
    lossMonths: number;
    bestMonth: { label: string; pl: number; roi: number };
    worstMonth: { label: string; pl: number; roi: number };
    timeline: Array<{
      month: number;
      label: string;
      startBalance: number;
      plAmount: number;
      roiPercent: number;
      finalBalance: number;
      cumulativePL: number;
    }>;
  };
}

function PerformanceExtratoView({
  initialCapital,
  setInitialCapital,
  entries,
  setEntries,
  result
}: PerformanceProps) {
  const { theme } = useTheme();

  const handleUpdateEntry = (id: number, plAmount: number) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, plAmount } : e))
    );
  };

  const handleAddMonth = () => {
    const nextId = entries.length > 0 ? Math.max(...entries.map((e) => e.id)) + 1 : 1;
    setEntries((prev) => [
      ...prev,
      { id: nextId, label: `Mês ${nextId}`, plAmount: 500 }
    ]);
  };

  const handleRemoveMonth = (id: number) => {
    if (entries.length <= 1) return;
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleApplyPreset = (type: "steady" | "volatile" | "conservative") => {
    if (type === "steady") {
      setInitialCapital(10000);
      setEntries([
        { id: 1, label: "Mês 1", plAmount: 450 },
        { id: 2, label: "Mês 2", plAmount: 520 },
        { id: 3, label: "Mês 3", plAmount: 480 },
        { id: 4, label: "Mês 4", plAmount: 610 },
        { id: 5, label: "Mês 5", plAmount: 590 },
        { id: 6, label: "Mês 6", plAmount: 670 },
      ]);
    } else if (type === "volatile") {
      setInitialCapital(15000);
      setEntries([
        { id: 1, label: "Mês 1", plAmount: 1200 },
        { id: 2, label: "Mês 2", plAmount: -850 },
        { id: 3, label: "Mês 3", plAmount: 1650 },
        { id: 4, label: "Mês 4", plAmount: -600 },
        { id: 5, label: "Mês 5", plAmount: 2100 },
        { id: 6, label: "Mês 6", plAmount: 1400 },
      ]);
    } else {
      setInitialCapital(50000);
      setEntries([
        { id: 1, label: "Mês 1", plAmount: 480 },
        { id: 2, label: "Mês 2", plAmount: 510 },
        { id: 3, label: "Mês 3", plAmount: 495 },
        { id: 4, label: "Mês 4", plAmount: 520 },
      ]);
    }
  };

  const isProfitable = result.totalProfitLoss >= 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── 1. CARDS DE RESULTADOS DA PERFORMANCE V2.0 ────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Saldo Atual */}
        <div className="bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900/90 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Saldo Atual Acumulado</span>
            <PiggyBank className="w-5 h-5" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {formatBRL(result.finalBalance)}
          </div>
          <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Capital Inicial: {formatBRL(initialCapital)}</span>
          </div>
        </div>

        {/* Card 2: Lucro Total (P/L Sum) */}
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Lucro Líquido (P/L)</span>
            <DollarSign className="w-5 h-5" />
          </div>
          <div className={`text-2xl sm:text-3xl font-black tracking-tight ${
            isProfitable ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
          }`}>
            {isProfitable ? `+${formatBRL(result.totalProfitLoss)}` : formatBRL(result.totalProfitLoss)}
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-semibold">
            {result.timeline.length - 1} meses operados
          </div>
        </div>

        {/* Card 3: ROI Total Acumulado */}
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-teal-600 dark:text-teal-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Retorno Total (ROI)</span>
            <Percent className="w-5 h-5" />
          </div>
          <div className={`text-2xl sm:text-3xl font-black tracking-tight ${
            result.totalROI >= 0 ? "text-teal-600 dark:text-teal-300" : "text-rose-600 dark:text-rose-400"
          }`}>
            {result.totalROI >= 0 ? `+${result.totalROI.toFixed(2)}%` : `${result.totalROI.toFixed(2)}%`}
          </div>
          <div className="mt-2 text-xs text-teal-600/90 dark:text-teal-400/80 font-bold">
            Taxa de Acerto: {result.winRate.toFixed(0)}% ({result.winMonths}G / {result.lossMonths}P)
          </div>
        </div>

        {/* Card 4: Melhor / Pior Mês */}
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Melhor & Pior Mês</span>
            <BarChart3 className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="space-y-1 mt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 font-semibold">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" /> {result.bestMonth.label}:
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                +{formatBRL(result.bestMonth.pl)} ({result.bestMonth.roi.toFixed(1)}%)
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 font-semibold">
                <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" /> {result.worstMonth.label}:
              </span>
              <span className="font-bold text-rose-600 dark:text-rose-400">
                {formatBRL(result.worstMonth.pl)} ({result.worstMonth.roi.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. GRÁFICO DE EVOLUÇÃO PATRIMONIAL DO EXTRATO (FLUTUAÇÃO REAL) ──── */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-base">Curva de Flutuação Real do Saldo</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Evolução do saldo final ao longo dos meses conforme lucros e perdas do extrato
            </p>
          </div>

          {/* Presets rápidos de cenário */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Exemplos:</span>
            <button
              type="button"
              onClick={() => handleApplyPreset("steady")}
              className="text-[11px] px-2.5 py-1 rounded-lg border font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              Crescimento Constante
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset("volatile")}
              className="text-[11px] px-2.5 py-1 rounded-lg border font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              Alta Volatilidade
            </button>
          </div>
        </div>

        <div className="h-72 sm:h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={result.timeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isProfitable ? "#10b981" : "#ef4444"} stopOpacity={0.6} />
                  <stop offset="95%" stopColor={isProfitable ? "#10b981" : "#ef4444"} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#334155" : "#e2e8f0"} opacity={0.6} />
              <XAxis dataKey="label" stroke={theme === "dark" ? "#64748b" : "#94a3b8"} fontSize={11} />
              <YAxis
                stroke={theme === "dark" ? "#64748b" : "#94a3b8"}
                fontSize={11}
                tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
              />
              <ReferenceLine y={initialCapital} stroke="#64748b" strokeDasharray="4 4" label={{ value: "Capital Inicial", position: "insideBottomRight", fill: "#94a3b8", fontSize: 10 }} />
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
                  formatBRL(Number(val)),
                  name === "finalBalance" ? "Saldo Final" : "Lucro Acumulado"
                ]}
                labelFormatter={(label) => `Período: ${label}`}
              />
              <Legend
                wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                formatter={(value) => (value === "finalBalance" ? "Saldo Final Acumulado" : "Lucro Líquido Acumulado")}
              />
              <Area
                type="monotone"
                dataKey="finalBalance"
                stroke={isProfitable ? "#10b981" : "#ef4444"}
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorBalance)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── 3. TABELA INTERATIVA DE EXTRATO MÊS A MÊS ────────────────────── */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-base">Extrato de Rendimentos Mensais (P/L & ROI)</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              O saldo inicial de cada mês é transferido automaticamente do saldo final do mês anterior.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Capital Inicial (R$):</label>
              <input
                type="number"
                min="0"
                step="1000"
                value={initialCapital}
                onChange={(e) => setInitialCapital(Math.max(0, Number(e.target.value)))}
                className="w-32 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white"
              />
            </div>
            <button
              type="button"
              onClick={handleAddMonth}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar Mês
            </button>
          </div>
        </div>

        {/* TABELA DE ENTRADAS DINÂMICAS */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Mês</th>
                <th className="py-2.5 px-4">Saldo Inicial</th>
                <th className="py-2.5 px-4">P/L Rendimento (R$)</th>
                <th className="py-2.5 px-4">ROI do Mês (%)</th>
                <th className="py-2.5 px-4">Saldo Final</th>
                <th className="py-2.5 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {result.timeline.slice(1).map((row, idx) => {
                const entry = entries[idx];
                const isWin = row.plAmount >= 0;

                return (
                  <tr key={row.month} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-2 px-4 font-bold text-slate-900 dark:text-white">{row.label}</td>
                    <td className="py-2 px-4">{formatBRL(row.startBalance)}</td>
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold ${isWin ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                          R$
                        </span>
                        <input
                          type="number"
                          step="50"
                          value={entry ? entry.plAmount : 0}
                          onChange={(e) => handleUpdateEntry(entry.id, Number(e.target.value))}
                          className={`w-28 px-2 py-1 rounded-lg border text-xs font-bold transition-colors ${
                            isWin
                              ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                              : "bg-rose-50/60 dark:bg-rose-950/30 border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300"
                          }`}
                        />
                      </div>
                    </td>
                    <td className={`py-2 px-4 font-bold ${isWin ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {row.roiPercent >= 0 ? `+${row.roiPercent.toFixed(2)}%` : `${row.roiPercent.toFixed(2)}%`}
                    </td>
                    <td className="py-2 px-4 font-extrabold text-slate-900 dark:text-white">
                      {formatBRL(row.finalBalance)}
                    </td>
                    <td className="py-2 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => entry && handleRemoveMonth(entry.id)}
                        disabled={entries.length <= 1}
                        className="p-1 text-slate-400 hover:text-rose-500 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors cursor-pointer"
                        title="Remover este mês"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// VIEW 3: RESERVA DE EMERGÊNCIA PERSONALIZADA
// =====================================================================

interface EmergencyProps {
  cost: number;
  setCost: (v: number) => void;
  profile: EmploymentProfile;
  setProfile: (p: EmploymentProfile) => void;
  savings: number;
  setSavings: (v: number) => void;
  result: ReturnType<typeof calculateEmergencyFund>;
}

function EmergencyFundView({
  cost,
  setCost,
  profile,
  setProfile,
  savings,
  setSavings,
  result,
}: EmergencyProps) {
  const PROFILES = [
    {
      id: "public_servant" as EmploymentProfile,
      name: "Servidor Público",
      months: 4,
      desc: "Alta estabilidade estatutária. Foco exclusivo em imprevistos pontuais de saúde ou reparos.",
      badge: "3 a 4 meses",
    },
    {
      id: "clt" as EmploymentProfile,
      name: "Trabalhador CLT",
      months: 6,
      desc: "Estabilidade moderada com FGTS e aviso prévio. Período seguro para recolocação no mercado.",
      badge: "6 meses",
    },
    {
      id: "freelancer" as EmploymentProfile,
      name: "Autônomo / PJ",
      months: 12,
      desc: "Alta volatilidade e sazonalidade de receita. Exige blindagem robusta contra quedas de contratos.",
      badge: "12 meses",
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* CARDS DE KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-sky-50 via-white to-sky-50/40 dark:from-sky-950/50 dark:via-slate-900 dark:to-slate-900 border border-sky-200 dark:border-sky-500/30 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-sky-600 dark:text-sky-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Meta Ideal da Reserva</span>
            <ShieldCheck className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {formatBRL(result.targetAmount)}
          </div>
          <div className="mt-2 text-xs text-sky-700 dark:text-sky-300/80 font-medium">
            {result.recommendedMonths} meses de custo fixo
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Cobertura Atual</span>
            <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
            {result.coverageMonths} <span className="text-base font-normal text-slate-500 dark:text-slate-400">meses</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {formatBRL(result.currentSavings)} guardados
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-teal-600 dark:text-teal-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Progresso da Meta</span>
            <Percent className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {result.coveragePercentage}%
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {result.isFullyFunded ? "Blindagem total atingida" : "Em construção ativa"}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {result.isFullyFunded ? "Superávit Livre" : "Valor Restante"}
            </span>
            <Flame className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
            result.isFullyFunded ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
          }`}>
            {formatBRL(result.isFullyFunded ? result.surplusAmount : result.remainingAmount)}
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {result.isFullyFunded ? "Disponível para risco/ações" : "Necessário para fechar a meta"}
          </div>
        </div>
      </div>

      {/* PAINEL DE CONTROLES E SELEÇÃO DE PERFIL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6 shadow-xs">
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-base mb-1">1. Selecione seu Perfil de Trabalho</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">A estabilidade da sua fonte de renda determina o número seguro de meses de cobertura.</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PROFILES.map((p) => {
                const isSelected = profile === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setProfile(p.id)}
                    className={`flex flex-col text-left p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-sky-50 dark:bg-sky-950/40 border-sky-400 dark:border-sky-500/80 ring-2 ring-sky-400/20 dark:ring-sky-500/20 text-slate-900 dark:text-white"
                        : "bg-slate-50/70 hover:bg-slate-100 dark:bg-slate-950/60 dark:hover:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2 w-full">
                      <span className="font-bold text-sm">{p.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        isSelected 
                          ? "bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300" 
                          : "bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}>
                        {p.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{p.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Custo Fixo de Vida Mensal (R$)</label>
                <span className="text-sm font-bold text-sky-600 dark:text-sky-400">{formatBRL(cost)}</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">Aluguel, contas essenciais, supermercado, saúde e parcelas fixas.</p>
              <input
                type="number"
                min="0"
                step="200"
                value={cost}
                onChange={(e) => setCost(Math.max(0, Number(e.target.value)))}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900"
              />
              <input
                type="range"
                min="1000"
                max="30000"
                step="500"
                value={cost}
                onChange={(e) => setCost(Number(e.target.value))}
                className="w-full mt-2 accent-sky-500"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Saldo Atual Guardado na Reserva (R$)</label>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatBRL(savings)}</span>
              </div>
              <input
                type="number"
                min="0"
                step="500"
                value={savings}
                onChange={(e) => setSavings(Math.max(0, Number(e.target.value)))}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900"
              />
              <input
                type="range"
                min="0"
                max={Math.max(100000, result.targetAmount * 1.5)}
                step="500"
                value={savings}
                onChange={(e) => setSavings(Number(e.target.value))}
                className="w-full mt-2 accent-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* PAINEL DE DIAGNÓSTICO E RECOMENDAÇÃO */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-900 dark:text-white text-base">Diagnóstico de Blindagem</h4>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                result.coveragePercentage >= 100
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                  : result.coveragePercentage >= 50
                  ? "bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/30"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30"
              }`}>
                {result.statusLabel}
              </span>
            </div>

            {/* Barra de Progresso Visual */}
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span>Progresso da Blindagem</span>
                <span className="text-slate-900 dark:text-white font-bold">{result.coveragePercentage}%</span>
              </div>
              <div className="w-full h-4 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    result.coveragePercentage >= 100
                      ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                      : result.coveragePercentage >= 50
                      ? "bg-gradient-to-r from-sky-500 to-emerald-400"
                      : "bg-gradient-to-r from-amber-500 to-sky-500"
                  }`}
                  style={{ width: `${Math.min(100, result.coveragePercentage)}%` }}
                />
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Recomendação do Consultor</h5>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {result.recommendationText}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-500/20 rounded-xl p-3.5 mt-6 text-xs text-sky-900 dark:text-sky-200">
            <strong>Onde alocar esta reserva?</strong> Priorize 100% liquidez diária (D+0) com baixo risco de crédito e sem oscilação negativa:
            <ul className="list-disc list-inside mt-1.5 space-y-1 text-slate-600 dark:text-slate-300">
              <li>Tesouro Selic (Tesouro Direto)</li>
              <li>CDB de Bancos Sólidos com Liquidez Diária a 100%+ do CDI</li>
              <li>Contas remuneradas com garantia do FGC</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
