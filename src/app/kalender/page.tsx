import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { getEreignisse } from "@/lib/kalender";
import { berlinHeute } from "@/lib/timezone";
import { AppShell } from "../AppShell";
import { Monatsraster } from "./Monatsraster";
import { Agenda } from "./Agenda";
import { IconChevronLeft, IconPlus } from "../icons";

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
    <AppShell title="Kalender" action={<Link href="/kalender/neu" className="icon-btn" aria-label="Neuer Termin"><IconPlus className="h-5 w-5" /></Link>}>
      <div className="card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Link href={`/kalender?monat=${vorherigerMonat}`} className="icon-btn -ml-2" aria-label="Vorheriger Monat">
            <IconChevronLeft className="h-5 w-5" />
          </Link>
          <span className="font-medium">
            {new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" }).format(new Date(Date.UTC(jahr, monat - 1, 1)))}
          </span>
          <Link href={`/kalender?monat=${naechsterMonat}`} className="icon-btn -mr-2 rotate-180" aria-label="Nächster Monat">
            <IconChevronLeft className="h-5 w-5" />
          </Link>
        </div>

        <Monatsraster jahr={jahr} monat={monat} ereignisse={ereignisse} />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted">Nächste 30 Tage</h2>
        <Agenda ereignisse={agendaEreignisse} />
      </div>
    </AppShell>
  );
}
