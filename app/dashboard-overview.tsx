"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line
} from "recharts";
import {
  Plus, TrendingUp, TrendingDown, DollarSign, Target, CreditCard,
  Building2, Zap, ChevronRight, CheckCircle2, Clock, AlertCircle,
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
  getAllTags
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
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-800 p-3 shadow-md dark:shadow-xl text-xs space-y-1">
        {label && <p className="font-medium text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1 mb-1">{label}</p>}
        {payload.map((p: any, idx: number) => (
          <div key={idx} className="flex items-center justify-between gap-4 font-tnum tabular-nums">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
              {p.name}:
            </span>
            <span className="font-semibold text-slate-900 dark:text-white">{brl(Number(p.value))}</span>
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

  const [viewMode, setViewMode] = useState<"annual" | "monthly">("annual");
  const [selectedDashboardYear, setSelectedDashboardYear] = useState<number>(2026);
  const [selectedDashboardMonth, setSelectedDashboardMonth] = useState<number>(new Date().getMonth() + 1);

  // Tags, Conciliação OFX & Modal de Detalhamento do Cálculo (Auditoria)
  const [ofxModalOpen, setOfxModalOpen] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [activeMetricModal, setActiveMetricModal] = useState<MetricKey | null>(null);

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
      const monthParam = viewMode === "monthly" ? selectedDashboardMonth : null;
      const result = await getDashboardOverviewData(selectedDashboardYear, monthParam);
      setData(result);
    } catch (err) {
      console.error("Erro ao carregar dados do dashboard:", err);
    } finally {
      setLoading(false);
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

  const handleGoToCurrentMonth = () => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    setSelectedDashboardYear(curYear);
    setSelectedDashboardMonth(curMonth);
    setViewMode("monthly");
    setPeriod(curMonth, curYear);
  };

  useEffect(() => {
    loadDashboardData();
    loadTags();
  }, [viewMode, selectedDashboardYear, selectedDashboardMonth]);

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
        <div className="h-48 bg-white rounded-2xl border border-slate-200/80 shadow-sm" />
      </div>
    );
  }

  const today = new Date();

  const upcomingBills: any[] = data.upcomingBills ?? data.cards
    .filter((c: any) => c.walletType === "CREDIT_CARD" && c.faturaAtual > 0 && !c.isPaid)
    .map((c: any) => ({
      id: c.id,
      title: c.title,
      valor: c.faturaAtual,
      vencimento: c.vencimentoStr || `${String(c.vencimento).padStart(2, "0")}/${String(selectedMonth).padStart(2, "0")}/${selectedYear}`,
      isPast: !!c.isPast,
      statusLabel: c.isPast ? "VENCIDA" : "PENDENTE",
      statusBadgeVariant: c.isPast ? "overdue" : "pending",
    }));

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto flex flex-col gap-6 md:gap-8 select-none relative font-sans text-slate-900 dark:text-white">
      
      {/* ── 1. CABEÇALHO & SELETOR DE PERÍODO FLEXÍVEL (VISÃO ANUAL vs MENSAL) ── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Dashboard Financeiro
            </h1>
            <span className="bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {viewMode === "annual" ? `ANO ${selectedDashboardYear}` : `MÊS ${String(selectedDashboardMonth).padStart(2, "0")}/${selectedDashboardYear}`}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {viewMode === "annual"
              ? `Visão consolidada do ano de ${selectedDashboardYear}.`
              : `Detalhamento pontual das movimentações de ${selectedDashboardMonth}/${selectedDashboardYear}.`}
          </p>
        </div>

        {/* Controles de Período Flexível (Modo Anual vs Mensal) */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Toggle de Modo: Anual (Ano Completo) vs Mensal (Por Mês) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setViewMode("annual")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                viewMode === "annual"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Ano Completo
            </button>
            <button
              onClick={() => setViewMode("monthly")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                viewMode === "monthly"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Filtrar por Mês
            </button>
          </div>

          {/* Seletor de Ano */}
          <select
            value={selectedDashboardYear}
            onChange={(e) => setSelectedDashboardYear(Number(e.target.value))}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            {[2022, 2023, 2024, 2025, 2026, 2027, 2028].map(y => (
              <option key={y} value={y}>Ano {y}</option>
            ))}
          </select>

          {/* Seletor de Mês (Visível quando em Modo Mensal) */}
          {viewMode === "monthly" && (
            <select
              value={selectedDashboardMonth}
              onChange={(e) => setSelectedDashboardMonth(Number(e.target.value))}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 cursor-pointer animate-in fade-in"
            >
              {[
                "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
              ].map((mName, idx) => (
                <option key={idx + 1} value={idx + 1}>{mName}</option>
              ))}
            </select>
          )}

          {/* Botão MÊS ATUAL */}
          <button
            onClick={handleGoToCurrentMonth}
            className="px-3.5 py-2 text-xs font-black bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
            title="Ir para o Mês Atual"
          >
            <Calendar className="w-3.5 h-3.5" />
            MÊS ATUAL
          </button>

          {/* Botões de Ação Rápida */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOfxModalOpen(true)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl font-bold text-xs shadow-md cursor-pointer transition-all"
            >
              <FileText className="w-3.5 h-3.5" /> Conciliação
            </button>
            <button
              onClick={() => setRevenueModalOpen(true)}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl font-bold text-xs shadow-md cursor-pointer transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Receita
            </button>
            <button
              onClick={() => setPurchaseModalOpen(true)}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl font-bold text-xs shadow-md cursor-pointer transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Despesa
            </button>
          </div>

        </div>
      </div>

      {/* ── BARRA DE TAGS / CENTRO DE CUSTOS ───────────────────────────────── */}
      {availableTags.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 shrink-0">
            <Tag className="w-3 h-3 text-indigo-400" /> Tags:
          </span>
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all shrink-0 cursor-pointer ${
              selectedTag === null
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800"
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
                  : "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/20"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* ── 2. MEUS CARTÕES & CONTAS ────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <div className="flex justify-between items-center px-0.5">
          <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
            Cartões & Contas Ativas
          </h2>
          <Link href="/despesas" className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors">
            Ver todas <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {data.cards.map((card: any) => {
            const isCredit = card.walletType === "CREDIT_CARD";
            const saldoDisp = isCredit ? card.limitTotal - card.limitUsed : (card.finalBalance ?? card.limitTotal);
            const Icon = walletIcon(card.walletType);
            const isYearlyFilter = viewMode === "annual";
            const accountSpentInPeriod = card.totalSpentInPeriod ?? card.accountExpenses ?? 0;

            return (
              <Link
                key={card.id}
                href={`/cartoes/${card.id}`}
                className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between min-h-[165px] group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-black tracking-tight text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate max-w-[140px]">
                      {card.title}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                      {isCredit ? "Cartão de Crédito" : card.walletType === "TICKET" ? "VA / VR Benefícios" : "Conta Corrente"}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                <div className="mt-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    {isCredit ? "Limite Disponível" : "Saldo Atual"}
                  </span>
                  <p className="text-xl font-black tracking-tight text-slate-900 dark:text-white font-tnum tabular-nums mt-0.5">
                    {brl(saldoDisp)}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider">
                    {isCredit
                      ? "Fatura:"
                      : isYearlyFilter
                      ? "Gasto no Ano:"
                      : "Gasto no Mês:"}
                  </span>
                  <span className={`text-xs font-black font-tnum tabular-nums ${
                    isCredit ? "text-rose-600 dark:text-rose-400" : "text-slate-800 dark:text-slate-200"
                  }`}>
                    {brl(isCredit ? card.faturaAtual : accountSpentInPeriod)}
                  </span>
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
          <div className="bg-white dark:bg-slate-900/70 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm dark:shadow-xl flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">Evolução Financeira</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Comparativo de entradas vs. saídas nos últimos 7 meses</p>
              </div>
            </div>

            <div className="w-full h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.monthlyHistory} margin={{ top: 15, right: 25, left: 15, bottom: 15 }}>
                  <defs>
                    <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-[#334155]" strokeOpacity={0.4} vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#64748b", fontWeight: 700 }}
                    axisLine={false}
                    tickLine={false}
                    dy={6}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748b", fontWeight: 700 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : `R$ ${v}`}
                    dx={-4}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 15, fontWeight: 700 }}
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
          <div className="bg-white dark:bg-slate-900/70 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm dark:shadow-xl flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">Distribuição por Categoria</h3>
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
                <span className="text-base font-black text-slate-900 dark:text-white leading-none font-tnum tabular-nums">
                  {brl(data.categoryBreakdown.reduce((acc: number, curr: any) => acc + Number(curr.total || curr.value || 0), 0))}
                </span>
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">
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
                      className="flex items-center justify-between gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950/60 px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-800"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                        <span className="truncate">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 font-tnum tabular-nums">
                        <span>{brl(c.total)}</span>
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-500">({pct}%)</span>
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
          <div className="bg-white dark:bg-slate-900/70 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm dark:shadow-xl flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  Faturas a Vencer
                  {upcomingBills.length > 0 && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                      {upcomingBills.length}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Compromissos pendentes nos próximos dias</p>
              </div>
              <Link
                href="/despesas"
                className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors flex items-center gap-1"
              >
                Ver todas <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {upcomingBills.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400/80" />
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Nenhuma fatura pendente para os próximos dias.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {upcomingBills.map((bill: any) => {
                  const isOverdue = !!bill.isPast || bill.statusBadgeVariant === "overdue";
                  const isUrgent = bill.statusBadgeVariant === "urgent" || (!isOverdue && bill.daysDiff !== undefined && bill.daysDiff <= 7);

                  let badgeStyle = "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
                  let iconBgStyle = "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300";
                  let cardBorder = "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800";

                  if (isOverdue) {
                    badgeStyle = "bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/40";
                    iconBgStyle = "bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30";
                    cardBorder = "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40";
                  } else if (isUrgent) {
                    badgeStyle = "bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/40";
                    iconBgStyle = "bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30";
                    cardBorder = "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40";
                  }

                  return (
                    <div key={bill.id} className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${cardBorder}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBgStyle}`}>
                          {isOverdue ? <AlertCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                            {bill.title}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            Vencimento: <strong className="font-extrabold text-slate-700 dark:text-slate-300">{bill.vencimento}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className={`text-xs font-black font-tnum tabular-nums ${
                          isOverdue ? "text-rose-600 dark:text-rose-400" : isUrgent ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"
                        }`}>
                          {brl(bill.valor)}
                        </p>
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md inline-block mt-0.5 border ${badgeStyle}`}>
                          {bill.statusLabel || (isOverdue ? "VENCIDA" : "PENDENTE")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* BLOCO 2: Resumo de Metas */}
          <div className="bg-white dark:bg-slate-900/70 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm dark:shadow-xl flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">Metas de Investimento</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Acompanhamento dos objetivos financeiros</p>
              </div>
              <Link href="/metas" className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">
                Ver todas
              </Link>
            </div>

            {data.goals.length === 0 ? (
              <p className="py-6 text-xs font-medium text-slate-500 dark:text-slate-400 text-center">Nenhuma meta cadastrada.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {data.goals.slice(0, 3).map((goal: any) => (
                  <div key={goal.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-slate-900 dark:text-white">{goal.title}</span>
                      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 font-tnum tabular-nums">{goal.pct}%</span>
                    </div>

                    <div className="w-full bg-slate-100 dark:bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800">
                      <div 
                        className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, goal.pct)}%` }} 
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-slate-400 pt-0.5">
                      <span className="font-tnum tabular-nums">{brl(goal.acumulado)} acumulados</span>
                      <button
                        onClick={() => { setSelectedGoalId(goal.id); setAporteModalOpen(true); }}
                        className="text-[10px] font-black text-[#00a854] dark:text-[#00e676] bg-emerald-50 dark:bg-[#00e676]/10 hover:bg-emerald-100 dark:hover:bg-[#00e676]/20 px-2.5 py-0.5 rounded-lg border border-emerald-200 dark:border-[#00e676]/30 transition-colors cursor-pointer"
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
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md flex flex-col gap-5 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Lançar Nova Receita</h3>
              <button onClick={() => setRevenueModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRevenueSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Descrição *</label>
                <input
                  required
                  type="text"
                  value={revDesc}
                  onChange={e => setRevDesc(e.target.value)}
                  placeholder="Ex: Salário, Freelance, Rendimentos..."
                  className="w-full rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Valor (R$) *</label>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={revAmount}
                  onChange={e => setRevAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Data *</label>
                <input
                  required
                  type="date"
                  value={revDate}
                  onChange={e => setRevDate(e.target.value)}
                  className="w-full rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setRevenueModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl cursor-pointer">Cancelar</button>
                <button type="submit" disabled={savingRev} className="px-5 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-600/30 cursor-pointer">Salvar Receita</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Fazer Aporte em Meta */}
      {aporteModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm flex flex-col gap-5 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Efetuar Aporte em Meta</h3>
              <button onClick={() => setAporteModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAporteSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Valor do Aporte (R$)</label>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={aporteAmount}
                  onChange={e => setAporteAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Ex: 500.00"
                  className="w-full rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setAporteModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl cursor-pointer">Cancelar</button>
                <button type="submit" disabled={savingAporte} className="px-5 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 cursor-pointer">Confirmar Aporte</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Histórico Geral Consolidado */}
      {historyModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-slate-900 dark:text-white">
            {/* Header Modal */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">
                    Histórico Geral Consolidado
                  </h2>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Desempenho financeiro mês a mês de todas as transações cadastradas.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Modal — Tabela de Meses */}
            <div className="overflow-y-auto p-5 flex-1 space-y-4">
              {data.consolidatedHistory && data.consolidatedHistory.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-100/80 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                        <th className="py-3 px-4">Mês / Ano</th>
                        <th className="py-3 px-4 text-right">Receitas</th>
                        <th className="py-3 px-4 text-right">Despesas</th>
                        <th className="py-3 px-4 text-right">Balanço do Mês</th>
                        <th className="py-3 px-4 text-center">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-800 dark:text-slate-200">
                      {data.consolidatedHistory.map((item: any) => {
                        const isPositive = item.balanco >= 0;
                        const isCurrent = item.month === selectedMonth && item.year === selectedYear;

                        return (
                          <tr
                            key={`${item.year}-${item.month}`}
                            className={`hover:bg-slate-800/40 transition-colors ${
                              isCurrent ? "bg-indigo-500/10" : ""
                            }`}
                          >
                            <td className="py-3.5 px-4 font-black text-white">
                              <div className="flex items-center gap-2">
                                <span>{item.label}</span>
                                {isCurrent && (
                                  <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-md">
                                    Mês Ativo
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right font-black text-emerald-400 tabular-nums font-tnum">
                              {brl(item.receitas)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-black text-slate-300 tabular-nums font-tnum">
                              {brl(item.gastos)}
                            </td>
                            <td className="py-3.5 px-4 text-right tabular-nums font-tnum">
                              <span className={`font-black px-2.5 py-1 rounded-full text-[11px] inline-block ${
                                isPositive
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
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
                                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white font-black text-[11px] transition-all cursor-pointer inline-flex items-center gap-1"
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
            <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-slate-400">
              <span>Total de {data.consolidatedHistory?.length || 0} mês(es) com registros</span>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors cursor-pointer font-extrabold"
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
        }}
      />

      {/* Modal de Detalhamento do Cálculo / Auditoria dos Indicadores */}
      <MetricInfoModal
        isOpen={!!activeMetricModal}
        metricKey={activeMetricModal}
        onClose={() => setActiveMetricModal(null)}
        dashboardData={data}
        projectionData={null}
        projectionDays={30}
      />

    </div>
  );
}

