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
  X,
  ListTodo,
  CheckSquare,
  Square
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
import { useModal } from "@/components/ui/custom-dialog-provider";

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

interface ChecklistTask {
  id: string;
  text: string;
  done: boolean;
}

export default function PlanningPage() {
  const { showAlert, showConfirm } = useModal();
  const [projects, setProjects] = useState<EventProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Estados de edição do projeto
  const [editTitle, setEditTitle]         = useState("");
  const [editStartDate, setEditStartDate] = useState<string>("");
  const [editEndDate, setEditEndDate]     = useState<string>("");
  const [editStatus, setEditStatus]       = useState("Em Planejamento");
  const [editNotes, setEditNotes]         = useState("");
  const [notesSaving, setNotesSaving]     = useState(false);
  const [notesSavedSuccess, setNotesSavedSuccess] = useState(false);

  // Estado do Checklist Interativo
  const [checklistTasks, setChecklistTasks] = useState<ChecklistTask[]>([]);
  const [newChecklistText, setNewChecklistText] = useState("");

  // Modal de Novo Projeto
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle]             = useState("");
  const [newProjectStartDate, setNewProjectStartDate]     = useState("");
  const [newProjectEndDate, setNewProjectEndDate]         = useState("");
  const [newProjectStatus, setNewProjectStatus]           = useState("Em Planejamento");

  // Novo Item Form State
  const [newItemDesc, setNewItemDesc]   = useState("");
  const [newItemMin, setNewItemMin]     = useState<number | "">("");
  const [newItemMax, setNewItemMax]     = useState<number | "">("");
  const [newItemNotes, setNewItemNotes] = useState("");
  const [isAddingItem, setIsAddingItem] = useState(false);

  // Edição de Item Inline (para Descrição e Notas)
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemDesc, setEditItemDesc]   = useState("");
  const [editItemNotes, setEditItemNotes] = useState("");

  // Modal de Conversão em Despesa
  const [convertModalItem, setConvertModalItem] = useState<EventItem | null>(null);

  // Extrai tarefas do checklist salvas nas notas (formato [x] ou [ ])
  const parseNotesAndChecklist = (rawNotes: string) => {
    const lines = rawNotes.split("\n");
    const tasks: ChecklistTask[] = [];
    const textLines: string[] = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("[x] ") || trimmed.startsWith("[X] ")) {
        tasks.push({ id: `task-${idx}-${Date.now()}`, text: trimmed.slice(4), done: true });
      } else if (trimmed.startsWith("[ ] ")) {
        tasks.push({ id: `task-${idx}-${Date.now()}`, text: trimmed.slice(4), done: false });
      } else {
        textLines.push(line);
      }
    });

    setChecklistTasks(tasks);
    setEditNotes(textLines.join("\n").trim());
  };

  // Codifica o checklist de volta junto com as anotações
  const serializeNotesAndChecklist = (textNotes: string, tasks: ChecklistTask[]) => {
    const checklistStr = tasks
      .map(t => `${t.done ? "[x]" : "[ ]"} ${t.text}`)
      .join("\n");
    if (!checklistStr) return textNotes;
    if (!textNotes) return checklistStr;
    return `${checklistStr}\n\n${textNotes}`;
  };

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
        parseNotesAndChecklist(current.notes || "");
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
      parseNotesAndChecklist(proj.notes || "");
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
      showAlert("Erro ao criar projeto.", { variant: "error" });
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
    const confirmed = await showConfirm(`Tem certeza que deseja excluir o projeto "${activeProject.title}"?`, {
      title: "Excluir Projeto",
      variant: "danger",
      confirmText: "Excluir",
    });
    if (!confirmed) return;

    try {
      await deleteEventProjectAction(activeProject.id);
      setSelectedProjectId("");
      await loadData();
    } catch (err) {
      console.error(err);
      showAlert("Erro ao excluir projeto.", { variant: "error" });
    }
  };

  // Adicionar Item ao Orçamento
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
      showAlert("Erro ao adicionar item.", { variant: "error" });
    } finally {
      setIsAddingItem(false);
    }
  };

  // Alternar Status de Pago
  const handleTogglePaid = async (item: EventItem) => {
    const newIsPaid = !item.isPaid;
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
      await loadData();
    }
  };

  // Atualização direta de valores numéricos na tabela
  const handleItemValueChange = async (
    itemId: string,
    field: "minAmount" | "maxAmount" | "paidAmount",
    valueStr: string
  ) => {
    const numericVal = valueStr === "" ? 0 : Number(valueStr);

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
      showAlert("Erro ao salvar alterações no item.", { variant: "error" });
    }
  };

  // Excluir Item
  const handleDeleteItem = async (itemId: string) => {
    const confirmed = await showConfirm("Deseja remover este item do planejamento?", {
      title: "Remover Item",
      variant: "danger",
      confirmText: "Remover",
    });
    if (!confirmed) return;
    try {
      await deleteEventItemAction(itemId);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Handlers para Checklist Interativo
  const handleAddChecklistTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;
    const newTask: ChecklistTask = {
      id: `task-${Date.now()}`,
      text: newChecklistText.trim(),
      done: false,
    };
    const updatedTasks = [...checklistTasks, newTask];
    setChecklistTasks(updatedTasks);
    setNewChecklistText("");
    saveNotesWithTasks(editNotes, updatedTasks);
  };

  const handleToggleChecklistTask = (taskId: string) => {
    const updatedTasks = checklistTasks.map(t =>
      t.id === taskId ? { ...t, done: !t.done } : t
    );
    setChecklistTasks(updatedTasks);
    saveNotesWithTasks(editNotes, updatedTasks);
  };

  const handleDeleteChecklistTask = (taskId: string) => {
    const updatedTasks = checklistTasks.filter(t => t.id !== taskId);
    setChecklistTasks(updatedTasks);
    saveNotesWithTasks(editNotes, updatedTasks);
  };

  const saveNotesWithTasks = async (textNotes: string, tasks: ChecklistTask[]) => {
    if (!activeProject) return;
    const fullSerialized = serializeNotesAndChecklist(textNotes, tasks);
    try {
      await updateEventProjectAction(activeProject.id, { notes: fullSerialized });
      setProjects(prev =>
        prev.map(p => (p.id === activeProject.id ? { ...p, notes: fullSerialized } : p))
      );
    } catch (err) {
      console.error("Erro ao salvar bloco de notas:", err);
    }
  };

  const handleSaveNotes = async () => {
    if (!activeProject) return;
    setNotesSaving(true);
    try {
      await saveNotesWithTasks(editNotes, checklistTasks);
      setNotesSavedSuccess(true);
      setTimeout(() => setNotesSavedSuccess(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setNotesSaving(false);
    }
  };

  // --- REAJUSTE DE REGRAS DE NEGÓCIO E CÁLCULOS AUTOMÁTICOS ---
  const items = activeProject?.items || [];
  
  const totalMinimoOtimista = items.reduce(
    (sum, i) => sum + (i.minAmount !== null && i.minAmount > 0 ? i.minAmount : i.maxAmount),
    0
  );

  const totalMaximoRealista = items.reduce((sum, i) => sum + i.maxAmount, 0);

  const totalJaPagoReal = items
    .filter((i: EventItem) => i.isPaid)
    .reduce((sum, i) => sum + (i.paidAmount > 0 ? i.paidAmount : i.maxAmount), 0);

  const restanteAPagarEstimado = items
    .filter((i: EventItem) => !i.isPaid)
    .reduce((sum, i) => {
      const pendingVal = (i.paidAmount !== null && i.paidAmount > 0) ? i.paidAmount : i.maxAmount;
      return sum + pendingVal;
    }, 0);

  if (loading && projects.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          <p className="text-xs font-bold text-slate-300">Carregando planejamento de viagens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6 select-none">
      
      {/* ── 1. HEADER DA PÁGINA ──────────────────────────────────────────────── */}
      <div className="card-glow p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            <Plane className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-white">
                Planejamento de Viagens & Eventos
              </h1>
              <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-full shadow-2xs">
                Orçamentos Futuros
              </span>
            </div>
            <p className="text-xs text-secondary-light mt-0.5">
              Simule cenários de custos, organize itens da viagem e converta em despesas reais.
            </p>
          </div>
        </div>

        {/* Seleção de Projetos e Novo Projeto */}
        <div className="flex items-center gap-3">
          <div className="relative min-w-[220px]">
            <select
              value={selectedProjectId}
              onChange={e => handleSelectProject(e.target.value)}
              className="w-full appearance-none rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-2.5 pr-8 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                  {p.title} ({p.status})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
          </div>

          <button
            onClick={() => setIsNewProjectModalOpen(true)}
            className="btn-primary-glow py-2.5 px-4 text-xs"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Novo Projeto</span>
          </button>
        </div>
      </div>

      {/* ── 2. DADOS DO PROJETO ATIVO ────────────────────────────────────────── */}
      {activeProject && (
        <div className="space-y-6">
          
          {/* Header do Projeto Selecionado */}
          <div className="card-glow p-6 space-y-4">
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              
              {/* Título & Status */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    onBlur={e => handleUpdateProjectHeader("title", e.target.value)}
                    placeholder="Nome do Projeto / Viagem"
                    className="text-lg sm:text-xl font-black bg-transparent text-slate-900 dark:text-white border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:outline-none transition-colors px-1 py-0.5 rounded"
                  />

                  {/* Badge de Status */}
                  <select
                    value={editStatus}
                    onChange={e => {
                      setEditStatus(e.target.value);
                      handleUpdateProjectHeader("status", e.target.value);
                    }}
                    className={`text-xs font-black px-3 py-1 rounded-full border cursor-pointer focus:outline-none transition-all ${
                      editStatus === "Confirmado"
                        ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-400/40"
                        : editStatus === "Concluído"
                        ? "bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-400/40"
                        : "bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-400/40"
                    }`}
                  >
                    <option value="Em Planejamento" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Em Planejamento</option>
                    <option value="Confirmado" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Confirmado</option>
                    <option value="Concluído" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Concluído</option>
                  </select>
                </div>

                {/* Date Range & Duração */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 text-xs text-secondary-light bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
                    <Calendar className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    <span className="font-bold">Início:</span>
                    <input
                      type="date"
                      value={editStartDate}
                      onChange={e => {
                        setEditStartDate(e.target.value);
                        handleUpdateProjectHeader("startDate", e.target.value);
                      }}
                      className="bg-transparent border-none text-xs font-bold text-white focus:outline-none [color-scheme:dark]"
                    />
                    <span className="font-bold mx-1 text-slate-400">até</span>
                    <span className="font-bold">Fim:</span>
                    <input
                      type="date"
                      value={editEndDate}
                      onChange={e => {
                        setEditEndDate(e.target.value);
                        handleUpdateProjectHeader("endDate", e.target.value);
                      }}
                      className="bg-transparent border-none text-xs font-bold text-white focus:outline-none [color-scheme:dark]"
                    />
                  </div>

                  {tripDays !== null && tripDays > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-xl text-xs font-extrabold shadow-2xs">
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
                  className="p-2.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
                  title="Excluir Projeto"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* ── 3. CARDS KPIS PADRONIZADOS EM .CARD-GLOW (4 COLUNAS) ─────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Cenário Otimista (Total Mínimo) */}
              <div className="card-glow p-4 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)] flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider">
                    Cenário Otimista
                  </span>
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <p className="text-xl font-black text-emerald-400 tracking-tight font-tnum">
                    {totalMinimoOtimista.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                  <p className="text-[10px] text-slate-300 font-semibold mt-0.5">Soma dos menores valores</p>
                </div>
              </div>

              {/* Card 2: Cenário Realista (Total Máximo) */}
              <div className="card-glow p-4 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)] flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider">
                    Cenário Realista (Máx)
                  </span>
                  <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <p className="text-xl font-black text-amber-400 tracking-tight font-tnum">
                    {totalMaximoRealista.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                  <p className="text-[10px] text-slate-300 font-semibold mt-0.5">Soma dos maiores valores</p>
                </div>
              </div>

              {/* Card 3: TOTAL JÁ PAGO (Azul/Índigo - Card-glow) */}
              <div className="card-glow p-4 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.15)] flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider">
                    Total Já Pago (Real)
                  </span>
                  <div className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <p className="text-xl font-black text-indigo-400 tracking-tight font-tnum">
                    {totalJaPagoReal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                  <p className="text-[10px] text-slate-300 font-semibold mt-0.5">Soma dos itens liquidados</p>
                </div>
              </div>

              {/* Card 4: RESTANTE A PAGAR (Rosa/Vermelho - Card-glow) */}
              <div className="card-glow p-4 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.15)] flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider">
                    Restante a Pagar
                  </span>
                  <div className="w-7 h-7 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <p className="text-xl font-black text-rose-400 tracking-tight font-tnum">
                    {restanteAPagarEstimado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                  <p className="text-[10px] text-slate-300 font-semibold mt-0.5">Soma estimada dos pendentes</p>
                </div>
              </div>

            </div>
          </div>

          {/* ── 4. FORMULÁRIO DE INSERÇÃO RÁPIDA DE ITENS ─────────────────────── */}
          <div className="card-glow p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-400" />
                Adicionar Novo Item ao Orçamento
              </h2>
              <span className="text-[10px] font-semibold text-slate-300">
                {items.length} {items.length === 1 ? "item cadastrado" : "itens cadastrados"}
              </span>
            </div>

            <form onSubmit={handleAddItem} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
              <div className="lg:col-span-4 flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-300 uppercase">Item / Descrição *</label>
                <input
                  type="text"
                  required
                  value={newItemDesc}
                  onChange={e => setNewItemDesc(e.target.value)}
                  placeholder="Ex: Hotel, Passagem aérea, Ingresso..."
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs font-semibold text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
              </div>

              <div className="lg:col-span-2 flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-300 uppercase">Valor Mínimo (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newItemMin}
                  onChange={e => setNewItemMin(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0.00 (Opcional)"
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs font-semibold text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
              </div>

              <div className="lg:col-span-2 flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-300 uppercase">Valor Máximo *</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={newItemMax}
                  onChange={e => setNewItemMax(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs font-semibold text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
              </div>

              <div className="lg:col-span-2 flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-300 uppercase">Anotações / Links</label>
                <input
                  type="text"
                  value={newItemNotes}
                  onChange={e => setNewItemNotes(e.target.value)}
                  placeholder="Link ou observação"
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs font-semibold text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
              </div>

              <div className="lg:col-span-2">
                <button
                  type="submit"
                  disabled={isAddingItem}
                  className="btn-primary-glow w-full py-2.5 text-xs font-black h-[40px] disabled:opacity-60"
                >
                  {isAddingItem ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4 text-white" />
                      <span>+ Adicionar Item</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* ── 5. TABELA DE ORÇAMENTO DETALHADO POR ITEM ───────────────────────── */}
          <div className="card-glow p-6 space-y-4">
            <h2 className="text-xs font-black text-white uppercase tracking-wider">
              Orçamento Detalhado por Item
            </h2>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-slate-900 text-slate-600 dark:text-slate-300 uppercase font-black tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3.5 px-3 w-14 text-center">Status</th>
                    <th className="py-3.5 px-4">Item / Descrição</th>
                    <th className="py-3.5 px-4 text-right w-36">Valor Mínimo</th>
                    <th className="py-3.5 px-4 text-right w-36">Valor Máximo</th>
                    <th className="py-3.5 px-4 text-right w-36 text-indigo-600 dark:text-indigo-300">Valor Pago</th>
                    <th className="py-3.5 px-4">Anotações / Links</th>
                    <th className="py-3.5 px-4 text-center w-28">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                        Nenhum item cadastrado neste planejamento. Utilize o formulário acima para adicionar!
                      </td>
                    </tr>
                  ) : (
                    items.map((item: EventItem) => {
                      const isEditing = editingItemId === item.id;

                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors hover:bg-slate-800/40 ${
                            item.isPaid ? "bg-emerald-500/5" : ""
                          }`}
                        >
                          {/* Status de Pagamento (Switch Neon) */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleTogglePaid(item)}
                              className={`inline-flex items-center justify-center p-1.5 rounded-xl border transition-all cursor-pointer ${
                                item.isPaid
                                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                  : "bg-slate-800/60 text-slate-400 border-slate-700 hover:text-emerald-400"
                              }`}
                              title={item.isPaid ? "Desmarcar Pago" : "Marcar como Pago"}
                            >
                              <CheckCircle2 className={`w-4 h-4 ${item.isPaid ? "text-emerald-300" : "text-slate-400"}`} />
                            </button>
                          </td>

                          {/* Descrição */}
                          <td className="py-3 px-4">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editItemDesc}
                                onChange={e => setEditItemDesc(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-bold"
                              />
                            ) : (
                              <div>
                                <span className={`font-bold ${item.isPaid ? "line-through text-slate-400" : "text-white"}`}>
                                  {item.description}
                                </span>
                                {item.transactionId && (
                                  <span className="ml-2 text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-400/30">
                                    Lançado no Extrato
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* VALOR MÍNIMO */}
                          <td className="py-3 px-4 text-right font-black font-tnum text-emerald-400">
                            <input
                              type="number"
                              step="0.01"
                              value={item.minAmount !== null && item.minAmount !== undefined ? item.minAmount : ""}
                              onChange={e => handleItemValueChange(item.id, "minAmount", e.target.value)}
                              placeholder="0.00"
                              className="w-24 bg-slate-950/80 border border-slate-800 rounded-lg px-2 py-1 text-xs text-right font-black text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>

                          {/* VALOR MÁXIMO */}
                          <td className="py-3 px-4 text-right font-black font-tnum text-amber-400">
                            <input
                              type="number"
                              step="0.01"
                              value={item.maxAmount || ""}
                              onChange={e => handleItemValueChange(item.id, "maxAmount", e.target.value)}
                              placeholder="0.00"
                              className="w-24 bg-slate-950/80 border border-slate-800 rounded-lg px-2 py-1 text-xs text-right font-black text-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </td>

                          {/* VALOR PAGO */}
                          <td className="py-3 px-4 text-right font-black font-tnum text-indigo-400">
                            <input
                              type="number"
                              step="0.01"
                              value={item.paidAmount || ""}
                              onChange={e => handleItemValueChange(item.id, "paidAmount", e.target.value)}
                              placeholder={item.isPaid ? "0.00" : "Pendente"}
                              className="w-24 bg-slate-950/80 border border-slate-800 rounded-lg px-2 py-1 text-xs text-right font-black text-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </td>

                          {/* Anotações / Links */}
                          <td className="py-3 px-4">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editItemNotes}
                                onChange={e => setEditItemNotes(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                              />
                            ) : item.notes ? (
                              <div className="flex items-center gap-1.5 text-slate-300 max-w-xs truncate">
                                <span className="truncate">{item.notes}</span>
                                {item.notes.startsWith("http") && (
                                  <a
                                    href={item.notes}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-indigo-400 hover:text-indigo-300 transition-colors"
                                    title="Abrir Link"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-600 font-normal">-</span>
                            )}
                          </td>

                          {/* Ações por Linha */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
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
                                  className="p-1.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
                                  title="Cancelar"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1.5">
                                {!item.transactionId && (
                                  <button
                                    onClick={() => setConvertModalItem(item)}
                                    className="px-2 py-1 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500 hover:text-white border border-indigo-400/30 rounded-lg transition-all text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                    title="Converter em Despesa"
                                  >
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                    <span>Lançar</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => startEditingItem(item)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                  title="Editar"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                  title="Excluir"
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

                {items.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100 dark:bg-slate-900 font-extrabold text-slate-900 dark:text-white border-t-2 border-slate-200 dark:border-slate-800">
                      <td colSpan={2} className="py-3.5 px-4 uppercase text-[10px] tracking-wider text-slate-500 dark:text-slate-400">
                        Totais do Orçamento ({items.length} itens)
                      </td>
                      <td className="py-3.5 px-4 text-right text-emerald-600 dark:text-emerald-400 font-black font-tnum">
                        {totalMinimoOtimista.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                      <td className="py-3.5 px-4 text-right text-amber-600 dark:text-amber-400 font-black font-tnum">
                        {totalMaximoRealista.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                      <td className="py-3.5 px-4 text-right text-indigo-600 dark:text-indigo-400 font-black font-tnum">
                        {totalJaPagoReal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                      <td colSpan={2} className="py-3.5 px-4 text-right text-xs text-rose-600 dark:text-rose-400 font-black">
                        Restante a Pagar: {restanteAPagarEstimado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* ── 6. CHECKLIST INTERATIVO & BLOCO DE NOTAS DO ROTEIRO ─────────────── */}
          <div className="card-glow p-6 space-y-6">
            
            {/* Cabeçalho da Seção de Notas */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Checklist & Roteiro da Viagem
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-300 font-semibold">Organize mala, documentos e lembretes importantes</p>
                </div>
              </div>

              <button
                onClick={handleSaveNotes}
                disabled={notesSaving}
                className="btn-primary-glow px-4 py-2 text-xs font-black disabled:opacity-60"
              >
                {notesSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : notesSavedSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Salvo com Sucesso!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-white" />
                    <span>Salvar Alterações</span>
                  </>
                )}
              </button>
            </div>

            {/* Checklist Interativo */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Checklist Interativo da Viagem ({checklistTasks.filter(t => t.done).length}/{checklistTasks.length})
              </h4>

              {/* Form Adicionar Item ao Checklist */}
              <form onSubmit={handleAddChecklistTask} className="flex gap-2">
                <input
                  type="text"
                  value={newChecklistText}
                  onChange={e => setNewChecklistText(e.target.value)}
                  placeholder="Adicionar tarefa (ex: Passaporte, Adaptador de tomada, Check-in)..."
                  className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar</span>
                </button>
              </form>

              {/* Lista do Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {checklistTasks.map(task => (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      task.done
                        ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-slate-400"
                        : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleChecklistTask(task.id)}
                      className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer flex-1"
                    >
                      {task.done ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span className={`text-xs font-semibold truncate ${task.done ? "line-through text-slate-400" : "text-slate-900 dark:text-white"}`}>
                        {task.text}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteChecklistTask(task.id)}
                      className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 transition-colors cursor-pointer"
                      title="Excluir item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Linha Divisória */}
            <div className="border-t border-slate-100 dark:border-slate-800" />

            {/* Área de Roteiro e Observações Gerais */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Observações do Roteiro & Vouchers
              </label>
              <textarea
                rows={5}
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                placeholder="Digite aqui observações do roteiro, horários de voo, códigos de reserva, dicas de passeios ou lembretes importantes..."
                className="w-full rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all leading-relaxed"
              />
            </div>

          </div>

        </div>
      )}

      {/* ── 7. MODAL NOVO PROJETO ────────────────────────────────────────────── */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 space-y-5 text-slate-900 dark:text-white">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-base font-black">Novo Projeto de Viagem / Evento</h3>
              <button onClick={() => setIsNewProjectModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                  Nome do Projeto / Viagem *
                </label>
                <input
                  type="text"
                  required
                  value={newProjectTitle}
                  onChange={e => setNewProjectTitle(e.target.value)}
                  placeholder="Ex: Viagem Japão, Aniversário 30 Anos"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                    Data de Início
                  </label>
                  <input
                    type="date"
                    value={newProjectStartDate}
                    onChange={e => setNewProjectStartDate(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-white [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                    Data de Fim
                  </label>
                  <input
                    type="date"
                    value={newProjectEndDate}
                    onChange={e => setNewProjectEndDate(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-white [color-scheme:dark]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                  Status Inicial
                </label>
                <select
                  value={newProjectStatus}
                  onChange={e => setNewProjectStatus(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-white cursor-pointer"
                >
                  <option value="Em Planejamento">Em Planejamento</option>
                  <option value="Confirmado">Confirmado</option>
                  <option value="Concluído">Concluído</option>
                </select>
              </div>

              <button
                type="submit"
                className="btn-primary-glow w-full py-3 text-xs font-extrabold"
              >
                Criar Projeto
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── 8. MODAL DE CONVERSÃO EM DESPESA ─────────────────────────────────── */}
      <ConvertToExpenseModal
        isOpen={!!convertModalItem}
        onClose={() => setConvertModalItem(null)}
        onSuccess={() => loadData()}
        item={convertModalItem}
      />

    </div>
  );
}
