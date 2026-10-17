import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTopfStand } from "@/lib/toepfe";
import { datumOderNull, mitEingabepruefung } from "@/lib/eingabe";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const topf = await prisma.topf.findUnique({
    where: { id },
    include: {
      buchungen: { orderBy: { datum: "desc" }, include: { vonUser: { select: { id: true, name: true } } } },
    },
  });
  if (!topf) {
    return NextResponse.json({ error: "Topf nicht gefunden" }, { status: 404 });
  }

  const standCent = await getTopfStand(id);

  return NextResponse.json({ ...topf, standCent });
}

export const PATCH = mitEingabepruefung(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const data: Record<string, unknown> = {};
  if (typeof body?.name === "string") {
    const name = body.name.trim();
    if (!name || name.length > 50) {
      return NextResponse.json({ error: "Name fehlt oder ist zu lang" }, { status: 400 });
    }
    data.name = name;
  }
  if (typeof body?.farbe === "string") data.farbe = body.farbe;
  if (typeof body?.sortierung === "number") data.sortierung = body.sortierung;
  if (typeof body?.archiviert === "boolean") data.archiviert = body.archiviert;
  if (body?.typ === "VERBRAUCH" || body?.typ === "SPARZIEL") data.typ = body.typ;
  if (typeof body?.zielCent === "number") data.zielCent = Math.round(body.zielCent);
  if (body?.zielCent === null) data.zielCent = null;
  if (body?.zielDatum !== undefined) data.zielDatum = datumOderNull(body.zielDatum, "Zieldatum");
  // Ziel gibt es nur bei Sparzielen (siehe Schema)
  if (data.typ === "VERBRAUCH") {
    data.zielCent = null;
    data.zielDatum = null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Keine Änderungen übergeben" }, { status: 400 });
  }

  const topf = await prisma.topf.update({ where: { id }, data }).catch(() => null);
  if (!topf) {
    return NextResponse.json({ error: "Topf nicht gefunden" }, { status: 404 });
  }
  return NextResponse.json(topf);
});
