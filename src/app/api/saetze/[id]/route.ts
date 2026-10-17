import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { clientId, ganzzahl, mitEingabepruefung, zeitpunktOderNull } from "@/lib/eingabe";
import { bisherigerRekord, satzZuDto } from "@/lib/training";
import { istBesser } from "@/lib/training-shared";

/**
 * Satz anlegen oder korrigieren — Upsert auf die vom Client erzeugte ID.
 * Ein mehrfach gesendeter Satz landet so genau einmal in der DB (PLAN.md 4.5,
 * Idempotenz-Garantie). Antwortet mit `rekord: true`, wenn der Satz den
 * bisherigen Bestwert der Person bei dieser Übung schlägt.
 */
export const PUT = mitEingabepruefung(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const id = clientId((await params).id, "Satz-ID");
    const body = await request.json().catch(() => null);
    const trainingId = clientId(body?.trainingId, "Training-ID");
    const uebungId = typeof body?.uebungId === "string" ? body.uebungId : "";
    const gewichtGramm = ganzzahl(body?.gewichtGramm, "Gewicht", 0, 1_000_000);
    const wiederholungen = ganzzahl(body?.wiederholungen, "Wiederholungen", 1, 1000);
    // Reihenfolge der Sätze = Zeitpunkt auf dem Handy, nicht Ankunft beim Server
    const createdAt =
      zeitpunktOderNull(typeof body?.createdAt === "string" ? body.createdAt : null, "Zeitpunkt") ?? new Date();

    const [bestehend, training, uebung] = await Promise.all([
      prisma.satz.findUnique({ where: { id } }),
      prisma.training.findUnique({ where: { id: trainingId } }),
      uebungId ? prisma.uebung.findUnique({ where: { id: uebungId } }) : null,
    ]);
    if (bestehend && bestehend.userId !== userId) {
      return NextResponse.json({ error: "Satz gehört der anderen Person" }, { status: 403 });
    }
    if (!training) return NextResponse.json({ error: "Training nicht gefunden" }, { status: 404 });
    if (!uebung) return NextResponse.json({ error: "Übung nicht gefunden" }, { status: 404 });

    const satz = await prisma.satz.upsert({
      where: { id },
      create: { id, trainingId, userId, uebungId, gewichtGramm, wiederholungen, createdAt },
      update: { uebungId, gewichtGramm, wiederholungen },
    });

    // Erster Satz einer Übung ist kein "Rekord" — das wäre bei jeder neuen Übung Lärm
    const vorher = await bisherigerRekord(userId, uebungId, id);
    const rekord = vorher !== null && istBesser(satz, vorher);

    return NextResponse.json({ satz: satzZuDto(satz), rekord });
  },
);

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  // Idempotent: schon weg (oder nie angekommen) ist auch ok
  await prisma.satz.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
