import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppShell } from "../../AppShell";
import { IconPlus } from "../../icons";

export const dynamic = "force-dynamic";

export default async function PlaenePage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const plaene = await prisma.trainingsplan.findMany({
    orderBy: [{ archiviert: "asc" }, { sortierung: "asc" }, { name: "asc" }],
    include: { uebungen: { orderBy: { sortierung: "asc" }, include: { uebung: { select: { name: true } } } } },
  });

  return (
    <AppShell
      title="Trainingspläne"
      back="/gym"
      action={
        <Link href="/gym/plaene/neu" className="icon-btn" aria-label="Neuer Plan">
          <IconPlus className="h-5 w-5" />
        </Link>
      }
    >
      {plaene.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted">Noch kein Plan. Ein Plan ist eine Liste von Übungen, z.B. „Push“.</p>
          <Link href="/gym/plaene/neu" className="btn-primary">
            Ersten Plan anlegen
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {plaene.map((p) => (
            <li key={p.id}>
              <Link href={`/gym/plaene/${p.id}`} className={`card flex flex-col gap-1 !p-3.5 ${p.archiviert ? "opacity-60" : ""}`}>
                <span className="font-medium">
                  {p.name}
                  {p.archiviert && <span className="ml-2 text-xs font-normal text-muted">archiviert</span>}
                </span>
                <span className="truncate text-xs text-muted">
                  {p.uebungen.map((u) => u.uebung.name).join(" · ") || "keine Übungen"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
