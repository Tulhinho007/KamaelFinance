"use client";

import React, { useState, useEffect } from "react";
import { X, ArrowUpRight, Wallet, Calendar, Tag, Check, Loader2, DollarSign } from "lucide-react";
import { getAllWalletsSimple } from "@/lib/actions";
import { convertItemToExpenseAction } from "@/lib/planning-actions";
import { useModal } from "@/components/ui/custom-dialog-provider";

type SimpleWallet = {
  id: string;
  title: string;
  walletType: string;
};

interface ConvertToExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  item: {
    id: string;
    description: string;
    maxAmount: number;
    minAmount?: number | null;
    paidAmount?: number | null;
  } | null;
}

export function ConvertToExpenseModal({
  isOpen,
  onClose,
  onSuccess,
  item,
}: ConvertToExpenseModalProps) {
  const { showAlert } = useModal();
  const [wallets, setWallets] = useState<SimpleWallet[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState("");
  const [category, setCategory] = useState("Lazer");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [actualPaidAmount, setActualPaidAmount] = useState<number | "">("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      const initialPaid = (item.paidAmount && item.paidAmount > 0) 
        ? item.paidAmount 
        : item.maxAmount;
      setActualPaidAmount(initialPaid);

      getAllWalletsSimple()
        .then(data => {
          setWallets(data);
          if (data.length > 0 && !selectedWalletId) {
            setSelectedWalletId(data[0].id);
          }
        })
        .catch(console.error);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWalletId) {
      showAlert("Por favor, selecione a conta ou cartão para o lançamento.", { variant: "warning" });
      return;
    }

    const finalAmount = Number(actualPaidAmount || item.maxAmount);
    if (finalAmount <= 0) {
      showAlert("Informe um valor real pago válido.", { variant: "warning" });
      return;
    }

    setLoading(true);
    try {
      await convertItemToExpenseAction(item.id, selectedWalletId, category, date, finalAmount);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      showAlert("Erro ao converter item em despesa. Tente novamente.", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden text-slate-900 dark:text-slate-100">
        
        {/* Header do Modal */}
        <div className="flex justify-between items-center px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-sm">
              <ArrowUpRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Converter em Despesa Real
              </h3>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Lançar o item no extrato/fluxo de caixa principal
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Resumo do Item */}
        <div className="p-6 pb-0">
          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{item.description}</p>
              <p className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 mt-0.5">Item do Planejamento</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold block text-[10px]">Estimativa Máxima</span>
              <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                {item.maxAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          
          {/* Valor Real Pago */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
              <span>Valor Real Pago (R$) *</span>
            </label>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={actualPaidAmount}
              onChange={e => setActualPaidAmount(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="0.00"
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-extrabold text-emerald-600 dark:text-emerald-400 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm"
            />
          </div>

          {/* Seletor de Conta */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-indigo-500" />
              <span>Conta / Cartão de Débito *</span>
            </label>
            <select
              required
              value={selectedWalletId}
              onChange={e => setSelectedWalletId(e.target.value)}
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm cursor-pointer"
            >
              <option value="" disabled className="bg-white dark:bg-slate-900 text-slate-400">
                -- Selecione a conta de saída --
              </option>
              {wallets.map(w => (
                <option key={w.id} value={w.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  {w.title} ({w.walletType === "CREDIT_CARD" ? "Cartão de Crédito" : w.walletType === "TICKET" ? "VA/VR" : "Conta Corrente"})
                </option>
              ))}
            </select>
          </div>

          {/* Categoria */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-indigo-500" />
              <span>Categoria da Despesa</span>
            </label>
            <input
              type="text"
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="Ex: Lazer, Viagem, Hospedagem"
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
            />
          </div>

          {/* Data */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span>Data do Lançamento</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:light] dark:[color-scheme:dark] transition-all shadow-sm"
            />
          </div>

          {/* Botão Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-extrabold text-xs tracking-wider shadow-lg shadow-indigo-600/30 transition-all mt-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 uppercase"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Lançando Despesa...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Confirmar & Marcar como Pago</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
