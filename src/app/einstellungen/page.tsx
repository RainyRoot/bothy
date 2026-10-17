import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatBerlinDatumZeit } from "@/lib/timezone";
import { AppShell } from "../AppShell";
import { PushSetup } from "../PushSetup";
import { LogoutButton } from "../LogoutButton";
import { PasswortForm } from "./PasswortForm";

export const dynamic = "force-dynamic";

const ZEITRAUM_TAGE = 30;

type Problem = { id: string; was: string; wer: string; dueAt: Date; versuche: number; fehler: string | null; aufgegeben: boolean };

export default async function EinstellungenPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  // Zustell-Übersicht (PLAN.md 7): sonst merkt man wochenlang nicht, dass
  // Erinnerungen ausfallen
  const seit = new Date(Date.now() - ZEITRAUM_TAGE * 86_400_000);
  const problemFilter = { dueAt: { gte: seit }, OR: [{ versuche: { gt: 0 } }, { fehler: { not: null } }] };
  const [user, users, terminJobs, todoJobs] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, subscriptions: { select: { id: true, createdAt: true, lastOkAt: true } } },
    }),
    prisma.reminderJob.findMany({
      where: problemFilter,
      orderBy: { dueAt: "desc" },
      take: 20,
      include: { termin: { select: { titel: true } }, user: { select: { name: true } } },
    }),
    prisma.todoReminderJob.findMany({
      where: problemFilter,
      orderBy: { dueAt: "desc" },
      take: 20,
      include: { todo: { select: { text: true } }, user: { select: { name: true } } },
    }),
  ]);

  const probleme: Problem[] = [
    ...terminJobs.map((j) => ({
      id: j.id,
      was: j.termin.titel,
      wer: j.user.name,
      dueAt: j.dueAt,
      versuche: j.versuche,
      fehler: j.fehler,
      aufgegeben: j.sentAt !== null,
    })),
    ...todoJobs.map((j) => ({
      id: j.id,
      was: `Todo: ${j.todo.text}`,
      wer: j.user.name,
      dueAt: j.dueAt,
      versuche: j.versuche,
      fehler: j.fehler,
      aufgegeben: j.sentAt !== null,
    })),
  ].sort((a, b) => b.dueAt.getTime() - a.dueAt.getTime());

  return (
    <AppShell title="Einstellungen" back="/">
      <section className="card flex flex-col gap-3">
        <h2 className="font-medium">Benachrichtigungen</h2>
        <PushSetup />
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className="font-medium">Zustellung</h2>
        <ul className="flex flex-col gap-1.5 text-sm">
          {users.map((u) => {
            const letzte = u.subscriptions
              .map((s) => s.lastOkAt)
              .filter((d): d is Date => d !== null)
              .sort((a, b) => b.getTime() - a.getTime())[0];
            return (
              <li key={u.id} className="flex justify-between gap-3">
                <span>{u.name}</span>
                <span className={u.subscriptions.length === 0 ? "text-danger" : "text-muted"}>
                  {u.subscriptions.length === 0
                    ? "kein Gerät mit Push"
                    : `${u.subscriptions.length} Gerät${u.subscriptions.length > 1 ? "e" : ""}${
                        letzte ? ` · zuletzt ${formatBerlinDatumZeit(letzte)}` : " · noch nichts zugestellt"
                      }`}
                </span>
              </li>
            );
          })}
        </ul>

        <h3 className="mt-2 text-sm font-medium text-muted">Probleme der letzten {ZEITRAUM_TAGE} Tage</h3>
        {probleme.length === 0 ? (
          <p className="text-sm text-muted">Keine — alles kam an.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border text-sm">
            {probleme.map((p) => (
              <li key={p.id} className="flex flex-col gap-0.5 py-2">
                <span className="font-medium">
                  {p.was} <span className="font-normal text-muted">→ {p.wer}</span>
                </span>
                <span className="text-xs text-muted">
                  fällig {formatBerlinDatumZeit(p.dueAt)} · {p.versuche} Versuch{p.versuche === 1 ? "" : "e"}
                  {p.aufgegeben ? " · aufgegeben" : " · wird erneut versucht"}
                </span>
                {p.fehler && <span className="text-xs text-danger">{p.fehler}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className="font-medium">Konto · {user?.name}</h2>
        <PasswortForm />
      </section>

      <LogoutButton mitText />
    </AppShell>
  );
}
