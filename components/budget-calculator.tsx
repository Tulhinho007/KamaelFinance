"use client";

import React, { useState } from "react";
import {
  PieChart,
  Home,
  Sparkles,
  ShieldCheck,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  HelpCircle,
  Info,
  Wallet,
  Building2,
  Coffee,
  PiggyBank,
  Target,
  Zap
} from "lucide-react";

// ── TIPAGENS ESTRITAS ────────────────────────────────────────────────────────
export type PresetId = "50_30_20" | "70_20_10" | "80_10_10" | "50_10_40" | "custom";

export interface BudgetPreset {
  id: PresetId;
  name: string;
  tagline: string;
  necessidadesPct: number;
  desejosPct: number;
  reservaPct: number;
  reservaLabel: string;
  reservaDesc: string;
  badge: string;
  badgeColor: string;
  icon: React.ElementType;
  description: string;
}

export interface PillarData {
  key: "necessidades" | "desejos" | "reserva";
  title: string;
  subtitle: string;
  percentage: number;
  targetValue: number;
  actualSpent: number;
  icon: React.ElementType;
  color: {
    bg: string;
    border: string;
    text: string;
    badgeBg: string;
    badgeText: string;
    bar: string;
  };
  examples: string[];
}

// ── DEFINIÇÃO DOS PRESETS ───────────────────────────────────────────────────
export const BUDGET_PRESETS: BudgetPreset[] = [
  {
    id: "50_30_20",
    name: "Equilíbrio Padrão",
    tagline: "50 / 30 / 20",
    necessidadesPct: 50,
    desejosPct: 30,
    reservaPct: 20,
    reservaLabel: "Investimentos & Reserva",
    reservaDesc: "Construção de patrimônio e reserva de emergência",
    badge: "Mais Popular",
    badgeColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    icon: Sparkles,
    description: "Ideal para quem tem contas sob controle e busca crescer patrimônio mantendo qualidade de vida."
  },
  {
    id: "70_20_10",
    name: "Custo Básico Alto",
    tagline: "70 / 20 / 10",
    necessidadesPct: 70,
    desejosPct: 20,
    reservaPct: 10,
    reservaLabel: "Reserva Inicial",
    reservaDesc: "Poupança estratégica para estabilidade imediata",
    badge: "Renda Apertada",
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    icon: Building2,
    description: "Recomendado para capitais com custo de moradia alto ou fases de transição financeira."
  },
  {
    id: "80_10_10",
    name: "Sobrevivência",
    tagline: "80 / 10 / 10",
    necessidadesPct: 80,
    desejosPct: 10,
    reservaPct: 10,
    reservaLabel: "Reserva Básica",
    reservaDesc: "Proteção mínima contra imprevistos",
    badge: "Essencial",
    badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    icon: ShieldCheck,
    description: "Foco em cobrir o essencial e não contrair dívidas enquanto busca aumentar a renda líquida."
  },
  {
    id: "50_10_40",
    name: "Sair do Vermelho",
    tagline: "50 / 10 / 40",
    necessidadesPct: 50,
    desejosPct: 10,
    reservaPct: 40,
    reservaLabel: "Amortização de Dívidas",
    reservaDesc: "Quitação acelerada de cartão, cheque especial e juros altos",
    badge: "Foco em Dívidas",
    badgeColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    icon: Flame,
    description: "Modo de guerra para liquidar juros caros o mais rápido possível e recuperar a paz financeira."
  },
  {
    id: "custom",
    name: "Personalizado",
    tagline: "Customizado",
    necessidadesPct: 40,
    desejosPct: 30,
    reservaPct: 30,
    reservaLabel: "Investimentos & Metas",
    reservaDesc: "Proporção configurada livremente por você",
    badge: "Flexível",
    badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    icon: Sliders,
    description: "Ajuste fino com sliders livres para refletir sua realidade e planejamento individual."
  }
];

