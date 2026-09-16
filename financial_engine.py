"""
Módulo de Motor Financeiro Pessoal (Financial Engine)
Desenvolvido em Python 3 puro utilizando dataclasses e tipagem estrita.

Contém as 4 calculadoras financeiras fundamentais:
1. Juros Compostos com Aportes Mensais e Evolução Temporal
2. Reserva de Emergência Personalizada por Perfil de Risco
3. Simulador de Amortização Extra de Dívidas (Redução de Prazo e Juros)
4. Comparador de Pagamento À Vista com Desconto vs. Parcelado Rendendo no CDI
"""

from __future__ import annotations
from dataclasses import dataclass, field, asdict
from enum import Enum
import math
from typing import List, Optional, Dict, Any


# =====================================================================
# 1. JUROS COMPOSTOS COM APORTES MENSAIS
# =====================================================================

@dataclass(frozen=True)
class CompoundInterestMonthRecord:
    month: int
    label: str
    invested_capital: float
    interest_accumulated: float
    total_balance: float
    monthly_interest_earned: float


@dataclass(frozen=True)
class CompoundInterestResult:
    initial_amount: float
    monthly_contribution: float
    annual_interest_rate: float
    monthly_effective_rate: float
    period_months: int
    total_invested: float
    total_interest: float
    final_amount: float
    wealth_multiplier: float
    timeline: List[CompoundInterestMonthRecord]


def calculate_compound_interest(
    initial_amount: float,
    monthly_contribution: float,
    annual_interest_rate: float,
    period_months: int
) -> CompoundInterestResult:
    """
    Calcula a evolução do patrimônio com juros compostos e aportes mensais.

    Fórmulas:
    - Taxa efetiva mensal equivalente: i = (1 + r_anual)^(1/12) - 1
    - VF_inicial = VP * (1 + i)^n
    - VF_aportes = PMT * ((1 + i)^n - 1) / i  (se i > 0; se i == 0, PMT * n)
    - VF_total = VF_inicial + VF_aportes

    Tratamento defensivo:
    - Valores negativos lançam ValueError.
    - Taxa zero (r = 0) é calculada linearmente sem divisão por zero.
    """
    if initial_amount < 0:
        raise ValueError("O montante inicial não pode ser negativo.")
    if monthly_contribution < 0:
        raise ValueError("O aporte mensal não pode ser negativo.")
    if annual_interest_rate < 0:
        raise ValueError("A taxa de juros anual não pode ser negativa.")
    if period_months < 0:
        raise ValueError("O período em meses não pode ser negativo.")

    # Taxa efetiva mensal equivalente
    if annual_interest_rate == 0:
        i = 0.0
    else:
        i = math.pow(1.0 + annual_interest_rate, 1.0 / 12.0) - 1.0

    n = period_months
    vp = float(initial_amount)
    pmt = float(monthly_contribution)

    # Cálculo analítico fechado
    if i == 0.0:
        vf_initial = vp
        vf_contributions = pmt * n
    else:
        growth_factor = math.pow(1.0 + i, n)
        vf_initial = vp * growth_factor
        vf_contributions = pmt * ((growth_factor - 1.0) / i)

    final_amount = round(vf_initial + vf_contributions, 2)
    total_invested = round(vp + (pmt * n), 2)
    total_interest = round(final_amount - total_invested, 2)
    multiplier = round(final_amount / total_invested, 2) if total_invested > 0 else 1.0

    # Evolução mês a mês
    timeline: List[CompoundInterestMonthRecord] = []
    current_balance = vp
    current_invested = vp

    timeline.append(CompoundInterestMonthRecord(
        month=0,
        label="Início",
        invested_capital=round(current_invested, 2),
        interest_accumulated=0.0,
        total_balance=round(current_balance, 2),
        monthly_interest_earned=0.0
    ))

    for m in range(1, n + 1):
        interest_month = current_balance * i
        current_balance = (current_balance + interest_month) + pmt
        current_invested += pmt
        interest_accumulated = current_balance - current_invested

        label = f"{m // 12}º Ano" if (m % 12 == 0 and m > 0) else f"Mês {m}"

        timeline.append(CompoundInterestMonthRecord(
            month=m,
            label=label,
            invested_capital=round(current_invested, 2),
            interest_accumulated=round(max(0.0, interest_accumulated), 2),
            total_balance=round(current_balance, 2),
            monthly_interest_earned=round(interest_month, 2)
        ))

    return CompoundInterestResult(
        initial_amount=round(vp, 2),
        monthly_contribution=round(pmt, 2),
        annual_interest_rate=round(annual_interest_rate, 4),
        monthly_effective_rate=round(i, 6),
        period_months=n,
        total_invested=total_invested,
        total_interest=total_interest,
        final_amount=final_amount,
        wealth_multiplier=multiplier,
        timeline=timeline
    )


