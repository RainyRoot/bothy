import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { berlinHeute } from "@/lib/timezone";
import { montagDerWoche, addTage } from "@/lib/essensplan-shared";
import { AppShell } from "../AppShell";
import { Wochenplan } from "./Wochenplan";
import { IconChevronLeft, IconCart } from "../icons";

export const dynamic = "force-dynamic";

export default async function EssensplanPage({
  searchParams,
}: {
  searchParams: Promise<{ woche?: string }>;
}) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const { woche: wocheParam } = await searchParams;
  const heute = berlinHeute();
  const heuteISO = `${heute.jahr}-${String(heute.monat).padStart(2, "0")}-${String(heute.tag).padStart(2, "0")}`;
  const montag = wocheParam && /^\d{4}-\d{2}-\d{2}$/.test(wocheParam) ? montagDerWoche(wocheParam) : montagDerWoche(heuteISO);
  const sonntag = addTage(montag, 6);

  const mahlzeiten = await prisma.mahlzeit.findMany({
    where: { datum: { gte: new Date(montag), lte: new Date(sonntag) } },
    orderBy: { datum: "asc" },
  });

  const vorherigeWoche = addTage(montag, -7);
  const naechsteWoche = addTage(montag, 7);

  return (
    <AppShell
      title="Essensplan"
      action={
        <Link href={`/einkaufsliste?woche=${montag}`} className="icon-btn" aria-label="Einkaufsliste">
          <IconCart className="h-5 w-5" />
        </Link>
      }
    >
      <div className="flex items-center justify-between">
        <Link href={`/essensplan?woche=${vorherigeWoche}`} className="icon-btn -ml-2" aria-label="Vorherige Woche">
          <IconChevronLeft className="h-5 w-5" />
        </Link>
        <span className="font-medium">
          {new Date(montag).toLocaleDateString("de-DE")} – {new Date(sonntag).toLocaleDateString("de-DE")}
        </span>
        <Link href={`/essensplan?woche=${naechsteWoche}`} className="icon-btn -mr-2 rotate-180" aria-label="Nächste Woche">
          <IconChevronLeft className="h-5 w-5" />
        </Link>
      </div>

      <Wochenplan montag={montag} mahlzeiten={mahlzeiten} />

      <Link href={`/einkaufsliste?woche=${montag}`} className="btn-primary self-start">
        <IconCart className="h-4 w-4" /> Einkaufsliste
      </Link>
    </AppShell>
  );
}
