import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { datumOderNull, mitEingabepruefung } from "@/lib/eingabe";

// Eine Umbuchung sind zwei Zeilen mit gemeinsamer transferId (PLAN.md 3).
// Ändern und Löschen wirken immer auf beide Hälften — sonst stimmt die
// Summe über alle Töpfe nicht mehr.

export const PATCH = mitEingabepruefung(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const body = await request.json().catch(() => null);

    const buchung = await prisma.buchung.findUnique({ where: { id } });
    if (!buchung) {
      return NextResponse.json({ error: "Buchung nicht gefunden" }, { status: 404 });
    }

    const gemeinsam: { notiz?: string | null; datum?: Date } = {};
    if (body?.notiz !== undefined) {
      gemeinsam.notiz = typeof body.notiz === "string" && body.notiz.trim() ? body.notiz.trim() : null;
    }
    if (body?.datum !== undefined) {
      const datum = datumOderNull(body.datum, "Datum");
      if (!datum) return NextResponse.json({ error: "Datum fehlt" }, { status: 400 });
      gemeinsam.datum = datum;
    }

    let betragCent: number | undefined;
    if (body?.betragCent !== undefined) {
      if (typeof body.betragCent !== "number" || !Number.isFinite(body.betragCent) || Math.round(body.betragCent) === 0) {
        return NextResponse.json({ error: "Betrag fehlt" }, { status: 400 });
      }
      betragCent = Math.round(body.betragCent);
    }

    if (!buchung.transferId) {
      const aktualisiert = await prisma.buchung.update({
        where: { id },
        data: { ...gemeinsam, ...(betragCent !== undefined ? { betragCent } : {}) },
      });
      return NextResponse.json(aktualisiert);
    }

    // Umbuchung: Betrag als Höhe übernehmen, Richtung (Vorzeichen) je Hälfte behalten
    const haelften = await prisma.buchung.findMany({ where: { transferId: buchung.transferId } });
    await prisma.$transaction(
      haelften.map((h) =>
        prisma.buchung.update({
          where: { id: h.id },
          data: {
            ...gemeinsam,
            ...(betragCent !== undefined ? { betragCent: Math.sign(h.betragCent) * Math.abs(betragCent) } : {}),
          },
        }),
      ),
    );
    return NextResponse.json(await prisma.buchung.findUnique({ where: { id } }));
  },
);

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const buchung = await prisma.buchung.findUnique({ where: { id } });
  if (!buchung) {
    return NextResponse.json({ ok: true });
  }
  if (buchung.transferId) {
    await prisma.buchung.deleteMany({ where: { transferId: buchung.transferId } });
  } else {
    await prisma.buchung.delete({ where: { id } });
  }
  return NextResponse.json({ ok: true });
}
