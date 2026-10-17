import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatCent } from "@/lib/money";
import { AppShell } from "../../AppShell";

export const dynamic = "force-dynamic";

export default async function ToepfeArchivPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const toepfe = await prisma.topf.findMany({ where: { archiviert: true }, orderBy: { name: "asc" } });
  const summen = await prisma.buchung.groupBy({
    by: ["topfId"],
    _sum: { betragCent: true },
    where: { topfId: { in: toepfe.map((t) => t.id) } },
  });
  const stand = new Map(summen.map((s) => [s.topfId, s._sum.betragCent ?? 0]));

  return (
    <AppShell title="Archivierte Töpfe" back="/toepfe">
      {toepfe.length === 0 ? (
        <p className="card text-center text-sm text-muted">Nichts archiviert.</p>
      ) : (
        <ul className="card flex flex-col divide-y divide-border !p-0">
          {toepfe.map((t) => (
            <li key={t.id}>
              <Link href={`/toepfe/${t.id}`} className="flex items-center gap-2.5 px-3.5 py-3 text-sm hover:bg-surface-hover">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: t.farbe }} />
                <span className="flex-1 font-medium">{t.name}</span>
                <span className="tabular-nums text-muted">{formatCent(stand.get(t.id) ?? 0)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted">Einen Topf öffnen, um ihn wiederherzustellen.</p>
    </AppShell>
  );
}
