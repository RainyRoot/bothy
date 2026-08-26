import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const betragCent = typeof body?.betragCent === "number" ? Math.round(body.betragCent) : null;
  const notiz = typeof body?.notiz === "string" && body.notiz.trim() ? body.notiz.trim() : null;
  const datum = typeof body?.datum === "string" && body.datum ? new Date(body.datum) : new Date();

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
}
