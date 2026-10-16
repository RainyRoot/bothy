import { prisma } from "@/lib/prisma";
import { expandiereTermin, tagSchluessel } from "@/lib/kalender-shared";
import { berlinHeuteAlsDatum } from "@/lib/timezone";

export type Ereignis = {
  terminId: string;
  titel: string;
  ganztags: boolean;
  datum: Date;
  ort: string | null;
  farbe: string | null;
  betrifft: string;
  rhythmus: string;
};

export async function getEreignisse(von: Date, bis: Date): Promise<Ereignis[]> {
  const termine = await prisma.termin.findMany({
    where: { archiviert: false },
    include: { ausnahmen: true },
  });

  const ereignisse = termine.flatMap((termin) => {
    const ausnahmeTage = new Set(termin.ausnahmen.map((a) => tagSchluessel(a.datum)));
    return expandiereTermin(termin, ausnahmeTage, von, bis).map((datum) => ({
      terminId: termin.id,
      titel: termin.titel,
      ganztags: termin.ganztags,
      datum,
      ort: termin.ort,
      farbe: termin.farbe,
      betrifft: termin.betrifft,
      rhythmus: termin.rhythmus,
    }));
  });

  ereignisse.sort((a, b) => a.datum.getTime() - b.datum.getTime());
  return ereignisse;
}

/**
 * Was ab jetzt noch ansteht: ganztägige Termine ab heute (Berlin) — die
 * liegen als 00:00 UTC schon "in der Vergangenheit" —, Termine mit Uhrzeit
 * ab jetzt.
 */
export async function getAnstehendeEreignisse(tage: number): Promise<Ereignis[]> {
  const jetzt = new Date();
  const ereignisse = await getEreignisse(berlinHeuteAlsDatum(), new Date(jetzt.getTime() + tage * 86_400_000));
  return ereignisse.filter((e) => e.ganztags || e.datum >= jetzt);
}
