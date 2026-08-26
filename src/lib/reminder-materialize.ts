import { prisma } from "@/lib/prisma";
import { expandiereTermin, tagSchluessel } from "@/lib/kalender-shared";

const FENSTER_TAGE = 60;

/**
 * PARTNER_A/PARTNER_B sind im Schema keine festen Rollen, sondern die
 * Reihenfolge der Registrierung beim Setup (Person 1 / Person 2) —
 * kein zusätzliches Feld nötig, da es dauerhaft genau zwei Nutzer gibt.
 */
async function getPartnerUserIds(): Promise<[string, string] | []> {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" }, take: 2 });
  if (users.length < 2) return [];
  return [users[0].id, users[1].id];
}

function userIdsFuerBetrifft(betrifft: string, partnerA: string, partnerB: string): string[] {
  if (betrifft === "PARTNER_A") return [partnerA];
  if (betrifft === "PARTNER_B") return [partnerB];
  return [partnerA, partnerB];
}

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

  const von = new Date();
  const bis = new Date(von.getTime() + FENSTER_TAGE * 86_400_000);
  const ausnahmeTage = new Set(termin.ausnahmen.map((a) => tagSchluessel(a.datum)));

  const vorkommen = expandiereTermin(termin, ausnahmeTage, von, bis);

  const jobs = vorkommen.flatMap((datum) =>
    termin.erinnerungen.flatMap((erinnerung) =>
      userIds.map((userId) => ({
        terminId: termin.id,
        userId,
        dueAt: new Date(datum.getTime() - erinnerung.minutenVorher * 60_000),
      })),
    ),
  );

  if (jobs.length > 0) {
    await prisma.reminderJob.createMany({ data: jobs, skipDuplicates: true });
  }
}

export async function materialisiereAlle(): Promise<void> {
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
