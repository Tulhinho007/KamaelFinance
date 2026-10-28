export interface BillItem {
  id: string;
  description: string;
  category: string;
  bank: string;
  amount: number;
  tipoLabel: string;
  tipo?: string;
  dueDay?: number;
  status?: "PENDING" | "COMPLETED" | "PAID" | "PAGO" | string;
  isCardInvoice?: boolean;
  walletId?: string;
  startMonth?: string;
  competenceMonth?: number;
  competenceYear?: number;
  month?: string;
  recorrencia?: string;
  recorrenciaLabel?: string;
  [key: string]: any;
}

// Faturas e contas fixas são estritamente isoladas por usuário via banco de dados
// Mocks globais estáticos foram removidos para evitar vazamento de dados entre sessões
export const DEFAULT_HYPERCARD_INVOICES: BillItem[] = [];
export const DEFAULT_PAID_INVOICES: BillItem[] = [];
export const DEFAULT_MONTH_BILLS: BillItem[] = [];
export const DEFAULT_INITIAL_BILLS: BillItem[] = [];

export const DELETED_BILLS_STORAGE_KEY = "kamael_deleted_bills_v2";
export const EDITED_BILLS_STORAGE_KEY = "kamael_edited_bills_v1";
export const PAID_ACCOUNTS_STORAGE_KEY = "kamael_paid_accounts_v1";

