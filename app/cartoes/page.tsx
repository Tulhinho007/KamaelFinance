"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { CreditCard, Calendar, Plus, ChevronRight, CheckCircle2, Clock, Zap, ArrowLeft, ShieldCheck, AlertCircle } from "lucide-react";
import { PeriodHeader } from "@/components/period-header";
import { usePeriod } from "@/components/period-context";
import { getAllCardsOverview } from "@/lib/actions";
import { NewPurchaseModal } from "@/components/new-purchase-modal";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function CartoesPage() {
  const { selectedMonth, selectedYear } = usePeriod();

  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);

  const loadCards = async () => {
    setLoading(true);
    try {
      const all = await getAllCardsOverview(selectedMonth, selectedYear);
      setCards(all.filter((c: any) => c.walletType === "CREDIT_CARD"));
    } catch (err) {
      console.error("Erro ao carregar cartões:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCards();
  }, [selectedMonth, selectedYear]);

  const totalCreditLimit = cards.reduce((s, c) => s + c.limitTotal, 0);
  const totalAvailable = cards.reduce((s, c) => s + (c.limitTotal - c.limitUsed), 0);
  const totalInvoices = cards.reduce((s, c) => s + c.faturaAtual, 0);

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto flex flex-col gap-8 select-none relative font-sans text-slate-900">
      
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-600 hover:text-indigo-700 w-fit transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para o Dashboard
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <PeriodHeader
            title="Painel de Cartões de Crédito"
            tagline="Gestão centralizada de limites, faturas, melhor dia de compra e datas de fechamento."
          />
          <button
            onClick={() => setPurchaseModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl font-extrabold text-xs tracking-wider shadow-lg shadow-indigo-600/25 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + Nova Compra no Cartão
          </button>
        </div>
      </div>

      {/* KPI Cards de Cartões de Crédito */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-[28px] border border-white/80 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.03)] relative overflow-hidden">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Limite Consolidado</span>
          <p className="text-2xl font-black text-slate-800 tracking-tight mt-1">{brl(totalCreditLimit)}</p>
          <span className="mt-2 inline-flex items-center gap-1 text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
            <ShieldCheck className="w-3 h-3 text-indigo-500" /> Soma de {cards.length} cartão(ões)
          </span>
        </div>

        <div className="bg-white rounded-[28px] border border-white/80 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.03)] relative overflow-hidden">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Limite Disponível</span>
          <p className={`text-2xl font-black tracking-tight mt-1 ${totalAvailable < 0 ? "text-rose-500" : "text-emerald-500"}`}>
            {brl(totalAvailable)}
          </p>
          <span className="mt-2 inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Livre para novas compras
          </span>
        </div>

        <div className="bg-white rounded-[28px] border border-white/80 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.03)] relative overflow-hidden">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Total em Faturas (Mês)</span>
          <p className="text-2xl font-black text-rose-500 tracking-tight mt-1">{brl(totalInvoices)}</p>
          <span className="mt-2 inline-flex items-center gap-1 text-[9px] font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full">
            <Clock className="w-3 h-3 text-rose-500" /> Comprometido no período
          </span>
        </div>
      </section>

      {/* Grid de Cartões de Crédito */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
          Meus Cartões de Crédito
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="h-56 bg-slate-100 rounded-3xl animate-pulse" />
            <div className="h-56 bg-slate-100 rounded-3xl animate-pulse" />
          </div>
        ) : cards.length === 0 ? (
          <div className="py-16 text-center border border-slate-200 rounded-3xl bg-white flex flex-col items-center justify-center gap-3">
            <CreditCard className="w-10 h-10 text-slate-300" />
            <p className="text-xs font-bold text-slate-500">Nenhum cartão de crédito cadastrado.</p>
            <Link href="/despesas" className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-xs">
              Cadastrar Novo Cartão
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {cards.map(card => {
              const available = card.limitTotal - card.limitUsed;
              const usagePct = card.limitTotal > 0 ? Math.min(100, Math.round((card.limitUsed / card.limitTotal) * 100)) : 0;
              const fechamento = card.diaFechamento || 1;
              const melhorDia = card.melhorDiaCompra || (fechamento % 31) + 1;

              return (
                <div key={card.id} className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between gap-5 relative overflow-hidden group hover:shadow-md transition-all">
                  
                  {/* Top Bar do Card */}
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold text-slate-900">{card.title}</h3>
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                          {card.bankName}
                        </span>
                      </div>
                      {card.holder && (
                        <p className="text-xs font-semibold text-slate-400 mt-0.5">Titular: {card.holder}</p>
                      )}
                    </div>

                    <Link
                      href={`/cartoes/${card.id}`}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1"
                    >
                      <span>Ver Fatura</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Métricas de Limite & Fatura */}
                  <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Limite Total</span>
                      <p className="font-extrabold text-slate-900 font-tnum tabular-nums mt-0.5">{brl(card.limitTotal)}</p>
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Disponível</span>
                      <p className={`font-extrabold font-tnum tabular-nums mt-0.5 ${available < 0 ? "text-rose-500" : "text-emerald-600"}`}>
                        {brl(available)}
                      </p>
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Fatura Atual</span>
                      <p className="font-extrabold text-rose-500 font-tnum tabular-nums mt-0.5">{brl(card.faturaAtual)}</p>
                    </div>
                  </div>

                  {/* Datas de Fechamento & Melhor Dia de Compra */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-500" />
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fechamento</span>
                        <span className="font-bold text-slate-800">Dia {String(fechamento).padStart(2, "0")}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-emerald-500" />
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Melhor Dia</span>
                        <span className="font-extrabold text-emerald-600">Dia {String(melhorDia).padStart(2, "0")}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-500" />
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vencimento</span>
                        <span className="font-bold text-slate-800">Dia {String(card.vencimento || 10).padStart(2, "0")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Barra de progresso do limite */}
                  <div className="flex flex-col gap-1">
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${usagePct >= 90 ? "bg-rose-500" : usagePct >= 70 ? "bg-amber-500" : "bg-indigo-600"}`}
                        style={{ width: `${usagePct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] font-bold text-slate-400">
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

      {/* Modal Nova Compra */}
      <NewPurchaseModal
        isOpen={purchaseModalOpen}
        onClose={() => setPurchaseModalOpen(false)}
        onSuccess={loadCards}
      />

    </div>
  );
}

