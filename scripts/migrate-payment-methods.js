const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Sanitizing existing transaction payment methods ---');

  // 1. Credit card transactions -> CREDITO
  const credRes = await prisma.$executeRawUnsafe(`
    UPDATE "Transaction"
    SET "paymentMethod" = 'CREDITO'
    WHERE "walletId" IN (SELECT id FROM "Wallet" WHERE "walletType" = 'CREDIT_CARD')
       OR "paymentMethod" = 'CARTAO_CREDITO';
  `);
  console.log(`Updated credit card txs: ${credRes}`);

  // 2. Concessionary / Utility bills to BOLETO
  const boletoRes = await prisma.$executeRawUnsafe(`
    UPDATE "Transaction"
    SET "paymentMethod" = 'BOLETO'
    WHERE "walletId" IN (SELECT id FROM "Wallet" WHERE "walletType" != 'CREDIT_CARD')
      AND (
        LOWER("description") LIKE '%conta de energia%'
        OR LOWER("description") LIKE '%conta luz%'
        OR LOWER("description") LIKE '%energia - celpe%'
        OR LOWER("description") LIKE '%solavista energia%'
        OR LOWER("description") LIKE '%fatura tim%'
      )
      AND LOWER("description") NOT LIKE '%agua + lanche%'
      AND LOWER("description") NOT LIKE '%nildo - agua%';
  `);
  console.log(`Updated utility bills to BOLETO: ${boletoRes}`);

  // 3. Transactions with null paymentMethod -> DEBITO
  const debitoRes = await prisma.$executeRawUnsafe(`
    UPDATE "Transaction"
    SET "paymentMethod" = 'DEBITO'
    WHERE "paymentMethod" IS NULL;
  `);
  console.log(`Updated null to DEBITO: ${debitoRes}`);

  // 4. Any remaining invalid strings mapped to DEBITO
  const invalidRes = await prisma.$executeRawUnsafe(`
    UPDATE "Transaction"
    SET "paymentMethod" = 'DEBITO'
    WHERE "paymentMethod" NOT IN ('PIX', 'DEBITO', 'BOLETO', 'DINHEIRO', 'CREDITO');
  `);
  console.log(`Updated invalid to DEBITO: ${invalidRes}`);

  // 5. Create Enum in Postgres if not exists
  console.log('Creating PaymentMethod enum in Postgres if needed...');
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'DEBITO', 'BOLETO', 'DINHEIRO', 'CREDITO');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // 6. Alter column type to PaymentMethod with default DEBITO
  console.log('Altering column type to PaymentMethod...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Transaction" 
    ALTER COLUMN "paymentMethod" DROP DEFAULT;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Transaction" 
    ALTER COLUMN "paymentMethod" TYPE "PaymentMethod" 
    USING "paymentMethod"::"PaymentMethod";
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Transaction" 
    ALTER COLUMN "paymentMethod" SET DEFAULT 'DEBITO'::"PaymentMethod";
  `);

  console.log('Migration completed successfully!');

  // Verify counts
  const finalCounts = await prisma.$queryRawUnsafe(`
    SELECT "paymentMethod", count(*) as count 
    FROM "Transaction" 
    GROUP BY "paymentMethod";
  `);
  console.log('Final counts:', finalCounts);
}

main().catch(console.error).finally(() => prisma.$disconnect());
