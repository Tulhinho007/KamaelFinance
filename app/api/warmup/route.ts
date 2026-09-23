import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Ping mínimo no PostgreSQL para manter o container Serverless e a conexão TCP/TLS aquecidos
    const startTime = performance.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Math.round(performance.now() - startTime);

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
