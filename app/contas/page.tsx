"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  Wallet,
  ArrowLeft,
  Plus,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  CreditCard,
} from "lucide-react";
import { usePeriod } from "@/components/period-context";
import {
  getBankAccountsPageDataAction,
  createNewCard,
  createBankAccountMovementAction,
} from "@/lib/actions";
import { useModal } from "@/components/ui/custom-dialog-provider";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDateBR = (dateStr?: string | null) => {
  if (!dateStr) return "-";
  const clean = dateStr.split("T")[0];
  const parts = clean.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

export default function ContasBancariasPage() {
  const { selectedYear, setYear, prevYear, nextYear } = usePeriod();
  const { showAlert } = useModal();

  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [totals, setTotals] = useState({
    totalRealBalance: 0,
    totalIncomeYear: 0,
    totalDebitExpenseYear: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showAllMovements, setShowAllMovements] = useState(false);
  const [activeAccountFilter, setActiveAccountFilter] = useState<string>("ALL");

  // Modais
  const [newAccountModalOpen, setNewAccountModalOpen] = useState(false);
  const [movementModalOpen, setMovementModalOpen] = useState(false);

  // Form Conta
  const [accFormBank, setAccFormBank] = useState("");
  const [accFormHolder, setAccFormHolder] = useState("");
  const [accFormBalance, setAccFormBalance] = useState<number | "">("");
  const [accFormSaving, setAccFormSaving] = useState(false);

  // Form Movimentação
  const [movFormWalletId, setMovFormWalletId] = useState("");
  const [movFormTipo, setMovFormTipo] = useState<"ENTRADA" | "SAIDA">("SAIDA");
  const [movFormDesc, setMovFormDesc] = useState("");
  const [movFormValor, setMovFormValor] = useState<number | "">("");
  const [movFormData, setMovFormData] = useState(new Date().toISOString().split("T")[0]);
  const [movFormTipoLancamento, setMovFormTipoLancamento] = useState("DEBITO_AUTOMATICO");
  const [movFormSaving, setMovFormSaving] = useState(false);

  const loadData = async (active = true) => {
    try {
      setLoading(true);
      const data = await getBankAccountsPageDataAction(selectedYear);
      if (!active) return;
      setAccounts(data.accounts || []);
      setTransactions(data.transactions || []);
      setTotals(data.totals || { totalRealBalance: 0, totalIncomeYear: 0, totalDebitExpenseYear: 0 });
      if (data.accounts?.length > 0 && !movFormWalletId) {
        setMovFormWalletId(data.accounts[0].id);
      }
    } catch (err) {
      console.error("Erro ao carregar dados de contas bancárias:", err);
    } finally {
      if (active) setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    loadData(active);
    return () => {
      active = false;
    };
  }, [selectedYear]);

  // Handler: Criar Nova Conta Bancária
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accFormBank.trim()) {
      showAlert("Informe o nome do banco ou instituição.", { variant: "warning" });
      return;
    }
    const balanceNum = Number(accFormBalance);
    setAccFormSaving(true);
    try {
      await createNewCard({
        bankName: accFormBank.trim(),
        walletType: "CONTA_CORRENTE",
        alias: accFormBank.trim(),
        holder: accFormHolder.trim() || undefined,
        limitOrBalance: isNaN(balanceNum) ? 0 : balanceNum,
        diaFechamento: 1,
        diaVencimento: 10,
        originType: "ROLLOVER",
        targetMonth: new Date().getMonth() + 1,
        targetYear: selectedYear,
      });

      showAlert("Conta bancária cadastrada com sucesso!", { variant: "success" });
      setNewAccountModalOpen(false);
      setAccFormBank("");
      setAccFormHolder("");
      setAccFormBalance("");
      await loadData();
    } catch (err: any) {
      showAlert(err?.message || "Erro ao cadastrar conta bancária.", { variant: "error" });
    } finally {
      setAccFormSaving(false);
    }
  };

  // Handler: Registrar Movimentação
  const handleSaveMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movFormWalletId || !movFormDesc.trim() || !movFormValor || Number(movFormValor) <= 0 || !movFormData) {
      showAlert("Preencha todos os campos corretamente.", { variant: "warning" });
      return;
    }
    setMovFormSaving(true);
    try {
      await createBankAccountMovementAction({
        walletId: movFormWalletId,
        type: movFormTipo,
        description: movFormDesc.trim(),
        amount: Number(movFormValor),
        dateStr: movFormData,
        movementType: movFormTipoLancamento,
      });
      showAlert("Movimentação registrada com sucesso!", { variant: "success" });
      setMovementModalOpen(false);
      setMovFormDesc("");
      setMovFormValor("");
      await loadData();
    } catch (err: any) {
      showAlert(err?.message || "Erro ao registrar movimentação.", { variant: "error" });
    } finally {
      setMovFormSaving(false);
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    if (activeAccountFilter !== "ALL" && t.walletId !== activeAccountFilter) return false;
    return true;
  });

  const displayedMovements = showAllMovements ? filteredTransactions : filteredTransactions.slice(0, 10);

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto flex flex-col gap-8 select-none relative font-sans text-slate-900 dark:text-slate-100">
      
      {/* Top Header & Seletor de Ano */}
      <div className="flex flex-col gap-3">
        <Link
          href="/"
          prefetch={false}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 w-fit transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar para o Dashboard
        </Link>
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <Building2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              Contas Bancárias & Débito
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Controle de saldo consolidado real, extratos de débitos, Pix e transferências do ano de {selectedYear}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Seletor de Ano */}
            <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1 shadow-2xs">
              <button
                type="button"
                onClick={prevYear}
                className="px-2 py-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold text-xs cursor-pointer"
              >
                &lt;
              </button>
              <span className="px-2 text-xs font-extrabold text-slate-800 dark:text-slate-100 tabular-nums">
                {selectedYear}
              </span>
              <button
                type="button"
                onClick={nextYear}
                className="px-2 py-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold text-xs cursor-pointer"
              >
                &gt;
              </button>
            </div>

            <button
              onClick={() => setNewAccountModalOpen(true)}
              className="flex items-center gap-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              + Nova Conta
            </button>
            <button
              onClick={() => setMovementModalOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider shadow-sm shadow-indigo-600/25 transition-all hover:scale-[1.01] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              + Registrar Movimentação
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Superiores: Saldo Consolidado, Entradas e Saídas em Débito */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs relative overflow-hidden">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
            Saldo Consolidado Real
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1 tabular-nums">
            {brl(totals.totalRealBalance)}
          </p>
          <span className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-0.5 rounded-full border border-indigo-200/50 dark:border-indigo-800/40">
            <Wallet className="w-3 h-3 text-indigo-500" /> Soma de {accounts.length} {accounts.length === 1 ? "conta bancária" : "contas bancárias"}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs relative overflow-hidden">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
            Entradas no Ano ({selectedYear})
          </span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight mt-1 tabular-nums">
            + {brl(totals.totalIncomeYear)}
          </p>
          <span className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-800/40">
            <TrendingUp className="w-3 h-3 text-emerald-500" /> Salários, Pix e aportes
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs relative overflow-hidden">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
            Saídas em Débito ({selectedYear})
          </span>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight mt-1 tabular-nums">
            - {brl(totals.totalDebitExpenseYear)}
          </p>
          <span className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-0.5 rounded-full border border-rose-200/50 dark:border-rose-800/40">
            <TrendingDown className="w-3 h-3 text-rose-500" /> Boletos, Pix enviado e débito
          </span>
        </div>
      </section>

      {/* Grid: Contas Bancárias Cadastradas */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Minhas Contas Correntes & Poupança ({accounts.length})
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="h-44 bg-slate-100 dark:bg-slate-800/50 rounded-2xl animate-pulse" />
            <div className="h-44 bg-slate-100 dark:bg-slate-800/50 rounded-2xl animate-pulse" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="py-16 text-center border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/60 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Building2 className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Nenhuma conta bancária cadastrada</p>
            <button
              onClick={() => setNewAccountModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              + Cadastrar Primeira Conta
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between gap-4 group hover:border-indigo-500/40 transition-all"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-extrabold text-xs">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {acc.title}
                      </h3>
                      <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                        {acc.bankName}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/cartoes/${acc.id}`}
                    prefetch={false}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <span>Extrato</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                      Saldo Disponível
                    </span>
                    <p className={`font-black text-base sm:text-lg tabular-nums mt-0.5 ${acc.saldoAtual < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {brl(acc.saldoAtual)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                      Balanço ({selectedYear})
                    </span>
                    <p className={`font-bold text-xs tabular-nums mt-0.5 ${acc.balancoAno >= 0 ? "text-slate-800 dark:text-slate-200" : "text-rose-500"}`}>
                      {acc.balancoAno >= 0 ? `+ ${brl(acc.balancoAno)}` : `- ${brl(Math.abs(acc.balancoAno))}`}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Seção: Extrato Geral de Débitos & Movimentações no Ano */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Wallet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Extrato Anual de Movimentações ({selectedYear})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Exibindo as últimas 10 movimentações por padrão, com opção de expansão completa.
            </p>
          </div>

          {/* Filtro por Conta */}
          {accounts.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setActiveAccountFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeAccountFilter === "ALL"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                }`}
              >
                Todas ({transactions.length})
              </button>
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setActiveAccountFilter(acc.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activeAccountFilter === acc.id
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  {acc.title}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  <th className="py-3 px-4">DATA</th>
                  <th className="py-3 px-4">DESCRIÇÃO</th>
                  <th className="py-3 px-4">CONTA</th>
                  <th className="py-3 px-4">TIPO / MEIO</th>
                  <th className="py-3 px-4 text-right">VALOR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                      Nenhuma movimentação registrada para este filtro em {selectedYear}.
                    </td>
                  </tr>
                ) : (
                  displayedMovements.map((t) => {
                    const isIncome = t.type === "INCOME";
                    const pm = String(t.tags || t.paymentMethod || "").toUpperCase();
                    let badgeLabel = isIncome ? "Entrada" : "Débito";
                    let badgeColor = isIncome
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";

                    if (pm.includes("DEBITO_AUTOMATICO")) {
                      badgeLabel = "Débito Automático";
                      badgeColor = "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20";
                    } else if (pm.includes("PIX")) {
                      badgeLabel = isIncome ? "Pix Recebido" : "Pix Enviado";
                      badgeColor = isIncome
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
                    } else if (pm.includes("BOLETO")) {
                      badgeLabel = "Boleto";
                      badgeColor = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
                    } else if (pm.includes("SALARIO")) {
                      badgeLabel = "Salário";
                      badgeColor = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
                    }

                    return (
                      <tr
                        key={t.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {formatDateBR(t.paymentDate || t.date)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 dark:text-white block">
                            {t.description}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {t.walletName}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
                            {badgeLabel}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-black tabular-nums whitespace-nowrap">
                          <span className={isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                            {isIncome ? `+ ${brl(t.amount)}` : `- ${brl(t.amount)}`}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Botão de Expansão / Colapso das Movimentações */}
          {filteredTransactions.length > 10 && (
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex justify-center items-center">
              <button
                type="button"
                onClick={() => setShowAllMovements((prev) => !prev)}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {showAllMovements ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Mostrar apenas as 10 mais recentes
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Ver todas as movimentações ({filteredTransactions.length})
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Modal: Nova Conta Bancária */}
      {newAccountModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Nova Conta Bancária</h3>
                  <p className="text-[11px] text-slate-400">Cadastre conta corrente ou poupança</p>
                </div>
              </div>
              <button
                onClick={() => setNewAccountModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="flex flex-col gap-4 mt-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Nome da Instituição / Banco *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Santander, Itaú, Nubank, Bradesco"
                  value={accFormBank}
                  onChange={(e) => setAccFormBank(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Titular (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Túlio Cavalcanti"
                  value={accFormHolder}
                  onChange={(e) => setAccFormHolder(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Saldo Inicial / Saldo Atual (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={accFormBalance}
                  onChange={(e) => setAccFormBalance(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={accFormSaving}
                className="mt-2 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/25 transition-all disabled:opacity-50 cursor-pointer"
              >
                {accFormSaving ? "Cadastrando..." : "Confirmar Cadastro da Conta"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registrar Movimentação Bancária */}
      {movementModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Registrar Movimentação</h3>
                  <p className="text-[11px] text-slate-400">Lançamento de débito, Pix ou crédito em conta</p>
                </div>
              </div>
              <button
                onClick={() => setMovementModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMovement} className="flex flex-col gap-4 mt-4">
              {/* Tipo Operação */}
              <div className="flex gap-4 p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <label className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg cursor-pointer transition-all hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                  <input
                    type="radio"
                    name="tipo"
                    value="ENTRADA"
                    checked={movFormTipo === "ENTRADA"}
                    onChange={() => {
                      setMovFormTipo("ENTRADA");
                      setMovFormTipoLancamento("SALARIO");
                    }}
                    className="accent-emerald-600 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">+ Entrada</span>
                </label>

                <label className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg cursor-pointer transition-all hover:bg-rose-50 dark:hover:bg-rose-950/30">
                  <input
                    type="radio"
                    name="tipo"
                    value="SAIDA"
                    checked={movFormTipo === "SAIDA"}
                    onChange={() => {
                      setMovFormTipo("SAIDA");
                      setMovFormTipoLancamento("DEBITO_AUTOMATICO");
                    }}
                    className="accent-rose-600 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400">- Saída</span>
                </label>
              </div>

              {/* Conta de Destino */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Conta Bancária *
                </label>
                <select
                  value={movFormWalletId}
                  onChange={(e) => setMovFormWalletId(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.title} ({brl(acc.saldoAtual)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Descrição */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Descrição *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Salário, Conta de Luz, Transferência Fulano"
                  value={movFormDesc}
                  onChange={(e) => setMovFormDesc(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              {/* Valor e Data */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0,00"
                    value={movFormValor}
                    onChange={(e) => setMovFormValor(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    required
                    value={movFormData}
                    onChange={(e) => setMovFormData(e.target.value)}
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Tipo de Meio */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Tipo de Lançamento *
                </label>
                <select
                  value={movFormTipoLancamento}
                  onChange={(e) => setMovFormTipoLancamento(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                >
                  {movFormTipo === "ENTRADA" ? (
                    <>
                      <option value="SALARIO">Salário</option>
                      <option value="PIX_RECEBIDO">Pix / Transferência Recebida</option>
                      <option value="INJECAO">Ajuste de Saldo / Injeção</option>
                    </>
                  ) : (
                    <>
                      <option value="DEBITO_AUTOMATICO">Débito Automático</option>
                      <option value="BOLETO">Pagamento de Boleto</option>
                      <option value="PIX_ENVIADO">Pix / Transferência Enviada</option>
                      <option value="FATURA_CARTAO">Pagamento de Fatura</option>
                      <option value="SAQUE">Saque em Dinheiro</option>
                    </>
                  )}
                </select>
              </div>

              <button
                type="submit"
                disabled={movFormSaving}
                className="mt-2 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/25 transition-all disabled:opacity-50 cursor-pointer"
              >
                {movFormSaving ? "Registrando..." : "Confirmar Lançamento"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
