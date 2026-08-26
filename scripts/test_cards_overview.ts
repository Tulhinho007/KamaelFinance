import { getAllCardsOverview } from "../lib/actions";

async function main() {
  const cards = await getAllCardsOverview(9, 2026);
  console.log("Cards para 09/2026:");
  for (const c of cards) {
    console.log(`- ${c.title} (${c.walletType}): faturaAtual=${c.faturaAtual}, faturaPaga=${(c as any).faturaPaga}, faturaPendente=${(c as any).faturaPendente}`);
  }
}

main().catch(console.error);
