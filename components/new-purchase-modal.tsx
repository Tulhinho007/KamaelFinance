"use client";
import React, { useState, useEffect } from "react";
import { X, DollarSign, Edit3, Calendar, Repeat } from "lucide-react";
import { parseCurrencyInput } from "@/lib/constants";
import { CATEGORIES } from "@/constants/categories";
import { getAllWalletsSimple, createCardPurchase, updateCardPurchase, duplicateExpenseToNextMonthAction } from "@/lib/actions";
import { useModal } from "@/components/ui/custom-dialog-provider";

type SimpleWallet = {
  id: string;
  title: string;
  bankName?: string;
  walletType: string;
  diaFechamento?: number;
  diaVencimento?: number;
};

// Calcula automaticamente a fatura de destino baseado na Data da Compra e no Dia de Fechamento do Cartão
export function calcularFaturaDestino(dataCompraStr: string, diaFechamentoCartao: number = 1): string {
  if (!dataCompraStr) return "";
  const parts = dataCompraStr.split("-");
  if (parts.length < 3) return dataCompraStr.substring(0, 7);

  const ano = parseInt(parts[0], 10);
  const mes = parseInt(parts[1], 10) - 1; // 0 a 11
  const dia = parseInt(parts[2], 10);

  let mesFatura = mes;
  let anoFatura = ano;

  // Se comprou no dia do fechamento ou depois, vai para a fatura seguinte
  if (dia >= diaFechamentoCartao) {
    mesFatura += 1;
    if (mesFatura > 11) {
      mesFatura = 0;
      anoFatura += 1;
    }
  }

  const mm = String(mesFatura + 1).padStart(2, "0");
  return `${anoFatura}-${mm}`;
}

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
  competenceMonth?: number;
  competenceYear?: number;
  referenceMonth?: string; // Formato "YYYY-MM" (ex: "2026-08")
  repeatNextMonth?: boolean;
  tags?: string;
  isRecurring?: boolean;
  recurringDay?: number;
  status?: string;
  isPaid?: boolean;
  paymentMethod?: string;
};

interface NewPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultWalletId?: string;
  initialData?: ExpenseInitialData | null;
}

