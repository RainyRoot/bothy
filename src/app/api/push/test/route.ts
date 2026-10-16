import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

const TEST_TITEL = "Test-Benachrichtigung";

export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  // Träger früherer Tests wegräumen, deren Push raus ist — sonst sammeln
  // sich bei jedem Test archivierte Termin-Zeilen an
  await prisma.termin.deleteMany({
    where: { titel: TEST_TITEL, archiviert: true, jobs: { none: { sentAt: null } } },
  });

  const dueAt = new Date(Date.now() + 2 * 60 * 1000);

  // Ein archivierter Einzeltermin, ausschließlich als Träger für den Test-Job —
  // taucht dadurch in keiner künftigen Kalenderansicht auf.
  const termin = await prisma.termin.create({
    data: {
      titel: TEST_TITEL,
      start: dueAt,
      archiviert: true,
      jobs: { create: { userId, dueAt } },
    },
  });

  return NextResponse.json({ ok: true, dueAt, terminId: termin.id });
}
