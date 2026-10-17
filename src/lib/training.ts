import { prisma } from "@/lib/prisma";
import { montagDerWoche, addTage } from "@/lib/essensplan-shared";
import { berlinHeuteAlsDatum, toISODatum } from "@/lib/timezone";
import type { SatzWerte } from "@/lib/training-shared";

// Alles hier wird gerechnet, nichts gespeichert (PLAN.md 4.5): "letztes Mal",
// Rekorde und die Wochen-Serie sind Queries über Satz/Training.

export type SatzDto = SatzWerte & {
  id: string;
  trainingId: string;
  userId: string;
  uebungId: string;
  createdAt: string;
};

export type LetztesMal = { userId: string; uebungId: string; datum: string; saetze: SatzWerte[] };
export type Rekord = SatzWerte & { userId: string; uebungId: string; datum: string };

export function satzZuDto(s: {
  id: string;
  trainingId: string;
  userId: string;
  uebungId: string;
  gewichtGramm: number;
  wiederholungen: number;
  createdAt: Date;
}): SatzDto {
  return {
    id: s.id,
    trainingId: s.trainingId,
    userId: s.userId,
    uebungId: s.uebungId,
    gewichtGramm: s.gewichtGramm,
    wiederholungen: s.wiederholungen,
    createdAt: s.createdAt.toISOString(),
  };
}

/** Das heute (Berlin) laufende Training, falls es eins gibt — "Training starten" tritt dem bei. */
export async function laufendesTrainingHeute() {
  return prisma.training.findFirst({
    where: { datum: berlinHeuteAlsDatum(), beendetAt: null },
    orderBy: { gestartetAt: "asc" },
  });
}

/**
 * Je Person und Übung die Sätze aus dem jüngsten Training, das nicht
 * `ausserTrainingId` ist (PLAN.md 4.5: "aus dem jüngsten *anderen* Training").
 */
export async function letztesMalAlle(ausserTrainingId: string | null): Promise<LetztesMal[]> {
  const juengste = await prisma.$queryRaw<{ userId: string; uebungId: string; trainingId: string }[]>`
    SELECT DISTINCT ON (s."userId", s."uebungId") s."userId", s."uebungId", s."trainingId"
    FROM "Satz" s
    WHERE s."trainingId" <> ${ausserTrainingId ?? ""}
    ORDER BY s."userId", s."uebungId", s."createdAt" DESC
  `;
  if (juengste.length === 0) return [];

  const trainingIds = [...new Set(juengste.map((j) => j.trainingId))];
  const [saetze, trainings] = await Promise.all([
    prisma.satz.findMany({ where: { trainingId: { in: trainingIds } }, orderBy: { createdAt: "asc" } }),
    prisma.training.findMany({ where: { id: { in: trainingIds } }, select: { id: true, datum: true } }),
  ]);
  const datumVon = new Map(trainings.map((t) => [t.id, toISODatum(t.datum)]));

  return juengste.map((j) => ({
    userId: j.userId,
    uebungId: j.uebungId,
    datum: datumVon.get(j.trainingId) ?? "",
    saetze: saetze
      .filter((s) => s.trainingId === j.trainingId && s.userId === j.userId && s.uebungId === j.uebungId)
      .map((s) => ({ gewichtGramm: s.gewichtGramm, wiederholungen: s.wiederholungen })),
  }));
}

// Muss zur Sortierung von istBesser (training-shared.ts) passen: Epley, dann Wiederholungen
const EPLEY_SQL = `ROUND(("gewichtGramm" * (30 + "wiederholungen"))::numeric / 30)`;

/** Bester Satz je Person und Übung. */
export async function rekordeAlle(): Promise<Rekord[]> {
  const zeilen = await prisma.$queryRawUnsafe<
    { userId: string; uebungId: string; gewichtGramm: number; wiederholungen: number; datum: Date }[]
  >(`
    SELECT DISTINCT ON (s."userId", s."uebungId")
      s."userId", s."uebungId", s."gewichtGramm", s."wiederholungen", t."datum"
    FROM "Satz" s JOIN "Training" t ON t."id" = s."trainingId"
    ORDER BY s."userId", s."uebungId", ${EPLEY_SQL} DESC, s."wiederholungen" DESC, s."createdAt" ASC
  `);
  return zeilen.map((z) => ({ ...z, datum: toISODatum(z.datum) }));
}

/** Bisher bester Satz einer Person bei einer Übung, ohne den Satz `ausserSatzId`. */
export async function bisherigerRekord(
  userId: string,
  uebungId: string,
  ausserSatzId: string,
): Promise<SatzWerte | null> {
  const [zeile] = await prisma.$queryRawUnsafe<SatzWerte[]>(
    `SELECT "gewichtGramm", "wiederholungen" FROM "Satz"
     WHERE "userId" = $1 AND "uebungId" = $2 AND "id" <> $3
     ORDER BY ${EPLEY_SQL} DESC, "wiederholungen" DESC
     LIMIT 1`,
    userId,
    uebungId,
    ausserSatzId,
  );
  return zeile ?? null;
}

export type WochenSerie = {
  /** Trainings diese Woche je Person (zählt, wo die Person mindestens einen Satz hat) */
  dieseWoche: Record<string, number>;
  /** Wochen in Folge mit mindestens einem Training, bis einschließlich dieser (oder, falls diese noch leer ist, letzter) Woche */
  wochenInFolge: number;
};

export async function wochenSerie(): Promise<WochenSerie> {
  const zeilen = await prisma.$queryRaw<{ datum: Date; userId: string; trainingId: string }[]>`
    SELECT DISTINCT t."datum", s."userId", t."id" AS "trainingId"
    FROM "Training" t JOIN "Satz" s ON s."trainingId" = t."id"
  `;

  const dieseWocheMontag = montagDerWoche(toISODatum(berlinHeuteAlsDatum()));
  const dieseWoche: Record<string, number> = {};
  const wochen = new Set<string>();
  const gezaehlt = new Set<string>();
  for (const z of zeilen) {
    const montag = montagDerWoche(toISODatum(z.datum));
    wochen.add(montag);
    const schluessel = `${z.userId}:${z.trainingId}`;
    if (montag === dieseWocheMontag && !gezaehlt.has(schluessel)) {
      gezaehlt.add(schluessel);
      dieseWoche[z.userId] = (dieseWoche[z.userId] ?? 0) + 1;
    }
  }

  // Eine noch leere laufende Woche bricht die Serie nicht — sonst stünde
  // montags früh immer 0 da
  let woche = wochen.has(dieseWocheMontag) ? dieseWocheMontag : addTage(dieseWocheMontag, -7);
  let wochenInFolge = 0;
  while (wochen.has(woche)) {
    wochenInFolge++;
    woche = addTage(woche, -7);
  }
  return { dieseWoche, wochenInFolge };
}

/**
 * Ein vergessenes "Beenden" darf nicht ewig offen bleiben: Trainings von
 * früheren Tagen werden geschlossen (Serverstart + täglich 03:00). Sonst
 * landen am nächsten Tag Sätze im Training von gestern, und die andere
 * Person startet ein eigenes, weil sie nur nach heute sucht.
 */
export async function beendeVergesseneTrainings(): Promise<number> {
  const { count } = await prisma.training.updateMany({
    where: { beendetAt: null, datum: { lt: berlinHeuteAlsDatum() } },
    data: { beendetAt: new Date() },
  });
  return count;
}
