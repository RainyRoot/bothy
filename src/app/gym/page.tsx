import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { laufendesTrainingHeute, letztesMalAlle, rekordeAlle, satzZuDto, wochenSerie } from "@/lib/training";
import { toISODatum } from "@/lib/timezone";
import { AppShell } from "../AppShell";
import { GymClient } from "./GymClient";
import { schluessel, type GymDaten } from "./typen";

export const dynamic = "force-dynamic";

export default async function GymPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const laufend = await laufendesTrainingHeute();
  const [personen, plaene, uebungen, letztesMal, rekorde, serie, laufendeSaetze] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" }, take: 2, select: { id: true, name: true } }),
    prisma.trainingsplan.findMany({
      where: { archiviert: false },
      orderBy: [{ sortierung: "asc" }, { name: "asc" }],
      include: { uebungen: { orderBy: { sortierung: "asc" } } },
    }),
    prisma.uebung.findMany({ orderBy: { name: "asc" } }),
    // "Letztes Mal" aus dem jüngsten *anderen* Training — das laufende zählt nicht
    letztesMalAlle(laufend?.id ?? null),
    rekordeAlle(),
    wochenSerie(),
    laufend ? prisma.satz.findMany({ where: { trainingId: laufend.id }, orderBy: { createdAt: "asc" } }) : [],
  ]);

  const daten: GymDaten = {
    ich: userId,
    personen,
    plaene: plaene.map((p) => ({
      id: p.id,
      name: p.name,
      uebungen: p.uebungen.map((u) => ({ uebungId: u.uebungId, zielSaetze: u.zielSaetze, zielWdh: u.zielWdh })),
    })),
    uebungen: uebungen.map((u) => ({ id: u.id, name: u.name, archiviert: u.archiviert })),
    letztesMal: Object.fromEntries(letztesMal.map((l) => [schluessel(l.userId, l.uebungId), l.saetze])),
    rekorde: Object.fromEntries(
      rekorde.map((r) => [
        schluessel(r.userId, r.uebungId),
        { gewichtGramm: r.gewichtGramm, wiederholungen: r.wiederholungen },
      ]),
    ),
    laufend: laufend
      ? {
          id: laufend.id,
          planId: laufend.planId,
          datum: toISODatum(laufend.datum),
          gestartetAt: laufend.gestartetAt.toISOString(),
          saetze: laufendeSaetze.map(satzZuDto),
        }
      : null,
    serie,
  };

  return (
    <AppShell title="Gym">
      <GymClient daten={daten} />
    </AppShell>
  );
}
