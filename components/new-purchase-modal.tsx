"use client";
import React, { useState, useEffect } from "react";
import { X, DollarSign, Tag, Edit3, PlusCircle } from "lucide-react";
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
  const [wallets, setWallets]                     = useState<SimpleWallet[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState(defaultWalletId);
  const [formType, setFormType]                   = useState<"vista" | "parcelado">("vista");
  const [formDescription, setFormDescription]     = useState("");
  const [formCategory, setFormCategory]           = useState("Alimentação");
  const [formTags, setFormTags]                   = useState("");
  const [formAmount, setFormAmount]               = useState<string | number>("");
  const [formInstallmentAmount, setFormInstallmentAmount] = useState<number | "">("");
  const [formInstallmentsCount, setFormInstallmentsCount] = useState<number>(2);
  const [formPurchaseDate, setFormPurchaseDate]   = useState(new Date().toISOString().split("T")[0]);
  const [formPaymentDate, setFormPaymentDate]     = useState(new Date().toISOString().split("T")[0]);
  const [formCompetenceMonth, setFormCompetenceMonth] = useState<number>(new Date().getMonth() + 1);
  const [formCompetenceYear, setFormCompetenceYear]   = useState<number>(new Date().getFullYear());
  const [formIsRecurring, setFormIsRecurring]         = useState<boolean>(false);
  const [saving, setSaving]                       = useState(false);

  const isEditMode = !!(initialData && initialData.id);

  const handlePurchaseDateChange = (val: string) => {
    const oldPurchase = formPurchaseDate;
    setFormPurchaseDate(val);
    if (!formPaymentDate || formPaymentDate === oldPurchase) {
      setFormPaymentDate(val);
    }
    if (val) {
      const parts = val.split("-");
      if (parts.length >= 2) {
        const y = Number(parts[0]);
        const m = Number(parts[1]);
        if (!isNaN(y) && !isNaN(m)) {
          setFormCompetenceYear(y);
          setFormCompetenceMonth(m);
        }
      }
    }
  };

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
            
            const purchaseD = initialData.purchaseDate ? initialData.purchaseDate.split("T")[0] : (initialData.date ? initialData.date.split("T")[0] : new Date().toISOString().split("T")[0]);
            const paymentD = initialData.paymentDate ? initialData.paymentDate.split("T")[0] : (initialData.date ? initialData.date.split("T")[0] : purchaseD);
            setFormPurchaseDate(purchaseD);
            setFormPaymentDate(paymentD);
            setFormIsRecurring(!!(initialData.isRecurring || (initialData.tags && initialData.tags.toLowerCase().includes("assinatura"))));

            const refDateStr = initialData.competenceDate || initialData.purchaseDate || initialData.date;
            if (refDateStr) {
              const parts = refDateStr.split("T")[0].split("-");
              setFormCompetenceYear(Number(parts[0]));
              setFormCompetenceMonth(Number(parts[1]));
            } else {
              setFormCompetenceMonth(new Date().getMonth() + 1);
              setFormCompetenceYear(new Date().getFullYear());
            }
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
            setFormIsRecurring(false);
            const todayStr = new Date().toISOString().split("T")[0];
            setFormPurchaseDate(todayStr);
            setFormPaymentDate(todayStr);
            const now = new Date();
            setFormCompetenceMonth(now.getMonth() + 1);
            setFormCompetenceYear(now.getFullYear());
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
    if (!formDescription || !formPurchaseDate) {
      showAlert("Preencha a descrição e a data da compra.", { variant: "warning" });
      return;
    }

    const totalAmountVal = parseCurrencyInput(formAmount);
    if (totalAmountVal <= 0) {
      showAlert("Informe um valor válido maior que zero.", { variant: "warning" });
      return;
    }

    const installments = (formType === "parcelado" && isCredit) ? formInstallmentsCount : undefined;
    const compDateStr = `${formCompetenceYear}-${String(formCompetenceMonth).padStart(2, "0")}-01`;
    const finalPaymentDate = formPaymentDate || formPurchaseDate;

    let finalTags = formTags;
    if (formIsRecurring && !finalTags.toLowerCase().includes("assinatura")) {
      finalTags = finalTags ? `${finalTags}, #assinatura` : "#assinatura";
    }

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
          finalPaymentDate,
          finalTags,
          formIsRecurring,
          undefined,
          compDateStr,
          finalPaymentDate,
          formPurchaseDate
        );
      } else {
        await createCardPurchase(
          selectedWalletId,
          formDescription,
          formCategory,
          totalAmountVal,
          installments,
          finalPaymentDate,
          finalTags,
          formIsRecurring,
          undefined,
          compDateStr,
          finalPaymentDate,
          formPurchaseDate
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
      <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl w-[95%] sm:w-full max-w-lg mx-auto flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden max-h-[90vh] text-slate-900 dark:text-slate-100">
        
        {/* Header do Modal (Unificado: Novo vs Editar) */}
        <div className="flex justify-between items-center px-4 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto max-h-[calc(90vh-90px)]">
          
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

          {/* Campo: Marcar como Assinatura / Recorrência */}
          <div className="flex items-start gap-3 p-3 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl transition-all">
            <input
              type="checkbox"
              id="isRecurringToggle"
              checked={formIsRecurring}
              onChange={e => setFormIsRecurring(e.target.checked)}
              className="w-4 h-4 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-indigo-600 accent-indigo-600 hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer mt-0.5"
            />
            <label htmlFor="isRecurringToggle" className="cursor-pointer select-none">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                Marcar como Assinatura / Recorrência
              </span>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5">
                Despesas recorrentes cobradas mensalmente no cartão (ex: Netflix, Spotify, Internet).
              </span>
            </label>
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



          {/* Campos de Data: Data da Compra e Data de Pagamento / Vencimento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Data da Compra / Despesa *</span>
              </label>
              <input
                required
                type="date"
                value={formPurchaseDate}
                onChange={e => handlePurchaseDateChange(e.target.value)}
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:light] dark:[color-scheme:dark] transition-all shadow-sm"
              />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                Dia em que o gasto foi feito (define a competência).
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Data de Pagamento / Vencimento</span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold normal-case">(Opcional)</span>
              </label>
              <input
                type="date"
                value={formPaymentDate}
                onChange={e => setFormPaymentDate(e.target.value)}
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:light] dark:[color-scheme:dark] transition-all shadow-sm"
              />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                Dia da liquidação em conta ou fatura.
              </span>
            </div>
          </div>

          {/* Campo: Mês de Competência / Referência */}
          <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 shadow-xs">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center justify-between">
              <span>Mês de Competência / Referência</span>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold normal-case">(Opcional)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={formCompetenceMonth}
                onChange={(e) => setFormCompetenceMonth(Number(e.target.value))}
                className="w-full rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              >
                {[
                  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
                ].map((m, idx) => (
                  <option key={idx + 1} value={idx + 1} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{m}</option>
                ))}
              </select>
              <select
                value={formCompetenceYear}
                onChange={(e) => setFormCompetenceYear(Number(e.target.value))}
                className="w-full rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              >
                {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                  <option key={y} value={y} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{y}</option>
                ))}
              </select>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-tight">
              Mês/ano a que este gasto pertence no relatório DRE (ex: Gasto de Agosto pago em Setembro).
            </p>
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
