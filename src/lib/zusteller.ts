import { prisma } from "@/lib/prisma";
import { sendPush } from "@/lib/push";
import { erinnerungFaelligAm, expandiereTermin, tagSchluessel } from "@/lib/kalender-shared";
import { formatBerlinRelativ } from "@/lib/timezone";

const INTERVAL_MS = 60_000;
const BATCH_SIZE = 50;
const MAX_VERSUCHE = 5;

let started = false;

/**
 * Selbst nachplanende Schleife statt setInterval: die nächste Runde startet
 * erst, wenn die vorherige fertig ist. Verhindert überlappende Läufe, falls
 * die Zustellung (Netzwerk-Calls) länger als 60s dauert — ohne DB-Sperren.
 */
export function startZusteller(): void {
  if (started) return;
  started = true;
  void loop();
}

async function loop() {
  while (true) {
    try {
      await runOnce();
    } catch (err) {
      console.error("Zusteller-Fehler:", err);
    }
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }
}

async function runOnce(): Promise<void> {
  const jobs = await prisma.reminderJob.findMany({
    where: { dueAt: { lte: new Date() }, sentAt: null },
    orderBy: { dueAt: "asc" },
    take: BATCH_SIZE,
  });
  for (const job of jobs) {
    await deliverTermin(job.id, job.terminId, job.userId, job.versuche, job.dueAt);
  }

  const todoJobs = await prisma.todoReminderJob.findMany({
    where: { dueAt: { lte: new Date() }, sentAt: null },
    orderBy: { dueAt: "asc" },
    take: BATCH_SIZE,
  });
  for (const job of todoJobs) {
    await deliverTodo(job.id, job.todoId, job.userId, job.versuche);
  }
}

/**
 * Zu welchem Vorkommen gehört ein Job? Der Job speichert nur dueAt — also das
 * Vorkommen der nächsten Tage suchen, dessen Erinnerung genau dort fällig war.
 */
function vorkommenZuJob(
  termin: Parameters<typeof expandiereTermin>[0] & {
    erinnerungen: { minutenVorher: number }[];
    ausnahmen: { datum: Date }[];
  },
  dueAt: Date,
): Date | null {
  const ausnahmeTage = new Set(termin.ausnahmen.map((a) => tagSchluessel(a.datum)));
  const kandidaten = expandiereTermin(
    { ...termin, archiviert: false },
    ausnahmeTage,
    new Date(dueAt.getTime() - 86_400_000),
    new Date(dueAt.getTime() + 8 * 86_400_000),
  );
  return (
    kandidaten.find((datum) =>
      termin.erinnerungen.some(
        (e) => erinnerungFaelligAm(datum, termin.ganztags, e.minutenVorher).getTime() === dueAt.getTime(),
      ),
    ) ?? null
  );
}

async function deliverTermin(
  jobId: string,
  terminId: string,
  userId: string,
  versuche: number,
  dueAt: Date,
): Promise<void> {
  const [termin, subscriptions] = await Promise.all([
    prisma.termin.findUnique({ where: { id: terminId }, include: { erinnerungen: true, ausnahmen: true } }),
    prisma.pushSubscription.findMany({ where: { userId } }),
  ]);

  if (!termin) {
    await prisma.reminderJob.update({ where: { id: jobId }, data: { sentAt: new Date() } });
    return;
  }

  // Test-Benachrichtigungen hängen an einem archivierten Träger-Termin ohne Erinnerungen
  const vorkommen = termin.archiviert ? null : vorkommenZuJob(termin, dueAt);
  const body = [vorkommen ? formatBerlinRelativ(vorkommen, termin.ganztags) : null, termin.ort, termin.notiz]
    .filter(Boolean)
    .join(" · ");
  const { erfolg, fehler } = await pushAnAlle(subscriptions, {
    title: termin.titel,
    body: body || undefined,
    url: termin.archiviert ? "/" : `/kalender/${termin.id}`,
  });
  if (erfolg) {
    await prisma.reminderJob.update({ where: { id: jobId }, data: { sentAt: new Date() } });
  } else {
    await markFailed("reminderJob", jobId, versuche, fehler);
  }
}

async function deliverTodo(jobId: string, todoId: string, userId: string, versuche: number): Promise<void> {
  const [todo, subscriptions] = await Promise.all([
    prisma.todo.findUnique({ where: { id: todoId } }),
    prisma.pushSubscription.findMany({ where: { userId } }),
  ]);

  if (!todo || todo.erledigt) {
    await prisma.todoReminderJob.update({ where: { id: jobId }, data: { sentAt: new Date() } });
    return;
  }

  const { erfolg, fehler } = await pushAnAlle(subscriptions, {
    title: `Todo: ${todo.text}`,
    body: todo.faelligkeit ? `fällig ${formatBerlinRelativ(todo.faelligkeit, true)}` : undefined,
    url: "/todos",
  });
  if (erfolg) {
    await prisma.todoReminderJob.update({ where: { id: jobId }, data: { sentAt: new Date() } });
  } else {
    await markFailed("todoReminderJob", jobId, versuche, fehler);
  }
}

async function pushAnAlle(
  subscriptions: { id: string; endpoint: string; p256dh: string; auth: string }[],
  payload: { title: string; body?: string; url?: string },
): Promise<{ erfolg: boolean; fehler: string }> {
  if (subscriptions.length === 0) return { erfolg: false, fehler: "Kein Gerät mit aktivem Push" };
  let anySuccess = false;
  const fehler: string[] = [];
  for (const subscription of subscriptions) {
    try {
      await sendPush(subscription, payload);
      anySuccess = true;
      // Für die Zustell-Übersicht in den Einstellungen: wann kam zuletzt etwas an
      await prisma.pushSubscription
        .update({ where: { id: subscription.id }, data: { lastOkAt: new Date() } })
        .catch(() => {});
    } catch (err) {
      const statusCode = (err as { statusCode?: number } | null)?.statusCode;
      fehler.push(statusCode ? `HTTP ${statusCode}` : err instanceof Error ? err.message : "unbekannt");
      if (statusCode === 410 || statusCode === 404) {
        await prisma.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => {});
      }
    }
  }
  return { erfolg: anySuccess, fehler: `Zustellung fehlgeschlagen: ${fehler.join(", ")}`.slice(0, 500) };
}

async function markFailed(
  modell: "reminderJob" | "todoReminderJob",
  jobId: string,
  versuche: number,
  fehler: string,
): Promise<void> {
  const neueVersuche = versuche + 1;
  const data = {
    versuche: neueVersuche,
    fehler,
    sentAt: neueVersuche >= MAX_VERSUCHE ? new Date() : undefined,
  };
  if (modell === "reminderJob") {
    await prisma.reminderJob.update({ where: { id: jobId }, data });
  } else {
    await prisma.todoReminderJob.update({ where: { id: jobId }, data });
  }
}
