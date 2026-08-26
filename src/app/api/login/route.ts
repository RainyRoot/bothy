import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!name || !password) {
    return NextResponse.json({ error: "Name und Passwort erforderlich" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { name } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Name oder Passwort falsch" }, { status: 401 });
  }

  await createSession(user.id);

  return NextResponse.json({ ok: true });
}