# =====================================================================
# 2. RESERVA DE EMERGÊNCIA PERSONALIZADA
# =====================================================================

class EmploymentProfile(str, Enum):
    CLT = "clt"
    PUBLIC_SERVANT = "public_servant"
    FREELANCER = "freelancer"


PROFILE_MONTHS_MAP: Dict[EmploymentProfile, int] = {
    EmploymentProfile.CLT: 6,
    EmploymentProfile.PUBLIC_SERVANT: 4,  # Estabilidade alta: 3 a 4 meses (adotado 4 como teto seguro)
    EmploymentProfile.FREELANCER: 12      # Volatilidade de renda: 12 meses
}


@dataclass(frozen=True)
class EmergencyFundResult:
    profile: EmploymentProfile
    recommended_months: int
    monthly_fixed_costs: float
    target_amount: float
    current_savings: float
    coverage_months: float
    coverage_percentage: float
    remaining_amount: float
    surplus_amount: float
    is_fully_funded: bool
    status_label: str
    recommendation_text: str


def calculate_emergency_fund(
    monthly_fixed_costs: float,
    profile: str | EmploymentProfile,
    current_savings: float = 0.0
) -> EmergencyFundResult:
    """
    Calcula a meta de reserva de emergência baseada no custo de vida fixo e perfil de estabilidade.

    Regras:
    - CLT: 6 meses (amortecedor de transição de carreira e aviso prévio).
    - Servidor Público: 4 meses (estabilidade estatutária, foco em imprevistos pontuais).
    - Autônomo / Freelancer / PJ: 12 meses (alta volatilidade e oscilações sazonais de faturamento).
    """
    if monthly_fixed_costs < 0:
        raise ValueError("O custo fixo mensal não pode ser negativo.")
    if current_savings < 0:
        raise ValueError("O saldo atual poupado não pode ser negativo.")

    # Normalização de perfil
    profile_str = profile.value if isinstance(profile, EmploymentProfile) else str(profile).lower().strip()
    
    if profile_str in ("clt", "privado"):
        norm_profile = EmploymentProfile.CLT
    elif profile_str in ("public_servant", "servidor", "servidor_publico", "concursado"):
        norm_profile = EmploymentProfile.PUBLIC_SERVANT
    elif profile_str in ("freelancer", "pj", "autonomo", "empresario"):
        norm_profile = EmploymentProfile.FREELANCER
    else:
        raise ValueError(f"Perfil desconhecido '{profile}'. Use 'clt', 'public_servant' ou 'freelancer'.")

    rec_months = PROFILE_MONTHS_MAP[norm_profile]
    target = round(monthly_fixed_costs * rec_months, 2)
    savings = round(current_savings, 2)

    coverage_months = round(savings / monthly_fixed_costs, 1) if monthly_fixed_costs > 0 else float(rec_months)
    coverage_pct = round((savings / target) * 100.0, 1) if target > 0 else 100.0

    remaining = round(max(0.0, target - savings), 2)
    surplus = round(max(0.0, savings - target), 2)
    is_funded = savings >= target

    if coverage_pct >= 100:
        status = "Reserva Completa e Segura"
        rec = f"Parabéns! Sua reserva cobre {coverage_months} meses de custo fixo. O excedente pode ser direcionado para investimentos de longo prazo."
    elif coverage_pct >= 50:
        status = "Em Construção Avançada"
        rec = f"Você já garantiu {coverage_months} meses de proteção. Faltam {remaining:.2f} para blindar totalmente sua segurança financeira."
    elif coverage_pct > 0:
        status = "Fase Inicial de Cobertura"
        rec = f"Primeiros passos concluídos. Priorize aportes mensais constantes em ativos de liquidez diária (ex: Tesouro Selic ou CDB 100% CDI)."
    else:
        status = "Vulnerável (Sem Reserva)"
        rec = f"Atenção: qualquer imprevisto pode gerar endividamento. Estabeleça como prioridade máxima poupar R$ {monthly_fixed_costs:.2f} por mês."

    return EmergencyFundResult(
        profile=norm_profile,
        recommended_months=rec_months,
        monthly_fixed_costs=round(monthly_fixed_costs, 2),
        target_amount=target,
        current_savings=savings,
        coverage_months=coverage_months,
        coverage_percentage=coverage_pct,
        remaining_amount=remaining,
        surplus_amount=surplus,
        is_fully_funded=is_funded,
        status_label=status,
        recommendation_text=rec
    )


