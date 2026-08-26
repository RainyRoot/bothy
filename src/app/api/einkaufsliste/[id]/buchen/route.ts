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
  const topfId = typeof body?.topfId === "string" ? body.topfId : null;

  if (!betragCent || betragCent <= 0) {
    return NextResponse.json({ error: "Betrag muss größer als 0 sein" }, { status: 400 });
  }
  if (!topfId) {
    return NextResponse.json({ error: "Topf fehlt" }, { status: 400 });
  }

  const [liste, topf] = await Promise.all([
    prisma.einkaufsliste.findUnique({ where: { id } }),
    prisma.topf.findUnique({ where: { id: topfId } }),
  ]);
  if (!liste || !topf) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }

  const buchung = await prisma.buchung.create({
    data: {
      topfId,
      betragCent: -betragCent,
      notiz: "Einkauf",
      datum: new Date(),
      vonUserId: userId,
    },
  });

  return NextResponse.json(buchung, { status: 201 });
}
