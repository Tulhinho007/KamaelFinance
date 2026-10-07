import { NextRequest, NextResponse } from "next/server";
import { updateCreditCardTransactionAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "ID não fornecido." }, { status: 400 });
    }

    const body = await request.json();
    const result = await updateCreditCardTransactionAction({
      id,
      description: body.description,
      category: body.category,
      amount: Number(body.amount),
      purchaseDate: body.purchaseDate,
      walletId: body.walletId,
      applyToAllInstallments: Boolean(body.applyToAllInstallments),
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Erro ao atualizar" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Erro na rota PUT /api/credit-cards/transactions/[id]:", error);
    return NextResponse.json(
      { error: error?.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