export const getDeletedBillIds = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DELETED_BILLS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const addDeletedBillId = (id: string) => {
  if (typeof window === "undefined") return;
  try {
    const current = getDeletedBillIds();
    const updated = [...current];
    if (id && !updated.includes(id)) {
      updated.push(id);
    }
    localStorage.setItem(DELETED_BILLS_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
};

export const removeDeletedBillId = (id: string) => {
  if (typeof window === "undefined") return;
  try {
    const current = getDeletedBillIds();
    const updated = current.filter((item) => item !== id);
    localStorage.setItem(DELETED_BILLS_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
};

export const isBillDeleted = (id: string, deletedList?: string[]): boolean => {
  const list = deletedList || getDeletedBillIds();
  if (!list || list.length === 0) return false;
  return Boolean(id && list.includes(id));
};

export const getEditedBills = (): Record<string, Partial<BillItem>> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(EDITED_BILLS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveEditedBill = (id: string, data: Partial<BillItem>) => {
  if (typeof window === "undefined") return;
  try {
    const current = getEditedBills();
    current[id] = { ...(current[id] || {}), ...data };
    if (data.description) {
      const norm = normalizeBillTitle(data.description);
      current[norm] = { ...(current[norm] || {}), ...data };
    }
    localStorage.setItem(EDITED_BILLS_STORAGE_KEY, JSON.stringify(current));
  } catch {}
};

export const getSavedPaidAccounts = (): Record<string, string> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PAID_ACCOUNTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const savePaidAccountForBill = (billId: string, month: number, accountId: string) => {
  if (typeof window === "undefined") return;
  try {
    const current = getSavedPaidAccounts();
    current[billId] = accountId;
    current[`${billId}_${month}`] = accountId;
    localStorage.setItem(PAID_ACCOUNTS_STORAGE_KEY, JSON.stringify(current));
  } catch {}
};

export const removePaidAccountForBill = (billId: string, month: number) => {
  if (typeof window === "undefined") return;
  try {
    const current = getSavedPaidAccounts();
    delete current[billId];
    delete current[`${billId}_${month}`];
    localStorage.setItem(PAID_ACCOUNTS_STORAGE_KEY, JSON.stringify(current));
  } catch {}
};

export const getPaidAccountBillIds = (): Record<string, boolean> => {
  const saved = getSavedPaidAccounts();
  const res: Record<string, boolean> = {};
  for (const k of Object.keys(saved)) {
    if (saved[k]) res[k] = true;
  }
  return res;
};

export const getBillMonth = (bill: any): string => {
  if (bill.month && typeof bill.month === "string" && bill.month.includes("-")) {
    return bill.month;
  }
  if (bill.competenceYear && bill.competenceMonth) {
    return `${bill.competenceYear}-${String(bill.competenceMonth).padStart(2, "0")}`;
  }
  if (bill.startMonth && typeof bill.startMonth === "string" && bill.startMonth.includes("-")) {
    return bill.startMonth;
  }
  return "2026-10";
};

export function normalizeBillTitle(desc: string): string {
  const d = (desc || "").toLowerCase().trim();
  if (d.includes("treino") && (d.includes("futev") || d.includes("futvolei"))) return "Treino – Futevôlei";
  if (d.includes("tim") && (d.includes("celular") || d.includes("telefone"))) return "Tim Celular";
  if (d.includes("tim") && d.includes("live")) return "Internet Tim Live";
  if (d.includes("bira") || d.includes("fonte bira")) return "2 Parcela Fonte Bira";
  if (d.includes("camila")) return "Pagamento Camila";
  if (d.includes("hypercard") || d.includes("hipercard")) return "Fatura HyperCard";
  return desc.trim();
}

/**
 * Retorna as despesas e faturas consolidadas de determinado mês e ano,
 * unificando a fonte de dados entre a tela de Contas e o Dashboard.
 */
export function getConsolidatedMonthBills(
  targetMonth: number,
  targetYear: number,
  dbCommitments: any[] = []
) {
  const deletedIds = getDeletedBillIds();
  const editedBills = getEditedBills();
  const paidAccounts = getPaidAccountBillIds();

  const monthKey = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;

  // 1. Contas Padrão filtradas e atualizadas
  const baseList = (targetYear === 2026 ? DEFAULT_INITIAL_BILLS : []).filter(
    (b) => !isBillDeleted(b.id, deletedIds)
  );

  const consolidatedMap = new Map<string, BillItem>();

  for (const b of baseList) {
    const bMonth = b.month || (b.competenceYear && b.competenceMonth ? `${b.competenceYear}-${String(b.competenceMonth).padStart(2, "0")}` : "2026-10");
    if (bMonth !== monthKey) continue;

    const item = { ...b };
    const edit = editedBills[item.id] || editedBills[normalizeBillTitle(item.description)];
    if (edit) {
      if (edit.description) item.description = edit.description;
      if (edit.amount !== undefined) item.amount = Number(edit.amount);
      if (edit.category) item.category = edit.category;
      if (edit.bank) item.bank = edit.bank;
      if (edit.walletId) item.walletId = edit.walletId;
    }

    if (paidAccounts[item.id] || paidAccounts[`${item.id}_${targetMonth}`]) {
      item.status = "PAID";
    }

    consolidatedMap.set(item.id, item);
  }

  // 2. Mescla lançamentos vindos do banco de dados (se houver)
  for (const dbItem of dbCommitments) {
    if (isBillDeleted(dbItem.id, deletedIds)) continue;

    const isCard = Boolean(
      dbItem.isCardInvoice ||
      dbItem.tipo === "FATURA_CARTAO" ||
      (dbItem.category || "").toLowerCase().includes("fatura") ||
      (dbItem.description || "").toLowerCase().includes("hypercard")
    );

    const cMonth = Number(
      dbItem.competenceMonth ||
      (dbItem.competencia ? dbItem.competencia.split("-")[1] : 0)
    );
    const cYear = Number(
      dbItem.competenceYear ||
      (dbItem.competencia ? dbItem.competencia.split("-")[0] : targetYear)
    );

    if (cMonth && (cMonth !== targetMonth || cYear !== targetYear)) {
      continue;
    }

    const normKey = normalizeBillTitle(dbItem.description || dbItem.id);
    let matchedId = dbItem.id;
    for (const [id, item] of consolidatedMap.entries()) {
      if (normalizeBillTitle(item.description) === normKey) {
        matchedId = id;
        break;
      }
    }

    const existing = consolidatedMap.get(matchedId);
    if (existing) {
      existing.amount = Number(dbItem.amount || dbItem.valor || existing.amount);
      if (dbItem.status) existing.status = dbItem.status;
    } else {
      consolidatedMap.set(dbItem.id, {
        id: dbItem.id,
        description: dbItem.description,
        category: dbItem.category || (isCard ? "Fatura de Cartão" : "Boleto / Conta Fixa"),
        bank: dbItem.bank || (isCard ? "HyperCard" : ""),
        amount: Number(dbItem.amount || dbItem.valor || 0),
        tipoLabel: isCard ? "Fatura de Cartão" : "Boleto / Conta Fixa",
        tipo: isCard ? "FATURA_CARTAO" : "BOLETO",
        dueDay: dbItem.dueDay || 10,
        status: dbItem.status || "PENDING",
        isCardInvoice: isCard,
        competenceMonth: targetMonth,
        competenceYear: targetYear,
        month: monthKey,
      });
    }
  }

  // 3. Separação Estrita: Faturas de Cartão vs Contas Fixas Pendentes
  const faturasCartoes: { id: string; nome: string; valor: number }[] = [];
  const contasFixasPendentes: { id: string; descricao: string; valor: number; categoria: string; dueDay?: number }[] = [];

  for (const item of consolidatedMap.values()) {
    const isPaid = item.status === "PAID" || item.status === "PAGO" || item.status === "COMPLETED";
    if (isPaid) continue;

    const isCard = Boolean(
      item.isCardInvoice ||
      item.tipo === "FATURA_CARTAO" ||
      (item.category || "").toLowerCase().includes("fatura") ||
      (item.description || "").toLowerCase().includes("fatura") ||
      (item.description || "").toLowerCase().includes("hypercard")
    );

    if (isCard) {
      faturasCartoes.push({
        id: item.id,
        nome: item.description || "Fatura HyperCard",
        valor: Number(item.amount || 0),
      });
    } else {
      contasFixasPendentes.push({
        id: item.id,
        descricao: item.description,
        valor: Number(item.amount || 0),
        categoria: item.category || "Boleto / Conta Fixa",
        dueDay: item.dueDay,
      });
    }
  }

  const totalFaturasCartao = faturasCartoes.reduce((s, f) => s + f.valor, 0);
  const totalContasFixasPendentes = contasFixasPendentes.reduce((s, c) => s + c.valor, 0);
  const totalAPagar = Math.round((totalFaturasCartao + totalContasFixasPendentes) * 100) / 100;
  const totalItensALiquidar = faturasCartoes.length + contasFixasPendentes.length;

  return {
    faturasCartoes,
    totalFaturasCartao,
    contasFixasPendentes,
    totalContasFixasPendentes,
    totalAPagar,
    totalItensALiquidar,
    allConsolidated: Array.from(consolidatedMap.values()),
  };
}
