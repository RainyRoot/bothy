import { prisma } from "@/lib/prisma";
import { UngueltigeEingabe } from "@/lib/eingabe";

export type PlanEintragEingabe = { uebungName: string; zielSaetze: number; zielWdh: number | null };

/** Liest die Übungsliste eines Plans aus dem Request-Body. Ungültig → 400. */
export function parsePlanEintraege(wert: unknown): PlanEintragEingabe[] {
  if (!Array.isArray(wert)) throw new UngueltigeEingabe("Übungsliste fehlt");
  return wert.map((e, i) => {
    const name = typeof e?.uebungName === "string" ? e.uebungName.trim().replace(/\s+/g, " ") : "";
    if (!name || name.length > 60) throw new UngueltigeEingabe(`Übung ${i + 1}: Name fehlt oder ist zu lang`);
    const zielSaetze = typeof e?.zielSaetze === "number" && Number.isInteger(e.zielSaetze) ? e.zielSaetze : 3;
    if (zielSaetze < 1 || zielSaetze > 20) throw new UngueltigeEingabe(`Übung ${i + 1}: Sätze zwischen 1 und 20`);
    const zielWdh = typeof e?.zielWdh === "number" && Number.isInteger(e.zielWdh) && e.zielWdh > 0 ? e.zielWdh : null;
    return { uebungName: name, zielSaetze, zielWdh };
  });
}

/**
 * Ersetzt die Übungsliste eines Plans. Übungen werden über den Namen
 * gefunden oder neu angelegt — es gibt keine vorbefüllte Übungsdatenbank
 * (PLAN.md 4.5).
 */
export async function setzePlanUebungen(planId: string, eintraege: PlanEintragEingabe[]): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const uebungIds: string[] = [];
    for (const e of eintraege) {
      const vorhanden = await tx.uebung.findFirst({ where: { name: { equals: e.uebungName, mode: "insensitive" } } });
      const uebung = vorhanden
        ? vorhanden.archiviert
          ? await tx.uebung.update({ where: { id: vorhanden.id }, data: { archiviert: false } })
          : vorhanden
        : await tx.uebung.create({ data: { name: e.uebungName } });
      uebungIds.push(uebung.id);
    }
    await tx.planUebung.deleteMany({ where: { planId } });
    await tx.planUebung.createMany({
      data: eintraege.map((e, i) => ({
        planId,
        uebungId: uebungIds[i],
        sortierung: i,
        zielSaetze: e.zielSaetze,
        zielWdh: e.zielWdh,
      })),
    });
  });
}