// ── FORMATADORES ─────────────────────────────────────────────────────────────
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export const formatBRL = (value: number) => currencyFormatter.format(isNaN(value) ? 0 : value);

// ── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export function BudgetCalculator() {
  const [selectedPresetId, setSelectedPresetId] = useState<PresetId>("50_30_20");
  const [income, setIncome] = useState<number>(5000);
  const [incomeInput, setIncomeInput] = useState<string>("5000");
  const [isSimulatingReal, setIsSimulatingReal] = useState<boolean>(true);

  // Sliders customizados
  const [customNecessidades, setCustomNecessidades] = useState<number>(50);
  const [customDesejos, setCustomDesejos] = useState<number>(30);
  const [customReserva, setCustomReserva] = useState<number>(20);

  // Gastos Reais Atuais
  const [actualNecessidades, setActualNecessidades] = useState<number>(2800);
  const [actualDesejos, setActualDesejos] = useState<number>(1600);
  const [actualReserva, setActualReserva] = useState<number>(600);

  const currentPreset = BUDGET_PRESETS.find((p) => p.id === selectedPresetId) || BUDGET_PRESETS[0];

  // Percentuais efetivos
  const pcts =
    selectedPresetId === "custom"
      ? {
          necessidades: customNecessidades,
          desejos: customDesejos,
          reserva: customReserva
        }
      : {
          necessidades: currentPreset.necessidadesPct,
          desejos: currentPreset.desejosPct,
          reserva: currentPreset.reservaPct
        };

  const customSum = customNecessidades + customDesejos + customReserva;
  const isCustomValid = customSum === 100;

  // Metas em Reais
  const targetNecessidades = (income * pcts.necessidades) / 100;
  const targetDesejos = (income * pcts.desejos) / 100;
  const targetReserva = (income * pcts.reserva) / 100;

  const handleIncomeQuickSelect = (val: number) => {
    setIncome(val);
    setIncomeInput(val.toString());
  };

  // Label dinâmica do 3º pilar
  const thirdPillarLabel =
    selectedPresetId === "50_10_40"
      ? "Amortização de Dívidas"
      : selectedPresetId === "80_10_10"
      ? "Reserva Básica"
      : selectedPresetId === "70_20_10"
      ? "Reserva Inicial"
      : "Investimentos & Reserva";

  const thirdPillarIcon = selectedPresetId === "50_10_40" ? Flame : PiggyBank;

  // Pilares Estruturados
  const pillars: PillarData[] = [
    {
      key: "necessidades",
      title: "Necessidades Básicas",
      subtitle: "Gastos essenciais e fixos de sobrevivência",
      percentage: pcts.necessidades,
      targetValue: targetNecessidades,
      actualSpent: actualNecessidades,
      icon: Home,
      color: {
        bg: "bg-blue-500/5 dark:bg-blue-500/10",
        border: "border-blue-200 dark:border-blue-900/50",
        text: "text-blue-600 dark:text-blue-400",
        badgeBg: "bg-blue-100 dark:bg-blue-900/40",
        badgeText: "text-blue-800 dark:text-blue-300",
        bar: "bg-blue-500"
      },
      examples: ["Aluguel / Financiamento", "Contas de Água, Luz, Gás", "Supermercado Essencial", "Saúde e Medicamentos", "Transporte / Combustível"]
    },
    {
      key: "desejos",
      title: "Desejos & Estilo de Vida",
      subtitle: "Lazer, conforto e escolhas pessoais",
      percentage: pcts.desejos,
      targetValue: targetDesejos,
      actualSpent: actualDesejos,
      icon: Coffee,
      color: {
        bg: "bg-amber-500/5 dark:bg-amber-500/10",
        border: "border-amber-200 dark:border-amber-900/50",
        text: "text-amber-600 dark:text-amber-400",
        badgeBg: "bg-amber-100 dark:bg-amber-900/40",
        badgeText: "text-amber-800 dark:text-amber-300",
        bar: "bg-amber-500"
      },
      examples: ["Restaurantes & Delivery", "Assinaturas & Streaming", "Passeios & Viagens", "Compras de Roupas / Supérfluos", "Hobbies & Lazer"]
    },
    {
      key: "reserva",
      title: thirdPillarLabel,
      subtitle: currentPreset.reservaDesc,
      percentage: pcts.reserva,
      targetValue: targetReserva,
      actualSpent: actualReserva,
      icon: thirdPillarIcon,
      color: {
        bg: selectedPresetId === "50_10_40" ? "bg-rose-500/5 dark:bg-rose-500/10" : "bg-emerald-500/5 dark:bg-emerald-500/10",
        border: selectedPresetId === "50_10_40" ? "border-rose-200 dark:border-rose-900/50" : "border-emerald-200 dark:border-emerald-900/50",
        text: selectedPresetId === "50_10_40" ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400",
        badgeBg: selectedPresetId === "50_10_40" ? "bg-rose-100 dark:bg-rose-900/40" : "bg-emerald-100 dark:bg-emerald-900/40",
        badgeText: selectedPresetId === "50_10_40" ? "text-rose-800 dark:text-rose-300" : "text-emerald-800 dark:text-emerald-300",
        bar: selectedPresetId === "50_10_40" ? "bg-rose-500" : "bg-emerald-500"
      },
      examples:
        selectedPresetId === "50_10_40"
          ? ["Quitação de Cartão de Crédito", "Cheque Especial", "Empréstimos Pessoais", "Acordo de Renegociação", "Financiamentos Caros"]
          : ["Reserva de Emergência (CDB 100% CDI)", "Tesouro Direto / Selic", "Fundos Imobiliários / Ações", "Previdência / Aposentadoria", "Metas de Longo Prazo"]
    }
  ];

  // Totais reais
  const totalActualSpent = actualNecessidades + actualDesejos + actualReserva;
  const remainingIncome = income - totalActualSpent;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 pb-12 animate-in fade-in duration-300">
      
      {/* ── 1. CABEÇALHO DA PÁGINA ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-2 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20 inline-flex items-center justify-center">
              <PieChart className="w-5 h-5" />
            </span>
            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
              Arquitetura Financeira
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Calculadora &amp; Guia Orçamentário
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Descubra a proporção ideal para alocar sua renda mensal entre <strong>Necessidades</strong>, <strong>Desejos</strong> e <strong>Investimentos/Dívidas</strong> de acordo com seu momento de vida.
          </p>
        </div>

        {/* Badge Informativo de Equilíbrio */}
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Regra de Ouro</div>
            <div className="text-xs font-black text-slate-800 dark:text-slate-200">
              {pcts.necessidades}% / {pcts.desejos}% / {pcts.reserva}%
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. SELETOR DE PRESETS (MODELOS DE ORÇAMENTO) ───────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5" />
            1. Escolha seu Modelo / Preset de Orçamento
          </label>
          <span className="text-[11px] font-medium text-slate-400">
            Clique para alternar as proporções
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {BUDGET_PRESETS.map((preset) => {
            const isSelected = selectedPresetId === preset.id;
            const Icon = preset.icon;

            return (
              <button
                key={preset.id}
                onClick={() => setSelectedPresetId(preset.id)}
                className={`flex flex-col text-left p-4 rounded-2xl border transition-all duration-200 relative group cursor-pointer ${
                  isSelected
                    ? "bg-white dark:bg-[#131B2E] border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg shadow-indigo-500/10 scale-[1.02]"
                    : "bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                }`}
              >
                {/* Badge do Preset */}
                <div className="flex items-center justify-between w-full mb-2.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${preset.badgeColor}`}>
                    {preset.badge}
                  </span>
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Título e Proporção */}
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {preset.name}
                </h3>
                <div className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-0.5 font-tnum">
                  {preset.tagline}
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                  {preset.description}
                </p>

                {/* Mini Barra de Distribuição Visual */}
                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 mt-3 overflow-hidden flex">
                  <div style={{ width: `${preset.necessidadesPct}%` }} className="h-full bg-blue-500" title={`Necessidades: ${preset.necessidadesPct}%`} />
                  <div style={{ width: `${preset.desejosPct}%` }} className="h-full bg-amber-500" title={`Desejos: ${preset.desejosPct}%`} />
                  <div style={{ width: `${preset.reservaPct}%` }} className={preset.id === "50_10_40" ? "h-full bg-rose-500" : "h-full bg-emerald-500"} title={`Reserva/Dívida: ${preset.reservaPct}%`} />
                </div>
              </button>
            );
          })}
        </div>

        {/* ── 2.1 PAINEL DE SLIDERS CUSTOMIZADOS (se preset for 'custom') ────── */}
        {selectedPresetId === "custom" && (
          <div className="p-5 bg-purple-500/5 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50 rounded-3xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h4 className="font-bold text-sm text-purple-950 dark:text-purple-200">
                  Configure sua Proporção Personalizada
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Soma atual:</span>
                <span
                  className={`text-xs font-black px-2.5 py-1 rounded-full border ${
                    isCustomValid
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 animate-pulse"
                  }`}
                >
                  {customSum}% {isCustomValid ? "✓ Perfeito (100%)" : "⚠️ Deve somar 100%"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Slider Necessidades */}
              <div className="space-y-1.5 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-blue-600 dark:text-blue-400">1. Necessidades</span>
                  <span className="font-black text-slate-900 dark:text-white font-tnum">{customNecessidades}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={90}
                  step={5}
                  value={customNecessidades}
                  onChange={(e) => setCustomNecessidades(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 block text-right">
                  {formatBRL((income * customNecessidades) / 100)}
                </span>
              </div>

              {/* Slider Desejos */}
              <div className="space-y-1.5 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-amber-600 dark:text-amber-400">2. Desejos</span>
                  <span className="font-black text-slate-900 dark:text-white font-tnum">{customDesejos}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={80}
                  step={5}
                  value={customDesejos}
                  onChange={(e) => setCustomDesejos(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 block text-right">
                  {formatBRL((income * customDesejos) / 100)}
                </span>
              </div>

              {/* Slider Reserva */}
              <div className="space-y-1.5 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">3. Reserva / Investimentos</span>
                  <span className="font-black text-slate-900 dark:text-white font-tnum">{customReserva}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={80}
                  step={5}
                  value={customReserva}
                  onChange={(e) => setCustomReserva(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 block text-right">
                  {formatBRL((income * customReserva) / 100)}
                </span>
              </div>
            </div>

            {!isCustomValid && (
              <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-900/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    A soma das três fatias está em <strong>{customSum}%</strong>. Ajuste os sliders para atingir exatamente 100%.
                  </span>
                </div>
                <button
                  onClick={() => {
                    setCustomNecessidades(50);
                    setCustomDesejos(30);
                    setCustomReserva(20);
                  }}
                  className="text-xs font-bold underline hover:no-underline text-rose-700 dark:text-rose-300 ml-2 cursor-pointer"
                >
                  Restaurar 50/30/20
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 3. ENTRADA DE DADOS: RENDA LÍQUIDA MENSAL & MODO SIMULAÇÃO ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Card de Entrada de Renda */}
        <div className="lg:col-span-2 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <label htmlFor="renda-liquida-input" className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                2. Informe sua Renda Líquida Mensal
              </label>
              <p className="text-xs text-slate-400 mt-0.5">
                Salário líquido após descontos (INSS/IR), pró-labore ou faturamento médio mensal.
              </p>
            </div>
            
            {/* Toggle de Simulação Real */}
            <button
              onClick={() => setIsSimulatingReal(!isSimulatingReal)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                isSimulatingReal
                  ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-700"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isSimulatingReal ? "bg-indigo-600 animate-pulse" : "bg-slate-400"}`} />
              {isSimulatingReal ? "Diagnóstico Real Ativo" : "Ativar Diagnóstico Real"}
            </button>
          </div>

          {/* Campo de Valor com visual executivo */}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-extrabold text-lg sm:text-xl">
              R$
            </span>
            <input
              id="renda-liquida-input"
              type="number"
              min={0}
              step="50"
              value={incomeInput}
              onChange={(e) => {
                setIncomeInput(e.target.value);
                setIncome(Number(e.target.value) || 0);
              }}
              placeholder="0,00"
              className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 focus:border-indigo-600 dark:focus:border-indigo-500 rounded-2xl pl-12 pr-4 py-3.5 text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-tnum tracking-tight transition-all outline-none"
            />
          </div>

          {/* Botões Rápidos de Seleção de Renda */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Atalhos Rápidos:
            </span>
            {[2500, 4000, 6000, 10000, 15000, 25000].map((quickVal) => (
              <button
                key={quickVal}
                onClick={() => handleIncomeQuickSelect(quickVal)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                  income === quickVal
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-700"
                }`}
              >
                {formatBRL(quickVal)}
              </button>
            ))}
          </div>
        </div>

        {/* Card Resumo do Mês */}
        <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                Distribuição Recomendada
              </span>
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 font-tnum">
                100% da Renda
              </span>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-tnum">
              {formatBRL(income)}
            </div>
          </div>

          {/* Barra Empilhada Multicor */}
          <div className="space-y-1.5">
            <div className="w-full h-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex shadow-inner">
              <div
                style={{ width: `${pcts.necessidades}%` }}
                className="h-full bg-blue-500 transition-all duration-300"
                title={`Necessidades: ${formatBRL(targetNecessidades)}`}
              />
              <div
                style={{ width: `${pcts.desejos}%` }}
                className="h-full bg-amber-500 transition-all duration-300"
                title={`Desejos: ${formatBRL(targetDesejos)}`}
              />
              <div
                style={{ width: `${pcts.reserva}%` }}
                className={`h-full transition-all duration-300 ${
                  selectedPresetId === "50_10_40" ? "bg-rose-500" : "bg-emerald-500"
                }`}
                title={`${thirdPillarLabel}: ${formatBRL(targetReserva)}`}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 pt-1">
              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> {pcts.necessidades}% Necessidades
              </span>
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> {pcts.desejos}% Desejos
              </span>
              <span className={`flex items-center gap-1 ${selectedPresetId === "50_10_40" ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                <span className={`w-2 h-2 rounded-full ${selectedPresetId === "50_10_40" ? "bg-rose-500" : "bg-emerald-500"}`} /> {pcts.reserva}% Foco
              </span>
            </div>
          </div>

          {/* Saldo Restante se estiver simulando gastos reais */}
          {isSimulatingReal && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Balanço Real do Mês
                </span>
                <span
                  className={`text-sm font-black font-tnum ${
                    remainingIncome >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {remainingIncome >= 0 ? `+ ${formatBRL(remainingIncome)}` : `- ${formatBRL(Math.abs(remainingIncome))}`}
                </span>
              </div>
              <span
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                  remainingIncome >= 0
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                }`}
              >
                {remainingIncome >= 0 ? "Orçamento com Folga" : "Déficit Orçamentário"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── 4. OS 3 PILARES EM CARDS DINÂMICOS COM DIAGNÓSTICO ──────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" />
            3. Metas Calculadas &amp; Diagnóstico por Pilar
          </label>
          <span className="text-[11px] text-slate-400">
            {isSimulatingReal ? "Preencha seus gastos reais para ver o diagnóstico" : "Valores calculados automaticamente"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            const diff = pillar.actualSpent - pillar.targetValue;
            const isOverBudget = diff > 0;
            const pctUsed = pillar.targetValue > 0 ? (pillar.actualSpent / pillar.targetValue) * 100 : 0;

            // Status visual por pilar
            let statusBadge = {
              text: "Dentro da Meta",
              className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
              icon: CheckCircle2
            };

            if (pillar.key === "necessidades" || pillar.key === "desejos") {
              if (diff > 0) {
                statusBadge = {
                  text: `Estourou +${formatBRL(diff)}`,
                  className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
                  icon: AlertTriangle
                };
              } else if (pctUsed >= 90) {
                statusBadge = {
                  text: "No Limite do Teto",
                  className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                  icon: Info
                };
              }
            } else {
              // 3º pilar (Investimentos/Dívidas): gastar mais/poupar mais é positivo!
              if (pillar.actualSpent >= pillar.targetValue && pillar.targetValue > 0) {
                statusBadge = {
                  text: "Meta Atingida! 🎯",
                  className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                  icon: CheckCircle2
                };
              } else {
                statusBadge = {
                  text: `Faltam ${formatBRL(Math.abs(diff))}`,
                  className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                  icon: Info
                };
              }
            }

            const StatusIcon = statusBadge.icon;

            return (
              <div
                key={pillar.key}
                className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-5 transition-all hover:shadow-md relative overflow-hidden"
              >
                {/* Linha de Destaque Superior */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${pillar.color.bar}`} />

                {/* Topo do Card */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${pillar.color.bg} ${pillar.color.text} border ${pillar.color.border}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                          {pillar.title}
                        </h3>
                        <p className="text-[11px] text-slate-400 line-clamp-1">
                          {pillar.subtitle}
                        </p>
                      </div>
                    </div>

                    <span className={`text-xs font-black px-2.5 py-1 rounded-xl border ${pillar.color.badgeBg} ${pillar.color.badgeText} font-tnum shrink-0`}>
                      {pillar.percentage}%
                    </span>
                  </div>

                  {/* Valor Recomendado (Teto / Meta) */}
                  <div className="mt-5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800/80 space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-bold uppercase tracking-wider text-[10px]">
                        {pillar.key === "reserva" ? "Meta Mensal Sugerida" : "Teto Máximo Recomendado"}
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {pillar.percentage}% da Renda
                      </span>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-tnum tracking-tight">
                      {formatBRL(pillar.targetValue)}
                    </div>
                  </div>

                  {/* Entrada de Gastos Reais (Modo Diagnóstico) */}
                  {isSimulatingReal && (
                    <div className="mt-4 space-y-2">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                        <span>Quanto você gasta/guarda hoje:</span>
                        <span className="font-black text-slate-900 dark:text-white font-tnum">
                          {formatBRL(pillar.actualSpent)}
                        </span>
                      </label>

                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                          R$
                        </span>
                        <input
                          type="number"
                          min={0}
                          step={50}
                          value={pillar.actualSpent}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            if (pillar.key === "necessidades") setActualNecessidades(val);
                            if (pillar.key === "desejos") setActualDesejos(val);
                            if (pillar.key === "reserva") setActualReserva(val);
                          }}
                          className="w-full bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-900 dark:text-white font-tnum outline-none transition-all"
                        />
                      </div>

                      {/* Barra de Progresso Real vs Teto */}
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[10px] font-semibold text-slate-400">
                          <span>Uso do teto: {Math.round(pctUsed)}%</span>
                          <span>Teto: {formatBRL(pillar.targetValue)}</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            style={{ width: `${Math.min(pctUsed, 100)}%` }}
                            className={`h-full rounded-full transition-all duration-300 ${
                              isOverBudget && pillar.key !== "reserva"
                                ? "bg-rose-500"
                                : pctUsed >= 85 && pillar.key !== "reserva"
                                ? "bg-amber-500"
                                : pillar.color.bar
                            }`}
                          />
                        </div>
                      </div>

                      {/* Badge de Diagnóstico */}
                      <div className="pt-1">
                        <div className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl border ${statusBadge.className}`}>
                          <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{statusBadge.text}</span>
                        </div>
                      </div>

                      {/* Alertas Contextuais Específicos */}
                      {pillar.key === "necessidades" && isOverBudget && (
                        <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-[11px] text-rose-700 dark:text-rose-300 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                          <span>
                            <strong>Atenção:</strong> Seus custos fixos estão comprimindo sua capacidade de poupança. Considere renegociar contratos ou mudar de preset para 70/20/10.
                          </span>
                        </div>
                      )}

                      {pillar.key === "desejos" && isOverBudget && (
                        <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                          <span>
                            <strong>Alerta:</strong> Gastos com estilo de vida acima da meta recomendada para o seu perfil. Estabeleça um teto semanal para delivery e compras supérfluas.
                          </span>
                        </div>
                      )}

                      {pillar.key === "reserva" && !isOverBudget && diff < 0 && (
                        <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-[11px] text-blue-700 dark:text-blue-300 flex items-start gap-2">
                          <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                          <span>
                            {selectedPresetId === "50_10_40"
                              ? "Aumente os aportes de amortização para reduzir os juros compostos das suas dívidas."
                              : "Tente automatizar uma transferência de poupança no mesmo dia em que o salário cai na conta."}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Exemplos do Pilar */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                    O que entra aqui:
                  </span>
                  <ul className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {pillar.examples.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 5. SEÇÃO EXPLICATIVA E EDUCACIONAL ──────────────────────────────── */}
      <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              Guia Prático dos 3 Pilares Financeiros
            </h3>
            <p className="text-xs text-slate-400">
              Aprenda a classificar seus gastos sem confusão e faça a transição para o equilíbrio ideal.
            </p>
          </div>
        </div>

        {/* 4 Cards Educacionais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Necessidades */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Home className="w-4 h-4" />
              <h4 className="font-bold text-xs uppercase tracking-wider">1. O que são Necessidades?</h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Aluguel, contas básicas, comida essencial, saúde e transporte. Se você não pagar, coloca sua estabilidade em risco imediato.
            </p>
            <div className="text-[11px] text-slate-400 font-medium pt-1">
              💡 <em>Dica:</em> Internet básica é necessidade; o pacote full com dezenas de canais é desejo.
            </div>
          </div>

          {/* Card 2: Desejos */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Coffee className="w-4 h-4" />
              <h4 className="font-bold text-xs uppercase tracking-wider">2. O que são Desejos?</h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Delivery, streaming, passeios, compras supérfluas e lazer. Tudo o que traz conforto e prazer, mas pode ser cortado se necessário.
            </p>
            <div className="text-[11px] text-slate-400 font-medium pt-1">
              💡 <em>Dica:</em> Não zere seus desejos; o segredo da consistência é o prazer consciente e planejado.
            </div>
          </div>

          {/* Card 3: Reserva / Foco */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <PiggyBank className="w-4 h-4" />
              <h4 className="font-bold text-xs uppercase tracking-wider">3. O que é Reserva / Foco?</h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Reserva de emergência (3 a 6 meses de contas), amortização acelerada de dívidas de juros altos ou investimentos para o futuro.
            </p>
            <div className="text-[11px] text-slate-400 font-medium pt-1">
              💡 <em>Dica:</em> Separe essa quantia no momento exato em que a renda cair na conta.
            </div>
          </div>

          {/* Card 4: Dica de Transição Gradual */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-200 dark:border-indigo-900/50 space-y-2">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Zap className="w-4 h-4" />
              <h4 className="font-bold text-xs uppercase tracking-wider">Dica: Transição Gradual</h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Se sua realidade hoje estiver distante da meta (ex: <strong>80 / 20 / 0</strong>), não tente mudar abruptamente para não sofrer efeito rebote.
            </p>
            <div className="text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold pt-1">
              🎯 Meta do 1º trimestre: migrar para <strong>75 / 15 / 10</strong>. Metas realistas constroem hábitos definitivos!
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}

export default BudgetCalculator;
