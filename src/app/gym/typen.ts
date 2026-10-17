import type { SatzWerte } from "@/lib/training-shared";

export type Person = { id: string; name: string };
export type UebungInfo = { id: string; name: string; archiviert: boolean };
export type PlanInfo = {
  id: string;
  name: string;
  uebungen: { uebungId: string; zielSaetze: number; zielWdh: number | null }[];
};
export type SatzLokal = SatzWerte & {
  id: string;
  trainingId: string;
  userId: string;
  uebungId: string;
  createdAt: string;
};
export type TrainingLokal = { id: string; planId: string | null; datum: string; gestartetAt: string };

/** Alles, was ein Training offline braucht — kommt in einem Rutsch mit der Seite (PLAN.md 4.5). */
export type GymDaten = {
  ich: string;
  personen: Person[];
  plaene: PlanInfo[];
  uebungen: UebungInfo[];
  /** Schlüssel `${userId}:${uebungId}` */
  letztesMal: Record<string, SatzWerte[]>;
  rekorde: Record<string, SatzWerte>;
  laufend: (TrainingLokal & { saetze: SatzLokal[] }) | null;
  serie: { dieseWoche: Record<string, number>; wochenInFolge: number };
};

export function schluessel(userId: string, uebungId: string): string {
  return `${userId}:${uebungId}`;
}
