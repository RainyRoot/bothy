import { prisma } from "@/lib/prisma";
import {
  ERINNERUNG_NACHLAUF_MS,
  erinnerungFaelligAm,
  expandiereTermin,
  tagSchluessel,
} from "@/lib/kalender-shared";
import { getPartnerUserIds, userIdsFuerBetrifft } from "@/lib/partner";

const FENSTER_TAGE = 60;

export async function materialisiereTermin(terminId: string): Promise<void> {
  const termin = await prisma.termin.findUnique({
    where: { id: terminId },
    include: { erinnerungen: true, ausnahmen: true },
  });
  if (!termin || termin.archiviert || termin.erinnerungen.length === 0) return;

  const partner = await getPartnerUserIds();
  if (partner.length === 0) return;
  const [partnerA, partnerB] = partner;
  const userIds = userIdsFuerBetrifft(termin.betrifft, partnerA, partnerB);

  const jetzt = Date.now();
  // Einen Tag zurück, damit ein ganztägiger Termin von heute (00:00 UTC, also
  // schon "vorbei") seine 08:00-Erinnerung noch bekommt.
  const von = new Date(jetzt - 86_400_000);
  const bis = new Date(jetzt + FENSTER_TAGE * 86_400_000);
  const ausnahmeTage = new Set(termin.ausnahmen.map((a) => tagSchluessel(a.datum)));

  const vorkommen = expandiereTermin(termin, ausnahmeTage, von, bis);

  const jobs = vorkommen.flatMap((datum) =>
    termin.erinnerungen
      .map((erinnerung) => erinnerungFaelligAm(datum, termin.ganztags, erinnerung.minutenVorher))
      .filter((dueAt) => dueAt.getTime() >= jetzt - ERINNERUNG_NACHLAUF_MS)
      .flatMap((dueAt) => userIds.map((userId) => ({ terminId: termin.id, userId, dueAt }))),
  );

  if (jobs.length > 0) {
    await prisma.reminderJob.createMany({ data: jobs, skipDuplicates: true });
  }
}

/**
 * Vollständiger Lauf (Serverstart + täglich 03:00). Künftige, noch offene
 * Jobs werden vorher verworfen, damit nach einer geänderten Berechnung
 * (Deploy) keine veralteten Zeitpunkte neben den neuen liegen bleiben.
 * Überfällige bleiben unangetastet — die holt der Zusteller noch ab, z.B.
 * nach einem Neustart.
 */
export async function materialisiereAlle(): Promise<void> {
  // archiviert: false lässt laufende Test-Benachrichtigungen in Ruhe
  await prisma.reminderJob.deleteMany({
    where: { sentAt: null, dueAt: { gt: new Date() }, termin: { archiviert: false } },
  });
  const termine = await prisma.termin.findMany({ where: { archiviert: false }, select: { id: true } });
  for (const t of termine) {
    await materialisiereTermin(t.id);
  }
}

/** Nach Anlegen/Ändern eines Termins: offene Jobs verwerfen, frisch materialisieren (siehe PLAN.md 4.1). */
export async function remateralisiereNachAenderung(terminId: string): Promise<void> {
  await prisma.reminderJob.deleteMany({ where: { terminId, sentAt: null } });
  await materialisiereTermin(terminId);
}
