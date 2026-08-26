import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { berlinHeute } from "@/lib/timezone";
import { montagDerWoche } from "@/lib/essensplan-shared";
import { EinkaufslisteClient } from "./EinkaufslisteClient";

export const dynamic = "force-dynamic";

export default async function EinkaufslistePage({
  searchParams,
}: {
  searchParams: Promise<{ woche?: string }>;
}) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const { woche: wocheParam } = await searchParams;
  const heute = berlinHeute();
  const heuteISO = `${heute.jahr}-${String(heute.monat).padStart(2, "0")}-${String(heute.tag).padStart(2, "0")}`;
  const woche = wocheParam && /^\d{4}-\d{2}-\d{2}$/.test(wocheParam) ? montagDerWoche(wocheParam) : montagDerWoche(heuteISO);

  const [liste, toepfe] = await Promise.all([
    prisma.einkaufsliste.findUnique({
      where: { woche: new Date(woche) },
      include: { items: { orderBy: { sortierung: "asc" } } },
    }),
    prisma.topf.findMany({ where: { archiviert: false }, orderBy: { sortierung: "asc" } }),
  ]);

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 p-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Einkaufsliste</h1>
        <Link href={`/essensplan?woche=${woche}`} className="text-sm text-gray-500 hover:underline">
          Zum Essensplan
        </Link>
      </div>

      <EinkaufslisteClient woche={woche} initial={liste} toepfe={toepfe} />
    </main>
  );
}
