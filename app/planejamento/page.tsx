"use client";

import React, { useState, useEffect } from "react";
import {
  Plane,
  Calendar,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  ExternalLink,
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
  RotateCcw,
  Luggage,
  Compass,
  ArrowUpRight
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
    title: "Hospedagem",
    colorClass: "text-blue-600 dark:text-blue-400",
    badgeBg: "bg-blue-50 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300"
  },
  "Transporte": {
    icon: "🚌",
    title: "Transporte",
    colorClass: "text-amber-600 dark:text-amber-400",
    badgeBg: "bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300"
  },
  "Ingressos / Eventos": {
    icon: "🎟️",
    title: "Ingressos / Eventos",
    colorClass: "text-purple-600 dark:text-purple-400",
    badgeBg: "bg-purple-50 dark:bg-purple-500/15 border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-300"
  },
  "Gastos no Local": {
    icon: "🍔",
    title: "Gastos no Local",
    colorClass: "text-rose-600 dark:text-rose-400",
    badgeBg: "bg-rose-50 dark:bg-rose-500/15 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300"
  },
  "Outros Gastos": {
    icon: "🎒",
    title: "Outros Gastos",
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

  // Modal de Novo Item (Substitui o formulário aberto fixo)
  const [isNewItemModalOpen, setIsNewItemModalOpen]       = useState(false);
  const [newItemDesc, setNewItemDesc]                     = useState("");
  const [newItemEstimated, setNewItemEstimated]           = useState<number | "">("");
  const [newItemNotes, setNewItemNotes]                   = useState("");
  const [newItemCategory, setNewItemCategory]             = useState("Gastos no Local");
  const [isAddingItem, setIsAddingItem]                   = useState(false);

  // Modal de Edição de Item
  const [editingItem, setEditingItem]                     = useState<EventItem | null>(null);
  const [editItemDesc, setEditItemDesc]                   = useState("");
  const [editItemEstimated, setEditItemEstimated]         = useState<number | "">("");
  const [editItemPaid, setEditItemPaid]                   = useState(false);
  const [editItemPaidAmount, setEditItemPaidAmount]       = useState<number | "">("");
  const [editItemNotes, setEditItemNotes]                 = useState("");
  const [editItemCategory, setEditItemCategory]           = useState("Gastos no Local");

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
    const confirmed = await showConfirm(`Tem certeza que deseja excluir a viagem "${activeProject.title}"?`, {
      title: "Excluir Viagem",
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
      showAlert("Erro ao excluir viagem.", { variant: "error" });
    }
  };

  // Adicionar Item ao Orçamento via Modal
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !newItemDesc.trim() || !newItemEstimated) return;

    setIsAddingItem(true);
    try {
      await createEventItemAction(activeProject.id, {
        description: newItemDesc.trim(),
        minAmount: null,
        maxAmount: Number(newItemEstimated),
        notes: newItemNotes.trim(),
        category: newItemCategory,
      });

      setNewItemDesc("");
      setNewItemEstimated("");
      setNewItemNotes("");
      setNewItemCategory("Gastos no Local");
      setIsNewItemModalOpen(false);
      await loadData();
    } catch (err) {
      console.error(err);
      showAlert("Erro ao adicionar despesa.", { variant: "error" });
    } finally {
      setIsAddingItem(false);
    }
  };

  // Alternar Status de Pago diretamente no Checkbox
  const handleTogglePaid = async (item: EventItem) => {
    const newIsPaid = !item.isPaid;
    // Se marcou como pago e não tinha valor, adota o valor estimado automaticamente
    const newPaidAmount = newIsPaid
      ? (item.paidAmount > 0 ? item.paidAmount : item.maxAmount)
      : 0;

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
    field: "maxAmount" | "paidAmount",
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
            const updated = { ...i, [field]: numericVal };
            if (field === "paidAmount" && numericVal > 0) {
              updated.isPaid = true;
            }
            return updated;
          })
        };
      })
    );

    try {
      const payload: any = { [field]: numericVal };
      if (field === "paidAmount" && numericVal > 0) {
        payload.isPaid = true;
      }
      await updateEventItemAction(itemId, payload);
    } catch (err) {
      console.error("Erro ao atualizar valor do item:", err);
    }
  };

  // Abrir Modal de Edição do Item
  const openEditItemModal = (item: EventItem) => {
    setEditingItem(item);
    setEditItemDesc(item.description);
    setEditItemEstimated(item.maxAmount);
    setEditItemPaid(item.isPaid);
    setEditItemPaidAmount(item.isPaid ? (item.paidAmount > 0 ? item.paidAmount : item.maxAmount) : "");
    setEditItemNotes(item.notes);
    setEditItemCategory(item.category || detectCategory(item.description, item.notes));
  };

  // Salvar Edição do Item
  const handleSaveItemEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editItemDesc.trim() || !editItemEstimated) return;
    try {
      const paidVal = editItemPaid ? Number(editItemPaidAmount || editItemEstimated) : 0;
      await updateEventItemAction(editingItem.id, {
        description: editItemDesc.trim(),
        maxAmount: Number(editItemEstimated),
        minAmount: null,
        paidAmount: paidVal,
        isPaid: editItemPaid,
        notes: editItemNotes.trim(),
        category: editItemCategory,
      });
      setEditingItem(null);
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

  // Handlers para Checklist Interativo
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

  // ── REGRAS DE NEGÓCIO E CÁLCULOS MATEMÁTICOS SIMPLIFICADOS ──────────
  const items = activeProject?.items || [];
  
  // 1. Custo Total Previsto: soma dos valores estimados
  const custoTotalPrevisto = items.reduce((sum, i) => sum + Number(i.maxAmount || 0), 0);

  // 2. Total Já Pago: soma estritamente dos valores liquidados
  const totalJaPago = items
    .filter((i: EventItem) => i.isPaid)
    .reduce((sum, i) => sum + Number(i.paidAmount > 0 ? i.paidAmount : i.maxAmount), 0);

  // 3. Restante a Pagar: Total Previsto - Total Já Pago
  const restanteAPagar = Math.max(0, custoTotalPrevisto - totalJaPago);

  // Percentual Pago para mini-barra de progresso embutida no card
  const percentualPago = custoTotalPrevisto > 0
    ? Math.min(100, Math.round((totalJaPago / custoTotalPrevisto) * 100))
    : 0;

  const totalItens = items.length;
  const itensPagos = items.filter(i => i.isPaid).length;

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
      
      {/* ── 1. HEADER DA PÁGINA & SELEÇÃO DE VIAGEM ─────────────────────────── */}
      <div className="card-glow p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-400/30 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0 shadow-xs">
            <Plane className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">
                Planejamento de Viagens & Eventos
              </h1>
              {activeProject && (
                <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-400/30 rounded-full shadow-2xs">
                  {activeProject.title}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Controle direto de custos previstos, pagamentos realizados e pendências.
            </p>
          </div>
        </div>

        {/* Seleção de Projetos e Ações */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <select
              value={selectedProjectId}
              onChange={e => handleSelectProject(e.target.value)}
              className="w-full appearance-none rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 pr-8 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs"
            >
              <option value="" className="bg-white dark:bg-slate-900 text-slate-500">Selecione uma Viagem...</option>
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
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0"
            title="Cadastrar nova viagem"
          >
            <Plus className="w-4 h-4 text-indigo-500" />
            <span className="hidden sm:inline">Nova Viagem</span>
          </button>

          {activeProject && (
            <button
              onClick={() => setIsNewItemModalOpen(true)}
              className="btn-primary-glow py-2.5 px-4 text-xs font-black flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>+ Adicionar Despesa</span>
            </button>
          )}
        </div>
      </div>

      {/* ── ESTADO VAZIO (NENHUM PROJETO SELECIONADO) ────────────────────── */}
      {!activeProject && (
        <div className="card-glow p-12 text-center flex flex-col items-center justify-center gap-4 bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-slate-200/80 dark:border-white/[0.08] rounded-2xl shadow-sm dark:shadow-lg dark:shadow-black/20 my-6">
          <div className="p-4 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 rounded-2xl border border-indigo-200 dark:border-indigo-400/30">
            <Plane className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">Selecione ou Crie uma Viagem</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 max-w-md">
              Escolha uma viagem no menu acima para gerenciar os custos ou clique no botão abaixo para planejar um novo destino.
            </p>
          </div>
          <button
            onClick={() => setIsNewProjectModalOpen(true)}
            className="btn-primary-glow py-2.5 px-5 text-xs mt-2"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>+ Nova Viagem</span>
          </button>
        </div>
      )}

      {/* ── 2. DADOS DO PROJETO ATIVO ────────────────────────────────────────── */}
      {activeProject && (
        <div className="space-y-6">
          
          {/* Header Unificado do Projeto Selecionado */}
          <div className="card-glow p-5 sm:p-6 space-y-4">
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              
              {/* Título, Status e Datas */}
              <div className="flex-1 space-y-2.5">
                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    onBlur={e => handleUpdateProjectHeader("title", e.target.value)}
                    placeholder="Nome da Viagem"
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

                {/* Período e Duração */}
                <div className="flex items-center gap-2.5 flex-wrap text-xs">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 font-bold">
                    <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>Início:</span>
                    <input
                      type="date"
                      value={editStartDate}
                      onChange={e => {
                        setEditStartDate(e.target.value);
                        handleUpdateProjectHeader("startDate", e.target.value);
                      }}
                      className="bg-transparent border-none text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                    />
                    <span className="text-slate-400">até</span>
                    <span>Fim:</span>
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
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-400/30 rounded-xl font-extrabold shadow-2xs">
                      <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>{tripDays} {tripDays === 1 ? "dia" : "dias"}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Ações da Viagem */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsNewItemModalOpen(true)}
                  className="btn-primary-glow py-2 px-3.5 text-xs font-bold flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-white" />
                  <span>Nova Despesa</span>
                </button>
                <button
                  onClick={handleDeleteProject}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
                  title="Excluir Viagem"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── 3 CARDS RESUMO OBJETIVOS (SEM DUPLICAÇÕES) ───────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              
              {/* Card 1: CUSTO TOTAL PREVISTO */}
              <div className="card-glow p-5 bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-slate-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-lg dark:shadow-black/20 flex flex-col justify-between space-y-3 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                    Custo Total Previsto
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-500/30">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight font-tnum">
                    {formatCurrency(custoTotalPrevisto)}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-1">
                    Soma de todas as despesas estimadas ({totalItens} {totalItens === 1 ? "item" : "itens"})
                  </p>
                </div>
              </div>

              {/* Card 2: TOTAL JÁ PAGO com mini-barra de progresso embutida */}
              <div className="card-glow p-5 bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-slate-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-lg dark:shadow-black/20 flex flex-col justify-between space-y-3 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                    Total Já Pago
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-500/30">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-tnum">
                      {formatCurrency(totalJaPago)}
                    </p>
                    <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/30">
                      {percentualPago}% pago
                    </span>
                  </div>
                  {/* Mini-barra de progresso embutida */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-emerald-500"
                      style={{ width: `${percentualPago}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                    {itensPagos} de {totalItens} {totalItens === 1 ? "item quitado" : "itens quitados"}
                  </p>
                </div>
              </div>

              {/* Card 3: RESTANTE A PAGAR */}
              <div className="card-glow p-5 bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-slate-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-lg dark:shadow-black/20 flex flex-col justify-between space-y-3 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                    Restante a Pagar
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200 dark:border-rose-500/30">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight font-tnum">
                    {formatCurrency(restanteAPagar)}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-1">
                    Falta quitar {totalItens - itensPagos} {totalItens - itensPagos === 1 ? "despesa" : "despesas"} até a viagem
                  </p>
                </div>
              </div>

            </div>

          </div>

          {/* ── 3. TABELA DE ORÇAMENTO ENXUTA E OBJETIVA ─────────────────────────── */}
          <div className="card-glow p-5 sm:p-6 space-y-4">
            
            {/* Header da Tabela com Abas de Filtros Rápidos e Botão + Adicionar Despesa */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Despesas da Viagem
                </h2>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  Marque o check para registrar como pago ou edite valores com um clique
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Abas Rápidas: Todos / Pendentes / Pagos */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800">
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

                <button
                  onClick={() => setIsNewItemModalOpen(true)}
                  className="btn-primary-glow py-1.5 px-3 text-xs font-black flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5 text-white" />
                  <span>Novo Item</span>
                </button>
              </div>
            </div>

            {/* Tabela Direta e Limpa (5 Colunas) */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-slate-900 text-slate-600 dark:text-slate-300 uppercase font-black tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-3 w-12 text-center">Status</th>
                    <th className="py-3 px-4">Item / Descrição</th>
                    <th className="py-3 px-4 text-right w-40 text-indigo-700 dark:text-indigo-400">Valor Estimado</th>
                    <th className="py-3 px-4 text-right w-40 text-emerald-700 dark:text-emerald-400">Valor Pago</th>
                    <th className="py-3 px-4 text-center w-32">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <p>Nenhuma despesa encontrada no filtro &quot;{filterTab}&quot;.</p>
                          <button
                            onClick={() => setIsNewItemModalOpen(true)}
                            className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                          >
                            + Adicionar primeira despesa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    itemsByCategory.map(group => (
                      <React.Fragment key={group.category}>
                        {/* Subtítulo da Categoria */}
                        <tr className="bg-slate-50/80 dark:bg-slate-900/90 border-t-2 border-b border-slate-200 dark:border-slate-800">
                          <td colSpan={5} className="py-2 px-4">
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
                                Subtotal Previsto:{" "}
                                <span className="font-black text-slate-800 dark:text-slate-200 font-tnum">
                                  {formatCurrency(group.items.reduce((s, i) => s + i.maxAmount, 0))}
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>

                        {/* Linhas dos Itens */}
                        {group.items.map((item: EventItem) => (
                          <tr
                            key={item.id}
                            className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                              item.isPaid ? "bg-emerald-50/30 dark:bg-emerald-500/5" : ""
                            }`}
                          >
                            {/* Status de Pagamento (Check) */}
                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleTogglePaid(item)}
                                className={`inline-flex items-center justify-center p-1.5 rounded-xl border transition-all cursor-pointer ${
                                  item.isPaid
                                    ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-400/50 shadow-2xs"
                                    : "bg-slate-100 dark:bg-slate-800/60 text-slate-400 border-slate-200 dark:border-slate-700 hover:text-emerald-600 dark:hover:text-emerald-400"
                                }`}
                                title={item.isPaid ? "Desmarcar Pago (voltar para pendente)" : "Marcar como Pago"}
                              >
                                <CheckCircle2 className={`w-4 h-4 ${item.isPaid ? "text-emerald-600 dark:text-emerald-300" : "text-slate-400"}`} />
                              </button>
                            </td>

                            {/* Item / Descrição com ícone e notas */}
                            <td className="py-3 px-4">
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                                    {item.description}
                                  </span>

                                  {/* Badges de Status */}
                                  {item.transactionId ? (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-400/30">
                                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                                      No Extrato
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

                                {item.notes && (
                                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 max-w-md truncate">
                                    <span className="truncate">{item.notes}</span>
                                    {item.notes.startsWith("http") && (
                                      <a
                                        href={item.notes}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 inline-flex items-center gap-0.5 shrink-0"
                                        title="Abrir Link"
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* VALOR ESTIMADO */}
                            <td className="py-3 px-4 text-right">
                              <EditableCurrencyCell
                                value={item.maxAmount}
                                onChange={valStr => handleItemValueChange(item.id, "maxAmount", valStr)}
                                colorClass="text-indigo-600 dark:text-indigo-400"
                                placeholder="0,00"
                              />
                            </td>

                            {/* VALOR PAGO: Se pago, exibe o valor; se pendente, traço (—) */}
                            <td className="py-3 px-4 text-right">
                              <EditableCurrencyCell
                                value={item.isPaid ? (item.paidAmount > 0 ? item.paidAmount : item.maxAmount) : null}
                                onChange={valStr => handleItemValueChange(item.id, "paidAmount", valStr)}
                                colorClass="text-emerald-600 dark:text-emerald-400"
                                placeholder="0,00"
                                disabled={!item.isPaid}
                                emptyText="—"
                              />
                            </td>

                            {/* AÇÕES (Lançar, Editar, Excluir) */}
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                {!item.transactionId && (
                                  <button
                                    onClick={() => setConvertModalItem(item)}
                                    className="px-2 py-1 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-300/40 dark:border-indigo-400/30 rounded-lg transition-all text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                                    title="Lançar com débito automático no extrato ou cartão"
                                  >
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                    <span>Lançar</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => openEditItemModal(item)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                  title="Editar Despesa"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                  title="Excluir Despesa"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))
                  )}
                </tbody>

                {items.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100 dark:bg-slate-900 font-extrabold text-slate-900 dark:text-white border-t-2 border-slate-200 dark:border-slate-800">
                      <td colSpan={2} className="py-3.5 px-4 uppercase text-[10px] tracking-wider text-slate-600 dark:text-slate-400">
                        Totais ({items.length} {items.length === 1 ? "item" : "itens"})
                      </td>
                      <td className="py-3.5 px-4 text-right text-indigo-600 dark:text-indigo-400 font-black font-tnum text-sm">
                        {formatCurrency(custoTotalPrevisto)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-emerald-600 dark:text-emerald-400 font-black font-tnum text-sm">
                        {formatCurrency(totalJaPago)}
                      </td>
                      <td className="py-3.5 px-4 text-center text-xs text-rose-600 dark:text-rose-400 font-black font-tnum">
                        Falta: {formatCurrency(restanteAPagar)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* ── 4. CHECKLIST INTERATIVO (ANTES DE SAIR VS ROTEIRO) ───────────── */}
          <div className="card-glow p-5 sm:p-6 space-y-6">
            
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
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
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
                              ? "border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400"
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
                                  ? "line-through text-emerald-600 dark:text-emerald-400"
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
                        Horários de check-in (14h), saída do ônibus, eventos e passeios
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
                    placeholder="Adicionar programação (ex: Check-in Hotel 14h, Saída Ônibus)..."
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
                              ? "border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400"
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
                                  ? "line-through text-emerald-600 dark:text-emerald-400"
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
                rows={4}
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                placeholder="Digite aqui observações do roteiro, horários de voo, códigos de reserva, dicas de passeios ou lembretes importantes..."
                className="w-full rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all leading-relaxed"
              />
            </div>

          </div>

        </div>
      )}

      {/* ── MODAL ADICIONAR DESPESA ─────────────────────────────────────────── */}
      {isNewItemModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 space-y-5 text-slate-900 dark:text-white">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Adicionar Despesa</h3>
              </div>
              <button 
                onClick={() => setIsNewItemModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4">
              {/* Categoria */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Categoria
                </label>
                <select
                  value={newItemCategory}
                  onChange={e => setNewItemCategory(e.target.value)}
                  className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Hospedagem">🏨 Hospedagem</option>
                  <option value="Transporte">🚌 Transporte</option>
                  <option value="Ingressos / Eventos">🎟️ Ingressos / Eventos</option>
                  <option value="Gastos no Local">🍔 Gastos no Local</option>
                  <option value="Outros Gastos">🎒 Outros Gastos</option>
                </select>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Descrição do Item *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newItemDesc}
                  onChange={e => setNewItemDesc(e.target.value)}
                  placeholder="Ex: Hotel Ibis, Passagem aérea, Ingresso VIP..."
                  className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Valor Estimado */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Valor Estimado (R$) *
                </label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={newItemEstimated}
                  onChange={e => setNewItemEstimated(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0,00"
                  className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-tnum"
                />
              </div>

              {/* Anotações / Link */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Anotações / Link (Opcional)
                </label>
                <input
                  type="text"
                  value={newItemNotes}
                  onChange={e => setNewItemNotes(e.target.value)}
                  placeholder="Link da reserva, observação ou código..."
                  className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewItemModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isAddingItem}
                  className="btn-primary-glow flex-1 py-2.5 text-xs font-black disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {isAddingItem ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4 text-white" />
                      <span>Adicionar Despesa</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL EDITAR DESPESA ───────────────────────────────────────────── */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 space-y-5 text-slate-900 dark:text-white">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Editar Despesa</h3>
              </div>
              <button 
                onClick={() => setEditingItem(null)} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItemEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Categoria
                </label>
                <select
                  value={editItemCategory}
                  onChange={e => setEditItemCategory(e.target.value)}
                  className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Hospedagem">🏨 Hospedagem</option>
                  <option value="Transporte">🚌 Transporte</option>
                  <option value="Ingressos / Eventos">🎟️ Ingressos / Eventos</option>
                  <option value="Gastos no Local">🍔 Gastos no Local</option>
                  <option value="Outros Gastos">🎒 Outros Gastos</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Descrição *
                </label>
                <input
                  type="text"
                  required
                  value={editItemDesc}
                  onChange={e => setEditItemDesc(e.target.value)}
                  className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Valor Estimado (R$) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={editItemEstimated}
                    onChange={e => setEditItemEstimated(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-tnum"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Valor Pago (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editItemPaidAmount}
                    onChange={e => {
                      const val = e.target.value === "" ? "" : Number(e.target.value);
                      setEditItemPaidAmount(val);
                      if (Number(val) > 0) setEditItemPaid(true);
                    }}
                    placeholder="0,00"
                    className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-tnum"
                  />
                </div>
              </div>

              {/* Status de Pago */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editItemPaidCheckbox"
                  checked={editItemPaid}
                  onChange={e => {
                    const checked = e.target.checked;
                    setEditItemPaid(checked);
                    if (checked && (!editItemPaidAmount || Number(editItemPaidAmount) === 0)) {
                      setEditItemPaidAmount(editItemEstimated);
                    }
                  }}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="editItemPaidCheckbox" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                  Marcar como Pago (quitado)
                </label>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Anotações / Link
                </label>
                <input
                  type="text"
                  value={editItemNotes}
                  onChange={e => setEditItemNotes(e.target.value)}
                  placeholder="Link da reserva ou observação..."
                  className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary-glow flex-1 py-2.5 text-xs font-black flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4 text-white" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL NOVO PROJETO ─────────────────────────────────────────────── */}
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
                  autoFocus
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

      {/* ── MODAL DE CONVERSÃO EM DESPESA (LANÇAR COM DÉBITO AUTOMÁTICO) ─── */}
      <ConvertToExpenseModal
        isOpen={!!convertModalItem}
        onClose={() => setConvertModalItem(null)}
        onSuccess={() => loadData()}
        item={convertModalItem}
      />

    </div>
  );
}
