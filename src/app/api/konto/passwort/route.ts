import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const altesPasswort = typeof body?.altesPasswort === "string" ? body.altesPasswort : "";
  const neuesPasswort = typeof body?.neuesPasswort === "string" ? body.neuesPasswort : "";

  if (neuesPasswort.length < 8) {
    return NextResponse.json({ error: "Neues Passwort muss mindestens 8 Zeichen haben" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !(await verifyPassword(altesPasswort, user.passwordHash))) {
    return NextResponse.json({ error: "Aktuelles Passwort stimmt nicht" }, { status: 401 });
  }

  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(neuesPasswort) } });
  return NextResponse.json({ ok: true });
}
