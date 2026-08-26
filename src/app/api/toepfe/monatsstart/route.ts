import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

const MONATSSTART_NOTIZ = "Monatsstart";

export async function GET() {
  const toepfe = await prisma.topf.findMany({
    where: { archiviert: false, typ: "VERBRAUCH" },
    orderBy: { sortierung: "asc" },
  });

  const vorschlaege = await Promise.all(
    toepfe.map(async (topf) => {
      const letzte = await prisma.buchung.findFirst({
        where: { topfId: topf.id, notiz: MONATSSTART_NOTIZ },
        orderBy: { datum: "desc" },
      });
      return { topfId: topf.id, name: topf.name, farbe: topf.farbe, vorschlagCent: letzte?.betragCent ?? 0 };
    }),
  );

  return NextResponse.json(vorschlaege);
}

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const eintraege: unknown[] | null = Array.isArray(body?.eintraege) ? body.eintraege : null;
  if (!eintraege || eintraege.length === 0) {
    return NextResponse.json({ error: "Keine Einträge übergeben" }, { status: 400 });
  }

  const datum = new Date();
  const daten = eintraege
    .filter(
      (e: unknown): e is { topfId: string; betragCent: number } =>
        typeof (e as Record<string, unknown>)?.topfId === "string" &&
        typeof (e as Record<string, unknown>)?.betragCent === "number" &&
        ((e as { betragCent: number }).betragCent > 0),
    )
    .map((e) => ({
      topfId: e.topfId,
      betragCent: Math.round(e.betragCent),
      notiz: MONATSSTART_NOTIZ,
      datum,
      vonUserId: userId,
    }));

  if (daten.length === 0) {
    return NextResponse.json({ error: "Keine gültigen Beträge übergeben" }, { status: 400 });
  }

  await prisma.buchung.createMany({ data: daten });

  return NextResponse.json({ ok: true, anzahl: daten.length }, { status: 201 });
}
