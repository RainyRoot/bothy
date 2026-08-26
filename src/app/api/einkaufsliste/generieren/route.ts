import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aggregiereZutaten } from "@/lib/essensplan-shared";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const woche = typeof body?.woche === "string" && body.woche ? body.woche : null;
  const force = Boolean(body?.force);
  if (!woche) {
    return NextResponse.json({ error: "Woche fehlt" }, { status: 400 });
  }

  const wocheDatum = new Date(woche);
  const bestehend = await prisma.einkaufsliste.findUnique({ where: { woche: wocheDatum } });
  if (bestehend && !force) {
    const liste = await prisma.einkaufsliste.findUnique({
      where: { id: bestehend.id },
      include: { items: { orderBy: { sortierung: "asc" } } },
    });
    return NextResponse.json(liste);
  }

  const montag = wocheDatum;
  const sonntag = new Date(wocheDatum.getTime() + 6 * 86_400_000);
  const mahlzeiten = await prisma.mahlzeit.findMany({
    where: { datum: { gte: montag, lte: sonntag } },
  });
  const items = aggregiereZutaten(mahlzeiten.map((m) => m.zutaten));

  const liste = await prisma.$transaction(async (tx) => {
    const l = await tx.einkaufsliste.upsert({
      where: { woche: wocheDatum },
      create: { woche: wocheDatum },
      update: {},
    });
    await tx.einkaufslistenItem.deleteMany({ where: { einkaufslisteId: l.id } });
    await tx.einkaufslistenItem.createMany({
      data: items.map((text, i) => ({ einkaufslisteId: l.id, text, sortierung: i })),
    });
    return tx.einkaufsliste.findUnique({
      where: { id: l.id },
      include: { items: { orderBy: { sortierung: "asc" } } },
    });
  });

  return NextResponse.json(liste, { status: 201 });
}
