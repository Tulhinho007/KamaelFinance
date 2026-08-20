"use client";

import React, { useState, useEffect } from "react";
import { X, DollarSign, Tag } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import { getAllWalletsSimple, createCardPurchase } from "@/lib/actions";

type SimpleWallet = {
  id: string;
  title: string;
  walletType: string;
};

interface NewPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultWalletId?: string;
}

export function NewPurchaseModal({
  isOpen,
  onClose,
  onSuccess,
  defaultWalletId = "",
}: NewPurchaseModalProps) {
  const [wallets, setWallets]             = useState<SimpleWallet[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState(defaultWalletId);
  const [formType, setFormType]           = useState<"vista" | "parcelado">("vista");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory]   = useState("Alimentação");
  const [formTags, setFormTags]           = useState("");
  const [formAmount, setFormAmount]       = useState<number | "">("");
  const [formInstallmentAmount, setFormInstallmentAmount] = useState<number | "">("");
  const [formInstallmentsCount, setFormInstallmentsCount] = useState<number>(2);
  const [formDate, setFormDate]           = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving]               = useState(false);

  useEffect(() => {
    if (isOpen) {
      getAllWalletsSimple()
        .then(data => {
          setWallets(data);
          if (defaultWalletId) {
            setSelectedWalletId(defaultWalletId);
          } else if (data.length > 0 && !selectedWalletId) {
            setSelectedWalletId(data[0].id);
          }
        })
        .catch(console.error);
    }
  }, [isOpen, defaultWalletId]);

  if (!isOpen) return null;

  const currentWallet = wallets.find(w => w.id === selectedWalletId);
  const isCredit = !currentWallet || currentWallet.walletType === "CREDIT_CARD";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWalletId) {
      alert("Por favor, selecione um cartão ou conta.");
      return;
    }
    if (!formDescription || !formDate) {
      alert("Preencha a descrição e a data da compra.");
      return;
    }

    const calculatedAmount = formType === "vista" ? Number(formAmount || 0) : Number(formInstallmentAmount || 0);
    if (calculatedAmount <= 0) {
      alert("Informe um valor válido maior que zero.");
      return;
    }

    const installments = (formType === "parcelado" && isCredit) ? formInstallmentsCount : undefined;

    setSaving(true);
    try {
      await createCardPurchase(
        selectedWalletId,
        formDescription,
        formCategory,
        calculatedAmount,
        installments,
        formDate,
        formTags
      );
      if (onSuccess) onSuccess();
      onClose();
      // Reset form
      setFormDescription("");
      setFormTags("");
      setFormAmount("");
      setFormInstallmentAmount("");
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar a despesa. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden text-slate-900 dark:text-slate-100">
        
        {/* Header do Modal */}
        <div className="flex justify-between items-center px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-sm shadow-indigo-500/10">
              <DollarSign className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Lançar Despesa / Compra
              </h3>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Registre uma nova compra ou débito
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

        {/* Form Body */}
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
                  {w.title} ({w.walletType === "CREDIT_CARD" ? "Cartão de Crédito" : w.walletType === "TICKET" ? "VA/VR" : "Conta Corrente"})
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
                À Vista
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

          {/* Campo 5 & 6: Valor e Parcelas */}
          {formType === "vista" ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Valor Total (R$) *
              </label>
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={formAmount}
                onChange={e => setFormAmount(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="0.00"
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Valor da Parcela (R$) *
                </label>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formInstallmentAmount}
                  onChange={e => setFormInstallmentAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Nº de Parcelas *
                </label>
                <input
                  required
                  type="number"
                  min="2"
                  max="48"
                  value={formInstallmentsCount}
                  onChange={e => setFormInstallmentsCount(Number(e.target.value))}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
                />
              </div>
            </div>
          )}

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
            {saving ? "REGISTRANDO..." : "REGISTRAR COMPRA"}
          </button>

        </form>
      </div>
    </div>
  );
}
