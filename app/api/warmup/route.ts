import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Ping mínimo no PostgreSQL para manter o container Serverless e a conexão TCP/TLS aquecidos
    const startTime = performance.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Math.round(performance.now() - startTime);

    const url = new URL(request.url);
    if (url.searchParams.get("diag") === "1") {
      const { cookies } = await import("next/headers");
      const raw = (await cookies()).get("kamael_session")?.value;
      if (!raw) return NextResponse.json({ status: "no-session" }, { status: 401 });
      let sessionId = "";
      try { sessionId = JSON.parse(raw)?.id || ""; } catch {}
      const userExists = sessionId
        ? !!(await prisma.user.findUnique({ where: { id: sessionId }, select: { id: true } }))
        : false;
      const wallets = await prisma.wallet.findMany({
        where: { userId: sessionId },
        select: { id: true, title: true, walletType: true },
      });
      const from = new Date(Date.UTC(2026, 8, 1));
      const to = new Date(Date.UTC(2026, 9, 1));
      const walletInfo = [];
      for (const w of wallets) {
        const [total, setembro] = await Promise.all([
          prisma.transaction.count({ where: { walletId: w.id, deletedAt: null } }),
          prisma.transaction.count({
            where: {
              walletId: w.id,
              deletedAt: null,
              OR: [{ competenceMonth: 9, competenceYear: 2026 }, { date: { gte: from, lt: to } }],
            },
          }),
        ]);
        walletInfo.push({ title: w.title, tipo: w.walletType, lancamentos: total, setembro2026: setembro });
      }
      return NextResponse.json({
        status: "diag",
        dbLatencyMs,
        sessionUserId: sessionId ? sessionId.slice(0, 8) + "…" : null,
        sessionUserExistsInDb: userExists,
        wallets: walletInfo,
      });
    }

    return NextResponse.json({
      status: "warm",
      database: "connected",
      latencyMs: dbLatencyMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        message: error?.message || "Warmup failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
