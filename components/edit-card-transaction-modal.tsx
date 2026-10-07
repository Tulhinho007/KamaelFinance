"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  CreditCard,
  Calendar,
  DollarSign,
  Tag,
  Pencil,
  Layers,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { CATEGORIES, getCategoryColor } from "@/constants/categories";
import { parseCurrencyInput } from "@/lib/constants";
import { updateCreditCardTransactionAction } from "@/lib/actions";
import { useModal } from "@/components/ui/custom-dialog-provider";

export interface EditCardTransactionData {
  id: string;
  description: string;
  amount: number;
  category?: string;
  purchaseDate?: string;
  date?: string;
  walletId: string;
  walletName?: string;
  installmentsCount?: number;
  currentInstallment?: number;
  installmentGroupId?: string;
}

interface EditCardTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: EditCardTransactionData | null;
  cards: Array<{
    id: string;
    title?: string;
    bankName?: string;
    diaFechamento?: number;
    diaVencimento?: number;
  }>;
  onSuccess?: () => Promise<void> | void;
}

export function EditCardTransactionModal({
  isOpen,
  onClose,
  transaction,
  cards,
  onSuccess,
}: EditCardTransactionModalProps) {
  const { showAlert } = useModal();

  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Alimentação");
  const [amount, setAmount] = useState<string | number>("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [walletId, setWalletId] = useState("");
  const [applyToAllInstallments, setApplyToAllInstallments] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Detecta se o lançamento faz parte de compra parcelada
  const isInstallment = Boolean(
    transaction &&
      ((transaction.installmentsCount && transaction.installmentsCount > 1) ||
        Boolean(transaction.installmentGroupId) ||
        /\((\d+)\/(\d+)\)/.test(transaction.description || "") ||
        /Parcela\s*\d+\/\d+/i.test(transaction.description || ""))
  );

  const installmentMatch = transaction?.description?.match(/\((\d+)\/(\d+)\)/);
  const currentInst =
    transaction?.currentInstallment ||
    (installmentMatch ? Number(installmentMatch[1]) : 1);
  const totalInst =
    transaction?.installmentsCount ||
    (installmentMatch ? Number(installmentMatch[2]) : 1);

  // Preenche o formulário quando a transação é aberta
  useEffect(() => {
    if (transaction && isOpen) {
      // Limpa sufixo "(X/Y)" da descrição no formulário para facilitar a edição limpa
      const cleanDesc = (transaction.description || "")
        .replace(/\s*\(\d+\/\d+\)$/, "")
        .replace(/\s*Parcela\s*\d+\/\d+/i, "")
        .trim();

      setDescription(cleanDesc || transaction.description || "");
      setCategory(transaction.category || "Outros");
      setAmount(transaction.amount != null ? transaction.amount : "");

      const dateStr =
        transaction.purchaseDate ||
        transaction.date ||
        new Date().toISOString().split("T")[0];
      setPurchaseDate(dateStr.split("T")[0]);

      setWalletId(transaction.walletId || (cards.length > 0 ? cards[0].id : ""));
      setApplyToAllInstallments(false);
    }
  }, [transaction, isOpen, cards]);

  if (!isOpen || !transaction) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      showAlert("Por favor, preencha a descrição do lançamento.", { variant: "warning" });
      return;
    }

    const numAmount = parseCurrencyInput(amount);
    if (numAmount <= 0) {
      showAlert("Informe um valor válido maior que zero para a parcela.", { variant: "warning" });
      return;
    }

    if (!purchaseDate) {
      showAlert("Por favor, informe a data da compra.", { variant: "warning" });
      return;
    }

    if (!walletId) {
      showAlert("Por favor, selecione o cartão vinculado.", { variant: "warning" });
      return;
    }

    setIsSaving(true);
    try {
      // Chama a Server Action de atualização
      const res = await updateCreditCardTransactionAction({
        id: transaction.id,
        description: description.trim(),
        category,
        amount: numAmount,
        purchaseDate,
        walletId,
        applyToAllInstallments,
      });

      if (!res.success) {
        throw new Error(res.error || "Erro ao salvar alterações.");
      }

      const updatedCount = res.updatedCount || 1;
      showAlert(
        applyToAllInstallments && updatedCount > 1
          ? `Todas as ${updatedCount} parcelas foram atualizadas com sucesso!`
          : "Lançamento do cartão atualizado com sucesso!",
        { variant: "success" }
      );

      onClose();
      if (onSuccess) {
        await onSuccess();
      }
    } catch (err: any) {
      console.error("Erro ao salvar lançamento do cartão:", err);
      showAlert(err?.message || "Erro ao atualizar lançamento do cartão.", { variant: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg p-6 sm:p-7 animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Editar Lançamento do Cartão
              </h3>
              <p className="text-xs text-slate-400">
                Altere os dados da compra, fatura ou parcelamento
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informação de Compra Parcelada */}
        {isInstallment && (
          <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/50 rounded-2xl p-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-700 dark:text-indigo-300">
                <Layers className="w-3.5 h-3.5" /> Compra Parcelada
              </span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Parcela {currentInst} de {totalInst}
              </span>
            </div>

            <label className="flex items-start gap-3 mt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={applyToAllInstallments}
                onChange={(e) => setApplyToAllInstallments(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Aplicar alterações a todas as parcelas deste lançamento
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {applyToAllInstallments
                    ? `Atualizará a descrição, categoria, valor unitário (R$ ${Number(amount || 0).toFixed(2)}) e cartão em todas as ${totalInst} parcelas.`
                    : "Edita apenas a parcela desta fatura específica, sem afetar as demais parcelas."}
                </span>
              </div>
            </label>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Descrição */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
              Descrição da Compra *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Tênis Esportivo, Supermercado, Aluguel"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
            {isInstallment && (
              <p className="text-[10px] text-slate-400 mt-1">
                {applyToAllInstallments
                  ? `As parcelas serão identificadas automaticamente como "${description.trim()} (1/${totalInst})", etc.`
                  : `Esta parcela será mantida como "${description.trim()} (${currentInst}/${totalInst})".`}
              </p>
            )}
          </div>

          {/* Grid: Categoria & Valor da Parcela */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Categoria */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                Categoria *
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white appearance-none cursor-pointer"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <div
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full pointer-events-none"
                  style={{ backgroundColor: getCategoryColor(category) }}
                />
              </div>
            </div>

            {/* Valor da Parcela */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                Valor da Parcela (R$) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) =>
                    setAmount(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 pl-9 pr-3.5 py-2.5 text-xs font-black tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>
              {isInstallment && (
                <p className="text-[10px] text-slate-400 mt-1">
                  {applyToAllInstallments
                    ? `Valor aplicado a cada uma das ${totalInst} parcelas.`
                    : "Valor apenas desta parcela selecionada."}
                </p>
              )}
            </div>
          </div>

          {/* Grid: Data da Compra & Cartão Vinculado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Data da Compra */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                Data da Compra *
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white cursor-pointer"
                />
              </div>
            </div>

            {/* Cartão Vinculado */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                Cartão Vinculado *
              </label>
              <div className="relative">
                <select
                  required
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white cursor-pointer"
                >
                  {cards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.title || card.bankName || "Cartão"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/25 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>Salvando...</>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Salvar Alterações
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
