// Speichern immer UTC, Anzeige/Eingabe immer Europe/Berlin (siehe CLAUDE.md
// harte Regeln). Nutzt nur die eingebaute Intl-API, keine neue Dependency.

const BERLIN_TZ = "Europe/Berlin";

/** Offset in Minuten (UTC -> Berlin) zum gegebenen Zeitpunkt, inkl. Sommerzeit. */
function berlinOffsetMinuten(instant: Date): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: BERLIN_TZ,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const teile = formatter.formatToParts(instant);
  const get = (type: string) => Number(teile.find((p) => p.type === type)?.value ?? 0);
  const alsUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((alsUTC - instant.getTime()) / 60_000);
}

/** Wandelt "YYYY-MM-DD" + "HH:mm" (als Berlin-Ortszeit gemeint) in einen UTC-Zeitpunkt um. */
export function berlinWallToUTC(datum: string, zeit: string): Date {
  const [jahr, monat, tag] = datum.split("-").map(Number);
  const [stunde, minute] = zeit.split(":").map(Number);
  const naiv = Date.UTC(jahr, monat - 1, tag, stunde, minute);
  const offset = berlinOffsetMinuten(new Date(naiv));
  return new Date(naiv - offset * 60_000);
}

/** UTC-Zeitpunkt zurück in Berlin-Ortszeit-Bestandteile ("YYYY-MM-DD", "HH:mm") — Umkehrung von berlinWallToUTC. */
export function berlinWallParts(d: Date): { datum: string; zeit: string } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: BERLIN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const teile = formatter.formatToParts(d);
  const get = (type: string) => teile.find((p) => p.type === type)?.value ?? "";
  return { datum: `${get("year")}-${get("month")}-${get("day")}`, zeit: `${get("hour")}:${get("minute")}` };
}

export function formatBerlinDatum(d: Date): string {
  return new Intl.DateTimeFormat("de-DE", { timeZone: BERLIN_TZ, dateStyle: "medium" }).format(d);
}

export function formatBerlinZeit(d: Date): string {
  return new Intl.DateTimeFormat("de-DE", { timeZone: BERLIN_TZ, timeStyle: "short" }).format(d);
}

export function formatBerlinDatumZeit(d: Date): string {
  return new Intl.DateTimeFormat("de-DE", { timeZone: BERLIN_TZ, dateStyle: "medium", timeStyle: "short" }).format(d);
}

/** Heutiges Kalenderdatum in Berlin (kann sich von UTC-"heute" um bis zu einen Tag unterscheiden). */
export function berlinHeute(): { jahr: number; monat: number; tag: number } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: BERLIN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const teile = formatter.formatToParts(new Date());
  const get = (type: string) => Number(teile.find((p) => p.type === type)?.value ?? 0);
  return { jahr: get("year"), monat: get("month"), tag: get("day") };
}

/** "YYYY-MM-DD" der UTC-Kalenderdaten (für ganztägige Termine, die als 00:00 UTC gespeichert sind). */
export function toISODatum(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
