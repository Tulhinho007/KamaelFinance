"use client";

import React, { useState } from "react";
import {
  X,
  CreditCard,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  Percent,
  TrendingDown,
  ArrowRight,
  Calculator,
  ShieldAlert,
  Sliders,
  DollarSign,
  Layers,
} from "lucide-react";
import { CreditPixOperationItem } from "@/lib/credit-pix-actions";
import { getMonthName } from "@/lib/constants";

interface CreditPixDetailsModalProps {
  operation: CreditPixOperationItem | null;
  isOpen: boolean;
  onClose: () => void;
}

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CreditPixDetailsModal({
  operation,
  isOpen,
  onClose,
}: CreditPixDetailsModalProps) {
  if (!isOpen || !operation) return null;

  const {
    sourceCard,
    destAccount,
    netAmount,
    totalAmount,
    feeAmount,
    feePercentage,
    installmentsCount,
    installmentAmount,
    operationDateFormatted,
    installments,
    paidInstallmentsCount,
    description,
  } = operation;

  // Parcelas restantes a pagar
  const remainingInstallments = installments.filter((inst) => !inst.isPaid);
  const remainingCount = remainingInstallments.length;
  const nominalRemainingDebt = remainingCount * installmentAmount;

  // Estado do simulador de quitação
  const [simulateCount, setSimulateCount] = useState<number>(remainingCount || 1);

  // Cálculo financeiro aproximado de amortização / antecipação com desconto de juros
  // Taxa mensal estimada da operação
  const monthlyRate =
    netAmount > 0 && installmentsCount > 0 && totalAmount > netAmount
      ? Math.pow(totalAmount / netAmount, 1 / installmentsCount) - 1
      : 0.02;

  // Valor presente das N parcelas antecipadas trazidas a valor presente
  // VP = Parcela / (1 + i)^t
  const nominalToAnticipate = simulateCount * installmentAmount;
  let discountedPresentValue = 0;
  for (let t = 1; t <= simulateCount; t++) {
    discountedPresentValue += installmentAmount / Math.pow(1 + monthlyRate, t);
  }
  discountedPresentValue = Math.round(discountedPresentValue * 100) / 100;
  const estimatedSavings = Math.max(
    0,
    Math.round((nominalToAnticipate - discountedPresentValue) * 100) / 100
  );

  const amortizationProgress =
    installmentsCount > 0
      ? Math.round((paidInstallmentsCount / installmentsCount) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#111625] border border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Topo do Modal */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-purple-950/40 via-indigo-950/20 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-tight">
                  Cronograma & Detalhes do PIX no Crédito
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                  {operationDateFormatted}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Cartão {sourceCard?.title || "Origem"} ➔ Conta {destAccount?.title || "Destino"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* Card Resumo com Métricas Chave */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Valor Captado */}
            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Valor Captado (Líquido)
              </span>
              <span className="text-sm sm:text-base font-black text-emerald-400 tabular-nums">
                {brl(netAmount)}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Entrou na conta corrente
              </span>
            </div>

            {/* Total a Devolver */}
            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Total a Devolver
              </span>
              <span className="text-sm sm:text-base font-black text-white tabular-nums">
                {brl(totalAmount)}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {installmentsCount}x de {brl(installmentAmount)}
              </span>
            </div>

            {/* Custo de Juros / IOF */}
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 block">
                Custo de Juros / IOF
              </span>
              <span className="text-sm sm:text-base font-black text-rose-400 tabular-nums">
                - {brl(feeAmount)}
              </span>
              <span className="text-[10px] text-rose-400/80 block mt-0.5">
                Encargos bancários
              </span>
            </div>

            {/* CET e Taxa Mensal */}
            <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 block">
                C.E.T. Ponderado
              </span>
              <span className="text-sm sm:text-base font-black text-indigo-400 tabular-nums">
                {feePercentage}% total
              </span>
              <span className="text-[10px] text-indigo-300/80 block mt-0.5">
                ~{(monthlyRate * 100).toFixed(2)}% a.m.
              </span>
            </div>
          </div>

          {/* Barra de Progresso de Amortização */}
          <div className="p-4 rounded-2xl bg-[#0d121f] border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-purple-400" />
                Status de Amortização
              </span>
              <span className="font-black text-purple-300">
                {paidInstallmentsCount} de {installmentsCount} parcelas pagas ({amortizationProgress}%)
              </span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500 rounded-full"
                style={{ width: `${amortizationProgress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-1">
              <span>Saldo restante em aberto: <strong className="text-slate-300">{brl(nominalRemainingDebt)}</strong> ({remainingCount} parcelas)</span>
              <span>Já liquidado: <strong className="text-emerald-400">{brl(paidInstallmentsCount * installmentAmount)}</strong></span>
            </div>
          </div>

          {/* SIMULADOR INTERATIVO DE QUITAÇÃO ANTECIPADA */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#151c30] to-[#0d121f] border border-purple-500/25 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-500/20 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    Simulador de Quitação Antecipada
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Abatimento proporcional de juros futuros garantido por lei (CDC Art. 52)
                  </p>
                </div>
              </div>
              {remainingCount > 0 && (
                <button
                  type="button"
                  onClick={() => setSimulateCount(remainingCount)}
                  className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
                >
                  ⚡ Quitar 100% Agora
                </button>
              )}
            </div>

            {remainingCount === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Esta operação já está 100% quitada nas faturas do cartão!</span>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <span>Quantas parcelas deseja antecipar?</span>
                    <span className="text-purple-400 font-black">
                      {simulateCount} de {remainingCount} parcelas
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={remainingCount}
                    value={simulateCount}
                    onChange={(e) => setSimulateCount(Number(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Valor Bruto Nominal
                    </span>
                    <span className="text-sm font-black text-slate-300 tabular-nums">
                      {brl(nominalToAnticipate)}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Sem desconto
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-[10px] font-bold text-emerald-300 uppercase block">
                      Economia Estimada (Juros)
                    </span>
                    <span className="text-sm font-black text-emerald-400 tabular-nums">
                      {estimatedSavings > 0 ? `-${brl(estimatedSavings)}` : "R$ 0,00"}
                    </span>
                    <span className="text-[10px] text-emerald-400/80 block">
                      Juros futuros abatidos
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-purple-500/15 border border-purple-500/30">
                    <span className="text-[10px] font-bold text-purple-300 uppercase block">
                      Valor com Desconto
                    </span>
                    <span className="text-sm sm:text-base font-black text-purple-300 tabular-nums">
                      {brl(discountedPresentValue)}
                    </span>
                    <span className="text-[10px] text-purple-400 block">
                      Valor para quitação hoje
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-start gap-2.5 text-[11px] text-slate-400">
                  <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>
                    Dica: Pelo Código de Defesa do Consumidor, ao antecipar parcelas no app do seu banco ou emissor do cartão ({sourceCard?.title}), você tem direito ao abatimento proporcional dos juros futuros.
                  </span>
                </div>
              </>
            )}
          </div>

          {/* RÉGUA DE PARCELAS (CRONOGRAMA DETALHADO) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" />
                Régua de Parcelas (Cronograma)
              </h3>
              <span className="text-xs text-slate-400 font-medium">
                {installments.length} parcelas registradas
              </span>
            </div>

            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-[#0d121f]">
              <div className="divide-y divide-slate-800/60">
                {installments.map((inst) => {
                  const isPaid = inst.isPaid;
                  return (
                    <div
                      key={inst.installmentNumber}
                      className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors ${
                        isPaid ? "bg-emerald-950/10 hover:bg-emerald-950/15" : "hover:bg-slate-800/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                            isPaid
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-slate-800 text-slate-300 border border-slate-700"
                          }`}
                        >
                          {String(inst.installmentNumber).padStart(2, "0")}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">
                              Parcela {inst.installmentNumber}/{inst.installmentsCount}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              • Competência: {getMonthName(inst.billingMonth)} / {inst.billingYear}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            Vencimento da fatura: <strong className="text-slate-300">{inst.dueDateStr}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-auto">
                        <span className="text-xs font-black text-white tabular-nums">
                          {brl(inst.amount)}
                        </span>

                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            PAGA / FATURA FECHADA
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                            <Clock className="w-3 h-3" />
                            A VENCER
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="p-4 border-t border-slate-800 bg-[#0d121f] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
