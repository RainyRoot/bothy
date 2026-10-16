// Reine Funktionen ohne Server-Abhängigkeiten — von Materialisierer,
// Kalender-API und Client Components gleichermaßen genutzt (siehe
// CLAUDE.md: Kalenderansicht und Materialisierer nutzen dieselbe
// Expansionsfunktion).
//
// Ganztägige Termine (00:00 UTC des Datums) werden in UTC-Kalenderfeldern
// gerechnet, nie mit lokalen Date-Methoden — sonst verschieben sie sich je
// nach Serverzeitzone um einen Tag (siehe PLAN.md 6). Termine mit Uhrzeit
// dagegen in Berlin-Wanduhrzeit: "Di 19:00" bleibt 19:00, auch über die
// Zeitumstellung hinweg — ein fester 7-Tage-Schritt in UTC würde im Winter
// 18:00 ergeben.

import { berlinWallParts, berlinWallToUTC, toISODatum } from "@/lib/timezone";

export type Rhythmus = "KEINE" | "WOECHENTLICH" | "MONATLICH" | "JAEHRLICH";

export type TerminFuerExpansion = {
  id: string;
  start: Date;
  ganztags: boolean;
  rhythmus: Rhythmus;
  serienEnde: Date | null;
  archiviert: boolean;
};

const TAG_MS = 86_400_000;
const MAX_VORKOMMEN = 5000;

/** Uhrzeit (Berlin), zu der Erinnerungen an ganztägige Termine und Todos verankert sind. */
export const GANZTAGS_ERINNERUNG_UHRZEIT = "08:00";

export function tagSchluessel(d: Date): string {
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

/** Kalendertag eines Vorkommens: bei ganztägigen das gespeicherte UTC-Datum, sonst das Berlin-Datum. */
export function ereignisTagSchluessel(d: Date, ganztags: boolean): string {
  if (ganztags) return tagSchluessel(d);
  return tagSchluessel(new Date(`${berlinWallParts(d).datum}T00:00:00Z`));
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
    if (
      termin.start >= von &&
      termin.start <= obergrenze &&
      !ausnahmeTage.has(ereignisTagSchluessel(termin.start, termin.ganztags))
    ) {
      return [termin.start];
    }
    return [];
  }

  // Gerechnet wird auf dem Kalenderdatum (als 00:00 UTC): bei ganztägigen
  // ist das der Start selbst, sonst das Berlin-Datum des Starts. Die Uhrzeit
  // kommt erst am Ende als Berlin-Wanduhrzeit wieder dazu.
  const wand = termin.ganztags ? null : berlinWallParts(termin.start);
  const basisDatum = wand ? new Date(`${wand.datum}T00:00:00Z`) : termin.start;

  const ergebnisse: Date[] = [];
  for (let n = 0; n < MAX_VORKOMMEN; n++) {
    const tag =
      termin.rhythmus === "WOECHENTLICH"
        ? new Date(basisDatum.getTime() + n * 7 * TAG_MS)
        : termin.rhythmus === "MONATLICH"
          ? addMonateGeklemmt(basisDatum, n)
          : addMonateGeklemmt(basisDatum, n * 12);

    // Berlin liegt höchstens 2h neben UTC — ein Tag Puffer reicht, um die
    // teure Umrechnung für Vorkommen weit außerhalb des Bereichs zu sparen.
    if (tag.getTime() > obergrenze.getTime() + TAG_MS) break;
    if (tag.getTime() < von.getTime() - TAG_MS) continue;

    const vorkommen = wand ? berlinWallToUTC(toISODatum(tag), wand.zeit) : tag;
    if (vorkommen > obergrenze) break;
    if (vorkommen >= von && !ausnahmeTage.has(tagSchluessel(tag))) {
      ergebnisse.push(vorkommen);
    }
  }
  return ergebnisse;
}

/**
 * Wann die Erinnerung zu einem Vorkommen fällig ist. Mit Uhrzeit: schlicht
 * `vorkommen − minutenVorher`. Ganztägig (Termine wie Todos, 00:00 UTC
 * gespeichert): verankert an 08:00 Berlin — sonst käme "1 Tag vorher" für
 * einen Geburtstag um 02:00 nachts.
 */
export function erinnerungFaelligAm(vorkommen: Date, ganztags: boolean, minutenVorher: number): Date {
  if (!ganztags) return new Date(vorkommen.getTime() - minutenVorher * 60_000);

  const [stunde, minute] = GANZTAGS_ERINNERUNG_UHRZEIT.split(":").map(Number);
  const wandNaiv = new Date(
    Date.UTC(vorkommen.getUTCFullYear(), vorkommen.getUTCMonth(), vorkommen.getUTCDate(), stunde, minute) -
      minutenVorher * 60_000,
  );
  const zeit = `${String(wandNaiv.getUTCHours()).padStart(2, "0")}:${String(wandNaiv.getUTCMinutes()).padStart(2, "0")}`;
  return berlinWallToUTC(toISODatum(wandNaiv), zeit);
}

/**
 * Erinnerungen, die beim Anlegen schon länger als das hier vorbei wären,
 * werden gar nicht erst erzeugt — sonst schickt ein neuer Termin für morgen
 * mit "1 Woche vorher" sofort einen Push los.
 */
export const ERINNERUNG_NACHLAUF_MS = 5 * 60_000;
