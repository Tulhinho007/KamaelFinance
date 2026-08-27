"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getCardDataById, saveCardLimit, saveCardDates, updateCardPurchase, deleteCardPurchase,
  deleteBatchPurchasesAction, addTicketCarga, saveTicketCarga, removeTicketCarga, toggleTransactionStatusAction
} from "@/lib/actions";
import {
  Trash2, X, Edit2, DollarSign, Clock, TrendingDown, Settings, Plus, Sparkles,
  ArrowLeft, CreditCard, Building2, Zap, AlertCircle, CheckCircle2, Minus, Calendar
} from "lucide-react";
import { usePeriod } from "@/components/period-context";
import { PeriodHeader } from "@/components/period-header";
import { NewPurchaseModal } from "@/components/new-purchase-modal";
import { CATEGORIES, getMonthName } from "@/lib/constants";
import { useModal } from "@/components/ui/custom-dialog-provider";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDateBR = (dateStr: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

type Purchase = {
  id: string;
  type: "vista" | "parcelado";
  description: string;
  category: string;
  amount: number;
  installmentsCount?: number;
  date: string;
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
  source?: string;
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
  const [deletingBatch, setDeletingBatch] = useState(false);

  // Modais de edição/exclusão/carga/datas
  const [modalType, setModalType]               = useState<"limit" | "edit" | "delete" | "carga" | "cargaRemove" | "cargaSet" | "dates" | null>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  // Form Fields
  const [formLimit, setFormLimit] = useState<number | "">("");
  const [formDiaFechamento, setFormDiaFechamento] = useState<number>(1);
  const [formVencimento, setFormVencimento]       = useState<number>(10);
  const [formCarga, setFormCarga] = useState<number | "">("");
  const [formCargaOrigin, setFormCargaOrigin] = useState<"SALARIO" | "FREELANCE" | "INVESTIMENTO" | "APORTE" | "ROLLOVER">("SALARIO");
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
  const purchasesList = cardData.purchases || [];
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
      await addTicketCarga(cardData.walletId, val);
      await loadData();
      setModalType(null);
      setFormCarga("");
    } catch (err) {
      console.error(err);
      showAlert("Erro ao adicionar carga.", { variant: "error" });
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
  
  // Helper para obter Ano e Mês de AAAA-MM-DD
  const getYearMonth = (dateStr: string) => {
    if (!dateStr) return { year: 0, month: 0 };
    const clean = dateStr.split("T")[0];
    const parts = clean.split("-");
    return { year: Number(parts[0]) || 0, month: Number(parts[1]) || 0 };
  };

  // 1. Compras À Vista (filtradas pelo mês/ano selecionado)
  const vistaPurchases = purchasesList.filter((p) => {
    if (!p || p.type !== "vista") return false;
    const { year, month } = getYearMonth(p.date);
    return year === selectedYear && month === selectedMonth;
  });

  // 2. Lançamentos Parcelados (apenas se for cartão de crédito)
  const selectedAbsolute = selectedYear * 12 + (selectedMonth - 1);

  const parceladoPurchasesProcessed = purchasesList
    .filter((p) => p && p.type === "parcelado")
    .reduce((acc, p) => {
      const { year, month } = getYearMonth(p.date);
      const purchaseAbsolute = year * 12 + (month - 1);
      const count = p.installmentsCount || 1;

      const isActive = selectedAbsolute >= purchaseAbsolute && selectedAbsolute < purchaseAbsolute + count;

      if (isActive) {
        const currentInstallment = selectedAbsolute - purchaseAbsolute + 1;
        const remainingCount = count - (selectedAbsolute - purchaseAbsolute);
        acc.push({
          ...p,
          currentInstallment,
          remainingDebt: remainingCount * (p.amount || 0)
        } as Purchase & { currentInstallment: number; remainingDebt: number });
      }
      return acc;
    }, [] as (Purchase & { currentInstallment: number; remainingDebt: number })[]);

  // Cálculos financeiros
  const saldoVista = vistaPurchases.reduce((sum, p) => sum + (p.amount || 0), 0);
  const dividaParcelada = parceladoPurchasesProcessed.reduce((sum, p) => sum + (p.remainingDebt || 0), 0);

  // Para Cartão de Crédito
  const impactoMes = saldoVista + parceladoPurchasesProcessed.reduce((sum, p) => sum + (p.amount || 0), 0);
  
  // Recomposição de Limite Disponível:
  // Se a fatura do mês atual foi paga, o gasto do mês é considerado liquidado (0 para comprometimento de limite)
  const isInvoicePaid = !!(cardData as any).isPaid;
  const paidInvoiceAmount = isInvoicePaid ? ((cardData as any).paidAmount || impactoMes) : 0;
  
  const gastosMesCompromissados = Math.max(0, impactoMes - paidInvoiceAmount);
  const dividaParceladaFutura = parceladoPurchasesProcessed.reduce((sum, p) => sum + Math.max(0, (p.remainingDebt - (p.amount || 0))), 0);
  
  const limitCompromised = gastosMesCompromissados + dividaParceladaFutura;
  const creditLimit = cardData.creditLimit || 0;
  const limitAvailable = Math.min(creditLimit, Math.max(0, creditLimit - limitCompromised));
  const usagePct = creditLimit > 0 ? Math.min(100, Math.round((limitCompromised / creditLimit) * 100)) : 0;

  // Para Ticket Alimentação / Benefício / Conta Corrente com Rollover
  const filteredMonthExpenses = purchasesList.filter(p => {
    if (!p) return false;
    const { year, month } = getYearMonth(p.date);
    return year === selectedYear && month === selectedMonth;
  });

  // carryoverBalance = apenas transações de meses anteriores (0 no primeiro mês de uso)
  const carryoverBalance = cardData.balanceInfo != null ? cardData.balanceInfo.carryoverBalance : 0;
  const openingBalance   = cardData.balanceInfo?.initialBalance ?? (cardData.initialBalance || 0);
  const previousBalance  = cardData.balanceInfo?.previousBalance ?? (openingBalance + carryoverBalance);
  const monthIncome      = cardData.balanceInfo?.monthIncome ?? 0;
  const totalGastosMes   = cardData.balanceInfo?.monthExpense ?? filteredMonthExpenses.reduce((sum, p) => sum + (p.amount || 0), 0);

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

  // Cálculo de Total Pago e Total Não Pago (despesas do mês pelo status)
  const monthExpenseTransactions = (cardData.allTransactions || [])
    .filter(t => t && t.type === "EXPENSE")
    .filter(t => {
      if (!t || !t.date) return false;
      const { year, month } = getYearMonth(t.date);
      return year === selectedYear && month === selectedMonth;
    });
  const totalPago    = monthExpenseTransactions.filter(t => t.status !== "PENDING").reduce((s, t) => s + (t.amount || 0), 0);
  const totalNaoPago = monthExpenseTransactions.filter(t => t.status === "PENDING").reduce((s, t) => s + (t.amount || 0), 0);

  const openEditModal = (p: Purchase) => {
    const original = purchasesList.find(item => item.id === p.id);
    if (!original) return;

    setSelectedPurchase(original);
    setFormType(original.type);
    setFormDescription(original.description);
    setFormCategory(original.category);
    if (original.type === "vista") {
      setFormAmount(original.amount);
      setFormInstallmentAmount(0);
      setFormInstallmentsCount(2);
    } else {
      setFormAmount(0);
      setFormInstallmentAmount(original.amount);
      setFormInstallmentsCount(original.installmentsCount || 2);
    }
    setFormDate(original.date);
    setModalType("edit");
  };

  const handlePurchaseEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPurchase || !formDescription || !formDate) return;

    const calculatedAmount = formType === "vista" ? formAmount : formInstallmentAmount;
    const installments = formType === "parcelado" ? formInstallmentsCount : undefined;

    try {
      await updateCardPurchase(selectedPurchase.id, formDescription, formCategory, calculatedAmount, installments, formDate);
      loadData();
      setModalType(null);
    } catch (err) {
      console.error(err);
      showAlert("Erro ao atualizar lançamento.", { variant: "error" });
    }
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

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto flex flex-col gap-8 select-none relative">
      
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
          {isCredit && (
            (cardData as any).isPaid ? (
              <span className="text-xs font-black text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1 rounded-full shadow-sm flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> ✓ Fatura Paga
              </span>
            ) : (cardData as any).isPast ? (
              <span className="text-xs font-black text-rose-300 bg-rose-500/10 border border-rose-500/20 px-3.5 py-1 rounded-full shadow-sm flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" /> 🚨 Fatura Vencida
              </span>
            ) : (
              <span className="text-xs font-black text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3.5 py-1 rounded-full shadow-sm flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" /> Aguardando Pagamento
              </span>
            )
          )}
          {cardData.holder && (
            <span className="text-xs font-black text-slate-200 bg-slate-900 border border-slate-800 px-3.5 py-1 rounded-full shadow-sm flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Titular:</span> {cardData.holder}
            </span>
          )}
          {cardData.agencia && (
            <span className="text-xs font-black text-slate-200 bg-slate-900 border border-slate-800 px-3.5 py-1 rounded-full shadow-sm flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Agência:</span> {cardData.agencia}
            </span>
          )}
          {cardData.conta && (
            <span className="text-xs font-black text-slate-200 bg-slate-900 border border-slate-800 px-3.5 py-1 rounded-full shadow-sm flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Conta:</span> {cardData.conta}
            </span>
          )}
        </div>
      </div>

      {/* ── Ações no Topo ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap justify-end gap-3 -mt-4">
        {isCredit ? (
          <>
            <button
              onClick={() => setPurchaseModalOpen(true)}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-2xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              + Nova Compra
            </button>

            <button
              onClick={() => { setFormLimit(""); setModalType("limit"); }}
              className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-extrabold rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              Ajustar Limite
            </button>

            <button
              onClick={openDatesModal}
              className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-extrabold rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-purple-400" />
              Ajustar Datas
            </button>
          </>
        ) : (
          <>
            <button 
              onClick={() => { setFormCarga(""); setModalType("carga"); }}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-2xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-white" />
              {isTicket ? "+ ADICIONAR CARGA" : "+ ADICIONAR SALDO"}
            </button>

            <button 
              onClick={() => { setFormCarga(""); setModalType("cargaRemove"); }}
              className="px-5 py-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold rounded-2xl shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Minus className="w-4 h-4 text-white" />
              {isTicket ? "- REMOVER CARGA" : "- SUBTRAIR SALDO"}
            </button>

            <button 
              onClick={() => setPurchaseModalOpen(true)}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-2xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-white" />
              + LANÇAR GASTO
            </button>
          </>
        )}
      </div>

      {/* ── Visualização por Tipo de Cartão / Conta ─────────────────────────── */}

      {isCredit ? (
        // ── VISÃO PARA CARTÃO DE CRÉDITO (DARK THEME) ─────────────────────────────────────
        <div className="flex flex-col gap-8">
          
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 items-stretch w-full">
            {/* Card 1 — LIMITE TOTAL */}
            <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between h-40 w-full shadow-sm">
              <div className="min-h-[32px] flex items-start justify-between">
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Limite Total</span>
              </div>
              <div className="my-auto flex items-center min-h-[36px] py-1 overflow-hidden">
                <p className="text-base sm:text-lg xl:text-base 2xl:text-lg font-black text-slate-900 dark:text-white tracking-tight whitespace-nowrap font-tnum tabular-nums" title={brl(cardData.creditLimit)}>
                  {brl(cardData.creditLimit)}
                </p>
              </div>
              <div className="min-h-[24px] flex items-center">
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800 px-2 py-0.5 rounded-full truncate">
                  Definido no sistema
                </span>
              </div>
            </div>

            {/* Card 2 — LIMITE DISPONÍVEL */}
            <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between h-40 w-full shadow-sm">
              <div className="min-h-[32px] flex items-start justify-between">
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Limite Disponível</span>
              </div>
              <div className="my-auto flex items-center min-h-[36px] py-1 overflow-hidden">
                <p className={`text-base sm:text-lg xl:text-base 2xl:text-lg font-black tracking-tight whitespace-nowrap font-tnum tabular-nums ${limitAvailable < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`} title={brl(limitAvailable)}>
                  {brl(limitAvailable)}
                </p>
              </div>
              <div className="min-h-[24px] flex items-center w-full">
                <div className="w-full bg-slate-100 dark:bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800">
                  <div
                    className={`h-full transition-all duration-500 ${usagePct >= 90 ? "bg-rose-500" : usagePct >= 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Card 3 — FATURA DO MÊS */}
            <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between h-40 w-full overflow-hidden shadow-sm">
              <div className="min-h-[32px] flex items-start justify-between">
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Fatura do Mês</span>
              </div>
              <div className="my-auto flex items-center min-h-[36px] py-1 overflow-hidden">
                <p className={`text-base sm:text-lg xl:text-base 2xl:text-lg font-black tracking-tight whitespace-nowrap font-tnum tabular-nums ${(cardData as any).isPaid ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`} title={brl(impactoMes)}>
                  {brl(impactoMes)}
                </p>
              </div>
              <div className="min-h-[24px] flex items-center">
                {(cardData as any).isPaid ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-800 px-2 py-0.5 rounded-full truncate">
                    ✓ Ciclo liquidado no período
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 truncate">
                    {(cardData as any).vencimentoStr ? `Vence em ${(cardData as any).vencimentoStr}` : "Mês Selecionado"}
                  </span>
                )}
              </div>
            </div>

            {/* Card 4 — DATA DE FECHAMENTO */}
            <div
              onClick={openDatesModal}
              title="Clique para alterar as datas do cartão"
              className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 relative overflow-hidden cursor-pointer group hover:border-indigo-500/40 transition-all flex flex-col justify-between h-40 w-full shadow-sm"
            >
              <div className="min-h-[32px] flex items-start justify-between">
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block leading-tight">Data Fechamento</span>
                <Edit2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0 mt-0.5" />
              </div>
              <div className="my-auto flex items-center min-h-[36px] py-1 overflow-hidden">
                <p className="text-lg xl:text-xl 2xl:text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight whitespace-nowrap">
                  Dia {String(cardData.diaFechamento || 1).padStart(2, "0")}
                </p>
              </div>
              <div className="min-h-[24px] flex items-center">
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800 px-2 py-0.5 rounded-full truncate">
                  Encerramento da fatura
                </span>
              </div>
            </div>

            {/* Card 5 — DIA DE VENCIMENTO */}
            <div
              onClick={openDatesModal}
              title="Clique para alterar as datas do cartão"
              className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 relative overflow-hidden cursor-pointer group hover:border-amber-500/40 transition-all flex flex-col justify-between h-40 w-full shadow-sm"
            >
              <div className="min-h-[32px] flex items-start justify-between">
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block leading-tight">Dia Vencimento</span>
                <Edit2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 transition-colors shrink-0 mt-0.5" />
              </div>
              <div className="my-auto flex items-center min-h-[36px] py-1 overflow-hidden">
                <p className="text-lg xl:text-xl 2xl:text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight whitespace-nowrap">
                  Dia {String(cardData.vencimento || 10).padStart(2, "0")}
                </p>
              </div>
              <div className="min-h-[24px] flex items-center">
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-800 px-2 py-0.5 rounded-full truncate">
                  Limite de pagamento
                </span>
              </div>
            </div>

            {/* Card 6 — MELHOR DIA COMPRA */}
            <div
              onClick={openDatesModal}
              title="Clique para alterar as datas do cartão"
              className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 relative overflow-hidden cursor-pointer group hover:border-emerald-500/40 transition-all flex flex-col justify-between h-40 w-full shadow-sm"
            >
              <div className="min-h-[32px] flex items-start justify-between">
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block leading-tight">Melhor Dia Compra</span>
                <Edit2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500 transition-colors shrink-0 mt-0.5" />
              </div>
              <div className="my-auto flex items-center min-h-[36px] py-1 overflow-hidden">
                <p className="text-lg xl:text-xl 2xl:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight whitespace-nowrap">
                  Dia {String(cardData.melhorDiaCompra || 2).padStart(2, "0")}
                </p>
              </div>
              <div className="min-h-[24px] flex items-center">
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-800 px-2 py-0.5 rounded-full truncate">
                  Próxima fatura (+30d)
                </span>
              </div>
            </div>
          </section>

          {/* Compras à Vista & Parceladas */}
          <div className="flex flex-col gap-8">
            <section className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm dark:shadow-xl flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Compras à Vista (Mês Atual)</h3>
                  <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Lançamentos pontuais no cartão</p>
                </div>
                <span className="text-xs font-black text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-950 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-800">
                  {brl(saldoVista)}
                </span>
              </div>

              {vistaPurchases.length === 0 ? (
                <p className="text-xs font-semibold text-slate-500 py-6 text-center">Nenhuma compra à vista neste mês.</p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100/80 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                        <th className="p-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={vistaPurchases.length > 0 && vistaPurchases.every(p => selectedIds.includes(p.id))}
                            onChange={() => {
                              const allSelected = vistaPurchases.every(p => selectedIds.includes(p.id));
                              if (allSelected) {
                                setSelectedIds(prev => prev.filter(id => !vistaPurchases.some(p => p.id === id)));
                              } else {
                                const newIds = Array.from(new Set([...selectedIds, ...vistaPurchases.map(p => p.id)]));
                                setSelectedIds(newIds);
                              }
                            }}
                            className="w-4 h-4 rounded bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            title="Selecionar Todos"
                          />
                        </th>
                        <th className="p-3">Data</th>
                        <th className="p-3">Descrição</th>
                        <th className="p-3">Categoria</th>
                        <th className="p-3 text-right">Valor</th>
                        <th className="p-3 text-center whitespace-nowrap">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                      {vistaPurchases.map(p => (
                        <tr key={p.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800 ${selectedIds.includes(p.id) ? "bg-indigo-50 dark:bg-indigo-500/10" : ""}`}>
                          <td className="p-3 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(p.id)}
                              onChange={() => {
                                setSelectedIds(prev =>
                                  prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                                );
                              }}
                              className="w-4 h-4 rounded bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-3 text-xs font-medium text-slate-600 dark:text-slate-300">{formatDateBR(p.date)}</td>
                          <td className="p-3 font-semibold text-slate-900 dark:text-white">{p.description}</td>
                          <td className="p-3">
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase">
                              {p.category}
                            </span>
                          </td>
                          <td className="p-3 text-right font-black text-rose-600 dark:text-rose-400">{brl(p.amount)}</td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                              <button onClick={() => openEditModal(p)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => { setSelectedPurchase(p); setModalType("delete"); }} className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm dark:shadow-xl flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Lançamentos Parcelados</h3>
                  <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Parcelas ativas cobradas no mês selecionado</p>
                </div>
                <span className="text-xs font-black text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-950 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-800">
                  Dívida Restante: {brl(dividaParcelada)}
                </span>
              </div>

              {parceladoPurchasesProcessed.length === 0 ? (
                <p className="text-xs font-semibold text-slate-500 py-6 text-center">Nenhum parcelamento ativo neste mês.</p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100/80 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                        <th className="p-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={parceladoPurchasesProcessed.length > 0 && parceladoPurchasesProcessed.every(p => selectedIds.includes(p.id))}
                            onChange={() => {
                              const allSelected = parceladoPurchasesProcessed.every(p => selectedIds.includes(p.id));
                              if (allSelected) {
                                setSelectedIds(prev => prev.filter(id => !parceladoPurchasesProcessed.some(p => p.id === id)));
                              } else {
                                const newIds = Array.from(new Set([...selectedIds, ...parceladoPurchasesProcessed.map(p => p.id)]));
                                setSelectedIds(newIds);
                              }
                            }}
                            className="w-4 h-4 rounded bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            title="Selecionar Todos"
                          />
                        </th>
                        <th className="p-3">Data</th>
                        <th className="p-3">Descrição</th>
                        <th className="p-3">Parcela</th>
                        <th className="p-3 text-right">Valor Parcela</th>
                        <th className="p-3 text-right">Dívida Restante</th>
                        <th className="p-3 text-center whitespace-nowrap">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                      {parceladoPurchasesProcessed.map(p => (
                        <tr key={p.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800 ${selectedIds.includes(p.id) ? "bg-indigo-50 dark:bg-indigo-500/10" : ""}`}>
                          <td className="p-3 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(p.id)}
                              onChange={() => {
                                setSelectedIds(prev =>
                                  prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                                );
                              }}
                              className="w-4 h-4 rounded bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-3 text-xs font-medium text-slate-600 dark:text-slate-300">{formatDateBR(p.date)}</td>
                          <td className="p-3 font-semibold text-slate-900 dark:text-white">{p.description}</td>
                          <td className="p-3">
                            <span className="bg-amber-100 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                              {p.currentInstallment} / {p.installmentsCount}
                            </span>
                          </td>
                          <td className="p-3 text-right font-bold text-slate-900 dark:text-white">{brl(p.amount)}</td>
                          <td className="p-3 text-right font-medium text-slate-600 dark:text-slate-400">{brl(p.remainingDebt)}</td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                              <button onClick={() => openEditModal(p)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => { setSelectedPurchase(p); setModalType("delete"); }} className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </div>
      ) : (
        // ── VISÃO EXECUTIVA DARK GLASSMORPHISM PARA CONTA SANTANDER / BANCOS (4 CARDS DE MÉTRICAS) ──
        <div className="flex flex-col gap-8">
          
          {/* TOPO: 4 CARDS DE MÉTRICAS EM LINHA (MESMA ESTRUTURA DE ASSINATURAS) */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Saldo Disponível */}
            <div className="card-glow p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Saldo Disponível</span>
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className={`text-2xl font-black ${saldoAtualCalculado < 0 ? "text-rose-400" : "text-white"}`}>{brl(saldoAtualCalculado)}</h3>
                <p className="text-[10px] text-slate-500 mt-1 font-medium">Balanço consolidado da conta</p>
              </div>
            </div>

            {/* Card 2: Consumo no Mês */}
            <div className="card-glow p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Consumo no Mês</span>
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <TrendingDown className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-black text-white">{brl(totalGastosMes)}</h3>
                <p className="text-[10px] text-slate-500 mt-1 font-medium">Lançamentos debitados no mês</p>
              </div>
            </div>

            {/* Card 3: Total Pago */}
            <div className="card-glow p-5 rounded-2xl bg-slate-900/60 border border-emerald-500/20 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-wider">Total Pago</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-black text-emerald-400">{brl(totalPago)}</h3>
                <p className="text-[10px] text-slate-500 mt-1 font-medium">Despesas quitadas no mês</p>
              </div>
            </div>

            {/* Card 4: Total Pendente */}
            <div className="card-glow p-5 rounded-2xl bg-slate-900/60 border border-amber-500/20 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-amber-400 uppercase tracking-wider">Total Pendente</span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-black text-amber-400">{brl(totalNaoPago)}</h3>
                <p className="text-[10px] text-slate-500 mt-1 font-medium">Aguardando baixa de pagamento</p>
              </div>
            </div>

          </section>

          {/* TABELA: EXTRATO DE DESPESAS DA CONTA SANTANDER (DARK THEME GLASSMORPHISM) */}
          <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm dark:shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Extrato de Despesas ({getMonthName(selectedMonth)}/{selectedYear})
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Acompanhe e confirme o pagamento de todas as saídas registradas nesta conta.
                </p>
              </div>
            </div>

            {(() => {
              const monthTransactions = (cardData.allTransactions || [])
                .filter((t) => t.type === "EXPENSE")
                .filter((t) => {
                  const parts = t.date.split("-");
                  return Number(parts[0]) === selectedYear && Number(parts[1]) === selectedMonth;
                });

              if (monthTransactions.length === 0) {
                return (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-center border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500/60" />
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Nenhuma despesa registrada para este mês.</p>
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/80 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                        <th className="p-4 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={monthTransactions.length > 0 && monthTransactions.every(t => selectedIds.includes(t.id))}
                            onChange={() => {
                              const allSelected = monthTransactions.every(t => selectedIds.includes(t.id));
                              if (allSelected) {
                                setSelectedIds(prev => prev.filter(id => !monthTransactions.some(t => t.id === id)));
                              } else {
                                const newIds = Array.from(new Set([...selectedIds, ...monthTransactions.map(t => t.id)]));
                                setSelectedIds(newIds);
                              }
                            }}
                            className="w-4 h-4 rounded bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            title="Selecionar Todos"
                          />
                        </th>
                        <th className="p-4">Data</th>
                        <th className="p-4">Descrição</th>
                        <th className="p-4">Categoria</th>
                        <th className="p-4 text-right">Valor</th>
                        <th className="p-4 text-center">Status / Pagamento</th>
                        <th className="p-4 text-center whitespace-nowrap">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                      {monthTransactions.map((t) => {
                        const isPaid = t.status !== "PENDING";
                        return (
                          <tr key={t.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800 ${selectedIds.includes(t.id) ? "bg-indigo-50 dark:bg-indigo-500/10" : ""}`}>
                            <td className="p-4 w-10 text-center">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(t.id)}
                                onChange={() => {
                                  setSelectedIds(prev =>
                                    prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id]
                                  );
                                }}
                                className="w-4 h-4 rounded bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </td>
                            <td className="p-4 text-xs font-medium text-slate-600 dark:text-slate-300">{t.date.split("-").reverse().join("/")}</td>
                            <td className="p-4 font-semibold text-slate-900 dark:text-white text-sm">{t.description}</td>
                            <td className="p-4">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-medium uppercase">
                                {t.category || "Despesa"}
                              </span>
                            </td>
                            <td className="p-4 text-right font-bold text-slate-900 dark:text-white text-sm tabular-nums">
                              {brl(t.amount)}
                            </td>
                            <td className="p-4 text-center">
                              <button
                                onClick={async () => {
                                  try {
                                    await toggleTransactionStatusAction(t.id);
                                    await loadData();
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                                  isPaid
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20"
                                }`}
                                title={isPaid ? "Clique para desmarcar" : "Clique para marcar como pago"}
                              >
                                {isPaid ? (
                                  <>
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                    <span>Pago</span>
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-pulse" />
                                    <span>Marcar como PAGO</span>
                                  </>
                                )}
                              </button>
                            </td>
                            <td className="p-4 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                                <button onClick={() => openEditModal(t as any)} className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer" title="Editar">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => { setSelectedPurchase(t as any); setModalType("delete"); }} className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer" title="Excluir">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 font-black text-slate-900 dark:text-white">
                        <td colSpan={3} className="p-4 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs font-bold">
                          TOTAL CONSUMIDO NO MÊS
                        </td>
                        <td className="p-4 text-right font-black text-slate-900 dark:text-white text-base">
                          {brl(totalGastosMes)}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── MODAIS ─────────────────────────────────────────────────────────────── */}

      {/* Modal Global: Lançar Despesa */}
      <NewPurchaseModal
        isOpen={purchaseModalOpen}
        defaultWalletId={cardId}
        onClose={() => setPurchaseModalOpen(false)}
        onSuccess={loadData}
      />

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

      {/* Modal Editar Lançamento */}
      {modalType === "edit" && selectedPurchase && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-3xl p-7 w-full max-w-md flex flex-col gap-5 shadow-2xl border border-slate-800 animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white">Editar Lançamento</h3>
              <button onClick={() => setModalType(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handlePurchaseEdit} className="flex flex-col gap-4">
              {/* Descrição */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider">Descrição *</label>
                <input
                  required
                  type="text"
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Categoria */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider">Categoria *</label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Forma de Pagamento (Cartão de Crédito) */}
              {isCredit && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider">Forma de Pagamento</label>
                  <div className="flex gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setFormType("vista")}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                        formType === "vista"
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      À Vista
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormType("parcelado")}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                        formType === "parcelado"
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Parcelado
                    </button>
                  </div>
                </div>
              )}

              {/* Valor */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider">
                  {formType === "vista" ? "Valor Total (R$) *" : "Valor da Parcela (R$) *"}
                </label>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formType === "vista" ? formAmount : formInstallmentAmount}
                  onChange={e => formType === "vista" ? setFormAmount(Number(e.target.value)) : setFormInstallmentAmount(Number(e.target.value))}
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Nº de Parcelas */}
              {isCredit && formType === "parcelado" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider">Número de Parcelas *</label>
                  <select
                    value={formInstallmentsCount}
                    onChange={e => setFormInstallmentsCount(Number(e.target.value))}
                    className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                  >
                    {[2,3,4,5,6,7,8,9,10,11,12,18,24].map(n => (
                      <option key={n} value={n}>{n}x</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Data */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider">Data do Lançamento *</label>
                <input
                  required
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setModalType(null)} className="px-4 py-2.5 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl cursor-pointer">CANCELAR</button>
                <button type="submit" className="px-5 py-2.5 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 cursor-pointer">SALVAR ALTERAÇÕES</button>
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

      {/* ── BARRA DE AÇÕES EM LOTE (FLOATING ACTION BAR) ───────────────────── */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl px-6 py-3.5 flex items-center gap-6 animate-in slide-in-from-bottom-5 duration-200 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-black text-xs">
              {selectedIds.length}
            </div>
            <div>
              <p className="text-xs font-black text-white">
                {selectedIds.length} {selectedIds.length === 1 ? "despesa selecionada" : "despesas selecionadas"}
              </p>
              <p className="text-[10px] text-slate-400 font-bold">
                Soma Total: <strong className="text-white">{brl(selectedTotalAmount)}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={() => setBatchDeleteModalOpen(true)}
              className="px-4 py-2 text-xs font-black text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg shadow-rose-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Excluir Selecionadas
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL CUSTOMIZADO DE CONFIRMAÇÃO DE EXCLUSÃO EM LOTE ────────────── */}
      {batchDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-3xl p-6 w-full max-w-sm flex flex-col gap-4 text-center shadow-2xl border border-slate-800 animate-in zoom-in-95">
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

    </div>
  );
}
