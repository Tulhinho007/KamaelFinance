import { redirect } from "next/navigation";

/**
 * Rota legada descontinuada: /despesas
 * Substituída pelas telas modulares:
 * - Conta Corrente & Extrato (/contas)
 * - Cartões de Crédito (/cartoes)
 */
export default function DespesasPage() {
  redirect("/contas");
}
