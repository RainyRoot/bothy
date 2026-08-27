import { notFound, redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getTopfStand } from "@/lib/toepfe";
import { formatCent } from "@/lib/money";
import { AppShell } from "../../AppShell";
import { ArchivButton } from "./ArchivButton";

export const dynamic = "force-dynamic";

export default async function TopfDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const { id } = await params;
  const topf = await prisma.topf.findUnique({
    where: { id },
    include: {
      buchungen: { orderBy: { datum: "desc" }, include: { vonUser: { select: { id: true, name: true } } } },
    },
  });
  if (!topf) notFound();

  const standCent = await getTopfStand(id);

  return (
    <AppShell
      title={topf.name}
      back="/toepfe"
      action={<span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: topf.farbe }} />}
    >
      <p className="text-3xl font-semibold tabular-nums">{formatCent(standCent)}</p>

      <ul className="flex flex-col gap-2">
        {topf.buchungen.map((b) => (
          <li key={b.id} className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0">
            <span className="text-muted">
              {new Date(b.datum).toLocaleDateString("de-DE")} — {b.vonUser.name}
              {b.notiz && <> · {b.notiz}</>}
            </span>
            <span className={`tabular-nums font-medium ${b.betragCent < 0 ? "text-danger" : "text-success"}`}>
              {formatCent(b.betragCent)}
            </span>
          </li>
        ))}
        {topf.buchungen.length === 0 && <p className="text-sm text-muted">Noch keine Buchungen.</p>}
      </ul>

      <ArchivButton topfId={topf.id} archiviert={topf.archiviert} />
    </AppShell>
  );
}
