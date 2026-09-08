"use client";
import React, { useState, useEffect } from "react";
import { X, DollarSign, Edit3 } from "lucide-react";
import { parseCurrencyInput } from "@/lib/constants";
import { CATEGORIES } from "@/constants/categories";
import { getAllWalletsSimple, createCardPurchase, updateCardPurchase } from "@/lib/actions";
import { useModal } from "@/components/ui/custom-dialog-provider";

type SimpleWallet = {
  id: string;
  title: string;
  bankName?: string;
  walletType: string;
};

export type ExpenseInitialData = {
  id?: string;
  walletId?: string;
  description?: string;
  category?: string;
  amount?: number;
  type?: "vista" | "parcelado";
  installmentsCount?: number;
  date?: string;
  purchaseDate?: string;
  paymentDate?: string;
  competenceDate?: string;
  tags?: string;
  isRecurring?: boolean;
  recurringDay?: number;
};

interface NewPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultWalletId?: string;
  initialData?: ExpenseInitialData | null;
}

export function NewPurchaseModal({
  isOpen,
  onClose,
  onSuccess,
  defaultWalletId = "",
  initialData = null,
}: NewPurchaseModalProps) {
  const { showAlert } = useModal();
  const [wallets, setWallets] = useState<SimpleWallet[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState(defaultWalletId);
  const [formType, setFormType] = useState<"vista" | "parcelado">("vista");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("Alimentação");
  const [formAmount, setFormAmount] = useState<string | number>("");
  const [formInstallmentsCount, setFormInstallmentsCount] = useState<number>(2);
  const [formPurchaseDate, setFormPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  const isEditMode = !!(initialData && initialData.id);

  useEffect(() => {
    if (isOpen) {
      getAllWalletsSimple()
        .then(data => {
          setWallets(data);
          if (initialData) {
            setSelectedWalletId(initialData.walletId || defaultWalletId || (data.length > 0 ? data[0].id : ""));
            setFormType(initialData.type || (initialData.installmentsCount && initialData.installmentsCount > 1 ? "parcelado" : "vista"));
            setFormDescription(initialData.description || "");
            setFormCategory(initialData.category || "Alimentação");
            setFormAmount(initialData.amount != null ? initialData.amount : "");
            setFormInstallmentsCount(initialData.installmentsCount || 2);
            
            const purchaseD = initialData.purchaseDate
              ? initialData.purchaseDate.split("T")[0]
              : (initialData.date ? initialData.date.split("T")[0] : new Date().toISOString().split("T")[0]);
            setFormPurchaseDate(purchaseD);
          } else {
            if (defaultWalletId) {
              setSelectedWalletId(defaultWalletId);
            } else if (data.length > 0 && !selectedWalletId) {
              setSelectedWalletId(data[0].id);
            }
            setFormDescription("");
            setFormCategory("Alimentação");
            setFormAmount("");
            setFormType("vista");
            setFormPurchaseDate(new Date().toISOString().split("T")[0]);
          }
        })
        .catch(console.error);
    }
  }, [isOpen, defaultWalletId, initialData]);

  if (!isOpen) return null;

  const currentWallet = wallets.find(w => w.id === selectedWalletId);
  const isCredit = !currentWallet || currentWallet.walletType === "CREDIT_CARD";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWalletId) {
      showAlert("Por favor, selecione um cartão ou conta.", { variant: "warning" });
      return;
    }
    if (!formDescription.trim()) {
      showAlert("Preencha a descrição da despesa.", { variant: "warning" });
      return;
    }
    if (!formPurchaseDate) {
      showAlert("Preencha a data da despesa.", { variant: "warning" });
      return;
    }

    const totalAmountVal = parseCurrencyInput(formAmount);
    if (totalAmountVal <= 0) {
      showAlert("Informe um valor válido maior que zero.", { variant: "warning" });
      return;
    }

    const installments = (formType === "parcelado" && isCredit) ? formInstallmentsCount : undefined;
    const parts = formPurchaseDate.split("-");
    const compDateStr = parts.length >= 2 ? `${parts[0]}-${parts[1]}-01` : undefined;
    const effectiveDate = formPurchaseDate;
    const isRecurring = Boolean(initialData?.isRecurring);
    const finalTags = initialData?.tags || "";

    setSaving(true);
    try {
      if (isEditMode && initialData?.id) {
        await updateCardPurchase(
          initialData.id,
          selectedWalletId,
          formDescription,
          formCategory,
          totalAmountVal,
          installments,
          effectiveDate,
          finalTags,
          isRecurring,
          undefined,
          compDateStr,
          effectiveDate,
          effectiveDate
        );
      } else {
        await createCardPurchase(
          selectedWalletId,
          formDescription,
          formCategory,
          totalAmountVal,
          installments,
          effectiveDate,
          finalTags,
          false,
          undefined,
          compDateStr,
          effectiveDate,
          effectiveDate
        );
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      showAlert(`Erro ao ${isEditMode ? "atualizar" : "salvar"} a despesa. Tente novamente.`, { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl w-[95%] sm:w-full max-w-md mx-auto flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden text-slate-900 dark:text-slate-100">
        
        {/* Header */}
        <div className="flex justify-between items-center px-5 sm:px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              {isEditMode ? (
                <Edit3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              ) : (
                <DollarSign className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              )}
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {isEditMode ? "Editar Despesa" : "Nova Despesa"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 sm:px-6 py-5">
          
          {/* 1. Conta / Cartão */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Conta</label>
            <select
              required
              value={selectedWalletId}
              onChange={e => setSelectedWalletId(e.target.value)}
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm cursor-pointer"
            >
              <option value="" disabled className="bg-white dark:bg-slate-900 text-slate-500">
                — Selecione um cartão ou conta —
              </option>
              {wallets.map(w => (
                <option key={w.id} value={w.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  {(w.bankName || w.title)} — {w.walletType === "CREDIT_CARD" ? "Crédito" : w.walletType === "TICKET" ? "VA / VR" : "Débito"}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Descrição */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Descrição</label>
            <input
              required
              type="text"
              value={formDescription}
              onChange={e => setFormDescription(e.target.value)}
              placeholder="Ex: Supermercado"
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
            />
          </div>

          {/* 3. Categoria */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Categoria</label>
            <select
              value={formCategory}
              onChange={e => setFormCategory(e.target.value)}
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm cursor-pointer"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Forma de Pagamento */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Forma de Pagamento</label>
            <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setFormType("vista")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  formType === "vista"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                À Vista
              </button>
              <button
                type="button"
                onClick={() => setFormType("parcelado")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  formType === "parcelado"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                Parcelado
              </button>
            </div>
          </div>

          {/* 5. Valor */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Valor (R$)</label>
            <input
              required
              type="text"
              inputMode="decimal"
              value={formAmount}
              onChange={e => setFormAmount(e.target.value)}
              placeholder="0,00"
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
            />
          </div>

          {/* Parcelamento */}
          {formType === "parcelado" && (
            <div className="flex flex-col gap-2 p-3 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Parcelas</label>
                <select
                  value={formInstallmentsCount}
                  onChange={e => setFormInstallmentsCount(Number(e.target.value))}
                  className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {Array.from({ length: 23 }, (_, i) => i + 2).map(n => (
                    <option key={n} value={n}>{n}x</option>
                  ))}
                </select>
              </div>
              {parseCurrencyInput(formAmount) > 0 && (
                <p className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 font-tnum text-center pt-1.5 border-t border-indigo-100 dark:border-indigo-900/40">
                  {formInstallmentsCount}x de{" "}
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {(parseCurrencyInput(formAmount) / formInstallmentsCount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </p>
              )}
            </div>
          )}

          {/* 6. Data da Compra */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Data</label>
            <input
              required
              type="date"
              value={formPurchaseDate}
              onChange={e => setFormPurchaseDate(e.target.value)}
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:light] dark:[color-scheme:dark] transition-all shadow-sm"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-extrabold text-xs tracking-wider shadow-lg shadow-indigo-600/30 transition-all mt-6 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer uppercase"
          >
            {saving
              ? (isEditMode ? "SALVANDO..." : "REGISTRANDO...")
              : (isEditMode ? "SALVAR ALTERAÇÕES" : "REGISTRAR DESPESA")
            }
          </button>

        </form>
      </div>
    </div>
  );
}

export const ExpenseFormModal = NewPurchaseModal;
