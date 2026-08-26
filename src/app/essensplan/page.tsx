import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { berlinHeute } from "@/lib/timezone";
import { montagDerWoche, addTage } from "@/lib/essensplan-shared";
import { Wochenplan } from "./Wochenplan";

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
    <main className="mx-auto flex max-w-lg flex-col gap-6 p-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Essensplan</h1>
        <Link href="/" className="text-sm text-gray-500 hover:underline">
          Zurück
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <Link href={`/essensplan?woche=${vorherigeWoche}`} className="text-sm hover:underline">
          ← Vorherige
        </Link>
        <span className="font-medium">
          {new Date(montag).toLocaleDateString("de-DE")} – {new Date(sonntag).toLocaleDateString("de-DE")}
        </span>
        <Link href={`/essensplan?woche=${naechsteWoche}`} className="text-sm hover:underline">
          Nächste →
        </Link>
      </div>

      <Wochenplan montag={montag} mahlzeiten={mahlzeiten} />

      <Link
        href={`/einkaufsliste?woche=${montag}`}
        className="self-start rounded-full bg-[#ff1dce] px-4 py-2 text-sm font-medium text-white hover:bg-[#e619b8]"
      >
        Einkaufsliste
      </Link>
    </main>
  );
}
