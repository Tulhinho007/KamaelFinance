/**
 * Módulo de Motor Financeiro Pessoal (TypeScript / Next.js)
 * Paridade exata 1:1 com o módulo Python `financial_engine.py`.
 */

// =====================================================================
// 1. JUROS COMPOSTOS COM APORTES MENSAIS
// =====================================================================

export interface CompoundInterestMonthRecord {
  month: number;
  label: string;
  investedCapital: number;
  interestAccumulated: number;
  totalBalance: number;
  monthlyInterestEarned: number;
}

export interface CompoundInterestResult {
  initialAmount: number;
  monthlyContribution: number;
  annualInterestRate: number;
  monthlyEffectiveRate: number;
  periodMonths: number;
  totalInvested: number;
  totalInterest: number;
  finalAmount: number;
  wealthMultiplier: number;
  timeline: CompoundInterestMonthRecord[];
}

export function calculateCompoundInterest(
  initialAmount: number,
  monthlyContribution: number,
  annualInterestRate: number, // taxa decimal (ex: 0.12 para 12%)
  periodMonths: number
): CompoundInterestResult {
  const vp = Math.max(0, initialAmount || 0);
  const pmt = Math.max(0, monthlyContribution || 0);
  const rAnual = Math.max(0, annualInterestRate || 0);
  const n = Math.max(0, Math.floor(periodMonths || 0));

  // Taxa efetiva mensal equivalente: i = (1 + r_anual)^(1/12) - 1
  const i = rAnual === 0 ? 0 : Math.pow(1 + rAnual, 1 / 12) - 1;

  let vfInitial = 0;
  let vfContributions = 0;

  if (i === 0) {
    vfInitial = vp;
    vfContributions = pmt * n;
  } else {
    const growthFactor = Math.pow(1 + i, n);
    vfInitial = vp * growthFactor;
    vfContributions = pmt * ((growthFactor - 1) / i);
  }

  const finalAmount = Math.round((vfInitial + vfContributions) * 100) / 100;
  const totalInvested = Math.round((vp + pmt * n) * 100) / 100;
  const totalInterest = Math.round((finalAmount - totalInvested) * 100) / 100;
  const wealthMultiplier = totalInvested > 0 ? Math.round((finalAmount / totalInvested) * 100) / 100 : 1.0;

  const timeline: CompoundInterestMonthRecord[] = [];
  let currentBalance = vp;
  let currentInvested = vp;

  timeline.push({
    month: 0,
    label: "Início",
    investedCapital: Math.round(currentInvested * 100) / 100,
    interestAccumulated: 0,
    totalBalance: Math.round(currentBalance * 100) / 100,
    monthlyInterestEarned: 0,
  });

  for (let m = 1; m <= n; m++) {
    const interestMonth = currentBalance * i;
    currentBalance = currentBalance + interestMonth + pmt;
    currentInvested += pmt;
    const interestAccumulated = currentBalance - currentInvested;

    const label = m % 12 === 0 && m > 0 ? `${Math.floor(m / 12)}º Ano` : `Mês ${m}`;

    timeline.push({
      month: m,
      label,
      investedCapital: Math.round(currentInvested * 100) / 100,
      interestAccumulated: Math.round(Math.max(0, interestAccumulated) * 100) / 100,
      totalBalance: Math.round(currentBalance * 100) / 100,
      monthlyInterestEarned: Math.round(interestMonth * 100) / 100,
    });
  }

  return {
    initialAmount: vp,
    monthlyContribution: pmt,
    annualInterestRate: rAnual,
    monthlyEffectiveRate: i,
    periodMonths: n,
    totalInvested,
    totalInterest,
    finalAmount,
    wealthMultiplier,
    timeline,
  };
}

// =====================================================================
// 2. RESERVA DE EMERGÊNCIA PERSONALIZADA
// =====================================================================

export type EmploymentProfile = "clt" | "public_servant" | "freelancer";

export interface EmergencyFundResult {
  profile: EmploymentProfile;
  recommendedMonths: number;
  monthlyFixedCosts: number;
  targetAmount: number;
  currentSavings: number;
  coverageMonths: number;
  coveragePercentage: number;
  remainingAmount: number;
  surplusAmount: number;
  isFullyFunded: boolean;
  statusLabel: string;
  recommendationText: string;
}

