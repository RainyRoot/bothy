import { prisma } from "@/lib/prisma";
import { sendPush } from "@/lib/push";

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
    await deliver(job.id, job.terminId, job.userId, job.versuche);
  }
}

async function deliver(jobId: string, terminId: string, userId: string, versuche: number): Promise<void> {
  const [termin, subscriptions] = await Promise.all([
    prisma.termin.findUnique({ where: { id: terminId } }),
    prisma.pushSubscription.findMany({ where: { userId } }),
  ]);

  if (!termin) {
    await prisma.reminderJob.update({ where: { id: jobId }, data: { sentAt: new Date() } });
    return;
  }

  if (subscriptions.length === 0) {
    await markFailed(jobId, versuche, "Keine Push-Subscription");
    return;
  }

  let anySuccess = false;
  for (const subscription of subscriptions) {
    try {
      await sendPush(subscription, { title: termin.titel, body: termin.notiz ?? undefined });
      anySuccess = true;
    } catch (err) {
      const statusCode = (err as { statusCode?: number } | null)?.statusCode;
      if (statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => {});
      }
    }
  }

  if (anySuccess) {
    await prisma.reminderJob.update({ where: { id: jobId }, data: { sentAt: new Date() } });
  } else {
    await markFailed(jobId, versuche, "Zustellung an keine Subscription erfolgreich");
  }
}

async function markFailed(jobId: string, versuche: number, fehler: string): Promise<void> {
  const neueVersuche = versuche + 1;
  await prisma.reminderJob.update({
    where: { id: jobId },
    data: {
      versuche: neueVersuche,
      fehler,
      sentAt: neueVersuche >= MAX_VERSUCHE ? new Date() : undefined,
    },
  });
}
