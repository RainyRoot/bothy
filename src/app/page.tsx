import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getToepfeMitStand } from "@/lib/toepfe";
import { getAnstehendeEreignisse } from "@/lib/kalender";
import { wochenSerie } from "@/lib/training";
import { formatCent } from "@/lib/money";
import { formatBerlinDatum } from "@/lib/timezone";
import { BottomNav } from "./BottomNav";
import { PushSetup } from "./PushSetup";
import { IconSettings, IconJar, IconCalendar, IconUtensils, IconCart, IconChecklist, IconDumbbell, type IconComponent } from "./icons";

export const dynamic = "force-dynamic";

export default async function Home() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    redirect("/login");
  }

  const [toepfe, naechsteTermine, offeneTodos, serie] = await Promise.all([
    getToepfeMitStand(),
    getAnstehendeEreignisse(30),
    prisma.todo.count({ where: { erledigt: false } }),
    wochenSerie(),
  ]);

  // Nur Verbrauchstöpfe: Sparziele mit Einkaufsgeld zu addieren ergibt keine sinnvolle Zahl
  const verbrauch = toepfe.filter((t) => t.typ === "VERBRAUCH");
  const verfuegbarCent = verbrauch.reduce((summe, t) => summe + t.standCent, 0);
  const toepfeHint =
    toepfe.length === 0
      ? "Noch keine Töpfe"
      : verbrauch.length === 0
        ? `${toepfe.length} Sparziel${toepfe.length > 1 ? "e" : ""}`
        : `${formatCent(verfuegbarCent)} zum Ausgeben`;
  const naechsterTermin = naechsteTermine[0];
  const kalenderHint = naechsterTermin
    ? `${naechsterTermin.titel} · ${formatBerlinDatum(naechsterTermin.datum)}`
    : "Nichts Anstehendes";
  const todosHint = offeneTodos === 0 ? "Alles erledigt" : `${offeneTodos} offen`;
  const meineTrainings = serie.dieseWoche[userId] ?? 0;
  const gymHint =
    meineTrainings === 0
      ? serie.wochenInFolge > 0
        ? `${serie.wochenInFolge} Wochen in Folge`
        : "Diese Woche noch nichts"
      : `${meineTrainings}× diese Woche`;

  const heuteLabel = new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Berlin",
  }).format(new Date());

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex items-start justify-between px-5 pb-2 pt-6">
        <div>
          <p className="text-sm text-muted">{heuteLabel}</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">Hallo, {user.name}.</h1>
        </div>
        <Link href="/einstellungen" className="icon-btn" aria-label="Einstellungen" title="Einstellungen">
          <IconSettings className="h-5 w-5" />
        </Link>
      </header>

      <main className="page pt-2">
        <div className="grid grid-cols-2 gap-3">
          <HomeTile href="/toepfe" icon={IconJar} label="Töpfe" hint={toepfeHint} />
          <HomeTile href="/kalender" icon={IconCalendar} label="Kalender" hint={kalenderHint} />
          <HomeTile href="/essensplan" icon={IconUtensils} label="Essensplan" hint="Wochenplan" />
          <HomeTile href="/einkaufsliste" icon={IconCart} label="Einkaufsliste" hint="Zum Einkauf" />
          <HomeTile href="/todos" icon={IconChecklist} label="Todos" hint={todosHint} />
          <HomeTile href="/gym" icon={IconDumbbell} label="Gym" hint={gymHint} />
        </div>

        {/* Nur solange Push aus ist — Status und Test-Button stehen in den Einstellungen */}
        <PushSetup nurWennAus />
      </main>

      <BottomNav />
    </div>
  );
}

function HomeTile({
  href,
  icon: Icon,
  label,
  hint,
  span,
}: {
  href: string;
  icon: IconComponent;
  label: string;
  hint: string;
  span?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`card flex flex-col gap-3 transition-transform duration-150 active:scale-[0.98] ${span ? "col-span-2" : ""}`}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="font-medium">{label}</p>
        <p className="mt-0.5 truncate text-xs text-muted">{hint}</p>
      </div>
    </Link>
  );
}
