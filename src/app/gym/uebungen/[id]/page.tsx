import { notFound, redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { besterSatz, formatSatz, type SatzWerte } from "@/lib/training-shared";
import { berlinHeuteAlsDatum, formatBerlinDatum } from "@/lib/timezone";
import { AppShell } from "../../../AppShell";
import { UebungAktionen } from "./UebungAktionen";

export const dynamic = "force-dynamic";

type TrainingBest = { datum: Date; satz: SatzWerte };

/** Bester Satz je Training einer Person, neueste zuerst. */
function besteJeTraining(saetze: (SatzWerte & { trainingId: string; datum: Date })[]): TrainingBest[] {
  const nachTraining = new Map<string, (SatzWerte & { datum: Date })[]>();
  for (const s of saetze) nachTraining.set(s.trainingId, [...(nachTraining.get(s.trainingId) ?? []), s]);
  return [...nachTraining.values()]
    .map((liste) => ({ datum: liste[0].datum, satz: besterSatz(liste)! }))
    .sort((a, b) => b.datum.getTime() - a.datum.getTime());
}

/** Fortschritt ohne Charts (PLAN.md 2 und 4.5): Rekord, letzte fünf Trainings, "vor 4 Wochen → heute". */
export default async function UebungDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const { id } = await params;
  const [uebung, personen, saetze] = await Promise.all([
    prisma.uebung.findUnique({ where: { id } }),
    prisma.user.findMany({ orderBy: { createdAt: "asc" }, take: 2, select: { id: true, name: true } }),
    prisma.satz.findMany({ where: { uebungId: id }, include: { training: { select: { datum: true } } } }),
  ]);
  if (!uebung) notFound();

  const heute = berlinHeuteAlsDatum();
  const vierWochenVorher = new Date(heute.getTime() - 28 * 86_400_000);
  // Ich zuerst
  const reihenfolge = [...personen].sort((a, b) => Number(b.id === userId) - Number(a.id === userId));

  return (
    <AppShell title={uebung.name} back="/gym/uebungen">
      {reihenfolge.map((p) => {
        const eigene = saetze.filter((s) => s.userId === p.id).map((s) => ({ ...s, datum: s.training.datum }));
        const jeTraining = besteJeTraining(eigene);
        const rekord = besterSatz(eigene);
        const jetzt = jeTraining[0];
        const damals = jeTraining.find((t) => t.datum <= vierWochenVorher);

        return (
          <section key={p.id} className="card flex flex-col gap-3">
            <h2 className="font-medium">{p.name}</h2>
            {!rekord ? (
              <p className="text-sm text-muted">Noch keine Sätze.</p>
            ) : (
              <>
                <p className="text-sm">
                  <span className="text-muted">Rekord:</span> <span className="font-medium">{formatSatz(rekord)}</span>
                  <span className="text-muted"> · {formatBerlinDatum(rekord.datum)}</span>
                </p>
                <p className="text-sm">
                  {damals && jetzt ? (
                    <>
                      <span className="text-muted">vor 4 Wochen:</span> {formatSatz(damals.satz)} →{" "}
                      <span className="text-muted">
                        {jetzt.datum.getTime() === heute.getTime() ? "heute" : "zuletzt"}:
                      </span>{" "}
                      <span className="font-medium">{formatSatz(jetzt.satz)}</span>
                    </>
                  ) : (
                    <span className="text-muted">Noch kein Verlauf über vier Wochen.</span>
                  )}
                </p>
                <div>
                  <p className="mb-1 text-xs text-muted">Bester Satz der letzten Trainings</p>
                  <ul className="flex flex-col gap-0.5 text-sm tabular-nums">
                    {jeTraining.slice(0, 5).map((t) => (
                      <li key={t.datum.toISOString()} className="flex justify-between">
                        <span className="text-muted">{formatBerlinDatum(t.datum)}</span>
                        <span>{formatSatz(t.satz)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </section>
        );
      })}

      <UebungAktionen uebungId={uebung.id} name={uebung.name} archiviert={uebung.archiviert} />
    </AppShell>
  );
}