# =====================================================================
# 3. SIMULADOR DE AMORTIZAÇÃO EXTRA DE DÍVIDAS
# =====================================================================

@dataclass(frozen=True)
class AmortizationScheduleRecord:
    month: int
    original_balance: float
    accelerated_balance: float
    original_interest_paid: float
    accelerated_interest_paid: float


@dataclass(frozen=True)
class DebtAmortizationResult:
    original_balance: float
    annual_interest_rate: float
    monthly_effective_rate: float
    current_monthly_payment: float
    extra_monthly_payment: float
    original_months: int
    accelerated_months: int
    months_saved: int
    original_total_interest: float
    accelerated_total_interest: float
    total_interest_saved: float
    interest_savings_percentage: float
    schedule: List[AmortizationScheduleRecord]


def calculate_debt_amortization(
    balance: float,
    annual_interest_rate: float,
    current_monthly_payment: float,
    extra_monthly_payment: float = 0.0,
    max_months_limit: int = 480  # Limite de segurança de 40 anos
) -> DebtAmortizationResult:
    """
    Simula o impacto de amortizações extraordinárias recorrentes no saldo devedor.

    Calcula a redução drástica de prazo e juros pagos pelo efeito multiplicador
    da amortização pura no saldo principal.
    """
    if balance <= 0:
        raise ValueError("O saldo devedor deve ser maior que zero.")
    if annual_interest_rate < 0:
        raise ValueError("A taxa de juros não pode ser negativa.")
    if current_monthly_payment <= 0:
        raise ValueError("A parcela mensal atual deve ser maior que zero.")
    if extra_monthly_payment < 0:
        raise ValueError("A amortização extra não pode ser negativa.")

    # Taxa efetiva mensal equivalente
    if annual_interest_rate == 0:
        i = 0.0
    else:
        i = math.pow(1.0 + annual_interest_rate, 1.0 / 12.0) - 1.0

    # Validação de viabilidade: a parcela base deve cobrir os juros do 1º mês
    first_month_interest = balance * i
    if current_monthly_payment <= first_month_interest and i > 0:
        raise ValueError(
            f"A parcela atual (R$ {current_monthly_payment:.2f}) é insuficiente para cobrir os juros mensais "
            f"(R$ {first_month_interest:.2f}). A dívida cresceria indefinidamente."
        )

    # 1. Simulação do Cenário Original (Sem amortização extra)
    orig_bal = balance
    orig_months = 0
    orig_total_interest = 0.0
    orig_history: List[tuple[float, float]] = [(orig_bal, 0.0)]

    while orig_bal > 0.01 and orig_months < max_months_limit:
        orig_months += 1
        interest = orig_bal * i
        orig_total_interest += interest
        principal = current_monthly_payment - interest
        orig_bal = max(0.0, orig_bal - principal)
        orig_history.append((orig_bal, orig_total_interest))

    # 2. Simulação do Cenário Acelerado (Com amortização extra no principal)
    accel_bal = balance
    accel_months = 0
    accel_total_interest = 0.0
    accel_history: List[tuple[float, float]] = [(accel_bal, 0.0)]
    total_accel_payment = current_monthly_payment + extra_monthly_payment

    while accel_bal > 0.01 and accel_months < max_months_limit:
        accel_months += 1
        interest = accel_bal * i
        accel_total_interest += interest
        principal = total_accel_payment - interest
        accel_bal = max(0.0, accel_bal - principal)
        accel_history.append((accel_bal, accel_total_interest))

    months_saved = max(0, orig_months - accel_months)
    interest_saved = max(0.0, round(orig_total_interest - accel_total_interest, 2))
    interest_savings_pct = round((interest_saved / orig_total_interest * 100.0), 1) if orig_total_interest > 0 else 0.0

    # Construção do cronograma comparativo simplificado (amostragem inteligente)
    max_duration = max(orig_months, accel_months)
    schedule: List[AmortizationScheduleRecord] = []

    step = 1 if max_duration <= 36 else (6 if max_duration <= 120 else 12)

    for m in range(0, max_duration + 1):
        if m == 0 or m % step == 0 or m == accel_months or m == orig_months:
            o_b, o_i = orig_history[m] if m < len(orig_history) else (0.0, orig_total_interest)
            a_b, a_i = accel_history[m] if m < len(accel_history) else (0.0, accel_total_interest)
            schedule.append(AmortizationScheduleRecord(
                month=m,
                original_balance=round(o_b, 2),
                accelerated_balance=round(a_b, 2),
                original_interest_paid=round(o_i, 2),
                accelerated_interest_paid=round(a_i, 2)
            ))

    return DebtAmortizationResult(
        original_balance=round(balance, 2),
        annual_interest_rate=round(annual_interest_rate, 4),
        monthly_effective_rate=round(i, 6),
        current_monthly_payment=round(current_monthly_payment, 2),
        extra_monthly_payment=round(extra_monthly_payment, 2),
        original_months=orig_months,
        accelerated_months=accel_months,
        months_saved=months_saved,
        original_total_interest=round(orig_total_interest, 2),
        accelerated_total_interest=round(accel_total_interest, 2),
        total_interest_saved=interest_saved,
        interest_savings_percentage=interest_savings_pct,
        schedule=schedule
    )


