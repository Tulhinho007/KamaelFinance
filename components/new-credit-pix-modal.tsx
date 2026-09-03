"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Zap,
  CreditCard,
  Building2,
  Calendar,
  AlertCircle,
  TrendingUp,
  Percent,
  CheckCircle2,
  ArrowRight,
  Clock,
  Sparkles,
  Loader2,
} from "lucide-react";
import {
  getCreditPixOptionsAction,
  createCreditPixOperationAction,
} from "@/lib/credit-pix-actions";
import { getMonthName } from "@/lib/constants";

interface NewCreditPixModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function NewCreditPixModal({
  isOpen,
  onClose,
  onSuccess,
}: NewCreditPixModalProps) {
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [cards, setCards] = useState<
    Array<{
      id: string;
      title: string;
      bankName: string;
      limit: number;
      vencimento: number;
      diaFechamento: number;
    }>
  >([]);
  const [accounts, setAccounts] = useState<
    Array<{ id: string; title: string; bankName: string }>
  >([]);

  const todayStr = new Date().toISOString().split("T")[0];
  const curMonth = new Date().getMonth() + 1;
  const curYear = new Date().getFullYear();

  // Campos do formulário
  const [sourceCardWalletId, setSourceCardWalletId] = useState("");
  const [destAccountWalletId, setDestAccountWalletId] = useState("");
  const [netAmount, setNetAmount] = useState<number | "">("");
  const [installmentsCount, setInstallmentsCount] = useState<number>(5);
  const [installmentAmount, setInstallmentAmount] = useState<number | "">("");
  const [operationDate, setOperationDate] = useState(todayStr);
  const [firstBillingMonth, setFirstBillingMonth] = useState<number>(
    curMonth === 12 ? 1 : curMonth + 1
  );
  const [firstBillingYear, setFirstBillingYear] = useState<number>(
    curMonth === 12 ? curYear + 1 : curYear
  );
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    setErrorMsg(null);
    setLoadingOptions(true);

    getCreditPixOptionsAction()
      .then((opts) => {
        setCards(opts.creditCards);
        setAccounts(opts.bankAccounts);
        if (opts.creditCards.length > 0 && !sourceCardWalletId) {
          setSourceCardWalletId(opts.creditCards[0].id);
        }
        if (opts.bankAccounts.length > 0 && !destAccountWalletId) {
          setDestAccountWalletId(opts.bankAccounts[0].id);
        }
        setLoadingOptions(false);
      })
      .catch((err) => {
        console.error("Erro ao carregar opções para PIX no Crédito:", err);
        setErrorMsg("Erro ao carregar cartões e contas disponíveis.");
        setLoadingOptions(false);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  // Cálculos dinâmicos em tempo real
  const numNet = Number(netAmount) || 0;
  const numInstCount = Number(installmentsCount) || 1;
  const numInstAmt = Number(installmentAmount) || 0;

  const totalAmount = Math.round(numInstCount * numInstAmt * 100) / 100;
  const feeAmount = Math.max(0, Math.round((totalAmount - numNet) * 100) / 100);
  const feePercentage =
    numNet > 0 ? Math.round((feeAmount / numNet) * 10000) / 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!sourceCardWalletId) {
      setErrorMsg("Selecione o cartão de crédito.");
      return;
    }
    if (!destAccountWalletId) {
      setErrorMsg("Selecione a conta corrente de destino.");
      return;
    }
    if (!numNet || numNet <= 0) {
      setErrorMsg("Informe o valor líquido a transferir.");
      return;
    }
    if (!numInstAmt || numInstAmt <= 0) {
      setErrorMsg("Informe o valor de cada parcela.");
      return;
    }

    setSubmitting(true);
    try {
      await createCreditPixOperationAction({
        sourceCardWalletId,
        destAccountWalletId,
        netAmount: numNet,
        installmentsCount: numInstCount,
        installmentAmount: numInstAmt,
        firstBillingMonth,
        firstBillingYear,
        operationDate,
        description: description.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Erro ao registrar operação de PIX no Crédito.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#111625] border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Topo do Modal */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-purple-950/40 via-indigo-950/20 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">
                Novo PIX no Crédito
              </h2>
              <p className="text-xs text-slate-400">
                Captação de liquidez via cartão com cronograma de parcelamento
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

        {/* Formulário com Scroll */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Seletores: Cartão de Origem e Conta Destino */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Cartão de Crédito */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-purple-400" />
                Cartão de Origem (Dívida)
              </label>
              <select
                value={sourceCardWalletId}
                onChange={(e) => setSourceCardWalletId(e.target.value)}
                disabled={loadingOptions || submitting}
                className="w-full bg-[#0d121f] border border-slate-700/80 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-purple-500 transition-colors cursor-pointer"
              >
                {cards.length === 0 && <option value="">Nenhum cartão cadastrado</option>}
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} (Venc. Dia {c.vencimento})
                  </option>
                ))}
              </select>
            </div>

            {/* Conta Corrente Destino */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                Conta de Destino (Liquidez)
              </label>
              <select
                value={destAccountWalletId}
                onChange={(e) => setDestAccountWalletId(e.target.value)}
                disabled={loadingOptions || submitting}
                className="w-full bg-[#0d121f] border border-slate-700/80 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
              >
                {accounts.length === 0 && <option value="">Nenhuma conta cadastrada</option>}
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Valores: Valor Líquido, Parcelas e Valor da Parcela */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Valor Líquido Transferido */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Valor Líquido (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-400">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  value={netAmount}
                  onChange={(e) => setNetAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  disabled={submitting}
                  className="w-full bg-[#0d121f] border border-slate-700/80 rounded-2xl pl-9 pr-3.5 py-2.5 text-xs font-black text-emerald-400 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                Dinheiro que entra na conta
              </p>
            </div>

            {/* Quantidade de Parcelas */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Nº de Parcelas
              </label>
              <select
                value={installmentsCount}
                onChange={(e) => setInstallmentsCount(Number(e.target.value))}
                disabled={submitting}
                className="w-full bg-[#0d121f] border border-slate-700/80 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
              >
                {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}x {n === 1 ? "(À vista na fatura)" : "meses"}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 font-medium">
                Meses de amortização
              </p>
            </div>

            {/* Valor de Cada Parcela */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Valor por Parcela (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-purple-400">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  value={installmentAmount}
                  onChange={(e) => setInstallmentAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  disabled={submitting}
                  className="w-full bg-[#0d121f] border border-slate-700/80 rounded-2xl pl-9 pr-3.5 py-2.5 text-xs font-black text-purple-400 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                Cobrado em cada fatura
              </p>
            </div>
          </div>

          {/* BOX DE CÁLCULO DINÂMICO EM TEMPO REAL */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#161d31] to-[#0d121f] border border-purple-500/20 shadow-inner space-y-3">
            <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-purple-300">
              <span className="flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-purple-400" />
                Resumo e Custo Efetivo da Operação
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Cálculo em Tempo Real
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 block">Total a Pagar</span>
                <span className="text-sm font-black text-white tabular-nums">
                  {brl(totalAmount)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-[10px] font-bold text-amber-300 block">Juros / Taxas</span>
                <span className="text-sm font-black text-amber-400 tabular-nums">
                  +{brl(feeAmount)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <span className="text-[10px] font-bold text-purple-300 block">Taxa Efetiva</span>
                <span className="text-sm font-black text-purple-400 tabular-nums">
                  {feePercentage}%
                </span>
              </div>
            </div>
          </div>

          {/* Datas: Data da Transação e Mês/Ano da 1ª Fatura de Cobrança */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Data da Operação */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                Data da Transferência
              </label>
              <input
                type="date"
                value={operationDate}
                onChange={(e) => setOperationDate(e.target.value)}
                disabled={submitting}
                className="w-full bg-[#0d121f] border border-slate-700/80 rounded-2xl px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Mês da 1ª Fatura */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                Mês da 1ª Fatura
              </label>
              <select
                value={firstBillingMonth}
                onChange={(e) => setFirstBillingMonth(Number(e.target.value))}
                disabled={submitting}
                className="w-full bg-[#0d121f] border border-slate-700/80 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {getMonthName(m)}
                  </option>
                ))}
              </select>
            </div>

            {/* Ano da 1ª Fatura */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Ano da 1ª Fatura
              </label>
              <select
                value={firstBillingYear}
                onChange={(e) => setFirstBillingYear(Number(e.target.value))}
                disabled={submitting}
                className="w-full bg-[#0d121f] border border-slate-700/80 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
              >
                {[2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Observação / Descrição */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Observações (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Liquidez temporária para investimento ou emergência"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
              className="w-full bg-[#0d121f] border border-slate-700/80 rounded-2xl px-3.5 py-2 text-xs font-medium text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          {/* Rodapé do Modal com Botões de Ação */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-xs font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || loadingOptions}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-6 py-2.5 rounded-xl font-extrabold text-xs tracking-wider shadow-lg shadow-purple-600/30 transition-all hover:scale-[1.02] disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmar Operação
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
