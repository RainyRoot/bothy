import { prisma } from "@/lib/prisma";

/**
 * PARTNER_A/PARTNER_B sind im Schema keine festen Rollen, sondern die
 * Reihenfolge der Registrierung beim Setup (Person 1 / Person 2) —
 * kein zusätzliches Feld nötig, da es dauerhaft genau zwei Nutzer gibt.
 * Von Kalender- und Todo-Materialisierer gemeinsam genutzt.
 */
export async function getPartnerUserIds(): Promise<[string, string] | []> {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" }, take: 2 });
  if (users.length < 2) return [];
  return [users[0].id, users[1].id];
}

export function userIdsFuerBetrifft(betrifft: string, partnerA: string, partnerB: string): string[] {
  if (betrifft === "PARTNER_A") return [partnerA];
  if (betrifft === "PARTNER_B") return [partnerB];
  return [partnerA, partnerB];
}
