import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { rekordeAlle } from "@/lib/training";
import { formatSatz } from "@/lib/training-shared";
import { AppShell } from "../../AppShell";

export const dynamic = "force-dynamic";

export default async function UebungenPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const [uebungen, personen, rekorde] = await Promise.all([
    prisma.uebung.findMany({ orderBy: [{ archiviert: "asc" }, { name: "asc" }] }),
    prisma.user.findMany({ orderBy: { createdAt: "asc" }, take: 2, select: { id: true, name: true } }),
    rekordeAlle(),
  ]);

  return (
    <AppShell title="Übungen & Fortschritt" back="/gym">
      {uebungen.length === 0 ? (
        <p className="card text-center text-sm text-muted">
          Noch keine Übungen — sie entstehen beim Anlegen eines Plans oder direkt im Training.
        </p>
      ) : (
        <ul className="card flex flex-col divide-y divide-border !p-0">
          {uebungen.map((u) => (
            <li key={u.id}>
              <Link
                href={`/gym/uebungen/${u.id}`}
                className={`flex flex-col gap-0.5 px-3.5 py-3 hover:bg-surface-hover ${u.archiviert ? "opacity-60" : ""}`}
              >
                <span className="font-medium">
                  {u.name}
                  {u.archiviert && <span className="ml-2 text-xs font-normal text-muted">archiviert</span>}
                </span>
                <span className="text-xs text-muted">
                  {personen
                    .map((p) => {
                      const r = rekorde.find((x) => x.userId === p.id && x.uebungId === u.id);
                      return `${p.name}: ${r ? formatSatz(r) : "–"}`;
                    })
                    .join(" · ")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