# =====================================================================
# 4. COMPARADOR À VISTA COM DESCONTO VS. PARCELADO NO CDI
# =====================================================================

class PaymentRecommendation(str, Enum):
    CASH = "A_VISTA"
    INSTALLMENTS = "PARCELADO"
    INDIFFERENT = "INDIFERENTE"


@dataclass(frozen=True)
class CashVsInstallmentsCashFlowRecord:
    month: int
    installment_paid: float
    investment_yield: float
    remaining_investment_balance: float


@dataclass(frozen=True)
class CashVsInstallmentsResult:
    full_price: float
    cash_discount_percent: float
    cash_price: float
    cash_discount_amount: float
    installments_count: int
    installment_value: float
    cdi_annual_rate: float
    cdi_monthly_effective_rate: float
    net_cdi_monthly_rate: float
    tax_rate_percent: float
    final_investment_surplus: float
    net_interest_earned: float
    opportunity_advantage_amount: float
    recommendation: PaymentRecommendation
    break_even_discount_percent: float
    reasoning: str
    cash_flow_timeline: List[CashVsInstallmentsCashFlowRecord]


def calculate_cash_vs_installment(
    full_price: float,
    cash_discount_percent: float,
    installments_count: int,
    cdi_annual_rate: float,
    tax_rate_percent: float = 15.0,  # Alíquota padrão IR sobre rendimentos (15% a 22.5%)
    first_installment_immediate: bool = False
) -> CashVsInstallmentsResult:
    """
    Compara matematicamente pagar À Vista com desconto vs. Parcelar mantendo o dinheiro rendendo no CDI.

    Modelo de Fundo de Oportunidade:
    - Cenário A (À Vista): Paga `full_price * (1 - discount)` no ato. Saldo remanescente = 0.
    - Cenário B (Parcelado): O montante do valor à vista é aplicado a 100% CDI líquido de IR.
      A cada mês, o saldo rende e é debitada 1 parcela de `full_price / installments_count`.
      Ao término das parcelas, avalia-se o saldo final residual.

    Taxa de Break-even (Ponto de Equilíbrio):
    - Percentual de desconto exato onde o valor presente das parcelas se iguala ao valor à vista.
    """
    if full_price <= 0:
        raise ValueError("O preço total deve ser maior que zero.")
    if cash_discount_percent < 0 or cash_discount_percent >= 100:
        raise ValueError("O percentual de desconto deve estar entre 0% e 99.99%.")
    if installments_count < 1:
        raise ValueError("O número de parcelas deve ser de pelo menos 1.")
    if cdi_annual_rate < 0:
        raise ValueError("A taxa CDI anual não pode ser negativa.")
    if tax_rate_percent < 0 or tax_rate_percent >= 100:
        raise ValueError("A alíquota de IR deve estar entre 0% e 99%.")

    disc_ratio = cash_discount_percent / 100.0
    cash_price = round(full_price * (1.0 - disc_ratio), 2)
    discount_amount = round(full_price - cash_price, 2)
    installment_val = round(full_price / installments_count, 2)

    # Taxa mensal CDI bruta e líquida
    gross_cdi_monthly = math.pow(1.0 + (cdi_annual_rate / 100.0), 1.0 / 12.0) - 1.0 if cdi_annual_rate > 0 else 0.0
    net_cdi_monthly = gross_cdi_monthly * (1.0 - (tax_rate_percent / 100.0))

    # Simulação do fluxo de caixa
    # Partimos do capital que seria gasto à vista
    invested_balance = cash_price
    timeline: List[CashVsInstallmentsCashFlowRecord] = []
    total_yield = 0.0

    # Se a 1ª parcela for imediata (no ato da compra t=0)
    if first_installment_immediate:
        invested_balance -= installment_val

    timeline.append(CashVsInstallmentsCashFlowRecord(
        month=0,
        installment_paid=installment_val if first_installment_immediate else 0.0,
        investment_yield=0.0,
        remaining_investment_balance=round(invested_balance, 2)
    ))

    start_m = 1 if first_installment_immediate else 1
    end_m = installments_count - (1 if first_installment_immediate else 0)

    for m in range(1, installments_count + 1):
        if first_installment_immediate and m == installments_count:
            # Já pagou no ato t=0
            break
        
        m_yield = invested_balance * net_cdi_monthly
        total_yield += m_yield
        invested_balance = (invested_balance + m_yield) - installment_val

        timeline.append(CashVsInstallmentsCashFlowRecord(
            month=m,
            installment_paid=installment_val,
            investment_yield=round(m_yield, 2),
            remaining_investment_balance=round(invested_balance, 2)
        ))

    final_surplus = round(invested_balance, 2)

    # Cálculo do Break-even Discount Rate (TIR de indiferença)
    # d* = 1 - (1/n) * sum_{t=1}^n (1 / (1 + i_net)^t)
    if net_cdi_monthly > 0:
        present_value_factor = sum(1.0 / math.pow(1.0 + net_cdi_monthly, t) for t in range(1, installments_count + 1))
        break_even_discount = round((1.0 - (present_value_factor / installments_count)) * 100.0, 2)
    else:
        break_even_discount = 0.0

    # Decisão matemática
    if final_surplus > 1.0:
        recommendation = PaymentRecommendation.INSTALLMENTS
        diff = final_surplus
        reasoning = (
            f"O parcelamento em {installments_count}x é mais vantajoso. "
            f"Mantendo o dinheiro no CDI ({cdi_annual_rate}% a.a.), os rendimentos líquidos (R$ {total_yield:.2f}) "
            f"superam o desconto oferecido, deixando um saldo positivo de R$ {diff:.2f} no final."
        )
    elif final_surplus < -1.0:
        recommendation = PaymentRecommendation.CASH
        diff = abs(final_surplus)
        reasoning = (
            f"O pagamento À Vista é matematicamente superior. "
            f"O desconto de {cash_discount_percent}% (R$ {discount_amount:.2f}) supera os rendimentos que o CDI geraria "
            f"durante o parcelamento. Você economiza o equivalente líquido a R$ {diff:.2f}."
        )
    else:
        recommendation = PaymentRecommendation.INDIFFERENT
        diff = 0.0
        reasoning = (
            f"As opções são financeiramente equivalentes. A rentabilidade do CDI empata com o desconto à vista de {cash_discount_percent}%."
        )

    return CashVsInstallmentsResult(
        full_price=round(full_price, 2),
        cash_discount_percent=round(cash_discount_percent, 2),
        cash_price=cash_price,
        cash_discount_amount=discount_amount,
        installments_count=installments_count,
        installment_value=installment_val,
        cdi_annual_rate=round(cdi_annual_rate, 2),
        cdi_monthly_effective_rate=round(gross_cdi_monthly, 6),
        net_cdi_monthly_rate=round(net_cdi_monthly, 6),
        tax_rate_percent=round(tax_rate_percent, 2),
        final_investment_surplus=final_surplus,
        net_interest_earned=round(total_yield, 2),
        opportunity_advantage_amount=round(diff, 2),
        recommendation=recommendation,
        break_even_discount_percent=break_even_discount,
        reasoning=reasoning,
        cash_flow_timeline=timeline
    )


