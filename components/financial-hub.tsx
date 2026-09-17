"use client";

import React, { useState, useMemo } from "react";
import {
  Calculator,
  ShieldCheck,
  TrendingDown,
  CreditCard,
  Sparkles,
  TrendingUp,
  DollarSign,
  Calendar,
  Percent,
  AlertCircle,
  CheckCircle2,
  Zap,
  Info,
  Clock,
  PiggyBank,
  Flame,
  Check,
  Copy
} from "lucide-react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import {
  calculateCompoundInterest,
  calculateEmergencyFund,
  calculateDebtAmortization,
  calculateCashVsInstallment,
  formatBRL,
  EmploymentProfile
} from "@/lib/financial-engine";
import { useTheme } from "@/components/theme-context";

type CalculatorType = "compound" | "emergency" | "amortization" | "cash_vs_installment";

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
    title: "Juros Compostos",
    shortDesc: "Simule a multiplicação do patrimônio com aportes mensais e tempo.",
    timeEstimate: "⚡ 1 min",
    icon: TrendingUp,
    accentColor: "emerald",
    badge: "Patrimônio"
  },
  {
    id: "emergency",
    title: "Reserva de Emergência",
    shortDesc: "Calcule a blindagem necessária de acordo com sua estabilidade profissional.",
    timeEstimate: "⚡ 1 min",
    icon: ShieldCheck,
    accentColor: "sky",
    badge: "Proteção"
  },
  {
    id: "amortization",
    title: "Amortização de Dívida",
    shortDesc: "Descubra quantos anos e milhares de reais você poupa com aportes extras.",
    timeEstimate: "⚡ 2 min",
    icon: TrendingDown,
    accentColor: "rose",
    badge: "Economia"
  },
  {
    id: "cash_vs_installment",
    title: "À Vista vs. CDI",
    shortDesc: "Decida se vale a pena o desconto à vista ou parcelar rendendo no CDI.",
    timeEstimate: "⚡ 1 min",
    icon: CreditCard,
    accentColor: "indigo",
    badge: "Oportunidade"
  }
];

