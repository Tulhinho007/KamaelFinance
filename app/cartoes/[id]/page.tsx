"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getCardDataById, saveCardLimit, saveCardDates, updateCardPurchase, deleteCardPurchase,
  addTicketCarga, saveTicketCarga, removeTicketCarga, toggleTransactionStatusAction
} from "@/lib/actions";
import {
  Trash2, X, Edit2, DollarSign, Clock, TrendingDown, Settings, Plus, Sparkles,
  ArrowLeft, CreditCard, Building2, Zap, AlertCircle, CheckCircle2, Minus, Calendar
} from "lucide-react";
import { usePeriod } from "@/components/period-context";
import { PeriodHeader } from "@/components/period-header";
import { NewPurchaseModal } from "@/components/new-purchase-modal";
import { CATEGORIES, getMonthName } from "@/lib/constants";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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

  const [cardData, setCardData] = useState<CardData | null>(null);
  const [loading, setLoading]   = useState(true);

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
  const totalUtilizadoTicket = cardData.purchases.reduce((acc, p) => acc + p.amount, 0);
  const saldoDisponivelTicket = cardData.initialBalance;
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
      alert("Erro ao salvar limite do cartão.");
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
      alert("Erro ao adicionar carga.");
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
      alert("Erro ao remover carga.");
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
      alert("Erro ao redefinir saldo total.");
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
      alert("Por favor insira dias válidos entre 1 e 31.");
      return;
    }
    try {
      await saveCardDates(cardData.walletId, fech, venc);
      await loadData();
      setModalType(null);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar datas do cartão.");
    }
  };
  
  // Helper para obter Ano e Mês de AAAA-MM-DD
  const getYearMonth = (dateStr: string) => {
    const parts = dateStr.split("-");
    return { year: Number(parts[0]), month: Number(parts[1]) };
  };

  // 1. Compras À Vista (filtradas pelo mês/ano selecionado)
  const vistaPurchases = cardData.purchases.filter((p) => {
    if (p.type !== "vista") return false;
    const { year, month } = getYearMonth(p.date);
    return year === selectedYear && month === selectedMonth;
  });

  // 2. Lançamentos Parcelados (apenas se for cartão de crédito)
  const selectedAbsolute = selectedYear * 12 + (selectedMonth - 1);

  const parceladoPurchasesProcessed = cardData.purchases
    .filter((p) => p.type === "parcelado")
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
          remainingDebt: remainingCount * p.amount
        } as Purchase & { currentInstallment: number; remainingDebt: number });
      }
      return acc;
    }, [] as (Purchase & { currentInstallment: number; remainingDebt: number })[]);

  // Cálculos financeiros
  const saldoVista = vistaPurchases.reduce((sum, p) => sum + p.amount, 0);
  const dividaParcelada = parceladoPurchasesProcessed.reduce((sum, p) => sum + p.remainingDebt, 0);

  // Para Cartão de Crédito
  const impactoMes = saldoVista + parceladoPurchasesProcessed.reduce((sum, p) => sum + p.amount, 0);
  const limitCompromised = saldoVista + dividaParcelada;
  const limitAvailable = cardData.creditLimit - limitCompromised;
  const usagePct = cardData.creditLimit > 0 ? Math.min(100, Math.round((limitCompromised / cardData.creditLimit) * 100)) : 0;

  // Para Ticket Alimentação / Benefício / Conta Corrente com Rollover
  const filteredMonthExpenses = cardData.purchases.filter(p => {
    const { year, month } = getYearMonth(p.date);
    return year === selectedYear && month === selectedMonth;
  });

  // carryoverBalance = apenas transações de meses anteriores (0 no primeiro mês de uso)
  const carryoverBalance = cardData.balanceInfo != null ? cardData.balanceInfo.carryoverBalance : 0;
  const openingBalance   = cardData.balanceInfo?.initialBalance ?? cardData.initialBalance;
  const previousBalance  = cardData.balanceInfo?.previousBalance ?? (openingBalance + carryoverBalance);
  const monthIncome      = cardData.balanceInfo?.monthIncome ?? 0;
  const totalGastosMes   = cardData.balanceInfo?.monthExpense ?? filteredMonthExpenses.reduce((sum, p) => sum + p.amount, 0);

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
    .filter(t => t.type === "EXPENSE")
    .filter(t => {
      const parts = t.date.split("-");
      return Number(parts[0]) === selectedYear && Number(parts[1]) === selectedMonth;
    });
  const totalPago    = monthExpenseTransactions.filter(t => t.status !== "PENDING").reduce((s, t) => s + t.amount, 0);
  const totalNaoPago = monthExpenseTransactions.filter(t => t.status === "PENDING").reduce((s, t) => s + t.amount, 0);


  const openEditModal = (p: Purchase) => {
    const original = cardData.purchases.find(item => item.id === p.id);
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
      alert("Erro ao atualizar lançamento.");
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
      alert("Erro ao excluir lançamento.");
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto flex flex-col gap-8 select-none relative">
      
      {/* ── Voltar & Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <Link
          href="/despesas"
          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-600 hover:text-indigo-700 w-fit transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para Despesas & Contas
        </Link>
        <PeriodHeader
          title={cardData.title}
          tagline={`Gerencie as movimentações e extrato de ${cardData.title}`}
        />
        {(cardData.holder || cardData.agencia || cardData.conta) && (
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {cardData.holder && (
              <span className="text-xs font-black text-slate-700 bg-white border border-slate-200/80 px-3.5 py-1 rounded-full shadow-sm flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Titular:</span> {cardData.holder}
              </span>
            )}
            {cardData.agencia && (
              <span className="text-xs font-black text-slate-700 bg-white border border-slate-200/80 px-3.5 py-1 rounded-full shadow-sm flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Agência:</span> {cardData.agencia}
              </span>
            )}
            {cardData.conta && (
              <span className="text-xs font-black text-slate-700 bg-white border border-slate-200/80 px-3.5 py-1 rounded-full shadow-sm flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Conta:</span> {cardData.conta}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Ações no Topo ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap justify-end gap-3 -mt-4">
        {isCredit ? (
          <>
            <button
              onClick={() => setPurchaseModalOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-5 py-3 rounded-2xl font-extrabold text-xs tracking-wider shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] border border-white/20"
            >
              <Plus className="w-4 h-4" />
              + Nova Compra
            </button>

            <button
              onClick={() => { setFormLimit(""); setModalType("limit"); }}
              className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-5 py-3 rounded-2xl font-extrabold text-xs tracking-wider shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              Ajustar Limite
            </button>

            <button
              onClick={openDatesModal}
              className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-5 py-3 rounded-2xl font-extrabold text-xs tracking-wider shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-indigo-500" />
              Ajustar Datas
            </button>
          </>
        ) : (
          <>
            <button 
              onClick={() => { setFormCarga(""); setModalType("carga"); }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl shadow-lg shadow-emerald-600/20 transition-all font-extrabold text-xs tracking-wider flex items-center justify-center gap-2 hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4 text-white" />
              {isTicket ? "+ ADICIONAR CARGA" : "+ ADICIONAR SALDO"}
            </button>

            <button 
              onClick={() => { setFormCarga(""); setModalType("cargaRemove"); }}
              className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-3 rounded-2xl shadow-lg shadow-rose-500/20 transition-all font-extrabold text-xs tracking-wider flex items-center justify-center gap-2 hover:scale-[1.02]"
            >
              <Minus className="w-4 h-4 text-white" />
              {isTicket ? "- REMOVER CARGA" : "- SUBTRAIR SALDO"}
            </button>

            <button 
              onClick={() => setPurchaseModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl shadow-lg shadow-indigo-600/25 transition-all font-extrabold text-xs tracking-wider flex items-center justify-center gap-2 hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4 text-white" />
              + LANÇAR GASTO
            </button>
          </>
        )}
      </div>

      {/* ── Visualização por Tipo de Cartão / Conta ─────────────────────────── */}

      {isCredit ? (
        // ── VISÃO PARA CARTÃO DE CRÉDITO ─────────────────────────────────────
        <div className="flex flex-col gap-8">
          
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 items-stretch w-full">
            {/* Card 1 — LIMITE TOTAL */}
            <div className="bg-white rounded-[24px] border border-white/80 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.03)] relative overflow-hidden flex flex-col justify-between h-40 w-full">
              <div className="min-h-[32px] flex items-start justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Limite Total</span>
              </div>
              <div className="my-auto flex items-center min-h-[36px] py-1 overflow-hidden">
                <p className="text-lg xl:text-xl 2xl:text-2xl font-black text-slate-800 tracking-tight truncate font-tnum tabular-nums" title={brl(cardData.creditLimit)}>
                  {brl(cardData.creditLimit)}
                </p>
              </div>
              <div className="min-h-[24px] flex items-center">
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full truncate">
                  Definido no sistema
                </span>
              </div>
            </div>

            {/* Card 2 — LIMITE DISPONÍVEL */}
            <div className="bg-white rounded-[24px] border border-white/80 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.03)] relative overflow-hidden flex flex-col justify-between h-40 w-full">
              <div className="min-h-[32px] flex items-start justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Limite Disponível</span>
              </div>
              <div className="my-auto flex items-center min-h-[36px] py-1 overflow-hidden">
                <p className={`text-lg xl:text-xl 2xl:text-2xl font-black tracking-tight truncate font-tnum tabular-nums ${limitAvailable < 0 ? "text-rose-500" : "text-emerald-500"}`} title={brl(limitAvailable)}>
                  {brl(limitAvailable)}
                </p>
              </div>
              <div className="min-h-[24px] flex items-center w-full">
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${usagePct >= 90 ? "bg-rose-500" : usagePct >= 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Card 3 — FATURA DO MÊS */}
            <div className="bg-white rounded-[24px] border border-white/80 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.03)] relative overflow-hidden flex flex-col justify-between h-40 w-full">
              <div className="min-h-[32px] flex items-start justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Fatura do Mês</span>
              </div>
              <div className="my-auto flex items-center min-h-[36px] py-1 overflow-hidden">
                <p className="text-lg xl:text-xl 2xl:text-2xl font-black text-rose-500 tracking-tight truncate font-tnum tabular-nums" title={brl(impactoMes)}>
                  {brl(impactoMes)}
                </p>
              </div>
              <div className="min-h-[24px] flex items-center">
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-100/80 px-2 py-0.5 rounded-full border border-slate-200/60 truncate">
                  Mês Selecionado
                </span>
              </div>
            </div>

            {/* Card 4 — DATA DE FECHAMENTO */}
            <div
              onClick={openDatesModal}
              title="Clique para alterar as datas do cartão"
              className="bg-white rounded-[24px] border border-white/80 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.03)] relative overflow-hidden cursor-pointer group hover:border-indigo-200 transition-all flex flex-col justify-between h-40 w-full"
            >
              <div className="min-h-[32px] flex items-start justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block leading-tight">Data Fechamento</span>
                <Edit2 className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 transition-colors shrink-0 mt-0.5" />
              </div>
              <div className="my-auto flex items-center min-h-[36px] py-1 overflow-hidden">
                <p className="text-xl xl:text-2xl font-black text-indigo-600 tracking-tight truncate">
                  Dia {String(cardData.diaFechamento || 1).padStart(2, "0")}
                </p>
              </div>
              <div className="min-h-[24px] flex items-center">
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full truncate">
                  Encerramento da fatura
                </span>
              </div>
            </div>

            {/* Card 5 — DIA DE VENCIMENTO */}
            <div
              onClick={openDatesModal}
              title="Clique para alterar as datas do cartão"
              className="bg-white rounded-[24px] border border-white/80 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.03)] relative overflow-hidden cursor-pointer group hover:border-amber-200 transition-all flex flex-col justify-between h-40 w-full"
            >
              <div className="min-h-[32px] flex items-start justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block leading-tight">Dia Vencimento</span>
                <Edit2 className="w-3.5 h-3.5 text-slate-300 group-hover:text-amber-600 transition-colors shrink-0 mt-0.5" />
              </div>
              <div className="my-auto flex items-center min-h-[36px] py-1 overflow-hidden">
                <p className="text-xl xl:text-2xl font-black text-amber-600 tracking-tight truncate">
                  Dia {String(cardData.vencimento || 10).padStart(2, "0")}
                </p>
              </div>
              <div className="min-h-[24px] flex items-center">
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full truncate">
                  Limite de pagamento
                </span>
              </div>
            </div>

            {/* Card 6 — MELHOR DIA COMPRA */}
            <div
              onClick={openDatesModal}
              title="Clique para alterar as datas do cartão"
              className="bg-white rounded-[24px] border border-white/80 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.03)] relative overflow-hidden cursor-pointer group hover:border-emerald-200 transition-all flex flex-col justify-between h-40 w-full"
            >
              <div className="min-h-[32px] flex items-start justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block leading-tight">Melhor Dia Compra</span>
                <Edit2 className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-600 transition-colors shrink-0 mt-0.5" />
              </div>
              <div className="my-auto flex items-center min-h-[36px] py-1 overflow-hidden">
                <p className="text-xl xl:text-2xl font-black text-emerald-600 tracking-tight truncate">
                  Dia {String(cardData.melhorDiaCompra || 2).padStart(2, "0")}
                </p>
              </div>
              <div className="min-h-[24px] flex items-center">
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full truncate">
                  Próxima fatura (+30d)
                </span>
              </div>
            </div>
          </section>

          {/* Compras à Vista & Parceladas */}
          <div className="flex flex-col gap-8">
            <section className="bg-white rounded-[28px] border border-white/80 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.03)] flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">Compras à Vista (Mês Atual)</h3>
                  <p className="text-[10px] font-semibold text-slate-400">Lançamentos pontuais no cartão</p>
                </div>
                <span className="text-xs font-black text-slate-700 bg-slate-50 px-3 py-1 rounded-xl border border-slate-100">
                  {brl(saldoVista)}
                </span>
              </div>

              {vistaPurchases.length === 0 ? (
                <p className="text-xs font-semibold text-slate-400 py-6 text-center">Nenhuma compra à vista neste mês.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-[9px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        <th className="pb-3">Data</th>
                        <th className="pb-3">Descrição</th>
                        <th className="pb-3">Categoria</th>
                        <th className="pb-3 text-right">Valor</th>
                        <th className="pb-3 text-center whitespace-nowrap">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                      {vistaPurchases.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 text-[10px] font-bold text-slate-400">{p.date}</td>
                          <td className="py-3 font-extrabold text-slate-800">{p.description}</td>
                          <td className="py-3">
                            <span className="bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold">
                              {p.category}
                            </span>
                          </td>
                          <td className="py-3 text-right font-black text-rose-500">{brl(p.amount)}</td>
                          <td className="py-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                              <button onClick={() => openEditModal(p)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => { setSelectedPurchase(p); setModalType("delete"); }} className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600">
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

            <section className="bg-white rounded-[28px] border border-white/80 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.03)] flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">Lançamentos Parcelados</h3>
                  <p className="text-[10px] font-semibold text-slate-400">Parcelas ativas cobradas no mês selecionado</p>
                </div>
                <span className="text-xs font-black text-slate-700 bg-slate-50 px-3 py-1 rounded-xl border border-slate-100">
                  Dívida Restante: {brl(dividaParcelada)}
                </span>
              </div>

              {parceladoPurchasesProcessed.length === 0 ? (
                <p className="text-xs font-semibold text-slate-400 py-6 text-center">Nenhum parcelamento ativo neste mês.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-[9px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        <th className="pb-3">Data</th>
                        <th className="pb-3">Descrição</th>
                        <th className="pb-3">Parcela</th>
                        <th className="pb-3 text-right">Valor Parcela</th>
                        <th className="pb-3 text-right">Dívida Restante</th>
                        <th className="pb-3 text-center whitespace-nowrap">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                      {parceladoPurchasesProcessed.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 text-[10px] font-bold text-slate-400">{p.date}</td>
                          <td className="py-3 font-extrabold text-slate-800">{p.description}</td>
                          <td className="py-3">
                            <span className="bg-amber-50 text-amber-600 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold">
                              {p.currentInstallment} / {p.installmentsCount}
                            </span>
                          </td>
                          <td className="py-3 text-right font-black text-slate-800">{brl(p.amount)}</td>
                          <td className="py-3 text-right font-bold text-slate-400">{brl(p.remainingDebt)}</td>
                          <td className="py-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                              <button onClick={() => openEditModal(p)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => { setSelectedPurchase(p); setModalType("delete"); }} className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600">
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
        // ── VISÃO RICA PARA CONTA CORRENTE E TICKET (MESMO MODELO APRESENTÁVEL) ──
        <div className="flex flex-col gap-8">
          
          {/* TOPO: Card Tile Colorido + 3 KPI Cards (Consumo no Mês, Receitas do Mês & Saldo Final) */}
          <section className="grid grid-cols-1 lg:grid-cols-4 gap-5">
            
            {/* Card Tile Principal (Esquerda) */}
            <div className={`lg:col-span-1 rounded-[28px] overflow-hidden bg-gradient-to-br ${
              isTicket ? "from-emerald-800 via-teal-900 to-slate-900" :
              cardData.title.toLowerCase().includes("santander") ? "from-red-800 via-rose-900 to-slate-900" :
              cardData.title.toLowerCase().includes("itau") ? "from-orange-600 via-amber-700 to-slate-900" :
              cardData.title.toLowerCase().includes("nubank") ? "from-purple-800 via-indigo-900 to-slate-900" :
              "from-indigo-800 via-purple-900 to-slate-900"
            } p-5 flex flex-col justify-between shadow-xl border border-white/10 relative h-52`}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.12)_0%,_transparent_60%)] pointer-events-none" />

              <div className="flex justify-between items-start z-10">
                <div>
                  <p className="text-[10px] font-black text-white/90 uppercase tracking-widest">{cardData.title}</p>
                  <p className="text-[9px] font-bold text-white/60 mt-0.5">
                    {isTicket ? "TICKET · SALDO ATUAL" : "CONTA · SALDO ATUAL"}
                  </p>
                  {cardData.holder && (
                    <p className="text-[9px] font-extrabold text-white/90 uppercase tracking-wide mt-1">
                      👤 {cardData.holder}
                    </p>
                  )}
                  {(cardData.agencia || cardData.conta) && (
                    <p className="text-[9px] font-bold text-white/80 mt-0.5">
                      {cardData.agencia ? `Ag: ${cardData.agencia}` : ""} {cardData.conta ? `Cc: ${cardData.conta}` : ""}
                    </p>
                  )}
                </div>
                <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
                  {isTicket ? <Zap className="w-4 h-4 text-white" /> : <Building2 className="w-4 h-4 text-white" />}
                </div>
              </div>

              <div className="z-10 -mt-1">
                <h3 className="text-2xl font-black text-white tracking-tight">
                  {brl(saldoAtualCalculado)}
                </h3>
              </div>

              <div className="z-10 flex flex-col gap-1.5">
                <div className="h-1.5 w-full bg-white/15 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-400 rounded-full transition-all duration-700" 
                    style={{ width: `${ticketRemainingPct}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[9px] font-extrabold text-white/70 tracking-wider uppercase">
                  <span>{previousBalance > 0 ? `ANTERIOR: ${brl(previousBalance)}` : `INICIAL: ${brl(openingBalance)}`}</span>
                  <span className="text-emerald-300">{isTicket ? "ALIMENTAÇÃO" : "CONTA CORRENTE"}</span>
                </div>
              </div>
            </div>

            {/* 5 KPI Cards (Direita: 1. Receitas | 2. Consumo | 3. Saldo Final | 4. Total Pago | 5. Total Não Pago) */}
            <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              
              {/* KPI 1 — Receitas do Mês */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between relative overflow-hidden h-52">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Receitas do Mês</span>
                  <span className="bg-emerald-50 text-emerald-700 text-[9px] font-semibold px-2.5 py-0.5 rounded-md border border-emerald-200/60 uppercase">
                    Entradas
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Total Disponível em {getMonthName(selectedMonth)}/{selectedYear}</p>
                  <p className="text-2xl font-bold text-emerald-600 tracking-tight font-tnum tabular-nums">{brl(totalAvailable)}</p>
                </div>
                <div className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2 text-[10px] font-medium text-slate-500 flex justify-between items-center">
                  <span>Mês: {brl(monthIncome)}</span>
                  {previousBalance > 0 && (
                    <span className="text-emerald-700 font-semibold text-[9px]">Ant: +{brl(previousBalance)}</span>
                  )}
                </div>
              </div>

              {/* KPI 2 — Consumo do Mês */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between relative overflow-hidden h-52">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Consumo no Mês</span>
                  <span className="bg-amber-50 text-amber-700 text-[9px] font-semibold px-2.5 py-0.5 rounded-md border border-amber-200/60 uppercase">
                    Saídas
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Total Utilizado em {getMonthName(selectedMonth)}/{selectedYear}</p>
                  <p className="text-2xl font-bold text-slate-900 tracking-tight font-tnum tabular-nums">{brl(totalGastosMes)}</p>
                </div>
                <div className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2 text-[10px] font-medium text-slate-500">
                  Gastos debitados no mês
                </div>
              </div>

              {/* KPI 3 — Saldo Final Acumulado */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between relative overflow-hidden h-52">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Saldo Final</span>
                  <span className="bg-emerald-50 text-emerald-700 text-[9px] font-semibold px-2.5 py-0.5 rounded-md border border-emerald-200/60 uppercase">
                    Acumulado
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Saldo em {getMonthName(selectedMonth)}/{selectedYear}</p>
                  <p className="text-2xl font-bold text-slate-900 tracking-tight font-tnum tabular-nums">{brl(saldoAtualCalculado)}</p>
                </div>
                <div className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2 text-[10px] font-medium text-slate-500">
                  Disponível para os próximos meses
                </div>
              </div>

              {/* KPI 4 — Total Pago */}
              <div className="bg-white rounded-2xl border border-emerald-200/60 p-5 shadow-sm flex flex-col justify-between relative overflow-hidden h-52">
                <div className="absolute inset-0 bg-emerald-50/30 pointer-events-none" />
                <div className="flex justify-between items-start z-10">
                  <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">Total Pago</span>
                  <span className="bg-emerald-100 text-emerald-700 text-[9px] font-bold px-2.5 py-0.5 rounded-md border border-emerald-300/60 uppercase flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Confirmado
                  </span>
                </div>
                <div className="z-10">
                  <p className="text-xs font-medium text-emerald-600/70 mb-1">Despesas quitadas em {getMonthName(selectedMonth)}/{selectedYear}</p>
                  <p className="text-2xl font-bold text-emerald-700 tracking-tight font-tnum tabular-nums">{brl(totalPago)}</p>
                </div>
                <div className="z-10 w-full bg-emerald-100/60 border border-emerald-200/60 rounded-xl p-2 text-[10px] font-medium text-emerald-700 flex justify-between items-center">
                  <span>{monthExpenseTransactions.filter(t => t.status !== "PENDING").length} lançamento(s) pago(s)</span>
                  {totalGastosMes > 0 && (
                    <span className="font-bold">{Math.round((totalPago / (totalPago + totalNaoPago || 1)) * 100)}%</span>
                  )}
                </div>
              </div>

              {/* KPI 5 — Total Não Pago */}
              <div className="bg-white rounded-2xl border border-rose-200/60 p-5 shadow-sm flex flex-col justify-between relative overflow-hidden h-52">
                <div className="absolute inset-0 bg-rose-50/20 pointer-events-none" />
                <div className="flex justify-between items-start z-10">
                  <span className="text-[10px] font-semibold text-rose-600 uppercase tracking-wider">Total Não Pago</span>
                  <span className="bg-rose-100 text-rose-600 text-[9px] font-bold px-2.5 py-0.5 rounded-md border border-rose-200/60 uppercase flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    Pendente
                  </span>
                </div>
                <div className="z-10">
                  <p className="text-xs font-medium text-rose-500/70 mb-1">Despesas pendentes em {getMonthName(selectedMonth)}/{selectedYear}</p>
                  <p className="text-2xl font-bold text-rose-600 tracking-tight font-tnum tabular-nums">{brl(totalNaoPago)}</p>
                </div>
                <div className="z-10 w-full bg-rose-100/40 border border-rose-200/60 rounded-xl p-2 text-[10px] font-medium text-rose-600 flex justify-between items-center">
                  <span>{monthExpenseTransactions.filter(t => t.status === "PENDING").length} lançamento(s) pendente(s)</span>
                  {totalNaoPago > 0 && (
                    <span className="font-bold">{Math.round((totalNaoPago / (totalPago + totalNaoPago || 1)) * 100)}%</span>
                  )}
                </div>
              </div>

            </div>

          </section>

          {/* TABELA: EXTRATO DE DESPESAS */}
          <section className="flex flex-col gap-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Extrato de Despesas ({getMonthName(selectedMonth)}/{selectedYear})
            </h2>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col gap-4">
              
              {(() => {
                const monthTransactions = (cardData.allTransactions || [])
                  .filter((t) => t.type === "EXPENSE")
                  .filter((t) => {
                    const parts = t.date.split("-");
                    return Number(parts[0]) === selectedYear && Number(parts[1]) === selectedMonth;
                  });

                if (monthTransactions.length === 0) {
                  return (
                    <div className="py-12 flex flex-col items-center justify-center gap-2 text-center">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600/60" />
                      <p className="text-xs font-medium text-slate-500">Nenhuma despesa registrada para este mês.</p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 bg-slate-50/80">
                          <th className="px-4 py-3">Data</th>
                          <th className="px-4 py-3">Descrição</th>
                          <th className="px-4 py-3">Categoria</th>
                          <th className="px-4 py-3 text-right">Valor</th>
                          <th className="px-4 py-3 text-center">Status / Pagamento</th>
                          <th className="px-4 py-3 text-center whitespace-nowrap">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-900">
                        {monthTransactions.map((t) => {
                          const isPaid = t.status !== "PENDING";
                          return (
                            <tr key={t.id} className={`transition-colors ${isPaid ? "bg-emerald-50/10 hover:bg-emerald-50/30" : "hover:bg-slate-50/50"}`}>
                              <td className="px-4 py-3.5 text-[11px] text-slate-500 font-normal">{t.date.split("-").reverse().join("/")}</td>
                              <td className="px-4 py-3.5 font-semibold text-slate-900">{t.description}</td>
                              <td className="px-4 py-3.5">
                                <span className="bg-indigo-50 text-indigo-700 border border-indigo-200/60 px-2.5 py-0.5 rounded-md text-[10px] font-semibold uppercase">
                                  {t.category || "Despesa"}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-right font-semibold text-slate-900 tabular-nums font-tnum">
                                {brl(t.amount)}
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <button
                                  onClick={async () => {
                                    try {
                                      await toggleTransactionStatusAction(t.id);
                                      await loadData();
                                    } catch (err) {
                                      console.error(err);
                                    }
                                  }}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-extrabold transition-all shadow-xs cursor-pointer ${
                                    isPaid
                                      ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20"
                                      : "bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200"
                                  }`}
                                  title={isPaid ? "Clique para desmarcar" : "Clique para marcar como pago"}
                                >
                                  {isPaid ? (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                      <span>Pago</span>
                                    </>
                                  ) : (
                                    <>
                                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                                      <span>Marcar como PAGO</span>
                                    </>
                                  )}
                                </button>
                              </td>
                              <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                                  <button onClick={() => openEditModal(t as any)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors">
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => { setSelectedPurchase(t as any); setModalType("delete"); }} className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-slate-200/80 font-semibold text-slate-900 bg-slate-50/40">
                          <td colSpan={3} className="px-4 py-3.5 text-slate-500 uppercase tracking-wider text-xs">
                            TOTAL CONSUMIDO NO MÊS
                          </td>
                          <td className="px-4 py-3.5 text-right font-bold text-slate-900 text-sm tabular-nums font-tnum">
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
          </section>
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md flex flex-col gap-5 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Injetar Saldo / Capital</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Informe o valor, a origem e o mês de aplicação.</p>
              </div>
              <button onClick={() => setModalType(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddCarga} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Valor da Entrada (R$) *</label>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formCarga}
                  onChange={e => setFormCarga(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0,00"
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-900 font-tnum tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Origem da Entrada *</label>
                <select
                  value={formCargaOrigin}
                  onChange={e => setFormCargaOrigin(e.target.value as any)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                  <label className="text-xs font-semibold text-slate-700">Mês de Aplicação</label>
                  <select
                    value={formCargaMonth}
                    onChange={e => setFormCargaMonth(Number(e.target.value))}
                    className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                  <label className="text-xs font-semibold text-slate-700">Ano de Aplicação</label>
                  <select
                    value={formCargaYear}
                    onChange={e => setFormCargaYear(Number(e.target.value))}
                    className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {Array.from({ length: 11 }, (_, i) => 2020 + i).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setModalType(null)} className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">Cancelar</button>
                <button type="submit" className="flex-1 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm">Confirmar Entrada</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Subtrair/Remover Carga */}
      {modalType === "cargaRemove" && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] p-7 w-full max-w-sm flex flex-col gap-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-slate-800">
                  {isTicket ? "Remover Carga do Ticket" : "Subtrair Saldo da Conta"}
                </h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Subtrai o valor digitado do saldo atual.</p>
              </div>
              <button onClick={() => setModalType(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRemoveCarga} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Valor a Subtrair (R$)</label>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formCarga}
                  onChange={e => setFormCarga(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0,00"
                  className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-200"
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setModalType(null)} className="flex-1 py-3 text-xs font-extrabold text-slate-500 bg-slate-100 rounded-2xl">CANCELAR</button>
                <button type="submit" className="flex-1 py-3 text-xs font-extrabold text-white bg-rose-500 hover:bg-rose-600 rounded-2xl shadow-lg shadow-rose-500/25">SUBTRAIR</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ajustar Limite do Cartão */}
      {modalType === "limit" && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] p-6 w-full max-w-sm flex flex-col gap-4 shadow-2xl">
            <h3 className="text-sm font-black text-slate-800">Ajustar Limite do Cartão</h3>
            <form onSubmit={handleLimitSave} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Novo Limite Total (R$)</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={formLimit}
                  onChange={e => setFormLimit(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0,00"
                  className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setModalType(null)} className="flex-1 py-2.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-xl">Cancelar</button>
                <button type="submit" className="flex-1 py-2.5 text-xs font-bold text-white bg-indigo-600 rounded-xl">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ajustar Datas do Cartão */}
      {modalType === "dates" && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] p-7 w-full max-w-md flex flex-col gap-5 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white">Ajustar Datas do Cartão</h3>
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-400 mt-0.5">Defina o dia de fechamento e o dia de vencimento da fatura.</p>
              </div>
              <button onClick={() => setModalType(null)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDatesSave} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-wider">
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
                    className="w-full rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm font-black text-indigo-600 dark:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Dia em que a fatura é fechada</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-wider">
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
                    className="w-full rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm font-black text-amber-600 dark:text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Dia limite do pagamento</span>
                </div>
              </div>

              {/* Preview do Melhor Dia de Compra */}
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl p-4 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">Melhor Dia para Compra (Calculado)</span>
                  <span className="text-[10px] font-medium text-emerald-700/80 dark:text-emerald-400">Dia subsequente ao fechamento</span>
                </div>
                <span className="text-base font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700/50 px-3.5 py-1 rounded-xl shadow-xs">
                  Dia {String((Number(formDiaFechamento) % 31) + 1).padStart(2, "0")}
                </span>
              </div>

              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setModalType(null)} className="flex-1 py-3 text-xs font-extrabold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-2xl cursor-pointer transition-colors">
                  CANCELAR
                </button>
                <button type="submit" className="flex-1 py-3 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-lg shadow-indigo-600/25 cursor-pointer transition-colors">
                  SALVAR ALTERAÇÕES
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Lançamento */}
      {modalType === "edit" && selectedPurchase && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] p-7 w-full max-w-md flex flex-col gap-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-800">Editar Lançamento</h3>
              <button onClick={() => setModalType(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handlePurchaseEdit} className="flex flex-col gap-4">
              {/* Descrição */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Descrição *</label>
                <input
                  required
                  type="text"
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-200 text-slate-700"
                />
              </div>

              {/* Categoria */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Categoria *</label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                  className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Forma de Pagamento (Cartão de Crédito) */}
              {isCredit && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Forma de Pagamento</label>
                  <div className="flex gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                    <button
                      type="button"
                      onClick={() => setFormType("vista")}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                        formType === "vista"
                          ? "bg-white text-indigo-600 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      À Vista
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormType("parcelado")}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                        formType === "parcelado"
                          ? "bg-white text-indigo-600 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Parcelado
                    </button>
                  </div>
                </div>
              )}

              {/* Valor */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  {formType === "vista" ? "Valor Total (R$) *" : "Valor da Parcela (R$) *"}
                </label>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formType === "vista" ? formAmount : formInstallmentAmount}
                  onChange={e => formType === "vista" ? setFormAmount(Number(e.target.value)) : setFormInstallmentAmount(Number(e.target.value))}
                  className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-200 text-slate-700"
                />
              </div>

              {/* Nº de Parcelas */}
              {isCredit && formType === "parcelado" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Número de Parcelas *</label>
                  <select
                    value={formInstallmentsCount}
                    onChange={e => setFormInstallmentsCount(Number(e.target.value))}
                    className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    {[2,3,4,5,6,7,8,9,10,11,12,18,24].map(n => (
                      <option key={n} value={n}>{n}x</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Data */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Data do Lançamento *</label>
                <input
                  required
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-200 text-slate-700"
                />
              </div>

              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setModalType(null)} className="flex-1 py-3 text-xs font-extrabold text-slate-500 bg-slate-100 rounded-2xl">CANCELAR</button>
                <button type="submit" className="flex-1 py-3 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-lg shadow-indigo-600/25">SALVAR ALTERAÇÕES</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Excluir Lançamento */}
      {modalType === "delete" && selectedPurchase && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] p-6 w-full max-w-sm flex flex-col gap-4 text-center shadow-2xl">
            <h3 className="text-sm font-black text-slate-800">Excluir Lançamento</h3>
            <p className="text-xs text-slate-500">Tem certeza que deseja excluir "{selectedPurchase.description}"?</p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setModalType(null)} className="flex-1 py-2.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-xl">Cancelar</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 text-xs font-bold text-white bg-rose-500 rounded-xl">Excluir</button>
            </div>
          </div>
        </div>
      )}



    </div>
  );
}
