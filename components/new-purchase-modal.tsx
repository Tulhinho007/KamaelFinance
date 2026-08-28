"use client";

import React, { useState, useEffect } from "react";
import { X, DollarSign, Tag, Edit3, PlusCircle } from "lucide-react";
import { CATEGORIES, parseCurrencyInput } from "@/lib/constants";
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
  const [wallets, setWallets]                     = useState<SimpleWallet[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState(defaultWalletId);
  const [formType, setFormType]                   = useState<"vista" | "parcelado">("vista");
  const [formDescription, setFormDescription]     = useState("");
  const [formCategory, setFormCategory]           = useState("Alimentação");
  const [formTags, setFormTags]                   = useState("");
  const [formAmount, setFormAmount]               = useState<string | number>("");
  const [formInstallmentAmount, setFormInstallmentAmount] = useState<number | "">("");
  const [formInstallmentsCount, setFormInstallmentsCount] = useState<number>(2);
  const [formDate, setFormDate]                   = useState(new Date().toISOString().split("T")[0]);
  const [isSubscription, setIsSubscription]       = useState(false);
  const [recurringDay, setRecurringDay]             = useState<number>(10);
  const [saving, setSaving]                       = useState(false);

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
            setFormTags(initialData.tags || "");
            setFormAmount(initialData.amount != null ? initialData.amount : "");
            setFormInstallmentsCount(initialData.installmentsCount || 2);
            setFormDate(initialData.date ? initialData.date.split("T")[0] : new Date().toISOString().split("T")[0]);
            setIsSubscription(!!initialData.isRecurring);
            setRecurringDay(initialData.recurringDay || (initialData.date ? new Date(initialData.date).getDate() : 10));
          } else {
            if (defaultWalletId) {
              setSelectedWalletId(defaultWalletId);
            } else if (data.length > 0 && !selectedWalletId) {
              setSelectedWalletId(data[0].id);
            }
            setFormDescription("");
            setFormCategory("Alimentação");
            setFormTags("");
            setFormAmount("");
            setFormType("vista");
            setIsSubscription(false);
            setRecurringDay(10);
            setFormDate(new Date().toISOString().split("T")[0]);
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
    if (!formDescription || !formDate) {
      showAlert("Preencha a descrição e a data da compra.", { variant: "warning" });
      return;
    }

    const totalAmountVal = parseCurrencyInput(formAmount);
    if (totalAmountVal <= 0) {
      showAlert("Informe um valor válido maior que zero.", { variant: "warning" });
      return;
    }

    const installments = (formType === "parcelado" && isCredit) ? formInstallmentsCount : undefined;

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
          formDate,
          formTags,
          isSubscription,
          recurringDay
        );
      } else {
        await createCardPurchase(
          selectedWalletId,
          formDescription,
          formCategory,
          totalAmountVal,
          installments,
          formDate,
          formTags,
          isSubscription,
          recurringDay
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
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden text-slate-900 dark:text-slate-100">
        
        {/* Header do Modal (Unificado: Novo vs Editar) */}
        <div className="flex justify-between items-center px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-sm shadow-indigo-500/10">
              {isEditMode ? (
                <Edit3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              ) : (
                <DollarSign className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {isEditMode ? "Editar Despesa / Compra" : "Lançar Despesa / Compra"}
              </h3>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {isEditMode ? "Atualize os campos e a recorrência da despesa" : "Registre uma nova compra ou débito"}
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

        {/* Form Body com TODOS os campos compartilhados */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5 overflow-y-auto max-h-[75vh]">
          
          {/* Campo 1: Selecionar Cartão / Conta */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Selecionar Cartão / Conta *
            </label>
            <select
              required
              value={selectedWalletId}
              onChange={e => setSelectedWalletId(e.target.value)}
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm cursor-pointer"
            >
              <option value="" disabled className="bg-white dark:bg-slate-900 text-slate-500">
                -- Selecione um cartão ou conta --
              </option>
              {wallets.map(w => (
                <option key={w.id} value={w.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  {(w.bankName || w.title)} - {w.walletType === "CREDIT_CARD" ? "Cartão de Crédito" : w.walletType === "TICKET" ? "VA / VR / Benefício" : "Conta Corrente/Débito"}
                </option>
              ))}
            </select>
          </div>

          {/* Campo 2: Descrição */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Descrição da Compra *
            </label>
            <input
              required
              type="text"
              value={formDescription}
              onChange={e => setFormDescription(e.target.value)}
              placeholder="Ex: Supermercado, Gasolina, Netflix..."
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
            />
          </div>

          {/* Campo 3: Categoria */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Categoria *
            </label>
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

          {/* Campo de Tags / Centro de Custos */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex justify-between items-center">
              <span>Tags / Centro de Custos</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium lowercase">Ex: #viagem2026, #reforma</span>
            </label>
            <div className="relative">
              <Tag className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                value={formTags}
                onChange={e => setFormTags(e.target.value)}
                placeholder="Ex: #viagem2026, #trabalho..."
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Campo 4: Tipo de Lançamento (À Vista vs Parcelado) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Forma de Pagamento
            </label>
            <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setFormType("vista")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  formType === "vista"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-900/50"
                }`}
              >
                À Vista (1x)
              </button>
              <button
                type="button"
                onClick={() => setFormType("parcelado")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  formType === "parcelado"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-900/50"
                }`}
              >
                Parcelado
              </button>
            </div>
          </div>

          {/* Campo 5: Valor Total */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Valor Total (R$) *
            </label>
            <input
              required
              type="text"
              inputMode="decimal"
              value={formAmount}
              onChange={e => setFormAmount(e.target.value)}
              placeholder="Ex: 249,90 ou 500"
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
            />
          </div>

          {/* Campo 6: Opções de Parcelamento em tempo real */}
          {formType === "parcelado" && (
            <div className="flex flex-col gap-2 p-3 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Quantidade de Parcelas *
                </label>
                <select
                  value={formInstallmentsCount}
                  onChange={e => setFormInstallmentsCount(Number(e.target.value))}
                  className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {Array.from({ length: 23 }, (_, i) => i + 2).map(n => (
                    <option key={n} value={n}>
                      {n}x parcelas
                    </option>
                  ))}
                </select>
              </div>

              {parseCurrencyInput(formAmount) > 0 && (
                <div className="text-center pt-2 border-t border-indigo-100 dark:border-indigo-900/40">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wide">
                    Cálculo da Parcela
                  </span>
                  <p className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 font-tnum mt-0.5">
                    {parseCurrencyInput(formAmount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} em {formInstallmentsCount}x de{" "}
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {(parseCurrencyInput(formAmount) / formInstallmentsCount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Checkbox de Assinatura / Gasto Recorrente Mensal */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isSubscription}
                onChange={e => setIsSubscription(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                🔄 É uma assinatura / gasto recorrente mensal
              </span>
            </label>

            {isSubscription && (
              <div className="flex flex-col gap-1.5 pl-6 pt-1 border-t border-slate-200 dark:border-slate-800">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Dia do Vencimento Recorrente (1 a 31)
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={recurringDay}
                  onChange={e => setRecurringDay(Number(e.target.value))}
                  className="w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>
            )}
          </div>

          {/* Campo 7: Data */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Data da Compra *
            </label>
            <input
              required
              type="date"
              value={formDate}
              onChange={e => setFormDate(e.target.value)}
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:light] dark:[color-scheme:dark] transition-all shadow-sm"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-extrabold text-xs tracking-wider shadow-lg shadow-indigo-600/30 transition-all mt-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer uppercase"
          >
            {saving
              ? (isEditMode ? "SALVANDO..." : "REGISTRANDO...")
              : (isEditMode ? "SALVAR ALTERAÇÕES" : "REGISTRAR COMPRA")
            }
          </button>

        </form>
      </div>
    </div>
  );
}

export const ExpenseFormModal = NewPurchaseModal;
