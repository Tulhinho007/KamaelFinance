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
  Square,
  RotateCcw,
  Sparkles,
  Luggage,
  Compass
} from "lucide-react";
import {
  getEventProjects,
  createEventProjectAction,
  updateEventProjectAction,
  updateEventProjectChecklistAction,
  deleteEventProjectAction,
  createEventItemAction,
  updateEventItemAction,
  deleteEventItemAction
} from "@/lib/planning-actions";
import { detectCategory } from "@/lib/planning-utils";
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
  category?: string;
  rawNotes?: string;
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
  checklist?: ChecklistTask[] | any;
  items: EventItem[];
}

interface ChecklistTask {
  id: string;
  text: string;
  section?: "before" | "during";
  completed?: boolean;
  done?: boolean;
}

const CATEGORY_ORDER = [
  "Hospedagem",
  "Transporte",
  "Ingressos / Eventos",
  "Gastos no Local",
  "Outros Gastos"
];

const CATEGORY_META: Record<string, { icon: string; title: string; colorClass: string; badgeBg: string }> = {
  "Hospedagem": {
    icon: "🏨",
    title: "Hospedagem (Hotel, Pousada, Airbnb)",
    colorClass: "text-blue-600 dark:text-blue-400",
    badgeBg: "bg-blue-50 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300"
  },
  "Transporte": {
    icon: "🚌",
    title: "Transporte (Passagem de Ônibus, Voo, Transfer)",
    colorClass: "text-amber-600 dark:text-amber-400",
    badgeBg: "bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300"
  },
  "Ingressos / Eventos": {
    icon: "🎟️",
    title: "Ingressos / Eventos (Passaporte Imagine Legend, Shows)",
    colorClass: "text-purple-600 dark:text-purple-400",
    badgeBg: "bg-purple-50 dark:bg-purple-500/15 border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-300"
  },
  "Gastos no Local": {
    icon: "🍔",
    title: "Gastos no Local (Alimentação, Lazer)",
    colorClass: "text-rose-600 dark:text-rose-400",
    badgeBg: "bg-rose-50 dark:bg-rose-500/15 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300"
  },
  "Outros Gastos": {
    icon: "🎒",
    title: "Outros Gastos / Diversos",
    colorClass: "text-slate-600 dark:text-slate-400",
    badgeBg: "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
  }
};

const formatCurrency = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return "R$ 0,00";
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

// Célula editável com formatação padronizada de moeda brasileira
function EditableCurrencyCell({
  value,
  onChange,
  colorClass = "text-slate-900 dark:text-white",
  placeholder = "0,00",
  disabled = false,
  emptyText = "—",
}: {
  value: number | null | undefined;
  onChange: (valStr: string) => void;
  colorClass?: string;
  placeholder?: string;
  disabled?: boolean;
  emptyText?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempVal, setTempVal] = useState(value !== null && value !== undefined && value > 0 ? String(value) : "");

  useEffect(() => {
    setTempVal(value !== null && value !== undefined && value > 0 ? String(value) : "");
  }, [value]);

  if (disabled) {
    return (
      <span className="text-slate-400 font-bold text-xs select-none block text-right pr-2">
        {emptyText}
      </span>
    );
  }

  if (isEditing) {
    return (
      <div className="flex items-center justify-end gap-1">
        <span className="text-[10px] font-black text-slate-400 select-none">R$</span>
        <input
          autoFocus
          type="number"
          step="0.01"
          value={tempVal}
          onChange={e => setTempVal(e.target.value)}
          onBlur={() => {
            setIsEditing(false);
            onChange(tempVal);
          }}
          onKeyDown={e => {
            if (e.key === "Enter") {
              setIsEditing(false);
              onChange(tempVal);
            } else if (e.key === "Escape") {
              setIsEditing(false);
              setTempVal(value !== null && value !== undefined && value > 0 ? String(value) : "");
            }
          }}
          placeholder={placeholder}
          className={`w-24 bg-white dark:bg-slate-950 border border-indigo-500 rounded-lg px-2 py-1 text-xs text-right font-black ${colorClass} focus:outline-none shadow-xs font-tnum`}
        />
      </div>
    );
  }

  const hasValue = value !== null && value !== undefined && value > 0;
  const displayStr = hasValue
    ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : emptyText;

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      title="Clique para editar o valor"
      className={`group px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-right font-black font-tnum text-xs cursor-pointer inline-flex items-center justify-end gap-1 ${colorClass}`}
    >
      <span>{displayStr}</span>
      <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">✎</span>
    </button>
  );
}

