import { NextResponse } from "next/server";
import { berlinWallToUTC } from "@/lib/timezone";

// Prüfung von Datumsangaben aus Request-Bodies. Ohne sie wird aus "quatsch"
// ein Invalid Date, und Prisma antwortet mit einem 500 statt eines 400.

export class UngueltigeEingabe extends Error {}

const DATUM_RE = /^\d{4}-\d{2}-\d{2}$/;
const ZEIT_RE = /^\d{2}:\d{2}$/;

function istEchtesDatum(wert: string): boolean {
  const d = new Date(`${wert}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === wert;
}

/** "YYYY-MM-DD" → 00:00 UTC (Darstellung für `@db.Date`). Leer/fehlend → null, alles andere → 400. */
export function datumOderNull(wert: unknown, feld: string): Date | null {
  if (wert === undefined || wert === null || wert === "") return null;
  if (typeof wert !== "string" || !DATUM_RE.test(wert) || !istEchtesDatum(wert)) {
    throw new UngueltigeEingabe(`${feld} ist kein gültiges Datum (erwartet JJJJ-MM-TT)`);
  }
  return new Date(`${wert}T00:00:00Z`);
}

/** Berlin-Datum + Uhrzeit ("HH:mm") → UTC-Zeitpunkt. Ungültig → 400. */
export function berlinZeitpunkt(datum: unknown, zeit: unknown, feld: string): Date {
  const tag = datumOderNull(datum, feld);
  if (!tag) throw new UngueltigeEingabe(`${feld} fehlt`);
  if (typeof zeit !== "string" || !ZEIT_RE.test(zeit)) {
    throw new UngueltigeEingabe(`${feld}: Uhrzeit fehlt oder ist ungültig (erwartet HH:MM)`);
  }
  const [stunde, minute] = zeit.split(":").map(Number);
  if (stunde > 23 || minute > 59) throw new UngueltigeEingabe(`${feld}: Uhrzeit ist ungültig`);
  return berlinWallToUTC(datum as string, zeit);
}

/** Beliebiger ISO-Zeitpunkt (Query-Parameter von/bis). Leer → null, ungültig → 400. */
export function zeitpunktOderNull(wert: string | null, feld: string): Date | null {
  if (!wert) return null;
  const d = new Date(wert);
  if (Number.isNaN(d.getTime())) throw new UngueltigeEingabe(`${feld} ist kein gültiger Zeitpunkt`);
  return d;
}

/** Route-Handler-Hülle: UngueltigeEingabe wird zur 400-Antwort statt zum 500. */
export function mitEingabepruefung<A extends unknown[]>(
  handler: (...args: A) => Promise<Response>,
): (...args: A) => Promise<Response> {
  return async (...args: A) => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof UngueltigeEingabe) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }
  };
}

const CLIENT_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

/** Vom Client erzeugte ID (crypto.randomUUID(), PLAN.md 4.5). Fehlt/ungültig → 400. */
export function clientId(wert: unknown, feld: string): string {
  if (typeof wert !== "string" || !CLIENT_ID_RE.test(wert)) {
    throw new UngueltigeEingabe(`${feld} fehlt oder ist ungültig`);
  }
  return wert;
}

/** Ganze Zahl im Bereich [min, max], sonst 400. */
export function ganzzahl(wert: unknown, feld: string, min: number, max: number): number {
  if (typeof wert !== "number" || !Number.isInteger(wert) || wert < min || wert > max) {
    throw new UngueltigeEingabe(`${feld} muss eine ganze Zahl zwischen ${min} und ${max} sein`);
  }
  return wert;
}
