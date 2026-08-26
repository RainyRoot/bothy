import { prisma } from "@/lib/prisma";
import type { TopfMitStand } from "@/lib/toepfe-shared";

export type { TopfMitStand };

export async function getToepfeMitStand(): Promise<TopfMitStand[]> {
  const toepfe = await prisma.topf.findMany({
    where: { archiviert: false },
    orderBy: { sortierung: "asc" },
  });

  const summen = await prisma.buchung.groupBy({
    by: ["topfId"],
    _sum: { betragCent: true },
    where: { topfId: { in: toepfe.map((t) => t.id) } },
  });
  const standByTopf = new Map(summen.map((s) => [s.topfId, s._sum.betragCent ?? 0]));

  return toepfe.map((topf) => ({
    ...topf,
    standCent: standByTopf.get(topf.id) ?? 0,
  }));
}

export async function getTopfStand(topfId: string): Promise<number> {
  const result = await prisma.buchung.aggregate({
    where: { topfId },
    _sum: { betragCent: true },
  });
  return result._sum.betragCent ?? 0;
}
