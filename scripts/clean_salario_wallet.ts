import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("Buscando todas as carteiras...");
  const wallets = await prisma.wallet.findMany();
  console.log("Carteiras encontradas no banco:", wallets.map(w => ({ id: w.id, title: w.title, bankName: w.bankName, type: w.walletType })));

  const salarioWallets = wallets.filter(w => 
    w.title.toLowerCase().includes("salário") || 
    w.title.toLowerCase().includes("salario") ||
    (w.bankName && w.bankName.toLowerCase().includes("salario"))
  );

  if (salarioWallets.length > 0) {
    console.log(`Encontrada(s) ${salarioWallets.length} carteira(s) mock 'Salário'. Removendo...`);
    for (const w of salarioWallets) {
      // Re-assign transactions to another wallet or delete
      await prisma.transaction.deleteMany({ where: { walletId: w.id } });
      await prisma.wallet.delete({ where: { id: w.id } });
      console.log(`Carteira '${w.title}' (${w.id}) removida com sucesso.`);
    }
  } else {
    console.log("Nenhuma carteira 'Salário' encontrada no banco de dados.");
  }

  const remaining = await prisma.wallet.findMany();
  console.log("Carteiras finais no banco:", remaining.map(w => ({ id: w.id, title: w.title, type: w.walletType })));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
