import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const from = new Date(Date.UTC(2026, 8, 1, 0, 0, 0));
  const to   = new Date(Date.UTC(2026, 8, 30, 23, 59, 59, 999));

  console.log("Buscando transações entre", from, "e", to);

  const txs = await prisma.transaction.findMany({
    where: {
      date: { gte: from, lte: to },
      deletedAt: null
    },
    include: { wallet: true }
  });

  console.log("Transações encontradas:", txs.map(t => ({
    id: t.id,
    description: t.description,
    amount: Number(t.amount),
    type: t.type,
    status: t.status,
    walletTitle: t.wallet?.title,
    walletType: t.wallet?.walletType
  })));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
