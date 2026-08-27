import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getToepfeMitStand } from "@/lib/toepfe";
import { getEreignisse } from "@/lib/kalender";
import { formatCent } from "@/lib/money";
import { formatBerlinDatum } from "@/lib/timezone";
import { BottomNav } from "./BottomNav";
import { LogoutButton } from "./LogoutButton";
import { PushSetup } from "./PushSetup";
import { IconHome, IconJar, IconCalendar, IconUtensils, IconCart, IconChecklist, type IconComponent } from "./icons";

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

  const [toepfe, naechsteTermine, offeneTodos] = await Promise.all([
    getToepfeMitStand(),
    getEreignisse(new Date(), new Date(Date.now() + 30 * 86_400_000)),
    prisma.todo.count({ where: { erledigt: false } }),
  ]);

  const gesamtCent = toepfe.reduce((summe, t) => summe + t.standCent, 0);
  const toepfeHint = toepfe.length === 0 ? "Noch keine Töpfe" : `${formatCent(gesamtCent)} gesamt`;
  const naechsterTermin = naechsteTermine[0];
  const kalenderHint = naechsterTermin
    ? `${naechsterTermin.titel} · ${formatBerlinDatum(naechsterTermin.datum)}`
    : "Nichts Anstehendes";
  const todosHint = offeneTodos === 0 ? "Alles erledigt" : `${offeneTodos} offen`;

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
        <LogoutButton />
      </header>

      <main className="page pt-2">
        <div className="grid grid-cols-2 gap-3">
          <HomeTile href="/toepfe" icon={IconJar} label="Töpfe" hint={toepfeHint} />
          <HomeTile href="/kalender" icon={IconCalendar} label="Kalender" hint={kalenderHint} />
          <HomeTile href="/essensplan" icon={IconUtensils} label="Essensplan" hint="Wochenplan" />
          <HomeTile href="/einkaufsliste" icon={IconCart} label="Einkaufsliste" hint="Zum Einkauf" />
          <HomeTile href="/todos" icon={IconChecklist} label="Todos" hint={todosHint} span />
        </div>

        <div className="card flex flex-col items-center gap-3 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
            <IconHome className="h-5 w-5" />
          </span>
          <PushSetup />
        </div>
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
