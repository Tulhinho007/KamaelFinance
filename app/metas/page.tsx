"use client";

import React, { useState, useEffect } from "react";
import { getGoals, createGoalAction, updateGoalAction, deleteGoalAction, addAporteAction, getWalletsAction } from "@/lib/actions";
import { usePeriod } from "@/components/period-context";
import { PeriodHeader } from "@/components/period-header";
import { GoalGamificationBadges } from "@/components/goal-gamification-badges";
import { GoalCelebrationModal } from "@/components/goal-celebration-modal";
import { useModal } from "@/components/ui/custom-dialog-provider";
import {
  Search, Plus, Plane, Car, Home, History, Sparkles, Target, X, Edit2, Trash2, Coins, Calendar, Wallet as WalletIcon, Clock, TrendingUp, CheckCircle2, AlertTriangle, ArrowUpRight
} from "lucide-react";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Formata a data ISO (AAAA-MM-DD) para exibição em formato brasileiro (DD/MM/AAAA)
const formatDateDisplay = (dateStr: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

type GoalHistoryEntry = {
  id: string;
  date: string;
  amount: number;
};

type Goal = {
  id: string | number;
  title: string;
  dataInicio: string;
  dataFim: string;
  acumulado: number;
  objetivo: number;
  pct: number;
  iconName: "Plane" | "Car" | "Home" | "Target";
  walletId?: string | null;
  walletTitle?: string | null;
  mediaAporteMensal?: number;
  estimatedDateStr?: string;
  paceStatus?: "COMPLETED" | "ADVANCED" | "BEHIND" | "UNKNOWN";
  history: GoalHistoryEntry[];
};

const ICON_MAP = {
  Plane: Plane,
  Car: Car,
  Home: Home,
  Target: Target
};

// Helper de estilos circulares translúcidos por tipo de ícone/meta
function getIconBadgeStyle(iconName: string, title: string) {
  const t = title.toLowerCase();
  if (iconName === "Plane" || t.includes("viagem") || t.includes("voo") || t.includes("férias")) {
    return "bg-sky-500/20 text-sky-300 border-sky-400/40 shadow-[0_0_12px_rgba(56,189,248,0.2)]";
  }
  if (iconName === "Home" || t.includes("casa") || t.includes("reforma") || t.includes("ap")) {
    return "bg-emerald-500/20 text-emerald-300 border-emerald-400/40 shadow-[0_0_12px_rgba(52,211,153,0.2)]";
  }
  if (iconName === "Car" || t.includes("carro") || t.includes("moto") || t.includes("veículo")) {
    return "bg-amber-500/20 text-amber-300 border-amber-400/40 shadow-[0_0_12px_rgba(251,191,36,0.2)]";
  }
  return "bg-purple-500/20 text-purple-300 border-purple-400/40 shadow-[0_0_12px_rgba(192,132,252,0.2)]";
}

// Helper para calcular o badge dinâmico de tempo restante
function getDaysRemainingBadge(dataFimStr: string, pct: number) {
  if (pct >= 100) {
    return {
      text: "✅ Concluída!",
      style: "bg-emerald-500/20 text-emerald-300 border-emerald-400/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]",
    };
  }

  if (!dataFimStr) return { text: "Sem prazo", style: "bg-slate-800 text-slate-400 border-slate-700" };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parts = dataFimStr.split("-");
  if (parts.length !== 3) return { text: dataFimStr, style: "bg-slate-800 text-slate-300 border-slate-700" };

  const endDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  endDate.setHours(0, 0, 0, 0);

  const diffTime = endDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    return {
      text: `🚨 Vencida há ${absDays} dia${absDays > 1 ? "s" : ""}`,
      style: "bg-rose-500/20 text-rose-300 border-rose-400/50 shadow-[0_0_10px_rgba(244,63,94,0.2)]",
    };
  }

  if (diffDays === 0) {
    return {
      text: "⚠️ Vence hoje!",
      style: "bg-amber-500/20 text-amber-300 border-amber-400/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]",
    };
  }

  if (diffDays === 1) {
    return {
      text: "⏳ Falta 1 dia",
      style: "bg-amber-500/20 text-amber-300 border-amber-400/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]",
    };
  }

  return {
    text: `⏳ Faltam ${diffDays} dias`,
    style: "bg-indigo-500/20 text-indigo-300 border-indigo-400/40 shadow-[0_0_10px_rgba(99,102,241,0.2)]",
  };
}

