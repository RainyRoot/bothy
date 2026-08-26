import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const dueAt = new Date(Date.now() + 2 * 60 * 1000);

  // Ein archivierter Einzeltermin, ausschließlich als Träger für den Test-Job —
  // taucht dadurch in keiner künftigen Kalenderansicht auf.
  const termin = await prisma.termin.create({
    data: {
      titel: "Test-Benachrichtigung",
      start: dueAt,
      archiviert: true,
      jobs: { create: { userId, dueAt } },
    },
  });

  return NextResponse.json({ ok: true, dueAt, terminId: termin.id });
}
