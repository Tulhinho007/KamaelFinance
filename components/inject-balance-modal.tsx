"use client";

import React, { useState, useEffect } from "react";
import { X, ArrowDownRight, ArrowUpRight, Building2 } from "lucide-react";
import { recordBankAccountMovementAction, getBankAccountsListAction } from "@/lib/actions";
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

export interface ContaBancariaOption {
  id: string;
  banco: string;
  saldo: number;
}

export interface InjectBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  walletId?: string;
  walletTitle?: string;
  tipoOperacao?: "ENTRADA" | "SAIDA";
  contasBancarias?: ContaBancariaOption[];
  defaultOrigin?: BalanceMovementOrigin | string;
  defaultMonth?: number;
  defaultYear?: number;
}

export function InjectBalanceModal({
  isOpen,
  onClose,
  onSuccess,
  walletId,
  walletTitle,
  tipoOperacao: initialTipoOperacao,
  contasBancarias: initialContasBancarias,
  defaultOrigin = "DEPOSITO",
}: InjectBalanceModalProps) {
  const { showAlert } = useModal();

  // Determinar se é ENTRADA ou SAÍDA
  const [tipoOperacao, setTipoOperacao] = useState<"ENTRADA" | "SAIDA">(
    initialTipoOperacao || (defaultOrigin === "SAQUE" ? "SAIDA" : "ENTRADA")
  );

  const [contas, setContas] = useState<ContaBancariaOption[]>(initialContasBancarias || []);
  const [contaId, setContaId] = useState<string>(walletId || "");
  const [valor, setValor] = useState<string>("");
  const [dataOperacao, setDataOperacao] = useState<string>(
    new Date().toLocaleDateString("en-CA") // Formato YYYY-MM-DD
  );
  const [descricao, setDescricao] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const operacao = initialTipoOperacao || (defaultOrigin === "SAQUE" ? "SAIDA" : "ENTRADA");
      setTipoOperacao(operacao);
      setValor("");
      setDataOperacao(new Date().toLocaleDateString("en-CA"));
      setDescricao("");
      setLoading(false);

      if (initialContasBancarias && initialContasBancarias.length > 0) {
        setContas(initialContasBancarias);
        if (walletId && initialContasBancarias.some((c) => c.id === walletId)) {
          setContaId(walletId);
        } else {
          setContaId(initialContasBancarias[0].id);
        }
      } else {
        // Busca as contas bancárias se não foram passadas como props
        getBankAccountsListAction()
          .then((list) => {
            if (list && list.length > 0) {
              setContas(list);
              if (walletId && list.some((c) => c.id === walletId)) {
                setContaId(walletId);
              } else {
                setContaId(list[0].id);
              }
            } else if (walletId) {
              setContas([{ id: walletId, banco: walletTitle || "Conta Corrente", saldo: 0 }]);
              setContaId(walletId);
            }
          })
          .catch((err) => {
            console.error("Erro ao carregar lista de contas bancárias:", err);
            if (walletId) {
              setContas([{ id: walletId, banco: walletTitle || "Conta Corrente", saldo: 0 }]);
              setContaId(walletId);
            }
          });
      }
    }
  }, [isOpen, walletId, walletTitle, initialTipoOperacao, defaultOrigin, initialContasBancarias]);

  if (!isOpen) return null;

  const handleSalvarMovimentacao = async (e: React.FormEvent) => {
    e.preventDefault();

    const valorNumerico = parseFloat(valor);
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      showAlert("Por favor, informe um valor válido maior que zero.", { variant: "warning" });
      return;
    }

    if (!contaId) {
      showAlert("Por favor, selecione a conta bancária.", { variant: "warning" });
      return;
    }

    if (!dataOperacao) {
      showAlert("Por favor, selecione a data da operação.", { variant: "warning" });
      return;
    }

    setLoading(true);
    try {
      await recordBankAccountMovementAction({
        contaId,
        valor: valorNumerico,
        dataOperacao,
        descricao: descricao.trim(),
        tipoOperacao,
      });

      const contaSelecionada = contas.find((c) => c.id === contaId);
      const nomeConta = contaSelecionada?.banco || "Conta";
      const valorFormatado = valorNumerico.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });

      const msg =
        tipoOperacao === "ENTRADA"
          ? `Entrada de ${valorFormatado} creditada na conta ${nomeConta} com sucesso!`
          : `Saída de ${valorFormatado} registrada na conta ${nomeConta} com sucesso!`;

      showAlert(msg, { variant: "success" });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Erro ao salvar movimentação bancária:", err);
      showAlert(err?.message || "Erro ao processar movimentação bancária.", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#131B2E] rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 max-w-md w-full animate-in zoom-in-95 duration-200">
        
        {/* Cabeçalho */}
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                tipoOperacao === "ENTRADA"
                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400"
              }`}
            >
              {tipoOperacao === "ENTRADA" ? (
                <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
              ) : (
                <ArrowDownRight className="w-5 h-5 stroke-[2.5]" />
              )}
            </div>
            <div>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg leading-snug">
                {tipoOperacao === "ENTRADA" ? "Adicionar Saldo / Entrada" : "Retirar Saldo / Saída"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tipoOperacao === "ENTRADA"
                  ? "Lançar crédito direto no extrato da conta"
                  : "Registrar débito ou retirada da conta"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário Atualizado */}
        <form onSubmit={handleSalvarMovimentacao} className="space-y-4">
          
          {/* 1. Selecionar qual conta corrente será alterada */}
          <div>
            <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300 block mb-1">
              {tipoOperacao === "ENTRADA" ? "Conta Bancária de Destino *" : "Conta Bancária de Origem *"}
            </label>
            <select
              value={contaId}
              onChange={(e) => setContaId(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-700 p-2.5 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
              required
            >
              <option value="">Selecione a conta...</option>
              {contas.map((conta) => (
                <option key={conta.id} value={conta.id}>
                  {conta.banco} (Saldo atual: R$ {Number(conta.saldo || 0).toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Valor */}
          <div>
            <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300 block mb-1">
              Valor da Movimentação (R$) *
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-700 p-2.5 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              required
            />
          </div>

          {/* 3. Data Exata com DIA (substitui os selects de apenas Mês/Ano) */}
          <div>
            <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300 block mb-1">
              Data da Operação (Dia / Mês / Ano) *
            </label>
            <input
              type="date"
              value={dataOperacao}
              onChange={(e) => setDataOperacao(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-700 p-2.5 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              required
            />
          </div>

          {/* 4. Tipo / Descrição para o Extrato */}
          <div>
            <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300 block mb-1">
              Motivo / Tipo de Movimentação *
            </label>
            <input
              type="text"
              placeholder={
                tipoOperacao === "ENTRADA"
                  ? "Ex: Injeção de Capital, Depósito, Aporte"
                  : "Ex: Retirada Pessoal, Saque Dinheiro, Ajuste"
              }
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-700 p-2.5 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              required
            />
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-1/2 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`w-1/2 py-2.5 rounded-lg text-white font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                tipoOperacao === "ENTRADA"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {loading
                ? "Salvando..."
                : tipoOperacao === "ENTRADA"
                ? "Confirmar Entrada"
                : "Confirmar Saída"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
