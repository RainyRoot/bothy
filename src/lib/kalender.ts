import { prisma } from "@/lib/prisma";
import { expandiereTermin, tagSchluessel } from "@/lib/kalender-shared";

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
