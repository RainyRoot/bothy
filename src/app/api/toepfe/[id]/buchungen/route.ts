import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { datumOderNull, mitEingabepruefung } from "@/lib/eingabe";
import { berlinHeuteAlsDatum } from "@/lib/timezone";

export const POST = mitEingabepruefung(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const betragCent = typeof body?.betragCent === "number" ? Math.round(body.betragCent) : null;
  const notiz = typeof body?.notiz === "string" && body.notiz.trim() ? body.notiz.trim() : null;
  // Ohne Angabe: heute in Berlin — new Date() wäre zwischen 00:00 und 02:00 noch gestern (UTC)
  const datum = datumOderNull(body?.datum, "Datum") ?? berlinHeuteAlsDatum();

  if (!betragCent || betragCent === 0) {
    return NextResponse.json({ error: "Betrag fehlt" }, { status: 400 });
  }

  const topf = await prisma.topf.findUnique({ where: { id } });
  if (!topf) {
    return NextResponse.json({ error: "Topf nicht gefunden" }, { status: 404 });
  }

  const buchung = await prisma.buchung.create({
    data: { topfId: id, betragCent, notiz, datum, vonUserId: userId },
  });

  return NextResponse.json(buchung, { status: 201 });
});
