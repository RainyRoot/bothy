import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { createSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const inviteCode = typeof body?.inviteCode === "string" ? body.inviteCode : "";

  if (!name || name.length > 50) {
    return NextResponse.json({ error: "Name fehlt oder ist zu lang" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Passwort muss mindestens 8 Zeichen haben" }, { status: 400 });
  }

  const expectedInviteCode = process.env.INVITE_CODE;
  if (!expectedInviteCode || inviteCode !== expectedInviteCode) {
    return NextResponse.json({ error: "Invite-Code falsch" }, { status: 401 });
  }

  const userCount = await prisma.user.count();
  if (userCount >= 2) {
    return NextResponse.json({ error: "Setup ist bereits abgeschlossen" }, { status: 403 });
  }

  const existing = await prisma.user.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json({ error: "Name ist bereits vergeben" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({ data: { name, passwordHash } });

  await createSession(user.id);

  return NextResponse.json({ ok: true });
}
