"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CreditCard,
  Building2,
  Wallet,
  Receipt,
  Sparkles,
  CheckCircle2,
  Clock,
  Eye,
  ChevronLeft,
  ChevronRight,
  Filter
} from "lucide-react";
import { usePeriod } from "@/components/period-context";
import { getPaymentHistoryData } from "@/lib/actions";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function PaymentHistoryPage() {
  const { selectedMonth, selectedYear, prevMonth, nextMonth, goToCurrentMonth } = usePeriod();
  const [data, setData] = useState<Awaited<ReturnType<typeof getPaymentHistoryData>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("ALL");

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    getPaymentHistoryData(selectedMonth, selectedYear)
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Erro ao carregar histórico de pagamentos:", err);
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [selectedMonth, selectedYear]);

  const filteredItems = data?.items.filter((item) => {
    if (filterType === "ALL") return true;
    if (filterType === "CREDIT_CARD") return item.walletType === "CREDIT_CARD";
    if (filterType === "CONTA_CORRENTE") return item.walletType === "CONTA_CORRENTE";
    if (filterType === "TICKET") return item.walletType === "TICKET";
    return true;
  }) || [];

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-6xl mx-auto flex flex-col gap-6 md:gap-8 select-none relative">
      
      {/* ── 1. CABEÇALHO & NAVEGAÇÃO ────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-500 hover:text-indigo-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar para Dashboard
          </Link>

          {/* Seletor de Período Mensal */}
          <div className="flex items-center gap-2 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 p-1.5 rounded-2xl shadow-sm">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Mês Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-black text-slate-900 dark:text-white px-2 uppercase tracking-wider min-w-[120px] text-center">
              {data?.periodStr || "Carregando..."}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Próximo Mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={goToCurrentMonth}
              className="px-2.5 py-1 text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              MÊS ATUAL
            </button>
          </div>
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-indigo-500" /> Histórico de Pagamentos
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Visão consolidada de todas as faturas, contas de débito/PIX e benefícios liquidados no período.
          </p>
        </div>
      </div>

      {/* ── 2. CARDS DE MÉTRICAS DO TOPO (GRID 3 COLUNAS) ───────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-[#131B2E] rounded-2xl h-36 border border-slate-200 dark:border-slate-800 animate-pulse p-5" />
          ))}
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
          
          {/* Card 1: Total Gastos Pagos Crédito */}
          <div className="card-glow p-5 rounded-2xl bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-full shadow-sm">
            {/* Topo: Altura mínima fixa para nivelar títulos de 1 ou 2 linhas */}
            <div className="flex items-start justify-between min-h-[44px] gap-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider leading-snug">
                Total Gastos Pagos Crédito
              </span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>

            {/* Centro: Valor em destaque na mesma linha de base horizontal */}
            <div className="py-2 my-auto flex items-center">
              <h3 className="text-2xl md:text-3xl font-black text-purple-600 dark:text-purple-400 tabular-nums">
                {brl(data?.metrics.totalCreditPaid || 0)}
              </h3>
            </div>

            {/* Rodapé: Altura mínima padronizada e ancorado na base */}
            <div className="min-h-[38px] flex items-center mt-auto border-t border-slate-100 dark:border-slate-800/50 pt-2">
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Faturas de cartão quitadas no mês
              </p>
            </div>
          </div>

          {/* Card 2: Total Gastos Débito/PIX */}
          <div className="card-glow p-5 rounded-2xl bg-white dark:bg-[#131B2E] border border-emerald-200 dark:border-emerald-500/30 flex flex-col justify-between h-full shadow-sm">
            {/* Topo: Altura mínima fixa para nivelar títulos de 1 ou 2 linhas */}
            <div className="flex items-start justify-between min-h-[44px] gap-3">
              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider leading-snug">
                Total Gastos Débito/PIX
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
            </div>

            {/* Centro: Valor em destaque na mesma linha de base horizontal */}
            <div className="py-2 my-auto flex items-center">
              <h3 className="text-2xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                {brl(data?.metrics.totalDebitPix || 0)}
              </h3>
            </div>

            {/* Rodapé: Altura mínima padronizada e ancorado na base */}
            <div className="min-h-[38px] flex items-center mt-auto border-t border-slate-100 dark:border-slate-800/50 pt-2">
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Débitos e transações liquidadas no mês
              </p>
            </div>
          </div>

          {/* Card 3: Total Gastos Geral */}
          <div className="card-glow p-5 rounded-2xl bg-white dark:bg-[#131B2E] border border-indigo-200 dark:border-indigo-500/30 flex flex-col justify-between h-full shadow-sm">
            {/* Topo: Altura mínima fixa para nivelar títulos de 1 ou 2 linhas */}
            <div className="flex items-start justify-between min-h-[44px] gap-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider leading-snug">
                Total Gastos Geral
              </span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
            </div>

            {/* Centro: Valor em destaque na mesma linha de base horizontal */}
            <div className="py-2 my-auto flex items-center">
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tabular-nums">
                {brl(data?.metrics.totalGeral || 0)}
              </h3>
            </div>

            {/* Rodapé: Altura mínima padronizada e ancorado na base */}
            <div className="min-h-[38px] flex items-center mt-auto border-t border-slate-100 dark:border-slate-800/50 pt-2">
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Soma consolidada de saídas liquidadas
              </p>
            </div>
          </div>

        </section>
      )}

      {/* ── 3. TABELA CONSOLIDADA DE HISTÓRICO DE PAGAMENTOS ───────────────── */}
      <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Filter className="w-4 h-4 text-indigo-500" />
              Fontes de Pagamento Consolidadas ({filteredItems.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              Detalhamento por meio de pagamento no mês de {data?.periodStr}.
            </p>
          </div>

          {/* Filtros Rápidos */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {[
              { id: "ALL", label: "Todas" },
              { id: "CREDIT_CARD", label: "Crédito" },
              { id: "CONTA_CORRENTE", label: "Débito / PIX" },
              { id: "TICKET", label: "Benefício" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  filterType === f.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabela de Pagamentos */}
        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <p className="text-xs font-bold text-slate-400 animate-pulse">Carregando histórico de pagamentos...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-center">
            <Receipt className="w-8 h-8 text-slate-400" />
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Nenhum registro de pagamento encontrado para os filtros selecionados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  <th className="p-4">Tipo / Origem</th>
                  <th className="p-4">Identificação / Conta</th>
                  <th className="p-4">Período de Referência</th>
                  <th className="p-4 text-right">Total Gasto / Pago</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                {filteredItems.map((item) => {
                  const isCredit = item.walletType === "CREDIT_CARD";
                  const isTicket = item.walletType === "TICKET";
                  const Icon = isCredit ? CreditCard : isTicket ? Wallet : Building2;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800"
                    >
                      {/* Tipo / Origem */}
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-xl border ${
                            isCredit
                              ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                              : isTicket
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 dark:text-white block">{item.typeLabel}</span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              {isCredit ? "Cartão de Crédito" : isTicket ? "Cartão Benefício / VR" : "Conta Débito / PIX"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Identificação / Conta */}
                      <td className="p-4 font-bold text-slate-900 dark:text-white">
                        <div>
                          <span>{item.accountName}</span>
                          {item.cardBrand && (
                            <span className="ml-1.5 text-[10px] font-semibold text-slate-400">
                              ({item.cardBrand} {item.lastDigits ? `•••• ${item.lastDigits}` : ""})
                            </span>
                          )}
                          {item.holder && (
                            <span className="block text-[10px] text-slate-400 font-normal">
                              👤 {item.holder}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Período de Referência */}
                      <td className="p-4 font-semibold text-slate-600 dark:text-slate-300">
                        {item.periodRef}
                      </td>

                      {/* Total Gasto / Pago */}
                      <td className="p-4 text-right font-black text-sm tabular-nums text-slate-900 dark:text-white">
                        <div>{brl(item.amount)}</div>
                        {item.pendingAmount && item.pendingAmount > 0 ? (
                          <div className="text-[10px] font-semibold text-amber-500 dark:text-amber-400 mt-0.5">
                            {item.paidAmount && item.paidAmount > 0 ? (
                              <span>{brl(item.paidAmount)} baixado • {brl(item.pendingAmount)} pendente</span>
                            ) : (
                              <span>{brl(item.pendingAmount)} pendente</span>
                            )}
                          </div>
                        ) : null}
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center">
                        {item.statusColor === "emerald" ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-extrabold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {item.status}
                          </span>
                        ) : item.statusColor === "amber" ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-extrabold">
                            <Clock className="w-3.5 h-3.5" />
                            {item.status}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[11px] font-extrabold">
                            {item.walletType === "CREDIT_CARD" ? "FATURA ZERADA" : "SEM GASTOS"}
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="p-4 text-center">
                        <Link
                          href={item.detailsUrl}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-bold text-xs transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> Detalhes
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
}
