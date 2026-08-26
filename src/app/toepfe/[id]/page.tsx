import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getTopfStand } from "@/lib/toepfe";
import { formatCent } from "@/lib/money";
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
    <main className="mx-auto flex max-w-lg flex-col gap-6 p-4 pb-24">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: topf.farbe }} />
          <h1 className="text-xl font-semibold">{topf.name}</h1>
        </div>
        <Link href="/toepfe" className="text-sm text-gray-500 hover:underline">
          Zurück
        </Link>
      </div>

      <p className="text-2xl tabular-nums">{formatCent(standCent)}</p>

      <ul className="flex flex-col gap-2">
        {topf.buchungen.map((b) => (
          <li key={b.id} className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {new Date(b.datum).toLocaleDateString("de-DE")} — {b.vonUser.name}
              {b.notiz && <> · {b.notiz}</>}
            </span>
            <span className={`tabular-nums ${b.betragCent < 0 ? "text-red-600" : "text-green-600"}`}>
              {formatCent(b.betragCent)}
            </span>
          </li>
        ))}
        {topf.buchungen.length === 0 && <p className="text-sm text-gray-500">Noch keine Buchungen.</p>}
      </ul>

      <ArchivButton topfId={topf.id} archiviert={topf.archiviert} />
    </main>
  );
}
