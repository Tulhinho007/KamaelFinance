"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Building2,
  Wallet,
  Receipt,
  Plus,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  X,
  Search,
  Check,
  Repeat,
  Pencil,
  Trash2,
  Copy,
  MoreVertical,
  Zap,
  RotateCcw,
  RotateCw,
  Sparkles,
  Layers,
  CreditCard,
  AlertCircle,
  CalendarRange,
  Wifi,
  Activity,
  Calendar,
} from "lucide-react";
import { usePeriod } from "@/components/period-context";
import { useModal } from "@/components/ui/custom-dialog-provider";
import {
  getGestaoCaixaPageDataAction,
  createNewCard,
  createBankAccountMovementAction,
  createBatchWeeklyDebitAction,
  updateRealizedBankMovementAction,
  deleteCardPurchase,
  createCommitmentAction,
  payCommitmentAction,
  payBatchCommitmentsAction,
  updateCommitmentAction,
  deleteCommitmentAction,
  undoCommitmentPaymentAction,
  duplicateCommitmentToNextMonthAction,
} from "@/lib/actions";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatBRL = brl;

const MONTH_NAMES_LIST = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const getBillIcon = (title: string, category?: string, tipo?: string) => {
  const text = `${title || ""} ${category || ""} ${tipo || ""}`.toLowerCase();
  if (text.includes("wifi") || text.includes("internet") || text.includes("tim") || text.includes("claro") || text.includes("vivo") || text.includes("fibra")) {
    return Wifi;
  }
  if (text.includes("fatura") || text.includes("cartão") || text.includes("cartao") || text.includes("credit") || tipo === "FATURA_CARTAO") {
    return CreditCard;
  }
  if (text.includes("luz") || text.includes("energia") || text.includes("enel") || text.includes("cpfl") || text.includes("eletro") || text.includes("cemig") || text.includes("copel") || text.includes("zap")) {
    return Zap;
  }
  if (text.includes("treino") || text.includes("futevôlei") || text.includes("futebol") || text.includes("academia") || text.includes("esporte") || text.includes("lazer") || text.includes("crossfit") || text.includes("personal") || text.includes("natação")) {
    return Activity;
  }
  if (tipo === "ASSINATURA" || text.includes("assinatura") || text.includes("netflix") || text.includes("spotify") || text.includes("prime") || text.includes("youtube")) {
    return Zap;
  }
  return Receipt;
};

const getBankStyle = (name: string) => {
  const lower = (name || "").toLowerCase();
  if (lower.includes("santander")) {
    return { iconBg: "bg-red-600 text-white", initials: "SAN" };
  }
  if (lower.includes("nubank") || lower.includes("nu")) {
    return { iconBg: "bg-purple-600 text-white", initials: "NU" };
  }
  if (lower.includes("inter")) {
    return { iconBg: "bg-orange-500 text-white", initials: "INT" };
  }
  if (lower.includes("itaú") || lower.includes("itau")) {
    return { iconBg: "bg-amber-600 text-white", initials: "ITA" };
  }
  if (lower.includes("bradesco")) {
    return { iconBg: "bg-rose-600 text-white", initials: "BRA" };
  }
  if (lower.includes("caixa")) {
    return { iconBg: "bg-blue-600 text-white", initials: "CEF" };
  }
  if (lower.includes("brasil") || lower.includes("bb")) {
    return { iconBg: "bg-yellow-500 text-blue-950", initials: "BB" };
  }
  if (lower.includes("c6")) {
    return { iconBg: "bg-zinc-800 text-white", initials: "C6" };
  }
  if (lower.includes("btg")) {
    return { iconBg: "bg-slate-900 text-white", initials: "BTG" };
  }
  if (lower.includes("mercado") || lower.includes("mp")) {
    return { iconBg: "bg-sky-500 text-white", initials: "MP" };
  }
  if (lower.includes("picpay")) {
    return { iconBg: "bg-emerald-600 text-white", initials: "PIC" };
  }
  if (lower.includes("sicoob") || lower.includes("sicredi")) {
    return { iconBg: "bg-teal-700 text-white", initials: "SIC" };
  }

  const initials = (name || "CC")
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 3)
    .join("")
    .toUpperCase();
  return { iconBg: "bg-indigo-600 text-white", initials: initials || "CON" };
};

export type AgendaPeriodFilter = "ALL" | "CURRENT_MONTH" | "NEXT_MONTH" | "CUSTOM" | "DATE_RANGE";

