const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetCreditPurchases() {
  console.log('--- Iniciando Reset de Compras de Cartão para PENDENTE (Set/Out 2026) ---');

  // 1. Localiza todas as carteiras de cartão de crédito
  const creditWallets = await prisma.wallet.findMany({
    where: { walletType: 'CREDIT_CARD' },
    select: { id: true, title: true, bankName: true, creditLimit: true }
  });

  const walletIds = creditWallets.map(w => w.id);
  console.log(`Cartões de crédito encontrados (${creditWallets.length}):`, creditWallets.map(w => w.title || w.bankName).join(', '));

  // 2. Atualiza transações de Setembro e Outubro de 2026 para 'PENDING'
  const updateResult = await prisma.transaction.updateMany({
    where: {
      walletId: { in: walletIds },
      type: 'EXPENSE',
      OR: [
        { competenceYear: 2026, competenceMonth: { in: [9, 10] } },
        {
          date: {
            gte: new Date('2026-09-01T00:00:00.000Z'),
            lte: new Date('2026-10-31T23:59:59.999Z')
          }
        },
        {
          purchaseDate: {
            gte: new Date('2026-09-01T00:00:00.000Z'),
            lte: new Date('2026-10-31T23:59:59.999Z')
          }
        }
      ]
    },
    data: {
      status: 'PENDING'
    }
  });

  console.log(`✓ ${updateResult.count} lançamentos de cartão de crédito foram revertidos para status: 'PENDING'.`);

  // 3. Verifica se existem pagamentos de fatura registrados indevidamente nesses meses
  const deletedInvoices = await prisma.invoicePayment.deleteMany({
    where: {
      walletId: { in: walletIds },
      year: 2026,
      month: { in: [9, 10] }
    }
  });

  if (deletedInvoices.count > 0) {
    console.log(`✓ ${deletedInvoices.count} registro(s) de fatura paga foram removidos para reabrir as faturas de Set/Out 2026.`);
  }

  // 4. Exibe o resumo final
  const currentTxs = await prisma.transaction.findMany({
    where: {
      walletId: { in: walletIds },
      OR: [
        { competenceYear: 2026, competenceMonth: { in: [9, 10] } },
        { date: { gte: new Date('2026-09-01T00:00:00.000Z'), lte: new Date('2026-10-31T23:59:59.999Z') } }
      ]
    },
    select: {
      id: true,
      description: true,
      amount: true,
      status: true,
      date: true
    }
  });

  const totalPending = currentTxs.reduce((sum, t) => sum + Number(t.amount), 0);
  console.log(`Total em aberto nas faturas (Set/Out 2026): R$ ${totalPending.toFixed(2)}`);
  for (const t of currentTxs) {
    console.log(`  - [${t.status}] ${t.description} -> R$ ${t.amount}`);
  }
}

resetCreditPurchases()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
