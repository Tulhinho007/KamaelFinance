"use client";

import React, { useState, useEffect } from "react";
import { getGoals, createGoalAction, updateGoalAction, deleteGoalAction, addAporteAction, updateAporteAction, deleteAporteAction, getWalletsAction, toggleGoalStatusAction } from "@/lib/actions";
import { usePeriod } from "@/components/period-context";
import { PeriodHeader } from "@/components/period-header";
import { GoalGamificationBadges } from "@/components/goal-gamification-badges";
import { GoalCelebrationModal } from "@/components/goal-celebration-modal";
import { useModal } from "@/components/ui/custom-dialog-provider";
import {
  Search, Plus, Plane, Car, Home, History, Sparkles, Target, X, Edit2, Trash2, Coins, Calendar, Wallet as WalletIcon, Clock, TrendingUp, CheckCircle2, AlertTriangle, ArrowUpRight, Trophy, RotateCcw
} from "lucide-react";

import { parseCurrencyInput } from "@/lib/constants";

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
  walletId?: string | null;
  walletTitle?: string | null;
  transactionId?: string | null;
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
  tipo?: "VISUAL" | "COFRINHO";
  isRealSaving?: boolean;
  status?: string;
  completedAt?: string | null;
  walletId?: string | null;
  walletTitle?: string | null;
  walletBreakdown?: { walletId: string; walletTitle: string; totalAmount: number }[];
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
  const { showAlert, showConfirm } = useModal();
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

  // Edição Inline de Aporte no Modal de Histórico
  const [editingAporteId, setEditingAporteId] = useState<string | null>(null);
  const [editAporteVal, setEditAporteVal] = useState<string | number>("");
  const [editAporteDate, setEditAporteDate] = useState("");
  const [editAporteWalletId, setEditAporteWalletId] = useState("");

  // Form Fields State
  const [formTitle, setFormTitle] = useState("");
  const [formDataInicio, setFormDataInicio] = useState("");
  const [formDataFim, setFormDataFim] = useState("");
  const [formObjetivo, setFormObjetivo] = useState<string | number>("");
  const [formAcumuladoInicial, setFormAcumuladoInicial] = useState<string | number>("");
  const [formIconName, setFormIconName] = useState<"Plane" | "Car" | "Home" | "Target">("Target");
  const [formWalletId, setFormWalletId] = useState("");
  const [formTipo, setFormTipo] = useState<"VISUAL" | "COFRINHO">("VISUAL");
  const [formAporteVal, setFormAporteVal] = useState<string | number>("");
  const [formAporteDate, setFormAporteDate] = useState("");
  const [formAporteWalletId, setFormAporteWalletId] = useState("");
  const [formMoveRealBalance, setFormMoveRealBalance] = useState<boolean>(true);

  // Busca de Metas
  const [searchQuery, setSearchQuery] = useState("");

  // --- CARREGAMENTO DO BANCO DE DADOS ---
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [goalsData, walletsData] = await Promise.all([getGoals(), getWalletsAction()]);
      setMetas(goalsData);
      setWallets(walletsData);

      // Atualiza selectedGoal em tempo real se o modal de histórico estiver aberto
      if (selectedGoal) {
        const updated = goalsData.find((g: any) => g.id.toString() === selectedGoal.id.toString());
        if (updated) {
          setSelectedGoal(updated as any);
        }
      }
    } catch (err) {
      console.error("Erro ao obter dados do banco:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Objetivos & Reservas | Kamael Finance";
    loadAllData();
  }, []);

  // Seletor de Abas (Metas Ativas vs Conquistas Batidas)
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");

  // Separação entre metas ativas e concluídas
  const activeMetas = metas.filter(m => m.status !== "COMPLETED" && m.pct < 100);
  const completedMetas = metas.filter(m => m.status === "COMPLETED" || m.pct >= 100);

  const currentTabMetas = activeTab === "active" ? activeMetas : completedMetas;
  const filteredMetas = currentTabMetas.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Valores Consolidados Dinâmicos calculados APENAS para as Metas Ativas
  const totalAcumulado = activeMetas.reduce((sum, m) => sum + m.acumulado, 0);
  const objetivoFinal  = activeMetas.reduce((sum, m) => sum + m.objetivo, 0);
  const faltaAportar   = Math.max(0, objetivoFinal - totalAcumulado);
  const globalPct      = objetivoFinal > 0 ? Math.min(100, Math.round((totalAcumulado / objetivoFinal) * 100)) : 0;
  const activeMetasCount = activeMetas.length;

  // Círculo Radial Progresso Global
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (globalPct / 100) * circumference;

  // --- Handlers de Ações ---

  const openCreateModal = () => {
    setFormTitle("");
    const todayStr = new Date().toISOString().split("T")[0];
    setFormDataInicio(todayStr);
    setFormDataFim("");
    setFormObjetivo("");
    setFormAcumuladoInicial("");
    setFormIconName("Target");
    setFormWalletId("");
    setFormTipo("VISUAL");
    setModalType("create");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const objNum = parseCurrencyInput(formObjetivo);
    const acumNum = parseCurrencyInput(formAcumuladoInicial);
    if (!formTitle || !formDataInicio || !formDataFim || objNum <= 0) {
      showAlert("Por favor, informe um valor objetivo válido maior que zero.", { variant: "warning" });
      return;
    }

    if (formTipo === "COFRINHO" && !formWalletId) {
      showAlert("Por favor, selecione uma conta bancária vinculada para o Cofrinho Real.", { variant: "warning" });
      return;
    }

    try {
      await createGoalAction(
        formTitle,
        formDataInicio,
        formDataFim,
        objNum,
        acumNum,
        formIconName,
        formWalletId || undefined,
        formTipo,
        formTipo === "COFRINHO"
      );
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
    setFormTipo(goal.tipo || (goal.isRealSaving ? "COFRINHO" : "VISUAL"));
    setModalType("edit");
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const objNum = parseCurrencyInput(formObjetivo);
    if (!selectedGoal || !formTitle || !formDataInicio || !formDataFim || objNum <= 0) {
      showAlert("Por favor, informe um valor objetivo válido maior que zero.", { variant: "warning" });
      return;
    }

    if (formTipo === "COFRINHO" && !formWalletId) {
      showAlert("Por favor, selecione uma conta bancária vinculada para o Cofrinho Real.", { variant: "warning" });
      return;
    }

    try {
      await updateGoalAction(
        selectedGoal.id.toString(),
        formTitle,
        formDataInicio,
        formDataFim,
        objNum,
        formIconName,
        formWalletId || undefined,
        formTipo,
        formTipo === "COFRINHO"
      );
      await loadAllData();
      setModalType(null);
    } catch (err) {
      console.error(err);
      showAlert("Erro ao editar meta no banco de dados.", { variant: "error" });
    }
  };

  const depositWallets = wallets.filter(
    (w) => w.walletType !== "CREDIT_CARD" && w.walletType !== "credit_card"
  );

  const openAporteModal = (goal: Goal) => {
    setSelectedGoal(goal);
    setFormAporteVal("");
    setFormAporteDate(new Date().toISOString().split("T")[0]);
    const validWallets = wallets.filter((w) => w.walletType !== "CREDIT_CARD" && w.walletType !== "credit_card");
    const defaultWId = (goal.walletId && validWallets.some(w => w.id === goal.walletId))
      ? goal.walletId
      : (validWallets.length > 0 ? validWallets[0].id : "");
    setFormAporteWalletId(defaultWId);
    const isCofrinho = goal.tipo === "COFRINHO" || !!goal.isRealSaving;
    setFormMoveRealBalance(isCofrinho || true);
    setModalType("aporte");
  };

  const handleAporte = async (e: React.FormEvent) => {
    e.preventDefault();
    const aporteNum = parseCurrencyInput(formAporteVal);
    if (!selectedGoal || aporteNum <= 0) {
      showAlert("Por favor, informe um valor de aporte válido maior que zero.", { variant: "warning" });
      return;
    }

    const isCofrinho = selectedGoal.tipo === "COFRINHO" || !!selectedGoal.isRealSaving;
    if ((isCofrinho || formMoveRealBalance) && !formAporteWalletId) {
      showAlert("Por favor, selecione a conta/banco vinculada para o aporte.", { variant: "warning" });
      return;
    }

    const oldPct = selectedGoal.pct;
    const newAcumulado = selectedGoal.acumulado + aporteNum;
    const newPct = selectedGoal.objetivo > 0 ? Math.min(100, Math.round((newAcumulado / selectedGoal.objetivo) * 100)) : 0;

    // Marcos avaliados em ordem decrescente (100% -> 75% -> 50% -> 25%) para capturar o maior marco alcançado
    const milestones = [100, 75, 50, 25];
    const crossedMilestone = milestones.find(m => oldPct < m && newPct >= m);

    try {
      await addAporteAction(
        selectedGoal.id.toString(),
        aporteNum,
        formAporteWalletId || undefined,
        formMoveRealBalance,
        formAporteDate || undefined
      );
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
    setEditingAporteId(null);
    setModalType("history");
  };

  const handleUpdateAporte = async (historyId: string) => {
    const amountNum = parseCurrencyInput(editAporteVal);
    if (amountNum <= 0) {
      showAlert("O valor do aporte deve ser maior que zero.", { variant: "warning" });
      return;
    }
    try {
      await updateAporteAction(historyId, amountNum, editAporteDate, editAporteWalletId);
      setEditingAporteId(null);
      await loadAllData();
      showAlert("Aporte atualizado com sucesso!", { variant: "success" });
    } catch (err) {
      console.error(err);
      showAlert("Erro ao atualizar aporte.", { variant: "error" });
    }
  };

  const handleDeleteAporte = async (historyId: string) => {
    const confirmed = await showConfirm(
      "Tem certeza de que deseja excluir este aporte? O total poupado e o progresso da meta serão recalculados automaticamente.",
      { title: "Excluir Aporte", variant: "warning" }
    );
    if (confirmed) {
      try {
        await deleteAporteAction(historyId);
        await loadAllData();
        showAlert("Aporte removido com sucesso!", { variant: "success" });
      } catch (err) {
        console.error(err);
        showAlert("Erro ao excluir aporte.", { variant: "error" });
      }
    }
  };

  const openDeleteModal = (goal: Goal) => {
    setSelectedGoal(goal);
    setModalType("delete");
  };

  const handleToggleGoalStatus = async (goalId: string, newStatus: "ACTIVE" | "COMPLETED") => {
    try {
      await toggleGoalStatusAction(goalId, newStatus);
      await loadAllData();
      showAlert(
        newStatus === "COMPLETED"
          ? "🏆 Parabéns! Meta movida para o seu Mural de Conquistas!"
          : "Meta reaberta com sucesso! Ela voltou para suas Metas Ativas.",
        { variant: "success" }
      );
    } catch (err) {
      console.error(err);
      showAlert("Erro ao alterar o status da meta.", { variant: "error" });
    }
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
        title="Objetivos & Reservas" 
        tagline="Sonhe alto e acompanhe o progresso de cada conquista financeira e cofrinho." 
        badge="Objetivos & Reservas" 
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
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 rounded-[32px] border border-indigo-500/30 p-6 md:p-8 shadow-[0_0_35px_rgba(99,102,241,0.18)] flex flex-col md:flex-row items-center gap-6 md:gap-10 relative overflow-hidden backdrop-blur-md">
        
        {/* Efeito Glow no Fundo */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Gráfico Radial de Progresso Global */}
        <div className="relative w-28 h-28 flex items-center justify-center bg-slate-900/90 rounded-2xl border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.2)] flex-shrink-0 z-10">
          <svg className="w-22 h-22 transform -rotate-90">
            <circle
              cx="44"
              cy="44"
              r={radius}
              className="stroke-slate-800 fill-none"
              strokeWidth="7"
            />
            <circle
              cx="44"
              cy="44"
              r={radius}
              className="stroke-indigo-400 fill-none transition-all duration-700"
              strokeWidth="7"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-lg font-black text-white leading-none drop-shadow-sm">{globalPct}%</span>
            <span className="text-[8px] font-extrabold text-indigo-300 uppercase tracking-widest mt-1">Global</span>
          </div>
        </div>

        {/* Informações Centrais & 3 KPIs Consolidados */}
        <div className="flex-1 flex flex-col justify-between items-center sm:items-start w-full gap-4 z-10">
          
          <div className="text-center sm:text-left w-full">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="rounded-full bg-indigo-950/60 border border-indigo-800/50 px-3 py-1 text-[10px] font-black tracking-wider text-indigo-300 uppercase shadow-xs">
                Visão Consolidada
              </span>
              <span className="text-[10px] font-black text-purple-300 bg-purple-950/60 border border-purple-800/50 px-3 py-1 rounded-full uppercase">
                {activeMetasCount} Meta{activeMetasCount !== 1 ? "s" : ""} Ativa{activeMetasCount !== 1 ? "s" : ""}
              </span>
              {completedMetas.length > 0 && (
                <span className="text-[10px] font-black text-emerald-300 bg-emerald-950/60 border border-emerald-800/50 px-3 py-1 rounded-full uppercase flex items-center gap-1 shadow-xs">
                  <Trophy className="w-3 h-3 text-emerald-400" />
                  {completedMetas.length} Conquista{completedMetas.length > 1 ? "s" : ""} Batida{completedMetas.length > 1 ? "s" : ""} 🎉
                </span>
              )}
            </div>
            
            <h2 className="text-2xl font-black text-white tracking-tight mt-2.5">Horizonte de Conquistas</h2>

            {/* 3 KPIs: Total Acumulado, Objetivo Final e Falta Aportar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 w-full bg-slate-950/70 p-4 rounded-2xl border border-white/10">
              
              {/* KPI 1 — Total Acumulado */}
              <div className="flex flex-col">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Acumulado</span>
                <span className="text-base font-black text-emerald-400 mt-1 block">{brl(totalAcumulado)}</span>
              </div>

              {/* KPI 2 — Objetivo Final */}
              <div className="flex flex-col sm:border-l sm:border-slate-800 sm:pl-4">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Objetivo Final</span>
                <span className="text-base font-black text-slate-100 mt-1 block">{brl(objetivoFinal)}</span>
              </div>

              {/* KPI 3 — Falta Aportar */}
              <div className="flex flex-col sm:border-l sm:border-slate-800 sm:pl-4">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Falta Aportar</span>
                <span className="text-base font-black text-amber-400 mt-1 block">{brl(faltaAportar)}</span>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* ── 4. SELETOR DE ABAS (METAS ATIVAS VS MURAL DE CONQUISTAS) ───────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("active")}
            className={`px-4.5 py-2.5 rounded-2xl text-xs font-black tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "active"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span>🎯 METAS ATIVAS</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${activeTab === "active" ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"}`}>
              {activeMetas.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("completed")}
            className={`px-4.5 py-2.5 rounded-2xl text-xs font-black tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "completed"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span>🏆 CONQUISTAS BATIDAS</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${activeTab === "completed" ? "bg-white/20 text-white" : "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"}`}>
              {completedMetas.length}
            </span>
          </button>
        </div>

        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          {activeTab === "active" ? `Objetivos em Andamento (${filteredMetas.length})` : `Mural de Conquistas Alcançadas (${filteredMetas.length})`}
        </span>
      </div>

      {/* ── 5. GRID DE OBJETIVOS / MURAL DE CONQUISTAS ──────────────────────── */}
      <section className="flex flex-col gap-4">
        
        {/* Lista de Metas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-1 md:col-span-3 text-center py-12 bg-white dark:bg-slate-900/80 rounded-[28px] border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 font-bold animate-pulse text-xs uppercase tracking-widest shadow-sm">
              Carregando metas do banco de dados...
            </div>
          ) : filteredMetas.length === 0 ? (
            <div className="col-span-1 md:col-span-3 text-center py-12 bg-white dark:bg-slate-900/80 rounded-[28px] border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider shadow-sm">
              {activeTab === "active" ? "Nenhuma meta em andamento no momento." : "Nenhuma conquista ou meta concluída registrada ainda."}
            </div>
          ) : (
            filteredMetas.map((meta) => {
              const IconComponent = ICON_MAP[meta.iconName] || Target;
              const iconStyle     = getIconBadgeStyle(meta.iconName, meta.title);
              const daysBadge     = getDaysRemainingBadge(meta.dataFim, meta.pct);
              const isCompleted   = activeTab === "completed" || meta.status === "COMPLETED" || meta.pct >= 100;
              
              return (
                <div 
                  key={meta.id} 
                  className={`rounded-[28px] p-6 flex flex-col justify-between transition-all duration-300 min-h-[340px] ${
                    isCompleted
                      ? "bg-white dark:bg-[#131B2E] border border-emerald-200 dark:border-emerald-800/40 shadow-sm hover:shadow-lg hover:border-emerald-300"
                      : "bg-white dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-md hover:shadow-lg dark:hover:shadow-xl hover:border-indigo-400/40 dark:hover:border-indigo-500/30 hover:scale-[1.01]"
                  }`}
                >
                  
                  {/* Cabeçalho do Card */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Container do Ícone Circular Translúcido com Glow */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isCompleted ? "bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]" : iconStyle}`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight truncate max-w-[130px]" title={meta.title}>
                          {meta.title}
                        </h3>
                        <p className="text-[9px] font-extrabold text-slate-500 dark:text-slate-300 block mt-0.5">
                          {formatDateDisplay(meta.dataInicio)} a {formatDateDisplay(meta.dataFim)}
                        </p>
                        <div className="mt-1 flex items-center gap-1">
                          {meta.tipo === "COFRINHO" || meta.isRealSaving ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8.5px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 tracking-tight">
                              <Coins className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                              Cofrinho Vinculado {meta.walletTitle ? `à ${meta.walletTitle}` : ""}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8.5px] font-bold bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 tracking-tight">
                              <Target className="w-2.5 h-2.5 text-slate-400" />
                              Meta de Planejamento
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Botões Rápidos (Concluir / Reabrir / Editar / Excluir / Porcentagem) */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isCompleted ? (
                        <button
                          onClick={() => handleToggleGoalStatus(meta.id.toString(), "ACTIVE")}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                          title="Reabrir Meta"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleGoalStatus(meta.id.toString(), "COMPLETED")}
                          className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                          title="Marcar como Concluída"
                        >
                          <Trophy className="w-3.5 h-3.5" />
                        </button>
                      )}
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
                      <span className={`text-sm font-black pl-1 ${isCompleted ? "text-emerald-600 dark:text-emerald-400" : "text-indigo-600 dark:text-indigo-400"}`}>
                        {isCompleted ? "100%" : `${meta.pct}%`}
                      </span>
                    </div>

                  </div>

                  {/* Badge Dinâmico / Selo de Celebração */}
                  <div className="mt-3 flex items-center justify-between">
                    {isCompleted ? (
                      <span className="px-3 py-1 rounded-full text-[9px] font-black bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 uppercase tracking-wider shadow-xs">
                        <Trophy className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Conquistada {meta.completedAt ? `em ${meta.completedAt}` : "100%"}</span>
                      </span>
                    ) : (
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black border uppercase tracking-wider ${daysBadge.style}`}>
                        {daysBadge.text}
                      </span>
                    )}

                    {(() => {
                      const breakdown = meta.walletBreakdown || [];
                      if (breakdown.length === 0 && !meta.walletTitle) return null;

                      const primaryTitle = breakdown.length > 0 ? breakdown[0].walletTitle : meta.walletTitle;
                      const extraCount = breakdown.length > 1 ? breakdown.length - 1 : 0;

                      return (
                        <div className="relative group/wallet inline-block">
                          <span className="flex items-center gap-1.5 text-[9px] font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-400/30 px-2.5 py-1 rounded-full cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-500/25 transition-all">
                            <WalletIcon className="w-3 h-3 shrink-0 text-indigo-600 dark:text-indigo-400" />
                            <span className="truncate max-w-[110px]">{primaryTitle}</span>
                            {extraCount > 0 && (
                              <span className="bg-indigo-200/80 dark:bg-indigo-900/80 text-indigo-900 dark:text-indigo-200 px-1.5 py-0.2 rounded-md text-[8.5px] font-black">
                                +{extraCount} {extraCount === 1 ? "conta" : "contas"}
                              </span>
                            )}
                          </span>

                          {/* Tooltip de Detalhamento Multi-Contas no Hover */}
                          {extraCount > 0 && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/wallet:flex flex-col gap-1.5 p-3 rounded-2xl bg-slate-900 text-white text-xs font-medium shadow-xl border border-slate-700 z-50 w-56 pointer-events-none">
                              <div className="text-[10px] font-black uppercase text-indigo-400 border-b border-slate-800 pb-1 mb-0.5 flex justify-between">
                                <span>Distribuição por Banco</span>
                                <span>Valor</span>
                              </div>
                              {breakdown.map((wb, idx) => {
                                const wbPct = meta.acumulado > 0 ? Math.round((wb.totalAmount / meta.acumulado) * 100) : 0;
                                return (
                                  <div key={idx} className="flex justify-between items-center text-[11px]">
                                    <span className="truncate font-semibold text-slate-200">{wb.walletTitle}</span>
                                    <span className="font-mono font-bold text-indigo-300 shrink-0 ml-2">
                                      {brl(wb.totalAmount)} ({wbPct}%)
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Selos de Gamificação / Marcos com Neon Glow (25%, 50%, 75%, 100%) */}
                  <div className="mt-3">
                    <GoalGamificationBadges pct={isCompleted ? 100 : meta.pct} />
                  </div>

                  {/* Previsão Realista / Selo de Sucesso */}
                  <div className="mt-3 text-[10px] font-medium leading-tight">
                    {isCompleted ? (
                      <span className="text-emerald-700 dark:text-emerald-400 font-extrabold inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Meta Alcançada com Sucesso! 🎉
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
                        className={`h-full rounded-full transition-all duration-700 ${
                          isCompleted
                            ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                            : "bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                        }`} 
                        style={{ width: `${isCompleted ? 100 : meta.pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Acumulado / Objetivo com Tipografia Clara de Alto Contraste */}
                  <div className="border-t border-slate-100 dark:border-slate-800 mt-3 pt-3 grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-wider block">Total Poupado</span>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">{brl(meta.acumulado)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-wider block">Objetivo Meta</span>
                      <span className="text-xs font-black text-slate-900 dark:text-slate-200 mt-0.5 block">{brl(meta.objetivo)}</span>
                    </div>
                  </div>

                  {/* Rodapé: Botões de Ação */}
                  <div className="flex items-center gap-2 mt-3">
                    {isCompleted ? (
                      <button 
                        onClick={() => handleToggleGoalStatus(meta.id.toString(), "ACTIVE")}
                        className="flex-1 py-2.5 text-xs font-black rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Reabrir Meta para continuar aportando"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>REABRIR META</span>
                      </button>
                    ) : (
                      <button 
                        onClick={() => openAporteModal(meta)}
                        className="flex-1 py-2.5 text-xs font-black rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-500 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/30 hover:scale-[1.02] border border-white/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Coins className="w-3.5 h-3.5 text-white" />
                        <span>FAZER APORTE</span>
                      </button>
                    )}
                    
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
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                {modalType === "create" && "Nova Meta Financeira"}
                {modalType === "edit" && "Editar Meta"}
                {modalType === "aporte" && "Fazer Aporte"}
                {modalType === "history" && "Histórico de Aportes"}
                {modalType === "delete" && "Excluir Meta"}
              </h3>
              <button 
                onClick={() => setModalType(null)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal de Criação / Edição */}
            {(modalType === "create" || modalType === "edit") && (
              <form onSubmit={modalType === "create" ? handleCreate : handleEdit} className="flex flex-col gap-4">
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider">Título da Meta *</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ex: Viagem Japão, Novo Computador..."
                    className="rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider">Data Início *</label>
                    <input
                      type="date"
                      required
                      value={formDataInicio}
                      onChange={(e) => setFormDataInicio(e.target.value)}
                      className="rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider">Data Fim *</label>
                    <input
                      type="date"
                      required
                      value={formDataFim}
                      onChange={(e) => setFormDataFim(e.target.value)}
                      className="rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider">Valor Objetivo (R$) *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={formObjetivo}
                    onChange={(e) => setFormObjetivo(e.target.value)}
                    placeholder="Ex: 15000 ou 15000,50"
                    className="rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Tipo de Meta: Planejamento vs Cofrinho Real */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider">Tipo da Meta *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormTipo("VISUAL")}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-center transition-all cursor-pointer ${
                        formTipo === "VISUAL"
                          ? "bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <Target className="w-4 h-4" />
                      <span className="text-[11px] font-bold leading-tight">Planejamento</span>
                      <span className="text-[9px] opacity-75 leading-none">Marcador visual</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormTipo("COFRINHO")}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-center transition-all cursor-pointer ${
                        formTipo === "COFRINHO"
                          ? "bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-black shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <Coins className="w-4 h-4" />
                      <span className="text-[11px] font-bold leading-tight">Cofrinho Real</span>
                      <span className="text-[9px] opacity-75 leading-none">Movimenta saldo real</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>{formTipo === "COFRINHO" ? "Conta Bancária Vinculada *" : "Vincular a Conta/Cofre (Opcional)"}</span>
                    {formTipo === "COFRINHO" && (
                      <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 lowercase bg-emerald-500/10 px-1.5 py-0.2 rounded">obrigatório</span>
                    )}
                  </label>
                  <select
                    required={formTipo === "COFRINHO"}
                    value={formWalletId}
                    onChange={(e) => setFormWalletId(e.target.value)}
                    className={`w-full truncate pr-10 rounded-xl bg-white dark:bg-slate-950 border px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 cursor-pointer ${
                      formTipo === "COFRINHO"
                        ? "border-emerald-500/40 focus:border-emerald-500 focus:ring-emerald-500"
                        : "border-slate-300 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-500"
                    }`}
                  >
                    <option value="">{formTipo === "COFRINHO" ? "Selecione a conta do cofrinho..." : "Nenhum cofre vinculado (Aportes manuais)"}</option>
                    {depositWallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.bankName || w.title} • Saldo: {brl(w.currentTotal)}
                      </option>
                    ))}
                  </select>
                  {formTipo === "COFRINHO" && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Esta conta será debitada quando forem feitos aportes reais neste cofrinho.
                    </span>
                  )}
                </div>

                {modalType === "create" && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider">Aporte Inicial (R$)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formAcumuladoInicial}
                      onChange={(e) => setFormAcumuladoInicial(e.target.value)}
                      placeholder="Ex: 1000 ou 1000,50 (Opcional)"
                      className="rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider">Selecionar Ícone</label>
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
                              : "bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
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
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Fazer aporte financeiro na meta
                    </p>
                    {selectedGoal.tipo === "COFRINHO" || selectedGoal.isRealSaving ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8.5px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        <Coins className="w-2.5 h-2.5 text-emerald-500" />
                        Cofrinho Real
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8.5px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        <Target className="w-2.5 h-2.5 text-slate-400" />
                        Planejamento
                      </span>
                    )}
                  </div>
                  <strong className="text-sm font-black text-slate-900 dark:text-white block">{selectedGoal.title}</strong>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider">
                    Conta Bancária Vinculada (Entrada) *
                  </label>
                  <select
                    required
                    value={formAporteWalletId}
                    onChange={(e) => setFormAporteWalletId(e.target.value)}
                    className="w-full truncate pr-10 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="">Selecione a conta bancária do cofrinho...</option>
                    {depositWallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.bankName || w.title} • Saldo: {brl(w.currentTotal)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider">Data do Aporte *</label>
                    <input
                      type="date"
                      required
                      value={formAporteDate}
                      onChange={(e) => setFormAporteDate(e.target.value)}
                      className="rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider">Valor do Aporte (R$) *</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      value={formAporteVal}
                      onChange={(e) => setFormAporteVal(e.target.value)}
                      placeholder="Ex: 50,00"
                      className="rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold -mt-2">
                  Limite restante: {brl(Math.max(0, selectedGoal.objetivo - selectedGoal.acumulado))}
                </span>

                {/* Opção de Movimentação Financeira Real */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                  <input
                    id="chk-move-real-balance"
                    type="checkbox"
                    checked={formMoveRealBalance}
                    onChange={(e) => setFormMoveRealBalance(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                  />
                  <label htmlFor="chk-move-real-balance" className="text-xs flex flex-col gap-0.5 cursor-pointer">
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      Movimentar saldo real da conta
                      {formMoveRealBalance && (
                        <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-1.5 py-0.2 rounded">Ativo</span>
                      )}
                    </span>
                    <span className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium leading-normal">
                      Registra uma receita/entrada no extrato da conta selecionada e credita o saldo real com a categoria Cofrinho.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs tracking-wider shadow-lg shadow-indigo-600/30 transition-all mt-1 cursor-pointer"
                >
                  CONFIRMAR APORTE
                </button>
              </form>
            )}

            {/* Modal de Histórico */}
            {modalType === "history" && selectedGoal && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Histórico de aportes para <strong className="text-slate-900 dark:text-white font-black">{selectedGoal.title}</strong>
                    </p>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                      Total Poupado: <span className="font-bold text-emerald-600 dark:text-emerald-400">{brl(selectedGoal.acumulado)}</span> / Objetivo: {brl(selectedGoal.objetivo)}
                    </span>
                  </div>
                  <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${selectedGoal.pct >= 100 ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"}`}>
                    {selectedGoal.pct}%
                  </span>
                </div>

                <div className="max-h-64 overflow-y-auto pr-1 flex flex-col gap-2.5">
                  {selectedGoal.history.map((h) => {
                    const isEditing = editingAporteId === h.id;

                    if (isEditing) {
                      return (
                        <div key={h.id} className="bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl p-3.5 flex flex-col gap-3 shadow-xs">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">Data</label>
                              <input
                                type="date"
                                value={editAporteDate}
                                onChange={(e) => setEditAporteDate(e.target.value)}
                                className="w-full text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">Valor (R$)</label>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={editAporteVal}
                                onChange={(e) => setEditAporteVal(e.target.value)}
                                className="w-full text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">Conta Bancária</label>
                            <select
                              value={editAporteWalletId}
                              onChange={(e) => setEditAporteWalletId(e.target.value)}
                              className="w-full truncate pr-10 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                            >
                              <option value="">Selecione a conta...</option>
                              {depositWallets.map((w) => (
                                <option key={w.id} value={w.id}>
                                  {w.bankName || w.title} • Saldo: {brl(w.currentTotal)}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex justify-end gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                            <button
                              type="button"
                              onClick={() => setEditingAporteId(null)}
                              className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateAporte(h.id)}
                              className="px-3.5 py-1.5 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-xs transition-colors cursor-pointer"
                            >
                              Salvar
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div 
                        key={h.id} 
                        className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 flex justify-between items-center group transition-colors hover:border-slate-300 dark:hover:border-slate-600"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{h.date}</span>
                          {h.walletTitle && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800/80">
                              <WalletIcon className="w-2.5 h-2.5 text-indigo-500" />
                              {h.walletTitle}
                            </span>
                          )}
                          {h.transactionId && (
                            <span className="inline-flex items-center gap-0.5 text-[8.5px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20" title="Movimentou saldo real da conta">
                              Débito Real
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-tnum">{brl(h.amount)}</span>
                          
                          {/* Ações por Linha: Editar & Excluir */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAporteId(h.id);
                                setEditAporteVal(h.amount.toString());
                                setEditAporteDate((h as any).rawDate || "");
                                setEditAporteWalletId(h.walletId || "");
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
                              title="Editar Aporte"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAporte(h.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Excluir Aporte"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {selectedGoal.history.length === 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-6 font-semibold">
                      Nenhum aporte registrado nesta meta.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Modal de Exclusão */}
            {modalType === "delete" && selectedGoal && (
              <div className="flex flex-col gap-4 text-center">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
                  Tem certeza que deseja excluir a meta <strong className="text-slate-900 dark:text-white font-bold">"{selectedGoal.title}"</strong>?<br/>
                  Esta ação é irreversível e removerá todos os dados de aportes associados.
                </p>

                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => setModalType(null)}
                    className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs tracking-wider transition-all cursor-pointer"
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