export default function GestaoCaixaContasPage() {
  const { selectedYear, prevYear, nextYear, goToCurrentYear } = usePeriod();
  const { showAlert } = useModal();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"TODOS" | "AGENDA" | "EXTRATO">("TODOS");

  // Dados consolidados
  const [accounts, setAccounts] = useState<any[]>([]);
  const [realizedTransactions, setRealizedTransactions] = useState<any[]>([]);
  const [pendingCommitments, setPendingCommitments] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [contasBancarias, setContasBancarias] = useState<any[]>([]);
  const [cartoesCredito, setCartoesCredito] = useState<any[]>([]);
  const [totals, setTotals] = useState({
    totalRealBalance: 0,
    totalReceitasAno: 0,
    totalRealizedIncome: 0,
    totalPendingIncome: 0,
    receitasParaProjecao: 0,
    totalPendentesAno: 0,
    saldoProjetado: 0,
    pendingCount: 0,
    realizedCount: 0,
  });

  // Filtros de Extrato
  const [extratoAccountFilter, setExtratoAccountFilter] = useState<string>("ALL");
  const [extratoSearch, setExtratoSearch] = useState("");
  const [showAllMovements, setShowAllMovements] = useState(false);

  // Filtros de Agenda a Pagar (Padrão: Mês Atual)
  const [agendaPeriodFilter, setAgendaPeriodFilter] = useState<AgendaPeriodFilter>("CURRENT_MONTH");
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [customFilterMonth, setCustomFilterMonth] = useState<number>(new Date().getMonth() + 1);
  const [customFilterYear, setCustomFilterYear] = useState<number>(selectedYear || new Date().getFullYear());
  const [agendaSearch, setAgendaSearch] = useState("");
  const [selectedCommitmentIds, setSelectedCommitmentIds] = useState<string[]>([]);
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

  // Modais de Ação Rápida
  const [newCommitmentModalOpen, setNewCommitmentModalOpen] = useState(false);
  const [newMovementModalOpen, setNewMovementModalOpen] = useState(false);
  const [newAccountModalOpen, setNewAccountModalOpen] = useState(false);

  // Modal de Baixa / Pagamento
  const [payCommitmentItem, setPayCommitmentItem] = useState<any | null>(null);
  const [payingCommitment, setPayingCommitment] = useState(false);
  const [baixaForma, setBaixaForma] = useState<"SALDO_CONTA" | "DEBITO_AUTOMATICO" | "PIX" | "CARTAO_CREDITO" | "DINHEIRO">("SALDO_CONTA");
  const [baixaContaId, setBaixaContaId] = useState("");
  const [baixaCartaoId, setBaixaCartaoId] = useState("");
  const [baixaData, setBaixaData] = useState(new Date().toISOString().split("T")[0]);

  // Modal de Baixa em Lote
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [payingBatch, setPayingBatch] = useState(false);
  const [batchBaixaForma, setBatchBaixaForma] = useState<"SALDO_CONTA" | "DEBITO_AUTOMATICO" | "PIX" | "CARTAO_CREDITO" | "DINHEIRO">("SALDO_CONTA");
  const [batchBaixaContaId, setBatchBaixaContaId] = useState("");
  const [batchBaixaCartaoId, setBatchBaixaCartaoId] = useState("");
  const [batchBaixaData, setBatchBaixaData] = useState(new Date().toISOString().split("T")[0]);

  // Form: Novo Boleto / Assinatura
  const [savingCommitment, setSavingCommitment] = useState(false);
  const [newCommitmentDesc, setNewCommitmentDesc] = useState("");
  const [newCommitmentAmount, setNewCommitmentAmount] = useState("");
  const [newCommitmentDueDate, setNewCommitmentDueDate] = useState("");
  const [newCommitmentTipo, setNewCommitmentTipo] = useState<"BOLETO" | "ASSINATURA">("BOLETO");
  const [newCommitmentRecorrencia, setNewCommitmentRecorrencia] = useState<"MENSAL" | "UNICO">("MENSAL");
  const [newCommitmentCompMonth, setNewCommitmentCompMonth] = useState<number>(new Date().getMonth() + 1);
  const [newCommitmentCompYear, setNewCommitmentCompYear] = useState<number>(selectedYear || 2026);

  // Form: Movimentação Avulsa (Pix/Depósito/Débito)
  const [savingMovement, setSavingMovement] = useState(false);
  const [movWalletId, setMovWalletId] = useState("");
  const [movTipo, setMovTipo] = useState<"ENTRADA" | "SAIDA">("SAIDA");
  const [movDesc, setMovDesc] = useState("");
  const [movValor, setMovValor] = useState<number | "">("");
  const [movData, setMovData] = useState(new Date().toISOString().split("T")[0]);
  const [movMetodo, setMovMetodo] = useState("PIX");

  // Form: Nova Conta Bancária
  const [savingAccount, setSavingAccount] = useState(false);
  const [accBankName, setAccBankName] = useState("");
  const [accHolder, setAccHolder] = useState("");
  const [accInitialBalance, setAccInitialBalance] = useState<number | "">("");

  // Modal: Fechamento em Lote / Semanal (Débito & Pix)
  const [batchWeeklyModalOpen, setBatchWeeklyModalOpen] = useState(false);
  const [batchSaving, setBatchSaving] = useState(false);
  const [batchWalletId, setBatchWalletId] = useState("");
  const [batchPeriodType, setBatchPeriodType] = useState<"S1" | "S2" | "S3" | "S4" | "CUSTOM">("S1");
  const [batchMonth, setBatchMonth] = useState<number>(new Date().getMonth() + 1);
  const [batchYear, setBatchYear] = useState<number>(selectedYear || 2026);
  const [batchStartDate, setBatchStartDate] = useState("");
  const [batchEndDate, setBatchEndDate] = useState("");
  const [batchPaymentMethod, setBatchPaymentMethod] = useState<"PIX" | "DEBITO">("PIX");
  const [batchAmount, setBatchAmount] = useState<number | "">("");
  const [batchCategory, setBatchCategory] = useState("Gastos Formiga / Pix & Débito Semanal");
  const [batchDescription, setBatchDescription] = useState("");
  const [batchNotes, setBatchNotes] = useState("");

  // Modal: Editar Movimentação Realizada (Extrato)
  const [editMovementItem, setEditMovementItem] = useState<any | null>(null);
  const [savingEditMovement, setSavingEditMovement] = useState(false);
  const [editMovDesc, setEditMovDesc] = useState("");
  const [editMovAmount, setEditMovAmount] = useState<number | "">("");
  const [editMovDate, setEditMovDate] = useState("");
  const [editMovWalletId, setEditMovWalletId] = useState("");
  const [editMovCategory, setEditMovCategory] = useState("");
  const [editMovMetodo, setEditMovMetodo] = useState("DEBITO");
  const [editMovNotes, setEditMovNotes] = useState("");

  // Modal: Excluir Movimentação Realizada (Extrato)
  const [movementToDelete, setMovementToDelete] = useState<any | null>(null);
  const [deletingMovement, setDeletingMovement] = useState(false);

  // Modal: Editar Compromisso
  const [editItem, setEditItem] = useState<any | null>(null);
  const [editingCommitment, setEditingCommitment] = useState(false);
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editTipo, setEditTipo] = useState<"BOLETO" | "ASSINATURA">("BOLETO");
  const [editRecorrencia, setEditRecorrencia] = useState<"MENSAL" | "UNICO">("MENSAL");
  const [editCompMonth, setEditCompMonth] = useState<number>(new Date().getMonth() + 1);
  const [editCompYear, setEditCompYear] = useState<number>(selectedYear || 2026);
  const [editWalletId, setEditWalletId] = useState<string>("");

  // Modal: Excluir Compromisso
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);
  const [deletingCommitment, setDeletingCommitment] = useState(false);

  // Carregar Dados Consolidados
  const loadData = async (active = true) => {
    try {
      setLoading(true);
      const data = await getGestaoCaixaPageDataAction(selectedYear);
      if (!active) return;
      setAccounts(data.accounts || []);
      setRealizedTransactions(data.realizedTransactions || []);
      setPendingCommitments(data.pendingCommitments || []);
      const allList = (data.allCommitments && data.allCommitments.length > 0)
        ? data.allCommitments
        : (data.pendingCommitments || []);
      setBills(allList);
      setContasBancarias(data.contasBancarias || []);
      setCartoesCredito(data.cartoesCredito || []);
      setTotals(data.totals);

      if (data.accounts?.length > 0 && !movWalletId) {
        setMovWalletId(data.accounts[0].id);
      }
      const initialBankAccounts = (data.accounts?.length > 0 ? data.accounts : data.contasBancarias) || [];
      if (initialBankAccounts.length > 0) {
        setBaixaContaId((prev) => prev || initialBankAccounts[0].id);
        setBatchBaixaContaId((prev) => prev || initialBankAccounts[0].id);
      }
      if (data.cartoesCredito?.length > 0) {
        setBaixaCartaoId((prev) => prev || data.cartoesCredito[0].id);
        setBatchBaixaCartaoId((prev) => prev || data.cartoesCredito[0].id);
      }
    } catch (err) {
      console.error("Erro ao carregar Gestão de Caixa & Contas:", err);
    } finally {
      if (active) setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    loadData(active);
    return () => {
      active = false;
    };
  }, [selectedYear]);

  // Fechar menus ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => setActiveActionMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // ── Filtro de Competência / Período da Agenda de Contas ─────────────────
  const now = new Date();
  const currentMonthNum = now.getMonth() + 1;
  const currentYearNum = now.getFullYear();
  const currentMonthName = MONTH_NAMES_LIST[currentMonthNum - 1] || "Outubro";
  const currentPeriodLabel = `${currentMonthName}/${currentYearNum}`;

  const nextMonthDate = new Date(currentYearNum, currentMonthNum, 1);
  const nextMonthNum = nextMonthDate.getMonth() + 1;
  const nextYearNum = nextMonthDate.getFullYear();
  const nextMonthName = MONTH_NAMES_LIST[nextMonthNum - 1] || "Novembro";
  const nextPeriodLabel = `${nextMonthName}/${nextYearNum}`;

  // Helper para extrair mês e ano do vencimento da conta
  const getItemDueDateParts = (item: any): { month: number; year: number } | null => {
    if (item.dueDateInput && typeof item.dueDateInput === "string") {
      const parts = item.dueDateInput.split("-");
      if (parts.length >= 2) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(y) && !isNaN(m)) return { year: y, month: m };
      }
    }
    if (item.dueDateFormatted && typeof item.dueDateFormatted === "string") {
      const parts = item.dueDateFormatted.split("/");
      if (parts.length === 3) {
        const m = parseInt(parts[1], 10);
        const y = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m)) return { year: y, month: m };
      }
    }
    if (item.dueDateRaw) {
      const d = new Date(item.dueDateRaw);
      if (!isNaN(d.getTime())) {
        return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
      }
    }
    if (item.competenceYear && item.competenceMonth) {
      return { year: Number(item.competenceYear), month: Number(item.competenceMonth) };
    }
    return null;
  };

  // Helper para obter a data ISO (YYYY-MM-DD) do item de compromisso
  const getItemDueDateIso = (item: any): string | null => {
    if (item.dueDateInput && typeof item.dueDateInput === "string") {
      return item.dueDateInput.split("T")[0];
    }
    if (item.dueDateRaw) {
      try {
        const d = new Date(item.dueDateRaw);
        if (!isNaN(d.getTime())) {
          return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
        }
      } catch {}
    }
    if (item.dueDateFormatted && typeof item.dueDateFormatted === "string") {
      const parts = item.dueDateFormatted.split("/");
      if (parts.length === 3) {
        return `${parts[2]}-${String(parts[1]).padStart(2, "0")}-${String(parts[0]).padStart(2, "0")}`;
      }
    }
    if (item.competenceYear && item.competenceMonth) {
      return `${item.competenceYear}-${String(item.competenceMonth).padStart(2, "0")}-01`;
    }
    return null;
  };

  const formatIsoToPtBr = (iso: string) => {
    if (!iso) return "";
    const parts = iso.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return iso;
  };

  const matchesAgendaPeriod = (item: any): boolean => {
    // 1. Filtro por Intervalo de Datas personalizado (De / Até)
    if (agendaPeriodFilter === "DATE_RANGE" || dataInicio || dataFim) {
      if (dataInicio || dataFim) {
        const iso = getItemDueDateIso(item);
        if (!iso) return false;
        if (dataInicio && iso < dataInicio) return false;
        if (dataFim && iso > dataFim) return false;
        return true;
      }
    }

    if (agendaPeriodFilter === "ALL") return true;
    const due = getItemDueDateParts(item);
    if (!due) return false;
    if (agendaPeriodFilter === "CURRENT_MONTH") {
      return due.month === currentMonthNum && due.year === currentYearNum;
    }
    if (agendaPeriodFilter === "NEXT_MONTH") {
      return due.month === nextMonthNum && due.year === nextYearNum;
    }
    if (agendaPeriodFilter === "CUSTOM") {
      return due.month === customFilterMonth && due.year === customFilterYear;
    }
    return true;
  };

  const activePeriodBadgeLabel = useMemo(() => {
    if (dataInicio || dataFim) {
      if (dataInicio && dataFim) {
        return `${formatIsoToPtBr(dataInicio)} à ${formatIsoToPtBr(dataFim)}`;
      }
      if (dataInicio) {
        return `A partir de ${formatIsoToPtBr(dataInicio)}`;
      }
      return `Até ${formatIsoToPtBr(dataFim)}`;
    }
    if (agendaPeriodFilter === "CURRENT_MONTH") return `Mês Atual (${currentPeriodLabel})`;
    if (agendaPeriodFilter === "NEXT_MONTH") return `Próximo Mês (${nextPeriodLabel})`;
    if (agendaPeriodFilter === "CUSTOM") {
      const mName = MONTH_NAMES_LIST[customFilterMonth - 1] || "";
      return `${mName}/${customFilterYear}`;
    }
    return `Todas as Pendências (${selectedYear})`;
  }, [dataInicio, dataFim, agendaPeriodFilter, currentPeriodLabel, nextPeriodLabel, customFilterMonth, customFilterYear, selectedYear]);

  // Contas pendentes que atendem ao período selecionado (sem o filtro textual de busca, para alimentar as métricas)
  const periodFilteredPendingCommitments = useMemo(() => {
    return pendingCommitments.filter((item) => matchesAgendaPeriod(item));
  }, [
    pendingCommitments,
    agendaPeriodFilter,
    dataInicio,
    dataFim,
    customFilterMonth,
    customFilterYear,
    currentMonthNum,
    currentYearNum,
    nextMonthNum,
    nextYearNum,
  ]);

  // Total das pendências no período filtrado
  const periodPendingTotal = useMemo(() => {
    return periodFilteredPendingCommitments.reduce((sum, it) => sum + Number(it.amount || 0), 0);
  }, [periodFilteredPendingCommitments]);

  // Saldo Geral consolidado (soma do saldo atual de todas as contas correntes cadastradas)
  const totalSaldoGeral = useMemo(() => {
    if (accounts.length > 0) {
      return accounts.reduce((sum, a) => sum + Number(a.saldoAtual || 0), 0);
    }
    return totals.totalRealBalance || 0;
  }, [accounts, totals.totalRealBalance]);

  // Agrupamento de despesas pendentes por mês para detalhamento no card
  const pendenciasPorMes = useMemo(() => {
    const list = agendaPeriodFilter === "ALL" ? pendingCommitments : periodFilteredPendingCommitments;
    const map = new Map<number, { mes: string; valor: number; sortKey: number }>();

    for (const item of list) {
      const parts = getItemDueDateParts(item);
      const mIdx = parts ? parts.month : 0;
      const mName = mIdx >= 1 && mIdx <= 12 ? MONTH_NAMES_LIST[mIdx - 1] : "Sem data";
      const sortKey = parts ? parts.year * 100 + mIdx : 999999;

      const current = map.get(sortKey) || {
        mes: mName,
        valor: 0,
        sortKey,
      };
      current.valor += Number(item.amount || 0);
      map.set(sortKey, current);
    }

    return Array.from(map.values()).sort((a, b) => a.sortKey - b.sortKey);
  }, [agendaPeriodFilter, pendingCommitments, periodFilteredPendingCommitments]);

  // Filtros da Agenda de Contas a Pagar (Apenas itens PENDENTES que batem com período e busca)
  const filteredPendingCommitments = useMemo(() => {
    const list = pendingCommitments.filter((item) => {
      // 1. Filtro de competência / vencimento
      if (!matchesAgendaPeriod(item)) return false;

      // 2. Filtro de conta bancária (quando selecionado no card ou dropdown)
      if (extratoAccountFilter !== "ALL") {
        const itemWallet = item.walletId || item.cardWalletId;
        if (itemWallet && String(itemWallet) !== String(extratoAccountFilter)) {
          return false;
        }
      }

      // 3. Filtro de busca textual
      if (!agendaSearch.trim()) return true;
      const q = agendaSearch.toLowerCase().trim();
      const matchDesc = (item.description || "").toLowerCase().includes(q);
      const matchType = (item.tipoLabel || "").toLowerCase().includes(q);
      const matchRef = (item.competenciaLabel || item.competenciaShort || "").toLowerCase().includes(q);
      return matchDesc || matchType || matchRef;
    });

    return list.slice().sort((a, b) => {
      const partsA = getItemDueDateParts(a);
      const partsB = getItemDueDateParts(b);
      if (partsA && partsB) {
        if (partsA.year !== partsB.year) return partsA.year - partsB.year;
        if (partsA.month !== partsB.month) return partsA.month - partsB.month;
      }
      const tA = a.dueDateRaw ? new Date(a.dueDateRaw).getTime() : 0;
      const tB = b.dueDateRaw ? new Date(b.dueDateRaw).getTime() : 0;
      return tA - tB;
    });
  }, [
    pendingCommitments,
    agendaSearch,
    agendaPeriodFilter,
    extratoAccountFilter,
    dataInicio,
    dataFim,
    customFilterMonth,
    customFilterYear,
    currentMonthNum,
    currentYearNum,
    nextMonthNum,
    nextYearNum,
  ]);

  // Lista unificada de Contas Fixas do Mês / Período (Pendentes e Pagas)
  const filteredBills = useMemo(() => {
    const list = bills.filter((item) => {
      // 1. Filtro de competência / vencimento
      if (!matchesAgendaPeriod(item)) return false;

      // 2. Filtro de conta bancária (quando selecionado no card compacto de contas)
      if (extratoAccountFilter !== "ALL") {
        const itemWallet = item.walletId || item.cardWalletId;
        if (itemWallet && String(itemWallet) !== String(extratoAccountFilter)) {
          return false;
        }
      }

      // 3. Filtro de busca textual
      if (!agendaSearch.trim()) return true;
      const q = agendaSearch.toLowerCase().trim();
      const matchDesc = (item.description || "").toLowerCase().includes(q);
      const matchType = (item.tipoLabel || "").toLowerCase().includes(q);
      const matchCat = (item.category || "").toLowerCase().includes(q);
      const matchRef = (item.competenciaLabel || item.competenciaShort || "").toLowerCase().includes(q);
      return matchDesc || matchType || matchCat || matchRef;
    });

    return list.slice().sort((a, b) => {
      const partsA = getItemDueDateParts(a);
      const partsB = getItemDueDateParts(b);
      if (partsA && partsB) {
        if (partsA.year !== partsB.year) return partsA.year - partsB.year;
        if (partsA.month !== partsB.month) return partsA.month - partsB.month;
      }
      const tA = a.dueDateRaw ? new Date(a.dueDateRaw).getTime() : 0;
      const tB = b.dueDateRaw ? new Date(b.dueDateRaw).getTime() : 0;
      return tA - tB;
    });
  }, [
    bills,
    agendaSearch,
    agendaPeriodFilter,
    extratoAccountFilter,
    dataInicio,
    dataFim,
    customFilterMonth,
    customFilterYear,
    currentMonthNum,
    currentYearNum,
    nextMonthNum,
    nextYearNum,
  ]);

  // Total das contas pendentes no filtro atual
  const pendingBillsTotal = useMemo(() => {
    return filteredBills
      .filter((b) => b.status === "PENDING" || b.status === "PENDENTE")
      .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  }, [filteredBills]);

  // Sobra prevista após contas pendentes
  const sobraPrevista = totalSaldoGeral - pendingBillsTotal;

  // Formatação compacta de vencimento (ex: 06/11)
  const formatBillDueDate = (item: any) => {
    if (item.dueDateFormatted) {
      const parts = item.dueDateFormatted.split("/");
      if (parts.length >= 2) {
        return `${parts[0].padStart(2, "0")}/${parts[1].padStart(2, "0")}`;
      }
      return item.dueDateFormatted;
    }
    if (item.dueDateInput) {
      const parts = item.dueDateInput.split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}`;
      }
    }
    const dIso = getItemDueDateIso(item);
    if (dIso) {
      const parts = dIso.split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}`;
      }
    }
    return "-";
  };

  // Toggle rápido de pagamento com 1 clique no checkbox (sem abrir modal)
  const toggleBillStatus = async (billId: string) => {
    const target = bills.find((b) => b.id === billId);
    if (!target) return;

    const isCurrentlyPaid = target.status === "COMPLETED" || target.status === "PAID" || target.status === "PAGO";
    const nextStatus = isCurrentlyPaid ? "PENDING" : "PAGO";

    // Atualização otimista imediata na interface
    setBills((prev) =>
      prev.map((b) => (b.id === billId ? { ...b, status: nextStatus } : b))
    );

    try {
      if (isCurrentlyPaid) {
        await undoCommitmentPaymentAction(billId);
        showAlert("Baixa desfeita com sucesso!", { variant: "info" });
      } else {
        const defaultWalletId = target.walletId || accounts[0]?.id || contasBancarias[0]?.id;
        const isInvoice = Boolean(target.isCardInvoice || target.tipo === "FATURA_CARTAO");
        await payCommitmentAction({
          commitmentId: target.id,
          formaPagamento: "SALDO_CONTA",
          contaBancariaId: defaultWalletId,
          dataBaixa: new Date().toISOString().split("T")[0],
          faturaId: target.faturaId,
        });
        showAlert("Conta liquidada com sucesso!", { variant: "success" });
      }
      await loadData(false);
    } catch (err: any) {
      // Reverter se falhar
      setBills((prev) =>
        prev.map((b) => (b.id === billId ? { ...b, status: isCurrentlyPaid ? "PAGO" : "PENDING" } : b))
      );
      showAlert(err?.message || "Erro ao alterar status da conta.", { variant: "error" });
    }
  };

  // Helper para verificar se a conta tem vencimento crítico (atrasada, hoje, amanhã ou em até 3 dias)
  const checkIsVencimentoCritico = (item: any): boolean => {
    if (item.dueBadge?.type === "atrasado" || item.dueBadge?.type === "hoje") return true;
    if (item.dueDateInput && typeof item.dueDateInput === "string") {
      const parts = item.dueDateInput.split("-");
      if (parts.length === 3) {
        const due = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 3;
      }
    }
    return false;
  };

  // Mapa de subtotais e contagem por mês para agrupamento visual na visualização anual
  const monthlyTotalsMap = useMemo(() => {
    const map = new Map<string, { total: number; count: number; label: string }>();
    for (const item of filteredPendingCommitments) {
      const parts = getItemDueDateParts(item);
      const key = parts ? `${parts.year}-${String(parts.month).padStart(2, "0")}` : "sem-data";
      const current = map.get(key) || {
        total: 0,
        count: 0,
        label: parts ? `${MONTH_NAMES_LIST[parts.month - 1]}/${parts.year}` : "Outras Datas",
      };
      current.total += Number(item.amount || 0);
      current.count += 1;
      map.set(key, current);
    }
    return map;
  }, [filteredPendingCommitments]);

  // Controle do checkbox 'Selecionar todas visíveis'
  const isAllVisibleSelected =
    filteredPendingCommitments.length > 0 &&
    filteredPendingCommitments.every((c) => selectedCommitmentIds.includes(c.id));

  const handleToggleSelectAllVisible = (checked: boolean) => {
    if (checked) {
      const visibleIds = filteredPendingCommitments.map((c) => c.id);
      setSelectedCommitmentIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    } else {
      const visibleSet = new Set(filteredPendingCommitments.map((c) => c.id));
      setSelectedCommitmentIds((prev) => prev.filter((id) => !visibleSet.has(id)));
    }
  };

  // Filtros do Extrato Realizado (Movimentações que já aconteceram)
  const filteredRealizedMovements = useMemo(() => {
    return realizedTransactions.filter((tx) => {
      if (extratoAccountFilter !== "ALL" && String(tx.walletId) !== String(extratoAccountFilter)) {
        return false;
      }
      if (extratoSearch.trim()) {
        const q = extratoSearch.toLowerCase().trim();
        const matchDesc = (tx.description || "").toLowerCase().includes(q);
        const matchCat = (tx.category || "").toLowerCase().includes(q);
        const matchWallet = (tx.walletName || "").toLowerCase().includes(q);
        return matchDesc || matchCat || matchWallet;
      }
      return true;
    });
  }, [realizedTransactions, extratoAccountFilter, extratoSearch]);

  const displayedRealizedMovements = showAllMovements
    ? filteredRealizedMovements
    : filteredRealizedMovements.slice(0, 10);

  // Valor total das contas selecionadas para baixa em lote
  const selectedBatchTotal = useMemo(() => {
    return pendingCommitments
      .filter((it) => selectedCommitmentIds.includes(it.id))
      .reduce((sum, it) => sum + Number(it.amount || 0), 0);
  }, [pendingCommitments, selectedCommitmentIds]);

  // Handlers: Duplicar / Repetir no Mês Seguinte
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const handleDuplicateToNextMonth = async (item: any) => {
    setDuplicatingId(item.id);
    try {
      const res = await duplicateCommitmentToNextMonthAction(item.id);
      if (res.success) {
        showAlert(`Compromisso duplicado com sucesso para ${res.formattedTarget}!`, { variant: "success" });
        await loadData();
      }
    } catch (err: any) {
      console.error("Erro ao duplicar compromisso:", err);
      showAlert(err?.message || "Erro ao duplicar compromisso para o próximo mês.", { variant: "error" });
    } finally {
      setDuplicatingId(null);
    }
  };

  // Handlers: Pagamento / Baixa de Compromisso
  const handleOpenBaixaModal = (item: any) => {
    setPayCommitmentItem(item);
    setBaixaForma("SALDO_CONTA");
    const listContas = accounts.length > 0 ? accounts : contasBancarias;
    if (listContas.length > 0) {
      setBaixaContaId((prev) => prev || listContas[0].id);
    }
    setBaixaData(new Date().toISOString().split("T")[0]);
  };

  const handleConfirmBaixa = async () => {
    if (!payCommitmentItem) return;
    const isInvoice = Boolean(payCommitmentItem.isCardInvoice || payCommitmentItem.tipo === "FATURA_CARTAO");

    if (isInvoice) {
      if (!baixaContaId) {
        showAlert("Selecione a conta corrente que será debitada.", { variant: "warning" });
        return;
      }
    } else {
      if (["SALDO_CONTA", "DEBITO_AUTOMATICO", "PIX"].includes(baixaForma) && !baixaContaId) {
        showAlert("Selecione a conta corrente que será debitada.", { variant: "warning" });
        return;
      }
      if (baixaForma === "CARTAO_CREDITO" && !baixaCartaoId) {
        showAlert("Selecione o cartão de crédito para lançamento.", { variant: "warning" });
        return;
      }
    }

    setPayingCommitment(true);
    try {
      await payCommitmentAction({
        commitmentId: payCommitmentItem.id,
        formaPagamento: isInvoice ? "SALDO_CONTA" : baixaForma,
        contaBancariaId: baixaContaId,
        cartaoCreditoId: baixaCartaoId,
        dataBaixa: baixaData,
        faturaId: payCommitmentItem.faturaId,
      });
      setPayCommitmentItem(null);
      await loadData();
      showAlert(
        isInvoice
          ? "Fatura liquidada com sucesso! Limite restaurado e lançamento gerado no extrato."
          : "Conta liquidada com sucesso! Lançamento gerado no extrato.",
        { variant: "success" }
      );
    } catch (err: any) {
      console.error(err);
      showAlert(err?.message || "Erro ao liquidar compromisso.", { variant: "error" });
    } finally {
      setPayingCommitment(false);
    }
  };

  // Handlers: Baixa em Lote
  const handleOpenBatchModal = () => {
    setBatchBaixaForma("SALDO_CONTA");
    const listContas = accounts.length > 0 ? accounts : contasBancarias;
    if (listContas.length > 0) {
      setBatchBaixaContaId((prev) => prev || listContas[0].id);
    }
    setBatchBaixaData(new Date().toISOString().split("T")[0]);
    setBatchModalOpen(true);
  };

  const handleConfirmBatchBaixa = async () => {
    if (selectedCommitmentIds.length === 0) return;
    if (["SALDO_CONTA", "DEBITO_AUTOMATICO", "PIX"].includes(batchBaixaForma) && !batchBaixaContaId) {
      showAlert("Selecione a conta corrente que será debitada.", { variant: "warning" });
      return;
    }
    const count = selectedCommitmentIds.length;
    setPayingBatch(true);
    try {
      await payBatchCommitmentsAction({
        commitmentIds: selectedCommitmentIds,
        formaPagamento: batchBaixaForma,
        contaBancariaId: batchBaixaContaId,
        cartaoCreditoId: batchBaixaCartaoId,
        dataBaixa: batchBaixaData,
      });
      setBatchModalOpen(false);
      setSelectedCommitmentIds([]);
      await loadData();
      showAlert(`${count} ${count === 1 ? "conta liquidada" : "contas liquidadas"} com sucesso!`, { variant: "success" });
    } catch (err: any) {
      console.error(err);
      showAlert(err?.message || "Erro ao liquidar contas em lote.", { variant: "error" });
    } finally {
      setPayingBatch(false);
    }
  };

  // Handler: Novo Boleto / Despesa a Pagar
  const handleSaveNewCommitment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommitmentDesc.trim() || !newCommitmentAmount || Number(newCommitmentAmount) <= 0 || !newCommitmentDueDate) {
      showAlert("Preencha todos os campos do compromisso.", { variant: "warning" });
      return;
    }
    setSavingCommitment(true);
    try {
      await createCommitmentAction({
        description: newCommitmentDesc.trim(),
        amount: Number(newCommitmentAmount),
        dueDate: newCommitmentDueDate,
        tipo: newCommitmentTipo,
        recorrencia: newCommitmentRecorrencia,
        competenceMonth: newCommitmentCompMonth,
        competenceYear: newCommitmentCompYear,
      });
      setNewCommitmentModalOpen(false);
      setNewCommitmentDesc("");
      setNewCommitmentAmount("");
      setNewCommitmentDueDate("");
      await loadData();
      showAlert("Boleto / Despesa agendada com sucesso!", { variant: "success" });
    } catch (err: any) {
      showAlert(err?.message || "Erro ao agendar compromisso.", { variant: "error" });
    } finally {
      setSavingCommitment(false);
    }
  };

  // Handler: Nova Movimentação Avulsa (Pix/Depósito)
  const handleSaveNewMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movWalletId || !movDesc.trim() || !movValor || Number(movValor) <= 0 || !movData) {
      showAlert("Preencha todos os campos da movimentação.", { variant: "warning" });
      return;
    }
    setSavingMovement(true);
    try {
      await createBankAccountMovementAction({
        walletId: movWalletId,
        type: movTipo,
        description: movDesc.trim(),
        amount: Number(movValor),
        dateStr: movData,
        movementType: movMetodo,
      });
      setNewMovementModalOpen(false);
      setMovDesc("");
      setMovValor("");
      await loadData();
      showAlert("Movimentação registrada com sucesso no extrato!", { variant: "success" });
    } catch (err: any) {
      showAlert(err?.message || "Erro ao registrar movimentação.", { variant: "error" });
    } finally {
      setSavingMovement(false);
    }
  };

  // Helper: Cálculo de período e datas das semanas
  const computePeriodDates = (periodType: "S1" | "S2" | "S3" | "S4" | "CUSTOM", m: number, y: number) => {
    const lastDay = new Date(y, m, 0).getDate();
    const mm = String(m).padStart(2, "0");
    if (periodType === "S1") {
      return {
        start: `${y}-${mm}-01`,
        end: `${y}-${mm}-07`,
        label: `Semana 1 (01 a 07/${mm})`,
        desc: `Fechamento Semanal Débito/Pix (01/${mm} a 07/${mm})`,
      };
    }
    if (periodType === "S2") {
      return {
        start: `${y}-${mm}-08`,
        end: `${y}-${mm}-14`,
        label: `Semana 2 (08 a 14/${mm})`,
        desc: `Fechamento Semanal Débito/Pix (08/${mm} a 14/${mm})`,
      };
    }
    if (periodType === "S3") {
      return {
        start: `${y}-${mm}-15`,
        end: `${y}-${mm}-21`,
        label: `Semana 3 (15 a 21/${mm})`,
        desc: `Fechamento Semanal Débito/Pix (15/${mm} a 21/${mm})`,
      };
    }
    if (periodType === "S4") {
      const endDayStr = String(lastDay).padStart(2, "0");
      return {
        start: `${y}-${mm}-22`,
        end: `${y}-${mm}-${endDayStr}`,
        label: `Semana 4 (22 a ${endDayStr}/${mm})`,
        desc: `Fechamento Semanal Débito/Pix (22/${mm} a ${endDayStr}/${mm})`,
      };
    }
    return null;
  };

  const handleOpenBatchWeeklyModal = () => {
    const curM = new Date().getMonth() + 1;
    const curY = selectedYear || new Date().getFullYear();
    setBatchMonth(curM);
    setBatchYear(curY);
    if (accounts.length > 0 && !batchWalletId) {
      setBatchWalletId(accounts[0].id);
    }
    const day = new Date().getDate();
    let pType: "S1" | "S2" | "S3" | "S4" = "S1";
    if (day <= 7) pType = "S1";
    else if (day <= 14) pType = "S2";
    else if (day <= 21) pType = "S3";
    else pType = "S4";

    setBatchPeriodType(pType);
    const computed = computePeriodDates(pType, curM, curY);
    if (computed) {
      setBatchStartDate(computed.start);
      setBatchEndDate(computed.end);
      setBatchDescription(`[Semanal] ${computed.desc}`);
    }
    setBatchAmount("");
    setBatchPaymentMethod("PIX");
    setBatchCategory("Gastos Formiga / Pix & Débito Semanal");
    setBatchNotes("");
    setBatchWeeklyModalOpen(true);
  };

  const handleSelectPeriodType = (pType: "S1" | "S2" | "S3" | "S4" | "CUSTOM") => {
    setBatchPeriodType(pType);
    if (pType !== "CUSTOM") {
      const computed = computePeriodDates(pType, batchMonth, batchYear);
      if (computed) {
        setBatchStartDate(computed.start);
        setBatchEndDate(computed.end);
        setBatchDescription(`[Semanal] ${computed.desc}`);
      }
    }
  };

  const handleSaveBatchWeekly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchWalletId) {
      showAlert("Selecione a conta bancária de saída.", { variant: "warning" });
      return;
    }
    if (!batchAmount || Number(batchAmount) <= 0) {
      showAlert("Informe o valor total do período.", { variant: "warning" });
      return;
    }
    if (!batchStartDate || !batchEndDate) {
      showAlert("Defina as datas de início e fim do período.", { variant: "warning" });
      return;
    }
    setBatchSaving(true);
    try {
      const periodLabel =
        batchPeriodType === "CUSTOM"
          ? `${batchStartDate.split("-").reverse().slice(0, 2).join("/")} a ${batchEndDate.split("-").reverse().slice(0, 2).join("/")}`
          : computePeriodDates(batchPeriodType, batchMonth, batchYear)?.label;

      await createBatchWeeklyDebitAction({
        walletId: batchWalletId,
        amount: Number(batchAmount),
        startDate: batchStartDate,
        endDate: batchEndDate,
        periodLabel,
        paymentMethod: batchPaymentMethod,
        categoryName: batchCategory.trim() || "Gastos Formiga / Pix & Débito Semanal",
        description: batchDescription.trim(),
        notes: batchNotes.trim(),
      });

      setBatchWeeklyModalOpen(false);
      await loadData();
      showAlert("Fechamento semanal registrado com sucesso no extrato!", { variant: "success" });
    } catch (err: any) {
      showAlert(err?.message || "Erro ao registrar fechamento semanal.", { variant: "error" });
    } finally {
      setBatchSaving(false);
    }
  };

  // Handler: Nova Conta Bancária
  const handleSaveNewAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accBankName.trim()) {
      showAlert("Informe o nome do banco ou instituição.", { variant: "warning" });
      return;
    }
    setSavingAccount(true);
    try {
      await createNewCard({
        bankName: accBankName.trim(),
        walletType: "CONTA_CORRENTE",
        alias: accBankName.trim(),
        holder: accHolder.trim() || undefined,
        limitOrBalance: Number(accInitialBalance) || 0,
        diaFechamento: 1,
        diaVencimento: 10,
        originType: "ROLLOVER",
        targetMonth: new Date().getMonth() + 1,
        targetYear: selectedYear,
      });
      setNewAccountModalOpen(false);
      setAccBankName("");
      setAccHolder("");
      setAccInitialBalance("");
      await loadData();
      showAlert("Conta bancária cadastrada com sucesso!", { variant: "success" });
    } catch (err: any) {
      showAlert(err?.message || "Erro ao cadastrar conta bancária.", { variant: "error" });
    } finally {
      setSavingAccount(false);
    }
  };

  // Handler: Editar Compromisso
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    setEditingCommitment(true);
    try {
      await updateCommitmentAction({
        id: editItem.id,
        description: editDesc.trim(),
        amount: Number(editAmount),
        dueDate: editDueDate,
        tipo: editTipo,
        recorrencia: editRecorrencia,
        competenceMonth: Number(editCompMonth),
        competenceYear: Number(editCompYear),
        walletId: editWalletId || undefined,
      });
      setEditItem(null);
      await loadData();
      showAlert("Compromisso atualizado com sucesso!", { variant: "success" });
    } catch (err: any) {
      showAlert(err?.message || "Erro ao editar compromisso.", { variant: "error" });
    } finally {
      setEditingCommitment(false);
    }
  };

  // Handler: Excluir Compromisso
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setDeletingCommitment(true);
    try {
      await deleteCommitmentAction(itemToDelete.id);
      setItemToDelete(null);
      await loadData();
      showAlert("Compromisso excluído com sucesso!", { variant: "success" });
    } catch (err: any) {
      showAlert(err?.message || "Erro ao excluir compromisso.", { variant: "error" });
    } finally {
      setDeletingCommitment(false);
    }
  };

  // Handlers: Editar Movimentação Realizada (Extrato)
  const handleOpenEditMovement = (tx: any) => {
    setEditMovementItem(tx);
    setEditMovDesc(tx.description || "");
    setEditMovAmount(tx.amount || "");
    setEditMovDate(tx.date ? tx.date.split("T")[0] : new Date().toISOString().split("T")[0]);
    setEditMovWalletId(tx.walletId || (accounts[0]?.id ?? ""));
    setEditMovCategory(tx.category || "Saída da Conta");
    setEditMovMetodo(tx.paymentMethod || "DEBITO");
    setEditMovNotes(tx.notes || "");
  };

  const handleSaveEditMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMovementItem) return;
    if (!editMovDesc.trim() || !editMovAmount || Number(editMovAmount) <= 0 || !editMovDate) {
      showAlert("Preencha todos os campos obrigatórios.", { variant: "warning" });
      return;
    }
    setSavingEditMovement(true);
    try {
      await updateRealizedBankMovementAction({
        id: editMovementItem.id,
        description: editMovDesc.trim(),
        amount: Number(editMovAmount),
        dateStr: editMovDate,
        walletId: editMovWalletId,
        categoryName: editMovCategory.trim(),
        paymentMethod: editMovMetodo,
        notes: editMovNotes.trim(),
      });
      setEditMovementItem(null);
      await loadData();
      showAlert("Movimentação atualizada com sucesso!", { variant: "success" });
    } catch (err: any) {
      showAlert(err?.message || "Erro ao atualizar movimentação.", { variant: "error" });
    } finally {
      setSavingEditMovement(false);
    }
  };

  // Handler: Excluir Movimentação Realizada (Extrato)
  const handleConfirmDeleteMovement = async () => {
    if (!movementToDelete) return;
    setDeletingMovement(true);
    try {
      const res = await deleteCardPurchase(movementToDelete.id);
      if (res && res.success === false) {
        throw new Error(res.error || "Erro ao excluir movimentação.");
      }
      setMovementToDelete(null);
      await loadData();
      showAlert("Movimentação excluída com sucesso! O saldo da conta foi recalculado.", { variant: "success" });
    } catch (err: any) {
      showAlert(err?.message || "Erro ao excluir movimentação.", { variant: "error" });
    } finally {
      setDeletingMovement(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 min-h-screen text-slate-800 dark:text-slate-100 font-sans">
      {/* NAVEGAÇÃO & CONTROLES COMPACTOS NO TOPO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <Link
          href="/"
          prefetch={false}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar para o Dashboard</span>
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Seletor Anual Compacto */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-2 py-1 rounded-xl shadow-xs">
            <button
              type="button"
              onClick={prevYear}
              className="p-1 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Ano Anterior"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-1 text-xs font-bold text-slate-700 dark:text-slate-200 tracking-wider tabular-nums">
              {selectedYear}
            </span>
            <button
              type="button"
              onClick={nextYear}
              className="p-1 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Próximo Ano"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <button
            onClick={() => setNewMovementModalOpen(true)}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors shadow-xs cursor-pointer"
          >
            + Movimentação
          </button>
          <button
            onClick={handleOpenBatchWeeklyModal}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-950/30 hover:bg-amber-100 text-amber-800 dark:text-amber-300 transition-colors shadow-xs cursor-pointer"
          >
            Fechamento Semanal
          </button>
        </div>
      </div>

      {/* CABEÇALHO COM SALDO GERAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <span className="text-xs font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
            Saldo Geral Disponível
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatBRL(totalSaldoGeral)}
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Sobra prevista após contas pendentes:{" "}
            <span className={`font-semibold ${sobraPrevista >= 0 ? "text-slate-700 dark:text-slate-300" : "text-rose-600 dark:text-rose-400"}`}>
              {formatBRL(sobraPrevista)}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => setNewAccountModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition-colors shadow-sm cursor-pointer"
          >
            <Plus size={16} />
            <span>Nova Conta</span>
          </button>
          <button
            onClick={() => setNewCommitmentModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm cursor-pointer"
          >
            <Plus size={16} />
            <span>Novo Boleto</span>
          </button>
        </div>
      </div>

      {/* BLOCO ESTILO APP: LISTA DE BANCOS / CONTAS */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
              Contas Correntes
            </h2>
            {extratoAccountFilter !== "ALL" && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExtratoAccountFilter("ALL");
                }}
                className="text-[11px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer ml-1"
                title="Limpar filtro de conta"
              >
                <X size={12} /> Limpar filtro
              </button>
            )}
          </div>
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
            {formatBRL(totalSaldoGeral)}
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {accounts.length === 0 ? (
            <div className="px-5 py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
              <p>Nenhuma conta bancária cadastrada.</p>
              <button
                type="button"
                onClick={() => setNewAccountModalOpen(true)}
                className="mt-2 text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
              >
                + Adicionar primeira conta
              </button>
            </div>
          ) : (
            accounts.map((acc) => {
              const bankStyle = getBankStyle(acc.bankName || acc.title);
              const isFiltered = extratoAccountFilter === String(acc.id);

              return (
                <div
                  key={acc.id}
                  onClick={() => setExtratoAccountFilter(isFiltered ? "ALL" : String(acc.id))}
                  className={`px-5 py-3.5 flex items-center justify-between transition-colors cursor-pointer group ${
                    isFiltered
                      ? "bg-emerald-50/80 dark:bg-emerald-950/20"
                      : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                  }`}
                  title={isFiltered ? "Clique para remover filtro" : "Clique para filtrar por esta conta"}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`w-9 h-9 rounded-xl ${bankStyle.iconBg} font-bold text-xs flex items-center justify-center shadow-sm shrink-0`}>
                      {bankStyle.initials}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-700 dark:text-slate-200 text-sm group-hover:text-slate-900 dark:group-hover:text-white">
                        {acc.bankName || acc.title}
                      </span>
                      {isFiltered && (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          ✓ Filtrando por esta conta
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm sm:text-base">
                      {formatBRL(acc.saldoAtual)}
                    </span>
                    <ChevronRight size={16} className={`transition-colors ${
                      isFiltered
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-slate-300 dark:text-slate-600 group-hover:text-slate-500"
                    }`} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* TABELA DE CONTAS FIXAS DO MÊS */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Contas Fixas do Mês</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">Despesas recorrentes e compromissos fixos</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60 px-3 py-1 rounded-lg">
              A Pagar: <strong className="font-semibold">{formatBRL(pendingBillsTotal)}</strong>
            </div>
          </div>
        </div>

        {/* Barra de Filtros e Busca de Contas */}
        <div className="px-5 py-3 border-b border-slate-100/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 flex flex-wrap items-center justify-between gap-2.5">
          {/* Pílulas de Período */}
          <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => {
                setDataInicio("");
                setDataFim("");
                setAgendaPeriodFilter("CURRENT_MONTH");
              }}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                agendaPeriodFilter === "CURRENT_MONTH" && !dataInicio && !dataFim
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Mês Atual
            </button>
            <button
              type="button"
              onClick={() => {
                setDataInicio("");
                setDataFim("");
                setAgendaPeriodFilter("NEXT_MONTH");
              }}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                agendaPeriodFilter === "NEXT_MONTH" && !dataInicio && !dataFim
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Próximo Mês
            </button>
            <button
              type="button"
              onClick={() => {
                setDataInicio("");
                setDataFim("");
                setAgendaPeriodFilter("ALL");
              }}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                agendaPeriodFilter === "ALL" && !dataInicio && !dataFim
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Todas ({selectedYear})
            </button>
          </div>

          {/* Busca Rápida */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={agendaSearch}
              onChange={(e) => setAgendaSearch(e.target.value)}
              placeholder="Buscar conta fixa..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-7 py-1 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            {agendaSearch && (
              <button
                type="button"
                onClick={() => setAgendaSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Tabela de Contas */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50/70 dark:bg-slate-950/40 text-xs font-semibold uppercase text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3 w-12 text-center">Status</th>
                <th className="px-4 py-3">Vencimento</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 w-16 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500/80" />
                      <p className="font-semibold text-xs text-slate-600 dark:text-slate-300">
                        Nenhuma conta encontrada para o filtro selecionado.
                      </p>
                      <button
                        type="button"
                        onClick={() => setNewCommitmentModalOpen(true)}
                        className="mt-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        + Cadastrar uma conta fixa
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBills.map((bill) => {
                  const IconComponent = getBillIcon(bill.description, bill.category, bill.tipo);
                  const isPaid = bill.status === "COMPLETED" || bill.status === "PAID" || bill.status === "PAGO";

                  return (
                    <tr key={bill.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group">
                      <td className="px-5 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => toggleBillStatus(bill.id)}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                            isPaid 
                              ? "bg-emerald-500 text-white shadow-sm hover:bg-emerald-600" 
                              : "border-2 border-slate-300 dark:border-slate-600 hover:border-slate-400 bg-white dark:bg-slate-800"
                          }`}
                          title={isPaid ? "Marcar como pendente" : "Marcar como pago"}
                        >
                          {isPaid && <Check size={14} strokeWidth={3} />}
                        </button>
                      </td>

                      <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 text-xs font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
                          <span>{formatBillDueDate(bill)}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                            <IconComponent size={15} />
                          </div>
                          <span className={`font-medium ${isPaid ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-800 dark:text-slate-100"}`}>
                            {bill.description}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                        {bill.category || bill.tipoLabel || "Conta Fixa"}
                      </td>

                      <td className="px-4 py-3.5 text-right font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                        {formatBRL(bill.amount)}
                      </td>

                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setActiveActionMenuId(activeActionMenuId === bill.id ? null : bill.id)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <MoreVertical size={16} />
                          </button>
                          {activeActionMenuId === bill.id && (
                            <div className="absolute right-0 z-30 mt-1 w-48 rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 py-1 text-left">
                              {bill.isCardInvoice ? (
                                <Link
                                  href={`/cartoes/${bill.cardWalletId || bill.walletId}`}
                                  className="w-full text-left px-3 py-2 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 flex items-center gap-2 cursor-pointer"
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                  <span>Ver Fatura no Cartão</span>
                                </Link>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      handleOpenBaixaModal(bill);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Baixar com detalhes</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      setEditItem(bill);
                                      setEditDesc(bill.description || "");
                                      setEditAmount(String(bill.amount || ""));
                                      const rawDue = bill.dueDateInput || (bill.dueDateRaw ? bill.dueDateRaw.split("T")[0] : (bill.dueDate ? bill.dueDate.split("T")[0] : ""));
                                      setEditDueDate(rawDue);
                                      setEditTipo(bill.tipo === "ASSINATURA" ? "ASSINATURA" : "BOLETO");
                                      setEditRecorrencia(bill.recorrencia || (bill.isRecurring ? "MENSAL" : "UNICO"));
                                      setEditCompMonth(bill.competenceMonth || new Date().getMonth() + 1);
                                      setEditCompYear(bill.competenceYear || selectedYear);
                                      setEditWalletId(bill.walletId || (accounts[0]?.id ?? contasBancarias[0]?.id ?? ""));
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Pencil className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Editar</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={duplicatingId === bill.id}
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      handleDuplicateToNextMonth(bill);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                  >
                                    <RotateCw className="w-3.5 h-3.5 text-indigo-500" />
                                    <span>Repetir no próximo mês</span>
                                  </button>
                                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      setItemToDelete(bill);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                    <span>Excluir</span>
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* BLOCO: EXTRATO DA CONTA (MOVIMENTAÇÕES REALIZADAS) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/50 dark:border-indigo-800/50 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Extrato Realizado
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Movimentações bancárias, depósitos, Pix e liquidações
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAllMovements(!showAllMovements)}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              {showAllMovements ? "Ver menos" : `Ver todas (${filteredRealizedMovements.length})`}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50/70 dark:bg-slate-950/40 text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3 whitespace-nowrap">Data</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Conta</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {displayedRealizedMovements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Nenhuma movimentação realizada encontrada para o filtro atual.
                  </td>
                </tr>
              ) : (
                displayedRealizedMovements.map((tx) => {
                  const isIncome = tx.type === "INCOME";
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3 whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {tx.date ? tx.date.split("T")[0].split("-").reverse().slice(0, 2).join("/") : "-"}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                        <div className="flex items-center gap-2">
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                            isIncome ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400" : "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400"
                          }`}>
                            {isIncome ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          </div>
                          <span className="truncate max-w-[260px]">{tx.description}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {tx.walletName}
                      </td>
                      <td className="px-4 py-3 text-slate-400 dark:text-slate-500 whitespace-nowrap">
                        {tx.category}
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${
                        isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-slate-800 dark:text-slate-200"
                      }`}>
                        {isIncome ? `+${brl(tx.amount)}` : `-${brl(tx.amount)}`}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>


      {/* ── Modal 1: + Novo Boleto / Despesa a Pagar ────────────────────── */}
      {newCommitmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/50">
                  <Receipt className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Novo Boleto / Despesa a Pagar</h3>
              </div>
              <button
                onClick={() => setNewCommitmentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewCommitment} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Descrição *</label>
                <input
                  type="text"
                  placeholder="Ex: Aluguel, CPFL Energia, Internet"
                  value={newCommitmentDesc}
                  onChange={(e) => setNewCommitmentDesc(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Mês de Referência / Competência *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newCommitmentCompMonth}
                    onChange={(e) => setNewCommitmentCompMonth(Number(e.target.value))}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {MONTH_NAMES_LIST.map((m, idx) => (
                      <option key={idx + 1} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={newCommitmentCompYear}
                    onChange={(e) => setNewCommitmentCompYear(Number(e.target.value))}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {[2024, 2025, 2026, 2027, 2028].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={newCommitmentAmount}
                    onChange={(e) => setNewCommitmentAmount(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Vencimento *</label>
                  <input
                    type="date"
                    value={newCommitmentDueDate}
                    onChange={(e) => setNewCommitmentDueDate(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Tipo</label>
                  <select
                    value={newCommitmentTipo}
                    onChange={(e) => setNewCommitmentTipo(e.target.value as any)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="BOLETO">Boleto / Conta Fixa</option>
                    <option value="ASSINATURA">Assinatura / Mensalidade</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Recorrência</label>
                  <select
                    value={newCommitmentRecorrencia}
                    onChange={(e) => setNewCommitmentRecorrencia(e.target.value as any)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="MENSAL">Repetir todo mês</option>
                    <option value="UNICO">Apenas neste mês</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingCommitment}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {savingCommitment ? "Salvando..." : "Salvar e Agendar"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 2: + Movimentação Avulsa (Pix/Depósito) ───────────────── */}
      {newMovementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center border border-slate-200">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Movimentação Avulsa (Pix / Depósito)</h3>
              </div>
              <button
                onClick={() => setNewMovementModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewMovement} className="space-y-4">
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMovTipo("SAIDA")}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    movTipo === "SAIDA" ? "bg-rose-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Saída / Débito / Pix Enviado
                </button>
                <button
                  type="button"
                  onClick={() => setMovTipo("ENTRADA")}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    movTipo === "ENTRADA" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Entrada / Pix Recebido
                </button>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Qual Conta? *</label>
                <select
                  value={movWalletId}
                  onChange={(e) => setMovWalletId(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm cursor-pointer"
                  required
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.bankName || a.title} (Saldo: {brl(Number(a.saldoAtual || 0))})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Descrição *</label>
                <input
                  type="text"
                  placeholder="Ex: Pix Mercado, Transferência, Depósito Salário"
                  value={movDesc}
                  onChange={(e) => setMovDesc(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0,00"
                    value={movValor}
                    onChange={(e) => setMovValor(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Data da Operação *</label>
                  <input
                    type="date"
                    value={movData}
                    onChange={(e) => setMovData(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Método</label>
                <select
                  value={movMetodo}
                  onChange={(e) => setMovMetodo(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm cursor-pointer"
                >
                  <option value="PIX">Pix</option>
                  <option value="DEBITO">Cartão de Débito</option>
                  <option value="TED_DOC">TED / Transferência</option>
                  <option value="DINHEIRO">Depósito em Espécie</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={savingMovement}
                className="w-full py-2.5 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 text-white font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {savingMovement ? "Registrando..." : "Registrar no Extrato"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Fechamento de Débito em Lote / Semanal ─────────────── */}
      {batchWeeklyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <CalendarRange className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Fechamento de Débito em Lote / Semanal
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Consolidação semanal de Pix & Débito (Gastos Formiga)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBatchWeeklyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 mb-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300">
              <p className="leading-relaxed">
                Elimine o microgerenciamento de cafezinhos e pequenos gastos diários. Registre o valor acumulado da semana para conciliar o saldo da conta corrente de uma só vez.
              </p>
            </div>

            <form onSubmit={handleSaveBatchWeekly} className="space-y-4">
              {/* Seletor de Competência (Mês / Ano) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                    Mês de Referência
                  </label>
                  <select
                    value={batchMonth}
                    onChange={(e) => {
                      const m = Number(e.target.value);
                      setBatchMonth(m);
                      if (batchPeriodType !== "CUSTOM") {
                        const computed = computePeriodDates(batchPeriodType, m, batchYear);
                        if (computed) {
                          setBatchStartDate(computed.start);
                          setBatchEndDate(computed.end);
                          setBatchDescription(`[Semanal] ${computed.desc}`);
                        }
                      }
                    }}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm cursor-pointer"
                  >
                    {MONTH_NAMES_LIST.map((name, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                    Ano
                  </label>
                  <select
                    value={batchYear}
                    onChange={(e) => {
                      const y = Number(e.target.value);
                      setBatchYear(y);
                      if (batchPeriodType !== "CUSTOM") {
                        const computed = computePeriodDates(batchPeriodType, batchMonth, y);
                        if (computed) {
                          setBatchStartDate(computed.start);
                          setBatchEndDate(computed.end);
                          setBatchDescription(`[Semanal] ${computed.desc}`);
                        }
                      }
                    }}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm cursor-pointer"
                  >
                    {[selectedYear - 1, selectedYear, selectedYear + 1].map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tipo de Período (Seleção Rápida) */}
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1.5">
                  Tipo de Período
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl">
                  {(["S1", "S2", "S3", "S4", "CUSTOM"] as const).map((pType) => {
                    const isSelected = batchPeriodType === pType;
                    const labels: Record<string, string> = {
                      S1: "Semana 1 (01 a 07)",
                      S2: "Semana 2 (08 a 14)",
                      S3: "Semana 3 (15 a 21)",
                      S4: `Semana 4 (22 a ${new Date(batchYear, batchMonth, 0).getDate()})`,
                      CUSTOM: "Personalizado",
                    };
                    return (
                      <button
                        key={pType}
                        type="button"
                        onClick={() => handleSelectPeriodType(pType)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? "bg-amber-500 text-slate-950 shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        {labels[pType]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Se for Personalizado ou para conferência de datas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                    Data Início *
                  </label>
                  <input
                    type="date"
                    value={batchStartDate}
                    onChange={(e) => {
                      setBatchStartDate(e.target.value);
                      if (batchPeriodType === "CUSTOM" && e.target.value && batchEndDate) {
                        const startFmt = e.target.value.split("-").reverse().slice(0, 2).join("/");
                        const endFmt = batchEndDate.split("-").reverse().slice(0, 2).join("/");
                        setBatchDescription(`[Semanal] Fechamento Débito/Pix (${startFmt} a ${endFmt})`);
                      }
                    }}
                    disabled={batchPeriodType !== "CUSTOM"}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                    Data Fim *
                  </label>
                  <input
                    type="date"
                    value={batchEndDate}
                    onChange={(e) => {
                      setBatchEndDate(e.target.value);
                      if (batchPeriodType === "CUSTOM" && batchStartDate && e.target.value) {
                        const startFmt = batchStartDate.split("-").reverse().slice(0, 2).join("/");
                        const endFmt = e.target.value.split("-").reverse().slice(0, 2).join("/");
                        setBatchDescription(`[Semanal] Fechamento Débito/Pix (${startFmt} a ${endFmt})`);
                      }
                    }}
                    disabled={batchPeriodType !== "CUSTOM"}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    required
                  />
                </div>
              </div>

              {/* Conta de Saída */}
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Conta Bancária de Saída *
                </label>
                <select
                  value={batchWalletId}
                  onChange={(e) => setBatchWalletId(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm cursor-pointer"
                  required
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.bankName} (Saldo: R$ {a.saldoAtual.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Método Principal (Pix / Débito em Conta) */}
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1.5">
                  Método Principal
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setBatchPaymentMethod("PIX")}
                    className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      batchPaymentMethod === "PIX"
                        ? "bg-slate-900 dark:bg-slate-800 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Pix
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchPaymentMethod("DEBITO")}
                    className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      batchPaymentMethod === "DEBITO"
                        ? "bg-slate-900 dark:bg-slate-800 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Débito em Conta
                  </button>
                </div>
              </div>

              {/* Valor Total do Período */}
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Valor Total do Período (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  value={batchAmount}
                  onChange={(e) => setBatchAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-base font-bold tabular-nums focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              {/* Categoria Padrão */}
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Categoria Padrão (Vínculo c/ Microdespesas)
                </label>
                <input
                  type="text"
                  value={batchCategory}
                  onChange={(e) => setBatchCategory(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Descrição Automática / Sugerida */}
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Descrição do Lançamento no Extrato
                </label>
                <input
                  type="text"
                  value={batchDescription}
                  onChange={(e) => setBatchDescription(e.target.value)}
                  placeholder="Ex: [Semanal] Fechamento Débito/Pix (01/10 a 07/10)"
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              {/* Observações / Detalhes (Opcional) */}
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Observações / Detalhes (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={batchNotes}
                  onChange={(e) => setBatchNotes(e.target.value)}
                  placeholder="Ex: Padaria, cafés da manhã, estacionamentos e pequenos lanches"
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBatchWeeklyModalOpen(false)}
                  disabled={batchSaving}
                  className="w-1/2 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={batchSaving}
                  className="w-1/2 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {batchSaving ? "Registrando..." : "Confirmar Fechamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 3: Confirmar Pagamento / Baixa ────────────────────────── */}
      {payCommitmentItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {payCommitmentItem.isCardInvoice ? "Liquidar Fatura de Cartão" : "Confirmar Pagamento"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {payCommitmentItem.isCardInvoice ? "Fatura: " : "Conta: "} <b>{payCommitmentItem.description}</b> ({brl(payCommitmentItem.amount)})
                </p>
              </div>
              <button
                onClick={() => setPayCommitmentItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {payCommitmentItem.isCardInvoice ? (
                <>
                  <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50 text-xs text-purple-700 dark:text-purple-300">
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Sincronização Automática</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-purple-600 dark:text-purple-400">
                      Ao confirmar a liquidação, o status da fatura será atualizado para pago no módulo do cartão (restaurando o limite) e o débito será registrado no extrato da conta bancária selecionada.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 block">Qual Conta Bancária Debitar? *</label>
                    <select
                      className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm cursor-pointer"
                      value={baixaContaId}
                      onChange={(e) => setBaixaContaId(e.target.value)}
                    >
                      {(accounts.length > 0 ? accounts : contasBancarias).map((conta: any) => (
                        <option key={conta.id} value={conta.id}>
                          {conta.bankName || conta.banco || conta.title} - Saldo: {brl(Number(conta.saldoAtual ?? 0))}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 block">Data do Pagamento *</label>
                    <input
                      type="date"
                      value={baixaData}
                      onChange={(e) => setBaixaData(e.target.value)}
                      className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 block">Forma de Pagamento *</label>
                    <select
                      className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm bg-white cursor-pointer"
                      value={baixaForma}
                      onChange={(e) => setBaixaForma(e.target.value as any)}
                    >
                      <option value="SALDO_CONTA">Saldo da Conta Corrente (Manual)</option>
                      <option value="DEBITO_AUTOMATICO">Débito Automático (Conta Corrente)</option>
                      <option value="PIX">Pix (Sai da Conta Corrente)</option>
                      <option value="CARTAO_CREDITO">Cartão de Crédito (Gera Fatura)</option>
                      <option value="DINHEIRO">Dinheiro em Espécie (Caixa Físico)</option>
                    </select>
                  </div>

                  {["SALDO_CONTA", "DEBITO_AUTOMATICO", "PIX"].includes(baixaForma) && (
                    <div>
                      <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 block">Qual Conta Corrente Debitar?</label>
                      <select
                        className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm cursor-pointer"
                        value={baixaContaId}
                        onChange={(e) => setBaixaContaId(e.target.value)}
                      >
                        {(accounts.length > 0 ? accounts : contasBancarias).map((conta: any) => (
                          <option key={conta.id} value={conta.id}>
                            {conta.bankName || conta.banco || conta.title} - Saldo: {brl(Number(conta.saldoAtual ?? 0))}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {baixaForma === "CARTAO_CREDITO" && (
                    <div>
                      <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 block">Qual Cartão de Crédito?</label>
                      <select
                        className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm cursor-pointer"
                        value={baixaCartaoId}
                        onChange={(e) => setBaixaCartaoId(e.target.value)}
                      >
                        {cartoesCredito.map((cartao) => (
                          <option key={cartao.id} value={cartao.id}>
                            {cartao.nome} - Limite Disp: R$ {cartao.limiteDisponivel.toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 block">Data da Baixa</label>
                    <input
                      type="date"
                      value={baixaData}
                      onChange={(e) => setBaixaData(e.target.value)}
                      className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setPayCommitmentItem(null)}
                disabled={payingCommitment}
                className="w-1/2 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmBaixa}
                disabled={payingCommitment}
                className="w-1/2 py-2 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {payingCommitment ? "Processando..." : "Confirmar Baixa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 4: Baixa em Lote ──────────────────────────────────────── */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/50">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Pagar Contas em Lote</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {selectedCommitmentIds.length} contas selecionadas • Total: <strong className="text-emerald-600 font-bold">{brl(selectedBatchTotal)}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBatchModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 block">Qual Conta Corrente Debitar?</label>
                <select
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm cursor-pointer"
                  value={batchBaixaContaId}
                  onChange={(e) => setBatchBaixaContaId(e.target.value)}
                >
                  {(accounts.length > 0 ? accounts : contasBancarias).map((conta: any) => (
                    <option key={conta.id} value={conta.id}>
                      {conta.bankName || conta.banco || conta.title} - Saldo Atual: {brl(Number(conta.saldoAtual || 0))}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 block">Data da Baixa</label>
                <input
                  type="date"
                  value={batchBaixaData}
                  onChange={(e) => setBatchBaixaData(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm"
                />
              </div>

              {/* Prévia do impacto financeiro na conta escolhida */}
              {(() => {
                const listContas = accounts.length > 0 ? accounts : contasBancarias;
                const selectedConta = listContas.find((c: any) => c.id === batchBaixaContaId) || listContas[0];
                if (!selectedConta) return null;
                const saldoAtualNum = Number(selectedConta.saldoAtual || 0);
                const saldoPosDebito = saldoAtualNum - selectedBatchTotal;
                const hasSaldo = saldoPosDebito >= 0;

                return (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Saldo Atual ({selectedConta.bankName || selectedConta.banco || selectedConta.title}):</span>
                      <span className="font-bold tabular-nums text-slate-800 dark:text-slate-200">{brl(saldoAtualNum)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Total das {selectedCommitmentIds.length} Contas:</span>
                      <span className="font-bold tabular-nums text-amber-600 dark:text-amber-400">-{brl(selectedBatchTotal)}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <span className="font-bold text-slate-700 dark:text-slate-300">Saldo Previsto Após Baixa:</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`font-black tabular-nums ${hasSaldo ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                          {brl(saldoPosDebito)}
                        </span>
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${hasSaldo ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400" : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-400"}`}>
                          {hasSaldo ? "✓ Cobre" : "⚠ Negativo"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => setBatchModalOpen(false)}
                disabled={payingBatch}
                className="w-1/2 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchBaixa}
                disabled={payingBatch}
                className="w-1/2 py-2 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {payingBatch ? "Processando..." : `Confirmar Baixa (${selectedCommitmentIds.length} contas)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 5: Nova Conta Bancária ────────────────────────────────── */}
      {newAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/50">
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Nova Conta Bancária</h3>
              </div>
              <button
                onClick={() => setNewAccountModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewAccount} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Nome do Banco / Conta *</label>
                <input
                  type="text"
                  placeholder="Ex: Santander, Nubank, Itaú Personalité"
                  value={accBankName}
                  onChange={(e) => setAccBankName(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Titular (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Túlio Cavalcanti"
                  value={accHolder}
                  onChange={(e) => setAccHolder(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Saldo Atual Inicial (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={accInitialBalance}
                  onChange={(e) => setAccInitialBalance(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={savingAccount}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {savingAccount ? "Cadastrando..." : "Cadastrar Conta"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 6: Editar Compromisso ─────────────────────────────────── */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/50">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Editar Compromisso</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Edite vencimento, competência, tipo e valor
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Descrição *
                </label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Mês de Referência / Competência *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={editCompMonth}
                    onChange={(e) => setEditCompMonth(Number(e.target.value))}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {MONTH_NAMES_LIST.map((m, idx) => (
                      <option key={idx + 1} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={editCompYear}
                    onChange={(e) => setEditCompYear(Number(e.target.value))}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {[2024, 2025, 2026, 2027, 2028].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                    Vencimento *
                  </label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                    Tipo do Compromisso
                  </label>
                  <select
                    value={editTipo}
                    onChange={(e) => setEditTipo(e.target.value as any)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="BOLETO">Boleto / Conta Fixa</option>
                    <option value="ASSINATURA">Assinatura / Mensalidade</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                    Recorrência
                  </label>
                  <select
                    value={editRecorrencia}
                    onChange={(e) => setEditRecorrencia(e.target.value as any)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="MENSAL">Repetir todo mês</option>
                    <option value="UNICO">Apenas neste mês</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Conta Bancária de Débito
                </label>
                <select
                  value={editWalletId}
                  onChange={(e) => setEditWalletId(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {(accounts.length > 0 ? accounts : contasBancarias).map((conta: any) => (
                    <option key={conta.id} value={conta.id}>{conta.title || conta.banco}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="w-1/2 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editingCommitment}
                  className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                >
                  {editingCommitment ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 7: Excluir Compromisso ────────────────────────────────── */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Excluir Compromisso</h3>
                <p className="text-xs text-slate-500">Esta ação não poderá ser desfeita.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Tem certeza que deseja excluir <strong>{itemToDelete.description}</strong> ({brl(itemToDelete.amount)})?
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletingCommitment}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                {deletingCommitment ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 8: Editar Movimentação Realizada (Extrato) ─────────────── */}
      {editMovementItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/50">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Editar Movimentação</h3>
                  <p className="text-[11px] text-slate-500">Alterar dados do lançamento no extrato</p>
                </div>
              </div>
              <button onClick={() => setEditMovementItem(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditMovement} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Descrição *</label>
                <input
                  type="text"
                  value={editMovDesc}
                  onChange={(e) => setEditMovDesc(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Qual Conta? *</label>
                <select
                  value={editMovWalletId}
                  onChange={(e) => setEditMovWalletId(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm cursor-pointer"
                  required
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.bankName || a.title} (Saldo: {brl(Number(a.saldoAtual || 0))})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editMovAmount}
                    onChange={(e) => setEditMovAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm font-bold tabular-nums"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Data da Operação *</label>
                  <input
                    type="date"
                    value={editMovDate}
                    onChange={(e) => setEditMovDate(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Categoria</label>
                  <input
                    type="text"
                    value={editMovCategory}
                    onChange={(e) => setEditMovCategory(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Método</label>
                  <select
                    value={editMovMetodo}
                    onChange={(e) => setEditMovMetodo(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm cursor-pointer"
                  >
                    <option value="PIX">Pix</option>
                    <option value="DEBITO">Cartão de Débito</option>
                    <option value="BOLETO">Boleto Pago</option>
                    <option value="TED_DOC">TED / Transferência</option>
                    <option value="DINHEIRO">Dinheiro em Espécie</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Observações (Opcional)</label>
                <input
                  type="text"
                  value={editMovNotes}
                  onChange={(e) => setEditMovNotes(e.target.value)}
                  placeholder="Anotações sobre a movimentação..."
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditMovementItem(null)}
                  disabled={savingEditMovement}
                  className="w-1/2 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEditMovement}
                  className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  {savingEditMovement ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 9: Excluir Movimentação Realizada (Extrato) ─────────────── */}
      {movementToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200/50">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Excluir Movimentação</h3>
                <p className="text-xs text-slate-500">O saldo da conta será recalculado automaticamente.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs space-y-1">
              <p className="font-bold text-slate-900 dark:text-white text-sm">
                {movementToDelete.description}
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                Valor: <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{brl(movementToDelete.amount)}</span>
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                Conta: <span className="font-semibold text-slate-700 dark:text-slate-300">{movementToDelete.walletName}</span>
              </p>
              {movementToDelete.date && (
                <p className="text-slate-500 dark:text-slate-400">
                  Data: {movementToDelete.date.split("T")[0].split("-").reverse().join("/")}
                </p>
              )}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Tem certeza que deseja remover este lançamento do extrato? Ao confirmar, o valor será estornado do saldo da conta bancária.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMovementToDelete(null)}
                disabled={deletingMovement}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteMovement}
                disabled={deletingMovement}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-60 shadow-xs"
              >
                {deletingMovement ? "Excluindo..." : "Sim, Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
