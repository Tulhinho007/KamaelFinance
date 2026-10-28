const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tulio = await prisma.user.findFirst({
    where: { email: 'kamaelcontatos@gmail.com' },
    include: { wallets: true }
  });

  if (!tulio) {
    console.log('Usuário Túlio não encontrado.');
    return;
  }

  const santander = tulio.wallets.find(w => w.title.toLowerCase().includes('santander')) || tulio.wallets[0];
  if (!santander) {
    console.log('Carteira de Túlio não encontrada.');
    return;
  }

  console.log(`Associando contas de Túlio à carteira ${santander.title} (${santander.id}) do usuário ${tulio.name}`);

  const billsToEnsure = [
    {
      description: 'Tim Celular',
      amount: 30.99,
      dueDay: 10,
      tipo: 'BOLETO',
      category: 'Telefonia / Celular',
      competenceMonth: 10,
      competenceYear: 2026,
    },
    {
      description: 'Treino – Futevôlei',
      amount: 100.0,
      dueDay: 10,
      tipo: 'ASSINATURA',
      category: 'Lazer & Esporte',
      competenceMonth: 10,
      competenceYear: 2026,
    },
    {
      description: 'Internet Tim Live',
      amount: 105.56,
      dueDay: 15,
      tipo: 'BOLETO',
      category: 'Internet & TV',
      competenceMonth: 10,
      competenceYear: 2026,
    },
    {
      description: '2 Parcela Fonte Bira',
      amount: 100.0,
      dueDay: 20,
      tipo: 'BOLETO',
      category: 'Outros Fixos',
      competenceMonth: 10,
      competenceYear: 2026,
    },
    {
      description: 'Pagamento Camila',
      amount: 300.0,
      dueDay: 5,
      tipo: 'ASSINATURA',
      category: 'Assinatura / Mensalidade',
      competenceMonth: 10,
      competenceYear: 2026,
    },
  ];

  for (const b of billsToEnsure) {
    const existing = await prisma.transaction.findFirst({
      where: {
        userId: tulio.id,
        description: { equals: b.description, mode: 'insensitive' },
        competenceMonth: b.competenceMonth,
        competenceYear: b.competenceYear,
        deletedAt: null,
      }
    });

    if (existing) {
      console.log(`Conta já existe no banco: ${b.description}`);
      continue;
    }

    const dueDate = new Date(Date.UTC(b.competenceYear, b.competenceMonth - 1, b.dueDay, 12, 0, 0));
    const competenceDate = new Date(Date.UTC(b.competenceYear, b.competenceMonth - 1, 1, 12, 0, 0));

    await prisma.transaction.create({
      data: {
        userId: tulio.id,
        walletId: santander.id,
        description: b.description,
        type: 'EXPENSE',
        amount: b.amount,
        date: dueDate,
        dueDate: dueDate,
        competenceMonth: b.competenceMonth,
        competenceYear: b.competenceYear,
        competenceDate: competenceDate,
        status: 'PENDING',
        source: 'COMMITMENT',
        isRecurring: b.tipo === 'ASSINATURA',
        recurringDay: b.dueDay,
        paymentMethod: b.tipo === 'ASSINATURA' ? 'CREDITO' : 'BOLETO',
        tags: `#compromisso #${b.tipo.toLowerCase()} #unico`,
      }
    });
    console.log(`Conta inserida com sucesso para Túlio: ${b.description}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
