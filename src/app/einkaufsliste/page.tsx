import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { berlinHeute } from "@/lib/timezone";
import { montagDerWoche } from "@/lib/essensplan-shared";
import { AppShell } from "../AppShell";
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
    <AppShell title="Einkaufsliste" back={`/essensplan?woche=${woche}`}>
      <EinkaufslisteClient woche={woche} initial={liste} toepfe={toepfe} />
    </AppShell>
  );
}
