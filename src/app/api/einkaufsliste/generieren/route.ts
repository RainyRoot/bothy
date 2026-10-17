import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aggregiereZutaten } from "@/lib/essensplan-shared";

/**
 * Baut die Liste aus dem Essensplan der Woche. Bei bestehender Liste (nur mit
 * force) wird zusammengeführt statt gelöscht: manuelle Einträge bleiben,
 * Häkchen bleiben bei allem, dessen Text weiterhin auf der Liste steht.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const woche = typeof body?.woche === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.woche) ? body.woche : null;
  const force = Boolean(body?.force);
  if (!woche) {
    return NextResponse.json({ error: "Woche fehlt oder ist ungültig" }, { status: 400 });
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
  const zutaten = aggregiereZutaten(mahlzeiten.map((m) => m.zutaten));

  const liste = await prisma.$transaction(async (tx) => {
    const l = await tx.einkaufsliste.upsert({
      where: { woche: wocheDatum },
      create: { woche: wocheDatum },
      update: {},
    });

    const alteItems = await tx.einkaufslistenItem.findMany({ where: { einkaufslisteId: l.id } });
    const manuelle = alteItems.filter((i) => i.manuell);
    const abgehaktNachText = new Map(alteItems.map((i) => [i.text.toLowerCase(), i.abgehakt]));
    const manuelleTexte = new Set(manuelle.map((i) => i.text.toLowerCase()));

    await tx.einkaufslistenItem.deleteMany({ where: { einkaufslisteId: l.id, manuell: false } });

    // Zutat steht schon als manueller Eintrag drauf → nicht doppelt anlegen
    const neue = zutaten.filter((text) => !manuelleTexte.has(text.toLowerCase()));
    await tx.einkaufslistenItem.createMany({
      data: neue.map((text, i) => ({
        einkaufslisteId: l.id,
        text,
        sortierung: i,
        abgehakt: abgehaktNachText.get(text.toLowerCase()) ?? false,
      })),
    });

    // Manuelle Einträge hinten anstellen, Reihenfolge untereinander bleibt
    const sortiert = [...manuelle].sort((a, b) => a.sortierung - b.sortierung);
    for (const [i, item] of sortiert.entries()) {
      await tx.einkaufslistenItem.update({ where: { id: item.id }, data: { sortierung: neue.length + i } });
    }

    return tx.einkaufsliste.findUnique({
      where: { id: l.id },
      include: { items: { orderBy: { sortierung: "asc" } } },
    });
  });

  return NextResponse.json(liste, { status: 201 });
}
