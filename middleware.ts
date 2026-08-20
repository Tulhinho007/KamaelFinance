import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rate limiting simplificado em memória para middleware
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();

function applyRateLimit(ip: string, limit = 100, windowMs = 60 * 1000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || entry.expiresAt < now) {
    rateLimitMap.set(ip, { count: 1, expiresAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count += 1;
  return true;
}

// Padrões de injeção maliciosa (SQL, NoSQL, XSS)
const MALICIOUS_PATTERNS = [
  /<script[\s>]/i,
  /javascript:/i,
  /union\s+select/i,
  /select\s+.*\s+from/i,
  /drop\s+table/i,
  /exec\(\s*$/i,
  /\$where/i,
  /\$gt/i,
];

function containsMaliciousPayload(urlStr: string): boolean {
  return MALICIOUS_PATTERNS.some((pattern) => pattern.test(urlStr));
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1";

  // 1. Hardening Layer: Proteção contra Payloads Maliciosos na URL / Query
  const fullUrl = `${pathname}${search}`;
  if (containsMaliciousPayload(fullUrl)) {
    return new NextResponse("Acesso bloqueado por motivo de segurança (Payload suspeito detectado).", {
      status: 403,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // 2. Rate Limiting por IP
  if (!applyRateLimit(ip, 120, 60 * 1000)) {
    return new NextResponse("Muitas requisições. Aguarde um momento.", {
      status: 429,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const sessionCookie = request.cookies.get("kamael_session")?.value;
  const isPublicRoute = pathname === "/login" || pathname === "/cadastro";

  // Se o usuário NÃO estiver logado e tentar acessar uma rota protegida -> redireciona para /login
  if (!sessionCookie && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Se o usuário JÁ estiver logado e tentar acessar /login ou /cadastro -> redireciona para / (Dashboard)
  if (sessionCookie && isPublicRoute) {
    const dashboardUrl = new URL("/", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  const response = NextResponse.next();

  // 3. Security Hardening Headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;"
  );

  return response;
}

export const config = {
  matcher: [
    /*
     * Intercepta todas as rotas do app exceto arquivos estáticos,
     * requisições internas do Next.js e ícone favicon.
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
