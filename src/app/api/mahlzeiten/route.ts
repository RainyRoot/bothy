import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { datumOderNull, mitEingabepruefung, zeitpunktOderNull } from "@/lib/eingabe";

export const GET = mitEingabepruefung(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const vonParam = searchParams.get("von");
  const bisParam = searchParams.get("bis");
  const von = zeitpunktOderNull(vonParam, "von") ?? new Date();
  const bis = zeitpunktOderNull(bisParam, "bis") ?? new Date(von.getTime() + 6 * 86_400_000);

  const mahlzeiten = await prisma.mahlzeit.findMany({
    where: { datum: { gte: von, lte: bis } },
    orderBy: { datum: "asc" },
  });

  return NextResponse.json(mahlzeiten);
});

export const POST = mitEingabepruefung(async (request: NextRequest) => {
  const body = await request.json().catch(() => null);
  const datum = datumOderNull(body?.datum, "Datum");
  const titel = typeof body?.titel === "string" ? body.titel.trim() : "";
  const zutaten = typeof body?.zutaten === "string" ? body.zutaten.trim() : "";

  if (!datum) {
    return NextResponse.json({ error: "Datum fehlt" }, { status: 400 });
  }
  if (!titel || titel.length > 100) {
    return NextResponse.json({ error: "Titel fehlt oder ist zu lang" }, { status: 400 });
  }

  const mahlzeit = await prisma.mahlzeit.create({
    data: { datum, titel, zutaten },
  });

  return NextResponse.json(mahlzeit, { status: 201 });
});
