// Reine Funktionen/Typen ohne Server-Abhängigkeiten (Prisma etc.) —
// diese Datei darf auch von Client Components importiert werden.

export type TopfMitStand = {
  id: string;
  name: string;
  typ: "VERBRAUCH" | "SPARZIEL";
  zielCent: number | null;
  zielDatum: Date | string | null;
  farbe: string;
  sortierung: number;
  archiviert: boolean;
  standCent: number;
};

/** Monate von heute bis zum Zieldatum, aufgerundet auf mindestens 1. */
function monateBisZiel(zielDatum: Date): number {
  const jetzt = new Date();
  const monate =
    (zielDatum.getFullYear() - jetzt.getFullYear()) * 12 + (zielDatum.getMonth() - jetzt.getMonth());
  return Math.max(monate, 1);
}

/** Nötige monatliche Rate, um das Sparziel zum Zieldatum zu erreichen. */
export function monatsrateCent(zielCent: number, standCent: number, zielDatum: Date): number {
  const restCent = zielCent - standCent;
  if (restCent <= 0) return 0;
  return Math.ceil(restCent / monateBisZiel(zielDatum));
}