const getMonthYearLabel = (val: string): string => {
  if (!val) return "";
  const parts = val.split("-");
  if (parts.length >= 2) {
    const months = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    const m = Number(parts[1]);
    const name = months[m - 1] || parts[1];
    return `${name}/${parts[0]}`;
  }
  return val;
};

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
  const [formReferenceMonth, setFormReferenceMonth] = useState<string>("");
  const [formIsPaid, setFormIsPaid] = useState(true);
  const [formPaymentMethod, setFormPaymentMethod] = useState<string>("PIX");
  const [formRepeatNextMonth, setFormRepeatNextMonth] = useState(false);
  const [saving, setSaving] = useState(false);

  const isEditMode = !!(initialData && initialData.id);

  useEffect(() => {
    if (isOpen) {
      getAllWalletsSimple()
        .then(data => {
          setWallets(data);
          if (initialData) {
            const activeWalletId = initialData.walletId || defaultWalletId || (data.length > 0 ? data[0].id : "");
            setSelectedWalletId(activeWalletId);
            setFormType(initialData.type || (initialData.installmentsCount && initialData.installmentsCount > 1 ? "parcelado" : "vista"));
            setFormDescription(initialData.description || "");
            setFormCategory(initialData.category || "Alimentação");
            setFormAmount(initialData.amount != null ? initialData.amount : "");
            setFormInstallmentsCount(initialData.installmentsCount || 2);
            const isInitiallyPaid = initialData.status
              ? (initialData.status !== "PENDING" && (initialData as any).status !== "pendente")
              : (initialData.isPaid ?? true);
            setFormIsPaid(isInitiallyPaid);
            const wObj = data.find(w => w.id === activeWalletId);
            const isCred = wObj?.walletType === "CREDIT_CARD";
            const rawPm = (initialData.paymentMethod || "").toUpperCase();
            if (rawPm === "CARTAO_CREDITO" || rawPm === "CREDITO") {
              setFormPaymentMethod("CREDITO");
            } else if (rawPm === "BOLETO") {
              setFormPaymentMethod("BOLETO");
            } else if (rawPm === "DEBITO") {
              setFormPaymentMethod("DEBITO");
            } else if (rawPm === "DINHEIRO") {
              setFormPaymentMethod("DINHEIRO");
            } else if (rawPm === "PIX") {
              setFormPaymentMethod("PIX");
            } else {
              setFormPaymentMethod(isCred ? "CREDITO" : "DEBITO");
            }
            setFormRepeatNextMonth(Boolean(initialData.repeatNextMonth || initialData.isRecurring));
            
            const targetDate = initialData.paymentDate
              ? initialData.paymentDate.split("T")[0]
              : (initialData.purchaseDate
                ? initialData.purchaseDate.split("T")[0]
                : (initialData.date ? initialData.date.split("T")[0] : (initialData.dueDate ? initialData.dueDate.split("T")[0] : new Date().toISOString().split("T")[0])));
            setFormPurchaseDate(targetDate);

            // Mês de referência (competência da fatura ou da despesa)
            let initialRef = "";
            if (initialData.referenceMonth) {
              initialRef = initialData.referenceMonth.substring(0, 7);
            } else if (initialData.competenceDate) {
              initialRef = initialData.competenceDate.split("T")[0].substring(0, 7);
            } else if (initialData.competenceYear && initialData.competenceMonth) {
              initialRef = `${initialData.competenceYear}-${String(initialData.competenceMonth).padStart(2, "0")}`;
            } else if (isCred) {
              initialRef = calcularFaturaDestino(targetDate, wObj?.diaFechamento ?? 1);
            } else {
              initialRef = targetDate.substring(0, 7);
            }
            setFormReferenceMonth(initialRef);
          } else {
            const initialWallet = defaultWalletId || (data.length > 0 ? data[0].id : "");
            const todayStr = new Date().toISOString().split("T")[0];
            const wObj = data.find(w => w.id === initialWallet);
            const isCred = wObj?.walletType === "CREDIT_CARD";

            setSelectedWalletId(initialWallet);
            setFormDescription("");
            setFormCategory("Alimentação");
            setFormAmount("");
            setFormType("vista");
            setFormPurchaseDate(todayStr);
            
            // Se for cartão de crédito, calcula a fatura de destino pelo dia de fechamento
            const autoRef = isCred
              ? calcularFaturaDestino(todayStr, wObj?.diaFechamento ?? 1)
              : todayStr.substring(0, 7);
            setFormReferenceMonth(autoRef);
            
            // Compras no cartão de crédito nascem como PENDENTE por padrão
            setFormIsPaid(isCred ? false : true);
            setFormPaymentMethod(isCred ? "CREDITO" : "PIX");
            setFormRepeatNextMonth(false);
          }
        })
        .catch(console.error);
    }
  }, [isOpen, defaultWalletId, initialData]);

  if (!isOpen) return null;

  const currentWallet = wallets.find(w => w.id === selectedWalletId);
  const isCredit = !currentWallet || currentWallet.walletType === "CREDIT_CARD";

  const handlePurchaseDateChange = (val: string) => {
    setFormPurchaseDate(val);
    const isCreditOperation = formPaymentMethod === "CREDITO" || isCredit;

    if (isCreditOperation && val) {
      const closingDay = currentWallet?.diaFechamento ?? 1;
      const autoRef = calcularFaturaDestino(val, closingDay);
      setFormReferenceMonth(autoRef);
    } else if (val && val.length >= 7) {
      setFormReferenceMonth(val.substring(0, 7));
    }
  };

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
    const paymentMethod = isCredit ? "CREDITO" : (formPaymentMethod === "CREDITO" ? "DEBITO" : formPaymentMethod);
    const dueDateStr = !formIsPaid ? formPurchaseDate : undefined;

    // Competência / Mês de Referência da compra
    const compDateStr = formReferenceMonth
      ? `${formReferenceMonth}-01`
      : (parts.length >= 2 ? `${parts[0]}-${parts[1]}-01` : undefined);

    const effectiveDate = formPurchaseDate;
    const finalTags = initialData?.tags || "";
    // Duplicação pontual P2P (+1 mês apenas): não salva como série recorrente infinita no banco
    const isRecurring = false;

    setSaving(true);
    try {
      let savedId: string | undefined = initialData?.id;

      if (isEditMode && initialData?.id) {
        const updateRes = await updateCardPurchase(
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
          formIsPaid ? effectiveDate : undefined,
          effectiveDate,
          status,
          paymentMethod,
          dueDateStr
        );
        savedId = updateRes?.id || initialData.id;
      } else {
        const createRes = await createCardPurchase(
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
          formIsPaid ? effectiveDate : undefined,
          effectiveDate,
          status,
          paymentMethod,
          dueDateStr
        );
        savedId = createRes?.id;
      }

      // Se marcado para repetir no próximo mês, agenda a duplicação imediata com base na data da compra/pagamento
      if (formRepeatNextMonth && savedId) {
        try {
          const dateParts = formPurchaseDate.split("-");
          const baseM = Number(dateParts[1]); // Mês da despesa de origem (ex: 9 para Setembro)
          const baseY = Number(dateParts[0]); // Ano da despesa de origem (ex: 2026)
          await duplicateExpenseToNextMonthAction(savedId, baseM, baseY);
        } catch (dupErr) {
          console.warn("Aviso ao agendar repetição no próximo mês:", dupErr);
        }
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
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-t-[32px] sm:rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl w-full sm:max-w-lg flex flex-col animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 overflow-hidden text-slate-900 dark:text-slate-100 max-h-[92vh]">
        
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
            aria-label="Fechar Modal"
            className="min-w-[40px] min-h-[40px] rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="px-5 sm:px-6 py-4 flex flex-col gap-3.5 overflow-y-auto">
          
          {/* 1. Conta / Cartão */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Cartão ou Conta
            </label>
            <select
              value={selectedWalletId}
              onChange={e => {
                const nextId = e.target.value;
                setSelectedWalletId(nextId);
                const w = wallets.find(item => item.id === nextId);
                const isCred = w?.walletType === "CREDIT_CARD";
                if (!isEditMode) {
                  setFormIsPaid(isCred ? false : true);
                }
                const nextPm = isCred ? "CREDITO" : (formPaymentMethod === "CREDITO" ? "PIX" : formPaymentMethod);
                setFormPaymentMethod(nextPm);

                // Recalcula competência da fatura se for cartão
                if (isCred && formPurchaseDate) {
                  const closingDay = w?.diaFechamento ?? 1;
                  const autoRef = calcularFaturaDestino(formPurchaseDate, closingDay);
                  setFormReferenceMonth(autoRef);
                }
              }}
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-all shadow-sm"
            >
              {wallets.map(w => (
                <option key={w.id} value={w.id}>
                  {w.bankName ? `${w.bankName} - ` : ""}{w.title} ({w.walletType === "CREDIT_CARD" ? `Cartão de Crédito - Fecha dia ${w.diaFechamento ?? 1}, Vence dia ${w.diaVencimento ?? 10}` : "Conta Corrente / Carteira"})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Descrição */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Descrição da Despesa
            </label>
            <input
              required
              type="text"
              placeholder="Ex: Supermercado, Almoço, Gasolina..."
              value={formDescription}
              onChange={e => setFormDescription(e.target.value)}
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm placeholder:text-slate-400"
            />
          </div>

          {/* 3. Valor + Categoria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Valor (R$)
              </label>
              <input
                required
                type="text"
                inputMode="decimal"
                placeholder="R$ 0,00"
                value={formAmount}
                onChange={e => setFormAmount(e.target.value)}
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm font-tnum"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Categoria
              </label>
              <select
                value={formCategory}
                onChange={e => setFormCategory(e.target.value)}
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-all shadow-sm"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Modo de Pagamento (À Vista ou Parcelado no Crédito) */}
          {isCredit && (
            <div className="flex flex-col gap-1.5 p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Condição de Pagamento
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFormType("vista")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    formType === "vista"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                  }`}
                >
                  À Vista
                </button>
                <button
                  type="button"
                  onClick={() => setFormType("parcelado")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    formType === "parcelado"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                  }`}
                >
                  Parcelado
                </button>
              </div>

              {formType === "parcelado" && (
                <div className="flex items-center gap-2 mt-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    Qtd. Parcelas:
                  </label>
                  <select
                    value={formInstallmentsCount}
                    onChange={e => setFormInstallmentsCount(Number(e.target.value))}
                    className="flex-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24, 36, 48].map(n => (
                      <option key={n} value={n}>
                        {n}x {parseCurrencyInput(formAmount) > 0 ? `de R$ ${(parseCurrencyInput(formAmount) / n).toFixed(2).replace(".", ",")}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* 5. Forma de Liquidação e Status do Pagamento (sempre disponível e editável) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Forma de Pagamento
              </label>
              {isCredit ? (
                <div className="w-full h-[38px] rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>Cartão de Crédito</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
                    Crédito
                  </span>
                </div>
              ) : (
                <select
                  value={formPaymentMethod}
                  onChange={e => setFormPaymentMethod(e.target.value)}
                  className="w-full h-[38px] rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-all shadow-sm"
                >
                  <option value="PIX">PIX</option>
                  <option value="DEBITO">Débito em Conta</option>
                  <option value="BOLETO">Boleto Bancário</option>
                  <option value="DINHEIRO">Dinheiro</option>
                </select>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Status do Pagamento
              </label>
              <div className="flex items-center h-[38px] bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setFormIsPaid(true)}
                  className={`flex-1 h-full text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    formIsPaid
                      ? "bg-emerald-500 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  Pago
                </button>
                <button
                  type="button"
                  onClick={() => setFormIsPaid(false)}
                  className={`flex-1 h-full text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    !formIsPaid
                      ? "bg-amber-500 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  Pendente
                </button>
              </div>
            </div>
          </div>

          {/* 6. Campo de Data com Label Dinâmica (Data da Compra para Cartão de Crédito ou Data de Vencimento/Pagamento) */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {formPaymentMethod === "CREDITO" || isCredit
                ? "Data da Compra *"
                : (formIsPaid ? "Data do Pagamento *" : "Data de Vencimento *")
              }
            </label>
            <input
              required
              type="date"
              value={formPurchaseDate}
              onChange={e => handlePurchaseDateChange(e.target.value)}
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:light] dark:[color-scheme:dark] transition-all shadow-sm"
            />
            {(formPaymentMethod === "CREDITO" || isCredit) && (
              <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 block">
                O vencimento será o da própria fatura ({currentWallet?.diaVencimento ? `Dia ${currentWallet.diaVencimento}` : "definido no cartão"}).
              </span>
            )}
          </div>

          {/* 7. Mês de Referência da Compra / Fatura de Destino */}
          <div className="flex flex-col gap-1.5 p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span>{formPaymentMethod === "CREDITO" || isCredit ? "Fatura de Destino (Competência)" : "Mês de Referência da Despesa"}</span>
              </label>
              {formReferenceMonth && (
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                  {formPaymentMethod === "CREDITO" || isCredit ? `Fatura: ${getMonthYearLabel(formReferenceMonth)}` : getMonthYearLabel(formReferenceMonth)}
                </span>
              )}
            </div>
            <input
              type="month"
              value={formReferenceMonth}
              onChange={e => setFormReferenceMonth(e.target.value)}
              className="w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:light] dark:[color-scheme:dark] transition-all shadow-xs"
            />
            <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
              {formPaymentMethod === "CREDITO" || isCredit
                ? `Fatura calculada automaticamente pelo fechamento (dia ${currentWallet?.diaFechamento ?? 1}) do cartão.`
                : "Mês da competência a que a despesa pertence (padrão: mês do vencimento/pagamento)."}
            </p>
          </div>

          {/* 8. Opção: Repetir despesa no próximo mês */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div
                className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  formRepeatNextMonth
                    ? "bg-purple-100 text-purple-600 dark:bg-purple-950/80 dark:text-purple-400 border border-purple-200 dark:border-purple-800"
                    : "bg-slate-200/70 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                }`}
              >
                <Repeat className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Repetir despesa no próximo mês
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 leading-snug">
                  Cria automaticamente um lançamento agendado no mês seguinte com o mesmo valor e categoria.
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={formRepeatNextMonth}
                onChange={e => setFormRepeatNextMonth(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-extrabold text-xs tracking-wider shadow-lg shadow-indigo-600/30 transition-all mt-1 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer uppercase"
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

export const EditarDespesaModal = NewPurchaseModal;
export const ExpenseFormModal = NewPurchaseModal;
