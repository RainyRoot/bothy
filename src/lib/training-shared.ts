// Reine Funktionen ohne Server-Abhängigkeiten — von Server und Client
// Components gleichermaßen genutzt (Stufe 5, PLAN.md 4.5).
//
// Gewichte sind Int-Gramm, nie Float (PLAN.md 6): 67,5 kg = 67500.

export type SatzWerte = { gewichtGramm: number; wiederholungen: number };

/** Schrittweite der ±-Knöpfe */
export const GEWICHT_SCHRITT_GRAMM = 2500;

/** "67,5" / "67.5" / "67,5 kg" → 67500. Wirft bei ungültiger Eingabe. Leer → 0 (Körpergewicht). */
export function parseKgZuGramm(eingabe: string): number {
  const normalisiert = eingabe.trim().toLowerCase().replace(/\s*kg$/, "").replace(",", ".");
  if (normalisiert === "") return 0;
  const kg = Number(normalisiert);
  if (!Number.isFinite(kg) || kg < 0 || kg > 1000) throw new Error("Ungültiges Gewicht");
  return Math.round(kg * 1000);
}

/** 67500 → "67,5" (ohne Einheit, fürs Eingabefeld) */
export function grammZuKgText(gramm: number): string {
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 3, useGrouping: false }).format(gramm / 1000);
}

/** 67500 → "67,5 kg" */
export function formatGewicht(gramm: number): string {
  return `${grammZuKgText(gramm)} kg`;
}

/** "70 kg × 5" bzw. "12 Wdh." bei Körpergewicht ohne Zusatzgewicht */
export function formatSatz(s: SatzWerte): string {
  return s.gewichtGramm > 0 ? `${formatGewicht(s.gewichtGramm)} × ${s.wiederholungen}` : `${s.wiederholungen} Wdh.`;
}

/**
 * "3×8 @ 60 kg", wenn alle Sätze gleich sind, sonst "60×8, 62,5×6, 65×5".
 * Für die "Letztes Mal"-Zeile.
 */
export function formatSatzListe(saetze: SatzWerte[]): string {
  if (saetze.length === 0) return "";
  const [erster] = saetze;
  const alleGleich = saetze.every(
    (s) => s.gewichtGramm === erster.gewichtGramm && s.wiederholungen === erster.wiederholungen,
  );
  if (alleGleich) {
    return erster.gewichtGramm > 0
      ? `${saetze.length}×${erster.wiederholungen} @ ${formatGewicht(erster.gewichtGramm)}`
      : `${saetze.length}×${erster.wiederholungen} Wdh.`;
  }
  return saetze
    .map((s) => (s.gewichtGramm > 0 ? `${grammZuKgText(s.gewichtGramm)}×${s.wiederholungen}` : `${s.wiederholungen}`))
    .join(", ");
}

/**
 * Geschätztes 1RM nach Epley, gerundet auf ganze Gramm — nur zum Vergleichen,
 * nie angezeigt (PLAN.md 4.5).
 */
export function epleyGramm(s: SatzWerte): number {
  return Math.round((s.gewichtGramm * (30 + s.wiederholungen)) / 30);
}

/**
 * Ist a besser als b? Nach Epley; bei Gleichstand (z.B. Körpergewicht mit
 * 0 g, da ist Epley immer 0) entscheiden die Wiederholungen.
 */
export function istBesser(a: SatzWerte, b: SatzWerte): boolean {
  const ea = epleyGramm(a);
  const eb = epleyGramm(b);
  return ea !== eb ? ea > eb : a.wiederholungen > b.wiederholungen;
}

export function besterSatz<T extends SatzWerte>(saetze: T[]): T | null {
  return saetze.reduce<T | null>((best, s) => (best === null || istBesser(s, best) ? s : best), null);
}
