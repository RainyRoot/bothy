import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mitEingabepruefung } from "@/lib/eingabe";
import { parsePlanEintraege, setzePlanUebungen } from "@/lib/trainingsplan";

export async function GET() {
  const plaene = await prisma.trainingsplan.findMany({
    orderBy: [{ archiviert: "asc" }, { sortierung: "asc" }, { name: "asc" }],
    include: { uebungen: { orderBy: { sortierung: "asc" }, include: { uebung: true } } },
  });
  return NextResponse.json(plaene);
}

export const POST = mitEingabepruefung(async (request: NextRequest) => {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 50) return NextResponse.json({ error: "Name fehlt oder ist zu lang" }, { status: 400 });
  const eintraege = parsePlanEintraege(body?.uebungen ?? []);

  const letzter = await prisma.trainingsplan.findFirst({ orderBy: { sortierung: "desc" } });
  const plan = await prisma.trainingsplan.create({ data: { name, sortierung: (letzter?.sortierung ?? -1) + 1 } });
  await setzePlanUebungen(plan.id, eintraege);
  return NextResponse.json(plan, { status: 201 });
});
