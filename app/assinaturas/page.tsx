"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Repeat, Plus, CheckCircle2, Clock, Pencil, Trash2, CreditCard,
  DollarSign, Calendar, Tag, AlertCircle, X, Sparkles, Wallet, RefreshCw, ChevronRight, Info, Layers
} from "lucide-react";
import { PeriodHeader } from "@/components/period-header";
import { usePeriod } from "@/components/period-context";
import { useModal } from "@/components/ui/custom-dialog-provider";
import {
  getSubscriptionsWithMonthlyStatusAction,
  createSubscriptionAction,
  updateSubscriptionAction,
  deleteSubscriptionAction,
  paySubscriptionAction,
  undoSubscriptionPaymentAction,
  batchPaySubscriptionsAction,
  SubscriptionWithStatus
} from "@/lib/subscription-actions";
import { getWalletsAction } from "@/lib/actions";

const brl = (v: number) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const YEARS_LIST = Array.from({ length: 11 }, (_, i) => 2020 + i);

const CATEGORIES = [
  "Streaming",
  "Internet",
  "Software",
  "Servidor / Cloud",
  "Academia / Saúde",
  "Educação",
  "Utilitários",
  "Outros"
];

export default function AssinaturasPage() {
  const { selectedMonth, selectedYear } = usePeriod();
  const { showAlert, showConfirm } = useModal();

  const [subscriptions, setSubscriptions] = useState<SubscriptionWithStatus[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [summary, setSummary] = useState({
    totalSubscriptionsCount: 0,
    totalMonthlyAmount: 0,
    totalPaidAmount: 0,
    totalPendingAmount: 0,
  });

  // Modal de Criar/Editar Assinatura State
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<SubscriptionWithStatus | null>(null);
  const [subName, setSubName] = useState("");
  const [subAmount, setSubAmount] = useState<number | "">("");
  const [subDueDay, setSubDueDay] = useState<number | "">(10);
  const [subCategory, setSubCategory] = useState("Streaming");
  const [subDefaultWalletId, setSubDefaultWalletId] = useState("");

  // Modal Customizado de Pagamento Único State
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [subToPay, setSubToPay] = useState<SubscriptionWithStatus | null>(null);
  const [selectedWalletId, setSelectedWalletId] = useState("");
  const [payRefMonth, setPayRefMonth] = useState<number>(selectedMonth);
  const [payRefYear, setPayRefYear] = useState<number>(selectedYear);
  const [payDate, setPayDate] = useState<string>("");
  const [skipDeduction, setSkipDeduction] = useState(false);

  // Modal Customizado de Preenchimento em Lote State
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchSubId, setBatchSubId] = useState<string>("ALL");
  const [batchStartMonth, setBatchStartMonth] = useState<number>(1); // Janeiro
  const [batchStartYear, setBatchStartYear] = useState<number>(2026);
  const [batchEndMonth, setBatchEndMonth] = useState<number>(7); // Julho
  const [batchEndYear, setBatchEndYear] = useState<number>(2026);
  const [batchWalletId, setBatchWalletId] = useState<string>("");
  const [batchSkipDeduction, setBatchSkipDeduction] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [subData, walletData] = await Promise.all([
        getSubscriptionsWithMonthlyStatusAction(selectedMonth, selectedYear),
        getWalletsAction(),
      ]);

      setSubscriptions(subData.subscriptions);
      setSummary(subData.summary);
      setWallets(walletData || []);
    } catch (err) {
      console.error("Erro ao carregar assinaturas:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handler: Abrir modal de criação
  const openCreateModal = () => {
    setEditingSub(null);
    setSubName("");
    setSubAmount("");
    setSubDueDay(10);
    setSubCategory("Streaming");
    setSubDefaultWalletId(wallets.length > 0 ? wallets[0].id : "");
    setSubModalOpen(true);
  };

  // Handler: Abrir modal de edição
  const openEditModal = (sub: SubscriptionWithStatus) => {
    setEditingSub(sub);
    setSubName(sub.name);
    setSubAmount(sub.amount);
    setSubDueDay(sub.dueDay);
    setSubCategory(sub.category || "Streaming");
    setSubDefaultWalletId(sub.defaultWalletId || (wallets.length > 0 ? wallets[0].id : ""));
    setSubModalOpen(true);
  };

  // Handler: Salvar Assinatura (Criar ou Editar)
  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim()) {
      showAlert("Por favor, informe o nome da assinatura.", { variant: "warning" });
      return;
    }
    if (subAmount === "" || Number(subAmount) <= 0) {
      showAlert("Por favor, informe um valor válido.", { variant: "warning" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: subName,
        amount: Number(subAmount),
        dueDay: Number(subDueDay) || 10,
        category: subCategory,
        defaultWalletId: subDefaultWalletId || undefined,
      };

      if (editingSub) {
        await updateSubscriptionAction(editingSub.id, payload);
        showAlert("Assinatura atualizada com sucesso!", { variant: "success" });
      } else {
        await createSubscriptionAction(payload);
        showAlert("Assinatura cadastrada com sucesso!", { variant: "success" });
      }

      setSubModalOpen(false);
      await loadData();
    } catch (err) {
      console.error(err);
      showAlert("Erro ao salvar assinatura.", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  // Handler: Excluir Assinatura
  const handleDeleteSubscription = async (sub: SubscriptionWithStatus) => {
    const confirmed = await showConfirm(
      `Tem certeza que deseja excluir a assinatura "${sub.name}"? Isso também excluirá todo o histórico de pagamentos dela.`,
      {
        title: "Excluir Assinatura",
        variant: "danger",
        confirmText: "Excluir Assinatura",
        cancelText: "Cancelar"
      }
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      await deleteSubscriptionAction(sub.id);
      showAlert("Assinatura excluída.", { variant: "info" });
      await loadData();
    } catch (err) {
      console.error(err);
      showAlert("Erro ao excluir assinatura.", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  // Handler: Abrir Modal Customizado de Pagamento Único
  const openPayModal = (sub: SubscriptionWithStatus) => {
    setSubToPay(sub);
    const defaultId = sub.defaultWalletId && wallets.some(w => w.id === sub.defaultWalletId)
      ? sub.defaultWalletId
      : (wallets.length > 0 ? wallets[0].id : "");
    setSelectedWalletId(defaultId);
    setPayRefMonth(selectedMonth);
    setPayRefYear(selectedYear);

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    setPayDate(`${yyyy}-${mm}-${dd}`);
    setSkipDeduction(false);

    setPayModalOpen(true);
  };

  // Handler: Abrir Modal de Pagamento em Lote
  const openBatchModal = (sub?: SubscriptionWithStatus) => {
    setBatchSubId(sub ? sub.id : "ALL");
    setBatchStartMonth(1); // Janeiro
    setBatchStartYear(2026);
    setBatchEndMonth(7); // Julho
    setBatchEndYear(2026);
    setBatchWalletId(sub?.defaultWalletId || (wallets.length > 0 ? wallets[0].id : ""));
    setBatchSkipDeduction(true);
    setBatchModalOpen(true);
  };

  // Handler: Confirmar Pagamento Único
  const handleConfirmPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subToPay) return;
    if (!selectedWalletId) {
      showAlert("Por favor, selecione uma conta para realizar o pagamento.", { variant: "warning" });
      return;
    }

    const selectedWallet = wallets.find(w => w.id === selectedWalletId);
    const walletTitle = selectedWallet ? (selectedWallet.bankName || selectedWallet.title) : "Conta";
    const refMonthName = MONTH_NAMES[payRefMonth - 1];
    const paidFormatted = payDate ? new Date(payDate + "T12:00:00").toLocaleDateString("pt-BR") : new Date().toLocaleDateString("pt-BR");

    setSaving(true);
    try {
      const res = await paySubscriptionAction(
        subToPay.id,
        payRefMonth,
        payRefYear,
        selectedWalletId,
        payDate,
        skipDeduction
      );

      setPayModalOpen(false);

      if (res.deductedBalance) {
        showAlert(
          `Pagamento da assinatura "${subToPay.name}" (${brl(subToPay.amount)}) realizado com sucesso!\n\n• Referência: ${refMonthName}/${payRefYear}\n• Pago em: ${paidFormatted}\n• Conta: ${walletTitle}\n• Débito: Saldo reduzido em R$ ${subToPay.amount.toFixed(2)}`,
          { variant: "success", title: "Pagamento Confirmado (Saldo Abatido)" }
        );
      } else {
        showAlert(
          `Pagamento da assinatura "${subToPay.name}" (${brl(subToPay.amount)}) sinalizado como PAGO no histórico!\n\n• Referência: ${refMonthName}/${payRefYear}\n• Data: ${paidFormatted}\n• Impacto: Registrado apenas como histórico informativo (Saldo mantido intacto).`,
          { variant: "info", title: "Pagamento Registrado (Sem Débito)" }
        );
      }

      await loadData();
    } catch (err) {
      console.error(err);
      showAlert("Erro ao processar pagamento da assinatura.", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  // Handler: Confirmar Pagamento em Lote
  const handleConfirmBatchPay = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let totalCount = 0;

      const targetSubs = batchSubId === "ALL"
        ? subscriptions
        : subscriptions.filter(s => s.id === batchSubId);

      if (targetSubs.length === 0) {
        showAlert("Nenhuma assinatura selecionada.", { variant: "warning" });
        setSaving(false);
        return;
      }

      for (const subItem of targetSubs) {
        const res = await batchPaySubscriptionsAction({
          subscriptionId: subItem.id,
          startMonth: batchStartMonth,
          startYear: batchStartYear,
          endMonth: batchEndMonth,
          endYear: batchEndYear,
          walletId: batchWalletId || undefined,
          skipBalanceDeduction: batchSkipDeduction
        });
        totalCount += res.count;
      }

      setBatchModalOpen(false);
      const startMonthName = MONTH_NAMES[batchStartMonth - 1];
      const endMonthName = MONTH_NAMES[batchEndMonth - 1];

      showAlert(
        `Preenchimento em lote concluído com sucesso!\n\n• Total de lançamentos efetuados: ${totalCount}\n• Intervalo: ${startMonthName}/${batchStartYear} até ${endMonthName}/${batchEndYear}\n• Impacto no saldo: ${batchSkipDeduction ? "Nenhum (Histórico informativo preservado)" : "Débitos efetuados nas contas"}`,
        { variant: "success", title: "Lançamento em Lote Concluído" }
      );

      await loadData();
    } catch (err) {
      console.error(err);
      showAlert("Erro ao processar o preenchimento em lote.", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  // Handler: Desfazer Pagamento
  const handleUndoPay = async (sub: SubscriptionWithStatus) => {
    const confirmed = await showConfirm(
      `Deseja desfazer o pagamento da assinatura "${sub.name}" referente a ${MONTH_NAMES[selectedMonth - 1]}/${selectedYear}? O registro do pagamento e o débito na conta serão estornados.`,
      {
        title: "Desfazer Pagamento",
        variant: "warning",
        confirmText: "Desfazer Pagamento",
        cancelText: "Cancelar"
      }
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      await undoSubscriptionPaymentAction(sub.id, selectedMonth, selectedYear);
      showAlert("Pagamento desfeito com sucesso.", { variant: "info" });
      await loadData();
    } catch (err) {
      console.error(err);
      showAlert("Erro ao desfazer pagamento.", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header com Seletor de Período */}
      <PeriodHeader
        title="Gerenciamento de Assinaturas 🔄"
        tagline="Controle suas assinaturas recorrentes (Netflix, Spotify, Internet), acompanhe pagamentos com vínculo de Mês de Referência e preencha histórico em lote."
      />

      {/* Cards Metrias do Mês */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Assinaturas */}
        <div className="card-glow p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Assinaturas Ativas</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Repeat className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-white">{summary.totalSubscriptionsCount}</h3>
            <p className="text-[10px] text-slate-500 mt-1 font-medium">Serviços cadastrados no sistema</p>
          </div>
        </div>

        {/* Card 2: Valor Total Previsto */}
        <div className="card-glow p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Custo Mensal Total</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-white">{brl(summary.totalMonthlyAmount)}</h3>
            <p className="text-[10px] text-slate-500 mt-1 font-medium">Previsto para {MONTH_NAMES[selectedMonth - 1]}/{selectedYear}</p>
          </div>
        </div>

        {/* Card 3: Total Pago no Mês */}
        <div className="card-glow p-5 rounded-2xl bg-slate-900/60 border border-emerald-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-wider">Pago no Mês</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-emerald-400">{brl(summary.totalPaidAmount)}</h3>
            <p className="text-[10px] text-slate-500 mt-1 font-medium">Abatido diretamente das contas</p>
          </div>
        </div>

        {/* Card 4: Total Pendente */}
        <div className="card-glow p-5 rounded-2xl bg-slate-900/60 border border-amber-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-amber-400 uppercase tracking-wider">Pendente no Mês</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-amber-400">{brl(summary.totalPendingAmount)}</h3>
            <p className="text-[10px] text-slate-500 mt-1 font-medium">Aguardando confirmação de pagamento</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Repeat className="w-5 h-5 text-indigo-400" />
              Assinaturas em {MONTH_NAMES[selectedMonth - 1]}/{selectedYear}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Gerencie seus serviços mensais, vincule o mês de referência e controle as datas de pagamento.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => openBatchModal()}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-extrabold rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              title="Preencher histórico de múltiplos meses em lote"
            >
              <Layers className="w-4 h-4 text-purple-400" /> Marcar Meses em Lote
            </button>

            <button
              onClick={openCreateModal}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-2xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Nova Assinatura
            </button>
          </div>
        </div>

        {/* Tabela de Assinaturas */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <th className="p-4">Assinatura / Serviço</th>
                <th className="p-4">Categoria</th>
                <th className="p-4 text-center">Vencimento</th>
                <th className="p-4 text-right">Valor Mensal</th>
                <th className="p-4">Conta Padrão</th>
                <th className="p-4 text-center">Status / Detalhes de Pagamento</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                      Carregando assinaturas...
                    </div>
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <Repeat className="w-8 h-8 text-slate-600" />
                      <p className="font-bold text-slate-400">Nenhuma assinatura cadastrada.</p>
                      <p className="text-[11px] text-slate-500">Clique no botão "Nova Assinatura" para cadastrar seu primeiro serviço recorrente.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Nome & Vínculo */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-black text-white text-sm">{sub.name}</p>
                          {sub.isPaid && sub.paidInfo ? (
                            <span className="text-[10px] text-emerald-400 font-semibold block">
                              Ref: {MONTH_NAMES[selectedMonth - 1]}/{selectedYear} — Pago em {new Date(sub.paidInfo.paidAt).toLocaleDateString("pt-BR")}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-semibold block">
                              Vencimento: Dia {sub.dueDay}/{selectedMonth.toString().padStart(2, "0")}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Categoria */}
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold">
                        <Tag className="w-3 h-3 text-indigo-400" />
                        {sub.category}
                      </span>
                    </td>

                    {/* Vencimento */}
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 font-extrabold text-slate-200 text-xs">
                        <Calendar className="w-3.5 h-3.5 text-purple-400" />
                        Dia {sub.dueDay}
                      </span>
                    </td>

                    {/* Valor */}
                    <td className="p-4 text-right">
                      <span className="font-black text-white text-sm">{brl(sub.amount)}</span>
                    </td>

                    {/* Conta Padrão */}
                    <td className="p-4">
                      <span className="text-slate-400 font-semibold text-xs flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        {sub.defaultWalletTitle || "Não especificada"}
                      </span>
                    </td>

                    {/* Status no Mês com Detalhamento de Referência e Data */}
                    <td className="p-4 text-center">
                      {sub.isPaid ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-black">
                            <CheckCircle2 className="w-4 h-4" />
                            Pago {sub.paidInfo?.paymentWalletTitle ? `(${sub.paidInfo.paymentWalletTitle})` : ""}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            Ref: {MONTH_NAMES[selectedMonth - 1]}/{selectedYear}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-black">
                          <Clock className="w-4 h-4 animate-pulse" />
                          Pendente
                        </span>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {sub.isPaid ? (
                          <button
                            onClick={() => handleUndoPay(sub)}
                            disabled={saving}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-extrabold transition-colors cursor-pointer border border-slate-700"
                            title="Desfazer Pagamento"
                          >
                            Desfazer
                          </button>
                        ) : (
                          <button
                            onClick={() => openPayModal(sub)}
                            disabled={saving}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-extrabold transition-all shadow-md shadow-emerald-600/30 cursor-pointer flex items-center gap-1"
                            title="Marcar como Pago e Definir Referência"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Pagar
                          </button>
                        )}

                        <button
                          onClick={() => openBatchModal(sub)}
                          className="p-1.5 text-slate-400 hover:text-purple-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Preencher Histórico em Lote"
                        >
                          <Layers className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(sub)}
                          className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Editar Assinatura"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSubscription(sub)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Excluir Assinatura"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CADASTRAR / EDITAR ASSINATURA */}
      {/* ========================================================================= */}
      {subModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Repeat className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {editingSub ? "Editar Assinatura" : "Nova Assinatura"}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Cadastre o serviço recorrente e o dia de vencimento.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSubModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubscription} className="space-y-4">
              {/* Nome */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Nome do Serviço / Assinatura</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Netflix, Spotify, Internet Fibra, Futevôlei"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Valor & Dia Vencimento */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Valor Mensal (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0,00"
                    value={subAmount}
                    onChange={(e) => setSubAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Dia Vencimento (1 a 31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    placeholder="05"
                    value={subDueDay}
                    onChange={(e) => setSubDueDay(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Categoria */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Categoria</label>
                <select
                  value={subCategory}
                  onChange={(e) => setSubCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Conta Padrão */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Conta Padrão para Pagamento</label>
                <select
                  value={subDefaultWalletId}
                  onChange={(e) => setSubDefaultWalletId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Selecione uma conta padrão (Opcional)</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.bankName || w.title} ({brl(w.currentTotal)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSubModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  {saving ? "Salvando..." : editingSub ? "Atualizar" : "Salvar Assinatura"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CUSTOM PAGAMENTO DE ASSINATURA (DARK GLASSMORPHISM) */}
      {/* ========================================================================= */}
      {payModalOpen && subToPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Confirmar Pagamento</h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Defina o Mês de Referência, a Conta e a Data Real do Pagamento.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPayModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumo da Assinatura no Modal */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Assinatura:</span>
                <span className="font-black text-white">{subToPay.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Valor a Pagar:</span>
                <span className="font-black text-emerald-400 text-sm">{brl(subToPay.amount)}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmPay} className="space-y-4">
              {/* Seleção de Conta / Banco */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                  <Wallet className="w-4 h-4 text-indigo-400" />
                  Com qual conta deseja pagar?
                </label>
                <select
                  required
                  value={selectedWalletId}
                  onChange={(e) => setSelectedWalletId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  <option value="" disabled>
                    Selecione uma conta ou cartão...
                  </option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.bankName || w.title} — Saldo: {brl(w.currentTotal)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mês de Referência (Competência) */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  Mês de Referência (Competência)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={payRefMonth}
                    onChange={(e) => setPayRefMonth(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  >
                    {MONTH_NAMES.map((m, idx) => (
                      <option key={m} value={idx + 1}>
                        {m}
                      </option>
                    ))}
                  </select>

                  <select
                    value={payRefYear}
                    onChange={(e) => setPayRefYear(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  >
                    {YEARS_LIST.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Data Real do Pagamento (Fluxo de Caixa) */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  Data Real do Pagamento (Fluxo de Caixa)
                </label>
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2 text-xs text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              {/* Opção 'Registrar sem Afetar Saldo' (Checkbox) */}
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <input
                  type="checkbox"
                  id="skipDeduction"
                  checked={skipDeduction}
                  onChange={(e) => setSkipDeduction(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500/30 cursor-pointer"
                />
                <label htmlFor="skipDeduction" className="text-xs text-slate-300 font-medium cursor-pointer select-none">
                  <strong className="block text-white font-bold">Saldo já considerado (não descontar da conta)</strong>
                  Sinaliza a assinatura como Paga apenas no histórico informativo, sem subtrair nenhum valor do saldo atual da conta.
                </label>
              </div>

              {/* Banner / Alerta Explicativo Dinâmico de Trava de Segurança */}
              {(() => {
                const todayStr = new Date().toISOString().split("T")[0];
                const isRetroactive = payDate && payDate < todayStr;

                if (isRetroactive) {
                  return (
                    <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-[11px] text-amber-300 font-medium space-y-1">
                      <p className="flex items-center gap-1.5 font-extrabold text-amber-200">
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" /> Trava de Impacto no Saldo (Data Retroativa):
                      </p>
                      <p>
                        A data de pagamento ({payDate ? new Date(payDate + "T12:00:00").toLocaleDateString("pt-BR") : ""}) é anterior a hoje. O lançamento será registrado apenas como <strong>histórico informativo</strong> na referência de <strong>{MONTH_NAMES[payRefMonth - 1]}/{payRefYear}</strong>, <strong>sem descontar nada da conta</strong> para manter o saldo atual intacto.
                      </p>
                    </div>
                  );
                }

                if (skipDeduction) {
                  return (
                    <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-[11px] text-indigo-300 font-medium space-y-1">
                      <p className="flex items-center gap-1.5 font-extrabold text-indigo-200">
                        <Info className="w-4 h-4 shrink-0 text-indigo-400" /> Registro sem Débito no Saldo:
                      </p>
                      <p>
                        Você marcou a opção de saldo já considerado. A assinatura ficará <strong>Paga</strong> na referência de <strong>{MONTH_NAMES[payRefMonth - 1]}/{payRefYear}</strong> sem subtrair nenhum valor das contas.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-[11px] text-emerald-300 font-medium space-y-1">
                    <p className="flex items-center gap-1.5 font-extrabold text-emerald-200">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> Débito em Tempo Real:
                    </p>
                    <p>
                      O valor de <strong>{brl(subToPay.amount)}</strong> será debitado diretamente do saldo da conta na data <strong>{payDate ? new Date(payDate + "T12:00:00").toLocaleDateString("pt-BR") : "hoje"}</strong> e dará baixa na referência de <strong>{MONTH_NAMES[payRefMonth - 1]}/{payRefYear}</strong>.
                    </p>
                  </div>
                );
              })()}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Processando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Confirmar Pagamento
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PREENCHIMENTO EM LOTE (BATCH PAY MODAL) */}
      {/* ========================================================================= */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Marcar Meses em Lote</h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Preencha o histórico de pagamentos de múltiplos meses de uma só vez.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBatchModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmBatchPay} className="space-y-4">
              {/* Assinatura Alvo */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <CreditCard className="w-4 h-4 text-indigo-400" />
                  Assinatura a Processar
                </label>
                <select
                  value={batchSubId}
                  onChange={(e) => setBatchSubId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">Todas as Assinaturas ({subscriptions.length})</option>
                  {subscriptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({brl(s.amount)}/mês)
                    </option>
                  ))}
                </select>
              </div>

              {/* Intervalo Inicial e Final */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Inicial */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-purple-400" /> Mês Inicial
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={batchStartMonth}
                      onChange={(e) => setBatchStartMonth(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white font-bold"
                    >
                      {MONTH_NAMES.map((m, idx) => (
                        <option key={m} value={idx + 1}>
                          {m}
                        </option>
                      ))}
                    </select>

                    <select
                      value={batchStartYear}
                      onChange={(e) => setBatchStartYear(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white font-bold"
                    >
                      {YEARS_LIST.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Final */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-purple-400" /> Mês Final
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={batchEndMonth}
                      onChange={(e) => setBatchEndMonth(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white font-bold"
                    >
                      {MONTH_NAMES.map((m, idx) => (
                        <option key={m} value={idx + 1}>
                          {m}
                        </option>
                      ))}
                    </select>

                    <select
                      value={batchEndYear}
                      onChange={(e) => setBatchEndYear(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white font-bold"
                    >
                      {YEARS_LIST.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Conta Padrão */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-indigo-400" /> Conta / Banco de Origem (Opcional)
                </label>
                <select
                  value={batchWalletId}
                  onChange={(e) => setBatchWalletId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Selecione a conta de origem...</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.bankName || w.title} ({brl(w.currentTotal)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Checkbox Opção 'Histórico passado (não afetar saldo das contas)' */}
              <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                <input
                  type="checkbox"
                  id="batchSkipDeduction"
                  checked={batchSkipDeduction}
                  onChange={(e) => setBatchSkipDeduction(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500/30 cursor-pointer"
                />
                <label htmlFor="batchSkipDeduction" className="text-xs text-slate-300 font-medium cursor-pointer select-none">
                  <strong className="block text-white font-bold">Histórico passado (não afetar saldo das contas)</strong>
                  Marca todos os meses do intervalo como PAGO sem subtrair nenhum valor dos saldos atuais cadastrados.
                </label>
              </div>

              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-[11px] text-purple-300 font-medium space-y-1">
                <p className="flex items-center gap-1.5 font-extrabold text-purple-200">
                  <Sparkles className="w-4 h-4 shrink-0 text-purple-400" /> Resumo da Ação em Lote:
                </p>
                <p>
                  Será gerado o histórico de pagamento de <strong>{MONTH_NAMES[batchStartMonth - 1]}/{batchStartYear}</strong> até <strong>{MONTH_NAMES[batchEndMonth - 1]}/{batchEndYear}</strong> para {batchSubId === "ALL" ? "todas as assinaturas" : "a assinatura selecionada"}.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setBatchModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Processando...
                    </>
                  ) : (
                    <>
                      <Layers className="w-4 h-4" /> Confirmar Lançamentos em Lote
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
