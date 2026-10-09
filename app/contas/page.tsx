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
  TrendingUp,
  TrendingDown,
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

const MONTH_NAMES_LIST = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export type AgendaPeriodFilter = "ALL" | "CURRENT_MONTH" | "NEXT_MONTH" | "CUSTOM";

export default function GestaoCaixaContasPage() {
  const { selectedYear, prevYear, nextYear, goToCurrentYear } = usePeriod();
  const { showAlert } = useModal();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"TODOS" | "AGENDA" | "EXTRATO">("TODOS");

  // Dados consolidados
  const [accounts, setAccounts] = useState<any[]>([]);
  const [realizedTransactions, setRealizedTransactions] = useState<any[]>([]);
  const [pendingCommitments, setPendingCommitments] = useState<any[]>([]);
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
      setContasBancarias(data.contasBancarias || []);
      setCartoesCredito(data.cartoesCredito || []);
      setTotals(data.totals);

      if (data.accounts?.length > 0 && !movWalletId) {
        setMovWalletId(data.accounts[0].id);
      }
      if (data.contasBancarias?.length > 0) {
        setBaixaContaId((prev) => prev || data.contasBancarias[0].id);
        setBatchBaixaContaId((prev) => prev || data.contasBancarias[0].id);
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

  const matchesAgendaPeriod = (item: any): boolean => {
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
    if (agendaPeriodFilter === "CURRENT_MONTH") return `Mês Atual (${currentPeriodLabel})`;
    if (agendaPeriodFilter === "NEXT_MONTH") return `Próximo Mês (${nextPeriodLabel})`;
    if (agendaPeriodFilter === "CUSTOM") {
      const mName = MONTH_NAMES_LIST[customFilterMonth - 1] || "";
      return `${mName}/${customFilterYear}`;
    }
    return `Todas as Pendências (${selectedYear})`;
  }, [agendaPeriodFilter, currentPeriodLabel, nextPeriodLabel, customFilterMonth, customFilterYear, selectedYear]);

  // Contas pendentes que atendem ao período selecionado (sem o filtro textual de busca, para alimentar as métricas)
  const periodFilteredPendingCommitments = useMemo(() => {
    return pendingCommitments.filter((item) => matchesAgendaPeriod(item));
  }, [
    pendingCommitments,
    agendaPeriodFilter,
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

  // Saldo projetado adaptado ao período filtrado
  const periodSaldoProjetado = useMemo(() => {
    if (agendaPeriodFilter === "ALL") {
      return totals.saldoProjetado;
    }
    // Saldo Real em conta menos as obrigações a pagar do período filtrado
    return totals.totalRealBalance - periodPendingTotal;
  }, [agendaPeriodFilter, totals.saldoProjetado, totals.totalRealBalance, periodPendingTotal]);

  // Filtros da Agenda de Contas a Pagar (Apenas itens PENDENTES que batem com período e busca)
  const filteredPendingCommitments = useMemo(() => {
    const list = pendingCommitments.filter((item) => {
      // 1. Filtro de competência / vencimento
      if (!matchesAgendaPeriod(item)) return false;

      // 2. Filtro de busca textual
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
    customFilterMonth,
    customFilterYear,
    currentMonthNum,
    currentYearNum,
    nextMonthNum,
    nextYearNum,
  ]);

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
      if (extratoAccountFilter !== "ALL" && tx.walletId !== extratoAccountFilter) {
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
    if (contasBancarias.length > 0) {
      setBaixaContaId(contasBancarias[0].id);
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
    if (contasBancarias.length > 0) {
      setBatchBaixaContaId(contasBancarias[0].id);
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
        competenceMonth: editCompMonth,
        competenceYear: editCompYear,
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
    <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto flex flex-col gap-8 select-none relative font-sans text-slate-900 dark:text-slate-100">
      
      {/* ── Top Header & Controles Globais ─────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <Link
          href="/"
          prefetch={false}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 w-fit transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar para o Dashboard
        </Link>

        <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-3.5">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <Building2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              Conta Corrente & Extrato
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Controle unificado de saldo bancário real, despesas avulsas e obrigações a pagar.
            </p>
          </div>

          <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 sm:gap-2.5 overflow-x-auto pb-1 lg:pb-0">
            {/* Seletor Anual */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl shadow-xs shrink-0">
              <button
                type="button"
                onClick={prevYear}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Ano Anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 py-0.5 text-xs font-black text-indigo-600 dark:text-indigo-400 tracking-wider tabular-nums">
                ANO {selectedYear}
              </span>
              <button
                type="button"
                onClick={nextYear}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Próximo Ano"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              {selectedYear !== new Date().getFullYear() && (
                <button
                  type="button"
                  onClick={goToCurrentYear}
                  className="px-2 py-0.5 text-[9px] font-black uppercase rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors cursor-pointer"
                >
                  Ano Atual
                </button>
              )}
            </div>

            {/* Botões Rápidos Compactos na Mesma Linha */}
            <button
              onClick={() => setNewCommitmentModalOpen(true)}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl font-bold text-xs tracking-wide shadow-xs shadow-indigo-600/20 transition-all hover:scale-[1.01] cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Boleto</span>
            </button>
            <button
              onClick={() => setNewMovementModalOpen(true)}
              className="flex items-center gap-1.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white px-3 py-2 rounded-xl font-bold text-xs tracking-wide transition-all shadow-xs cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Movimentação Avulsa</span>
            </button>
            <button
              onClick={handleOpenBatchWeeklyModal}
              className="flex items-center gap-1.5 border border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-50/70 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 px-3 py-2 rounded-xl font-bold text-xs tracking-wide transition-all shadow-xs hover:scale-[1.01] cursor-pointer whitespace-nowrap shrink-0"
              title="Registrar fechamento semanal de pequenos gastos (Débito e Pix)"
            >
              <CalendarRange className="w-3.5 h-3.5 text-amber-500" />
              <span>Fechamento Semanal</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 1. Visão Geral Superior: 4 Cards Consolidados (Grid de 4 colunas desktop) ────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Saldo Real em Conta */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                Saldo Real em Conta
              </span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/50 dark:border-indigo-800/50">
                <Wallet className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className={`text-2xl sm:text-3xl font-black tracking-tight tabular-nums ${totals.totalRealBalance >= 0 ? "text-slate-900 dark:text-white" : "text-rose-500"}`}>
              {brl(totals.totalRealBalance)}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span>Saldo líquido atualizado</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">{accounts.length} {accounts.length === 1 ? "conta ativa" : "contas ativas"}</span>
          </div>
        </div>

        {/* Card 2: Receitas do Período (Ano) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-emerald-200/70 dark:border-emerald-900/50 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                Receitas do Período ({selectedYear})
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/50 dark:border-emerald-800/50">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums">
              {brl(totals.totalReceitasAno)}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span>Realizadas: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{brl(totals.totalRealizedIncome)}</strong></span>
            <span>A receber: <strong className="text-slate-700 dark:text-slate-300 font-bold">{brl(totals.totalPendingIncome)}</strong></span>
          </div>
        </div>

        {/* Card 3: Despesas / Compromissos Pendentes (Ano ou Período Filtrado) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-amber-200/70 dark:border-amber-900/50 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider">
                  {agendaPeriodFilter === "ALL" ? `Despesas Pendentes (${selectedYear})` : "Despesas Pendentes"}
                </span>
                {agendaPeriodFilter !== "ALL" && (
                  <span className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[9px] font-black px-1.5 py-0.5 rounded-full border border-amber-300/60 dark:border-amber-700/60 truncate">
                    Filtrado: {activePeriodBadgeLabel}
                  </span>
                )}
              </div>
              <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/50 dark:border-amber-800/50 shrink-0">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight tabular-nums">
              {brl(agendaPeriodFilter === "ALL" ? totals.totalPendentesAno : periodPendingTotal)}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span>
              {agendaPeriodFilter === "ALL" ? "Boletos & contas no ano" : "Boletos & contas no período"}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {agendaPeriodFilter === "ALL"
                  ? `${totals.pendingCount} ${totals.pendingCount === 1 ? "conta a quitar" : "contas a quitar"}`
                  : `${periodFilteredPendingCommitments.length} ${periodFilteredPendingCommitments.length === 1 ? "conta a quitar" : "contas a quitar"}`}
              </span>
              {agendaPeriodFilter !== "ALL" && (
                <button
                  type="button"
                  onClick={() => setAgendaPeriodFilter("ALL")}
                  className="text-[9px] text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 font-bold underline cursor-pointer"
                  title="Ver todo o ano"
                >
                  (Ver ano)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Card 4: Saldo Projetado (Ano ou Período Filtrado) */}
        <div className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/80 border shadow-xs relative overflow-hidden flex flex-col justify-between ${
          (agendaPeriodFilter === "ALL" ? totals.saldoProjetado : periodSaldoProjetado) >= 0
            ? "border-emerald-200/70 dark:border-emerald-900/50"
            : "border-rose-200/70 dark:border-rose-900/50"
        }`}>
          <div className={`absolute top-0 left-0 right-0 h-1 ${
            (agendaPeriodFilter === "ALL" ? totals.saldoProjetado : periodSaldoProjetado) >= 0 ? "bg-emerald-500" : "bg-rose-500"
          }`} />
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <span className={`text-[10px] font-black uppercase tracking-wider ${
                  (agendaPeriodFilter === "ALL" ? totals.saldoProjetado : periodSaldoProjetado) >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}>
                  Saldo Projetado
                </span>
                {agendaPeriodFilter !== "ALL" && (
                  <span className="inline-flex items-center gap-1 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-[9px] font-black px-1.5 py-0.5 rounded-full border border-indigo-300/60 dark:border-indigo-700/60 truncate">
                    Filtrado: {activePeriodBadgeLabel}
                  </span>
                )}
              </div>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 ${
                (agendaPeriodFilter === "ALL" ? totals.saldoProjetado : periodSaldoProjetado) >= 0
                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-800/50"
                  : "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200/50 dark:border-rose-800/50"
              }`}>
                {(agendaPeriodFilter === "ALL" ? totals.saldoProjetado : periodSaldoProjetado) >= 0 ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5" />
                )}
              </div>
            </div>
            <div className={`text-2xl sm:text-3xl font-black tracking-tight tabular-nums ${
              (agendaPeriodFilter === "ALL" ? totals.saldoProjetado : periodSaldoProjetado) >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-500 dark:text-rose-400"
            }`}>
              {brl(agendaPeriodFilter === "ALL" ? totals.saldoProjetado : periodSaldoProjetado)}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span title={agendaPeriodFilter === "ALL" ? "Saldo Real + Receitas Previstas - Compromissos Pendentes" : "Saldo Real em conta − Compromissos Pendentes do Período"}>
              {agendaPeriodFilter === "ALL" ? "Saldo Real + Receitas Previstas − Compromissos" : "Saldo Real − Pendências do Período"}
            </span>
            <span className={`font-bold ${
              (agendaPeriodFilter === "ALL" ? totals.saldoProjetado : periodSaldoProjetado) >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}>
              {(agendaPeriodFilter === "ALL" ? totals.saldoProjetado : periodSaldoProjetado) >= 0
                ? (agendaPeriodFilter === "ALL" ? "Livre pós-obrigações" : "Saldo cobre período")
                : "Déficit previsto"}
            </span>
          </div>
        </div>
      </section>

      {/* ── Mini-Cards de Contas Bancárias Cadastradas ───────────────────── */}
      {accounts.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Minhas Contas Bancárias ({accounts.length})
            </span>
            <button
              onClick={() => setNewAccountModalOpen(true)}
              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              + Adicionar Conta
            </button>
          </div>
          <div className={`grid grid-cols-1 ${accounts.length === 1 ? "max-w-2xl" : accounts.length === 2 ? "lg:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"} gap-4`}>
            {accounts.map((acc) => {
              const entradas = Number(acc.entradasAno || 0);
              const saidas = Number(acc.saidasAno || 0);
              const balanco = Number(acc.balancoAno ?? (entradas - saidas));
              const isSelected = extratoAccountFilter === acc.id;
              const walletTypeLabel = acc.walletType === "CONTA_CORRENTE" ? "Conta Corrente" : (acc.walletType === "DEBITO" ? "Débito" : "Conta");

              return (
                <div
                  key={acc.id}
                  onClick={() => setExtratoAccountFilter(isSelected ? "ALL" : acc.id)}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between gap-3.5 ${
                    isSelected
                      ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm"
                      : "bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs"
                  }`}
                >
                  {/* Topo do Card: Identificação completa sem truncamento prematuro */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200/50 dark:border-indigo-800/50">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                          {acc.bankName}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 uppercase shrink-0">
                          {walletTypeLabel}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                      {isSelected ? "✓ Filtrando extrato" : "Clique p/ filtrar"}
                    </span>
                  </div>

                  {/* Conteúdo: Saldo Real e Métricas da Conta */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                        Saldo Real Disponível
                      </span>
                      <p className={`text-xl sm:text-2xl font-black tabular-nums mt-0.5 ${acc.saldoAtual >= 0 ? "text-slate-900 dark:text-white" : "text-rose-500"}`}>
                        {brl(acc.saldoAtual)}
                      </p>
                    </div>

                    <div className="flex flex-col gap-1 text-xs sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800/50">
                      <div className="flex items-center sm:justify-end gap-2 text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-emerald-500" /> Entradas:
                        </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          +{brl(entradas)}
                        </span>
                      </div>
                      <div className="flex items-center sm:justify-end gap-2 text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <TrendingDown className="w-3 h-3 text-rose-500" /> Saídas:
                        </span>
                        <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                          -{brl(saidas)}
                        </span>
                      </div>
                      <div className="flex items-center sm:justify-end gap-2 text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800/60 font-semibold">
                        <span className="text-slate-600 dark:text-slate-300">Balanço:</span>
                        <span className={`font-black tabular-nums ${balanco >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                          {balanco >= 0 ? `+${brl(balanco)}` : `-${brl(Math.abs(balanco))}`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Seletor de Visualização / Abas ──────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <button
            onClick={() => setActiveTab("TODOS")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "TODOS"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Visão Completa
          </button>
          <button
            onClick={() => setActiveTab("AGENDA")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "AGENDA"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400"
            }`}
          >
            <Clock className="w-3 h-3" />
            Agenda a Pagar ({totals.pendingCount})
          </button>
          <button
            onClick={() => setActiveTab("EXTRATO")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "EXTRATO"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            Extrato Realizado ({totals.realizedCount})
          </button>
        </div>
      </div>

      {/* ── SEÇÃO A: AGENDA DE CONTAS A PAGAR (Apenas itens PENDENTES) ───── */}
      {(activeTab === "TODOS" || activeTab === "AGENDA") && (
        <section className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 bg-slate-50/40 dark:bg-slate-950/20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/50 dark:border-amber-800/50">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                  Agenda de Contas a Pagar
                  <span className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full">
                    Apenas Pendentes ({filteredPendingCommitments.length})
                  </span>
                  {agendaPeriodFilter !== "ALL" && (
                    <span className="inline-flex items-center gap-1 bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full">
                      Filtrado por: {activePeriodBadgeLabel}
                      <button
                        type="button"
                        onClick={() => setAgendaPeriodFilter("ALL")}
                        className="hover:text-amber-900 dark:hover:text-white cursor-pointer ml-0.5"
                        title="Limpar filtro de período"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Boletos, assinaturas e despesas a quitar. Ao pagar, o débito entra automaticamente no extrato.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 w-full xl:w-auto">
              {/* ── 1. Atalhos Rápidos & Seletor de Competência / Período ── */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 w-full sm:w-auto">
                {/* Botões Rápidos em Pílula */}
                <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setAgendaPeriodFilter("CURRENT_MONTH")}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      agendaPeriodFilter === "CURRENT_MONTH"
                        ? "bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                    title={`Ver pendências do mês atual (${currentPeriodLabel})`}
                  >
                    Mês Atual
                  </button>
                  <button
                    type="button"
                    onClick={() => setAgendaPeriodFilter("NEXT_MONTH")}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      agendaPeriodFilter === "NEXT_MONTH"
                        ? "bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                    title={`Ver pendências do próximo mês (${nextPeriodLabel})`}
                  >
                    Próximo Mês
                  </button>
                  <button
                    type="button"
                    onClick={() => setAgendaPeriodFilter("ALL")}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      agendaPeriodFilter === "ALL"
                        ? "bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                    title={`Ver todas as pendências de ${selectedYear}`}
                  >
                    Todas ({selectedYear})
                  </button>
                </div>

                {/* Dropdown Seletor Avançado / Personalizado */}
                <div className="relative">
                  <CalendarRange className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none" />
                  <select
                    value={agendaPeriodFilter}
                    onChange={(e) => setAgendaPeriodFilter(e.target.value as AgendaPeriodFilter)}
                    className="w-full sm:w-auto bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-8 py-1.5 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-amber-500 cursor-pointer appearance-none transition-colors"
                  >
                    <option value="CURRENT_MONTH">Mês Atual ({currentPeriodLabel})</option>
                    <option value="NEXT_MONTH">Próximo Mês ({nextPeriodLabel})</option>
                    <option value="ALL">Todas as Pendências ({selectedYear})</option>
                    <option value="CUSTOM">Outro mês personalizado...</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                {agendaPeriodFilter === "CUSTOM" && (
                  <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-150">
                    <select
                      value={customFilterMonth}
                      onChange={(e) => setCustomFilterMonth(Number(e.target.value))}
                      className="bg-slate-50 dark:bg-slate-950 border border-amber-500/50 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      {MONTH_NAMES_LIST.map((m, idx) => (
                        <option key={idx + 1} value={idx + 1}>{m}</option>
                      ))}
                    </select>
                    <select
                      value={customFilterYear}
                      onChange={(e) => setCustomFilterYear(Number(e.target.value))}
                      className="bg-slate-50 dark:bg-slate-950 border border-amber-500/50 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      {[selectedYear - 1, selectedYear, selectedYear + 1, selectedYear + 2].map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* ── Campo de Busca ── */}
              <div className="relative flex-1 sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={agendaSearch}
                  onChange={(e) => setAgendaSearch(e.target.value)}
                  placeholder="Buscar conta pendente..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-colors"
                />
                {agendaSearch && (
                  <button
                    type="button"
                    onClick={() => setAgendaSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tabela de Pendentes */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-auto text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider bg-slate-50/50 dark:bg-slate-950/40">
                  <th className="py-2.5 px-3 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={isAllVisibleSelected}
                      onChange={(e) => handleToggleSelectAllVisible(e.target.checked)}
                      disabled={filteredPendingCommitments.length === 0}
                      className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-amber-600 focus:ring-amber-500 cursor-pointer disabled:opacity-40"
                      title={isAllVisibleSelected ? "Desmarcar todas visíveis" : "Marcar todas visíveis"}
                    />
                  </th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Vencimento</th>
                  <th className="py-2.5 px-3">Descrição / Fornecedor</th>
                  <th className="py-2.5 px-2 whitespace-nowrap">Tipo</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Valor</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">Status</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Ação Rápida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredPendingCommitments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500/80 dark:text-emerald-400/80" />
                        <p className="font-semibold text-xs text-slate-600 dark:text-slate-300">
                          {agendaPeriodFilter !== "ALL"
                            ? `Nenhum compromisso pendente encontrado para ${activePeriodBadgeLabel}.`
                            : `Nenhum compromisso pendente no ano de ${selectedYear}.`}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {agendaPeriodFilter !== "ALL"
                            ? "Não há boletos ou despesas a quitar com vencimento neste período selecionado."
                            : "Todas as obrigações cadastradas já foram quitadas ou não há lançamentos futuros."}
                        </p>
                        {agendaPeriodFilter !== "ALL" && (
                          <button
                            type="button"
                            onClick={() => setAgendaPeriodFilter("ALL")}
                            className="mt-2 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                          >
                            Ver todas as pendências do ano ({totals.pendingCount})
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPendingCommitments.map((item, index) => {
                    const isSelected = selectedCommitmentIds.includes(item.id);
                    const isCritico = checkIsVencimentoCritico(item);

                    // Agrupamento visual por mês quando visualizando todas as pendências
                    const parts = getItemDueDateParts(item);
                    const currentMonthKey = parts ? `${parts.year}-${String(parts.month).padStart(2, "0")}` : "sem-data";
                    const prevParts = index > 0 ? getItemDueDateParts(filteredPendingCommitments[index - 1]) : null;
                    const prevMonthKey = prevParts ? `${prevParts.year}-${String(prevParts.month).padStart(2, "0")}` : null;
                    const isNewMonth = agendaPeriodFilter === "ALL" && (index === 0 || currentMonthKey !== prevMonthKey);
                    const monthInfo = isNewMonth ? monthlyTotalsMap.get(currentMonthKey) : null;

                    return (
                      <React.Fragment key={item.id}>
                        {isNewMonth && (
                          <tr className="bg-slate-100/90 dark:bg-slate-800/80 border-y border-slate-200/80 dark:border-slate-700/80">
                            <td colSpan={7} className="py-2.5 px-3">
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">📅</span>
                                  <span className="font-extrabold uppercase tracking-wide text-[11px] text-slate-800 dark:text-slate-100">
                                    {monthInfo?.label || "Compromissos"}
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/90 dark:bg-slate-700/90 font-bold text-slate-600 dark:text-slate-300">
                                    {monthInfo?.count || 1} {monthInfo?.count === 1 ? "conta pendente" : "contas pendentes"}
                                  </span>
                                </div>
                                <div className="font-mono text-xs font-black text-amber-700 dark:text-amber-400">
                                  Subtotal do Mês: {brl(monthInfo?.total || 0)}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}

                        <tr
                          className={`transition-colors group ${
                            isSelected
                              ? "bg-amber-50/60 dark:bg-amber-950/30"
                              : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCommitmentIds((prev) => [...prev, item.id]);
                                } else {
                                  setSelectedCommitmentIds((prev) => prev.filter((id) => id !== item.id));
                                }
                              }}
                              className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-amber-600 focus:ring-amber-500 cursor-pointer"
                            />
                          </td>

                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                {item.dueDateFormatted}
                              </span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {isCritico ? (
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${item.dueBadge?.color || "bg-amber-500/15 text-amber-700 border-amber-500/30"}`}>
                                    {item.dueBadge?.label || "Urgente"}
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                    {item.dueBadge?.label || "A Vencer"}
                                  </span>
                                )}
                                {(item.competenciaLabel || item.competenciaShort) && (
                                  <span
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50/90 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70"
                                    title="Mês de Competência / Consumo de referência"
                                  >
                                    Ref: {item.competenciaLabel || item.competenciaShort}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-2.5 px-3 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                                item.tipo === "FATURA_CARTAO"
                                  ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                  : item.tipo === "ASSINATURA"
                                  ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              }`}>
                                {item.tipo === "FATURA_CARTAO" ? (
                                  <CreditCard className="w-3 h-3" />
                                ) : item.tipo === "ASSINATURA" ? (
                                  <Zap className="w-3 h-3" />
                                ) : (
                                  <Receipt className="w-3 h-3" />
                                )}
                              </div>
                              <span className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[220px]">
                                {item.description}
                              </span>
                            </div>
                          </td>

                          <td className="py-2.5 px-2 whitespace-nowrap">
                            {item.tipo === "FATURA_CARTAO" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold border bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                                Fatura de Cartão
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold border bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {item.tipoLabel || "Boleto"}
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono tabular-nums font-black text-slate-900 dark:text-white text-xs sm:text-sm">
                            {brl(item.amount)}
                          </td>

                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                              Pendente
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {isCritico ? (
                                <button
                                  onClick={() => handleOpenBaixaModal(item)}
                                  className="inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all cursor-pointer"
                                  title="Pagar conta e lançar no extrato"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Pagar / Baixar</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleOpenBaixaModal(item)}
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                                  title="Liquidar antecipadamente ou dar baixa"
                                >
                                  <Check className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                  <span>Baixar</span>
                                </button>
                              )}

                              {/* Menu 3 Pontos */}
                              <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => setActiveActionMenuId(activeActionMenuId === item.id ? null : item.id)}
                                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>
                                {activeActionMenuId === item.id && (
                                  <div className="absolute right-0 z-30 mt-1 w-48 rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 py-1 text-left">
                                    {item.isCardInvoice ? (
                                      <Link
                                        href={`/cartoes/${item.cardWalletId || item.walletId}`}
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
                                            setEditItem(item);
                                            setEditDesc(item.description);
                                            setEditAmount(String(item.amount));
                                            setEditDueDate(item.dueDate ? item.dueDate.split("T")[0] : "");
                                            setEditTipo(item.tipo || "BOLETO");
                                            setEditRecorrencia(item.recorrencia || "MENSAL");
                                            setEditCompMonth(item.competenceMonth || new Date().getMonth() + 1);
                                            setEditCompYear(item.competenceYear || selectedYear);
                                          }}
                                          className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                                        >
                                          <Pencil className="w-3.5 h-3.5 text-slate-400" />
                                          <span>Editar</span>
                                        </button>
                                        <button
                                          type="button"
                                          disabled={duplicatingId === item.id}
                                          onClick={() => {
                                            setActiveActionMenuId(null);
                                            handleDuplicateToNextMonth(item);
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
                                            setItemToDelete(item);
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
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── SEÇÃO B: EXTRATO DA CONTA (Movimentações Realizadas) ─────────── */}
      {(activeTab === "TODOS" || activeTab === "EXTRATO") && (
        <section className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-50/40 dark:bg-slate-950/20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/50 dark:border-indigo-800/50">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  Extrato da Conta (Movimentações Realizadas)
                  <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-black px-2 py-0.5 rounded-full">
                    {filteredRealizedMovements.length} {filteredRealizedMovements.length === 1 ? "operação" : "operações"}
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Movimentações estritamente executadas (Pix, depósitos, débitos e boletos liquidados).
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              {/* Filtro por Conta */}
              <select
                value={extratoAccountFilter}
                onChange={(e) => setExtratoAccountFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-white font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="ALL">Todas as Contas</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.bankName}
                  </option>
                ))}
              </select>

              <div className="relative flex-1 md:w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={extratoSearch}
                  onChange={(e) => setExtratoSearch(e.target.value)}
                  placeholder="Buscar no extrato..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                {extratoSearch && (
                  <button
                    onClick={() => setExtratoSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tabela do Extrato */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-auto text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider bg-slate-50/50 dark:bg-slate-950/40">
                  <th className="py-2.5 px-4 whitespace-nowrap">Data</th>
                  <th className="py-2.5 px-4">Descrição</th>
                  <th className="py-2.5 px-3">Conta / Banco</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Categoria / Método</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">Valor</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {displayedRealizedMovements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      Nenhuma movimentação realizada encontrada para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  displayedRealizedMovements.map((tx) => {
                    const isIncome = tx.type === "INCOME";
                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-2.5 px-4 whitespace-nowrap font-medium text-slate-600 dark:text-slate-400">
                          {tx.date ? tx.date.split("T")[0].split("-").reverse().join("/") : "-"}
                        </td>

                        <td className="py-2.5 px-4 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                              isIncome ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                            }`}>
                              {isIncome ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                {Boolean(tx.isBatchWeekly || (tx.description || "").includes("[Semanal]") || (tx as any).tags?.includes("FECHAMENTO_SEMANAL")) && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shrink-0">
                                    <CalendarRange className="w-2.5 h-2.5" />
                                    Semanal
                                  </span>
                                )}
                                <span className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[280px]">
                                  {(tx.description || "").replace(/^\[Semanal\]\s*/, "")}
                                </span>
                              </div>
                              {tx.notes && (
                                <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-normal truncate max-w-[280px] mt-0.5">
                                  {tx.notes}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-600 dark:text-slate-400">
                          {tx.walletName}
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {tx.category}
                            </span>
                            <span className="text-[9px] font-bold uppercase text-slate-400">
                              {tx.paymentMethod}
                            </span>
                          </div>
                        </td>

                        <td className="py-2.5 px-4 text-right whitespace-nowrap font-mono tabular-nums font-black text-xs sm:text-sm">
                          <span className={isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                            {isIncome ? "+" : "-"}{brl(tx.amount)}
                          </span>
                        </td>

                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditMovement(tx)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Editar movimentação"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setMovementToDelete(tx)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Excluir movimentação"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Botão de Expansão (10 Últimas ou Todas) */}
          {filteredRealizedMovements.length > 10 && (
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-center">
              <button
                type="button"
                onClick={() => setShowAllMovements(!showAllMovements)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors cursor-pointer"
              >
                {showAllMovements ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Recolher para as 10 últimas movimentações</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Ver todas as {filteredRealizedMovements.length} movimentações realizadas</span>
                  </>
                )}
              </button>
            </div>
          )}
        </section>
      )}

      {/* ── Barra Flutuante de Seleção Dinâmica & Calculadora (Floating Action Bar) ────────────────────────────── */}
      {selectedCommitmentIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-4xl bg-slate-900/95 dark:bg-[#0B132B]/95 border border-slate-700/80 dark:border-indigo-500/40 text-white px-4 sm:px-6 py-3.5 sm:py-4 rounded-2xl shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
            {/* Bloco 1: Contador & Valores Calculados */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 sm:gap-3.5 w-full md:w-auto">
              {/* Contador */}
              <div className="flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-xl text-xs font-black shadow-2xs shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {selectedCommitmentIds.length} {selectedCommitmentIds.length === 1 ? "conta selecionada" : "contas selecionadas"}
                </span>
              </div>

              {/* Somatório Total Calculado */}
              <div className="flex items-baseline gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 dark:bg-slate-900/80 border border-slate-700/60 shrink-0">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Total a pagar:
                </span>
                <span className="text-sm sm:text-base font-black font-mono tabular-nums text-amber-400">
                  {brl(selectedBatchTotal)}
                </span>
              </div>

              {/* Impacto no Saldo Real */}
              {(() => {
                const saldoRestante = totals.totalRealBalance - selectedBatchTotal;
                const cobreSaldo = saldoRestante >= 0;

                return (
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-colors shrink-0 ${
                      cobreSaldo
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                    }`}
                    title="Impacto no Saldo Real consolidado de todas as contas após quitar os itens selecionados"
                  >
                    <span className="text-[11px] font-bold text-slate-300">
                      Saldo Restante:
                    </span>
                    <span
                      className={`text-xs sm:text-sm font-black font-mono tabular-nums ${
                        cobreSaldo ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {brl(saldoRestante)}
                    </span>
                    <span
                      className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        cobreSaldo
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      }`}
                    >
                      {cobreSaldo ? "✓ Cobre" : "⚠ Negativo"}
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Bloco 2: Ações */}
            <div className="flex items-center justify-center md:justify-end gap-2 w-full md:w-auto shrink-0">
              <button
                type="button"
                onClick={handleOpenBatchModal}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs sm:text-sm px-4 py-2 sm:py-2.5 rounded-xl transition-all shadow-md shadow-emerald-600/30 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Pagar / Baixar Selecionadas em Lote</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCommitmentIds([])}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800/80 px-3 py-2 sm:py-2.5 rounded-xl transition-colors cursor-pointer"
                title="Limpar seleção"
              >
                <X className="w-4 h-4" />
                <span>Limpar Seleção</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
                      {a.bankName} (Saldo: R$ {a.saldoAtual.toFixed(2)})
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
                      {contasBancarias.map((conta) => (
                        <option key={conta.id} value={conta.id}>
                          {conta.banco} - Saldo: R$ {conta.saldoAtual.toFixed(2)}
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
                        {contasBancarias.map((conta) => (
                          <option key={conta.id} value={conta.id}>
                            {conta.banco} - Saldo: R$ {conta.saldoAtual.toFixed(2)}
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
                  {contasBancarias.map((conta: any) => (
                    <option key={conta.id} value={conta.id}>
                      {conta.banco} - Saldo Atual: {brl(Number(conta.saldoAtual || 0))}
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
                const selectedConta = contasBancarias.find((c: any) => c.id === batchBaixaContaId) || contasBancarias[0];
                if (!selectedConta) return null;
                const saldoAtualNum = Number(selectedConta.saldoAtual || 0);
                const saldoPosDebito = saldoAtualNum - selectedBatchTotal;
                const hasSaldo = saldoPosDebito >= 0;

                return (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Saldo Atual ({selectedConta.banco}):</span>
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Editar Compromisso</h3>
              <button onClick={() => setEditItem(null)} className="text-slate-400 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Descrição</label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">Vencimento</label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg text-sm"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="w-1/2 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editingCommitment}
                  className="w-1/2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg cursor-pointer disabled:opacity-50"
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
                      {a.bankName} (Saldo: R$ {a.saldoAtual.toFixed(2)})
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
