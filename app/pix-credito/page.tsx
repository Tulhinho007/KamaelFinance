"use client";

import React, { useState, useEffect } from "react";
import {
  Zap,
  Plus,
  CreditCard,
  Building2,
  Calendar,
  Clock,
  TrendingDown,
  TrendingUp,
  Percent,
  ChevronDown,
  ChevronUp,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  ShieldCheck,
  FileText,
  Loader2,
} from "lucide-react";
import {
  getCreditPixOverviewAction,
  deleteCreditPixOperationAction,
  CreditPixOverviewData,
  CreditPixOperationItem,
} from "@/lib/credit-pix-actions";
import { NewCreditPixModal } from "@/components/new-credit-pix-modal";
import { useModal } from "@/components/ui/custom-dialog-provider";
import { getMonthName } from "@/lib/constants";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function CreditPixPage() {
  const { showAlert } = useModal();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CreditPixOverviewData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedOpId, setExpandedOpId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await getCreditPixOverviewAction();
      setData(res);
    } catch (err) {
      console.error("Erro ao carregar operações de PIX no Crédito:", err);
      showAlert("Erro ao carregar operações de PIX no Crédito.", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (operationId: string) => {
    const confirm = window.confirm(
      "Tem certeza que deseja excluir esta operação de PIX no Crédito? A entrada de dinheiro na conta e todas as parcelas geradas nas faturas do cartão serão removidas em cascata."
    );
    if (!confirm) return;

    setDeletingId(operationId);
    try {
      await deleteCreditPixOperationAction(operationId);
      showAlert("Operação de PIX no Crédito excluída com sucesso.", { variant: "success" });
      await loadData();
    } catch (err: any) {
      console.error(err);
      showAlert(err.message || "Erro ao excluir operação.", { variant: "error" });
    } finally {
      setDeletingId(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedOpId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto flex flex-col gap-6 md:gap-8 select-none relative font-sans text-slate-900 dark:text-white">
      {/* ── 1. CABEÇALHO DA PÁGINA ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <div className="p-2 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400">
                <Zap className="w-6 h-6" />
              </div>
              PIX no Crédito
            </h1>
            <span className="bg-purple-50 dark:bg-purple-950/60 border border-purple-200/60 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              GESTÃO DE LIQUIDEZ
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Controle de liquidez captada via cartão, custo financeiro de juros e cronograma de parcelamento em faturas.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-5 py-3 rounded-2xl font-extrabold text-xs tracking-wider shadow-lg shadow-purple-600/30 transition-all hover:scale-[1.02] border border-white/10 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Novo PIX no Crédito
        </button>
      </div>

      {/* ── 2. CARDS DE MÉTRICAS CONSOLIDADAS (GRID 4 COLUNAS NIVELADO) ───── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-36 bg-white dark:bg-[#131B2E] rounded-3xl border border-slate-200 dark:border-slate-800 animate-pulse p-6"
            />
          ))}
        </div>
      ) : (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
          {/* Card 1: Total Líquido Captado */}
          <div className="flex flex-col justify-between h-full p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="flex items-start justify-between min-h-[44px] gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-snug">
                Total Líquido Captado
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>

            <div className="py-2 my-auto flex items-center">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 font-tnum tabular-nums">
                {brl(data?.totalNet || 0)}
              </span>
            </div>

            <div className="min-h-[38px] flex items-center mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 w-full overflow-hidden">
              <span className="text-[11px] leading-tight font-extrabold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1.5 rounded-xl inline-flex items-center gap-1.5 shadow-2xs max-w-full overflow-hidden truncate">
                <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">Dinheiro creditado nas contas</span>
              </span>
            </div>
          </div>

          {/* Card 2: Custo Total de Juros/Taxas */}
          <div className="flex flex-col justify-between h-full p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="flex items-start justify-between min-h-[44px] gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-snug">
                Custo de Juros / Encargos
              </span>
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                <Percent className="w-4 h-4" />
              </div>
            </div>

            <div className="py-2 my-auto flex items-center">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-amber-600 dark:text-amber-400 font-tnum tabular-nums">
                +{brl(data?.totalFees || 0)}
              </span>
            </div>

            <div className="min-h-[38px] flex items-center mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 w-full overflow-hidden">
              <span className="text-[11px] leading-tight font-extrabold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-1.5 rounded-xl inline-flex items-center gap-1.5 shadow-2xs max-w-full overflow-hidden truncate">
                <TrendingUp className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">Diferença total de juros contratada</span>
              </span>
            </div>
          </div>

          {/* Card 3: Total a Pagar em Faturas */}
          <div className="flex flex-col justify-between h-full p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="flex items-start justify-between min-h-[44px] gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-snug">
                Total a Pagar em Faturas
              </span>
              <div className="p-2 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>

            <div className="py-2 my-auto flex items-center">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-purple-600 dark:text-purple-400 font-tnum tabular-nums">
                {brl(data?.totalDebt || 0)}
              </span>
            </div>

            <div className="min-h-[38px] flex items-center mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 w-full overflow-hidden">
              <span className="text-[11px] leading-tight font-extrabold text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2.5 py-1.5 rounded-xl inline-flex items-center gap-1.5 shadow-2xs max-w-full overflow-hidden truncate">
                <CreditCard className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span className="truncate">Soma de todas as parcelas</span>
              </span>
            </div>
          </div>

          {/* Card 4: Progresso de Amortização */}
          <div className="flex flex-col justify-between h-full p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="flex items-start justify-between min-h-[44px] gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-snug">
                Amortização de Parcelas
              </span>
              <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>

            <div className="py-2 my-auto flex items-center justify-between">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white font-tnum tabular-nums">
                {data?.paidInstallments || 0} / {data?.totalInstallments || 0}
              </span>
              <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 font-tnum tabular-nums">
                {data?.amortizationPct || 0}%
              </span>
            </div>

            <div className="min-h-[38px] flex flex-col justify-center gap-1.5 mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 w-full">
              <div className="w-full bg-slate-100 dark:bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, data?.amortizationPct || 0)}%` }}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── 3. TABELA DE OPERAÇÕES ────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col gap-4">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-500" />
              Operações de PIX no Crédito ({data?.operations.length || 0})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              Histórico de liquidez captada e cronograma de parcelas vinculadas às faturas.
            </p>
          </div>
        </div>

        {data?.operations.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
            <div className="p-4 rounded-3xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Zap className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Nenhuma operação de PIX no Crédito registrada
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
              Quando você contrata um PIX parcelado no cartão, o dinheiro entra na sua conta e as parcelas futuras são programadas automaticamente nas faturas.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="mt-2 flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg shadow-purple-600/30"
            >
              <Plus className="w-4 h-4" />
              Criar Primeiro PIX no Crédito
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-extrabold tracking-wider">
                  <th className="py-3 px-3">Data</th>
                  <th className="py-3 px-3">Origem (Cartão)</th>
                  <th className="py-3 px-3">Destino (Conta)</th>
                  <th className="py-3 px-3 text-right">Valor Líquido</th>
                  <th className="py-3 px-3">Condição</th>
                  <th className="py-3 px-3 text-right">Juros / Taxas</th>
                  <th className="py-3 px-3 text-right">Total Fatura</th>
                  <th className="py-3 px-3 text-center">Status / Progresso</th>
                  <th className="py-3 px-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {data?.operations.map((op: CreditPixOperationItem) => {
                  const isExpanded = expandedOpId === op.id;
                  const isCompleted = op.paidInstallmentsCount >= op.installmentsCount;

                  return (
                    <React.Fragment key={op.id}>
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                        {/* Data */}
                        <td className="py-3.5 px-3 font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {op.operationDateFormatted}
                        </td>

                        {/* Cartão de Origem */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <div className="p-1.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-400 shrink-0">
                              <CreditCard className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white leading-tight">
                                {op.sourceCard.title}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono">
                                {op.sourceCard.lastDigits}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Conta Destino */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <div className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
                              <Building2 className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {op.destAccount.title}
                            </span>
                          </div>
                        </td>

                        {/* Valor Líquido Recebido */}
                        <td className="py-3.5 px-3 text-right">
                          <span className="font-black text-emerald-600 dark:text-emerald-400 font-tnum tabular-nums text-sm">
                            {brl(op.netAmount)}
                          </span>
                        </td>

                        {/* Condição de Pagamento */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className="font-extrabold text-slate-800 dark:text-slate-200">
                            {op.installmentsCount}x de {brl(op.installmentAmount)}
                          </span>
                        </td>

                        {/* Custo de Juros / Taxas */}
                        <td className="py-3.5 px-3 text-right whitespace-nowrap">
                          <div className="flex flex-col items-end">
                            <span className="font-bold text-amber-600 dark:text-amber-400 font-tnum tabular-nums">
                              +{brl(op.feeAmount)}
                            </span>
                            <span className="text-[10px] font-extrabold text-amber-500/80">
                              {op.feePercentage}%
                            </span>
                          </div>
                        </td>

                        {/* Total da Fatura */}
                        <td className="py-3.5 px-3 text-right">
                          <span className="font-black text-purple-600 dark:text-purple-300 font-tnum tabular-nums text-sm">
                            {brl(op.totalAmount)}
                          </span>
                        </td>

                        {/* Status / Progresso */}
                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                              isCompleted
                                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                                : "bg-purple-500/15 border-purple-500/30 text-purple-300"
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Clock className="w-3 h-3 text-purple-400" />
                            )}
                            {isCompleted
                              ? "Concluído"
                              : `${op.paidInstallmentsCount}/${op.installmentsCount} Pagas`}
                          </span>
                        </td>

                        {/* Ações */}
                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => toggleExpand(op.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                              title={isExpanded ? "Ocultar parcelas" : "Ver cronograma de parcelas"}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDelete(op.id)}
                              disabled={deletingId === op.id}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-50"
                              title="Excluir operação (reverte conta e cartão)"
                            >
                              {deletingId === op.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Linha Expandida: Cronograma de Parcelas */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70 dark:bg-[#0b101c]">
                          <td colSpan={9} className="p-4 sm:p-5">
                            <div className="space-y-3 rounded-2xl bg-slate-900/40 border border-slate-800/80 p-4">
                              <div className="flex items-center justify-between text-xs font-bold text-slate-400 border-b border-slate-800/60 pb-2">
                                <span className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                                  Cronograma de Amortização das Parcelas na Fatura
                                </span>
                                <span>{op.installments.length} parcelas</span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-1">
                                {op.installments.map((inst) => {
                                  const isPaid = inst.isPaid;
                                  const isLate = inst.status === "Atrasada";

                                  let cardBadgeStyle = "bg-slate-800 text-slate-400 border-slate-700";
                                  let borderColor = "border-slate-800";

                                  if (isPaid) {
                                    cardBadgeStyle = "bg-emerald-500/15 border-emerald-500/30 text-emerald-400";
                                    borderColor = "border-emerald-500/20";
                                  } else if (isLate) {
                                    cardBadgeStyle = "bg-rose-500/15 border-rose-500/30 text-rose-400";
                                    borderColor = "border-rose-500/30";
                                  }

                                  return (
                                    <div
                                      key={inst.installmentNumber}
                                      className={`p-3 rounded-xl bg-slate-950/70 border ${borderColor} flex flex-col justify-between gap-2 shadow-xs`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-black text-white text-xs">
                                          Parcela {inst.installmentNumber}/{inst.installmentsCount}
                                        </span>
                                        <span
                                          className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${cardBadgeStyle}`}
                                        >
                                          {inst.status}
                                        </span>
                                      </div>

                                      <div className="flex justify-between items-baseline">
                                        <span className="text-[10px] text-slate-400 font-medium">
                                          Fatura: {getMonthName(inst.billingMonth)}/{inst.billingYear}
                                        </span>
                                        <span className="font-extrabold text-white text-xs tabular-nums">
                                          {brl(inst.amount)}
                                        </span>
                                      </div>

                                      <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-800/60 flex items-center justify-between">
                                        <span>Vencimento:</span>
                                        <strong className="text-slate-400">{inst.dueDateStr}</strong>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 4. MODAL NOVO PIX NO CRÉDITO ─────────────────────────────────── */}
      <NewCreditPixModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          loadData();
          showAlert("Operação de PIX no Crédito lançada com sucesso!", { variant: "success" });
        }}
      />
    </div>
  );
}
