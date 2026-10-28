-- ==============================================================================
-- MIGRATION: ISOLAMENTO MULTI-TENANT POR USUÁRIO E ROW LEVEL SECURITY (RLS)
-- Kamael Finance - PostgreSQL / Supabase
-- ==============================================================================

-- 1. ADICIONA A COLUNA userId EM TODAS AS TABELAS DE FINANÇAS E INVESTIMENTOS
ALTER TABLE "Investment" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "VariableAsset" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "CryptoAsset" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "BettingAccount" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "OtherInvestment" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "InvoicePayment" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- 2. BACKFILL (POVOAMENTO) DA COLUNA userId NAS TABELAS FILHAS
UPDATE "Transaction" t
SET "userId" = w."userId"
FROM "Wallet" w
WHERE t."walletId" = w.id
  AND (t."userId" IS NULL OR t."userId" = '');

UPDATE "InvoicePayment" ip
SET "userId" = w."userId"
FROM "Wallet" w
WHERE ip."walletId" = w.id
  AND (ip."userId" IS NULL OR ip."userId" = '');

-- 3. CRIAÇÃO DE ÍNDICES PARA ALTA PERFORMANCE DE FILTRO POR userId
CREATE INDEX IF NOT EXISTS "Transaction_userId_idx" ON "Transaction"("userId");
CREATE INDEX IF NOT EXISTS "Investment_userId_idx" ON "Investment"("userId");
CREATE INDEX IF NOT EXISTS "VariableAsset_userId_idx" ON "VariableAsset"("userId");
CREATE INDEX IF NOT EXISTS "CryptoAsset_userId_idx" ON "CryptoAsset"("userId");
CREATE INDEX IF NOT EXISTS "BettingAccount_userId_idx" ON "BettingAccount"("userId");
CREATE INDEX IF NOT EXISTS "OtherInvestment_userId_idx" ON "OtherInvestment"("userId");
CREATE INDEX IF NOT EXISTS "Subscription_userId_idx" ON "Subscription"("userId");
CREATE INDEX IF NOT EXISTS "InvoicePayment_userId_idx" ON "InvoicePayment"("userId");

-- 4. ATIVAÇÃO DE ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS
ALTER TABLE "Wallet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Investment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VariableAsset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VariableTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CryptoAsset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CryptoTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BettingAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BettingTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OtherInvestment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Goal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GoalHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EventProject" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EventItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SubscriptionPayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InvoicePayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CategoryBudget" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserChallenge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserBadge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HealthScoreHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CreditPixOperation" ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICAS ESTRITAS DE ISOLAMENTO POR USUÁRIO (auth.uid() = userId)
DO $$
BEGIN
  -- Wallet
  DROP POLICY IF EXISTS "User isolate data" ON "Wallet";
  CREATE POLICY "User isolate data" ON "Wallet"
  FOR ALL USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");

  -- Transaction
  DROP POLICY IF EXISTS "User isolate data" ON "Transaction";
  CREATE POLICY "User isolate data" ON "Transaction"
  FOR ALL USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");

  -- Investment
  DROP POLICY IF EXISTS "User isolate data" ON "Investment";
  CREATE POLICY "User isolate data" ON "Investment"
  FOR ALL USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");

  -- VariableAsset
  DROP POLICY IF EXISTS "User isolate data" ON "VariableAsset";
  CREATE POLICY "User isolate data" ON "VariableAsset"
  FOR ALL USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");

  -- CryptoAsset
  DROP POLICY IF EXISTS "User isolate data" ON "CryptoAsset";
  CREATE POLICY "User isolate data" ON "CryptoAsset"
  FOR ALL USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");

  -- BettingAccount
  DROP POLICY IF EXISTS "User isolate data" ON "BettingAccount";
  CREATE POLICY "User isolate data" ON "BettingAccount"
  FOR ALL USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");

  -- OtherInvestment
  DROP POLICY IF EXISTS "User isolate data" ON "OtherInvestment";
  CREATE POLICY "User isolate data" ON "OtherInvestment"
  FOR ALL USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");

  -- Goal
  DROP POLICY IF EXISTS "User isolate data" ON "Goal";
  CREATE POLICY "User isolate data" ON "Goal"
  FOR ALL USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");

  -- EventProject
  DROP POLICY IF EXISTS "User isolate data" ON "EventProject";
  CREATE POLICY "User isolate data" ON "EventProject"
  FOR ALL USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");

  -- Subscription
  DROP POLICY IF EXISTS "User isolate data" ON "Subscription";
  CREATE POLICY "User isolate data" ON "Subscription"
  FOR ALL USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");

  -- InvoicePayment
  DROP POLICY IF EXISTS "User isolate data" ON "InvoicePayment";
  CREATE POLICY "User isolate data" ON "InvoicePayment"
  FOR ALL USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");

  -- CategoryBudget
  DROP POLICY IF EXISTS "User isolate data" ON "CategoryBudget";
  CREATE POLICY "User isolate data" ON "CategoryBudget"
  FOR ALL USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");

  -- CreditPixOperation
  DROP POLICY IF EXISTS "User isolate data" ON "CreditPixOperation";
  CREATE POLICY "User isolate data" ON "CreditPixOperation"
  FOR ALL USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");
END $$;