# =====================================================================
# FASTAPI ROUTER HELPER (OPCIONAL / INTEGRAÇÃO DE MICROSERVIÇO)
# =====================================================================

def get_fastapi_router():
    """
    Retorna um APIRouter do FastAPI configurado com os 4 endpoints se o FastAPI estiver instalado.
    """
    try:
        from fastapi import APIRouter, HTTPException
        from pydantic import BaseModel, Field

        router = APIRouter(prefix="/api/calculators", tags=["Calculadoras Financeiras"])

        class CompoundInterestRequest(BaseModel):
            initial_amount: float = Field(..., ge=0, description="Montante inicial em R$")
            monthly_contribution: float = Field(..., ge=0, description="Aporte mensal em R$")
            annual_interest_rate: float = Field(..., ge=0, description="Taxa de juros anual (ex: 0.12 para 12%)")
            period_months: int = Field(..., ge=0, description="Prazo em meses")

        class EmergencyFundRequest(BaseModel):
            monthly_fixed_costs: float = Field(..., ge=0, description="Custo fixo de vida mensal")
            profile: str = Field(..., description="'clt', 'public_servant' ou 'freelancer'")
            current_savings: float = Field(0.0, ge=0, description="Saldo já acumulado")

        class DebtAmortizationRequest(BaseModel):
            balance: float = Field(..., gt=0, description="Saldo devedor atual")
            annual_interest_rate: float = Field(..., ge=0, description="Taxa de juros anual da dívida (ex: 0.11)")
            current_monthly_payment: float = Field(..., gt=0, description="Valor atual da parcela")
            extra_monthly_payment: float = Field(0.0, ge=0, description="Valor do aporte extra mensal")

        class CashVsInstallmentRequest(BaseModel):
            full_price: float = Field(..., gt=0, description="Preço total do produto")
            cash_discount_percent: float = Field(..., ge=0, lt=100, description="% de desconto à vista")
            installments_count: int = Field(..., ge=1, description="Número de parcelas sem juros")
            cdi_annual_rate: float = Field(..., ge=0, description="Taxa CDI anual (ex: 13.65)")
            tax_rate_percent: float = Field(15.0, ge=0, lt=100, description="Alíquota de IR sobre o CDI (%)")

        @router.post("/compound-interest")
        def api_compound_interest(req: CompoundInterestRequest):
            try:
                res = calculate_compound_interest(
                    req.initial_amount, req.monthly_contribution,
                    req.annual_interest_rate, req.period_months
                )
                return asdict(res)
            except ValueError as err:
                raise HTTPException(status_code=400, detail=str(err))

        @router.post("/emergency-fund")
        def api_emergency_fund(req: EmergencyFundRequest):
            try:
                res = calculate_emergency_fund(req.monthly_fixed_costs, req.profile, req.current_savings)
                return asdict(res)
            except ValueError as err:
                raise HTTPException(status_code=400, detail=str(err))

        @router.post("/debt-amortization")
        def api_debt_amortization(req: DebtAmortizationRequest):
            try:
                res = calculate_debt_amortization(
                    req.balance, req.annual_interest_rate,
                    req.current_monthly_payment, req.extra_monthly_payment
                )
                return asdict(res)
            except ValueError as err:
                raise HTTPException(status_code=400, detail=str(err))

        @router.post("/cash-vs-installment")
        def api_cash_vs_installment(req: CashVsInstallmentRequest):
            try:
                res = calculate_cash_vs_installment(
                    req.full_price, req.cash_discount_percent,
                    req.installments_count, req.cdi_annual_rate,
                    req.tax_rate_percent
                )
                return asdict(res)
            except ValueError as err:
                raise HTTPException(status_code=400, detail=str(err))

        return router
    except ImportError:
        return None


