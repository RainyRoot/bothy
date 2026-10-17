import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { createSession } from "@/lib/session";

/**
 * Passwort vergessen: mit Name + Invite-Code (INVITE_CODE aus .env, kennen
 * nur die beiden) ein neues Passwort setzen. Ohne Mail-Versand der einzige
 * Weg, der nicht über SQL führt.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const inviteCode = typeof body?.inviteCode === "string" ? body.inviteCode : "";
  const neuesPasswort = typeof body?.neuesPasswort === "string" ? body.neuesPasswort : "";

  if (neuesPasswort.length < 8) {
    return NextResponse.json({ error: "Passwort muss mindestens 8 Zeichen haben" }, { status: 400 });
  }

  const erwartet = process.env.INVITE_CODE;
  const user = name ? await prisma.user.findUnique({ where: { name } }) : null;
  if (!erwartet || inviteCode !== erwartet || !user) {
    // Raten bremsen
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return NextResponse.json({ error: "Name oder Invite-Code falsch" }, { status: 401 });
  }

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(neuesPasswort) } });
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