export default function MetasPage() {
  const { showAlert } = useModal();
  const [metas, setMetas] = useState<Goal[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Controle de Celebração e Badges
  const [celebrationData, setCelebrationData] = useState<{ isOpen: boolean; goalTitle: string; milestonePct: number }>({
    isOpen: false,
    goalTitle: "",
    milestonePct: 100,
  });

  // Controle de Modais
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [modalType, setModalType] = useState<"create" | "edit" | "aporte" | "history" | "delete" | null>(null);

  // Form Fields State
  const [formTitle, setFormTitle] = useState("");
  const [formDataInicio, setFormDataInicio] = useState("");
  const [formDataFim, setFormDataFim] = useState("");
  const [formObjetivo, setFormObjetivo] = useState(0);
  const [formAcumuladoInicial, setFormAcumuladoInicial] = useState(0);
  const [formIconName, setFormIconName] = useState<"Plane" | "Car" | "Home" | "Target">("Target");
  const [formWalletId, setFormWalletId] = useState("");
  const [formAporteVal, setFormAporteVal] = useState(0);

  // Busca de Metas
  const [searchQuery, setSearchQuery] = useState("");

  // --- CARREGAMENTO DO BANCO DE DADOS ---
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [goalsData, walletsData] = await Promise.all([getGoals(), getWalletsAction()]);
      setMetas(goalsData);
      setWallets(walletsData);
    } catch (err) {
      console.error("Erro ao obter dados do banco:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const filteredMetas = metas.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Valores Consolidados Dinâmicos (3 KPIs)
  const totalAcumulado = metas.reduce((sum, m) => sum + m.acumulado, 0);
  const objetivoFinal  = metas.reduce((sum, m) => sum + m.objetivo, 0);
  const faltaAportar   = Math.max(0, objetivoFinal - totalAcumulado);
  const globalPct      = objetivoFinal > 0 ? Math.min(100, Math.round((totalAcumulado / objetivoFinal) * 100)) : 0;
  const activeMetasCount = metas.length;

  // Círculo Radial Progresso
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (globalPct / 100) * circumference;

  // --- Handlers de Ações ---

  const openCreateModal = () => {
    setFormTitle("");
    const todayStr = new Date().toISOString().split("T")[0];
    setFormDataInicio(todayStr);
    setFormDataFim("");
    setFormObjetivo(0);
    setFormAcumuladoInicial(0);
    setFormIconName("Target");
    setFormWalletId("");
    setModalType("create");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formDataInicio || !formDataFim || formObjetivo <= 0) return;

    try {
      await createGoalAction(formTitle, formDataInicio, formDataFim, formObjetivo, formAcumuladoInicial, formIconName, formWalletId || undefined);
      await loadAllData();
      setModalType(null);
    } catch (err) {
      console.error(err);
      showAlert("Erro ao criar meta no banco de dados.", { variant: "error" });
    }
  };

  const openEditModal = (goal: Goal) => {
    setSelectedGoal(goal);
    setFormTitle(goal.title);
    setFormDataInicio(goal.dataInicio);
    setFormDataFim(goal.dataFim);
    setFormObjetivo(goal.objetivo);
    setFormIconName(goal.iconName);
    setFormWalletId(goal.walletId || "");
    setModalType("edit");
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal || !formTitle || !formDataInicio || !formDataFim || formObjetivo <= 0) return;

    try {
      await updateGoalAction(selectedGoal.id.toString(), formTitle, formDataInicio, formDataFim, formObjetivo, formIconName, formWalletId || undefined);
      await loadAllData();
      setModalType(null);
    } catch (err) {
      console.error(err);
      showAlert("Erro ao editar meta no banco de dados.", { variant: "error" });
    }
  };

  const openAporteModal = (goal: Goal) => {
    setSelectedGoal(goal);
    setFormAporteVal(0);
    setModalType("aporte");
  };

  const handleAporte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal || formAporteVal <= 0) return;

    const oldPct = selectedGoal.pct;
    const newAcumulado = selectedGoal.acumulado + formAporteVal;
    const newPct = selectedGoal.objetivo > 0 ? Math.min(100, Math.round((newAcumulado / selectedGoal.objetivo) * 100)) : 0;

    const milestones = [25, 50, 75, 100];
    const crossedMilestone = milestones.find(m => oldPct < m && newPct >= m);

    try {
      await addAporteAction(selectedGoal.id.toString(), formAporteVal);
      await loadAllData();
      setModalType(null);

      if (crossedMilestone) {
        setCelebrationData({
          isOpen: true,
          goalTitle: selectedGoal.title,
          milestonePct: crossedMilestone,
        });
      }
    } catch (err) {
      console.error(err);
      showAlert("Erro ao registrar aporte no banco de dados.", { variant: "error" });
    }
  };

  const openHistoryModal = (goal: Goal) => {
    setSelectedGoal(goal);
    setModalType("history");
  };

  const openDeleteModal = (goal: Goal) => {
    setSelectedGoal(goal);
    setModalType("delete");
  };

  const handleDelete = async () => {
    if (!selectedGoal) return;
    try {
      await deleteGoalAction(selectedGoal.id.toString());
      setMetas(prev => prev.filter(m => m.id !== selectedGoal.id));
      setModalType(null);
    } catch (err) {
      console.error(err);
      showAlert("Erro ao excluir meta do banco de dados.", { variant: "error" });
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto flex flex-col gap-8 relative select-none">
      
      {/* ── 1. HEADER GLOBAL ─────────────────────────────────────────────────── */}
      <PeriodHeader 
        title="Minhas Metas" 
        tagline="Sonhe alto e acompanhe o progresso de cada conquista financeira." 
        badge="Metas" 
      />

      {/* ── 2. BUSCA LOCAL E BOTÃO NOVA META ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Busca por Palavra-chave */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar metas..."
            className="pl-11 pr-4 py-2.5 text-xs font-semibold bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs text-slate-800 dark:text-slate-200 w-48 sm:w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all placeholder-slate-400"
          />
        </div>

        <button 
          onClick={openCreateModal}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-5 py-3 rounded-2xl shadow-lg shadow-indigo-600/30 hover:scale-[1.02] transition-all font-extrabold text-xs tracking-wider flex items-center justify-center gap-1.5 border border-white/20 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4.5 h-4.5 text-white" />
          <span>NOVA META</span>
        </button>
      </div>

      {/* ── 3. BANNER PRINCIPAL COM GLOW & GLASSMORPHISM ("HORIZONTE DE CONQUISTAS") ── */}
      <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 dark:from-slate-900 dark:via-indigo-950/60 dark:to-slate-900 rounded-[32px] border border-indigo-200 dark:border-indigo-500/30 p-6 md:p-8 shadow-sm dark:shadow-[0_0_35px_rgba(99,102,241,0.18)] flex flex-col md:flex-row items-center gap-6 md:gap-10 relative overflow-hidden backdrop-blur-md">
        
        {/* Efeito Glow no Fundo */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Gráfico Radial de Progresso Global */}
        <div className="relative w-28 h-28 flex items-center justify-center bg-white dark:bg-slate-900/90 rounded-2xl border border-indigo-200 dark:border-indigo-500/30 shadow-sm dark:shadow-[0_0_20px_rgba(99,102,241,0.2)] flex-shrink-0 z-10">
          <svg className="w-22 h-22 transform -rotate-90">
            <circle
              cx="44"
              cy="44"
              r={radius}
              className="stroke-slate-200 dark:stroke-slate-800 fill-none"
              strokeWidth="7"
            />
            <circle
              cx="44"
              cy="44"
              r={radius}
              className="stroke-indigo-500 dark:stroke-indigo-400 fill-none transition-all duration-700"
              strokeWidth="7"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-lg font-black text-slate-900 dark:text-white leading-none drop-shadow-sm">{globalPct}%</span>
            <span className="text-[8px] font-extrabold text-indigo-600 dark:text-indigo-300 uppercase tracking-widest mt-1">Global</span>
          </div>
        </div>

        {/* Informações Centrais & 3 KPIs Consolidados */}
        <div className="flex-1 flex flex-col justify-between items-center sm:items-start w-full gap-4 z-10">
          
          <div className="text-center sm:text-left w-full">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="rounded-full bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-400/30 px-3 py-1 text-[10px] font-black tracking-wider text-indigo-800 dark:text-indigo-300 uppercase shadow-xs">
                Visão Consolidada
              </span>
              <span className="text-[10px] font-black text-purple-800 dark:text-purple-300 bg-purple-100 dark:bg-purple-500/20 border border-purple-200 dark:border-purple-400/30 px-3 py-1 rounded-full uppercase">
                {activeMetasCount} Metas Ativas
              </span>
            </div>
            
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-2.5">Horizonte de Conquistas</h2>

            {/* 3 KPIs: Total Acumulado, Objetivo Final e Falta Aportar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 w-full bg-slate-100/80 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-white/10">
              
              {/* KPI 1 — Total Acumulado */}
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">Total Acumulado</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-1 block">{brl(totalAcumulado)}</span>
              </div>

              {/* KPI 2 — Objetivo Final */}
              <div className="flex flex-col sm:border-l sm:border-slate-200 dark:sm:border-slate-800 sm:pl-4">
                <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">Objetivo Final</span>
                <span className="text-base font-black text-slate-900 dark:text-slate-100 mt-1 block">{brl(objetivoFinal)}</span>
              </div>

              {/* KPI 3 — Falta Aportar */}
              <div className="flex flex-col sm:border-l sm:border-slate-200 dark:sm:border-slate-800 sm:pl-4">
                <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">Falta Aportar</span>
                <span className="text-base font-black text-amber-600 dark:text-amber-400 mt-1 block">{brl(faltaAportar)}</span>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* ── 4. GRID DE OBJETIVOS ESTRATÉGICOS ───────────────────────────────── */}
      <section className="flex flex-col gap-4">
        
        <div className="flex justify-between items-center">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Objetivos Estratégicos ({filteredMetas.length})
          </h2>
        </div>

        {/* Lista de Metas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-1 md:col-span-3 text-center py-12 bg-white dark:bg-slate-900/80 rounded-[28px] border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 font-bold animate-pulse text-xs uppercase tracking-widest shadow-sm">
              Carregando metas do banco de dados...
            </div>
          ) : filteredMetas.length === 0 ? (
            <div className="col-span-1 md:col-span-3 text-center py-12 bg-white dark:bg-slate-900/80 rounded-[28px] border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider shadow-sm">
              Nenhuma meta financeira cadastrada.
            </div>
          ) : (
            filteredMetas.map((meta) => {
              const IconComponent = ICON_MAP[meta.iconName] || Target;
              const iconStyle     = getIconBadgeStyle(meta.iconName, meta.title);
              const daysBadge     = getDaysRemainingBadge(meta.dataFim, meta.pct);
              
              return (
                <div 
                  key={meta.id} 
                  className="bg-white dark:bg-slate-900/90 backdrop-blur-md rounded-[28px] border border-slate-200 dark:border-slate-800 p-6 shadow-sm dark:shadow-md flex flex-col justify-between hover:shadow-lg dark:hover:shadow-xl hover:border-indigo-400/40 dark:hover:border-indigo-500/30 hover:scale-[1.01] transition-all duration-300 min-h-[340px]"
                >
                  
                  {/* Cabeçalho do Card */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Container do Ícone Circular Translúcido com Glow */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconStyle}`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight truncate max-w-[130px]" title={meta.title}>
                          {meta.title}
                        </h3>
                        <p className="text-[9px] font-extrabold text-slate-500 dark:text-slate-300 block mt-0.5">
                          {formatDateDisplay(meta.dataInicio)} a {formatDateDisplay(meta.dataFim)}
                        </p>
                      </div>
                    </div>

                    {/* Botões Rápidos (Editar / Excluir / Porcentagem) */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button 
                        onClick={() => openEditModal(meta)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                        title="Editar Meta"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => openDeleteModal(meta)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                        title="Excluir Meta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 pl-1">{meta.pct}%</span>
                    </div>

                  </div>

                  {/* Badge Dinâmico de Tempo Restante */}
                  <div className="mt-3 flex items-center justify-between">
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black border uppercase tracking-wider ${daysBadge.style}`}>
                      {daysBadge.text}
                    </span>

                    {meta.walletTitle && (
                      <span className="flex items-center gap-1 text-[9px] font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-400/30 px-2.5 py-1 rounded-full truncate max-w-[140px]">
                        <WalletIcon className="w-3 h-3 shrink-0" />
                        <span className="truncate">{meta.walletTitle}</span>
                      </span>
                    )}
                  </div>

                  {/* Selos de Gamificação / Marcos com Neon Glow (25%, 50%, 75%, 100%) */}
                  <div className="mt-3">
                    <GoalGamificationBadges pct={meta.pct} />
                  </div>

                  {/* Previsão Realista de Conclusão */}
                  <div className="mt-3 text-[10px] font-medium leading-tight">
                    {meta.paceStatus === "COMPLETED" ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-extrabold inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Meta 100% Concluída!
                      </span>
                    ) : meta.paceStatus === "ADVANCED" ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-extrabold inline-flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Adiantado! Conclusão em {meta.estimatedDateStr}.
                      </span>
                    ) : meta.paceStatus === "BEHIND" ? (
                      <span className="text-amber-700 dark:text-amber-300 font-extrabold inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300" /> Ritmo atual: Conclusão em {meta.estimatedDateStr}.
                      </span>
                    ) : (
                      <span className="text-slate-600 dark:text-slate-300 font-semibold inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" /> {meta.estimatedDateStr}
                      </span>
                    )}
                  </div>

                  {/* Barra de Progresso Vibrante em Gradiente */}
                  <div className="mt-3">
                    <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700/80 p-0.5">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 rounded-full transition-all duration-700 shadow-[0_0_12px_rgba(99,102,241,0.4)]" 
                        style={{ width: `${meta.pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Acumulado / Objetivo com Tipografia Clara de Alto Contraste */}
                  <div className="border-t border-slate-100 dark:border-slate-800 mt-3 pt-3 grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-wider block">Acumulado</span>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">{brl(meta.acumulado)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-wider block">Objetivo</span>
                      <span className="text-xs font-black text-slate-900 dark:text-slate-200 mt-0.5 block">{brl(meta.objetivo)}</span>
                    </div>
                  </div>

                  {/* Rodapé: Botão CTA Principal (FAZER APORTE) */}
                  <div className="flex items-center gap-2 mt-3">
                    <button 
                      onClick={() => openAporteModal(meta)}
                      className="flex-1 py-2.5 text-xs font-black rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-500 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/30 hover:scale-[1.02] border border-white/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Coins className="w-3.5 h-3.5 text-white" />
                      <span>FAZER APORTE</span>
                    </button>
                    
                    <button 
                      onClick={() => openHistoryModal(meta)}
                      className="p-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors rounded-xl cursor-pointer"
                      title="Histórico de Aportes"
                    >
                      <History className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              );
            })
          )}

        </div>

      </section>

      {/* ── MODAIS INTERATIVOS ───────────────────────────────────────────────── */}
      {modalType && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-[28px] shadow-2xl max-w-sm w-full flex flex-col gap-5 text-slate-900 dark:text-white animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header do Modal */}
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-black text-white uppercase tracking-widest">
                {modalType === "create" && "Nova Meta Financeira"}
                {modalType === "edit" && "Editar Meta"}
                {modalType === "aporte" && "Fazer Aporte"}
                {modalType === "history" && "Histórico de Aportes"}
                {modalType === "delete" && "Excluir Meta"}
              </h3>
              <button 
                onClick={() => setModalType(null)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal de Criação / Edição */}
            {(modalType === "create" || modalType === "edit") && (
              <form onSubmit={modalType === "create" ? handleCreate : handleEdit} className="flex flex-col gap-4">
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider">Título da Meta *</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ex: Viagem Japão, Novo Computador..."
                    className="rounded-2xl bg-slate-800/80 border border-slate-700 px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-white placeholder-slate-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider">Data Início *</label>
                    <input
                      type="date"
                      required
                      value={formDataInicio}
                      onChange={(e) => setFormDataInicio(e.target.value)}
                      className="rounded-2xl bg-slate-800/80 border border-slate-700 px-3.5 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-white"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider">Data Fim *</label>
                    <input
                      type="date"
                      required
                      value={formDataFim}
                      onChange={(e) => setFormDataFim(e.target.value)}
                      className="rounded-2xl bg-slate-800/80 border border-slate-700 px-3.5 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-white"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider">Valor Objetivo (R$) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formObjetivo || ""}
                    onChange={(e) => setFormObjetivo(Number(e.target.value))}
                    placeholder="Ex: 15000"
                    className="rounded-2xl bg-slate-800/80 border border-slate-700 px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-white"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider">Vincular a Conta/Cofre (Opcional)</label>
                  <select
                    value={formWalletId}
                    onChange={(e) => setFormWalletId(e.target.value)}
                    className="rounded-2xl bg-slate-800/80 border border-slate-700 px-3.5 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-white cursor-pointer"
                  >
                    <option value="">Nenhum cofre vinculado (Aportes manuais)</option>
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.title} ({w.walletType}) - Saldo: {brl(w.currentTotal)}
                      </option>
                    ))}
                  </select>
                </div>

                {modalType === "create" && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider">Aporte Inicial (R$)</label>
                    <input
                      type="number"
                      min="0"
                      value={formAcumuladoInicial || ""}
                      onChange={(e) => setFormAcumuladoInicial(Number(e.target.value))}
                      placeholder="Ex: 1000 (Opcional)"
                      className="rounded-2xl bg-slate-800/80 border border-slate-700 px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-white"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider">Selecionar Ícone</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { name: "Plane", icon: Plane },
                      { name: "Car", icon: Car },
                      { name: "Home", icon: Home },
                      { name: "Target", icon: Target }
                    ].map(ico => {
                      const SelectedIcon = ico.icon;
                      const isSelected = formIconName === ico.name;
                      return (
                        <button
                          key={ico.name}
                          type="button"
                          onClick={() => setFormIconName(ico.name as any)}
                          className={`p-3 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                            isSelected 
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" 
                              : "bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700"
                          }`}
                        >
                          <SelectedIcon className="w-5 h-5" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs tracking-wider shadow-lg shadow-indigo-600/30 transition-all mt-2 cursor-pointer"
                >
                  {modalType === "create" ? "CRIAR META" : "SALVAR ALTERAÇÕES"}
                </button>

              </form>
            )}

            {/* Modal Fazer Aporte */}
            {modalType === "aporte" && selectedGoal && (
              <form onSubmit={handleAporte} className="flex flex-col gap-4">
                <p className="text-xs font-semibold text-slate-300 leading-relaxed">
                  Fazer aporte financeiro na meta <strong className="text-white font-black">{selectedGoal.title}</strong>.
                </p>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider">Valor do Aporte (R$) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={selectedGoal.objetivo - selectedGoal.acumulado}
                    value={formAporteVal || ""}
                    onChange={(e) => setFormAporteVal(Number(e.target.value))}
                    placeholder="Ex: 500"
                    className="rounded-2xl bg-slate-800/80 border border-slate-700 px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-white"
                  />
                  <span className="text-[10px] text-slate-400 font-bold">
                    Limite máximo restante: {brl(selectedGoal.objetivo - selectedGoal.acumulado)}
                  </span>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs tracking-wider shadow-lg shadow-indigo-600/30 transition-all mt-2 cursor-pointer"
                >
                  CONFIRMAR APORTE
                </button>
              </form>
            )}

            {/* Modal de Histórico */}
            {modalType === "history" && selectedGoal && (
              <div className="flex flex-col gap-4">
                <p className="text-xs font-semibold text-slate-300">
                  Histórico de aportes para <strong className="text-white font-bold">{selectedGoal.title}</strong>:
                </p>

                <div className="max-h-52 overflow-y-auto pr-1 flex flex-col gap-2.5">
                  {selectedGoal.history.map((h) => (
                    <div 
                      key={h.id} 
                      className="bg-slate-800/70 border border-slate-700 rounded-2xl p-3.5 flex justify-between items-center"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-[11px] font-bold text-slate-300">{h.date}</span>
                      </div>
                      <span className="text-xs font-black text-emerald-400">{brl(h.amount)}</span>
                    </div>
                  ))}
                  {selectedGoal.history.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-6 font-semibold">
                      Nenhum aporte registrado nesta meta.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Modal de Exclusão */}
            {modalType === "delete" && selectedGoal && (
              <div className="flex flex-col gap-4 text-center">
                <p className="text-xs font-semibold text-slate-300 leading-relaxed">
                  Tem certeza que deseja excluir a meta <strong className="text-white font-bold">"{selectedGoal.title}"</strong>?<br/>
                  Esta ação é irreversível e removerá todos os dados de aportes associados.
                </p>

                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => setModalType(null)}
                    className="flex-1 py-3 rounded-2xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 font-extrabold text-xs tracking-wider transition-all cursor-pointer"
                  >
                    CANCELAR
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs tracking-wider shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
                  >
                    EXCLUIR
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Modal Comemorativo de Conquista de Metas (Gamificação) */}
      <GoalCelebrationModal
        isOpen={celebrationData.isOpen}
        onClose={() => setCelebrationData(prev => ({ ...prev, isOpen: false }))}
        goalTitle={celebrationData.goalTitle}
        milestonePct={celebrationData.milestonePct}
      />

    </div>
  );
}
