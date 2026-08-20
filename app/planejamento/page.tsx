"use client";

import React, { useState, useEffect } from "react";
import {
  Plane,
  Calendar,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Circle,
  ExternalLink,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  DollarSign,
  FileText,
  Save,
  Check,
  Loader2,
  ChevronDown,
  Clock,
  X
} from "lucide-react";
import {
  getEventProjects,
  createEventProjectAction,
  updateEventProjectAction,
  deleteEventProjectAction,
  createEventItemAction,
  updateEventItemAction,
  deleteEventItemAction,
  toggleItemPaidAction
} from "@/lib/planning-actions";
import { ConvertToExpenseModal } from "@/components/convert-to-expense-modal";

interface EventItem {
  id: string;
  description: string;
  minAmount: number | null;
  maxAmount: number;
  paidAmount: number;
  isPaid: boolean;
  notes: string;
  transactionId: string | null;
}

interface EventProject {
  id: string;
  title: string;
  dateStr: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
  notes: string;
  items: EventItem[];
}

export default function PlanningPage() {
  const [projects, setProjects] = useState<EventProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Estados de edição do projeto
  const [editTitle, setEditTitle] = useState("");
  const [editStartDate, setEditStartDate] = useState<string>("");
  const [editEndDate, setEditEndDate] = useState<string>("");
  const [editStatus, setEditStatus] = useState("Em Planejamento");
  const [editNotes, setEditNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSavedSuccess, setNotesSavedSuccess] = useState(false);

  // Modal de Novo Projeto
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectStartDate, setNewProjectStartDate] = useState("");
  const [newProjectEndDate, setNewProjectEndDate] = useState("");
  const [newProjectStatus, setNewProjectStatus] = useState("Em Planejamento");

  // Novo Item Form State
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemMin, setNewItemMin] = useState<number | "">("");
  const [newItemMax, setNewItemMax] = useState<number | "">("");
  const [newItemNotes, setNewItemNotes] = useState("");
  const [isAddingItem, setIsAddingItem] = useState(false);

  // Edição de Item Inline (para Descrição e Notas)
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemDesc, setEditItemDesc] = useState("");
  const [editItemNotes, setEditItemNotes] = useState("");

  // Modal de Conversão em Despesa
  const [convertModalItem, setConvertModalItem] = useState<EventItem | null>(null);

  // Carrega projetos
  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getEventProjects();
      setProjects(data);
      if (data.length > 0) {
        const current = data.find((p: EventProject) => p.id === selectedProjectId) || data[0];
        setSelectedProjectId(current.id);
        setEditTitle(current.title);
        setEditStartDate(current.startDate || "");
        setEditEndDate(current.endDate || "");
        setEditStatus(current.status);
        setEditNotes(current.notes);
      }
    } catch (error) {
      console.error("Erro ao carregar projetos de planejamento:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeProject = projects.find((p: EventProject) => p.id === selectedProjectId) || projects[0];

  // Cálculo da Duração da Viagem em Dias
  const calculateDurationInDays = (startStr?: string | null, endStr?: string | null) => {
    if (!startStr || !endStr) return null;
    const s = new Date(startStr);
    const e = new Date(endStr);
    const diffTime = e.getTime() - s.getTime();
    if (isNaN(diffTime) || diffTime < 0) return null;
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return days;
  };

  const tripDays = calculateDurationInDays(editStartDate, editEndDate);

  // Troca de projeto selecionado
  const handleSelectProject = (projId: string) => {
    setSelectedProjectId(projId);
    const proj = projects.find((p: EventProject) => p.id === projId);
    if (proj) {
      setEditTitle(proj.title);
      setEditStartDate(proj.startDate || "");
      setEditEndDate(proj.endDate || "");
      setEditStatus(proj.status);
      setEditNotes(proj.notes);
    }
  };

  // Criar Projeto
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectTitle.trim()) return;

    try {
      let dateRangeStr = "";
      if (newProjectStartDate && newProjectEndDate) {
        const sParts = newProjectStartDate.split("-");
        const eParts = newProjectEndDate.split("-");
        dateRangeStr = `${sParts[2]}/${sParts[1]}/${sParts[0]} a ${eParts[2]}/${eParts[1]}/${eParts[0]}`;
      }

      const created = await createEventProjectAction({
        title: newProjectTitle.trim(),
        startDate: newProjectStartDate || null,
        endDate: newProjectEndDate || null,
        dateStr: dateRangeStr,
        status: newProjectStatus,
      });

      setNewProjectTitle("");
      setNewProjectStartDate("");
      setNewProjectEndDate("");
      setIsNewProjectModalOpen(false);
      await loadData();
      setSelectedProjectId(created.id);
    } catch (err) {
      console.error(err);
      alert("Erro ao criar projeto.");
    }
  };

  // Atualizar cabeçalho do projeto
  const handleUpdateProjectHeader = async (
    field: "title" | "startDate" | "endDate" | "status",
    value: string | null
  ) => {
    if (!activeProject) return;
    try {
      let updatedFields: any = { [field]: value };
      
      const nextStart = field === "startDate" ? value : editStartDate;
      const nextEnd = field === "endDate" ? value : editEndDate;

      if (nextStart && nextEnd) {
        const sParts = nextStart.split("-");
        const eParts = nextEnd.split("-");
        updatedFields.dateStr = `${sParts[2]}/${sParts[1]}/${sParts[0]} a ${eParts[2]}/${eParts[1]}/${eParts[0]}`;
      }

      await updateEventProjectAction(activeProject.id, updatedFields);
      setProjects(prev =>
        prev.map(p => (p.id === activeProject.id ? { ...p, ...updatedFields } : p))
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Excluir Projeto
  const handleDeleteProject = async () => {
    if (!activeProject) return;
    if (!confirm(`Tem certeza que deseja excluir o projeto "${activeProject.title}"?`)) return;

    try {
      await deleteEventProjectAction(activeProject.id);
      setSelectedProjectId("");
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir projeto.");
    }
  };

  // Adicionar Item
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !newItemDesc.trim() || !newItemMax) return;

    setIsAddingItem(true);
    try {
      await createEventItemAction(activeProject.id, {
        description: newItemDesc.trim(),
        minAmount: newItemMin === "" ? null : Number(newItemMin),
        maxAmount: Number(newItemMax),
        notes: newItemNotes.trim(),
      });

      setNewItemDesc("");
      setNewItemMin("");
      setNewItemMax("");
      setNewItemNotes("");
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Erro ao adicionar item.");
    } finally {
      setIsAddingItem(false);
    }
  };

  // Alternar Status de Pago (Checkbox)
  // Nota: ao desmarcar, o paidAmount é PRESERVADO (não zerado).
  const handleTogglePaid = async (item: EventItem) => {
    const newIsPaid = !item.isPaid;
    // Atualização otimista local: só altera isPaid, preserva paidAmount
    setProjects(prev =>
      prev.map((p: EventProject) => {
        if (p.id !== activeProject?.id) return p;
        return {
          ...p,
          items: p.items.map((i: EventItem) =>
            i.id === item.id ? { ...i, isPaid: newIsPaid } : i
          )
        };
      })
    );
    try {
      await updateEventItemAction(item.id, { isPaid: newIsPaid });
    } catch (err) {
      console.error(err);
      // Reverte em caso de erro
      await loadData();
    }
  };

  // ATUALIZAÇÃO DIRETA DOS INPUTS DE VALOR NA TABELA
  // Nota: alterar o paidAmount NÃO altera isPaid automaticamente.
  // O checkbox de "Pago" é controlado separadamente pelo handleTogglePaid.
  const handleItemValueChange = async (
    itemId: string,
    field: "minAmount" | "maxAmount" | "paidAmount",
    valueStr: string
  ) => {
    const numericVal = valueStr === "" ? 0 : Number(valueStr);

    // Atualização otimista no estado local (sem alterar isPaid)
    setProjects(prev =>
      prev.map((p: EventProject) => {
        if (p.id !== activeProject?.id) return p;
        return {
          ...p,
          items: p.items.map((i: EventItem) => {
            if (i.id !== itemId) return i;
            return { ...i, [field]: field === "minAmount" && valueStr === "" ? null : numericVal };
          })
        };
      })
    );

    // Persistência no banco (sem alterar isPaid)
    try {
      await updateEventItemAction(itemId, {
        [field]: field === "minAmount" && valueStr === "" ? null : numericVal,
      });
    } catch (err) {
      console.error("Erro ao atualizar valor do item:", err);
    }
  };

  // Iniciar Edição de Descrição e Notas
  const startEditingItem = (item: EventItem) => {
    setEditingItemId(item.id);
    setEditItemDesc(item.description);
    setEditItemNotes(item.notes);
  };

  // Salvar Edição do Item
  const handleSaveItemEdit = async (itemId: string) => {
    try {
      await updateEventItemAction(itemId, {
        description: editItemDesc.trim(),
        notes: editItemNotes.trim(),
      });
      setEditingItemId(null);
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar alterações no item.");
    }
  };

  // Excluir Item
  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Deseja remover este item do planejamento?")) return;
    try {
      await deleteEventItemAction(itemId);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Salvar Bloco de Notas Integrado
  const handleSaveNotes = async () => {
    if (!activeProject) return;
    setNotesSaving(true);
    try {
      await updateEventProjectAction(activeProject.id, { notes: editNotes });
      setNotesSavedSuccess(true);
      setTimeout(() => setNotesSavedSuccess(false), 2500);
      setProjects(prev =>
        prev.map(p => (p.id === activeProject.id ? { ...p, notes: editNotes } : p))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setNotesSaving(false);
    }
  };

  // --- REAJUSTE DE REGRAS DE NEGÓCIO E CÁLCULOS AUTOMÁTICOS ---
  const items = activeProject?.items || [];
  
  // Cenário Otimista (Total Mínimo): Soma dos menores valores dos itens
  const totalMinimoOtimista = items.reduce(
    (sum, i) => sum + (i.minAmount !== null && i.minAmount > 0 ? i.minAmount : i.maxAmount),
    0
  );

  // Cenário Realista / Pessimista (Total Máximo): Soma dos maiores valores estimados de TODOS os itens
  const totalMaximoRealista = items.reduce((sum, i) => sum + i.maxAmount, 0);

  // CARD 1: "TOTAL JÁ PAGO" (Azul/Índigo) - Soma da coluna Valor a Pagar / Pago dos itens pagos
  const totalJaPagoReal = items
    .filter((i: EventItem) => i.isPaid)
    .reduce((sum, i) => sum + (i.paidAmount > 0 ? i.paidAmount : i.maxAmount), 0);

  // CARD 2: "RESTANTE A PAGAR" (Vermelho/Rose) - Soma dos itens PENDENTES com prioridade (Valor a Pagar ou Valor Máximo de contingência)
  const restanteAPagarEstimado = items
    .filter((i: EventItem) => !i.isPaid)
    .reduce((sum, i) => {
      const pendingVal = (i.paidAmount !== null && i.paidAmount > 0) ? i.paidAmount : i.maxAmount;
      return sum + pendingVal;
    }, 0);

  if (loading && projects.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Carregando planejamento de viagens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm">
            <Plane className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Planejamento de Viagens & Eventos
              </h1>
              <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 rounded-full">
                Orçamentos Futuros
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Simule cenários de custos, organize itens da viagem e converta em despesas reais.
            </p>
          </div>
        </div>

        {/* Seleção de Projetos e Novo Projeto */}
        <div className="flex items-center gap-3">
          <div className="relative min-w-[200px]">
            <select
              value={selectedProjectId}
              onChange={e => handleSelectProject(e.target.value)}
              className="w-full appearance-none rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-2.5 pr-8 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  {p.title} ({p.status})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
          </div>

          <button
            onClick={() => setIsNewProjectModalOpen(true)}
            className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Projeto</span>
          </button>
        </div>
      </div>

      {/* DADOS DO PROJETO ATIVO */}
      {activeProject && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-6 shadow-sm">
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            
            {/* Título & Status */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  onBlur={e => handleUpdateProjectHeader("title", e.target.value)}
                  placeholder="Nome do Projeto / Viagem"
                  className="text-lg sm:text-xl font-black bg-transparent text-slate-900 dark:text-slate-100 border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:outline-none transition-colors px-1 py-0.5 rounded"
                />

                {/* Badge de Status */}
                <select
                  value={editStatus}
                  onChange={e => {
                    setEditStatus(e.target.value);
                    handleUpdateProjectHeader("status", e.target.value);
                  }}
                  className={`text-xs font-extrabold px-3 py-1 rounded-full border cursor-pointer focus:outline-none transition-all ${
                    editStatus === "Confirmado"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      : editStatus === "Concluído"
                      ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30"
                      : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30"
                  }`}
                >
                  <option value="Em Planejamento" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Em Planejamento</option>
                  <option value="Confirmado" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Confirmado</option>
                  <option value="Concluído" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Concluído</option>
                </select>
              </div>

              {/* SELETOR DE PERÍODO (DATE RANGE PICKER) E DURAÇÃO */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <Calendar className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                  <span className="font-bold">Início:</span>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={e => {
                      setEditStartDate(e.target.value);
                      handleUpdateProjectHeader("startDate", e.target.value);
                    }}
                    className="bg-transparent border-none text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none [color-scheme:light] dark:[color-scheme:dark]"
                  />
                  <span className="font-bold mx-1">até</span>
                  <span className="font-bold">Fim:</span>
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={e => {
                      setEditEndDate(e.target.value);
                      handleUpdateProjectHeader("endDate", e.target.value);
                    }}
                    className="bg-transparent border-none text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>

                {/* Exibição da Duração Calculada */}
                {tripDays !== null && tripDays > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-extrabold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Duração: {tripDays} {tripDays === 1 ? "dia" : "dias"}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Ações do Projeto */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleDeleteProject}
                className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
                title="Excluir Projeto"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* CARDS PRINCIPAIS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Cenário Otimista (Total Mínimo) */}
            <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Cenário Otimista
                </span>
                <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                  {totalMinimoOtimista.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Soma dos menores valores</p>
              </div>
            </div>

            {/* Cenário Realista / Pessimista (Total Máximo) */}
            <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Cenário Realista (Máx)
                </span>
                <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                  {totalMaximoRealista.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Soma dos maiores valores</p>
              </div>
            </div>

            {/* TOTAL JÁ PAGO (Azul) */}
            <div className="bg-indigo-50/50 dark:bg-indigo-950/30 p-4 rounded-2xl border border-indigo-200/60 dark:border-indigo-900/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Total Já Pago (Real)
                </span>
                <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                  {totalJaPagoReal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
                <p className="text-[10px] text-indigo-500/80 dark:text-indigo-400/80 font-medium mt-0.5">Soma da coluna Valor a Pagar / Pago</p>
              </div>
            </div>

            {/* RESTANTE A PAGAR (Vermelho) */}
            <div className="bg-rose-50/50 dark:bg-rose-950/30 p-4 rounded-2xl border border-rose-200/60 dark:border-rose-900/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                  Restante a Pagar (Pendentes)
                </span>
                <div className="w-7 h-7 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-sm">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
                  {restanteAPagarEstimado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
                <p className="text-[10px] text-rose-500/80 dark:text-rose-400/80 font-medium mt-0.5">Soma estimada dos itens pendentes</p>
              </div>
            </div>

          </div>

          {/* TABELA DINÂMICA DE ITENS DO PLANEJAMENTO */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Orçamento Detalhado por Item
              </h2>
              <span className="text-xs font-semibold text-slate-400">
                {items.length} {items.length === 1 ? "item cadastrado" : "itens cadastrados"}
              </span>
            </div>

            {/* Formulário Rápido de Adição de Item */}
            <form onSubmit={handleAddItem} className="bg-slate-50 dark:bg-slate-950/80 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
              <div className="lg:col-span-4 flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Item / Descrição *</label>
                <input
                  type="text"
                  required
                  value={newItemDesc}
                  onChange={e => setNewItemDesc(e.target.value)}
                  placeholder="Ex: Hotel, Ingresso, Passagem..."
                  className="w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="lg:col-span-2 flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Valor Mínimo (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newItemMin}
                  onChange={e => setNewItemMin(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0.00 (Opcional)"
                  className="w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              <div className="lg:col-span-2 flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Valor Máximo/Estimado *</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={newItemMax}
                  onChange={e => setNewItemMax(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              <div className="lg:col-span-3 flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Anotações / Links</label>
                <input
                  type="text"
                  value={newItemNotes}
                  onChange={e => setNewItemNotes(e.target.value)}
                  placeholder="Observações ou link de reserva"
                  className="w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="lg:col-span-1">
                <button
                  type="submit"
                  disabled={isAddingItem}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center cursor-pointer h-[38px] disabled:opacity-60"
                  title="Adicionar Item ao Planejamento"
                >
                  {isAddingItem ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </button>
              </div>
            </form>

            {/* TABELA DE ITENS COM CAMPOS DE VALOR DIRETO COMO INPUT E SEM SETINHAS */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 uppercase font-black tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3.5 px-3 w-10 text-center">Pago</th>
                    <th className="py-3.5 px-4">Item / Descrição</th>
                    <th className="py-3.5 px-4 text-center w-32">Valor Mínimo</th>
                    <th className="py-3.5 px-4 text-center w-32">Valor Máximo</th>
                    <th className="py-3.5 px-4 text-center w-36 text-indigo-600 dark:text-indigo-400">Valor a Pagar / Pago</th>
                    <th className="py-3.5 px-4">Anotações / Links</th>
                    <th className="py-3.5 px-4 text-center w-32">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        Nenhum item cadastrado neste planejamento. Adicione itens acima!
                      </td>
                    </tr>
                  ) : (
                    items.map((item: EventItem) => {
                      const isEditing = editingItemId === item.id;

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors ${
                            item.isPaid ? "bg-emerald-500/5 dark:bg-emerald-500/5" : ""
                          }`}
                        >
                          {/* Status de Pagamento (Checkbox) */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleTogglePaid(item)}
                              className="cursor-pointer text-slate-400 hover:text-emerald-500 transition-colors"
                              title={item.isPaid ? "Marcado como Pago" : "Marcar como Pago"}
                            >
                              {item.isPaid ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                              ) : (
                                <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                              )}
                            </button>
                          </td>

                          {/* Descrição */}
                          <td className="py-3 px-4">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editItemDesc}
                                onChange={e => setEditItemDesc(e.target.value)}
                                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-slate-100 font-bold"
                              />
                            ) : (
                              <div>
                                <span className={`font-bold ${item.isPaid ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-900 dark:text-slate-100"}`}>
                                  {item.description}
                                </span>
                                {item.transactionId && (
                                  <span className="ml-2 text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                    Lançado nas Despesas
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* INPUT DIRETO: VALOR MÍNIMO */}
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              step="0.01"
                              value={item.minAmount !== null && item.minAmount !== undefined ? item.minAmount : ""}
                              onChange={e => handleItemValueChange(item.id, "minAmount", e.target.value)}
                              placeholder="0.00"
                              className="w-28 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-center font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              title="Digite o Valor Mínimo"
                            />
                          </td>

                          {/* INPUT DIRETO: VALOR MÁXIMO / ESTIMADO */}
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              step="0.01"
                              value={item.maxAmount || ""}
                              onChange={e => handleItemValueChange(item.id, "maxAmount", e.target.value)}
                              placeholder="0.00"
                              className="w-28 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-center font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              title="Digite o Valor Máximo Estimado"
                            />
                          </td>

                          {/* INPUT DIRETO: VALOR REAL PAGO */}
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              step="0.01"
                              value={item.paidAmount || ""}
                              onChange={e => handleItemValueChange(item.id, "paidAmount", e.target.value)}
                              placeholder={item.isPaid ? "0.00" : "Pendente"}
                              className={`w-28 bg-white dark:bg-slate-950 border rounded-xl px-2.5 py-1.5 text-xs text-center font-extrabold focus:outline-none focus:ring-2 transition-all shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                item.isPaid || item.paidAmount > 0
                                  ? "border-indigo-400 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500"
                                  : "border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 focus:ring-indigo-500"
                              }`}
                              title="Digite o Valor Real Pago"
                            />
                          </td>

                          {/* Anotações / Links */}
                          <td className="py-3 px-4">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editItemNotes}
                                onChange={e => setEditItemNotes(e.target.value)}
                                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs"
                              />
                            ) : item.notes ? (
                              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                                <span>{item.notes}</span>
                                {item.notes.startsWith("http") && (
                                  <a
                                    href={item.notes}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-indigo-500 hover:text-indigo-400 transition-colors"
                                    title="Abrir Link de Reserva"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 font-normal">-</span>
                            )}
                          </td>

                          {/* Ações por Linha */}
                          <td className="py-3 px-4 text-center">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleSaveItemEdit(item.id)}
                                  className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
                                  title="Salvar"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingItemId(null)}
                                  className="p-1.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-300 transition-colors"
                                  title="Cancelar"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Botão Converter em Despesa */}
                                {!item.transactionId && (
                                  <button
                                    onClick={() => setConvertModalItem(item)}
                                    className="px-2 py-1 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-600 hover:text-white dark:bg-indigo-500/20 dark:hover:bg-indigo-500 dark:text-indigo-400 dark:hover:text-white rounded-lg transition-all text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                    title="Converter em Despesa no Extrato Principal"
                                  >
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                    <span>Lançar</span>
                                  </button>
                                )}

                                {/* Editar */}
                                <button
                                  onClick={() => startEditingItem(item)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                  title="Editar Descrição e Notas"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                {/* Excluir */}
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                  title="Excluir Item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* RODAPÉ DA TABELA EXIBINDO OS TOTAIS */}
                {items.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100/90 dark:bg-slate-950 font-extrabold text-slate-900 dark:text-slate-100 border-t-2 border-slate-200 dark:border-slate-800">
                      <td colSpan={2} className="py-3.5 px-4 uppercase text-[10px] tracking-wider text-slate-500 dark:text-slate-400">
                        Totais do Orçamento ({items.length} itens)
                      </td>
                      <td className="py-3.5 px-3 text-center text-emerald-600 dark:text-emerald-400 font-black">
                        {totalMinimoOtimista.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                      <td className="py-3.5 px-3 text-center text-amber-600 dark:text-amber-400 font-black">
                        {totalMaximoRealista.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                      <td className="py-3.5 px-3 text-center text-indigo-600 dark:text-indigo-400 font-black">
                        {totalJaPagoReal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                      <td colSpan={2} className="py-3.5 px-4 text-right text-xs text-rose-600 dark:text-rose-400 font-bold">
                        Restante a Pagar: {restanteAPagarEstimado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* BLOCO DE NOTAS INTEGRADO / ROTEIRO */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Bloco de Notas Integrado & Checklist da Viagem
                </h3>
              </div>
              <button
                onClick={handleSaveNotes}
                disabled={notesSaving}
                className="py-1.5 px-3 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-slate-100 dark:text-slate-900 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {notesSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : notesSavedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-500">Salvo!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar Anotações</span>
                  </>
                )}
              </button>
            </div>

            <textarea
              rows={5}
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              placeholder="Digite aqui anotações gerais sobre o roteiro da viagem, checklist de documentos, bagagens, vouchers de hotel, passeios programados ou lembretes importantes..."
              className="w-full rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all leading-relaxed"
            />
          </div>

        </div>
      )}

      {/* MODAL NOVO PROJETO */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 space-y-5 text-slate-900 dark:text-slate-100">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold">Novo Projeto de Viagem / Evento</h3>
              <button onClick={() => setIsNewProjectModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Projeto / Viagem *
                </label>
                <input
                  type="text"
                  required
                  value={newProjectTitle}
                  onChange={e => setNewProjectTitle(e.target.value)}
                  placeholder="Ex: Viagem Imaginelegend, Aniversário 30 Anos"
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold"
                />
              </div>

              {/* Data Início & Fim no Novo Projeto */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Data de Início
                  </label>
                  <input
                    type="date"
                    value={newProjectStartDate}
                    onChange={e => setNewProjectStartDate(e.target.value)}
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Data de Fim
                  </label>
                  <input
                    type="date"
                    value={newProjectEndDate}
                    onChange={e => setNewProjectEndDate(e.target.value)}
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Status Inicial
                </label>
                <select
                  value={newProjectStatus}
                  onChange={e => setNewProjectStatus(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold"
                >
                  <option value="Em Planejamento">Em Planejamento</option>
                  <option value="Confirmado">Confirmado</option>
                  <option value="Concluído">Concluído</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
              >
                Criar Projeto
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONVERSÃO EM DESPESA */}
      <ConvertToExpenseModal
        isOpen={!!convertModalItem}
        onClose={() => setConvertModalItem(null)}
        onSuccess={() => loadData()}
        item={convertModalItem}
      />

    </div>
  );
}
