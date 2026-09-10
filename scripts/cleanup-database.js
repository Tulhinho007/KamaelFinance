const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function runCleanup() {
  console.log("--- Iniciando verificação e limpeza do banco de dados ---");

  // 1. Deletar 'Energia - Celpe' e 'Seguro energia solar' a partir de Outubro/2026 (date >= 2026-10-01)
  const cutOffOct = new Date(Date.UTC(2026, 9, 1, 0, 0, 0)); // 2026-10-01T00:00:00Z
  const deletedCelpeSolar = await prisma.transaction.deleteMany({
    where: {
      date: { gte: cutOffOct },
      OR: [
        { description: { contains: "Celpe", mode: "insensitive" } },
        { description: { contains: "solar", mode: "insensitive" } },
      ],
    },
  });
  console.log(`[1] Energia - Celpe / Seguro energia solar removidos (>= 2026-10-01): ${deletedCelpeSolar.count} registros.`);

  // 2. Deletar 'Internet - Tim Live' a partir de Novembro/2026 (date >= 2026-11-01)
  const cutOffNov = new Date(Date.UTC(2026, 10, 1, 0, 0, 0)); // 2026-11-01T00:00:00Z
  const deletedTim = await prisma.transaction.deleteMany({
    where: {
      date: { gte: cutOffNov },
      description: { contains: "Tim Live", mode: "insensitive" },
    },
  });
  console.log(`[2] Internet - Tim Live removidos (>= 2026-11-01): ${deletedTim.count} registros.`);

  // 3. Atualizar registros restantes para desativar isRecurring (prevenir loop)
  const updatedRemaining = await prisma.transaction.updateMany({
    where: {
      isRecurring: true,
      OR: [
        { description: { contains: "Celpe", mode: "insensitive" } },
        { description: { contains: "solar", mode: "insensitive" } },
        { description: { contains: "Tim Live", mode: "insensitive" } },
      ],
    },
    data: {
      isRecurring: false,
    },
  });
  console.log(`[3] Registros atualizados com isRecurring=false: ${updatedRemaining.count}`);

  // 4. Listar como ficaram as transações dessas contas no banco
  const remaining = await prisma.transaction.findMany({
    where: {
      deletedAt: null,
      OR: [
        { description: { contains: "Celpe", mode: "insensitive" } },
        { description: { contains: "solar", mode: "insensitive" } },
        { description: { contains: "Tim Live", mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      description: true,
      date: true,
      competenceDate: true,
      status: true,
      isRecurring: true,
    },
    orderBy: [{ description: "asc" }, { date: "asc" }],
  });

  console.log("\n--- Estado Final das Transações no Banco ---");
  for (const t of remaining) {
    const dStr = t.date ? new Date(t.date).toISOString().split("T")[0] : "";
    const cStr = t.competenceDate ? new Date(t.competenceDate).toISOString().split("T")[0] : "";
    console.log(`- ${t.description} | Data: ${dStr} | Comp: ${cStr} | Status: ${t.status} | Recorrente: ${t.isRecurring}`);
  }
}

runCleanup()
  .catch((e) => {
    console.error("Erro no cleanup:", e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
