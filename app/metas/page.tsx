"use client";

import React, { useState, useEffect } from "react";
import { getGoals, createGoalAction, updateGoalAction, deleteGoalAction, addAporteAction, getWalletsAction } from "@/lib/actions";
import { usePeriod } from "@/components/period-context";
import { PeriodHeader } from "@/components/period-header";
import { GoalGamificationBadges } from "@/components/goal-gamification-badges";
import { GoalCelebrationModal } from "@/components/goal-celebration-modal";
import {
  Search, Bell, Moon, Sun, Menu, Plus, Plane, Car,
  Home, History, Sparkles, Target, X, Edit2, Trash2, Coins, Calendar, Wallet as WalletIcon, Clock, TrendingUp, CheckCircle2, AlertTriangle
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

export default function MetasPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [metas, setMetas] = useState<Goal[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Controle de Celebracao e Badges
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

  // Busca e Filtro de Metas
  const [searchQuery, setSearchQuery] = useState("");

  // --- CARREGAMENTO DO BANCO DE DADOS ---
  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([getGoals(), getWalletsAction()])
      .then(([goalsData, walletsData]) => {
        if (active) {
          setMetas(goalsData);
          setWallets(walletsData);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error("Erro ao obter dados do banco:", err);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredMetas = metas.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Valores Consolidados Dinâmicos
  const totalAcumulado = metas.reduce((sum, m) => sum + m.acumulado, 0);
  const objetivoFinal = metas.reduce((sum, m) => sum + m.objetivo, 0);
  const globalPct = objetivoFinal > 0 ? Math.min(100, Math.round((totalAcumulado / objetivoFinal) * 100)) : 0;
  const activeMetasCount = metas.length;

  // Círculo Radial Progresso
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (globalPct / 100) * circumference;

  // --- Handlers de Ações ---

  const openCreateModal = () => {
    setFormTitle("");
    const todayStr = new Date().toISOString().split("T")[0]; // "AAAA-MM-DD"
    setFormDataInicio(todayStr); // Data de hoje sugerida por padrão
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
      const freshData = await getGoals();
      setMetas(freshData);
      setModalType(null);
    } catch (err) {
      console.error(err);
      alert("Erro ao criar meta no banco de dados.");
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
      const freshData = await getGoals();
      setMetas(freshData);
      setModalType(null);
    } catch (err) {
      console.error(err);
      alert("Erro ao editar meta no banco de dados.");
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

    // Checa se cruzou algum marco de 25%, 50%, 75% ou 100%
    const milestones = [25, 50, 75, 100];
    const crossedMilestone = milestones.find(m => oldPct < m && newPct >= m);

    try {
      await addAporteAction(selectedGoal.id.toString(), formAporteVal);
      const freshData = await getGoals();
      setMetas(freshData);
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
      alert("Erro ao registrar aporte no banco de dados.");
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
      alert("Erro ao excluir meta do banco de dados.");
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto flex flex-col gap-8 relative select-none">
      
      {/* 1. TOP BAR INTEGRADO (Header global com seletor de período) */}
      <PeriodHeader 
        title="Minhas Metas" 
        tagline="Sonhe alto, planeje com tecnologia de elite." 
        badge="Metas" 
      />

      {/* 2. BUSCA LOCAL E BOTÃO NOVA META */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Busca por Palavra-chave */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar metas..."
            className="pl-11 pr-4 py-2.5 text-xs font-medium bg-white border border-white/80 rounded-full shadow-[0_5px_15px_rgba(0,0,0,0.01)] text-slate-700 w-48 sm:w-64 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all placeholder-slate-400"
          />
        </div>

        <button 
          onClick={openCreateModal}
          className="bg-white border border-indigo-100 hover:bg-indigo-50/50 text-indigo-600 px-5 py-3 rounded-2xl shadow-[0_10px_20px_rgba(99,102,241,0.05)] hover:shadow-[0_12px_22px_rgba(99,102,241,0.08)] transition-all font-extrabold text-xs tracking-wider flex items-center justify-center gap-1.5 self-start sm:self-auto border-white/80"
        >
          <Plus className="w-4.5 h-4.5 text-indigo-600" />
          <span>NOVA META</span>
        </button>
      </div>

      {/* 3. STATUS CONSOLIDADO */}
      <div className="bg-white rounded-[28px] border border-white/80 p-6 md:p-8 shadow-[0_15px_35px_rgba(0,0,0,0.03)] flex flex-col md:flex-row items-center gap-6 md:gap-10">
        
        {/* Gráfico Radial */}
        <div className="relative w-24 h-24 flex items-center justify-center bg-slate-50 rounded-2xl border border-slate-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)] flex-shrink-0">
          <svg className="w-20 h-20 transform -rotate-90">
            <circle
              cx="40"
              cy="40"
              r={radius}
              className="stroke-slate-100 fill-none"
              strokeWidth="6.5"
            />
            <circle
              cx="40"
              cy="40"
              r={radius}
              className="stroke-indigo-600 fill-none transition-all duration-500"
              strokeWidth="6.5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-base font-black text-slate-800 leading-none">{globalPct}%</span>
            <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest mt-1">Global</span>
          </div>
        </div>

        {/* Informações Centrais */}
        <div className="flex-1 flex flex-col sm:flex-row justify-between items-center sm:items-start md:items-center w-full gap-4">
          
          <div className="text-center sm:text-left">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              STATUS CONSOLIDADO
            </span>
            <h2 className="text-xl font-black text-slate-800 mt-2.5">Horizonte de Conquistas</h2>
            
            <div className="flex flex-wrap gap-x-6 gap-y-1.5 mt-3 justify-center sm:justify-start">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Total Acumulado</span>
                <span className="text-sm font-extrabold text-emerald-500 mt-0.5 block">{brl(totalAcumulado)}</span>
              </div>
              <div className="sm:border-l sm:border-slate-100 sm:pl-6">
                <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Objetivo Final</span>
                <span className="text-sm font-extrabold text-slate-400 mt-0.5 block">{brl(objetivoFinal)}</span>
              </div>
            </div>
          </div>

          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-4 py-2 rounded-full shadow-[inset_0_2px_4px_rgba(99,102,241,0.01)] flex-shrink-0">
            {activeMetasCount} METAS ATIVAS
          </span>

        </div>

      </div>

      {/* 4. GRID DE OBJETIVOS ESTRATÉGICOS */}
      <section className="flex flex-col gap-4">
        
        <h2 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
          Objetivos Estratégicos
        </h2>

        {/* Lista de Metas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-1 md:col-span-3 text-center py-12 bg-white rounded-[28px] border border-white/80 text-indigo-600 font-bold animate-pulse text-xs uppercase tracking-widest shadow-[0_10px_30px_rgba(0,0,0,0.03)]">
              Carregando metas do banco...
            </div>
          ) : filteredMetas.length === 0 ? (
            <div className="col-span-1 md:col-span-3 text-center py-12 bg-white rounded-[28px] border border-white/80 text-slate-400 text-xs font-semibold uppercase tracking-wider shadow-[0_10px_30px_rgba(0,0,0,0.03)]">
              Nenhuma meta financeira cadastrada.
            </div>
          ) : (
            filteredMetas.map((meta) => {
              const IconComponent = ICON_MAP[meta.iconName] || Target;
              
              return (
                <div 
                  key={meta.id} 
                  className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300 min-h-[320px]"
                >
                  
                  {/* Cabeçalho */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-indigo-600 dark:text-indigo-400">
                        <IconComponent className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h3 className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-tight truncate max-w-[130px]">{meta.title}</h3>
                        <span className="text-[9px] font-bold text-slate-400 block mt-0.5">{formatDateDisplay(meta.dataInicio)} a {formatDateDisplay(meta.dataFim)}</span>
                      </div>
                    </div>

                    {/* Ações Rápidas da Meta */}
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => openEditModal(meta)}
                        className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => openDeleteModal(meta)}
                        className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 pl-1">{meta.pct}%</span>
                    </div>

                  </div>

                  {/* Selos de Gamificação / Conquistas */}
                  <div className="mt-2.5">
                    <GoalGamificationBadges pct={meta.pct} />
                  </div>

                  {/* Vínculo com Cofre/Conta se houver */}
                  {meta.walletTitle && (
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-xl w-fit">
                      <WalletIcon className="w-3 h-3" />
                      <span>Cofre Vinculado: {meta.walletTitle}</span>
                    </div>
                  )}

                  {/* Previsão Realista de Conclusão */}
                  <div className="mt-2 text-[10px] font-medium leading-tight">
                    {meta.paceStatus === "COMPLETED" ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Meta 100% Concluída!
                      </span>
                    ) : meta.paceStatus === "ADVANCED" ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold inline-flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> Nesse ritmo (R$ {Math.round(meta.mediaAporteMensal || 0)}/mês), você alcançará em {meta.estimatedDateStr} (Adiantado)!
                      </span>
                    ) : meta.paceStatus === "BEHIND" ? (
                      <span className="text-amber-600 dark:text-amber-400 font-bold inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" /> No ritmo atual (R$ {Math.round(meta.mediaAporteMensal || 0)}/mês), a conclusão estimada é {meta.estimatedDateStr}.
                      </span>
                    ) : (
                      <span className="text-slate-400 font-medium inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {meta.estimatedDateStr}
                      </span>
                    )}
                  </div>

                  {/* Barra de Progresso */}
                  <div className="mt-2">
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-100 dark:border-slate-800">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500" 
                        style={{ width: `${meta.pct}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Acumulado / Objetivo */}
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3 grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Acumulado</span>
                      <span className="text-xs font-black text-slate-800 dark:text-white mt-0.5 block">{brl(meta.acumulado)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Objetivo</span>
                      <span className="text-xs font-black text-slate-400 mt-0.5 block">{brl(meta.objetivo)}</span>
                    </div>
                  </div>

                  {/* Rodapé: Aporte e Histórico */}
                  <div className="flex items-center gap-2 mt-2">
                    <button 
                      onClick={() => openAporteModal(meta)}
                      className="flex-1 py-2 text-[10px] font-extrabold rounded-xl bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100/70 border border-indigo-100/50 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>FAZER APORTE</span>
                    </button>
                    
                    <button 
                      onClick={() => openHistoryModal(meta)}
                      className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:bg-slate-100 text-slate-400 transition-colors rounded-xl cursor-pointer"
                      title="Histórico de Aportes"
                    >
                      <History className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>
              );
            })
          )}

        </div>

      </section>

      {/* --- MODAIS INTERATIVOS (Soft UI Glass) --- */}

      {modalType && (
        <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          
          {/* Modal Container */}
          <div className="bg-white/95 backdrop-blur-md rounded-[28px] border border-white/80 p-6 shadow-2xl max-w-sm w-full flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header do Modal */}
            <div className="flex justify-between items-center pb-2 border-b border-slate-100/50">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                {modalType === "create" && "Nova Meta Financeira"}
                {modalType === "edit" && "Editar Meta"}
                {modalType === "aporte" && "Fazer Aporte"}
                {modalType === "history" && "Histórico de Aportes"}
                {modalType === "delete" && "Excluir Meta"}
              </h3>
              <button 
                onClick={() => setModalType(null)}
                className="p-1 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal de Criação / Edição */}
            {(modalType === "create" || modalType === "edit") && (
              <form onSubmit={modalType === "create" ? handleCreate : handleEdit} className="flex flex-col gap-4">
                
                {/* Título */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Título da Meta</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ex: Viagem Japão, Novo Computador..."
                    className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-100 text-slate-700 placeholder-slate-400"
                  />
                </div>

                {/* Data Início e Fim (Calendários) */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data Início</label>
                    <input
                      type="date"
                      required
                      value={formDataInicio}
                      onChange={(e) => setFormDataInicio(e.target.value)}
                      className="rounded-2xl bg-slate-50 border border-slate-100 px-3.5 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-100 text-slate-700"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data Fim</label>
                    <input
                      type="date"
                      required
                      value={formDataFim}
                      onChange={(e) => setFormDataFim(e.target.value)}
                      className="rounded-2xl bg-slate-50 border border-slate-100 px-3.5 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-100 text-slate-700"
                    />
                  </div>
                </div>

                {/* Valor Objetivo */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valor Objetivo (R$)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formObjetivo || ""}
                    onChange={(e) => setFormObjetivo(Number(e.target.value))}
                    placeholder="Ex: 15000"
                    className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-100 text-slate-700"
                  />
                </div>

                {/* Vínculo com Conta / Cofre */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vincular a Conta/Cofre (Opcional)</label>
                  <select
                    value={formWalletId}
                    onChange={(e) => setFormWalletId(e.target.value)}
                    className="rounded-2xl bg-slate-50 border border-slate-100 px-3.5 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-100 text-slate-700 cursor-pointer"
                  >
                    <option value="">Nenhum cofre vinculado (Aportes manuais)</option>
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.title} ({w.walletType}) - Saldo: {brl(w.currentTotal)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Aporte Inicial (Só na Criação) */}
                {modalType === "create" && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aporte Inicial (R$)</label>
                    <input
                      type="number"
                      min="0"
                      value={formAcumuladoInicial || ""}
                      onChange={(e) => setFormAcumuladoInicial(Number(e.target.value))}
                      placeholder="Ex: 1000 (Opcional)"
                      className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-100 text-slate-700"
                    />
                  </div>
                )}

                {/* Seleção do Ícone */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Selecionar Ícone</label>
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
                          className={`p-3 rounded-2xl flex items-center justify-center transition-all ${
                            isSelected 
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" 
                              : "bg-slate-50 border border-slate-100 text-slate-400 hover:bg-slate-100/50"
                          }`}
                        >
                          <SelectedIcon className="w-5 h-5" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Ações */}
                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider shadow-lg shadow-indigo-600/25 transition-all mt-2"
                >
                  {modalType === "create" ? "CRIAR META" : "SALVAR ALTERAÇÕES"}
                </button>

              </form>
            )}

            {/* Modal Fazer Aporte */}
            {modalType === "aporte" && selectedGoal && (
              <form onSubmit={handleAporte} className="flex flex-col gap-4">
                <p className="text-xs font-semibold text-slate-500">
                  Fazer aporte financeiro na meta <strong className="text-slate-700 font-bold">{selectedGoal.title}</strong>.
                </p>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valor do Aporte (R$)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={selectedGoal.objetivo - selectedGoal.acumulado}
                    value={formAporteVal || ""}
                    onChange={(e) => setFormAporteVal(Number(e.target.value))}
                    placeholder="Ex: 500"
                    className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-100 text-slate-700"
                  />
                  <span className="text-[10px] text-slate-400 font-bold">
                    Limite máximo permitido: {brl(selectedGoal.objetivo - selectedGoal.acumulado)}
                  </span>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider shadow-lg shadow-indigo-600/25 transition-all mt-2"
                >
                  CONFIRMAR APORTE
                </button>
              </form>
            )}

            {/* Modal de Histórico */}
            {modalType === "history" && selectedGoal && (
              <div className="flex flex-col gap-4">
                <p className="text-xs font-semibold text-slate-500">
                  Lista de aportes efetuados para <strong className="text-slate-700 font-bold">{selectedGoal.title}</strong>.
                </p>

                <div className="max-h-48 overflow-y-auto pr-1 flex flex-col gap-2.5">
                  {selectedGoal.history.map((h) => (
                    <div 
                      key={h.id} 
                      className="bg-slate-50 border border-slate-100/80 rounded-2xl p-3.5 flex justify-between items-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)]"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="text-[11px] font-bold text-slate-500">{h.date}</span>
                      </div>
                      <span className="text-xs font-black text-slate-800">{brl(h.amount)}</span>
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
                <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                  Tem certeza que deseja excluir a meta <strong className="text-slate-800 font-bold">"{selectedGoal.title}"</strong>?<br/>
                  Esta ação é irreversível e removerá todos os históricos de aportes associados.
                </p>

                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => setModalType(null)}
                    className="flex-1 py-3 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100 hover:text-slate-700 text-slate-500 font-extrabold text-xs tracking-wider transition-all"
                  >
                    CANCELAR
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs tracking-wider shadow-lg shadow-rose-500/20 transition-all"
                  >
                    CONFIRMAR EXCLUSÃO
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


