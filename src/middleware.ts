import { NextRequest, NextResponse } from "next/server";
import { verifyValue } from "@/lib/signed-value";
import { SESSION_COOKIE_NAME } from "@/lib/session";

const PUBLIC_PATHS = ["/login", "/setup", "/passwort-vergessen"];
const PUBLIC_API_PREFIXES = ["/api/login", "/api/setup", "/api/passwort-zuruecksetzen"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifyValue<{ userId: string }>(sessionCookie);

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // manifest.json und sw.js müssen ohne Session erreichbar sein: Chrome holt
  // das Manifest ohne Cookies, und ein Service-Worker-Skript darf nicht umleiten
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
