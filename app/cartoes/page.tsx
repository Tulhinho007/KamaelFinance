"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Calendar,
  Plus,
  ChevronRight,
  CheckCircle2,
  Clock,
  Zap,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  Pencil,
  Trash2,
  X,
  Repeat,
  DollarSign,
  Tag,
} from "lucide-react";
import { PeriodHeader } from "@/components/period-header";
import { usePeriod } from "@/components/period-context";
import {
  getCreditCardsPageDataAction,
  createNewCard,
  deleteCardPurchase,
} from "@/lib/actions";
import { NewPurchaseModal } from "@/components/new-purchase-modal";
import { EditCardTransactionModal } from "@/components/edit-card-transaction-modal";
import { useModal } from "@/components/ui/custom-dialog-provider";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDateBR = (dateStr?: string | null) => {
  if (!dateStr) return "-";
  const clean = dateStr.split("T")[0];
  const parts = clean.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

export default function CartoesPage() {
  const router = useRouter();
  const { selectedMonth, selectedYear } = usePeriod();
  const { showAlert } = useModal();

  const [cards, setCards] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [totals, setTotals] = useState({
    totalLimit: 0,
    totalAvailable: 0,
    totalInvoices: 0,
  });
  const [loading, setLoading] = useState(true);

  // Modais
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [newCardModalOpen, setNewCardModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [txToEdit, setTxToEdit] = useState<any | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [txToDelete, setTxToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Formulário Novo Cartão
  const [cardFormBank, setCardFormBank] = useState("");
  const [cardFormHolder, setCardFormHolder] = useState("");
  const [cardFormLimit, setCardFormLimit] = useState<number | "">("");
  const [cardFormDiaFech, setCardFormDiaFech] = useState(1);
  const [cardFormDiaVenc, setCardFormDiaVenc] = useState(10);
  const [cardFormSaving, setCardFormSaving] = useState(false);

  const loadData = async (active = true) => {
    try {
      setLoading(true);
      const data = await getCreditCardsPageDataAction(selectedMonth, selectedYear);
      if (!active) return;
      setCards(data.cards || []);
      setTransactions(data.transactions || []);
      setTotals(data.totals || { totalLimit: 0, totalAvailable: 0, totalInvoices: 0 });
    } catch (err) {
      console.error("Erro ao carregar módulo de cartões:", err);
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
  }, [selectedMonth, selectedYear]);

  // Handler: Criar Novo Cartão de Crédito
  const handleCreateNewCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardFormBank.trim()) {
      showAlert("Por favor, informe o nome ou instituição do cartão.", { variant: "warning" });
      return;
    }
    const limitNum = Number(cardFormLimit);
    if (isNaN(limitNum) || limitNum < 0) {
      showAlert("Por favor, informe um limite válido.", { variant: "warning" });
      return;
    }
    setCardFormSaving(true);
    try {
      await createNewCard({
        bankName: cardFormBank.trim(),
        walletType: "CREDIT_CARD",
        alias: cardFormBank.trim(),
        holder: cardFormHolder.trim() || undefined,
        limitOrBalance: limitNum,
        diaFechamento: cardFormDiaFech,
        diaVencimento: cardFormDiaVenc,
        originType: "ROLLOVER",
        targetMonth: selectedMonth || new Date().getMonth() + 1,
        targetYear: selectedYear,
      });

      showAlert("Cartão de crédito cadastrado com sucesso!", { variant: "success" });
      setNewCardModalOpen(false);
      setCardFormBank("");
      setCardFormHolder("");
      setCardFormLimit("");
      setCardFormDiaFech(1);
      setCardFormDiaVenc(10);
      await loadData();
    } catch (err: any) {
      console.error("Erro ao cadastrar cartão:", err);
      showAlert(err?.message || "Erro ao cadastrar cartão de crédito.", { variant: "error" });
    } finally {
      setCardFormSaving(false);
    }
  };

  // Handler: Confirmar Exclusão de Compra
  const handleConfirmDelete = async (deleteAllFuture = false) => {
    if (!txToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteCardPurchase(txToDelete.id, { cascadeAllInstallments: deleteAllFuture });
      if (res.success) {
        showAlert(
          deleteAllFuture && res.deletedCount && res.deletedCount > 1
            ? `${res.deletedCount} parcelas excluídas com sucesso!`
            : "Lançamento excluído com sucesso!",
          { variant: "success" }
        );
        setDeleteModalOpen(false);
        setTxToDelete(null);
        await loadData();
        router.refresh();
      } else {
        showAlert(res.error || "Erro ao excluir lançamento.", { variant: "error" });
      }
    } catch (err: any) {
      showAlert(err?.message || "Erro ao excluir lançamento.", { variant: "error" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto flex flex-col gap-8 select-none relative font-sans text-slate-900 dark:text-slate-100">
      
      {/* Top Header & Controles */}
      <div className="flex flex-col gap-3">
        <Link
          href="/"
          prefetch={false}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 w-fit transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar para o Dashboard
        </Link>
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <PeriodHeader
            title="Cartões de Crédito"
            tagline="Gestão dedicada de limites, faturas e compras parceladas no crédito."
          />
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setNewCardModalOpen(true)}
              className="flex items-center gap-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              + Novo Cartão
            </button>
            <button
              onClick={() => setPurchaseModalOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider shadow-sm shadow-indigo-600/25 transition-all hover:scale-[1.01] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              + Lançar Compra no Cartão
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Superiores Exclusivos de Cartões de Crédito */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs relative overflow-hidden">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
            Limite Total Contratado
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1 tabular-nums">
            {brl(totals.totalLimit)}
          </p>
          <span className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-0.5 rounded-full border border-indigo-200/50 dark:border-indigo-800/40">
            <ShieldCheck className="w-3 h-3 text-indigo-500" /> {cards.length} {cards.length === 1 ? "cartão cadastrado" : "cartões cadastrados"}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs relative overflow-hidden">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
            Limite Disponível Real
          </span>
          <p className={`text-2xl font-black tracking-tight mt-1 tabular-nums ${totals.totalAvailable < 0 ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400"}`}>
            {brl(totals.totalAvailable)}
          </p>
          <span className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-800/40">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Livre para novas compras
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs relative overflow-hidden">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
            Total de Faturas Abertas
          </span>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight mt-1 tabular-nums">
            {brl(totals.totalInvoices)}
          </p>
          <span className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-0.5 rounded-full border border-rose-200/50 dark:border-rose-800/40">
            <Clock className="w-3 h-3 text-rose-500" /> Comprometido no período
          </span>
        </div>
      </section>

      {/* Grid de Cartões de Crédito */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Meus Cartões de Crédito ({cards.length})
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="h-56 bg-slate-100 dark:bg-slate-800/50 rounded-2xl animate-pulse" />
            <div className="h-56 bg-slate-100 dark:bg-slate-800/50 rounded-2xl animate-pulse" />
          </div>
        ) : cards.length === 0 ? (
          <div className="py-16 text-center border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/60 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <CreditCard className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Nenhum cartão de crédito cadastrado</p>
              <p className="text-xs text-slate-400">Cadastre seu primeiro cartão para gerenciar limites e faturas.</p>
            </div>
            <button
              onClick={() => setNewCardModalOpen(true)}
              className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              + Cadastrar Novo Cartão
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {cards.map((card) => {
              const available = Math.max(0, card.limitTotal - card.limitUsed);
              const usagePct = card.limitTotal > 0 ? Math.min(100, Math.round((card.limitUsed / card.limitTotal) * 100)) : 0;
              const fechamento = card.diaFechamento || 1;
              const melhorDia = card.melhorDiaCompra || (fechamento % 31) + 1;

              return (
                <div
                  key={card.id}
                  className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between gap-5 relative overflow-hidden group hover:border-indigo-500/40 transition-all"
                >
                  {/* Top Bar do Card */}
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                          {card.title}
                        </h3>
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                          {card.bankName}
                        </span>
                        {card.faturaAtual <= 0 ? (
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Sem Fatura
                          </span>
                        ) : card.isPaid ? (
                          <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            ✓ Paga
                          </span>
                        ) : card.isPast ? (
                          <span className="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            🚨 Vencida
                          </span>
                        ) : (
                          <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {card.vencimentoStr ? `Vence em ${card.vencimentoStr}` : "Aberta"}
                          </span>
                        )}
                      </div>
                      {card.holder && (
                        <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-1">
                          Titular: {card.holder}
                        </p>
                      )}
                    </div>

                    <Link
                      href={`/cartoes/${card.id}`}
                      prefetch={false}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <span>Ver Fatura</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Métricas de Limite & Fatura */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 text-xs">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                        Limite Total
                      </span>
                      <p className="font-extrabold text-slate-900 dark:text-white tabular-nums mt-0.5 text-xs sm:text-sm">
                        {brl(card.limitTotal)}
                      </p>
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                        Disponível
                      </span>
                      <p className={`font-extrabold tabular-nums mt-0.5 text-xs sm:text-sm ${available < 0 ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400"}`}>
                        {brl(available)}
                      </p>
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                        Fatura Atual
                      </span>
                      <p className={`font-extrabold tabular-nums mt-0.5 text-xs sm:text-sm ${card.faturaAtual <= 0 ? "text-slate-900 dark:text-white" : card.isPaid ? "text-emerald-600 dark:text-emerald-400" : card.isPast ? "text-rose-500" : "text-amber-600 dark:text-amber-400"}`}>
                        {brl(card.faturaAtual)}
                      </p>
                    </div>
                  </div>

                  {/* Datas do Cartão */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-t border-slate-100 dark:border-slate-800/80 pt-3">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 block">Fechamento</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">Dia {String(fechamento).padStart(2, "0")}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-emerald-500" />
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 block">Melhor Dia</span>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">Dia {String(melhorDia).padStart(2, "0")}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 block">Vencimento</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">Dia {String(card.vencimento || 10).padStart(2, "0")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Barra de progresso do limite */}
                  <div className="flex flex-col gap-1">
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          usagePct >= 90 ? "bg-rose-500" : usagePct >= 70 ? "bg-amber-500" : "bg-indigo-600"
                        }`}
                        style={{ width: `${usagePct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500">
                      <span>Uso do limite: {usagePct}%</span>
                      <span>Restante: {100 - usagePct}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Seção "Faturas a Vencer / Extrato do Cartão" */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Faturas a Vencer / Extrato do Cartão ({transactions.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Compras e parcelas ativas no período selecionado.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  <th className="py-3 px-4">DATA</th>
                  <th className="py-3 px-4">DESCRIÇÃO</th>
                  <th className="py-3 px-4">CARTÃO</th>
                  <th className="py-3 px-4">CATEGORIA</th>
                  <th className="py-3 px-4">PARCELA</th>
                  <th className="py-3 px-4 text-right">VALOR</th>
                  <th className="py-3 px-4 text-center w-24">AÇÃO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                      Nenhuma compra no cartão registrada para o período selecionado.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="py-3 px-4 font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {formatDateBR(tx.purchaseDate || tx.date)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {tx.description}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                          <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
                          {tx.walletName}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {tx.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {tx.installmentsCount && tx.installmentsCount > 1 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
                            {tx.currentInstallment || 1}/{tx.installmentsCount}
                          </span>
                        ) : tx.isRecurring ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-600 dark:text-purple-400">
                            <Repeat className="w-3 h-3" /> Recorrente
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">À vista</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-black tabular-nums text-slate-900 dark:text-white whitespace-nowrap">
                        {brl(tx.amount)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setTxToEdit(tx);
                              setEditModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                            title="Editar lançamento"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTxToDelete(tx);
                              setDeleteModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                            title="Excluir lançamento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Modal: Novo Cartão de Crédito */}
      {newCardModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Novo Cartão de Crédito</h3>
                  <p className="text-[11px] text-slate-400">Cadastre limites e datas de faturamento</p>
                </div>
              </div>
              <button
                onClick={() => setNewCardModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewCard} className="flex flex-col gap-4 mt-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Nome do Cartão / Instituição *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: HyperCard, Nubank Mastercard, XP Visa Infinite"
                  value={cardFormBank}
                  onChange={(e) => setCardFormBank(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Titular (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Túlio Cavalcanti"
                  value={cardFormHolder}
                  onChange={(e) => setCardFormHolder(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Limite Total do Cartão (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0,00"
                  value={cardFormLimit}
                  onChange={(e) => setCardFormLimit(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Dia de Fechamento *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={cardFormDiaFech}
                    onChange={(e) => setCardFormDiaFech(Number(e.target.value))}
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Dia de Vencimento *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={cardFormDiaVenc}
                    onChange={(e) => setCardFormDiaVenc(Number(e.target.value))}
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={cardFormSaving}
                className="mt-2 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/25 transition-all disabled:opacity-50 cursor-pointer"
              >
                {cardFormSaving ? "Cadastrando..." : "Confirmar Cadastro do Cartão"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Exclusão com Suporte a Cascata para Parceladas */}
      {deleteModalOpen && txToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200 text-center flex flex-col gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-500 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Excluir Lançamento</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Deseja excluir a compra <strong className="text-slate-800 dark:text-slate-200">"{txToDelete.description}"</strong> de {brl(txToDelete.amount)}?
              </p>
            </div>

            {txToDelete.installmentGroupId || (txToDelete.installmentsCount && txToDelete.installmentsCount > 1) ? (
              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => handleConfirmDelete(true)}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  {isDeleting ? "Excluindo..." : "Excluir Esta e Todas as Próximas Parcelas"}
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => handleConfirmDelete(false)}
                  className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Excluir Apenas Esta Parcela
                </button>
                <button
                  type="button"
                  onClick={() => { setDeleteModalOpen(false); setTxToDelete(null); }}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 py-1 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setDeleteModalOpen(false); setTxToDelete(null); }}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => handleConfirmDelete(false)}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  {isDeleting ? "Excluindo..." : "Excluir"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Lançar Compra no Cartão */}
      <NewPurchaseModal
        isOpen={purchaseModalOpen}
        onClose={() => setPurchaseModalOpen(false)}
        onSuccess={loadData}
      />

      {/* Modal: Editar Lançamento do Cartão */}
      <EditCardTransactionModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setTxToEdit(null);
        }}
        transaction={txToEdit}
        cards={cards}
        onSuccess={async () => {
          await loadData();
          router.refresh();
        }}
      />

    </div>
  );
}