export function calculateEmergencyFund(
  monthlyFixedCosts: number,
  profile: EmploymentProfile | string,
  currentSavings: number = 0
): EmergencyFundResult {
  const costs = Math.max(0, monthlyFixedCosts || 0);
  const savings = Math.max(0, currentSavings || 0);

  let normProfile: EmploymentProfile = "clt";
  const pStr = (profile || "").toLowerCase();
  if (pStr.includes("serv") || pStr.includes("public")) normProfile = "public_servant";
  else if (pStr.includes("free") || pStr.includes("pj") || pStr.includes("auto")) normProfile = "freelancer";

  const recMonths = normProfile === "clt" ? 6 : normProfile === "public_servant" ? 4 : 12;
  const target = Math.round(costs * recMonths * 100) / 100;

  const coverageMonths = costs > 0 ? Math.round((savings / costs) * 10) / 10 : recMonths;
  const coveragePct = target > 0 ? Math.min(999, Math.round((savings / target) * 1000) / 10) : 100;

  const remaining = Math.round(Math.max(0, target - savings) * 100) / 100;
  const surplus = Math.round(Math.max(0, savings - target) * 100) / 100;
  const isFunded = savings >= target;

  let status = "";
  let rec = "";

  if (coveragePct >= 100) {
    status = "Reserva Completa e Segura";
    rec = `Excelente! Sua reserva cobre ${coverageMonths} meses de custo de vida. Qualquer valor excedente pode ser direcionado para investimentos com foco em rentabilidade.`;
  } else if (coveragePct >= 50) {
    status = "Em Construção Avançada";
    rec = `Você já possui ${coverageMonths} meses de proteção garantida. Faltam ${remaining.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} para atingir a meta ideal.`;
  } else if (coveragePct > 0) {
    status = "Fase Inicial de Cobertura";
    rec = "Primeiros passos concluídos! Mantenha a disciplina de aportes em liquidez diária (como Tesouro Selic ou CDB 100% CDI).";
  } else {
    status = "Vulnerável (Sem Reserva)";
    rec = `Atenção: qualquer imprevisto pode forçar o uso de crédito caro. Estabeleça como prioridade inicial atingir 1 mês de custo fixo.`;
  }

  return {
    profile: normProfile,
    recommendedMonths: recMonths,
    monthlyFixedCosts: costs,
    targetAmount: target,
    currentSavings: savings,
    coverageMonths,
    coveragePercentage: coveragePct,
    remainingAmount: remaining,
    surplusAmount: surplus,
    isFullyFunded: isFunded,
    statusLabel: status,
    recommendationText: rec,
  };
}

// =====================================================================
// 3. SIMULADOR DE AMORTIZAÇÃO EXTRA DE DÍVIDAS
// =====================================================================

export interface AmortizationScheduleRecord {
  month: number;
  originalBalance: number;
  acceleratedBalance: number;
  originalInterestPaid: number;
  acceleratedInterestPaid: number;
}

export interface DebtAmortizationResult {
  originalBalance: number;
  annualInterestRate: number;
  monthlyEffectiveRate: number;
  currentMonthlyPayment: number;
  extraMonthlyPayment: number;
  originalMonths: number;
  acceleratedMonths: number;
  monthsSaved: number;
  originalTotalInterest: number;
  acceleratedTotalInterest: number;
  totalInterestSaved: number;
  interestSavingsPercentage: number;
  schedule: AmortizationScheduleRecord[];
  isViable: boolean;
  errorMessage?: string;
}

