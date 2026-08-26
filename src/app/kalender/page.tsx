import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { getEreignisse } from "@/lib/kalender";
import { berlinHeute } from "@/lib/timezone";
import { Monatsraster } from "./Monatsraster";
import { Agenda } from "./Agenda";

export const dynamic = "force-dynamic";

function parseMonat(monatParam: string | undefined): { jahr: number; monat: number } {
  if (monatParam && /^\d{4}-\d{2}$/.test(monatParam)) {
    const [jahr, monat] = monatParam.split("-").map(Number);
    return { jahr, monat };
  }
  const heute = berlinHeute();
  return { jahr: heute.jahr, monat: heute.monat };
}

export default async function KalenderPage({
  searchParams,
}: {
  searchParams: Promise<{ monat?: string }>;
}) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const { monat: monatParam } = await searchParams;
  const { jahr, monat } = parseMonat(monatParam);

  const von = new Date(Date.UTC(jahr, monat - 1, 1));
  const bis = new Date(Date.UTC(jahr, monat, 0, 23, 59, 59));
  const ereignisse = await getEreignisse(von, bis);

  const vorherigerMonat = monat === 1 ? `${jahr - 1}-12` : `${jahr}-${String(monat - 1).padStart(2, "0")}`;
  const naechsterMonat = monat === 12 ? `${jahr + 1}-01` : `${jahr}-${String(monat + 1).padStart(2, "0")}`;

  const agendaBis = new Date(Date.now() + 30 * 86_400_000);
  const agendaEreignisse = await getEreignisse(new Date(), agendaBis);

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 p-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Kalender</h1>
        <Link href="/" className="text-sm text-gray-500 hover:underline">
          Zurück
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <Link href={`/kalender?monat=${vorherigerMonat}`} className="text-sm hover:underline">
          ← Vorheriger
        </Link>
        <span className="font-medium">
          {new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" }).format(new Date(Date.UTC(jahr, monat - 1, 1)))}
        </span>
        <Link href={`/kalender?monat=${naechsterMonat}`} className="text-sm hover:underline">
          Nächster →
        </Link>
      </div>

      <Monatsraster jahr={jahr} monat={monat} ereignisse={ereignisse} />

      <div>
        <h2 className="mb-2 text-sm font-medium text-gray-500">Nächste 30 Tage</h2>
        <Agenda ereignisse={agendaEreignisse} />
      </div>

      <Link
        href="/kalender/neu"
        className="self-start rounded-full bg-[#ff1dce] px-4 py-2 text-sm font-medium text-white hover:bg-[#e619b8]"
      >
        + Neuer Termin
      </Link>
    </main>
  );
}
