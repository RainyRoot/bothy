// Reine Funktionen ohne Server-Abhängigkeiten.

/** Montag (ISO "YYYY-MM-DD", UTC-Kalendertag) der Woche, in der `datumISO` liegt. */
export function montagDerWoche(datumISO: string): string {
  const d = new Date(datumISO);
  const wochentag = (d.getUTCDay() + 6) % 7; // Montag = 0
  const montag = new Date(d.getTime() - wochentag * 86_400_000);
  return montag.toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" eines Date-Objekts oder ISO-Strings, in UTC-Kalenderfeldern. */
export function tagSchluesselISO(datum: Date | string): string {
  const d = typeof datum === "string" ? new Date(datum) : datum;
  return d.toISOString().slice(0, 10);
}

export function addTage(datumISO: string, tage: number): string {
  const d = new Date(datumISO);
  return new Date(d.getTime() + tage * 86_400_000).toISOString().slice(0, 10);
}

/** Aggregiert Zutaten mehrerer Mahlzeiten zu einer deduplizierten Liste (eine Zeile = ein Eintrag). */
export function aggregiereZutaten(zutatenTexte: string[]): string[] {
  const gesehen = new Set<string>();
  const ergebnis: string[] = [];
  for (const text of zutatenTexte) {
    for (const zeile of text.split("\n")) {
      const bereinigt = zeile.trim();
      if (!bereinigt) continue;
      const schluessel = bereinigt.toLowerCase();
      if (gesehen.has(schluessel)) continue;
      gesehen.add(schluessel);
      ergebnis.push(bereinigt);
    }
  }
  return ergebnis;
}