export function calculateDebtAmortization(
  balance: number,
  annualInterestRate: number, // taxa decimal (ex: 0.10 para 10%)
  currentMonthlyPayment: number,
  extraMonthlyPayment: number = 0,
  maxMonthsLimit: number = 480
): DebtAmortizationResult {
  const bal = Math.max(0, balance || 0);
  const rAnual = Math.max(0, annualInterestRate || 0);
  const pmtBase = Math.max(0, currentMonthlyPayment || 0);
  const pmtExtra = Math.max(0, extraMonthlyPayment || 0);

  const i = rAnual === 0 ? 0 : Math.pow(1 + rAnual, 1 / 12) - 1;
  const firstMonthInterest = bal * i;

  if (bal <= 0 || pmtBase <= 0) {
    return {
      originalBalance: bal,
      annualInterestRate: rAnual,
      monthlyEffectiveRate: i,
      currentMonthlyPayment: pmtBase,
      extraMonthlyPayment: pmtExtra,
      originalMonths: 0,
      acceleratedMonths: 0,
      monthsSaved: 0,
      originalTotalInterest: 0,
      acceleratedTotalInterest: 0,
      totalInterestSaved: 0,
      interestSavingsPercentage: 0,
      schedule: [],
      isViable: false,
      errorMessage: "Informe um saldo devedor e uma parcela válidos.",
    };
  }

  if (pmtBase <= firstMonthInterest && i > 0) {
    return {
      originalBalance: bal,
      annualInterestRate: rAnual,
      monthlyEffectiveRate: i,
      currentMonthlyPayment: pmtBase,
      extraMonthlyPayment: pmtExtra,
      originalMonths: 0,
      acceleratedMonths: 0,
      monthsSaved: 0,
      originalTotalInterest: 0,
      acceleratedTotalInterest: 0,
      totalInterestSaved: 0,
      interestSavingsPercentage: 0,
      schedule: [],
      isViable: false,
      errorMessage: `A parcela atual (R$ ${pmtBase.toFixed(2)}) é inferior aos juros mensais iniciais (R$ ${firstMonthInterest.toFixed(2)}). Aumente a parcela base para amortizar a dívida.`,
    };
  }

  // 1. Cenário Original
  let origBal = bal;
  let origMonths = 0;
  let origTotalInterest = 0;
  const origHistory: Array<{ bal: number; interest: number }> = [{ bal: origBal, interest: 0 }];

  while (origBal > 0.01 && origMonths < maxMonthsLimit) {
    origMonths++;
    const interest = origBal * i;
    origTotalInterest += interest;
    const principal = pmtBase - interest;
    origBal = Math.max(0, origBal - principal);
    origHistory.push({ bal: origBal, interest: origTotalInterest });
  }

  // 2. Cenário Acelerado
  let accelBal = bal;
  let accelMonths = 0;
  let accelTotalInterest = 0;
  const accelHistory: Array<{ bal: number; interest: number }> = [{ bal: accelBal, interest: 0 }];
  const totalAccelPayment = pmtBase + pmtExtra;

  while (accelBal > 0.01 && accelMonths < maxMonthsLimit) {
    accelMonths++;
    const interest = accelBal * i;
    accelTotalInterest += interest;
    const principal = totalAccelPayment - interest;
    accelBal = Math.max(0, accelBal - principal);
    accelHistory.push({ bal: accelBal, interest: accelTotalInterest });
  }

  const monthsSaved = Math.max(0, origMonths - accelMonths);
  const totalInterestSaved = Math.max(0, Math.round((origTotalInterest - accelTotalInterest) * 100) / 100);
  const interestSavingsPercentage =
    origTotalInterest > 0 ? Math.round((totalInterestSaved / origTotalInterest) * 1000) / 10 : 0;

  const maxDuration = Math.max(origMonths, accelMonths);
  const schedule: AmortizationScheduleRecord[] = [];
  const step = maxDuration <= 36 ? 1 : maxDuration <= 120 ? 6 : 12;

  for (let m = 0; m <= maxDuration; m++) {
    if (m === 0 || m % step === 0 || m === accelMonths || m === origMonths) {
      const o = m < origHistory.length ? origHistory[m] : { bal: 0, interest: origTotalInterest };
      const a = m < accelHistory.length ? accelHistory[m] : { bal: 0, interest: accelTotalInterest };

      schedule.push({
        month: m,
        originalBalance: Math.round(o.bal * 100) / 100,
        acceleratedBalance: Math.round(a.bal * 100) / 100,
        originalInterestPaid: Math.round(o.interest * 100) / 100,
        acceleratedInterestPaid: Math.round(a.interest * 100) / 100,
      });
    }
  }

  return {
    originalBalance: bal,
    annualInterestRate: rAnual,
    monthlyEffectiveRate: i,
    currentMonthlyPayment: pmtBase,
    extraMonthlyPayment: pmtExtra,
    originalMonths: origMonths,
    acceleratedMonths: accelMonths,
    monthsSaved,
    originalTotalInterest: Math.round(origTotalInterest * 100) / 100,
    acceleratedTotalInterest: Math.round(accelTotalInterest * 100) / 100,
    totalInterestSaved,
    interestSavingsPercentage,
    schedule,
    isViable: true,
  };
}

// =====================================================================
// 4. COMPARADOR À VISTA COM DESCONTO VS. PARCELADO NO CDI
// =====================================================================

export type PaymentRecommendation = "A_VISTA" | "PARCELADO" | "INDIFERENTE";

export interface CashVsInstallmentsCashFlowRecord {
  month: number;
  installmentPaid: number;
  investmentYield: number;
  remainingInvestmentBalance: number;
}

export interface CashVsInstallmentsResult {
  fullPrice: number;
  cashDiscountPercent: number;
  cashPrice: number;
  cashDiscountAmount: number;
  installmentsCount: number;
  installmentValue: number;
  cdiAnnualRate: number;
  cdiMonthlyEffectiveRate: number;
  netCdiMonthlyRate: number;
  taxRatePercent: number;
  finalInvestmentSurplus: number;
  netInterestEarned: number;
  opportunityAdvantageAmount: number;
  recommendation: PaymentRecommendation;
  breakEvenDiscountPercent: number;
  reasoning: string;
  cashFlowTimeline: CashVsInstallmentsCashFlowRecord[];
}

