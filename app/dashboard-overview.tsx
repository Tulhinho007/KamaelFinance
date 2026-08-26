"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line
} from "recharts";
import {
  Plus, TrendingUp, TrendingDown, DollarSign, Target, CreditCard,
  Building2, Zap, ChevronRight, CheckCircle2, Clock,
  Sparkles, ArrowUpRight, ArrowDownRight, X, History, Calendar, FileText, Tag, Filter, HelpCircle
} from "lucide-react";
import { usePeriod } from "@/components/period-context";
import { PeriodHeader } from "@/components/period-header";
import { NewPurchaseModal } from "@/components/new-purchase-modal";
import { OFXReconciliationModal } from "@/components/ofx-reconciliation-modal";
import { MetricInfoModal, MetricKey } from "@/components/metric-info-modal";
import { useModal } from "@/components/ui/custom-dialog-provider";
import {
  getDashboardOverviewData, createRevenueAction, addAporteAction,
  getFutureBalanceProjection, getAllTags
} from "@/lib/actions";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function walletIcon(type: string) {
  if (type === "CREDIT_CARD") return CreditCard;
  if (type === "TICKET")      return Zap;
  return Building2;
}

// Tooltip customizado com fundo escuro executivo para Recharts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white rounded-lg border border-slate-800 p-3 shadow-xl text-xs space-y-1">
        {label && <p className="font-medium text-slate-400 border-b border-slate-800 pb-1 mb-1">{label}</p>}
        {payload.map((p: any, idx: number) => (
          <div key={idx} className="flex items-center justify-between gap-4 font-tnum tabular-nums">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
              {p.name}:
            </span>
            <span className="font-semibold text-white">{brl(Number(p.value))}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function DashboardOverview() {
  const { selectedMonth, selectedYear, setPeriod, goToCurrentMonth } = usePeriod();
  const { showAlert } = useModal();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Projeção de Saldo Futuro (30 / 60 dias)
  const [projectionDays, setProjectionDays] = useState<30 | 60>(30);
  const [projectionData, setProjectionData] = useState<any>(null);
  const [loadingProjection, setLoadingProjection] = useState(true);

  // Tags, Conciliação OFX & Modal de Detalhamento do Cálculo (Auditoria)
  const [ofxModalOpen, setOfxModalOpen] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [activeMetricModal, setActiveMetricModal] = useState<MetricKey | null>(null);

  // Garantir que ao abrir a página do Dashboard ele inicie no mês atual
  useEffect(() => {
    goToCurrentMonth();
  }, []);

  // Modais de ação rápida
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [revenueModalOpen, setRevenueModalOpen]   = useState(false);
  const [aporteModalOpen, setAporteModalOpen]     = useState(false);
  const [historyModalOpen, setHistoryModalOpen]   = useState(false);
  const [selectedGoalId, setSelectedGoalId]       = useState("");

  // Form states
  const [revDesc, setRevDesc]     = useState("");
  const [revAmount, setRevAmount] = useState<number | "">("");
  const [revDate, setRevDate]     = useState(new Date().toISOString().split("T")[0]);
  const [savingRev, setSavingRev] = useState(false);

  const [aporteAmount, setAporteAmount] = useState<number | "">("");
  const [savingAporte, setSavingAporte] = useState(false);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const result = await getDashboardOverviewData(selectedMonth, selectedYear);
      setData(result);
    } catch (err) {
      console.error("Erro ao carregar dados do dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadProjection = async () => {
    setLoadingProjection(true);
    try {
      const res = await getFutureBalanceProjection(projectionDays);
      setProjectionData(res);
    } catch (err) {
      console.error("Erro ao carregar projeção:", err);
    } finally {
      setLoadingProjection(false);
    }
  };

  const loadTags = async () => {
    try {
      const tags = await getAllTags();
      setAvailableTags(tags);
    } catch (err) {
      console.error("Erro ao carregar tags:", err);
    }
  };

  useEffect(() => {
    loadDashboardData();
    loadTags();
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    loadProjection();
  }, [projectionDays]);

  const handleRevenueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(revAmount);
    if (!revDesc || val <= 0 || !revDate) return;
    setSavingRev(true);
    try {
      await createRevenueAction(revDesc, val, revDate);
      await loadDashboardData();
      setRevenueModalOpen(false);
      setRevDesc("");
      setRevAmount("");
    } catch (err) {
      console.error(err);
      showAlert("Erro ao lançar receita.", { variant: "error" });
    } finally {
      setSavingRev(false);
    }
  };

  const handleAporteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(aporteAmount);
    if (!selectedGoalId || val <= 0) return;
    setSavingAporte(true);
    try {
      await addAporteAction(selectedGoalId, val);
      await loadDashboardData();
      setAporteModalOpen(false);
      setAporteAmount("");
    } catch (err) {
      console.error(err);
      showAlert("Erro ao realizar aporte.", { variant: "error" });
    } finally {
      setSavingAporte(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto flex flex-col gap-6 animate-pulse select-none">
        <div className="h-10 bg-slate-200/60 rounded-xl w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="h-32 bg-white rounded-2xl border border-slate-200/80 shadow-sm" />
          <div className="h-32 bg-white rounded-2xl border border-slate-200/80 shadow-sm" />
          <div className="h-32 bg-white rounded-2xl border border-slate-200/80 shadow-sm" />
          <div className="h-32 bg-white rounded-2xl border border-slate-200/80 shadow-sm" />
        </div>
        <div className="h-48 bg-white rounded-2xl border border-slate-200/80 shadow-sm" />
      </div>
    );
  }

  const today = new Date();

  const upcomingBills = data.cards
    .filter((c: any) => c.walletType === "CREDIT_CARD" && c.faturaAtual > 0 && !c.isPaid)
    .map((c: any) => {
      return {
        id: c.id,
        title: c.title,
        valor: c.faturaAtual,
        vencimento: c.vencimentoStr || `${String(c.vencimento).padStart(2, "0")}/${String(selectedMonth).padStart(2, "0")}/${selectedYear}`,
        isPast: !!c.isPast,
      };
    });

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto flex flex-col gap-8 select-none relative font-sans text-slate-900">
      
      {/* ── 1. CABEÇALHO & AÇÕES ───────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PeriodHeader 
          title="Dashboard Financeiro" 
          tagline="Visão geral e balanço consolidado de suas contas corporativas e pessoais." 
        />

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setOfxModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer border border-emerald-500/30"
          >
            <FileText className="w-4 h-4 text-emerald-100" />
            Conciliação OFX
          </button>

          <button
            onClick={() => setHistoryModalOpen(true)}
            className="flex items-center gap-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-sm cursor-pointer border border-slate-700/50"
          >
            <History className="w-4 h-4 text-indigo-400" />
            Histórico Geral
          </button>

          <button
            onClick={() => setRevenueModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Lançar Receita
          </button>

          <button
            onClick={() => setPurchaseModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nova Despesa
          </button>
        </div>
      </div>

      {/* ── BARRA DE TAGS / CENTRO DE CUSTOS ───────────────────────────────── */}
      {availableTags.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 shrink-0">
            <Tag className="w-3 h-3 text-indigo-500" /> Tags:
          </span>
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all shrink-0 cursor-pointer ${
              selectedTag === null
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Todas
          </button>
          {availableTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all shrink-0 cursor-pointer ${
                selectedTag === tag
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* ── 2. CARDS DE MÉTRICAS (KPIS SAAS FINTECH — ACUMULADO GERAL) ──────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* KPI 1: Receita Real (Acumulado Geral) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative">
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block">
                Receita Real
              </span>
              <button
                onClick={() => setActiveMetricModal("RECEITA_REAL")}
                className="text-slate-300 hover:text-indigo-600 dark:text-slate-600 dark:hover:text-indigo-400 transition-colors p-0.5 cursor-pointer"
                title="Ver detalhes da fórmula e lançamentos de Receita Real"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
            <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-2 font-tnum tabular-nums">
              {brl(data.totalReceitas)}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              Acumulado Geral
            </span>
          </div>
        </div>

        {/* KPI 2: Total Gasto (Acumulado Geral) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative">
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block">
                Total Gasto
              </span>
              <button
                onClick={() => setActiveMetricModal("TOTAL_GASTO")}
                className="text-slate-300 hover:text-indigo-600 dark:text-slate-600 dark:hover:text-indigo-400 transition-colors p-0.5 cursor-pointer"
                title="Ver detalhes da fórmula e lançamentos de Total Gasto"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
            <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-2 font-tnum tabular-nums">
              {brl(data.totalGastos)}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
              <ArrowDownRight className="w-3.5 h-3.5 text-slate-400" />
              Saídas Consolidadas
            </span>
          </div>
        </div>

        {/* KPI 3: Balanço Geral (Acumulado Geral) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative">
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block">
                Balanço Geral
              </span>
              <button
                onClick={() => setActiveMetricModal("BALANCO_GERAL")}
                className="text-slate-300 hover:text-indigo-600 dark:text-slate-600 dark:hover:text-indigo-400 transition-colors p-0.5 cursor-pointer"
                title="Ver demonstrativo de cálculo do Balanço Geral"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
            <p className={`text-2xl font-bold tracking-tight mt-2 font-tnum tabular-nums ${data.balanco >= 0 ? "text-slate-900 dark:text-slate-100" : "text-rose-600 dark:text-rose-400"}`}>
              {brl(data.balanco)}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1 ${
              data.balanco >= 0 
                ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20" 
                : "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20"
            }`}>
              {data.balanco >= 0 ? "+ Superávit Acumulado" : "Déficit Acumulado"}
            </span>
          </div>
        </div>

        {/* KPI 4: Metas Globais */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative">
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block">
                Metas Globais
              </span>
              <button
                onClick={() => setActiveMetricModal("METAS_GLOBAIS")}
                className="text-slate-300 hover:text-indigo-600 dark:text-slate-600 dark:hover:text-indigo-400 transition-colors p-0.5 cursor-pointer"
                title="Ver detalhes de cálculo do percentual de Metas Globais"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
            <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-2 font-tnum tabular-nums">
              {data.metasGlobaisPct}%
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60">
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-600 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, data.metasGlobaisPct)}%` }} 
              />
            </div>
          </div>
        </div>

      </section>

      {/* ── 2.1 PROJEÇÃO DE SALDO FUTURO (GRÁFICO DE LINHA TEMPORAL - 30/60 DIAS) ─ */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-6 shadow-sm flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/60 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Projeção de Saldo Futuro ({projectionDays} Dias)
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Tendência diária calculada a partir de contas a pagar, receber e faturas cadastradas.
            </p>
          </div>

          {/* Seletor de Período 30d / 60d */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
            <button
              onClick={() => setProjectionDays(30)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                projectionDays === 30
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Próximos 30 Dias
            </button>
            <button
              onClick={() => setProjectionDays(60)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                projectionDays === 60
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Próximos 60 Dias
            </button>
          </div>
        </div>

        {/* Métricas de resumo da projeção */}
        {projectionData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 text-xs">
            <div className="group relative">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Saldo Atual (Hoje)</span>
                <button
                  onClick={() => setActiveMetricModal("SALDO_ATUAL")}
                  className="text-slate-300 hover:text-indigo-600 dark:text-slate-600 dark:hover:text-indigo-400 transition-colors p-0.5 cursor-pointer"
                  title="Ver origem e cálculo do Saldo Atual"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white font-tnum tabular-nums mt-0.5">
                {brl(projectionData.currentBalance)}
              </p>
            </div>

            <div className="group relative">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Saldo Projetado ({projectionDays}d)</span>
                <button
                  onClick={() => setActiveMetricModal("SALDO_PROJETADO")}
                  className="text-slate-300 hover:text-indigo-600 dark:text-slate-600 dark:hover:text-indigo-400 transition-colors p-0.5 cursor-pointer"
                  title="Ver equação e demonstrativo do Saldo Projetado"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className={`text-sm font-bold font-tnum tabular-nums mt-0.5 ${projectionData.projectedFinalBalance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                {brl(projectionData.projectedFinalBalance)}
              </p>
            </div>

            <div className="group relative">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Entradas Previstas</span>
                <button
                  onClick={() => setActiveMetricModal("ENTRADAS_PREVISTAS")}
                  className="text-slate-300 hover:text-indigo-600 dark:text-slate-600 dark:hover:text-indigo-400 transition-colors p-0.5 cursor-pointer"
                  title="Ver receitas consideradas em Entradas Previstas"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-tnum tabular-nums mt-0.5">
                +{brl(projectionData.totalFutureIncome)}
              </p>
            </div>

            <div className="group relative">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Saídas Previstas</span>
                <button
                  onClick={() => setActiveMetricModal("SAIDAS_PREVISTAS")}
                  className="text-slate-300 hover:text-indigo-600 dark:text-slate-600 dark:hover:text-indigo-400 transition-colors p-0.5 cursor-pointer"
                  title="Ver despesas não pagas consideradas em Saídas Previstas"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-sm font-bold text-rose-500 font-tnum tabular-nums mt-0.5">
                -{brl(projectionData.totalFutureExpense)}
              </p>
            </div>
          </div>
        )}

        {/* Gráfico de Linha/Área Temporal Recharts */}
        <div className="w-full h-[280px]">
          {loadingProjection || !projectionData ? (
            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-400 animate-pulse">
              Calculando projeção temporal de saldo...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projectionData.timeline} margin={{ top: 15, right: 20, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorSaldoProjetado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.15} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  dy={4}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => Math.abs(v) >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : `R$ ${v}`}
                  dx={-4}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10, fontWeight: 600 }} iconType="circle" />
                <Area
                  type="monotone"
                  dataKey="projectedBalance"
                  stroke="#4F46E5"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorSaldoProjetado)"
                  name="Saldo Projetado (R$)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* ── 3. MEUS CARTÕES & CONTAS (CREDIT CARD MATTE & WHITE ACCOUNTS) ────── */}
      <section className="flex flex-col gap-3">
        <div className="flex justify-between items-center px-0.5">
          <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
            Cartões & Contas Ativas
          </h2>
          <Link href="/despesas" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors">
            Ver todas <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {data.cards.map((card: any) => {
            const isCredit = card.walletType === "CREDIT_CARD";
            const saldoDisp = isCredit ? card.limitTotal - card.limitUsed : card.limitTotal;
            const Icon = walletIcon(card.walletType);

            if (isCredit) {
              // Cartão de Crédito - SaaS Credit Card Matte (Fundo escuro executivo)
              return (
                <Link
                  key={card.id}
                  href={`/cartoes/${card.id}`}
                  className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-slate-700 transition-all border border-slate-800 flex flex-col justify-between min-h-[140px] group"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-semibold tracking-tight text-white group-hover:text-indigo-300 transition-colors truncate max-w-[140px]">
                        {card.title}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                        Cartão de Crédito
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-300">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="mt-4">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">
                      Limite Disponível
                    </span>
                    <p className="text-xl font-bold tracking-tight text-white font-tnum tabular-nums mt-0.5">
                      {brl(saldoDisp)}
                    </p>
                  </div>
                </Link>
              );
            }

            // Conta Corrente / VA / VR - Clean White Card
            return (
              <Link
                key={card.id}
                href={`/cartoes/${card.id}`}
                className="bg-white text-slate-900 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all border border-slate-200/80 flex flex-col justify-between min-h-[140px] group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors truncate max-w-[140px]">
                      {card.title}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                      {card.walletType === "TICKET" ? "VA / VR Benefícios" : "Conta Corrente"}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-600">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                <div className="mt-4">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 block">
                    Saldo Atual
                  </span>
                  <p className="text-xl font-bold tracking-tight text-slate-900 font-tnum tabular-nums mt-0.5">
                    {brl(saldoDisp)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── 4. GRÁFICOS & TABELAS SECUNDÁRIAS ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLUNA ESQUERDA (7 cols - Gráficos Principal) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* BLOCO 1: Linha de Tendência (Evolução Financeira) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-6 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/60 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Evolução Financeira</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Comparativo de entradas vs. saídas nos últimos 7 meses</p>
              </div>
            </div>

            <div className="w-full h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.monthlyHistory} margin={{ top: 15, right: 25, left: 15, bottom: 15 }}>
                  <defs>
                    <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.15} vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    dy={6}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : `R$ ${v}`}
                    dx={-4}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 15, fontWeight: 600 }}
                    iconType="circle"
                  />

                  <Area
                    type="monotone"
                    dataKey="receitas"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorReceitas)"
                    name="Receitas"
                  />
                  <Area
                    type="monotone"
                    dataKey="gastos"
                    stroke="#6366F1"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorGastos)"
                    name="Gastos"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* BLOCO 2: DNA de Gastos por Categoria */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-6 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/60 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Distribuição por Categoria</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Divisão dos gastos consolidados do mês</p>
              </div>
            </div>

            <div className="w-full h-[220px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.categoryBreakdown}
                    dataKey="total"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={82}
                    paddingAngle={4}
                    cornerRadius={5}
                  >
                    {data.categoryBreakdown.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color || "#6366F1"} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-base font-bold text-slate-900 dark:text-white leading-none font-tnum tabular-nums">
                  {brl(data.totalGastosMes != null ? data.totalGastosMes : data.totalGastos)}
                </span>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                  Total Mês
                </span>
              </div>
            </div>

            {/* Legenda distribuída com porcentagens 100% exatas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              {(() => {
                const totalCatSum = data.categoryBreakdown.reduce((sum: number, c: any) => sum + Number(c.total), 0);
                return data.categoryBreakdown.map((c: any) => {
                  const pct = totalCatSum > 0 ? ((Number(c.total) / totalCatSum) * 100).toFixed(1) : "0.0";
                  return (
                    <div
                      key={c.name}
                      className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 px-3.5 py-2 rounded-xl border border-slate-100 dark:border-slate-800/80"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                        <span className="truncate">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 font-tnum tabular-nums">
                        <span>{brl(c.total)}</span>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">({pct}%)</span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

        </div>

        {/* COLUNA DIREITA (5 cols - Listas Executivas) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* BLOCO 1: Próximos Vencimentos */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900 tracking-tight">Faturas a Vencer</h3>
                <p className="text-xs text-slate-500 font-medium">Compromissos pendentes nos próximos dias</p>
              </div>
            </div>

            {upcomingBills.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600/80" />
                <p className="text-xs font-medium text-slate-500">Nenhuma fatura pendente para os próximos dias.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {upcomingBills.map((bill: any) => (
                  <div key={bill.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bill.isPast ? "bg-amber-100 text-amber-700" : "bg-slate-200/80 text-slate-700"}`}>
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-900">{bill.title}</p>
                        <p className="text-[10px] text-slate-500 font-medium">Vencimento: {bill.vencimento}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-900 font-tnum tabular-nums">{brl(bill.valor)}</p>
                      <span className={`text-[9px] font-semibold uppercase px-2 py-0.5 rounded-md inline-block mt-0.5 ${
                        bill.isPast ? "bg-amber-50 text-amber-700 border border-amber-200/60" : "bg-slate-200/60 text-slate-700"
                      }`}>
                        {bill.isPast ? "Vencida" : "Pendente"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* BLOCO 2: Resumo de Metas */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900 tracking-tight">Metas de Investimento</h3>
                <p className="text-xs text-slate-500 font-medium">Acompanhamento dos objetivos financeiros</p>
              </div>
              <Link href="/metas" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                Ver todas
              </Link>
            </div>

            {data.goals.length === 0 ? (
              <p className="py-6 text-xs font-medium text-slate-500 text-center">Nenhuma meta cadastrada.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {data.goals.slice(0, 3).map((goal: any) => (
                  <div key={goal.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-slate-900">{goal.title}</span>
                      <span className="text-xs font-bold text-indigo-600 font-tnum tabular-nums">{goal.pct}%</span>
                    </div>

                    <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-600 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, goal.pct)}%` }} 
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-medium text-slate-500 pt-0.5">
                      <span className="font-tnum tabular-nums">{brl(goal.acumulado)} acumulados</span>
                      <button
                        onClick={() => { setSelectedGoalId(goal.id); setAporteModalOpen(true); }}
                        className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200/60 transition-colors"
                      >
                        + Aporte
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* ── MODAIS DE AÇÃO RÁPIDA ───────────────────────────────────────────── */}

      {/* Modal 1: Nova Despesa */}
      <NewPurchaseModal
        isOpen={purchaseModalOpen}
        onClose={() => setPurchaseModalOpen(false)}
        onSuccess={loadDashboardData}
      />

      {/* Modal 2: Nova Receita */}
      {revenueModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md flex flex-col gap-5 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Lançar Nova Receita</h3>
              <button onClick={() => setRevenueModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRevenueSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Descrição *</label>
                <input
                  required
                  type="text"
                  value={revDesc}
                  onChange={e => setRevDesc(e.target.value)}
                  placeholder="Ex: Salário, Freelance, Rendimentos..."
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Valor (R$) *</label>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={revAmount}
                  onChange={e => setRevAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-900 font-tnum tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Data *</label>
                <input
                  required
                  type="date"
                  value={revDate}
                  onChange={e => setRevDate(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setRevenueModalOpen(false)} className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">Cancelar</button>
                <button type="submit" disabled={savingRev} className="flex-1 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm">Salvar Receita</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Fazer Aporte em Meta */}
      {aporteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm flex flex-col gap-5 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Efetuar Aporte em Meta</h3>
              <button onClick={() => setAporteModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAporteSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Valor do Aporte (R$)</label>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={aporteAmount}
                  onChange={e => setAporteAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Ex: 500.00"
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-900 font-tnum tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setAporteModalOpen(false)} className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">Cancelar</button>
                <button type="submit" disabled={savingAporte} className="flex-1 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm">Confirmar Aporte</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Histórico Geral Consolidado */}
      {historyModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header Modal */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Histórico Geral Consolidado
                  </h2>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Desempenho financeiro mês a mês de todas as transações cadastradas.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Modal — Tabela de Meses */}
            <div className="overflow-y-auto p-5 flex-1 space-y-4">
              {data.consolidatedHistory && data.consolidatedHistory.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        <th className="py-3 px-4">Mês / Ano</th>
                        <th className="py-3 px-4 text-right">Receitas</th>
                        <th className="py-3 px-4 text-right">Despesas</th>
                        <th className="py-3 px-4 text-right">Balanço do Mês</th>
                        <th className="py-3 px-4 text-center">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                      {data.consolidatedHistory.map((item: any) => {
                        const isPositive = item.balanco >= 0;
                        const isCurrent = item.month === selectedMonth && item.year === selectedYear;

                        return (
                          <tr
                            key={`${item.year}-${item.month}`}
                            className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                              isCurrent ? "bg-indigo-500/5 dark:bg-indigo-500/10" : ""
                            }`}
                          >
                            <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                              <div className="flex items-center gap-2">
                                <span>{item.label}</span>
                                {isCurrent && (
                                  <span className="text-[9px] font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md">
                                    Mês Ativo
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums font-tnum">
                              {brl(item.receitas)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-slate-700 dark:text-slate-300 tabular-nums font-tnum">
                              {brl(item.gastos)}
                            </td>
                            <td className="py-3.5 px-4 text-right tabular-nums font-tnum">
                              <span className={`font-bold px-2.5 py-1 rounded-full text-[11px] inline-block ${
                                isPositive
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                              }`}>
                                {isPositive ? `+ ${brl(item.balanco)}` : brl(item.balanco)}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => {
                                  setPeriod(item.month, item.year);
                                  setHistoryModalOpen(false);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-slate-700 dark:text-slate-300 font-bold text-[11px] transition-all cursor-pointer shadow-xs inline-flex items-center gap-1"
                              >
                                <span>Ver Mês</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 font-medium">
                  Nenhuma transação encontrada no histórico.
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Total de {data.consolidatedHistory?.length || 0} mês(es) com registros</span>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl transition-colors cursor-pointer font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Conciliação Bancária OFX */}
      <OFXReconciliationModal
        isOpen={ofxModalOpen}
        onClose={() => setOfxModalOpen(false)}
        onSuccess={() => {
          loadDashboardData();
          loadProjection();
        }}
      />

      {/* Modal de Detalhamento do Cálculo / Auditoria dos Indicadores */}
      <MetricInfoModal
        isOpen={!!activeMetricModal}
        metricKey={activeMetricModal}
        onClose={() => setActiveMetricModal(null)}
        dashboardData={data}
        projectionData={projectionData}
        projectionDays={projectionDays}
      />

    </div>
  );
}

