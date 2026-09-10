"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getCardDataById, saveCardLimit, saveCardDates, updateCardPurchase, deleteCardPurchase,
  deleteBatchPurchasesAction, markBatchTransactionsPaidAction, unmarkBatchTransactionsPaidAction,
  duplicateExpenseToNextMonthAction, duplicateBatchExpensesToNextMonthAction,
  addTicketCarga, saveTicketCarga, removeTicketCarga, toggleTransactionStatusAction,
  createRevenueAction, payCardInvoiceAction, undoCardInvoicePaymentAction, getAllCardsOverview
} from "@/lib/actions";
import {
  Trash2, X, Edit2, DollarSign, Clock, TrendingDown, TrendingUp, Settings, Plus, Sparkles,
  ArrowLeft, CreditCard, Building2, Zap, AlertCircle, CheckCircle2, Minus, Calendar, RotateCcw, CopyPlus, ChevronDown, FolderTree, List, ChevronRight, Check, Repeat
} from "lucide-react";
import { usePeriod } from "@/components/period-context";
import { PeriodHeader } from "@/components/period-header";
import { NewPurchaseModal } from "@/components/new-purchase-modal";
import { CreditCardInvoiceTable } from "@/components/credit-card-invoice-table";
import { CATEGORIES, getMonthName } from "@/lib/constants";
import { useModal } from "@/components/ui/custom-dialog-provider";
import { getInvoiceStatusInfo } from "@/lib/invoice-utils";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDateBR = (dateStr: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

const formatReference = (refDateStr?: string) => {
  if (!refDateStr) return "";
  const clean = refDateStr.split("T")[0];
  const parts = clean.split("-");
  if (parts.length >= 2) {
    const monthShorts = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const monthIndex = Number(parts[1]) - 1;
    return `${monthShorts[monthIndex] || parts[1]}/${parts[0]}`;
  }
  return refDateStr;
};

const isDifferentCompetence = (dateStr?: string, compDateStr?: string) => {
  if (!dateStr || !compDateStr) return false;
  const dClean = dateStr.split("T")[0].split("-");
  const cClean = compDateStr.split("T")[0].split("-");
  if (dClean.length < 2 || cClean.length < 2) return false;
  return dClean[0] !== cClean[0] || dClean[1] !== cClean[1];
};

type Purchase = {
  id: string;
  type: "vista" | "parcelado";
  description: string;
  category: string;
  amount: number;
  installmentsCount?: number;
  currentInstallment?: number;
  installmentGroupId?: string | null;
  tags?: string;
  isRecurring?: boolean;
  recurringDay?: number;
  date: string;
  competenceDate?: string;
};

type TransactionItem = {
  id: string;
  type: "INCOME" | "EXPENSE";
  description: string;
  category: string;
  amount: number;
  status?: string;
  installmentsCount?: number;
  date: string;
  competenceDate?: string;
  source?: string;
  tags?: string;
  isRecurring?: boolean;
};

type CardData = {
  walletId: string;
  title: string;
  bankName?: string;
  walletType: string;
  holder?: string;
  agencia?: string;
  conta?: string;
  vencimento?: number;
  diaFechamento?: number;
  melhorDiaCompra?: number;
  initialBalance: number;
  creditLimit: number;
  balanceInfo?: {
    initialBalance: number;
    carryoverBalance: number;
    previousBalance?: number;
    totalAvailable?: number;
    monthIncome: number;
    monthExpense: number;
    finalBalance: number;
  } | null;
  purchases: Purchase[];
  allTransactions?: TransactionItem[];
};

export default function CartaoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const cardId = params?.id as string;

  const { selectedMonth, selectedYear } = usePeriod();
  const { showAlert } = useModal();

  const [cardData, setCardData] = useState<CardData | null>(null);
  const [loading, setLoading]   = useState(true);

  // Múltipla Seleção (Exclusão em Lote)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchDeleteModalOpen, setBatchDeleteModalOpen] = useState(false);
  const [batchActionsModalOpen, setBatchActionsModalOpen] = useState(false);
  const [deletingBatch, setDeletingBatch] = useState(false);
  const [duplicatingBatch, setDuplicatingBatch] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Modais de edição/exclusão/carga/datas
  const [modalType, setModalType]               = useState<"limit" | "edit" | "delete" | "carga" | "cargaRemove" | "cargaSet" | "dates" | null>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [actionDropdownOpen, setActionDropdownOpen] = useState(false);

  // Modal Pagar Fatura
  const [payInvoiceModalOpen, setPayInvoiceModalOpen] = useState(false);
  const [isPayingInvoice, setIsPayingInvoice] = useState(false);
  const [selectedPaymentWalletId, setSelectedPaymentWalletId] = useState<string>("NONE");
  const [checkingWallets, setCheckingWallets] = useState<Array<{ id: string; title: string; bankName?: string }>>([]);

  // Filtro de fluxo (Todas | Entradas | Saídas)
  const [flowFilter, setFlowFilter] = useState<"all" | "income" | "expense">("all");
  const [bankFlowFilter, setBankFlowFilter] = useState<"all" | "income" | "expense">("all");
  // Filtro de recorrência (Todas | Compras Avulsas | Recorrentes / Fixas)
  const [recurrenceFilter, setRecurrenceFilter] = useState<"all" | "single" | "recurring">("all");
  const [bankRecurrenceFilter, setBankRecurrenceFilter] = useState<"all" | "single" | "recurring">("all");
  // Form Fields
  const [formLimit, setFormLimit] = useState<number | "">("");
  const [formDiaFechamento, setFormDiaFechamento] = useState<number>(1);
  const [formVencimento, setFormVencimento]       = useState<number>(10);
  const [formCarga, setFormCarga] = useState<number | "">("");
  const [formCargaOrigin, setFormCargaOrigin] = useState<"SALARIO" | "RECARGA" | "FREELANCE" | "INVESTIMENTO" | "APORTE" | "ROLLOVER">("SALARIO");
  const [formCargaMonth, setFormCargaMonth] = useState<number>(selectedMonth);
  const [formCargaYear, setFormCargaYear] = useState<number>(selectedYear);
  const [formType, setFormType] = useState<"vista" | "parcelado">("vista");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("Alimentação");
  const [formAmount, setFormAmount] = useState(0);
  const [formInstallmentAmount, setFormInstallmentAmount] = useState(0);
  const [formInstallmentsCount, setFormInstallmentsCount] = useState(2);
  const [formDate, setFormDate] = useState("");

  // Cálculo da soma total das despesas selecionadas (Hook posicionado no topo, ANTES de retornos condicionais)
  const selectedTotalAmount = React.useMemo(() => {
    if (!cardData || selectedIds.length === 0) return 0;
    let sum = 0;
    const purchaseMap = new Map((cardData.purchases || []).map(p => [p.id, p.amount]));
    const txMap = new Map((cardData.allTransactions || []).map(t => [t.id, t.amount]));

    for (const id of selectedIds) {
      if (txMap.has(id)) {
        sum += txMap.get(id)!;
      } else if (purchaseMap.has(id)) {
        sum += purchaseMap.get(id)!;
      }
    }
    return sum;
  }, [cardData, selectedIds]);

  const loadData = async () => {
    if (!cardId) return;
    setLoading(true);
    try {
      const data = await getCardDataById(cardId, selectedMonth, selectedYear);
      if (data) {
        setCardData(data);
      } else {
        setCardData(null);
      }
      try {
        const overview = await getAllCardsOverview(selectedMonth, selectedYear);
        const checking = overview.filter(c => c.walletType === "CONTA_CORRENTE");
        setCheckingWallets(checking);
      } catch (e) {
        // ignore
      }
    } catch (err) {
      console.error("Erro ao carregar dados do cartão:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setFormCargaMonth(selectedMonth);
    setFormCargaYear(selectedYear);
  }, [cardId, selectedMonth, selectedYear]);

  if (loading) {
    return (
      <div className="p-6 md:p-10 max-w-6xl mx-auto flex flex-col gap-6 animate-pulse select-none">
        <div className="h-8 bg-slate-200 rounded-xl w-48" />
        <div className="h-44 bg-white rounded-[28px] border border-slate-100" />
        <div className="h-64 bg-white rounded-[28px] border border-slate-100" />
      </div>
    );
  }

  if (!cardData) {
    return (
      <div className="p-6 md:p-10 max-w-6xl mx-auto flex flex-col items-center justify-center gap-4 text-center py-20">
        <AlertCircle className="w-12 h-12 text-rose-400" />
        <h2 className="text-base font-bold text-slate-700">Cartão não encontrado</h2>
        <button
          onClick={() => router.push("/despesas")}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
        >
          Voltar para Despesas
        </button>
      </div>
    );
  }

  const isCredit = cardData.walletType === "CREDIT_CARD";
  const isTicket = cardData.walletType === "TICKET";

  // Cálculos do Ticket
  const purchasesList = (cardData.purchases || []).filter(p => (p as any).source !== "RECURRING_PROJECTION");
  const totalUtilizadoTicket = purchasesList.reduce((acc, p) => acc + (p?.amount || 0), 0);
  const saldoDisponivelTicket = cardData.initialBalance || 0;
  const saldoAtualTicket      = saldoDisponivelTicket - totalUtilizadoTicket;

  const usagePctTicket = saldoDisponivelTicket > 0 ? Math.min(100, Math.round((totalUtilizadoTicket / saldoDisponivelTicket) * 100)) : 0;
  const remainingPctTicket = 100 - usagePctTicket;

  // Handlers
  const handleLimitSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formLimit === "" || isNaN(Number(formLimit)) || !cardData) return;
    const val = Number(formLimit);
    if (val < 0) return;
    try {
      await saveCardLimit(cardData.walletId, val);
      setCardData(prev => prev ? { ...prev, creditLimit: val } : null);
      setModalType(null);
      setFormLimit("");
    } catch (err) {
      console.error(err);
      showAlert("Erro ao salvar limite do cartão.", { variant: "error" });
    }
  };

  const handleAddCarga = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formCarga === "" || isNaN(Number(formCarga)) || !cardData) return;
    const val = Number(formCarga);
    if (val <= 0) return;
    try {
      const targetYear = formCargaYear || selectedYear;
      const targetMonth = formCargaMonth || selectedMonth;
      const dateToUse = `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`;
      const originLabels: Record<string, string> = {
        SALARIO: "Injeção de Capital / Salário",
        RECARGA: "Recarga de Saldo",
        FREELANCE: "Renda Extra / Freelance",
        INVESTIMENTO: "Resgate de Investimento",
        APORTE: "Outra Fonte / Aporte Direto",
        ROLLOVER: "Saldo do Mês Anterior"
      };
      const labelText = originLabels[formCargaOrigin] || "Aporte / Injeção de Saldo";
      const originLabel = labelText;
      const catName = labelText;

      await createRevenueAction(
        originLabel,
        val,
        dateToUse,
        cardData.walletId,
        "COMPLETED",
        dateToUse,
        catName
      );
      await loadData();
      setModalType(null);
      setFormCarga("");
      showAlert("Saldo/Entrada adicionado com sucesso!", { variant: "success" });
    } catch (err) {
      console.error(err);
      showAlert("Erro ao adicionar saldo/entrada.", { variant: "error" });
    }
  };

  const handleRemoveCarga = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formCarga === "" || isNaN(Number(formCarga)) || !cardData) return;
    const val = Number(formCarga);
    if (val <= 0) return;
    try {
      await removeTicketCarga(cardData.walletId, val);
      await loadData();
      setModalType(null);
      setFormCarga("");
    } catch (err) {
      console.error(err);
      showAlert("Erro ao remover carga.", { variant: "error" });
    }
  };

  const handleSetCarga = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formCarga === "" || isNaN(Number(formCarga)) || !cardData) return;
    const val = Number(formCarga);
    if (val < 0) return;
    try {
      await saveTicketCarga(cardData.walletId, val);
      await loadData();
      setModalType(null);
      setFormCarga("");
    } catch (err) {
      console.error(err);
      showAlert("Erro ao redefinir saldo total.", { variant: "error" });
    }
  };

  const openDatesModal = () => {
    if (!cardData) return;
    setFormDiaFechamento(cardData.diaFechamento || 1);
    setFormVencimento(cardData.vencimento || 10);
    setModalType("dates");
  };

  const handleDatesSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardData) return;
    const fech = Number(formDiaFechamento);
    const venc = Number(formVencimento);
    if (fech < 1 || fech > 31 || venc < 1 || venc > 31) {
      showAlert("Por favor insira dias válidos entre 1 e 31.", { variant: "warning" });
      return;
    }
    try {
      await saveCardDates(cardData.walletId, fech, venc);
      await loadData();
      setModalType(null);
    } catch (err) {
      console.error(err);
      showAlert("Erro ao salvar datas do cartão.", { variant: "error" });
    }
  };

  const togglePaymentStatus = async (id: string) => {
    setTogglingId(id);
    try {
      await toggleTransactionStatusAction(id);
      await loadData();
    } catch (err) {
      console.error("Erro ao alternar status do pagamento:", err);
      showAlert("Erro ao alternar status do pagamento.", { variant: "error" });
    } finally {
      setTogglingId(null);
    }
  };
  
  // Helper para obter Ano e Mês de AAAA-MM-DD
  const getYearMonth = (dateStr: string) => {
    if (!dateStr) return { year: 0, month: 0 };
    const clean = dateStr.split("T")[0];
    const parts = clean.split("-");
    return { year: Number(parts[0]) || 0, month: Number(parts[1]) || 0 };
  };

  const getTransactionDisplayYearMonth = (item: any) => {
    if (!item) return { year: 0, month: 0 };
    const ref = item.purchaseDate || item.date || item.competenceDate;
    return getYearMonth(ref);
  };

  const getCompetenceYearMonth = (item: any) => {
    if (!item) return { year: 0, month: 0 };
    const ref = item.purchaseDate || item.date || item.competenceDate;
    return getYearMonth(ref);
  };

  // 1. Assinaturas & Recorrências (Mês Atual por Competência)
  const subscriptionPurchases = purchasesList.filter((p) => {
    if (!p) return false;
    const { year, month } = getCompetenceYearMonth(p);
    const isSub = !!(p.isRecurring || (p.tags && p.tags.toLowerCase().includes("assinatura")));
    return year === selectedYear && month === selectedMonth && isSub;
  });

  // 2. Compras À Vista (Mês Atual por Competência - Exclui parceladas e assinaturas)
  const vistaPurchases = purchasesList.filter((p) => {
    if (!p || p.type !== "vista") return false;
    const { year, month } = getCompetenceYearMonth(p);
    const isSub = !!(p.isRecurring || (p.tags && p.tags.toLowerCase().includes("assinatura")));
    return year === selectedYear && month === selectedMonth && !isSub;
  });

  // 3. Lançamentos Parcelados (filtrados estritamente pelo mês/ano de competência)
  const selectedAbsolute = selectedYear * 12 + (selectedMonth - 1);

  const parceladoPurchasesProcessed = purchasesList
    .filter((p) => {
      if (!p || p.type !== "parcelado") return false;
      const { year, month } = getCompetenceYearMonth(p);
      return year === selectedYear && month === selectedMonth;
    })
    .map((p) => {
      let currInst = p.currentInstallment;
      const totalInst = p.installmentsCount || 1;

      if (!currInst || isNaN(currInst)) {
        const match = p.description.match(/\((\d+)\/(\d+)\)/);
        if (match) {
          currInst = Number(match[1]);
        } else {
          currInst = 1;
        }
      }

      const remainingCount = Math.max(1, totalInst - currInst + 1);
      const remainingDebt = remainingCount * (p.amount || 0);

      return {
        ...p,
        currentInstallment: currInst,
        installmentsCount: totalInst,
        remainingDebt,
      };
    });

  // Cálculos financeiros
  const saldoAssinaturas = subscriptionPurchases.reduce((sum, p) => sum + (p.amount || 0), 0);
  const saldoVista = vistaPurchases.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalParceladoMes = parceladoPurchasesProcessed.reduce((sum, p) => sum + (p.amount || 0), 0);
  const dividaParcelada = parceladoPurchasesProcessed.reduce((sum, p) => sum + (p.remainingDebt || 0), 0);

  // Para Cartão de Crédito - Fatura do Mês (Assinaturas + À vista + Parcelas do mês)
  const impactoMes = saldoAssinaturas + saldoVista + totalParceladoMes;
  
  // Recomposição de Limite Disponível (Global e Cumulativo):
  const paidInvoiceKeys = new Set<string>();
  if (cardData && (cardData as any).allPaidInvoices) {
    ((cardData as any).allPaidInvoices as Array<{ month: number; year: number }>).forEach(p => {
      paidInvoiceKeys.add(`${p.month}-${p.year}`);
    });
  }
  if ((cardData as any)?.isPaid) {
    paidInvoiceKeys.add(`${selectedMonth}-${selectedYear}`);
  }

  // Soma de todos os débitos em aberto no cartão cujas faturas de competência NÃO foram pagas
  const pendingDebitsSum = purchasesList
    .filter((p) => {
      if (!p || !p.amount) return false;
      const { year: pYear, month: pMonth } = getYearMonth(p.date);
      const key = `${pMonth}-${pYear}`;
      const isPaid = paidInvoiceKeys.has(key);
      return !isPaid;
    })
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const isInvoicePaid = !!(cardData as any).isPaid;
  const creditLimit = cardData.creditLimit || 0;
  const limitCompromised = pendingDebitsSum;
  const limitAvailable = Math.min(creditLimit, Math.max(0, creditLimit - limitCompromised));
  const usagePct = creditLimit > 0 ? Math.min(100, Math.round((limitCompromised / creditLimit) * 100)) : 0;

  // Para Ticket Alimentação / Benefício / Conta Corrente com Rollover
  const filteredMonthExpenses = purchasesList.filter(p => {
    if (!p) return false;
    const { year, month } = getCompetenceYearMonth(p);
    return year === selectedYear && month === selectedMonth;
  });

  // carryoverBalance = apenas transações de meses anteriores (0 no primeiro mês de uso)
  const carryoverBalance = cardData.balanceInfo != null ? cardData.balanceInfo.carryoverBalance : 0;
  const openingBalance   = cardData.balanceInfo?.initialBalance ?? (cardData.initialBalance || 0);
  const previousBalance  = cardData.balanceInfo?.previousBalance ?? (openingBalance + carryoverBalance);
  const monthIncome      = cardData.balanceInfo?.monthIncome ?? 0;
  const totalEntradasMes = (cardData.allTransactions || [])
    .filter(t => t && t.type === "INCOME" && (t as any).source !== "RECURRING_PROJECTION")
    .filter(t => {
      if (!t) return false;
      const { year, month } = getTransactionDisplayYearMonth(t);
      return year === selectedYear && month === selectedMonth;
    })
    .reduce((s, t) => s + (t.amount || 0), 0);

  // Cálculo de Total Pago e Total Não Pago (despesas do mês)
  const monthExpenseTransactions = (cardData.allTransactions || [])
    .filter(t => t && t.type === "EXPENSE" && (t as any).source !== "RECURRING_PROJECTION")
    .filter(t => {
      if (!t) return false;
      const { year, month } = getTransactionDisplayYearMonth(t);
      return year === selectedYear && month === selectedMonth;
    });
  const totalPago    = monthExpenseTransactions.filter(t => t.status !== "PENDING").reduce((s, t) => s + (t.amount || 0), 0);
  const totalNaoPago = monthExpenseTransactions.filter(t => t.status === "PENDING").reduce((s, t) => s + (t.amount || 0), 0);
  const totalDespesasExtrato = totalPago + totalNaoPago;

  const totalGastosMes = totalDespesasExtrato > 0
    ? totalDespesasExtrato
    : (cardData.balanceInfo?.monthExpense ?? filteredMonthExpenses.reduce((sum, p) => sum + (p.amount || 0), 0));

  // Total disponível = Saldo acumulado anterior + Receitas do mês atual
  const totalAvailable   = cardData.balanceInfo?.totalAvailable ?? (previousBalance + monthIncome);
  // Saldo final = Total disponível - Despesas do mês
  const saldoAtualCalculado = cardData.balanceInfo?.finalBalance ?? (totalAvailable - totalGastosMes);

  const ticketUsagePct = totalAvailable > 0 ? Math.min(100, Math.round((totalGastosMes / totalAvailable) * 100)) : 0;
  const ticketRemainingPct = 100 - ticketUsagePct;

  // Lógica de exibição do card Saldo Inicial:
  // Se o mês for anterior a Julho (ou não houver saldo de abertura nem histórico acumulado de meses anteriores), o card fica oculto.
  const isPriorToJuly = selectedYear < 2026 || (selectedYear === 2026 && selectedMonth < 7);
  const hasInitialBalance = openingBalance > 0 || carryoverBalance > 0;
  const showSaldoInicial = !isPriorToJuly && hasInitialBalance;

  const openEditModal = (p: any) => {
    const original = purchasesList.find(item => item.id === p.id) || (cardData?.allTransactions || []).find(item => item.id === p.id);
    if (!original) return;
    setSelectedPurchase(original as any);
    setModalType("edit");
  };

  const handleDelete = async () => {
    if (!selectedPurchase) return;
    try {
      await deleteCardPurchase(selectedPurchase.id);
      loadData();
      setModalType(null);
    } catch (err) {
      console.error(err);
      showAlert("Erro ao excluir lançamento.", { variant: "error" });
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    setDeletingBatch(true);
    try {
      const count = selectedIds.length;
      await deleteBatchPurchasesAction(selectedIds);
      await loadData();
      setSelectedIds([]);
      setBatchDeleteModalOpen(false);
      showAlert(`${count} ${count === 1 ? "despesa excluída" : "despesas excluídas"} com sucesso!`, { variant: "success" });
    } catch (err) {
      console.error(err);
      showAlert("Erro ao excluir despesas selecionadas.", { variant: "error" });
    } finally {
      setDeletingBatch(false);
    }
  };

  const nextMonthNum = selectedMonth === 12 ? 1 : selectedMonth + 1;
  const nextYearNum = selectedMonth === 12 ? selectedYear + 1 : selectedYear;
  const nextMonthName = getMonthName(nextMonthNum);

  const handleDuplicateBatchToNextMonth = async () => {
    if (selectedIds.length === 0 || duplicatingBatch) return;
    setDuplicatingBatch(true);
    try {
      const res = await duplicateBatchExpensesToNextMonthAction(selectedIds, selectedMonth, selectedYear);
      setSelectedIds([]);
      setBatchActionsModalOpen(false);
      await loadData();
      showAlert(
        `${res.count} ${res.count === 1 ? "despesa replicada" : "despesas replicadas"} para ${res.newMonthLabel || `${nextMonthName}/${nextYearNum}`}`,
        { variant: "success" }
      );
    } catch (err) {
      console.error("Erro ao replicar despesas:", err);
      showAlert("Erro ao replicar despesas para o próximo mês.", { variant: "error" });
    } finally {
      setDuplicatingBatch(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-6xl mx-auto flex flex-col gap-6 md:gap-8 select-none relative">
      
      {/* ── Voltar & Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <Link
          href="/despesas"
          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-400 hover:text-indigo-300 w-fit transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para Despesas & Contas
        </Link>
        <PeriodHeader
          title={cardData.title}
          tagline={`Gerencie as movimentações e extrato de ${cardData.title}`}
        />
        <div className="flex flex-wrap items-center gap-2 mt-1">
          {isCredit && (() => {
            const statusInfo = getInvoiceStatusInfo(
              impactoMes,
              !!(cardData as any).isPaid,
              !!(cardData as any).isPast,
              (cardData as any).vencimentoStr
            );

            if (statusInfo.status === "zerada") {
              return (
                <span className="text-xs font-black text-slate-300 bg-slate-800/60 border border-slate-700 px-3.5 py-1 rounded-full shadow-sm flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" /> Sem Fatura Pendente
                </span>
              );
            }
            if (statusInfo.status === "paga") {
              return (
                <span className="text-xs font-black text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1 rounded-full shadow-sm flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> ✓ Fatura Paga
                </span>
              );
            }
            if (statusInfo.status === "vencida") {
              return (
                <span className="text-xs font-black text-rose-300 bg-rose-500/10 border border-rose-500/20 px-3.5 py-1 rounded-full shadow-sm flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" /> 🚨 Fatura Vencida
                </span>
              );
            }
            return (
              <span className="text-xs font-black text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3.5 py-1 rounded-full shadow-sm flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" /> Aguardando Pagamento
              </span>
            );
          })()}
          {cardData.holder && (
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Titular:</span> {cardData.holder}
            </span>
          )}
          {cardData.agencia && (
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Agência:</span> {cardData.agencia}
            </span>
          )}
          {cardData.conta && (
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Conta:</span> {cardData.conta}
            </span>
          )}
        </div>
      </div>

      {/* ── Ações no Topo ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row flex-wrap justify-end gap-2.5 -mt-4 w-full sm:w-auto">
        {isCredit ? (
          <>
            <button
              onClick={() => setPurchaseModalOpen(true)}
              className="w-full sm:w-auto px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-2xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              + Nova Compra
            </button>

            {isInvoicePaid ? (
              <button
                onClick={async () => {
                  if (!cardData) return;
                  try {
                    await undoCardInvoicePaymentAction(cardData.walletId, selectedMonth, selectedYear);
                    await loadData();
                    showAlert("Pagamento de fatura desfeito com sucesso.", { variant: "info" });
                  } catch (err) {
                    console.error(err);
                    showAlert("Erro ao desfazer pagamento.", { variant: "error" });
                  }
                }}
                className="w-full sm:w-auto px-5 py-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs font-extrabold rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                title="Clique para desfazer pagamento da fatura"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Fatura Paga
              </button>
            ) : (
              <button
                disabled={impactoMes <= 0}
                onClick={() => setPayInvoiceModalOpen(true)}
                className="w-full sm:w-auto px-5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-extrabold rounded-2xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Pagar Fatura
              </button>
            )}

            <button
              onClick={() => { setFormLimit(""); setModalType("limit"); }}
              className="w-full sm:w-auto px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-extrabold rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              Ajustar Limite
            </button>

            <button
              onClick={openDatesModal}
              className="w-full sm:w-auto px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-extrabold rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-purple-400" />
              Ajustar Datas
            </button>
          </>
        ) : (
          <div className="relative">
            <button 
              onClick={() => setActionDropdownOpen(!actionDropdownOpen)}
              className="w-full sm:w-auto px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-2xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              + Nova Transação
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${actionDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {actionDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => { setActionDropdownOpen(false); setPurchaseModalOpen(true); }}
                  className="w-full px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors text-left cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                    <Minus className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block font-bold text-slate-900 dark:text-white">Lançar Despesa / Gasto</span>
                    <span className="block text-[10px] font-normal text-slate-400">Registrar saída da conta</span>
                  </div>
                </button>

                <button
                  onClick={() => { setActionDropdownOpen(false); setFormCarga(""); setModalType("carga"); }}
                  className="w-full px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors text-left cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block font-bold text-slate-900 dark:text-white">{isTicket ? "Adicionar Carga" : "Adicionar Saldo / Entrada"}</span>
                    <span className="block text-[10px] font-normal text-slate-400">Injeção de capital ou salário</span>
                  </div>
                </button>

                <button
                  onClick={() => { setActionDropdownOpen(false); setFormCarga(""); setModalType("cargaRemove"); }}
                  className="w-full px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors text-left cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                    <Settings className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block font-bold text-slate-900 dark:text-white">{isTicket ? "Remover Carga" : "Subtrair / Ajustar Saldo"}</span>
                    <span className="block text-[10px] font-normal text-slate-400">Ajuste de saldo manual</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Visualização por Tipo de Cartão / Conta ─────────────────────────── */}

      {isCredit ? (
        // ── VISÃO PARA CARTÃO DE CRÉDITO (DARK THEME) ─────────────────────────────────────
        <div className="flex flex-col gap-8">
          
          <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-stretch w-full">
            {/* Card 1 — LIMITE TOTAL */}
            <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between h-full min-h-[140px] w-full shadow-sm overflow-hidden">
              <div className="min-h-[36px] h-[36px] flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-tight">
                  Limite Total
                </span>
              </div>
              <div className="flex-1 flex items-center my-2 overflow-hidden">
                <p className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none font-tnum tabular-nums whitespace-nowrap" title={brl(cardData.creditLimit)}>
                  {brl(cardData.creditLimit)}
                </p>
              </div>
              <div className="h-7 flex items-center w-full">
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800 px-2.5 py-1 rounded-full truncate">
                  Definido no sistema
                </span>
              </div>
            </div>

            {/* Card 2 — LIMITE DISPONÍVEL */}
            <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between h-full min-h-[140px] w-full shadow-sm overflow-hidden">
              <div className="min-h-[36px] h-[36px] flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-tight">
                  Limite Disponível
                </span>
              </div>
              <div className="flex-1 flex items-center my-2 overflow-hidden">
                <p className={`text-xl md:text-2xl font-black tracking-tight leading-none font-tnum tabular-nums whitespace-nowrap ${limitAvailable < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`} title={brl(limitAvailable)}>
                  {brl(limitAvailable)}
                </p>
              </div>
              <div className="h-7 flex items-center w-full">
                <div className="w-full bg-slate-100 dark:bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800">
                  <div
                    className={`h-full transition-all duration-500 ${usagePct >= 90 ? "bg-rose-500" : usagePct >= 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Card 3 — FATURA DO MÊS */}
            <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between h-full min-h-[140px] w-full shadow-sm overflow-hidden">
              <div className="min-h-[36px] h-[36px] flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-tight">
                  Fatura do Mês
                </span>
              </div>
              <div className="flex-1 flex items-center my-2 overflow-hidden">
                <p className={`text-xl md:text-2xl font-black tracking-tight leading-none font-tnum tabular-nums whitespace-nowrap ${impactoMes <= 0 ? "text-slate-900 dark:text-white" : (cardData as any).isPaid ? "text-emerald-600 dark:text-emerald-400" : (cardData as any).isPast ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"}`} title={brl(impactoMes)}>
                  {brl(impactoMes)}
                </p>
              </div>
              <div className="h-7 flex items-center w-full overflow-hidden">
                {impactoMes <= 0 ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 truncate">
                    Fatura Zerada
                  </span>
                ) : (cardData as any).isPaid ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-800 px-2.5 py-1 rounded-full truncate">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /> ✓ Ciclo liquidado no período
                  </span>
                ) : (cardData as any).isPast ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-800 px-2.5 py-1 rounded-full truncate">
                    🚨 Fatura Vencida
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-800 px-2.5 py-1 rounded-full truncate">
                    {(cardData as any).vencimentoStr ? `Vence em ${(cardData as any).vencimentoStr}` : "Aguardando Pagamento"}
                  </span>
                )}
              </div>
            </div>

            {/* Card 4 — DATA DE FECHAMENTO */}
            <div
              onClick={openDatesModal}
              title="Clique para alterar as datas do cartão"
              className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between h-full min-h-[140px] w-full shadow-sm cursor-pointer group hover:border-indigo-500/40 transition-all overflow-hidden"
            >
              <div className="min-h-[36px] h-[36px] flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-tight">
                  Data Fechamento
                </span>
                <Edit2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0" />
              </div>
              <div className="flex-1 flex items-center my-2 overflow-hidden">
                <p className="text-xl md:text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight leading-none whitespace-nowrap">
                  Dia {String(cardData.diaFechamento || 1).padStart(2, "0")}
                </p>
              </div>
              <div className="h-7 flex items-center w-full">
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800 px-2.5 py-1 rounded-full truncate">
                  Encerramento da fatura
                </span>
              </div>
            </div>

            {/* Card 5 — DIA DE VENCIMENTO */}
            <div
              onClick={openDatesModal}
              title="Clique para alterar as datas do cartão"
              className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between h-full min-h-[140px] w-full shadow-sm cursor-pointer group hover:border-amber-500/40 transition-all overflow-hidden"
            >
              <div className="min-h-[36px] h-[36px] flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-tight">
                  Dia Vencimento
                </span>
                <Edit2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 transition-colors shrink-0" />
              </div>
              <div className="flex-1 flex items-center my-2 overflow-hidden">
                <p className="text-xl md:text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight leading-none whitespace-nowrap">
                  Dia {String(cardData.vencimento || 10).padStart(2, "0")}
                </p>
              </div>
              <div className="h-7 flex items-center w-full">
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-800 px-2.5 py-1 rounded-full truncate">
                  Limite de pagamento
                </span>
              </div>
            </div>

            {/* Card 6 — MELHOR DIA COMPRA */}
            <div
              onClick={openDatesModal}
              title="Clique para alterar as datas do cartão"
              className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between h-full min-h-[140px] w-full shadow-sm cursor-pointer group hover:border-emerald-500/40 transition-all overflow-hidden"
            >
              <div className="min-h-[36px] h-[36px] flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-tight">
                  Melhor Dia Compra
                </span>
                <Edit2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500 transition-colors shrink-0" />
              </div>
              <div className="flex-1 flex items-center my-2 overflow-hidden">
                <p className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight leading-none whitespace-nowrap">
                  Dia {String(cardData.melhorDiaCompra || 2).padStart(2, "0")}
                </p>
              </div>
              <div className="h-7 flex items-center w-full">
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-800 px-2.5 py-1 rounded-full truncate">
                  Próxima fatura (+30d)
                </span>
              </div>
            </div>
          </section>

          {/* EXTRATO CRONOLÓGICO — CARTÃO DE CRÉDITO */}
          {(() => {
            // Unifica todas as compras do mês em um único array
            type CreditEntry = {
              id: string;
              description: string;
              category: string;
              amount: number;
              tags?: string;
              isRecurring?: boolean;
              date: string;
              purchaseDate?: string;
              competenceDate?: string;
              subtype: "vista" | "parcelado" | "assinatura";
              installmentLabel?: string;
              installmentsCount?: number;
              currentInstallment?: number;
            };

            const allCreditEntries: CreditEntry[] = [
              ...vistaPurchases.map(p => ({ ...p, subtype: "vista" as const, purchaseDate: (p as any).purchaseDate, competenceDate: (p as any).competenceDate })),
              ...subscriptionPurchases.map(p => ({ ...p, subtype: "assinatura" as const, purchaseDate: (p as any).purchaseDate, competenceDate: (p as any).competenceDate })),
              ...parceladoPurchasesProcessed.map(p => ({
                ...p, subtype: "parcelado" as const,
                purchaseDate: (p as any).purchaseDate,
                competenceDate: (p as any).competenceDate,
                installmentLabel: `${p.currentInstallment}/${p.installmentsCount}`,
                installmentsCount: p.installmentsCount,
                currentInstallment: p.currentInstallment,
              })),
            ].sort((a, b) => {
              const da = new Date((a.purchaseDate || a.competenceDate || a.date).split("T")[0]).getTime();
              const db = new Date((b.purchaseDate || b.competenceDate || b.date).split("T")[0]).getTime();
              return db - da; // mais recente primeiro
            });

            const totalEntradas = 0; // cartão crédito só tem saídas
            const totalSaidas = allCreditEntries.reduce((s, e) => s + e.amount, 0);
            const entradasCount = 0;
            const saidasCount = allCreditEntries.length;

            const isRecurringEntry = (e: CreditEntry) => Boolean(
              e.isRecurring ||
              e.subtype === "assinatura" ||
              (e.tags && (e.tags.toLowerCase().includes("assinatura") || e.tags.toLowerCase().includes("recorrente")))
            );

            const avulsasCount = allCreditEntries.filter(e => !isRecurringEntry(e)).length;
            const recorrentesCount = allCreditEntries.filter(e => isRecurringEntry(e)).length;

            const filtered = allCreditEntries.filter(entry => {
              if (recurrenceFilter === "single") return !isRecurringEntry(entry);
              if (recurrenceFilter === "recurring") return isRecurringEntry(entry);
              return true;
            });

            return (
              <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm dark:shadow-xl overflow-hidden">
                {/* Header */}
                <div className="px-5 pt-5 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Extrato da Fatura</h3>
                  {/* Filtro de Recorrência */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <button type="button" onClick={() => setRecurrenceFilter("all")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${ recurrenceFilter === "all" ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white" }`}>
                      Todas <span className="text-[10px] font-black opacity-60 ml-0.5">{allCreditEntries.length}</span>
                    </button>
                    <button type="button" onClick={() => setRecurrenceFilter("single")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${ recurrenceFilter === "single" ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white" }`}>
                      Compras Avulsas <span className="text-[10px] font-black opacity-60 ml-0.5">{avulsasCount}</span>
                    </button>
                    <button type="button" onClick={() => setRecurrenceFilter("recurring")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${ recurrenceFilter === "recurring" ? "bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white" }`}>
                      Recorrentes / Fixas <span className="text-[10px] font-black opacity-60 ml-0.5">{recorrentesCount}</span>
                    </button>
                  </div>
                </div>

                {/* Tabela Estruturada de Fatura */}
                <CreditCardInvoiceTable
                  transactions={filtered.map(entry => ({
                    id: entry.id,
                    description: entry.description,
                    category: entry.category,
                    amount: entry.amount,
                    date: entry.date,
                    purchaseDate: entry.purchaseDate,
                    competenceDate: entry.competenceDate,
                    status: (entry as any).status || "COMPLETED",
                    installmentLabel: entry.installmentLabel,
                    currentInstallment: entry.currentInstallment,
                    installmentsCount: entry.installmentsCount,
                    isRecurring: entry.isRecurring,
                    tags: entry.tags,
                    subtype: entry.subtype,
                  }))}
                  selectedIds={selectedIds}
                  onToggleSelect={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])}
                  onToggleSelectAll={() => setSelectedIds(prev => prev.length === filtered.length ? [] : filtered.map(e => e.id))}
                  onEdit={(tx) => openEditModal(tx as any)}
                  onDelete={(tx) => { setSelectedPurchase(tx as any); setModalType("delete"); }}
                  onDuplicate={async (tx) => {
                    try {
                      const res = await duplicateExpenseToNextMonthAction(tx.id);
                      await loadData();
                      showAlert(`"${tx.description}" duplicado para ${res.newMonthLabel}!`, { variant: "success" });
                    } catch (e) {
                      showAlert("Erro ao duplicar.", { variant: "error" });
                    }
                  }}
                  emptyMessage="Nenhum lançamento neste mês."
                  className="w-full overflow-x-auto"
                />

                {/* Rodapé de resumo */}
                {filtered.length > 0 && (
                  <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 flex flex-wrap items-center gap-x-5 gap-y-1">
                    <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Resumo</span>
                    <span className="text-xs font-black text-rose-600 dark:text-rose-400 tabular-nums">Saídas: - {brl(totalSaidas)}</span>
                    <span className="ml-auto text-xs font-black text-slate-800 dark:text-slate-200 tabular-nums">Fatura: {brl(impactoMes)}</span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      ) : (
        // ── VISÃO EXECUTIVA DARK GLASSMORPHISM PARA CONTA SANTANDER / BANCOS (5 CARDS DE MÉTRICAS) ──
        <div className="flex flex-col gap-8">
          
          {/* TOPO: 5 CARDS DE MÉTRICAS EM LINHA (SALDO, ENTRADAS, CONSUMO, PAGO, PENDENTE) */}
          <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">

            {/* Card 1: Saldo Disponível */}
            <div className="card-glow flex flex-col justify-between min-h-[110px] p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#111625] border border-slate-200 dark:border-slate-800/80 shadow-sm gap-1.5">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider leading-tight">Saldo Disponível</span>
                <div className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="flex items-center my-0.5">
                <h3 className={`text-lg xl:text-xl font-bold tracking-tight leading-none tabular-nums whitespace-nowrap ${saldoAtualCalculado < 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"}`}>{brl(saldoAtualCalculado)}</h3>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight line-clamp-2">Balanço consolidado da conta</p>
              </div>
            </div>

            {/* Card 2: Entradas no Mês */}
            <div className="card-glow flex flex-col justify-between min-h-[110px] p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#111625] border border-emerald-200 dark:border-emerald-500/30 shadow-sm gap-1.5">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider leading-tight">Entradas no Mês</span>
                <div className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="flex items-center my-0.5">
                <h3 className="text-lg xl:text-xl font-bold tracking-tight leading-none tabular-nums whitespace-nowrap text-emerald-600 dark:text-emerald-400">{`+ ${brl(totalEntradasMes)}`}</h3>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight line-clamp-2">Depósitos e receitas creditadas</p>
              </div>
            </div>

            {/* Card 3: Consumo no Mês */}
            <div className="card-glow flex flex-col justify-between min-h-[110px] p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#111625] border border-slate-200 dark:border-slate-800/80 shadow-sm gap-1.5">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider leading-tight">Consumo no Mês</span>
                <div className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="flex items-center my-0.5">
                <h3 className="text-lg xl:text-xl font-bold tracking-tight leading-none tabular-nums whitespace-nowrap text-slate-900 dark:text-white">{brl(totalGastosMes)}</h3>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight line-clamp-2">Lançamentos debitados no mês</p>
              </div>
            </div>

            {/* Card 4: Total Pago */}
            <div className="card-glow flex flex-col justify-between min-h-[110px] p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#111625] border border-emerald-200 dark:border-emerald-500/20 shadow-sm gap-1.5">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider leading-tight">Total Pago</span>
                <div className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="flex items-center my-0.5">
                <h3 className="text-lg xl:text-xl font-bold tracking-tight leading-none tabular-nums whitespace-nowrap text-emerald-600 dark:text-emerald-400">{brl(totalPago)}</h3>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight line-clamp-2">Despesas quitadas no mês</p>
              </div>
            </div>

            {/* Card 5: Total Pendente */}
            <div className="card-glow flex flex-col justify-between min-h-[110px] p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#111625] border border-amber-200 dark:border-amber-500/20 shadow-sm gap-1.5">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider leading-tight">Total Pendente</span>
                <div className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="flex items-center my-0.5">
                <h3 className="text-lg xl:text-xl font-bold tracking-tight leading-none tabular-nums whitespace-nowrap text-amber-600 dark:text-amber-400">{brl(totalNaoPago)}</h3>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight line-clamp-2">Aguardando pagamento</p>
              </div>
            </div>

          </section>

          {/* EXTRATO CRONOLÓGICO — CONTA BANCÁRIA */}
          <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm dark:shadow-xl overflow-hidden">
            {(() => {
              const monthTransactions = (cardData.allTransactions || [])
                .filter((t) => {
                  if ((t as any).source === "RECURRING_PROJECTION") return false;
                  const { year, month } = getTransactionDisplayYearMonth(t);
                  return year === selectedYear && month === selectedMonth;
                })
                .sort((a, b) => {
                  const da = new Date(((a as any).purchaseDate || a.date).split("T")[0]).getTime();
                  const db = new Date(((b as any).purchaseDate || b.date).split("T")[0]).getTime();
                  return db - da;
                });

              const totalEntradasExtrato = monthTransactions.filter(t => t.type === "INCOME").reduce((s, t) => s + (t.amount || 0), 0);
              const totalSaidasExtrato = monthTransactions.filter(t => t.type === "EXPENSE").reduce((s, t) => s + (t.amount || 0), 0);
              const balancoLiquidoExtrato = totalEntradasExtrato - totalSaidasExtrato;
              const entradasCount = monthTransactions.filter(t => t.type === "INCOME").length;
              const saidasCount = monthTransactions.filter(t => t.type === "EXPENSE").length;

              const isRecurringTransaction = (t: any) => Boolean(
                t.isRecurring ||
                (t.tags && (t.tags.toLowerCase().includes("assinatura") || t.tags.toLowerCase().includes("recorrente"))) ||
                (t.description && /luz|água|internet|energia|celular|netflix|spotify|aluguel/i.test(t.description))
              );

              const bankAvulsasCount = monthTransactions.filter(t => !isRecurringTransaction(t)).length;
              const bankRecorrentesCount = monthTransactions.filter(t => isRecurringTransaction(t)).length;

              const filtered = monthTransactions.filter(t => {
                if (bankFlowFilter === "income" && t.type !== "INCOME") return false;
                if (bankFlowFilter === "expense" && t.type !== "EXPENSE") return false;
                const isRec = isRecurringTransaction(t);
                if (bankRecurrenceFilter === "single" && isRec) return false;
                if (bankRecurrenceFilter === "recurring" && !isRec) return false;
                return true;
              });

              return (
                <>
                  {/* Header */}
                  <div className="px-5 pt-5 pb-4 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        Extrato da Conta — {getMonthName(selectedMonth)}/{selectedYear}
                      </h2>
                      {selectedIds.length > 0 && (
                        <button
                          type="button"
                          onClick={handleDuplicateBatchToNextMonth}
                          disabled={duplicatingBatch}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-black shadow-sm transition-all cursor-pointer animate-in fade-in"
                        >
                          <CopyPlus className="w-3.5 h-3.5" />
                          {duplicatingBatch ? "Replicando..." : `Replicar Selecionados (${selectedIds.length}) para ${nextMonthName}`}
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Filtro Recorrência */}
                      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <button type="button" onClick={() => setBankRecurrenceFilter("all")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${ bankRecurrenceFilter === "all" ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white" }`}>
                          Todas <span className="text-[10px] font-black opacity-60 ml-0.5">{monthTransactions.length}</span>
                        </button>
                        <button type="button" onClick={() => setBankRecurrenceFilter("single")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${ bankRecurrenceFilter === "single" ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white" }`}>
                          Compras Avulsas <span className="text-[10px] font-black opacity-60 ml-0.5">{bankAvulsasCount}</span>
                        </button>
                        <button type="button" onClick={() => setBankRecurrenceFilter("recurring")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${ bankRecurrenceFilter === "recurring" ? "bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white" }`}>
                          Recorrentes / Fixas <span className="text-[10px] font-black opacity-60 ml-0.5">{bankRecorrentesCount}</span>
                        </button>
                      </div>

                      {/* Abas de fluxo */}
                      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <button type="button" onClick={() => setBankFlowFilter("all")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${ bankFlowFilter === "all" ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white" }`}>
                          Todas <span className="text-[10px] font-black opacity-60 ml-0.5">{monthTransactions.length}</span>
                        </button>
                        <button type="button" onClick={() => setBankFlowFilter("income")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${ bankFlowFilter === "income" ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white" }`}>
                          Entradas <span className="text-[10px] font-black opacity-60 ml-0.5">{entradasCount}</span>
                        </button>
                        <button type="button" onClick={() => setBankFlowFilter("expense")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${ bankFlowFilter === "expense" ? "bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white" }`}>
                          Saídas <span className="text-[10px] font-black opacity-60 ml-0.5">{saidasCount}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Tabela Estruturada de Extrato da Conta */}
                  <CreditCardInvoiceTable
                    dateColumnHeader="Data"
                    transactions={filtered.map(t => {
                      const match = t.description.match(/\((\d+)\/(\d+)\)/);
                      const currInst = (t as any).currentInstallment || (match ? Number(match[1]) : null);
                      const totalInst = t.installmentsCount || (match ? Number(match[2]) : null);
                      const installmentLabel = currInst && totalInst ? `${currInst}/${totalInst}` : undefined;

                      return {
                        id: t.id,
                        description: t.description,
                        category: t.category,
                        amount: t.amount,
                        date: t.date,
                        purchaseDate: (t as any).purchaseDate || t.date,
                        competenceDate: (t as any).competenceDate || t.date,
                        type: t.type,
                        status: t.status,
                        installmentLabel,
                        currentInstallment: currInst ?? undefined,
                        installmentsCount: totalInst ?? undefined,
                        isRecurring: Boolean((t as any).isRecurring || (t as any).tags?.toLowerCase().includes("recorrente")),
                        tags: t.tags,
                      };
                    })}
                    selectedIds={selectedIds}
                    onToggleSelect={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])}
                    onToggleSelectAll={() => setSelectedIds(prev => prev.length === filtered.length ? [] : filtered.map(e => e.id))}
                    onToggleStatus={togglePaymentStatus}
                    togglingId={togglingId}
                    onEdit={(tx) => openEditModal(tx as any)}
                    onDelete={(tx) => { setSelectedPurchase(tx as any); setModalType("delete"); }}
                    onDuplicate={async (tx) => {
                      try {
                        const res = await duplicateExpenseToNextMonthAction(tx.id);
                        await loadData();
                        showAlert(`"${tx.description}" duplicado para ${res.newMonthLabel}!`, { variant: "success" });
                      } catch (e) {
                        showAlert("Erro ao duplicar.", { variant: "error" });
                      }
                    }}
                    emptyMessage="Nenhuma movimentação para este filtro."
                    className="w-full overflow-x-auto"
                  />

                  {/* Rodapé fixo */}
                  {monthTransactions.length > 0 && (
                    <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 flex flex-wrap items-center gap-x-5 gap-y-1">
                      <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Resumo</span>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 tabular-nums">Entradas: + {brl(totalEntradasExtrato)}</span>
                      <span className="text-xs font-black text-rose-600 dark:text-rose-400 tabular-nums">Saídas: - {brl(totalSaidasExtrato)}</span>
                      <span className={`ml-auto text-xs font-black tabular-nums ${ balancoLiquidoExtrato >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400" }`}>
                        Resultado: {balancoLiquidoExtrato >= 0 ? `+ ${brl(balancoLiquidoExtrato)}` : `- ${brl(Math.abs(balancoLiquidoExtrato))}`}
                      </span>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── MODAIS ─────────────────────────────────────────────────────────────── */}

      {/* Modal Adicionar Saldo / Injeção de Capital Flexível */}
      {modalType === "carga" && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md flex flex-col gap-5 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Injetar Saldo / Capital</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Informe o valor, a origem e o mês de aplicação.</p>
              </div>
              <button onClick={() => setModalType(null)} className="p-1 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddCarga} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-300">Valor da Entrada (R$) *</label>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formCarga}
                  onChange={e => setFormCarga(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0,00"
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-xs font-bold text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-300">Origem da Entrada *</label>
                <select
                  value={formCargaOrigin}
                  onChange={e => setFormCargaOrigin(e.target.value as any)}
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="SALARIO">Injeção de Capital / Salário</option>
                  <option value="RECARGA">Recarga de Saldo</option>
                  <option value="FREELANCE">Renda Extra / Freelance</option>
                  <option value="INVESTIMENTO">Resgate de Investimento</option>
                  <option value="APORTE">Outra Fonte / Aporte Direto</option>
                  <option value="ROLLOVER">Saldo do Mês Anterior</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-300">Mês de Aplicação</label>
                  <select
                    value={formCargaMonth}
                    onChange={e => setFormCargaMonth(Number(e.target.value))}
                    className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                  >
                    {[
                      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
                    ].map((m, i) => (
                      <option key={m} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-300">Ano de Aplicação</label>
                  <select
                    value={formCargaYear}
                    onChange={e => setFormCargaYear(Number(e.target.value))}
                    className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                  >
                    {Array.from({ length: 11 }, (_, i) => 2020 + i).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer">Cancelar</button>
                <button type="submit" className="px-5 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer">Confirmar Entrada</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Remover Carga / Subtrair Saldo */}
      {modalType === "cargaRemove" && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-3xl p-6 w-full max-w-sm flex flex-col gap-5 shadow-2xl border border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-white">
                  {isTicket ? "Remover Carga do Ticket" : "Subtrair Saldo da Conta"}
                </h3>
                <p className="text-xs font-medium text-slate-400 mt-0.5">Subtrai o valor digitado do saldo atual.</p>
              </div>
              <button onClick={() => setModalType(null)} className="p-1 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRemoveCarga} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-300">Valor a Subtrair (R$)</label>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formCarga}
                  onChange={e => setFormCarga(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0,00"
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-xs font-bold text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer">CANCELAR</button>
                <button type="submit" className="px-5 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg shadow-rose-600/30 transition-all cursor-pointer">SUBTRAIR</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ajustar Limite do Cartão */}
      {modalType === "limit" && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-3xl p-6 w-full max-w-sm flex flex-col gap-4 shadow-2xl border border-slate-800 animate-in zoom-in-95 duration-200">
            <h3 className="text-sm font-black text-white">Ajustar Limite do Cartão</h3>
            <form onSubmit={handleLimitSave} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-300">Novo Limite Total (R$)</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={formLimit}
                  onChange={e => setFormLimit(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0,00"
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-xs font-bold text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl cursor-pointer">Cancelar</button>
                <button type="submit" className="px-5 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 cursor-pointer">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ajustar Datas do Cartão */}
      {modalType === "dates" && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-3xl p-7 w-full max-w-md flex flex-col gap-5 shadow-2xl border border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-white">Ajustar Datas do Cartão</h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Defina o dia de fechamento e o dia de vencimento da fatura.</p>
              </div>
              <button onClick={() => setModalType(null)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDatesSave} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider">
                    Dia de Fechamento *
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    max="31"
                    value={formDiaFechamento}
                    onChange={e => setFormDiaFechamento(Number(e.target.value))}
                    placeholder="1"
                    className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm font-black text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                  <span className="text-[10px] text-slate-400 font-semibold">Dia em que a fatura é fechada</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider">
                    Dia de Vencimento *
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    max="31"
                    value={formVencimento}
                    onChange={e => setFormVencimento(Number(e.target.value))}
                    placeholder="10"
                    className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm font-black text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                  <span className="text-[10px] text-slate-400 font-semibold">Dia limite do pagamento</span>
                </div>
              </div>

              {/* Preview do Melhor Dia de Compra */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider block">Melhor Dia para Compra (Calculado)</span>
                  <span className="text-[10px] font-medium text-emerald-400">Dia subsequente ao fechamento</span>
                </div>
                <span className="text-base font-black text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-3.5 py-1 rounded-xl">
                  Dia {String((Number(formDiaFechamento) % 31) + 1).padStart(2, "0")}
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setModalType(null)} className="px-4 py-2.5 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl cursor-pointer transition-colors">
                  CANCELAR
                </button>
                <button type="submit" className="px-5 py-2.5 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 cursor-pointer transition-colors">
                  SALVAR ALTERAÇÕES
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* Modal Excluir Lançamento Individual */}
      {modalType === "delete" && selectedPurchase && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-3xl p-6 w-full max-w-sm flex flex-col gap-4 text-center shadow-2xl border border-slate-800 animate-in zoom-in-95">
            <h3 className="text-sm font-black text-white">Excluir Lançamento</h3>
            <p className="text-xs text-slate-400">Tem certeza que deseja excluir "{selectedPurchase.description}"?</p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button onClick={() => setModalType(null)} className="flex-1 py-2.5 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl cursor-pointer">Cancelar</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl cursor-pointer">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* ── BARRA FLUTUANTE MÍNIMA DE SELEÇÃO EM LOTE ───────────────────── */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 dark:bg-slate-950/95 border border-slate-700/80 rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-5 duration-200 backdrop-blur-md text-white">
          <div className="text-xs font-bold whitespace-nowrap">
            <span>
              {selectedIds.length} {selectedIds.length === 1 ? "item selecionado" : "itens selecionados"}
            </span>
            <span className="mx-1.5 text-slate-500">•</span>
            <span className="text-emerald-400 font-extrabold">{brl(selectedTotalAmount)}</span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          <div className="flex items-center gap-2">
            <button
              onClick={handleDuplicateBatchToNextMonth}
              disabled={duplicatingBatch}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-md shadow-purple-600/30 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <CopyPlus className="w-3.5 h-3.5" />
              {duplicatingBatch ? "Replicando..." : `Replicar Selecionados para Próximo Mês (${nextMonthName})`}
            </button>

            <button
              onClick={() => setBatchActionsModalOpen(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl shadow-md shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Mais Ações
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors px-2 py-1 cursor-pointer underline underline-offset-2"
            >
              Desmarcar
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL DE AÇÕES EM LOTE ─────────────────────────────────────── */}
      {batchActionsModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 w-[95%] sm:w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col gap-5 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  Ações em Lote
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  {selectedIds.length} {selectedIds.length === 1 ? "item selecionado" : "itens selecionados"} ({brl(selectedTotalAmount)})
                </p>
              </div>
              <button
                onClick={() => setBatchActionsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {/* Botão 1: Duplicar Selecionados (+1 Mês) */}
              <button
                onClick={handleDuplicateBatchToNextMonth}
                disabled={duplicatingBatch}
                className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-black rounded-2xl shadow-md shadow-purple-600/30 flex items-center justify-between transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <CopyPlus className="w-4 h-4 text-purple-200 group-hover:scale-110 transition-transform" />
                  <span>{duplicatingBatch ? "Replicando..." : `Replicar Selecionados para Próximo Mês (${nextMonthName})`}</span>
                </div>
                <span className="text-[10px] uppercase font-bold bg-purple-500/30 px-2.5 py-0.5 rounded-full">Atalho</span>
              </button>

              {/* Botão 2: Marcar como Pago */}
              <button
                onClick={async () => {
                  try {
                    await markBatchTransactionsPaidAction(selectedIds);
                    setSelectedIds([]);
                    setBatchActionsModalOpen(false);
                    await loadData();
                  } catch (err) {
                    console.error("Erro ao marcar como pago:", err);
                  }
                }}
                className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-2xl shadow-md shadow-emerald-600/30 flex items-center justify-between transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-200 group-hover:scale-110 transition-transform" />
                  <span>Marcar como Pago</span>
                </div>
                <span className="text-[10px] uppercase font-bold bg-emerald-500/30 px-2.5 py-0.5 rounded-full">✓ Liquidar</span>
              </button>

              {/* Botão 3: Marcar como Pendente */}
              <button
                onClick={async () => {
                  try {
                    await unmarkBatchTransactionsPaidAction(selectedIds);
                    setSelectedIds([]);
                    setBatchActionsModalOpen(false);
                    await loadData();
                  } catch (err) {
                    console.error("Erro ao marcar como pendente:", err);
                  }
                }}
                className="w-full px-4 py-3 bg-amber-500 hover:bg-amber-400 text-white text-xs font-black rounded-2xl shadow-md shadow-amber-500/30 flex items-center justify-between transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <RotateCcw className="w-4 h-4 text-amber-100 group-hover:scale-110 transition-transform" />
                  <span>Marcar como Pendente</span>
                </div>
                <span className="text-[10px] uppercase font-bold bg-amber-400/30 px-2.5 py-0.5 rounded-full">⟲ Reverter</span>
              </button>

              {/* Botão 4: Excluir Selecionados */}
              <button
                onClick={() => {
                  setBatchActionsModalOpen(false);
                  setBatchDeleteModalOpen(true);
                }}
                className="w-full px-4 py-3 border border-rose-500/50 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-black rounded-2xl transition-all cursor-pointer flex items-center justify-between group mt-1"
              >
                <div className="flex items-center gap-2.5">
                  <Trash2 className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
                  <span>Excluir Selecionados</span>
                </div>
                <span className="text-[10px] uppercase font-bold bg-rose-500/10 text-rose-500 px-2.5 py-0.5 rounded-full">Remover</span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setBatchActionsModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CUSTOMIZADO DE CONFIRMAÇÃO DE EXCLUSÃO EM LOTE ────────────── */}
      {batchDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-3xl p-5 sm:p-6 w-[95%] sm:w-full max-w-sm max-h-[90vh] overflow-y-auto flex flex-col gap-4 text-center shadow-2xl border border-slate-800 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Excluir {selectedIds.length} {selectedIds.length === 1 ? "despesa" : "despesas"}?</h3>
              <p className="text-xs text-slate-400 mt-1.5 font-medium leading-relaxed">
                Tem certeza que deseja excluir <strong className="text-white font-black">{selectedIds.length} despesas</strong> no valor total de <strong className="text-rose-400 font-black">{brl(selectedTotalAmount)}</strong>?
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setBatchDeleteModalOpen(false)}
                className="flex-1 py-2.5 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleBatchDelete}
                disabled={deletingBatch}
                className="flex-1 py-2.5 text-xs font-black text-white bg-rose-600 hover:bg-rose-500 rounded-xl cursor-pointer shadow-lg shadow-rose-600/30"
              >
                {deletingBatch ? "Excluindo..." : "Confirmar Exclusão"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Global Unificado de Lançar / Editar Despesa */}
      <NewPurchaseModal
        isOpen={purchaseModalOpen || modalType === "edit"}
        initialData={modalType === "edit" && selectedPurchase ? {
          id: selectedPurchase.id,
          walletId: cardData.walletId,
          description: selectedPurchase.description,
          category: selectedPurchase.category,
          amount: selectedPurchase.amount,
          type: selectedPurchase.type,
          installmentsCount: selectedPurchase.installmentsCount,
          date: selectedPurchase.date,
          purchaseDate: (selectedPurchase as any).purchaseDate || selectedPurchase.date,
          paymentDate: (selectedPurchase as any).paymentDate || selectedPurchase.date,
          competenceDate: (selectedPurchase as any).competenceDate || selectedPurchase.date,
          referenceMonth: (selectedPurchase as any).referenceMonth || ((selectedPurchase as any).competenceDate ? (selectedPurchase as any).competenceDate.split("T")[0].substring(0, 7) : undefined),
          repeatNextMonth: false,
          tags: selectedPurchase.tags,
          isRecurring: (selectedPurchase as any).isRecurring,
          recurringDay: (selectedPurchase as any).recurringDay
        } : null}
        defaultWalletId={cardData.walletId}
        onClose={() => {
          setPurchaseModalOpen(false);
          setModalType(null);
          setSelectedPurchase(null);
        }}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* Modal Pagar Fatura */}
      {payInvoiceModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl w-[95%] sm:w-full max-w-md max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">Pagar Fatura</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {cardData.title} — {getMonthName(selectedMonth)}/{selectedYear}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPayInvoiceModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Valor Total da Fatura</span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-tnum">
                {brl(impactoMes)}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Debitar de uma Conta Corrente (Opcional)
              </label>
              <select
                value={selectedPaymentWalletId}
                onChange={e => setSelectedPaymentWalletId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="NONE">Marcação Direta (Sem débito em conta)</option>
                {checkingWallets.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.bankName || w.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPayInvoiceModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPayingInvoice}
                onClick={async () => {
                  if (!cardData) return;
                  setIsPayingInvoice(true);
                  try {
                    await payCardInvoiceAction(
                      cardData.walletId,
                      selectedMonth,
                      selectedYear,
                      impactoMes,
                      selectedPaymentWalletId
                    );
                    await loadData();
                    setPayInvoiceModalOpen(false);
                    showAlert("Fatura marcada como PAGA com sucesso!", { variant: "success" });
                  } catch (err) {
                    console.error(err);
                    showAlert("Erro ao registrar pagamento da fatura.", { variant: "error" });
                  } finally {
                    setIsPayingInvoice(false);
                  }
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPayingInvoice ? "Registrando..." : "Confirmar Pagamento"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
