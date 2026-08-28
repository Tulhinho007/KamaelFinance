const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const terms = ['Futvolei', 'Internet', 'Google IA'];
  for (const term of terms) {
    const tx = await prisma.transaction.deleteMany({
      where: {
        description: {
          contains: term,
          mode: 'insensitive'
        }
      }
    });
    const sub = await prisma.subscription.deleteMany({
      where: {
        name: {
          contains: term,
          mode: 'insensitive'
        }
      }
    });
    console.log(`Term: "${term}" | Deleted Transactions: ${tx.count} | Deleted Subscriptions: ${sub.count}`);
  }
  await prisma.$disconnect();
}

run().catch(console.error);
