// Reine Funktionen ohne Server-Abhängigkeiten — von Materialisierer,
// Kalender-API und Client Components gleichermaßen genutzt (siehe
// CLAUDE.md: Kalenderansicht und Materialisierer nutzen dieselbe
// Expansionsfunktion). Rechnet ausschließlich mit UTC-Kalenderfeldern,
// nie mit lokalen Date-Methoden — sonst verschieben sich ganztägige
// Termine je nach Serverzeitzone um einen Tag (siehe PLAN.md 6).

export type Rhythmus = "KEINE" | "WOECHENTLICH" | "MONATLICH" | "JAEHRLICH";

export type TerminFuerExpansion = {
  id: string;
  start: Date;
  rhythmus: Rhythmus;
  serienEnde: Date | null;
  archiviert: boolean;
};

const TAG_MS = 86_400_000;
const MAX_VORKOMMEN = 5000;

export function tagSchluessel(d: Date): string {
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

/** Addiert Monate in UTC, klemmt auf den letzten Tag des Zielmonats (29./30./31. laufen nie über). */
export function addMonateGeklemmt(start: Date, monate: number): Date {
  const monatIndex = start.getUTCMonth() + monate;
  const zielJahr = start.getUTCFullYear() + Math.floor(monatIndex / 12);
  const zielMonat = ((monatIndex % 12) + 12) % 12;
  const letzterTagImZielmonat = new Date(Date.UTC(zielJahr, zielMonat + 1, 0)).getUTCDate();
  const tag = Math.min(start.getUTCDate(), letzterTagImZielmonat);
  return new Date(
    Date.UTC(
      zielJahr,
      zielMonat,
      tag,
      start.getUTCHours(),
      start.getUTCMinutes(),
      start.getUTCSeconds(),
      start.getUTCMilliseconds(),
    ),
  );
}

/**
 * Alle Vorkommen eines Termins, deren Zeitpunkt im Bereich [von, bis] liegt (inklusive),
 * unter Berücksichtigung von serienEnde und ausgesetzten Tagen.
 */
export function expandiereTermin(
  termin: TerminFuerExpansion,
  ausnahmeTage: ReadonlySet<string>,
  von: Date,
  bis: Date,
): Date[] {
  if (termin.archiviert) return [];

  const obergrenze = termin.serienEnde && termin.serienEnde < bis ? termin.serienEnde : bis;
  if (obergrenze < von) return [];

  if (termin.rhythmus === "KEINE") {
    if (termin.start >= von && termin.start <= bis && !ausnahmeTage.has(tagSchluessel(termin.start))) {
      return [termin.start];
    }
    return [];
  }

  const ergebnisse: Date[] = [];
  for (let n = 0; n < MAX_VORKOMMEN; n++) {
    const vorkommen =
      termin.rhythmus === "WOECHENTLICH"
        ? new Date(termin.start.getTime() + n * 7 * TAG_MS)
        : termin.rhythmus === "MONATLICH"
          ? addMonateGeklemmt(termin.start, n)
          : addMonateGeklemmt(termin.start, n * 12);

    if (vorkommen > obergrenze) break;
    if (vorkommen >= von && !ausnahmeTage.has(tagSchluessel(vorkommen))) {
      ergebnisse.push(vorkommen);
    }
  }
  return ergebnisse;
}