# =====================================================================
# SUITE DE TESTES UNITÁRIOS (ASSERTS)
# =====================================================================

def run_unit_tests():
    print("Iniciando testes unitários do motor financeiro...")

    # --- Teste 1: Juros Compostos ---
    res_juros = calculate_compound_interest(
        initial_amount=10000.0,
        monthly_contribution=1000.0,
        annual_interest_rate=0.12,  # 12% a.a.
        period_months=12
    )
    assert res_juros.total_invested == 22000.0, f"Esperado 22000, obtido {res_juros.total_invested}"
    assert res_juros.final_amount > 22000.0, "O montante final deve ser maior que o total investido"
    assert res_juros.total_interest > 0, "O total de juros acumulados deve ser positivo"
    assert len(res_juros.timeline) == 13, f"Esperado 13 registros (0 a 12), obtido {len(res_juros.timeline)}"
    print("[OK] Teste 1: Juros Compostos (Cenario Padrao) APROVADO.")

    # Teste 1.1: Taxa Zero
    res_zero = calculate_compound_interest(1000.0, 100.0, 0.0, 10)
    assert res_zero.total_invested == 2000.0
    assert res_zero.final_amount == 2000.0
    assert res_zero.total_interest == 0.0
    print("[OK] Teste 1.1: Juros Compostos com Taxa Zero APROVADO.")

    # --- Teste 2: Reserva de Emergencia ---
    res_clt = calculate_emergency_fund(monthly_fixed_costs=4000.0, profile="clt", current_savings=12000.0)
    assert res_clt.recommended_months == 6
    assert res_clt.target_amount == 24000.0
    assert res_clt.coverage_months == 3.0
    assert res_clt.coverage_percentage == 50.0
    assert res_clt.remaining_amount == 12000.0
    assert not res_clt.is_fully_funded
    print("[OK] Teste 2: Reserva de Emergencia (CLT 50%) APROVADO.")

    res_pj = calculate_emergency_fund(monthly_fixed_costs=5000.0, profile="freelancer", current_savings=60000.0)
    assert res_pj.recommended_months == 12
    assert res_pj.target_amount == 60000.0
    assert res_pj.is_fully_funded
    assert res_pj.surplus_amount == 0.0
    print("[OK] Teste 2.1: Reserva de Emergencia (PJ 100%) APROVADO.")

    # --- Teste 3: Amortizacao Extra de Divida ---
    res_divida = calculate_debt_amortization(
        balance=100000.0,
        annual_interest_rate=0.10,  # 10% a.a.
        current_monthly_payment=1500.0,
        extra_monthly_payment=500.0
    )
    assert res_divida.months_saved > 0, "Deve haver reducao no numero de meses"
    assert res_divida.total_interest_saved > 0, "Deve haver economia de juros"
    assert res_divida.accelerated_months < res_divida.original_months
    print(f"[OK] Teste 3: Amortizacao Extra APROVADO ({res_divida.months_saved} meses e R$ {res_divida.total_interest_saved:.2f} economizados).")

    # --- Teste 4: A Vista vs. Parcelado CDI ---
    # Caso 1: Desconto alto (10%) com CDI baixo -> A vista deve vencer
    res_desc = calculate_cash_vs_installment(
        full_price=10000.0,
        cash_discount_percent=10.0,
        installments_count=10,
        cdi_annual_rate=10.0
    )
    assert res_desc.recommendation == PaymentRecommendation.CASH
    print("[OK] Teste 4: Comparador A Vista vs Parcelado (Vitoria A Vista) APROVADO.")

    # Caso 2: Desconto baixo (1%) com parcelas longas (12x) e CDI alto (14%) -> Parcelado deve vencer
    res_parc = calculate_cash_vs_installment(
        full_price=10000.0,
        cash_discount_percent=1.0,
        installments_count=12,
        cdi_annual_rate=14.0
    )
    assert res_parc.recommendation == PaymentRecommendation.INSTALLMENTS
    print("[OK] Teste 4.1: Comparador A Vista vs Parcelado (Vitoria Parcelado no CDI) APROVADO.")

    print("\nTODOS OS TESTES UNITARIOS FORAM EXECUTADOS COM SUCESSO NO PYTHON!")


if __name__ == "__main__":
    run_unit_tests()
