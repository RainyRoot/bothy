import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToepfeMitStand } from "@/lib/toepfe";
import { datumOderNull, mitEingabepruefung } from "@/lib/eingabe";

export async function GET() {
  const toepfe = await getToepfeMitStand();
  return NextResponse.json(toepfe);
}

export const POST = mitEingabepruefung(async (request: NextRequest) => {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const typ = body?.typ === "SPARZIEL" ? "SPARZIEL" : body?.typ === "VERBRAUCH" ? "VERBRAUCH" : null;
  const farbe = typeof body?.farbe === "string" ? body.farbe : "#888888";
  const zielCent = typeof body?.zielCent === "number" ? Math.round(body.zielCent) : null;
  const zielDatum = datumOderNull(body?.zielDatum, "Zieldatum");

  if (!name || name.length > 50) {
    return NextResponse.json({ error: "Name fehlt oder ist zu lang" }, { status: 400 });
  }
  if (!typ) {
    return NextResponse.json({ error: "Typ fehlt" }, { status: 400 });
  }

  const topf = await prisma.topf.create({
    data: {
      name,
      typ,
      farbe,
      zielCent: typ === "SPARZIEL" ? zielCent : null,
      zielDatum: typ === "SPARZIEL" ? zielDatum : null,
    },
  });

  return NextResponse.json(topf, { status: 201 });
});
