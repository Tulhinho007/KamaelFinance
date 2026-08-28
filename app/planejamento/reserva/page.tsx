"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Plus, HelpCircle, Sparkles, X, Calculator, Wallet, CheckCircle2, Info } from "lucide-react";
import { getEmergencyFundOverviewAction, addEmergencyFundAporteAction } from "@/lib/emergency-fund-actions";
import { useModal } from "@/components/ui/custom-dialog-provider";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function EmergencyFundPage() {
  const { showAlert } = useModal();
  const [loading, setLoading] = useState(true);
  const [data, setData]       = useState<any>(null);

  // Modais
  const [helpModalOpen, setHelpModalOpen]     = useState(false);
  const [aporteModalOpen, setAporteModalOpen] = useState(false);

  // Form de Aporte
  const [aporteAmount, setAporteAmount]   = useState<number | "">("");
  const [aporteDate, setAporteDate]       = useState<string>(new Date().toISOString().split("T")[0]);
  const [aporteWalletId, setAporteWalletId] = useState<string>("");
  const [savingAporte, setSavingAporte]   = useState(false);

  // Slider de Simulação de Aporte Mensal
  const [simulatedAporte, setSimulatedAporte] = useState<number>(500);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getEmergencyFundOverviewAction();
      setData(res);
      if (res.wallets && res.wallets.length > 0) {
        setAporteWalletId(res.wallets[0].id);
      }
    } catch (e) {
      console.error("Erro ao carregar fundo de emergência:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveAporte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aporteAmount || Number(aporteAmount) <= 0) {
      showAlert("Informe um valor válido maior que zero para o aporte.", { variant: "warning" });
      return;
    }
    if (!aporteWalletId) {
      showAlert("Selecione a conta de origem para o aporte.", { variant: "warning" });
      return;
    }

    setSavingAporte(true);
    try {
      await addEmergencyFundAporteAction({
        amount: Number(aporteAmount),
        dateStr: aporteDate,
        walletId: aporteWalletId,
        description: "Aporte na Reserva de Emergência"
      });
      await loadData();
      setAporteModalOpen(false);
      setAporteAmount("");
      showAlert("Aporte registrado com sucesso na sua Reserva!", { variant: "success" });
    } catch (err) {
      console.error(err);
      showAlert("Erro ao registrar aporte. Tente novamente.", { variant: "error" });
    } finally {
      setSavingAporte(false);
    }
  };

  // Projeção do tempo para atingir 6 meses de reserva
  let monthsToGoal = 0;
  if (data && data.remainingFor6Months > 0 && simulatedAporte > 0) {
    monthsToGoal = Math.ceil(data.remainingFor6Months / simulatedAporte);
  }

  // Porcentagem da Meta de 6 meses atingida
  const pctTarget6Months = data && data.target6Months > 0
    ? Math.min(100, Math.round((data.totalLiquidity / data.target6Months) * 100))
    : 0;

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto flex flex-col gap-8 select-none font-sans text-slate-900 dark:text-white">

      {/* Header com Navegação e Botões Principais */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/planejamento"
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Calculadora de Fundo de Emergência
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium pl-11">
            Descubra exatamente quantos meses de custo de vida a sua reserva atual cobre.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Botão de Ajuda / Explicação */}
          <button
            onClick={() => setHelpModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800/60 px-4 py-2.5 rounded-2xl transition-all cursor-pointer shadow-xs"
          >
            <HelpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Como funciona o cálculo?</span>
          </button>

          {/* Botão Principal: CTA + Registrar Aporte */}
          <button
            onClick={() => setAporteModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-2xl shadow-lg shadow-emerald-600/25 transition-all hover:scale-[1.02] border border-white/10 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Aporte / Guardar na Reserva</span>
          </button>
        </div>
      </div>

      {loading || !data ? (
        <div className="py-16 text-center text-xs text-slate-400 font-medium">Calculando reserva de emergência...</div>
      ) : (
        <div className="space-y-6">
          {/* Card Principal Gauge de Cobertura */}
          <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
            <div className="space-y-3 max-w-md flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Status de Cobertura Atual
                </span>
                <button
                  onClick={() => setHelpModalOpen(true)}
                  className="text-slate-400 hover:text-indigo-500 transition-colors p-1"
                  title="Entenda a lógica por trás do cálculo"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-black text-slate-900 dark:text-white font-tnum">
                  {data.monthsCovered}
                </span>
                <span className="text-xl font-bold text-slate-500 dark:text-slate-400">meses de reserva</span>
              </div>

              <div className="pt-1">
                <span className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-extrabold border ${
                  data.shieldLevel === "ARMORED"
                    ? "bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 border-purple-200 dark:border-purple-800/60"
                    : data.shieldLevel === "SOLID"
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60"
                    : data.shieldLevel === "MODERATE"
                    ? "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-800/60"
                    : "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/60"
                }`}>
                  {data.shieldLevel === "ARMORED" && "🟣 Blindagem Total (12+ Meses)"}
                  {data.shieldLevel === "SOLID" && "🟢 Reserva Sólida (6+ Meses Recomendados)"}
                  {data.shieldLevel === "MODERATE" && "🟡 Reserva Moderada (3 a 5 Meses)"}
                  {data.shieldLevel === "CRITICAL" && "🔴 Reserva Inicial (< 3 Meses)"}
                </span>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium pt-1">
                Com base no seu custo de vida médio de <strong>{brl(data.monthlyAverageCost)}/mês</strong> dos últimos 6 meses, sua liquidez atual de <strong>{brl(data.totalLiquidity)}</strong> garante seu padrão de vida por <strong>{data.monthsCovered} meses</strong> sem necessidade de novas receitas.
              </p>
            </div>

            {/* Barra de Progresso da Meta (6 Meses) */}
            <div className="w-full md:w-80 bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4 shrink-0">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500">Progresso Meta (6 Meses):</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{pctTarget6Months}%</span>
              </div>

              <div className="w-full h-4 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-300 dark:border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500 transition-all duration-500 rounded-full"
                  style={{ width: `${pctTarget6Months}%` }}
                />
              </div>

              <div className="flex justify-between text-[10px] text-slate-400 font-extrabold uppercase">
                <span>Guardado: {brl(data.totalLiquidity)}</span>
                <span>Meta: {brl(data.target6Months)}</span>
              </div>
            </div>
          </div>

          {/* Cards Secundários com Métricas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Patrimônio de Liquidez</span>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 font-tnum">{brl(data.totalLiquidity)}</p>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Soma acumulada em contas de liquidez</span>
            </div>

            <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Custo de Vida Médio/Mês</span>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1 font-tnum">{brl(data.monthlyAverageCost)}</p>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Média móvel de despesas (últimos 6 meses)</span>
            </div>

            <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Falta para 6 Meses</span>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-tnum">{brl(data.remainingFor6Months)}</p>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Valor necessário para a meta recomendada</span>
            </div>
          </div>

          {/* Simulador Interativo de Aportes Mensais */}
          <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Simulador de Aportes para Meta de 6 Meses</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500">Aporte Mensal Simulado:</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-tnum text-base font-black">{brl(simulatedAporte)}/mês</span>
              </div>

              <input
                type="range"
                min="100"
                max="5000"
                step="100"
                value={simulatedAporte}
                onChange={e => setSimulatedAporte(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />

              <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-800/60 text-xs font-medium text-slate-700 dark:text-slate-300">
                {monthsToGoal > 0 ? (
                  <p>
                    Aportando <strong>{brl(simulatedAporte)}</strong> por mês, você atingirá a meta recomendada de 6 meses de reserva em aproximadamente <strong>{monthsToGoal} meses</strong>.
                  </p>
                ) : (
                  <p className="text-emerald-600 dark:text-emerald-400 font-bold">
                    ✓ Parabéns! Sua reserva atual já atinge ou supera a meta recomendada de 6 meses de custo de vida.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 1: Explicação Transparente do Cálculo ─────────────────────── */}
      {helpModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden text-slate-900 dark:text-slate-100">
            
            {/* Header */}
            <div className="flex justify-between items-center px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                  <Calculator className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Entenda seu Fundo de Emergência
                  </h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Fórmulas e lógica utilizadas pelo Kamael Finance
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHelpModalOpen(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conteúdo com os 3 Pilares */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              {/* Pilar 1 */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 flex items-center justify-center text-[10px]">1</span>
                  Custo de Vida Médio
                </div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                  Calculado pela média simples de <strong>todas as suas despesas reais</strong> dos últimos 6 meses. Não leva em conta seu salário ou receitas, focando apenas no que você efetivamente gasta para manter seu padrão de vida.
                </p>
                <div className="mt-2 text-[10px] font-mono bg-indigo-50/50 dark:bg-indigo-950/60 p-2 rounded-xl text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40">
                  Fórmula: (Soma das despesas dos últimos 6 meses) ÷ 6
                </div>
              </div>

              {/* Pilar 2 */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center text-[10px]">2</span>
                  Meta Recomendada (6 Meses)
                </div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                  A literatura financeira recomenda manter de <strong>6 a 12 meses</strong> do seu custo de vida guardados em aplicações de alta liquidez e baixo risco.
                </p>
                <div className="mt-2 text-[10px] font-mono bg-emerald-50/50 dark:bg-emerald-950/60 p-2 rounded-xl text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/40">
                  Fórmula: Custo de Vida Médio × 6
                </div>
              </div>

              {/* Pilar 3 */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                  <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-300 flex items-center justify-center text-[10px]">3</span>
                  Meses de Cobertura Atual
                </div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                  Mostra a autonomia financeira do seu patrimônio atual de liquidez em relação às suas necessidades de consumo.
                </p>
                <div className="mt-2 text-[10px] font-mono bg-purple-50/50 dark:bg-purple-950/60 p-2 rounded-xl text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-900/40">
                  Fórmula: (Patrimônio Guardado na Reserva) ÷ (Custo de Vida Médio)
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setHelpModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-extrabold text-xs hover:bg-indigo-500 cursor-pointer"
              >
                ENTENDI
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── MODAL 2: Registrar Aporte na Reserva ───────────────────────────── */}
      {aporteModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden text-slate-900 dark:text-slate-100">
            
            {/* Header */}
            <div className="flex justify-between items-center px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Guardar na Reserva
                  </h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Registre um aporte para fortalecer seu fundo de emergência
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAporteModalOpen(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveAporte} className="flex flex-col gap-4 px-6 py-5">
              
              {/* Campo 1: Valor */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Valor a Guardar (R$) *
                </label>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={aporteAmount}
                  onChange={e => setAporteAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Ex: 100,00"
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm"
                />
              </div>

              {/* Campo 2: Data do Aporte */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Data do Aporte *
                </label>
                <input
                  required
                  type="date"
                  value={aporteDate}
                  onChange={e => setAporteDate(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>

              {/* Campo 3: Conta de Destino / Liquidez */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Conta de Origem / Destino *
                </label>
                <select
                  required
                  value={aporteWalletId}
                  onChange={e => setAporteWalletId(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {(data?.wallets || []).map((w: any) => (
                    <option key={w.id} value={w.id}>
                      {w.bankName || w.title} ({w.walletType === "CONTA_CORRENTE" ? "Conta Corrente" : "Outra"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Preview e feedback visual */}
              {aporteAmount && Number(aporteAmount) > 0 && data && (
                <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-2xl border border-emerald-100 dark:border-emerald-800/60 space-y-1 text-xs">
                  <span className="font-bold text-emerald-700 dark:text-emerald-300 block">
                    Impacto Instantâneo no Fundo:
                  </span>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                    Novo Patrimônio: <strong>{brl(data.totalLiquidity + Number(aporteAmount))}</strong>
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                    Novos Meses de Cobertura: <strong>{data.monthlyAverageCost > 0 ? (Math.round(((data.totalLiquidity + Number(aporteAmount)) / data.monthlyAverageCost) * 10) / 10) : 0} meses</strong>
                  </p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={savingAporte}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-xs tracking-wider shadow-lg shadow-emerald-600/30 transition-all mt-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer uppercase flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {savingAporte ? "REGISTRANDO APORTE..." : "CONFIRMAR E SALVAR APORTE"}
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