export function calculateCashVsInstallment(
  fullPrice: number,
  cashDiscountPercent: number,
  installmentsCount: number,
  cdiAnnualRate: number, // taxa percentual (ex: 13.65 para 13.65%)
  taxRatePercent: number = 15.0,
  firstInstallmentImmediate: boolean = false
): CashVsInstallmentsResult {
  const price = Math.max(0, fullPrice || 0);
  const discountPct = Math.min(99.99, Math.max(0, cashDiscountPercent || 0));
  const count = Math.max(1, Math.floor(installmentsCount || 1));
  const cdiRate = Math.max(0, cdiAnnualRate || 0);
  const taxPct = Math.min(99, Math.max(0, taxRatePercent || 0));

  const discRatio = discountPct / 100;
  const cashPrice = Math.round(price * (1 - discRatio) * 100) / 100;
  const discountAmount = Math.round((price - cashPrice) * 100) / 100;
  const installmentVal = Math.round((price / count) * 100) / 100;

  const grossCdiMonthly = cdiRate > 0 ? Math.pow(1 + cdiRate / 100, 1 / 12) - 1 : 0;
  const netCdiMonthly = grossCdiMonthly * (1 - taxPct / 100);

  let investedBalance = cashPrice;
  const timeline: CashVsInstallmentsCashFlowRecord[] = [];
  let totalYield = 0;

  if (firstInstallmentImmediate) {
    investedBalance -= installmentVal;
  }

  timeline.push({
    month: 0,
    installmentPaid: firstInstallmentImmediate ? installmentVal : 0,
    investmentYield: 0,
    remainingInvestmentBalance: Math.round(investedBalance * 100) / 100,
  });

  for (let m = 1; m <= count; m++) {
    if (firstInstallmentImmediate && m === count) {
      break;
    }
    const mYield = investedBalance * netCdiMonthly;
    totalYield += mYield;
    investedBalance = investedBalance + mYield - installmentVal;

    timeline.push({
      month: m,
      installmentPaid: installmentVal,
      investmentYield: Math.round(mYield * 100) / 100,
      remainingInvestmentBalance: Math.round(investedBalance * 100) / 100,
    });
  }

  const finalSurplus = Math.round(investedBalance * 100) / 100;

  // Break-even discount rate
  let breakEvenDiscount = 0;
  if (netCdiMonthly > 0) {
    let presentValueFactor = 0;
    for (let t = 1; t <= count; t++) {
      presentValueFactor += 1 / Math.pow(1 + netCdiMonthly, t);
    }
    breakEvenDiscount = Math.round((1 - presentValueFactor / count) * 10000) / 100;
  }

  let recommendation: PaymentRecommendation = "INDIFERENTE";
  let diff = 0;
  let reasoning = "";

  if (finalSurplus > 1.0) {
    recommendation = "PARCELADO";
    diff = finalSurplus;
    reasoning = `O parcelamento em ${count}x é mais vantajoso. Aplicando o valor no CDI (${cdiRate}% a.a.), o rendimento líquido (R$ ${totalYield.toFixed(2)}) supera o desconto oferecido, resultando em um ganho extra de R$ ${diff.toFixed(2)}.`;
  } else if (finalSurplus < -1.0) {
    recommendation = "A_VISTA";
    diff = Math.abs(finalSurplus);
    reasoning = `O pagamento À Vista é a melhor decisão. O desconto de ${discountPct}% (R$ ${discountAmount.toFixed(2)}) supera com folga o rendimento do CDI, gerando uma economia real de R$ ${diff.toFixed(2)}.`;
  } else {
    recommendation = "INDIFERENTE";
    diff = 0;
    reasoning = `As duas opções são financeiramente equivalentes. O rendimento líquido do CDI empata com o desconto à vista.`;
  }

  return {
    fullPrice: price,
    cashDiscountPercent: discountPct,
    cashPrice,
    cashDiscountAmount: discountAmount,
    installmentsCount: count,
    installmentValue: installmentVal,
    cdiAnnualRate: cdiRate,
    cdiMonthlyEffectiveRate: grossCdiMonthly,
    netCdiMonthlyRate: netCdiMonthly,
    taxRatePercent: taxPct,
    finalInvestmentSurplus: finalSurplus,
    netInterestEarned: Math.round(totalYield * 100) / 100,
    opportunityAdvantageAmount: Math.round(diff * 100) / 100,
    recommendation,
    breakEvenDiscountPercent: Math.max(0, breakEvenDiscount),
    reasoning,
    cashFlowTimeline: timeline,
  };
}

// =====================================================================
// UTILITÁRIOS DE FORMATAÇÃO
// =====================================================================

export function formatBRL(value: number): string {
  return (value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatPercent(value: number, decimals: number = 2): string {
  return `${(value || 0).toFixed(decimals)}%`;
}
