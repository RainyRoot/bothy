import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { clientId, datumOderNull, mitEingabepruefung, zeitpunktOderNull } from "@/lib/eingabe";
import { berlinHeuteAlsDatum } from "@/lib/timezone";

/**
 * Training starten oder beitreten (PLAN.md 4.5). Idempotent, weil die Outbox
 * diesen Request beliebig oft wiederholen kann:
 * 1. Gibt es die vom Client erzeugte ID schon → genau dieses Training.
 * 2. Läuft am selben Tag schon eins → beitreten, dessen ID zurück. Der
 *    Client stellt dann seine lokale ID auf diese um.
 * 3. Sonst neu anlegen, mit der ID des Clients.
 */
export const POST = mitEingabepruefung(async (request: NextRequest) => {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const id = clientId(body?.id, "Training-ID");
  const datum = datumOderNull(body?.datum, "Datum") ?? berlinHeuteAlsDatum();
  const gestartetAt = zeitpunktOderNull(typeof body?.gestartetAt === "string" ? body.gestartetAt : null, "Start") ?? new Date();
  const planId = typeof body?.planId === "string" && body.planId ? body.planId : null;

  const bestehend = await prisma.training.findUnique({ where: { id } });
  if (bestehend) return NextResponse.json({ id: bestehend.id, beigetreten: false });

  const laufend = await prisma.training.findFirst({
    where: { datum, beendetAt: null },
    orderBy: { gestartetAt: "asc" },
  });
  if (laufend) return NextResponse.json({ id: laufend.id, beigetreten: true });

  const plan = planId ? await prisma.trainingsplan.findUnique({ where: { id: planId } }) : null;
  const training = await prisma.training.create({
    data: { id, datum, gestartetAt, planId: plan?.id ?? null },
  });
  return NextResponse.json({ id: training.id, beigetreten: false }, { status: 201 });
});
