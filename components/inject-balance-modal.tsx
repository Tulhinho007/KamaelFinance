"use client";

import React, { useState, useEffect } from "react";
import { X, ArrowDownCircle, ArrowUpCircle, Wallet, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { recordBalanceMovementAction } from "@/lib/actions";
import { useModal } from "@/components/ui/custom-dialog-provider";

export type BalanceMovementOrigin =
  | "DEPOSITO"
  | "SAQUE"
  | "SALARIO"
  | "RECARGA"
  | "FREELANCE"
  | "INVESTIMENTO"
  | "APORTE"
  | "ROLLOVER";

interface InjectBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  walletId: string;
  walletTitle?: string;
  defaultMonth?: number;
  defaultYear?: number;
  defaultOrigin?: BalanceMovementOrigin;
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function InjectBalanceModal({
  isOpen,
  onClose,
  onSuccess,
  walletId,
  walletTitle,
  defaultMonth,
  defaultYear,
  defaultOrigin = "DEPOSITO",
}: InjectBalanceModalProps) {
  const { showAlert } = useModal();
  const currentDate = new Date();
  
  const [amount, setAmount] = useState<number | "">("");
  const [origin, setOrigin] = useState<BalanceMovementOrigin>(defaultOrigin);
  const [month, setMonth] = useState<number>(defaultMonth || currentDate.getMonth() + 1);
  const [year, setYear] = useState<number>(defaultYear || currentDate.getFullYear());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount("");
      setOrigin(defaultOrigin);
      setMonth(defaultMonth || new Date().getMonth() + 1);
      setYear(defaultYear || new Date().getFullYear());
      setLoading(false);
    }
  }, [isOpen, defaultMonth, defaultYear, defaultOrigin]);

  if (!isOpen) return null;

  const isSaque = origin === "SAQUE";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount === "" || isNaN(Number(amount)) || Number(amount) <= 0) {
      showAlert("Por favor, informe um valor válido maior que zero.", { variant: "warning" });
      return;
    }
    if (!walletId) {
      showAlert("Carteira ou conta não identificada.", { variant: "error" });
      return;
    }

    setLoading(true);
    try {
      await recordBalanceMovementAction(
        walletId,
        Number(amount),
        origin,
        month,
        year
      );

      const successMsg = isSaque
        ? "Saque registrado com sucesso! O valor foi subtraído do saldo."
        : "Saldo/Entrada adicionado com sucesso!";

      showAlert(successMsg, { variant: "success" });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Erro ao registrar movimentação de saldo:", err);
      showAlert(err?.message || "Erro ao processar a movimentação de saldo.", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 max-w-md w-full animate-in zoom-in-95 duration-200">
        
        {/* Cabeçalho */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              isSaque ? "bg-rose-50 text-rose-600" : "bg-indigo-50 text-indigo-600"
            }`}>
              {isSaque ? (
                <ArrowDownRight className="w-5 h-5" />
              ) : (
                <ArrowUpRight className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-slate-800 font-bold text-lg leading-snug">
                {isSaque ? "Realizar Saque / Retirada" : "Injetar Saldo / Capital"}
              </h3>
              <p className="text-xs text-slate-400">
                {walletTitle ? `${walletTitle} • ` : ""}Informe o valor, o tipo e a competência.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* Valor */}
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
              {isSaque ? "Valor do Saque (R$) *" : "Valor da Entrada (R$) *"}
            </label>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="0,00"
              className="bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all w-full font-medium"
            />
          </div>

          {/* Origem da Entrada / Tipo de Movimentação */}
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
              Origem da Entrada / Tipo de Movimentação *
            </label>
            <select
              value={origin}
              onChange={e => setOrigin(e.target.value as BalanceMovementOrigin)}
              className="bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all w-full cursor-pointer font-medium"
            >
              <optgroup label="Movimentações em Conta">
                <option value="DEPOSITO">DEPÓSITO (Depósito em Conta)</option>
                <option value="SAQUE">SAQUE (Saque em Dinheiro / Débito)</option>
              </optgroup>
              <optgroup label="Entradas de Capital">
                <option value="SALARIO">Injeção de Capital / Salário</option>
                <option value="RECARGA">Recarga de Saldo</option>
                <option value="FREELANCE">Renda Extra / Freelance</option>
                <option value="INVESTIMENTO">Resgate de Investimento</option>
                <option value="APORTE">Outra Fonte / Aporte Direto</option>
                <option value="ROLLOVER">Saldo do Mês Anterior</option>
              </optgroup>
            </select>
            {isSaque && (
              <p className="text-[11px] text-rose-500 font-semibold mt-1 flex items-center gap-1">
                ⚠️ O valor será subtraído do saldo disponível da conta como saída.
              </p>
            )}
          </div>

          {/* Competência (Mês / Ano) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                Mês de Aplicação
              </label>
              <select
                value={month}
                onChange={e => setMonth(Number(e.target.value))}
                className="bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all w-full cursor-pointer font-medium"
              >
                {MONTH_NAMES.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                Ano de Aplicação
              </label>
              <select
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                className="bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all w-full cursor-pointer font-medium"
              >
                {Array.from({ length: 11 }, (_, i) => 2020 + i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Rodapé / Botões de Ação */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 mt-2">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-2.5 rounded-xl text-white font-semibold text-sm shadow-sm transition-colors cursor-pointer disabled:opacity-50 ${
                isSaque
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {loading ? "Processando..." : (isSaque ? "Confirmar Saque" : "Confirmar Entrada")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