export function FinancialHub() {
  const [activeTab, setActiveTab] = useState<CalculatorType>("compound");
  const [copied, setCopied] = useState(false);

  // ==========================================
  // ESTADOS - 1. JUROS COMPOSTOS
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
  // ESTADOS - 2. RESERVA DE EMERGÊNCIA
  // ==========================================
  const [efCost, setEfCost] = useState<number>(4500);
  const [efProfile, setEfProfile] = useState<EmploymentProfile>("clt");
  const [efSavings, setEfSavings] = useState<number>(13500);

  const emergencyResult = useMemo(() => {
    return calculateEmergencyFund(efCost, efProfile, efSavings);
  }, [efCost, efProfile, efSavings]);

  // ==========================================
  // ESTADOS - 3. AMORTIZAÇÃO DE DÍVIDA
  // ==========================================
  const [daBalance, setDaBalance] = useState<number>(150000);
  const [daAnnualRate, setDaAnnualRate] = useState<number>(10.5); // % a.a.
  const [daMonthlyPayment, setDaMonthlyPayment] = useState<number>(1800);
  const [daExtraPayment, setDaExtraPayment] = useState<number>(500);
  const [daShowSchedule, setDaShowSchedule] = useState<boolean>(false);

  const debtResult = useMemo(() => {
    return calculateDebtAmortization(
      daBalance,
      daAnnualRate / 100,
      daMonthlyPayment,
      daExtraPayment
    );
  }, [daBalance, daAnnualRate, daMonthlyPayment, daExtraPayment]);

  // ==========================================
  // ESTADOS - 4. À VISTA VS PARCELADO CDI
  // ==========================================
  const [cvPrice, setCvPrice] = useState<number>(4500);
  const [cvDiscount, setCvDiscount] = useState<number>(8); // %
  const [cvInstallments, setCvInstallments] = useState<number>(10);
  const [cvCdiRate, setCvCdiRate] = useState<number>(13.65); // % a.a.
  const [cvTaxRate, setCvTaxRate] = useState<number>(15.0); // % IR

  const cashVsResult = useMemo(() => {
    return calculateCashVsInstallment(
      cvPrice,
      cvDiscount,
      cvInstallments,
      cvCdiRate,
      cvTaxRate
    );
  }, [cvPrice, cvDiscount, cvInstallments, cvCdiRate, cvTaxRate]);

  // Copiar resumo da simulação
  const handleCopySummary = () => {
    let text = "";
    if (activeTab === "compound") {
      text = `📊 *Simulação de Juros Compostos (Kamael Finance)*\n- Aporte Inicial: ${formatBRL(ciInitial)}\n- Aporte Mensal: ${formatBRL(ciMonthly)}\n- Taxa Anual: ${ciAnnualRate}%\n- Prazo: ${ciYears} anos\n👉 *Montante Final: ${formatBRL(compoundResult.finalAmount)}*\n- Total Investido: ${formatBRL(compoundResult.totalInvested)}\n- Total em Juros: ${formatBRL(compoundResult.totalInterest)} (${compoundResult.wealthMultiplier}x do capital investido)`;
    } else if (activeTab === "emergency") {
      text = `🛡️ *Reserva de Emergência (Kamael Finance)*\n- Custo Fixo: ${formatBRL(efCost)}/mês\n- Perfil: ${efProfile.toUpperCase()}\n- Meta (${emergencyResult.recommendedMonths} meses): ${formatBRL(emergencyResult.targetAmount)}\n- Saldo Atual: ${formatBRL(efSavings)} (${emergencyResult.coverageMonths} meses)\n👉 *Status: ${emergencyResult.statusLabel} (${emergencyResult.coveragePercentage}%)*`;
    } else if (activeTab === "amortization") {
      text = `📉 *Amortização Extra de Dívida (Kamael Finance)*\n- Saldo Devedor: ${formatBRL(daBalance)}\n- Parcela Regular: ${formatBRL(daMonthlyPayment)}\n- Aporte Extra: ${formatBRL(daExtraPayment)}\n👉 *Economia de Juros: ${formatBRL(debtResult.totalInterestSaved)}*\n👉 *Prazo Reduzido em: ${debtResult.monthsSaved} meses (~${(debtResult.monthsSaved / 12).toFixed(1)} anos)*`;
    } else if (activeTab === "cash_vs_installment") {
      text = `🏷️ *À Vista vs. CDI (Kamael Finance)*\n- Preço: ${formatBRL(cvPrice)}\n- Desconto À Vista: ${cvDiscount}% (${formatBRL(cashVsResult.cashPrice)})\n- Parcelamento: ${cvInstallments}x de ${formatBRL(cashVsResult.installmentValue)}\n👉 *Recomendação: ${cashVsResult.recommendation === "A_VISTA" ? "À VISTA" : "PARCELAR NO CDI"}*\n- Vantagem: ${formatBRL(cashVsResult.opportunityAdvantageAmount)}\n- Ponto de Equilíbrio: Desconto de ${cashVsResult.breakEvenDiscountPercent}%`;
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
              Tome decisões financeiras com precisão matemática pura. Simule juros compostos, dimensione sua reserva, reduza anos de dívidas e compare compras à vista vs parcelado.
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

        {/* GRID DE SELEÇÃO RÁPIDA DE CALCULADORAS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
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

      {/* CONTEÚDO DINÂMICO DA CALCULADORA SELECIONADA */}
      <div className="max-w-7xl mx-auto">
        {activeTab === "compound" && (
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

        {activeTab === "amortization" && (
          <DebtAmortizationView
            balance={daBalance}
            setBalance={setDaBalance}
            annualRate={daAnnualRate}
            setAnnualRate={setDaAnnualRate}
            monthlyPayment={daMonthlyPayment}
            setMonthlyPayment={setDaMonthlyPayment}
            extraPayment={daExtraPayment}
            setExtraPayment={setDaExtraPayment}
            result={debtResult}
            showSchedule={daShowSchedule}
            setShowSchedule={setDaShowSchedule}
          />
        )}

        {activeTab === "cash_vs_installment" && (
          <CashVsInstallmentView
            price={cvPrice}
            setPrice={setCvPrice}
            discount={cvDiscount}
            setDiscount={setCvDiscount}
            installments={cvInstallments}
            setInstallments={setCvInstallments}
            cdiRate={cvCdiRate}
            setCdiRate={setCvCdiRate}
            taxRate={cvTaxRate}
            setTaxRate={setCvTaxRate}
            result={cashVsResult}
          />
        )}
      </div>
    </div>
  );
}

// =====================================================================
// VIEW 1: JUROS COMPOSTOS COM APORTES MENSAIS
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

  // Chart data sampled for performance and readability
  const chartData = useMemo(() => {
    return result.timeline.filter((item) => {
      if (result.periodMonths <= 36) return true;
      return item.month === 0 || item.month % 6 === 0 || item.month === result.periodMonths;
    });
  }, [result]);

  return (
    <div className="space-y-6">
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
              className="w-full mt-2 accent-emerald-500"
            />
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
              className="w-full mt-2 accent-emerald-500"
            />
            {/* Quick Presets */}
            <div className="flex gap-2 mt-2">
              {[300, 500, 1000, 2500].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setMonthly(val)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    monthly === val
                      ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40 font-semibold"
                      : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                  }`}
                >
                  +{val}
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
              className="w-full mt-2 accent-teal-500"
            />
            <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              <span>0% (Sem rend.)</span>
              <span>10% (Conservador)</span>
              <span>13% (CDI atual)</span>
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
              className="w-full accent-sky-500"
            />
            <div className="flex gap-2 mt-2">
              {[1, 5, 10, 20, 30].map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setYears(y)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    years === y
                      ? "bg-sky-50 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-500/40 font-semibold"
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
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
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
              <strong>Efeito Bola de Neve:</strong> No início, seu patrimônio cresce predominantemente pelos seus aportes.
              Com o passar dos anos, os juros superam os aportes e geram mais renda que seu próprio esforço financeiro direto.
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
// VIEW 2: RESERVA DE EMERGÊNCIA PERSONALIZADA
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
    <div className="space-y-6">
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

// =====================================================================
// VIEW 3: SIMULADOR DE AMORTIZAÇÃO EXTRA DE DÍVIDAS
// =====================================================================

interface DebtProps {
  balance: number;
  setBalance: (v: number) => void;
  annualRate: number;
  setAnnualRate: (v: number) => void;
  monthlyPayment: number;
  setMonthlyPayment: (v: number) => void;
  extraPayment: number;
  setExtraPayment: (v: number) => void;
  result: ReturnType<typeof calculateDebtAmortization>;
  showSchedule: boolean;
  setShowSchedule: (v: boolean) => void;
}

function DebtAmortizationView({
  balance,
  setBalance,
  annualRate,
  setAnnualRate,
  monthlyPayment,
  setMonthlyPayment,
  extraPayment,
  setExtraPayment,
  result,
  showSchedule,
  setShowSchedule,
}: DebtProps) {
  const { theme } = useTheme();

  return (
    <div className="space-y-6">
      {/* CARDS DE KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-rose-50 via-white to-rose-50/40 dark:from-rose-950/50 dark:via-slate-900 dark:to-slate-900 border border-rose-200 dark:border-rose-500/30 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Economia em Juros</span>
            <TrendingDown className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
            {formatBRL(result.totalInterestSaved)}
          </div>
          <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400/90 font-medium">
            {result.interestSavingsPercentage}% de desconto no total de juros
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-sky-600 dark:text-sky-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Tempo Economizado</span>
            <Clock className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {result.monthsSaved} <span className="text-base font-normal text-slate-500 dark:text-slate-400">meses</span>
          </div>
          <div className="mt-2 text-xs text-sky-600 dark:text-sky-400/90 font-medium">
            ~{(result.monthsSaved / 12).toFixed(1)} anos livres de dívida antes
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Novo Prazo de Quitação</span>
            <Calendar className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {result.acceleratedMonths} <span className="text-base font-normal text-slate-500 dark:text-slate-400">meses</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Original: {result.originalMonths} meses (~{(result.originalMonths / 12).toFixed(1)} anos)
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total de Juros Acelerados</span>
            <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-700 dark:text-slate-200 tracking-tight">
            {formatBRL(result.acceleratedTotalInterest)}
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            vs. {formatBRL(result.originalTotalInterest)} no contrato original
          </div>
        </div>
      </div>

      {/* AVISO DE INVIABILIDADE CASO A PARCELA NÃO CUBRA JUROS */}
      {!result.isViable && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/50 rounded-2xl p-4 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-sm font-bold text-rose-700 dark:text-rose-300">Atenção ao Valor da Parcela:</strong>
            <p className="mt-1 leading-relaxed">{result.errorMessage}</p>
          </div>
        </div>
      )}

      {/* PAINEL DE CONTROLES + GRÁFICO DE AMORTIZAÇÃO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h4 className="font-bold text-slate-900 dark:text-white text-base">Dados do Financiamento / Dívida</h4>
            <span className="text-xs text-slate-500 dark:text-slate-400">Amortização Direta</span>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Saldo Devedor Atual (R$)</label>
              <span className="text-sm font-bold text-rose-600 dark:text-rose-400">{formatBRL(balance)}</span>
            </div>
            <input
              type="number"
              min="1000"
              step="5000"
              value={balance}
              onChange={(e) => setBalance(Math.max(1, Number(e.target.value)))}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:border-rose-500 focus:bg-white dark:focus:bg-slate-900"
            />
            <input
              type="range"
              min="10000"
              max="1000000"
              step="10000"
              value={balance}
              onChange={(e) => setBalance(Number(e.target.value))}
              className="w-full mt-2 accent-rose-500"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Taxa de Juros Anual (% a.a.)</label>
              <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{annualRate}% a.a.</span>
            </div>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={annualRate}
              onChange={(e) => setAnnualRate(Math.max(0, Number(e.target.value)))}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-slate-900"
            />
            <input
              type="range"
              min="3"
              max="25"
              step="0.25"
              value={annualRate}
              onChange={(e) => setAnnualRate(Number(e.target.value))}
              className="w-full mt-2 accent-amber-500"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Parcela Mensal Atual (R$)</label>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{formatBRL(monthlyPayment)}</span>
            </div>
            <input
              type="number"
              min="100"
              step="100"
              value={monthlyPayment}
              onChange={(e) => setMonthlyPayment(Math.max(1, Number(e.target.value)))}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-900"
            />
          </div>

          {/* Amortização Extra */}
          <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30 rounded-xl space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> Aporte Extra Mensal no Principal (R$)
              </label>
              <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300">+{formatBRL(extraPayment)}</span>
            </div>
            <input
              type="number"
              min="0"
              step="100"
              value={extraPayment}
              onChange={(e) => setExtraPayment(Math.max(0, Number(e.target.value)))}
              className="w-full bg-white dark:bg-slate-950 border border-emerald-300 dark:border-emerald-500/50 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:border-emerald-500"
            />
            <input
              type="range"
              min="0"
              max="5000"
              step="100"
              value={extraPayment}
              onChange={(e) => setExtraPayment(Number(e.target.value))}
              className="w-full mt-1 accent-emerald-500"
            />
            <div className="flex gap-2 pt-1">
              {[200, 500, 1000, 2000].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setExtraPayment(v)}
                  className={`text-xs px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                    extraPayment === v
                      ? "bg-emerald-100 dark:bg-emerald-500/30 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-500 font-semibold"
                      : "bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                  }`}
                >
                  +{v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* GRÁFICO COMPARATIVO DE QUITAÇÃO */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base">Curva de Desalavancagem da Dívida</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Comparação do saldo devedor ao longo dos meses</p>
              </div>
              <button
                onClick={() => setShowSchedule(!showSchedule)}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                {showSchedule ? "Ocultar Cronograma" : "Ver Cronograma"}
              </button>
            </div>

            <div className="h-72 sm:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={result.schedule} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#334155" : "#e2e8f0"} opacity={0.6} />
                  <XAxis dataKey="month" stroke={theme === "dark" ? "#64748b" : "#94a3b8"} fontSize={11} tickFormatter={(m) => `Mês ${m}`} />
                  <YAxis
                    stroke={theme === "dark" ? "#64748b" : "#94a3b8"}
                    fontSize={11}
                    tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
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
                      name === "originalBalance" ? "Saldo Original" : "Saldo com Amortização Extra"
                    ]}
                    labelFormatter={(label) => `Mês: ${label}`}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                    formatter={(val) =>
                      val === "originalBalance" ? "Prazo Original" : "Com Aporte Extra (Acelerado)"
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="originalBalance"
                    stroke="#ef4444"
                    strokeWidth={2.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="acceleratedBalance"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3.5 mt-4 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
            <Zap className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>Poder da Amortização Extra:</strong> 100% do aporte adicional vai diretamente para reduzir o saldo principal,
              eliminando os juros futuros em cascata que seriam cobrados sobre aquele valor mês a mês.
            </span>
          </div>
        </div>
      </div>

      {/* CRONOGRAMA DETALHADO */}
      {showSchedule && (
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 overflow-hidden shadow-xs">
          <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-3">Amostragem do Cronograma de Amortização</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-4">Mês</th>
                  <th className="py-2.5 px-4">Saldo Original</th>
                  <th className="py-2.5 px-4">Saldo Acelerado</th>
                  <th className="py-2.5 px-4">Juros Originais Pagos</th>
                  <th className="py-2.5 px-4">Juros Acelerados Pagos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {result.schedule.map((row) => (
                  <tr key={row.month} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-2 px-4 font-semibold text-slate-900 dark:text-white">Mês {row.month}</td>
                    <td className="py-2 px-4 text-rose-600 dark:text-rose-400">{formatBRL(row.originalBalance)}</td>
                    <td className="py-2 px-4 font-bold text-emerald-600 dark:text-emerald-400">{formatBRL(row.acceleratedBalance)}</td>
                    <td className="py-2 px-4 text-slate-500 dark:text-slate-400">{formatBRL(row.originalInterestPaid)}</td>
                    <td className="py-2 px-4 text-teal-600 dark:text-teal-400">{formatBRL(row.acceleratedInterestPaid)}</td>
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
// VIEW 4: COMPARADOR À VISTA COM DESCONTO VS. PARCELADO NO CDI
// =====================================================================

interface CashVsProps {
  price: number;
  setPrice: (v: number) => void;
  discount: number;
  setDiscount: (v: number) => void;
  installments: number;
  setInstallments: (v: number) => void;
  cdiRate: number;
  setCdiRate: (v: number) => void;
  taxRate: number;
  setTaxRate: (v: number) => void;
  result: ReturnType<typeof calculateCashVsInstallment>;
}

function CashVsInstallmentView({
  price,
  setPrice,
  discount,
  setDiscount,
  installments,
  setInstallments,
  cdiRate,
  setCdiRate,
  taxRate,
  setTaxRate,
  result,
}: CashVsProps) {
  const { theme } = useTheme();
  const isCashWinner = result.recommendation === "A_VISTA";
  const isInstallmentsWinner = result.recommendation === "PARCELADO";

  return (
    <div className="space-y-6">
      {/* BANNER DE DECISÃO MATEMÁTICA */}
      <div
        className={`rounded-2xl p-6 border transition-all ${
          isCashWinner
            ? "bg-gradient-to-r from-emerald-50 via-white to-emerald-50/50 dark:from-emerald-950/60 dark:via-slate-900 dark:to-slate-900 border-emerald-200 dark:border-emerald-500/40 shadow-xs"
            : isInstallmentsWinner
            ? "bg-gradient-to-r from-indigo-50 via-white to-indigo-50/50 dark:from-indigo-950/60 dark:via-slate-900 dark:to-slate-900 border-indigo-200 dark:border-indigo-500/40 shadow-xs"
            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-xs"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                isCashWinner
                  ? "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-500/30"
                  : isInstallmentsWinner
                  ? "bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 dark:border-indigo-500/30"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
              }`}
            >
              {isCashWinner ? <CheckCircle2 className="w-6 h-6" /> : <TrendingUp className="w-6 h-6" />}
            </div>
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                Decisão Financeira Recomendada
              </span>
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                {isCashWinner
                  ? "Pague À Vista com Desconto"
                  : isInstallmentsWinner
                  ? `Parcele em ${installments}x e Deixe Rendendo no CDI`
                  : "Indiferente (Ambas têm o mesmo retorno)"}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-3xl leading-relaxed">
                {result.reasoning}
              </p>
            </div>
          </div>

          <div className="sm:text-right bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 shrink-0">
            <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Vantagem Financeira Líquida</div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              +{formatBRL(result.opportunityAdvantageAmount)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Break-even: {result.breakEvenDiscountPercent}% de desconto
            </div>
          </div>
        </div>
      </div>

      {/* CARDS DE KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Valor À Vista</span>
            <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {formatBRL(result.cashPrice)}
          </div>
          <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            Desconto de {formatBRL(result.cashDiscountAmount)} ({discount}%)
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Parcelas Sem Juros</span>
            <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {installments}x <span className="text-base font-normal text-slate-500 dark:text-slate-400">de {formatBRL(result.installmentValue)}</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Total bruto: {formatBRL(price)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-sky-600 dark:text-sky-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Rendimento Líquido no CDI</span>
            <Sparkles className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-sky-600 dark:text-sky-300 tracking-tight">
            {formatBRL(result.netInterestEarned)}
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Com IR de {taxRate}% descontado
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Desconto de Ponto Neutro</span>
            <Percent className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {result.breakEvenDiscountPercent}%
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Se o lojista der mais que isso, pague à vista
          </div>
        </div>
      </div>

      {/* PAINEL DE CONTROLES + SIMULAÇÃO DE FLUXO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h4 className="font-bold text-slate-900 dark:text-white text-base">Condições da Compra</h4>
            <span className="text-xs text-slate-500 dark:text-slate-400">Custo de Oportunidade</span>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Preço Cheio do Produto (R$)</label>
              <span className="text-sm font-bold text-slate-900 dark:text-white">{formatBRL(price)}</span>
            </div>
            <input
              type="number"
              min="10"
              step="100"
              value={price}
              onChange={(e) => setPrice(Math.max(1, Number(e.target.value)))}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Desconto Oferecido À Vista (%)</label>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{discount}% ({formatBRL(result.cashDiscountAmount)})</span>
            </div>
            <input
              type="range"
              min="0"
              max="25"
              step="0.5"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
            <div className="flex gap-2 mt-1.5">
              {[3, 5, 8, 10, 15].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDiscount(d)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    discount === d
                      ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40 font-semibold"
                      : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                  }`}
                >
                  {d}%
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Quantidade de Parcelas no Cartão</label>
              <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{installments}x de {formatBRL(result.installmentValue)}</span>
            </div>
            <input
              type="range"
              min="1"
              max="24"
              step="1"
              value={installments}
              onChange={(e) => setInstallments(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <div className="flex gap-2 mt-1.5">
              {[2, 6, 10, 12, 18, 24].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setInstallments(n)}
                  className={`text-xs px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                    installments === n
                      ? "bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/40 font-semibold"
                      : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                  }`}
                >
                  {n}x
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Taxa CDI (% a.a.)</label>
              <input
                type="number"
                step="0.25"
                value={cdiRate}
                onChange={(e) => setCdiRate(Math.max(0, Number(e.target.value)))}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Alíquota IR (%)</label>
              <input
                type="number"
                step="2.5"
                value={taxRate}
                onChange={(e) => setTaxRate(Math.max(0, Number(e.target.value)))}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
              />
            </div>
          </div>
        </div>

        {/* FLUXO DE CAIXA MÊS A MÊS */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base">Fundo de Oportunidade (Fluxo Mês a Mês)</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Saldo aplicado rendendo e pagando cada fatura mensal</p>
              </div>
            </div>

            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={result.cashFlowTimeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#334155" : "#e2e8f0"} opacity={0.6} />
                  <XAxis dataKey="month" stroke={theme === "dark" ? "#64748b" : "#94a3b8"} fontSize={11} tickFormatter={(m) => `Mês ${m}`} />
                  <YAxis
                    stroke={theme === "dark" ? "#64748b" : "#94a3b8"}
                    fontSize={11}
                    tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
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
                      name === "remainingInvestmentBalance" ? "Saldo Restante Aplicado" : "Rendimento do Mês"
                    ]}
                    labelFormatter={(m) => `Mês: ${m}`}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                    formatter={(val) =>
                      val === "remainingInvestmentBalance" ? "Saldo do Fundo Aplicado" : "Rendimento Mensal no CDI"
                    }
                  />
                  <Bar dataKey="remainingInvestmentBalance" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="investmentYield" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3.5 mt-4 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
            <span>
              <strong>Regra de Bolso para o Comércio:</strong> Se o percentual de desconto à vista for maior que metade da taxa Selic anual dividida pelo prazo, quase sempre compensa pagar à vista.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
