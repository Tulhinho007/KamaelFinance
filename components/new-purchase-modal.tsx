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
  dueDate?: string;
  competenceDate?: string;
  tags?: string;
  isRecurring?: boolean;
  recurringDay?: number;
  status?: string;
  paymentMethod?: string;
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
  const [formDueDate, setFormDueDate] = useState<string>("");
  const [formIsPaid, setFormIsPaid] = useState(true);
  const [formPaymentMethod, setFormPaymentMethod] = useState<string>("PIX");
  const [formIsRecurring, setFormIsRecurring] = useState(false);
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
            setFormIsPaid(initialData.status !== "PENDING");
            setFormPaymentMethod(initialData.paymentMethod || "PIX");
            setFormIsRecurring(!!initialData.isRecurring);
            setFormDueDate(initialData.dueDate ? initialData.dueDate.split("T")[0] : "");
            
            const targetDate = initialData.paymentDate
              ? initialData.paymentDate.split("T")[0]
              : (initialData.purchaseDate
                ? initialData.purchaseDate.split("T")[0]
                : (initialData.date ? initialData.date.split("T")[0] : (initialData.dueDate ? initialData.dueDate.split("T")[0] : new Date().toISOString().split("T")[0])));
            setFormPurchaseDate(targetDate);
          } else {
            const initialWallet = defaultWalletId || (data.length > 0 ? data[0].id : "");
            setSelectedWalletId(initialWallet);
            setFormDescription("");
            setFormCategory("Alimentação");
            setFormAmount("");
            setFormType("vista");
            setFormPurchaseDate(new Date().toISOString().split("T")[0]);
            setFormDueDate("");
            
            const wObj = data.find(w => w.id === initialWallet);
            const isCred = wObj?.walletType === "CREDIT_CARD";
            setFormIsPaid(isCred);
            setFormPaymentMethod(isCred ? "CARTAO_CREDITO" : "PIX");
            setFormIsRecurring(false);
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

    const installments = isCredit && formType === "parcelado" && formInstallmentsCount > 1 ? formInstallmentsCount : undefined;
    const parts = formPurchaseDate.split("-");
    const status = formIsPaid ? "COMPLETED" : "PENDING";
    const paymentMethod = isCredit ? "CARTAO_CREDITO" : formPaymentMethod;
    const dueDateStr = !formIsPaid ? formPurchaseDate : (formDueDate ? formDueDate : undefined);
    const compDateStr = (formIsPaid && !isCredit && formDueDate)
      ? `${formDueDate.split("-")[0]}-${formDueDate.split("-")[1]}-01`
      : (parts.length >= 2 ? `${parts[0]}-${parts[1]}-01` : undefined);
    const effectiveDate = formPurchaseDate;
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
          formIsRecurring,
          undefined,
          compDateStr,
          formIsPaid ? effectiveDate : undefined,
          effectiveDate,
          status,
          paymentMethod,
          dueDateStr
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
          formIsRecurring,
          undefined,
          compDateStr,
          formIsPaid ? effectiveDate : undefined,
          effectiveDate,
          status,
          paymentMethod,
          dueDateStr
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
      <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl w-[95%] sm:w-full max-w-md mx-auto flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden text-slate-900 dark:text-slate-100 max-h-[92vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center px-5 sm:px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 px-5 sm:px-6 py-4 overflow-y-auto">
          
          {/* 1. Conta / Cartão */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Conta / Cartão</label>
            <select
              required
              value={selectedWalletId}
              onChange={e => {
                const nextId = e.target.value;
                setSelectedWalletId(nextId);
                const w = wallets.find(item => item.id === nextId);
                if (w?.walletType === "CREDIT_CARD") {
                  setFormIsPaid(true);
                  setFormPaymentMethod("CARTAO_CREDITO");
                }
              }}
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm cursor-pointer"
            >
              <option value="" disabled className="bg-white dark:bg-slate-900 text-slate-500">
                — Selecione um cartão ou conta —
              </option>
              {wallets.map(w => (
                <option key={w.id} value={w.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  {(w.bankName || w.title)} — {w.walletType === "CREDIT_CARD" ? "Cartão de Crédito" : w.walletType === "TICKET" ? "VA / VR" : "Conta Corrente / Débito"}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Descrição */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Descrição</label>
            <input
              required
              type="text"
              value={formDescription}
              onChange={e => setFormDescription(e.target.value)}
              placeholder="Ex: Conta de Luz, Supermercado, Internet..."
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
            />
          </div>

          {/* 3. Categoria */}
          <div className="flex flex-col gap-1">
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

          {/* 4. Forma de Pagamento / Método */}
          {isCredit ? (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Modalidade de Crédito</label>
              <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setFormType("vista")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
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
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    formType === "parcelado"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  Parcelado
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Método de Pagamento</label>
              <div className="grid grid-cols-4 gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                {[
                  { id: "PIX", label: "Pix" },
                  { id: "DEBITO", label: "Débito" },
                  { id: "BOLETO", label: "Boleto" },
                  { id: "DINHEIRO", label: "Dinheiro" },
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setFormPaymentMethod(m.id)}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      formPaymentMethod === m.id
                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Parcelamento (se cartão parcelado) */}
          {isCredit && formType === "parcelado" && (
            <div className="flex flex-col gap-2 p-3 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Parcelas</label>
                <select
                  value={formInstallmentsCount}
                  onChange={e => setFormInstallmentsCount(Number(e.target.value))}
                  className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {Array.from({ length: 23 }, (_, i) => i + 2).map(n => (
                    <option key={n} value={n}>{n}x</option>
                  ))}
                </select>
              </div>
              {parseCurrencyInput(formAmount) > 0 && (
                <p className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 font-tnum text-center pt-1 border-t border-indigo-100 dark:border-indigo-900/40">
                  {formInstallmentsCount}x de{" "}
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {(parseCurrencyInput(formAmount) / formInstallmentsCount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </p>
              )}
            </div>
          )}

          {/* 5. Valor */}
          <div className="flex flex-col gap-1">
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

          {/* 6. Toggle: Já foi pago? (Sim / Não) */}
          <div className="flex flex-col gap-1 p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Já foi pago?
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {formIsPaid
                    ? "Desconta imediatamente do saldo da conta"
                    : "Pendente: Não desconta do saldo até dar baixa"}
                </span>
              </div>

              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setFormIsPaid(true)}
                  className={`px-3 py-1 text-xs font-extrabold rounded-md transition-all cursor-pointer ${
                    formIsPaid
                      ? "bg-emerald-500 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => setFormIsPaid(false)}
                  className={`px-3 py-1 text-xs font-extrabold rounded-md transition-all cursor-pointer ${
                    !formIsPaid
                      ? "bg-amber-500 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  Não
                </button>
              </div>
            </div>
          </div>

          {/* 7. Data: Vencimento ou Pagamento */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {formIsPaid ? "Data do Pagamento" : "Data de Vencimento"}
            </label>
            <input
              required
              type="date"
              value={formPurchaseDate}
              onChange={e => setFormPurchaseDate(e.target.value)}
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:light] dark:[color-scheme:dark] transition-all shadow-sm"
            />
          </div>

          {/* Vencimento Original (caso esteja pagando antecipado uma conta de outro mês) */}
          {formIsPaid && !isCredit && (
            <div className="flex flex-col gap-1 p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center justify-between">
                <span>Vencimento Original da Conta</span>
                <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold">Opcional se adiantou o pagamento</span>
              </label>
              <input
                type="date"
                value={formDueDate}
                onChange={e => setFormDueDate(e.target.value)}
                className="w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:light] dark:[color-scheme:dark] transition-all shadow-xs"
              />
            </div>
          )}

          {/* 8. Opção: Repetir todo mês (Recorrente) */}
          <div className="flex items-center gap-2 pt-1">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formIsRecurring}
                onChange={e => setFormIsRecurring(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 cursor-pointer"
              />
              <span>Repetir todo mês (despesa fixa / recorrente)</span>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-extrabold text-xs tracking-wider shadow-lg shadow-indigo-600/30 transition-all mt-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer uppercase"
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