export default function PlanningPage() {
  const { showAlert, showConfirm } = useModal();
  const [projects, setProjects] = useState<EventProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Estados de edição do cabeçalho do projeto
  const [editTitle, setEditTitle]         = useState("");
  const [editStartDate, setEditStartDate] = useState<string>("");
  const [editEndDate, setEditEndDate]     = useState<string>("");
  const [editStatus, setEditStatus]       = useState("Em Planejamento");
  const [editNotes, setEditNotes]         = useState("");
  const [notesSaving, setNotesSaving]     = useState(false);
  const [notesSavedSuccess, setNotesSavedSuccess] = useState(false);

  // Filtro Rápido no Orçamento
  const [filterTab, setFilterTab] = useState<"todos" | "pendentes" | "pagos">("todos");

  // Estado do Checklist Interativo
  const [checklistTasks, setChecklistTasks] = useState<ChecklistTask[]>([]);
  const [newBeforeTaskText, setNewBeforeTaskText] = useState("");
  const [newDuringTaskText, setNewDuringTaskText] = useState("");
  const [statusToggling, setStatusToggling] = useState(false);

  // Modal de Novo Projeto
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle]             = useState("");
  const [newProjectStartDate, setNewProjectStartDate]     = useState("");
  const [newProjectEndDate, setNewProjectEndDate]         = useState("");
  const [newProjectStatus, setNewProjectStatus]           = useState("Em Planejamento");

  // Novo Item Form State
  const [newItemDesc, setNewItemDesc]         = useState("");
  const [newItemMin, setNewItemMin]           = useState<number | "">("");
  const [newItemMax, setNewItemMax]           = useState<number | "">("");
  const [newItemNotes, setNewItemNotes]       = useState("");
  const [newItemCategory, setNewItemCategory] = useState("Gastos no Local");
  const [isAddingItem, setIsAddingItem]       = useState(false);

  // Edição de Item Inline
  const [editingItemId, setEditingItemId]         = useState<string | null>(null);
  const [editItemDesc, setEditItemDesc]           = useState("");
  const [editItemNotes, setEditItemNotes]         = useState("");
  const [editItemCategory, setEditItemCategory]   = useState("Gastos no Local");

  // Modal de Conversão em Despesa (Lançar)
  const [convertModalItem, setConvertModalItem] = useState<EventItem | null>(null);

  // Função auxiliar para inferir coluna do checklist
  const inferSection = (text: string): "before" | "during" => {
    if (/(check-in|checkin|horário|horario|saída|saida|chegada|dia \d|dia|evento|show|festa|roteiro|programação|programacao|ônibus|onibus|voo|embarque|retorno|transfer)/i.test(text)) {
      return "during";
    }
    return "before";
  };

  // Extrai tarefas do checklist salvas nas notas ou da coluna JSON
  const parseNotesAndChecklist = (rawNotes: string, dbChecklist?: any) => {
    if (dbChecklist && Array.isArray(dbChecklist) && dbChecklist.length > 0) {
      setChecklistTasks(
        dbChecklist.map((t: any, idx: number) => ({
          id: t.id || `task-${idx}-${Date.now()}`,
          text: t.text || "",
          section: t.section || inferSection(t.text || ""),
          done: Boolean(t.completed ?? t.done),
          completed: Boolean(t.completed ?? t.done),
        }))
      );
      setEditNotes(rawNotes || "");
      return;
    }

    if (!rawNotes) {
      setChecklistTasks([]);
      setEditNotes("");
      return;
    }

    const lines = rawNotes.split("\n");
    const tasks: ChecklistTask[] = [];
    const textLines: string[] = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      const mdMatch = trimmed.match(/^[-*]\s*\[([ xX])\]\s*(.*)$/);
      if (mdMatch) {
        const text = mdMatch[2].trim();
        tasks.push({
          id: `task-${idx}-${Date.now()}`,
          text,
          section: inferSection(text),
          done: mdMatch[1].toLowerCase() === "x",
          completed: mdMatch[1].toLowerCase() === "x",
        });
      } else if (trimmed.startsWith("[x] ") || trimmed.startsWith("[X] ")) {
        const text = trimmed.slice(4);
        tasks.push({
          id: `task-${idx}-${Date.now()}`,
          text,
          section: inferSection(text),
          done: true,
          completed: true,
        });
      } else if (trimmed.startsWith("[ ] ")) {
        const text = trimmed.slice(4);
        tasks.push({
          id: `task-${idx}-${Date.now()}`,
          text,
          section: inferSection(text),
          done: false,
          completed: false,
        });
      } else {
        textLines.push(line);
      }
    });

    setChecklistTasks(tasks);
    setEditNotes(textLines.join("\n").trim());
  };

  // Carrega projetos
  const loadData = async (targetId?: string) => {
    try {
      setLoading(true);
      const data = await getEventProjects();
      setProjects(data);
      const activeId = targetId !== undefined ? targetId : selectedProjectId;
      if (activeId) {
        const current = data.find((p: EventProject) => p.id === activeId);
        if (current) {
          setSelectedProjectId(current.id);
          setEditTitle(current.title);
          setEditStartDate(current.startDate || "");
          setEditEndDate(current.endDate || "");
          setEditStatus(current.status);
          parseNotesAndChecklist(current.notes || "", current.checklist);
        }
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

  const activeProject = selectedProjectId ? projects.find((p: EventProject) => p.id === selectedProjectId) || null : null;
  const isCompleted = activeProject ? activeProject.status === "COMPLETED" || activeProject.status === "Concluído" : false;

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
    if (!projId) {
      setEditTitle("");
      setEditStartDate("");
      setEditEndDate("");
      setEditStatus("Em Planejamento");
      setChecklistTasks([]);
      setEditNotes("");
      return;
    }
    const proj = projects.find((p: EventProject) => p.id === projId);
    if (proj) {
      setEditTitle(proj.title);
      setEditStartDate(proj.startDate || "");
      setEditEndDate(proj.endDate || "");
      setEditStatus(proj.status);
      parseNotesAndChecklist(proj.notes || "", proj.checklist);
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
      await loadData(created.id);
      handleSelectProject(created.id);
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
        category: newItemCategory,
      });

      setNewItemDesc("");
      setNewItemMin("");
      setNewItemMax("");
      setNewItemNotes("");
      setNewItemCategory("Gastos no Local");
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
    // Se marcou como pago e não tinha valor, adota o valor máximo como base
    const newPaidAmount = newIsPaid
      ? (item.paidAmount > 0 ? item.paidAmount : item.maxAmount)
      : item.paidAmount;

    setProjects(prev =>
      prev.map((p: EventProject) => {
        if (p.id !== activeProject?.id) return p;
        return {
          ...p,
          items: p.items.map((i: EventItem) =>
            i.id === item.id ? { ...i, isPaid: newIsPaid, paidAmount: newPaidAmount } : i
          )
        };
      })
    );
    try {
      await updateEventItemAction(item.id, { isPaid: newIsPaid, paidAmount: newPaidAmount });
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

  // Iniciar Edição Inline do Item
  const startEditingItem = (item: EventItem) => {
    setEditingItemId(item.id);
    setEditItemDesc(item.description);
    setEditItemNotes(item.notes);
    setEditItemCategory(item.category || detectCategory(item.description, item.notes));
  };

  // Salvar Edição do Item
  const handleSaveItemEdit = async (itemId: string) => {
    try {
      await updateEventItemAction(itemId, {
        description: editItemDesc.trim(),
        notes: editItemNotes.trim(),
        category: editItemCategory,
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

  // Handlers para Conclusão / Reabertura da Viagem
  const handleToggleProjectCompletion = async () => {
    if (!activeProject) return;
    setStatusToggling(true);
    try {
      const isCurrentlyCompleted = activeProject.status === "COMPLETED" || activeProject.status === "Concluído";
      const nextStatus = isCurrentlyCompleted ? "Em Planejamento" : "COMPLETED";
      await updateEventProjectAction(activeProject.id, { status: nextStatus });
      setEditStatus(nextStatus);
      setProjects(prev =>
        prev.map(p => (p.id === activeProject.id ? { ...p, status: nextStatus } : p))
      );
    } catch (err) {
      console.error("Erro ao alternar conclusão da viagem:", err);
      showAlert("Não foi possível alterar o status da viagem.", { variant: "error" });
    } finally {
      setStatusToggling(false);
    }
  };

  // Handlers para Checklist Interativo com suporte a colunas
  const handleAddChecklistTask = async (e: React.FormEvent, section: "before" | "during") => {
    e.preventDefault();
    const taskText = section === "before" ? newBeforeTaskText : newDuringTaskText;
    if (!taskText.trim() || !activeProject) return;

    const newTask: ChecklistTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      text: taskText.trim(),
      section,
      completed: false,
      done: false,
    };
    const updatedTasks = [...checklistTasks, newTask];
    setChecklistTasks(updatedTasks);

    if (section === "before") setNewBeforeTaskText("");
    else setNewDuringTaskText("");

    try {
      await updateEventProjectChecklistAction(activeProject.id, updatedTasks);
      setProjects(prev =>
        prev.map(p => (p.id === activeProject.id ? { ...p, checklist: updatedTasks } : p))
      );
    } catch (err) {
      console.error("Erro ao salvar item no checklist:", err);
    }
  };

  const handleToggleChecklistTask = async (taskId: string) => {
    if (!activeProject) return;
    const updatedTasks = checklistTasks.map(t => {
      if (t.id === taskId) {
        const nextState = !(t.completed ?? t.done);
        return { ...t, done: nextState, completed: nextState };
      }
      return t;
    });
    setChecklistTasks(updatedTasks);

    try {
      await updateEventProjectChecklistAction(activeProject.id, updatedTasks);
      setProjects(prev =>
        prev.map(p => (p.id === activeProject.id ? { ...p, checklist: updatedTasks } : p))
      );
    } catch (err) {
      console.error("Erro ao alternar item do checklist:", err);
    }
  };

  const handleDeleteChecklistTask = async (taskId: string) => {
    if (!activeProject) return;
    const updatedTasks = checklistTasks.filter(t => t.id !== taskId);
    setChecklistTasks(updatedTasks);

    try {
      await updateEventProjectChecklistAction(activeProject.id, updatedTasks);
      setProjects(prev =>
        prev.map(p => (p.id === activeProject.id ? { ...p, checklist: updatedTasks } : p))
      );
    } catch (err) {
      console.error("Erro ao remover item do checklist:", err);
    }
  };

  const handleSaveNotes = async () => {
    if (!activeProject) return;
    setNotesSaving(true);
    try {
      await updateEventProjectAction(activeProject.id, {
        notes: editNotes,
        checklist: checklistTasks,
      });
      setProjects(prev =>
        prev.map(p =>
          p.id === activeProject.id
            ? { ...p, notes: editNotes, checklist: checklistTasks }
            : p
        )
      );
      setNotesSavedSuccess(true);
      setTimeout(() => setNotesSavedSuccess(false), 2500);
    } catch (err) {
      console.error("Erro ao salvar anotações:", err);
      showAlert("Não foi possível salvar as anotações.", { variant: "error" });
    } finally {
      setNotesSaving(false);
    }
  };

  // ── REGRAS DE NEGÓCIO E CÁLCULOS MATEMÁTICOS CORRIGIDOS ──────────────
  const items = activeProject?.items || [];
  
  // Total Mínimo Otimista (soma dos menores valores)
  const totalMinimoOtimista = items.reduce(
    (sum, i) => sum + (i.minAmount !== null && i.minAmount > 0 ? i.minAmount : i.maxAmount),
    0
  );

  // Cenário Realista Inicial (Teto Máximo orçado)
  const totalMaximoRealista = items.reduce((sum, i) => sum + i.maxAmount, 0);

  // Total Já Pago (Real): soma estritamente dos itens marcados como pagos
  const totalJaPagoReal = items
    .filter((i: EventItem) => i.isPaid)
    .reduce((sum, i) => sum + (i.paidAmount > 0 ? i.paidAmount : i.maxAmount), 0);

  // Restante a Pagar Estimado: teto dos itens AINDA NÃO LIQUIDADOS (isPaid === false)
  const restanteAPagarEstimado = items
    .filter((i: EventItem) => !i.isPaid)
    .reduce((sum, i) => sum + i.maxAmount, 0);

  // Custo Total Previsto Atualizado (Custo Projetado) = Já Pago + Pendente Estimado
  const custoTotalProjetado = totalJaPagoReal + restanteAPagarEstimado;

  // Economia Projetada frente ao Teto Inicial
  const economiaProjetada = totalMaximoRealista - custoTotalProjetado;

  // Progresso do Orçamento (Percentual pago)
  const percentualPago = totalMaximoRealista > 0
    ? Math.min(100, Math.round((totalJaPagoReal / totalMaximoRealista) * 100))
    : 0;

  // Filtros de Itens da Tabela
  const filteredItems = items.filter(item => {
    if (filterTab === "pendentes") return !item.isPaid;
    if (filterTab === "pagos") return item.isPaid;
    return true;
  });

  // Agrupamento por Categoria
  const itemsByCategory = CATEGORY_ORDER.map(cat => ({
    category: cat,
    meta: CATEGORY_META[cat] || CATEGORY_META["Outros Gastos"],
    items: filteredItems.filter(i => {
      const itemCat = i.category || detectCategory(i.description, i.notes);
      return itemCat === cat;
    })
  })).filter(group => group.items.length > 0);

  // Tarefas do Checklist divididas por coluna
  const beforeTasks = checklistTasks.filter(t => (t.section || inferSection(t.text)) === "before");
  const duringTasks = checklistTasks.filter(t => (t.section || inferSection(t.text)) === "during");

  if (loading && projects.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F7F5] dark:bg-slate-950 p-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-500 dark:text-indigo-400 animate-spin" />
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Carregando planejamento de viagens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6 select-none text-slate-900 dark:text-slate-100">
      
      {/* ── 1. HEADER DA PÁGINA ──────────────────────────────────────────────── */}
      <div className="card-glow p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-400/30 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shadow-xs">
            <Plane className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                Planejamento de Viagens & Eventos
              </h1>
              <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-400/30 rounded-full shadow-2xs">
                Orçamentos Futuros
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Simule cenários de custos, organize itens da viagem e lance despesas com débito automático.
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
              <option value="" className="bg-white dark:bg-slate-900 text-slate-500">Selecione um Projeto...</option>
              {projects.map(p => (
                <option key={p.id} value={p.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                  {p.title} ({p.status === "COMPLETED" || p.status === "Concluído" ? "✓ Concluído" : p.status})
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

      {/* ── ESTADO VAZIO (NENHUM PROJETO SELECIONADO) ────────────────────── */}
      {!activeProject && (
        <div className="card-glow p-12 text-center flex flex-col items-center justify-center gap-4 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm my-6">
          <div className="p-4 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 rounded-2xl border border-indigo-200 dark:border-indigo-400/30">
            <Plane className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">Selecione ou Crie um Projeto</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 max-w-md">
              Escolha um projeto de viagem no menu acima para visualizar o orçamento ou clique no botão abaixo para cadastrar um novo projeto.
            </p>
          </div>
          <button
            onClick={() => setIsNewProjectModalOpen(true)}
            className="btn-primary-glow py-2.5 px-5 text-xs mt-2"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>+ Novo Projeto</span>
          </button>
        </div>
      )}

      {/* ── 2. DADOS DO PROJETO ATIVO ────────────────────────────────────────── */}
      {activeProject && (
        <div className="space-y-6">
          
          {/* Header do Projeto Selecionado */}
          <div className="card-glow p-6 space-y-4">
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              
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
                    value={editStatus === "COMPLETED" || editStatus === "Concluído" ? "COMPLETED" : editStatus}
                    onChange={e => {
                      setEditStatus(e.target.value);
                      handleUpdateProjectHeader("status", e.target.value);
                    }}
                    className={`text-xs font-black px-3 py-1 rounded-full border cursor-pointer focus:outline-none transition-all ${
                      editStatus === "Confirmado"
                        ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-400/40"
                        : editStatus === "Concluído" || editStatus === "COMPLETED"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40 font-bold"
                        : "bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-400/40"
                    }`}
                  >
                    <option value="Em Planejamento" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Em Planejamento</option>
                    <option value="Confirmado" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Confirmado</option>
                    <option value="COMPLETED" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">✓ Concluído</option>
                  </select>
                </div>

                {/* Date Range & Duração */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                    <span className="font-bold">Início:</span>
                    <input
                      type="date"
                      value={editStartDate}
                      onChange={e => {
                        setEditStartDate(e.target.value);
                        handleUpdateProjectHeader("startDate", e.target.value);
                      }}
                      className="bg-transparent border-none text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
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
                      className="bg-transparent border-none text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  {tripDays !== null && tripDays > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-400/30 rounded-xl text-xs font-extrabold shadow-2xs">
                      <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
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
              <div className="card-glow p-4 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-2 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                    Cenário Otimista
                  </span>
                  <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-500/30">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-tnum">
                    {formatCurrency(totalMinimoOtimista)}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">Soma dos menores valores</p>
                </div>
              </div>

              {/* Card 2: Custo Total Previsto Atualizado (Custo Projetado) */}
              <div className="card-glow p-4 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-2 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Custo Total Projetado
                  </span>
                  <div className="w-7 h-7 rounded-xl bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-500/30">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <p className="text-xl font-black text-amber-600 dark:text-amber-400 tracking-tight font-tnum">
                    {formatCurrency(custoTotalProjetado)}
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                      Pago ({formatCurrency(totalJaPagoReal)}) + Pendente ({formatCurrency(restanteAPagarEstimado)})
                    </span>
                    {economiaProjetada > 0 && (
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                        Economia: {formatCurrency(economiaProjetada)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 3: TOTAL JÁ PAGO (Azul/Índigo - Card-glow) */}
              <div className="card-glow p-4 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-2 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                    Total Já Pago (Real)
                  </span>
                  <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-500/30">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight font-tnum">
                    {formatCurrency(totalJaPagoReal)}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                    Soma dos itens liquidados ({items.filter(i => i.isPaid).length} de {items.length})
                  </p>
                </div>
              </div>

              {/* Card 4: RESTANTE A PAGAR (Rosa/Vermelho - Card-glow) */}
              <div className="card-glow p-4 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-2 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                    Restante a Pagar
                  </span>
                  <div className="w-7 h-7 rounded-xl bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200 dark:border-rose-500/30">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <p className="text-xl font-black text-rose-600 dark:text-rose-400 tracking-tight font-tnum">
                    {formatCurrency(restanteAPagarEstimado)}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                    Soma estimada dos pendentes ({items.filter(i => !i.isPaid).length} itens)
                  </p>
                </div>
              </div>

            </div>

            {/* ── BARRA DE PROGRESSO FINANCEIRO (TERMÔMETRO DO ORÇAMENTO) ─────── */}
            <div className="p-4 bg-slate-50/90 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2.5 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    📊 Progresso do Orçamento
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-400/30 shadow-2xs">
                    {percentualPago}% pago
                  </span>
                </div>
                <div className="text-right text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  <span className="text-indigo-600 dark:text-indigo-400 font-extrabold font-tnum">
                    {formatCurrency(totalJaPagoReal)}
                  </span>
                  {" de "}
                  <span className="text-slate-900 dark:text-white font-extrabold font-tnum">
                    {formatCurrency(totalMaximoRealista)}
                  </span>
                  {" máx"}
                  {restanteAPagarEstimado > 0 && (
                    <span className="text-rose-500 dark:text-rose-400 ml-1.5 font-bold">
                      (Restante: {formatCurrency(restanteAPagarEstimado)})
                    </span>
                  )}
                </div>
              </div>

              {/* Barra com Gradiente */}
              <div className="w-full h-3.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-300 dark:border-slate-700 relative">
                <div
                  className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 shadow-sm"
                  style={{ width: `${percentualPago}%` }}
                />
              </div>
            </div>

          </div>

          {/* ── 4. FORMULÁRIO DE INSERÇÃO RÁPIDA DE ITENS ─────────────────────── */}
          <div className="card-glow p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Adicionar Novo Item ao Orçamento
              </h2>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-300">
                {items.length} {items.length === 1 ? "item cadastrado" : "itens cadastrados"}
              </span>
            </div>

            <form onSubmit={handleAddItem} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end bg-slate-50/80 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              {/* Categoria */}
              <div className="lg:col-span-2 flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase">Categoria</label>
                <select
                  value={newItemCategory}
                  onChange={e => setNewItemCategory(e.target.value)}
                  className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 cursor-pointer"
                >
                  <option value="Hospedagem">🏨 Hospedagem</option>
                  <option value="Transporte">🚌 Transporte</option>
                  <option value="Ingressos / Eventos">🎟️ Ingressos / Eventos</option>
                  <option value="Gastos no Local">🍔 Gastos no Local</option>
                  <option value="Outros Gastos">🎒 Outros Gastos</option>
                </select>
              </div>

              {/* Descrição */}
              <div className="lg:col-span-3 flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase">Item / Descrição *</label>
                <input
                  type="text"
                  required
                  value={newItemDesc}
                  onChange={e => setNewItemDesc(e.target.value)}
                  placeholder="Ex: Hotel Ibis, Passagem aérea, Ingresso VIP..."
                  className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
              </div>

              {/* Valor Mínimo */}
              <div className="lg:col-span-2 flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase">Valor Mínimo (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newItemMin}
                  onChange={e => setNewItemMin(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0,00 (Opcional)"
                  className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
              </div>

              {/* Valor Máximo */}
              <div className="lg:col-span-2 flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase">Valor Máximo *</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={newItemMax}
                  onChange={e => setNewItemMax(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0,00"
                  className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
              </div>

              {/* Anotações */}
              <div className="lg:col-span-2 flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase">Anotações / Links</label>
                <input
                  type="text"
                  value={newItemNotes}
                  onChange={e => setNewItemNotes(e.target.value)}
                  placeholder="Link ou observação"
                  className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
              </div>

              {/* Botão Salvar */}
              <div className="lg:col-span-1">
                <button
                  type="submit"
                  disabled={isAddingItem}
                  className="btn-primary-glow w-full py-2 text-xs font-black h-[38px] disabled:opacity-60 flex items-center justify-center gap-1"
                >
                  {isAddingItem ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5 text-white" />
                      <span>Add</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* ── 5. TABELA DE ORÇAMENTO DETALHADO POR ITEM COM CATEGORIAS E FILTROS ─ */}
          <div className="card-glow p-6 space-y-4">
            
            {/* Header da Tabela com Abas de Filtros Rápidos */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Orçamento Detalhado por Item
                </h2>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  Itens agrupados por categoria com controle financeiro em tempo real
                </p>
              </div>

              {/* Abas Rápidas: Todos / Pendentes / Pagos */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setFilterTab("todos")}
                  className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    filterTab === "todos"
                      ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/80 dark:border-slate-700"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <span>Todos</span>
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-200 dark:bg-slate-700 font-black">
                    {items.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterTab("pendentes")}
                  className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    filterTab === "pendentes"
                      ? "bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-xs border border-slate-200/80 dark:border-slate-700"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <span>Pendentes</span>
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-black">
                    {items.filter(i => !i.isPaid).length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterTab("pagos")}
                  className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    filterTab === "pagos"
                      ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs border border-slate-200/80 dark:border-slate-700"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <span>Pagos</span>
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-black">
                    {items.filter(i => i.isPaid).length}
                  </span>
                </button>
              </div>
            </div>

            {/* Tabela Formatada */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-slate-900 text-slate-600 dark:text-slate-300 uppercase font-black tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3.5 px-3 w-14 text-center">Status</th>
                    <th className="py-3.5 px-4">Item / Descrição</th>
                    <th className="py-3.5 px-4 text-right w-36 text-emerald-700 dark:text-emerald-400">Valor Mínimo</th>
                    <th className="py-3.5 px-4 text-right w-36 text-amber-700 dark:text-amber-400">Valor Máximo</th>
                    <th className="py-3.5 px-4 text-right w-36 text-indigo-700 dark:text-indigo-300">Valor Pago</th>
                    <th className="py-3.5 px-4">Anotações / Links</th>
                    <th className="py-3.5 px-4 text-center w-28">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                        Nenhum item encontrado no filtro &quot;{filterTab}&quot;.
                      </td>
                    </tr>
                  ) : (
                    itemsByCategory.map(group => (
                      <React.Fragment key={group.category}>
                        {/* Subtítulo Separador de Categoria */}
                        <tr className="bg-slate-50 dark:bg-slate-900/90 border-t-2 border-b border-slate-200 dark:border-slate-800">
                          <td colSpan={7} className="py-2 px-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{group.meta.icon}</span>
                                <span className={`text-[11px] font-black uppercase tracking-wider ${group.meta.colorClass}`}>
                                  {group.meta.title}
                                </span>
                                <span className="text-[10px] font-extrabold px-2 py-0.2 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shadow-2xs">
                                  {group.items.length} {group.items.length === 1 ? "item" : "itens"}
                                </span>
                              </div>
                              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                Subtotal Teto:{" "}
                                <span className="font-black text-slate-800 dark:text-slate-200 font-tnum">
                                  {formatCurrency(group.items.reduce((s, i) => s + i.maxAmount, 0))}
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>

                        {/* Linhas da Categoria */}
                        {group.items.map((item: EventItem) => {
                          const isEditing = editingItemId === item.id;

                          return (
                            <tr
                              key={item.id}
                              className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                                item.isPaid ? "bg-emerald-50/40 dark:bg-emerald-500/5" : ""
                              }`}
                            >
                              {/* Status de Pagamento (Switch) */}
                              <td className="py-3 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleTogglePaid(item)}
                                  className={`inline-flex items-center justify-center p-1.5 rounded-xl border transition-all cursor-pointer ${
                                    item.isPaid
                                      ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-400/50 shadow-2xs"
                                      : "bg-slate-100 dark:bg-slate-800/60 text-slate-400 border-slate-200 dark:border-slate-700 hover:text-emerald-600 dark:hover:text-emerald-400"
                                  }`}
                                  title={item.isPaid ? "Desmarcar Pago" : "Marcar como Pago"}
                                >
                                  <CheckCircle2 className={`w-4 h-4 ${item.isPaid ? "text-emerald-600 dark:text-emerald-300" : "text-slate-400"}`} />
                                </button>
                              </td>

                              {/* Descrição com legibilidade nítida (SEM texto riscado cinza) */}
                              <td className="py-3 px-4">
                                {isEditing ? (
                                  <div className="flex flex-col gap-1.5">
                                    <input
                                      type="text"
                                      value={editItemDesc}
                                      onChange={e => setEditItemDesc(e.target.value)}
                                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-white font-bold"
                                    />
                                    <select
                                      value={editItemCategory}
                                      onChange={e => setEditItemCategory(e.target.value)}
                                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                                    >
                                      <option value="Hospedagem">🏨 Hospedagem</option>
                                      <option value="Transporte">🚌 Transporte</option>
                                      <option value="Ingressos / Eventos">🎟️ Ingressos / Eventos</option>
                                      <option value="Gastos no Local">🍔 Gastos no Local</option>
                                      <option value="Outros Gastos">🎒 Outros Gastos</option>
                                    </select>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {/* Texto em traço normal com contraste de alta legibilidade */}
                                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                                      {item.description}
                                    </span>

                                    {/* Badges de sinalização limpa de status */}
                                    {item.transactionId ? (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-400/30">
                                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                                        Lançado no Extrato
                                      </span>
                                    ) : item.isPaid ? (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-500/30">
                                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                                        Pago
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                                        <Clock className="w-2.5 h-2.5" />
                                        Pendente
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* VALOR MÍNIMO FORMATADO COM PREFIXO R$ E CENTAVOS */}
                              <td className="py-3 px-4 text-right">
                                <EditableCurrencyCell
                                  value={item.minAmount}
                                  onChange={valStr => handleItemValueChange(item.id, "minAmount", valStr)}
                                  colorClass="text-emerald-600 dark:text-emerald-400"
                                  placeholder="0,00"
                                  emptyText="—"
                                />
                              </td>

                              {/* VALOR MÁXIMO FORMATADO COM PREFIXO R$ E CENTAVOS */}
                              <td className="py-3 px-4 text-right">
                                <EditableCurrencyCell
                                  value={item.maxAmount}
                                  onChange={valStr => handleItemValueChange(item.id, "maxAmount", valStr)}
                                  colorClass="text-amber-600 dark:text-amber-400"
                                  placeholder="0,00"
                                />
                              </td>

                              {/* VALOR PAGO: SE NÃO PAGO, EXIBE TRAÇO (—) SEM CONTRADIÇÃO */}
                              <td className="py-3 px-4 text-right">
                                <EditableCurrencyCell
                                  value={item.isPaid ? (item.paidAmount > 0 ? item.paidAmount : item.maxAmount) : null}
                                  onChange={valStr => handleItemValueChange(item.id, "paidAmount", valStr)}
                                  colorClass="text-indigo-600 dark:text-indigo-400"
                                  placeholder="0,00"
                                  disabled={!item.isPaid}
                                  emptyText="—"
                                />
                              </td>

                              {/* Anotações / Links */}
                              <td className="py-3 px-4">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editItemNotes}
                                    onChange={e => setEditItemNotes(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-white"
                                  />
                                ) : item.notes ? (
                                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 max-w-xs truncate font-normal">
                                    <span className="truncate">{item.notes}</span>
                                    {item.notes.startsWith("http") && (
                                      <a
                                        href={item.notes}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors"
                                        title="Abrir Link"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                      </a>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 font-normal">-</span>
                                )}
                              </td>

                              {/* Ações por Linha */}
                              <td className="py-3 px-4 text-center whitespace-nowrap">
                                {isEditing ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => handleSaveItemEdit(item.id)}
                                      className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors cursor-pointer"
                                      title="Salvar"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setEditingItemId(null)}
                                      className="p-1.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
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
                                        className="px-2 py-1 bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-400/30 rounded-lg transition-all text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                                        title="Lançar com débito automático no extrato ou cartão"
                                      >
                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                        <span>Lançar</span>
                                      </button>
                                    )}

                                    <button
                                      onClick={() => startEditingItem(item)}
                                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                      title="Editar"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      onClick={() => handleDeleteItem(item.id)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                      title="Excluir"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))
                  )}
                </tbody>

                {items.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100 dark:bg-slate-900 font-extrabold text-slate-900 dark:text-white border-t-2 border-slate-200 dark:border-slate-800">
                      <td colSpan={2} className="py-3.5 px-4 uppercase text-[10px] tracking-wider text-slate-600 dark:text-slate-400">
                        Totais do Orçamento ({items.length} itens)
                      </td>
                      <td className="py-3.5 px-4 text-right text-emerald-600 dark:text-emerald-400 font-black font-tnum">
                        {formatCurrency(totalMinimoOtimista)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-amber-600 dark:text-amber-400 font-black font-tnum">
                        {formatCurrency(totalMaximoRealista)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-indigo-600 dark:text-indigo-400 font-black font-tnum">
                        {formatCurrency(totalJaPagoReal)}
                      </td>
                      <td colSpan={2} className="py-3.5 px-4 text-right text-xs text-rose-600 dark:text-rose-400 font-black font-tnum">
                        Restante a Pagar: {formatCurrency(restanteAPagarEstimado)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* ── 6. CHECKLIST INTERATIVO DIVIDIDO (ANTES DE SAIR VS ROTEIRO) ───── */}
          <div className="card-glow p-6 space-y-6">
            
            {/* Cabeçalho da Seção de Notas & Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      Checklist & Roteiro da Viagem
                    </h3>
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
                        <Check className="w-3 h-3 text-emerald-500 stroke-[3]" />
                        Viagem Concluída
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-300 font-semibold">
                    Organize mala, documentos e programação horária de forma categorizada
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Botão Concluir / Reabrir Viagem */}
                <button
                  type="button"
                  onClick={handleToggleProjectCompletion}
                  disabled={statusToggling}
                  className={`px-3.5 py-2 text-xs font-black rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                    isCompleted
                      ? "bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                      : "bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40"
                  }`}
                  title={isCompleted ? "Reabrir projeto de viagem para planejamento" : "Marcar viagem como concluída"}
                >
                  {statusToggling ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                  ) : isCompleted ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      <span>Reabrir Viagem</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Concluir Viagem</span>
                    </>
                  )}
                </button>

                {/* Botão Salvar Alterações */}
                <button
                  onClick={handleSaveNotes}
                  disabled={notesSaving}
                  className="btn-primary-glow px-4 py-2 text-xs font-black disabled:opacity-60 flex items-center gap-1.5"
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
            </div>

            {/* Checklist Dividido em 2 Colunas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Coluna 1: Antes de Sair / Mala & Documentos */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Luggage className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                        Antes de Sair / Mala & Documentos
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        Documentos, passagens impressas/QR, remédios, carregador, roupas
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-400/30">
                    {beforeTasks.filter(t => Boolean(t.completed ?? t.done)).length}/{beforeTasks.length}
                  </span>
                </div>

                {/* Form Adicionar na Coluna 1 */}
                <form onSubmit={e => handleAddChecklistTask(e, "before")} className="flex gap-2">
                  <input
                    type="text"
                    value={newBeforeTaskText}
                    onChange={e => setNewBeforeTaskText(e.target.value)}
                    placeholder="Adicionar item (ex: RG/CNH atualizado, carregador portátil)..."
                    className="flex-1 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1 shrink-0 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </form>

                {/* Lista da Coluna 1 */}
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {beforeTasks.length === 0 ? (
                    <div className="py-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white/50 dark:bg-slate-950/40">
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        Nenhum item adicionado à mala ou documentos ainda.
                      </p>
                    </div>
                  ) : (
                    beforeTasks.map(task => {
                      const isTaskDone = Boolean(task.completed ?? task.done);
                      return (
                        <div
                          key={task.id}
                          className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                            isTaskDone
                              ? "bg-emerald-50/70 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-slate-500 dark:text-slate-400"
                              : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white hover:border-slate-300 dark:hover:border-slate-700"
                          }`}
                        >
                          <label
                            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer select-none"
                            onClick={e => {
                              e.preventDefault();
                              handleToggleChecklistTask(task.id);
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isTaskDone}
                              onChange={() => {}}
                              className="sr-only"
                            />
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center transition-all shrink-0 ${
                                isTaskDone
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "border-2 border-slate-400 dark:border-slate-500 group-hover:border-indigo-500 bg-white dark:bg-slate-800"
                              }`}
                            >
                              {isTaskDone && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span
                              className={`text-xs font-semibold break-words transition-all ${
                                isTaskDone
                                  ? "line-through text-emerald-800/70 dark:text-emerald-400/80"
                                  : "text-slate-800 dark:text-slate-100"
                              }`}
                            >
                              {task.text}
                            </span>
                          </label>

                          <button
                            type="button"
                            onClick={() => handleDeleteChecklistTask(task.id)}
                            className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0 ml-2"
                            title="Excluir item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Coluna 2: Roteiro / Programação & Horários */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                        Roteiro / Programação & Horários
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        Horários de check-in (14h), saída do ônibus (dia 26), horários de shows
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-400/30">
                    {duringTasks.filter(t => Boolean(t.completed ?? t.done)).length}/{duringTasks.length}
                  </span>
                </div>

                {/* Form Adicionar na Coluna 2 */}
                <form onSubmit={e => handleAddChecklistTask(e, "during")} className="flex gap-2">
                  <input
                    type="text"
                    value={newDuringTaskText}
                    onChange={e => setNewDuringTaskText(e.target.value)}
                    placeholder="Adicionar programação (ex: Check-in Hotel 14h, Saída Ônibus dia 26)..."
                    className="flex-1 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1 shrink-0 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </form>

                {/* Lista da Coluna 2 */}
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {duringTasks.length === 0 ? (
                    <div className="py-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white/50 dark:bg-slate-950/40">
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        Nenhum horário ou evento programado ainda.
                      </p>
                    </div>
                  ) : (
                    duringTasks.map(task => {
                      const isTaskDone = Boolean(task.completed ?? task.done);
                      return (
                        <div
                          key={task.id}
                          className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                            isTaskDone
                              ? "bg-emerald-50/70 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-slate-500 dark:text-slate-400"
                              : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white hover:border-slate-300 dark:hover:border-slate-700"
                          }`}
                        >
                          <label
                            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer select-none"
                            onClick={e => {
                              e.preventDefault();
                              handleToggleChecklistTask(task.id);
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isTaskDone}
                              onChange={() => {}}
                              className="sr-only"
                            />
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center transition-all shrink-0 ${
                                isTaskDone
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "border-2 border-slate-400 dark:border-slate-500 group-hover:border-purple-500 bg-white dark:bg-slate-800"
                              }`}
                            >
                              {isTaskDone && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span
                              className={`text-xs font-semibold break-words transition-all ${
                                isTaskDone
                                  ? "line-through text-emerald-800/70 dark:text-emerald-400/80"
                                  : "text-slate-800 dark:text-slate-100"
                              }`}
                            >
                              {task.text}
                            </span>
                          </label>

                          <button
                            type="button"
                            onClick={() => handleDeleteChecklistTask(task.id)}
                            className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0 ml-2"
                            title="Excluir item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
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
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Novo Projeto de Viagem / Evento</h3>
              <button onClick={() => setIsNewProjectModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Projeto / Viagem *
                </label>
                <input
                  type="text"
                  required
                  value={newProjectTitle}
                  onChange={e => setNewProjectTitle(e.target.value)}
                  placeholder="Ex: Viagem Imagine Legend, Férias de Verão"
                  className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Data de Início
                  </label>
                  <input
                    type="date"
                    value={newProjectStartDate}
                    onChange={e => setNewProjectStartDate(e.target.value)}
                    className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Data de Fim
                  </label>
                  <input
                    type="date"
                    value={newProjectEndDate}
                    onChange={e => setNewProjectEndDate(e.target.value)}
                    className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Status Inicial
                </label>
                <select
                  value={newProjectStatus}
                  onChange={e => setNewProjectStatus(e.target.value)}
                  className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white cursor-pointer"
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

      {/* ── 8. MODAL DE CONVERSÃO EM DESPESA (LANÇAR COM DÉBITO AUTOMÁTICO) ─── */}
      <ConvertToExpenseModal
        isOpen={!!convertModalItem}
        onClose={() => setConvertModalItem(null)}
        onSuccess={() => loadData()}
        item={convertModalItem}
      />

    </div>
  );
}
