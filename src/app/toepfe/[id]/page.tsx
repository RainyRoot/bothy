import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getTopfStand } from "@/lib/toepfe";
import { formatCent } from "@/lib/money";
import { AppShell } from "../../AppShell";
import { ArchivButton } from "./ArchivButton";
import { BuchungenListe } from "./BuchungenListe";

export const dynamic = "force-dynamic";

export default async function TopfDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const { id } = await params;
  const topf = await prisma.topf.findUnique({
    where: { id },
    include: {
      buchungen: {
        orderBy: [{ datum: "desc" }, { createdAt: "desc" }],
        include: { vonUser: { select: { id: true, name: true } } },
      },
    },
  });
  if (!topf) notFound();

  const transferIds = topf.buchungen.flatMap((b) => (b.transferId ? [b.transferId] : []));
  const [standCent, gegenbuchungen] = await Promise.all([
    getTopfStand(id),
    prisma.buchung.findMany({
      where: { transferId: { in: transferIds }, topfId: { not: id } },
      select: { transferId: true, topf: { select: { name: true } } },
    }),
  ]);
  const gegenTopfNachTransfer = new Map(gegenbuchungen.map((g) => [g.transferId, g.topf.name]));

  return (
    <AppShell
      title={topf.name}
      back={topf.archiviert ? "/toepfe/archiv" : "/toepfe"}
      action={
        <Link href={`/toepfe/${topf.id}/bearbeiten`} className="btn-ghost">
          Bearbeiten
        </Link>
      }
    >
      <div className="flex items-center gap-2.5">
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: topf.farbe }} />
        <p className="text-3xl font-semibold tabular-nums">{formatCent(standCent)}</p>
      </div>
      {topf.archiviert && <p className="text-sm text-muted">Archiviert — taucht in der Topf-Liste nicht mehr auf.</p>}

      <div>
        <BuchungenListe
          buchungen={topf.buchungen.map((b) => ({
            id: b.id,
            betragCent: b.betragCent,
            datum: b.datum.toISOString(),
            notiz: b.notiz,
            vonName: b.vonUser.name,
            gegenTopf: b.transferId ? (gegenTopfNachTransfer.get(b.transferId) ?? "anderer Topf") : null,
          }))}
        />
        {topf.buchungen.length > 0 && <p className="mt-2 text-xs text-muted">Tippen zum Ändern oder Löschen.</p>}
      </div>

      <ArchivButton topfId={topf.id} archiviert={topf.archiviert} />
    </AppShell>
  );
}
