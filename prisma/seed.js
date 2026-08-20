const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const userId = process.env.DEV_USER_ID || "00000000-0000-0000-0000-000000000000";

  console.log("Iniciando semeadura do banco de dados...");

  // 1. Upsert do usuário de teste
  const user = await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      email: "teste@kamaelfinance.com.br",
      name: "Usuário Kamael",
    },
  });
  console.log(`Usuário criado/verificado: ${user.name} (${user.id})`);

  // 2. Criar categorias
  const categoriesData = [
    { name: "Salário", color: "#10B981" },
    { name: "Alimentação", color: "#F59E0B" },
    { name: "Transporte", color: "#3B82F6" },
    { name: "Lazer", color: "#8B5CF6" },
    { name: "Outros", color: "#6B7280" },
  ];

  const categories = [];
  for (const cat of categoriesData) {
    // Usando create pois a tabela está limpa no init
    const createdCat = await prisma.category.create({
      data: cat,
    });
    categories.push(createdCat);
    console.log(`Categoria criada: ${createdCat.name}`);
  }

  // 3. Criar carteiras
  const walletSalario = await prisma.wallet.create({
    data: {
      userId: user.id,
      title: "Salário",
      walletType: "Conta Corrente",
      initialBalance: 5000.00,
    },
  });
  console.log(`Carteira criada: ${walletSalario.title}`);

  const walletTicket = await prisma.wallet.create({
    data: {
      userId: user.id,
      title: "Ticket Alimentação",
      walletType: "Benefício",
      initialBalance: 650.00,
    },
  });
  console.log(`Carteira criada: ${walletTicket.title}`);

  // 4. Criar transações do mês atual
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // Transação de receita na carteira Salário
  await prisma.transaction.create({
    data: {
      walletId: walletSalario.id,
      categoryId: categories.find(c => c.name === "Salário").id,
      description: "Salário Mensal Kamael",
      type: "INCOME",
      amount: 5000.00,
      date: new Date(year, month, 1),
      isRecurring: true,
      source: "MANUAL",
    },
  });

  // Transação de despesa na carteira Salário
  await prisma.transaction.create({
    data: {
      walletId: walletSalario.id,
      categoryId: categories.find(c => c.name === "Lazer").id,
      description: "Cinema e Jantar",
      type: "EXPENSE",
      amount: 180.00,
      date: new Date(year, month, 10),
      isRecurring: false,
      source: "MANUAL",
    },
  });

  // Transação de despesa na carteira Ticket
  await prisma.transaction.create({
    data: {
      walletId: walletTicket.id,
      categoryId: categories.find(c => c.name === "Alimentação").id,
      description: "Supermercado Semanal",
      type: "EXPENSE",
      amount: 245.50,
      date: new Date(year, month, 5),
      isRecurring: false,
      source: "MANUAL",
    },
  });

  await prisma.transaction.create({
    data: {
      walletId: walletTicket.id,
      categoryId: categories.find(c => c.name === "Alimentação").id,
      description: "Almoço Executivo",
      type: "EXPENSE",
      amount: 42.00,
      date: new Date(year, month, 12),
      isRecurring: false,
      source: "MANUAL",
    },
  });

  console.log("Banco de dados semeado com sucesso!");
}

main()
  .catch((e) => {
    console.error("Erro ao semear o banco de dados:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
