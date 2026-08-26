import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const vonTopfId = typeof body?.vonTopfId === "string" ? body.vonTopfId : null;
  const nachTopfId = typeof body?.nachTopfId === "string" ? body.nachTopfId : null;
  const betragCent = typeof body?.betragCent === "number" ? Math.round(body.betragCent) : null;
  const notiz = typeof body?.notiz === "string" && body.notiz.trim() ? body.notiz.trim() : null;

  if (!vonTopfId || !nachTopfId || vonTopfId === nachTopfId) {
    return NextResponse.json({ error: "Zwei unterschiedliche Töpfe erforderlich" }, { status: 400 });
  }
  if (!betragCent || betragCent <= 0) {
    return NextResponse.json({ error: "Betrag muss größer als 0 sein" }, { status: 400 });
  }

  const [von, nach] = await Promise.all([
    prisma.topf.findUnique({ where: { id: vonTopfId } }),
    prisma.topf.findUnique({ where: { id: nachTopfId } }),
  ]);
  if (!von || !nach) {
    return NextResponse.json({ error: "Topf nicht gefunden" }, { status: 404 });
  }

  const transferId = crypto.randomUUID();
  const datum = new Date();

  await prisma.$transaction([
    prisma.buchung.create({
      data: { topfId: vonTopfId, betragCent: -betragCent, notiz, datum, vonUserId: userId, transferId },
    }),
    prisma.buchung.create({
      data: { topfId: nachTopfId, betragCent, notiz, datum, vonUserId: userId, transferId },
    }),
  ]);

  return NextResponse.json({ ok: true, transferId }, { status: 201 });
}
