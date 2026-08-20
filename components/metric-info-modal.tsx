"use client";

import React from "react";
import { X, Calculator, ArrowUpRight, ArrowDownRight, Sparkles, Scale, Target, DollarSign, ShieldCheck } from "lucide-react";

const brl = (v: number) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export type MetricKey =
  | "RECEITA_REAL"
  | "TOTAL_GASTO"
  | "BALANCO_GERAL"
  | "METAS_GLOBAIS"
  | "SALDO_ATUAL"
  | "SALDO_PROJETADO"
  | "ENTRADAS_PREVISTAS"
  | "SAIDAS_PREVISTAS";

interface EquationStep {
  label: string;
  value: string;
  isPositive?: boolean;
  isNegative?: boolean;
  isNeutral?: boolean;
  isBold?: boolean;
  highlight?: "emerald" | "rose" | "indigo";
}

interface ContentConfig {
  title: string;
  badge: string;
  badgeColor: string;
  icon: any;
  iconBg: string;
  formula: string;
  description: string;
  equationSteps: EquationStep[];
  auditNote: string;
}

interface MetricInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  metricKey: MetricKey | null;
  dashboardData: any;
  projectionData: any;
  projectionDays: 30 | 60;
}

export function MetricInfoModal({
  isOpen,
  onClose,
  metricKey,
  dashboardData,
  projectionData,
  projectionDays,
}: MetricInfoModalProps) {
  if (!isOpen || !metricKey) return null;

  const currentBal = projectionData?.currentBalance || 0;
  const projBal = projectionData?.projectedFinalBalance || 0;
  const futInc = projectionData?.totalFutureIncome || 0;
  const futExp = projectionData?.totalFutureExpense || 0;

  const recReal = dashboardData?.totalReceitas || 0;
  const totGasto = dashboardData?.totalGastos || 0;
  const balGeral = dashboardData?.balanco || 0;
  const metasPct = dashboardData?.metasGlobaisPct || 0;

  // Configurações específicas por métrica
  const getContent = (): ContentConfig | null => {
    switch (metricKey) {
      case "RECEITA_REAL":
        return {
          title: "Receita Real (Efetivada)",
          badge: "Realizado",
          badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
          icon: ArrowUpRight,
          iconBg: "bg-emerald-500/10 text-emerald-600",
          formula: "Receita Real = ∑ (Receitas com Status \"RECEBIDO\")",
          description: "Métrica baseada estritamente no fluxo de caixa já ocorrido. Soma apenas as entradas de dinheiro que foram confirmadas e marcadas como recebidas nas contas.",
          equationSteps: [
            { label: "Total de Receitas Liquidadas", value: brl(recReal), isPositive: true },
            { label: "Receitas Pendentes (Fora do Balanço)", value: "Excluídas do acumulado realizado", isNeutral: true },
          ],
          auditNote: "Lançamentos com status 'Pendente' ou agendados para datas futuras não entram nesta contagem até que sejam dados como recebidos."
        };

      case "TOTAL_GASTO":
        return {
          title: "Total Gasto (Efetivado)",
          badge: "Realizado",
          badgeColor: "bg-rose-500/10 text-rose-600 border-rose-500/20",
          icon: ArrowDownRight,
          iconBg: "bg-rose-500/10 text-rose-600",
          formula: "Total Gasto = ∑ (Despesas Efetivamente Pagas em Contas / Cartões)",
          description: "Soma todas as saídas financeiras que foram quitadas. Exclui contas a pagar em aberto e gastos em cartões de vale alimentação/refeição (VA/VR).",
          equationSteps: [
            { label: "Total de Saídas Quitadas", value: brl(totGasto), isNegative: true },
            { label: "Contas a Pagar em Aberto", value: "Excluídas do total gasto até a quitação", isNeutral: true },
          ],
          auditNote: "Faturas e despesas pendentes são computadas como Saídas Previstas na projeção futura e só entram aqui após confirmação de pagamento."
        };

      case "BALANCO_GERAL":
        return {
          title: "Balanço Geral (Resultado Efetivo)",
          badge: "Balanço Líquido",
          badgeColor: balGeral >= 0 ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border-rose-500/20",
          icon: Scale,
          iconBg: balGeral >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600",
          formula: "Balanço Geral = Receita Real - Total Gasto",
          description: "Demonstrativo do resultado financeiro líquido das operações corporativas e pessoais, considerando estritamente o dinheiro movimentado.",
          equationSteps: [
            { label: "(+) Receita Realizada", value: brl(recReal), isPositive: true },
            { label: "(-) Total Gasto Efetivado", value: `-${brl(totGasto)}`, isNegative: true },
            { label: "(=) Balanço Geral Líquido", value: brl(balGeral), isBold: true, highlight: balGeral >= 0 ? "emerald" : "rose" },
          ],
          auditNote: "Se o resultado for positivo, a operação acumula superávit. Se for negativo, há um déficit acumulado no caixa."
        };

      case "METAS_GLOBAIS":
        return {
          title: "Metas Globais (% Conclusão)",
          badge: "Progresso Financeiro",
          badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
          icon: Target,
          iconBg: "bg-indigo-500/10 text-indigo-600",
          formula: "Progresso Metas (%) = (Total Acumulado ÷ Objetivo Total) × 100",
          description: "Indicador consolidado que mensura o nível global de atingimento das suas metas financeiras cadastradas no sistema.",
          equationSteps: [
            { label: "Percentual Global de Conclusão", value: `${metasPct}%`, isBold: true, highlight: "indigo" },
          ],
          auditNote: "Para acompanhar o progresso individual de cada meta, acesse a aba 'Metas' no menu lateral."
        };

      case "SALDO_ATUAL":
        return {
          title: "Saldo Atual (Hoje)",
          badge: "Caixa em Tempo Real",
          badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
          icon: DollarSign,
          iconBg: "bg-indigo-500/10 text-indigo-600",
          formula: "Saldo Atual = ∑ (Saldos Iniciais + Receitas Recebidas - Despesas Pagas até Hoje)",
          description: "Disponibilidade financeira imediata em todas as contas correntes e carteiras ativas no dia de hoje.",
          equationSteps: [
            { label: "Saldo Líquido em Caixa Hoje", value: brl(currentBal), isBold: true, highlight: "indigo" },
          ],
          auditNote: "Este valor é a base inicial utilizada para calcular a projeção temporal dos próximos 30 ou 60 dias."
        };

      case "SALDO_PROJETADO":
        return {
          title: `Saldo Projetado (${projectionDays} Dias)`,
          badge: "Fluxo Futuro",
          badgeColor: projBal >= 0 ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border-rose-500/20",
          icon: Sparkles,
          iconBg: "bg-indigo-500/10 text-indigo-600",
          formula: `Saldo Projetado (${projectionDays}D) = Saldo Atual + Entradas Previstas - Saídas Previstas (Não Pagas)`,
          description: "Modelagem matemática que projeta a evolução temporal do seu caixa ao término da janela selecionada.",
          equationSteps: [
            { label: "(+) Saldo Atual em Caixa (Hoje)", value: brl(currentBal), isNeutral: true },
            { label: `(+) Entradas Previstas (${projectionDays}d)`, value: `+${brl(futInc)}`, isPositive: true },
            { label: `(-) Saídas Previstas Não Pagas (${projectionDays}d)`, value: `-${brl(futExp)}`, isNegative: true },
            { label: `(=) Saldo Projetado ao Final (${projectionDays}d)`, value: brl(projBal), isBold: true, highlight: projBal >= 0 ? "emerald" : "rose" },
          ],
          auditNote: "Permite visualizar com antecedência se a sua empresa/caixa terá superávit ou necessidade de capital de giro."
        };

      case "ENTRADAS_PREVISTAS":
        return {
          title: `Entradas Previstas (${projectionDays} Dias)`,
          badge: "Previsão de Receita",
          badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
          icon: ArrowUpRight,
          iconBg: "bg-emerald-500/10 text-emerald-600",
          formula: `Entradas Previstas = ∑ (Receitas do Período de ${projectionDays} Dias)`,
          description: "Soma todas as receitas programadas ou pendentes que se espera receber dentro do período de projeção.",
          equationSteps: [
            { label: `Total de Entradas Previstas (${projectionDays}d)`, value: `+${brl(futInc)}`, isPositive: true, isBold: true },
          ],
          auditNote: "Inclui salários, recebimentos de clientes, rendimentos e receitas agendadas pendentes de quitação."
        };

      case "SAIDAS_PREVISTAS":
        return {
          title: `Saídas Previstas (${projectionDays} Dias)`,
          badge: "Contas a Pagar",
          badgeColor: "bg-rose-500/10 text-rose-600 border-rose-500/20",
          icon: ArrowDownRight,
          iconBg: "bg-rose-500/10 text-rose-600",
          formula: `Saídas Previstas = ∑ (Despesas com Status "NÃO PAGO" no Período)`,
          description: "Soma estritamente os compromissos financeiros e contas em aberto que estão pendentes de pagamento no período.",
          equationSteps: [
            { label: `Total de Contas a Pagar Pendentes (${projectionDays}d)`, value: `-${brl(futExp)}`, isNegative: true, isBold: true },
          ],
          auditNote: "Despesas que já foram pagas são excluídas desta contagem pois já foram descontadas do Saldo Atual."
        };

      default:
        return null;
    }
  };

  const content = getContent();
  if (!content) return null;

  const IconComp = content.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        
        {/* Topo do Modal */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${content.iconBg}`}>
              <IconComp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {content.title}
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${content.badgeColor}`}>
                  {content.badge}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Transparência e detalhamento da fórmula de cálculo.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 flex flex-col gap-5 max-h-[75vh] overflow-y-auto">
          
          {/* Caixa de Fórmula Matemática */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-inner">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1.5">
              <Calculator className="w-3.5 h-3.5" /> Fórmula de Cálculo
            </div>
            <p className="font-mono text-xs font-semibold text-slate-200 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              {content.formula}
            </p>
          </div>

          {/* Descrição em linguagem simples */}
          <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            <p className="font-medium">{content.description}</p>
          </div>

          {/* Passo a passo da Equação / Subtotais */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Demonstrativo Passo a Passo
            </span>
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 flex flex-col gap-2.5">
              {content.equationSteps.map((step, idx) => (
                <div
                  key={idx}
                  className={`flex justify-between items-center text-xs py-1.5 border-b border-slate-100 dark:border-slate-800/60 last:border-0 ${
                    step.isBold ? "font-extrabold text-sm pt-2" : "font-medium text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <span>{step.label}</span>
                  <span
                    className={`font-tnum tabular-nums ${
                      step.isPositive
                        ? "text-emerald-600 dark:text-emerald-400 font-bold"
                        : step.isNegative
                        ? "text-rose-500 font-bold"
                        : step.highlight === "emerald"
                        ? "text-emerald-600 dark:text-emerald-400 font-extrabold"
                        : step.highlight === "rose"
                        ? "text-rose-500 font-extrabold"
                        : step.highlight === "indigo"
                        ? "text-indigo-600 dark:text-indigo-400 font-extrabold"
                        : "text-slate-900 dark:text-white"
                    }`}
                  >
                    {step.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Nota de Auditoria / Regras */}
          <div className="flex items-start gap-2.5 bg-indigo-500/5 dark:bg-indigo-500/10 p-3.5 rounded-2xl border border-indigo-500/15 text-xs text-indigo-700 dark:text-indigo-300 font-medium">
            <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <p className="leading-snug">{content.auditNote}</p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
}
