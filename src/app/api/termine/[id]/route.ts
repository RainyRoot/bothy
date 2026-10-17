import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { berlinZeitpunkt, datumOderNull, mitEingabepruefung } from "@/lib/eingabe";
import { remateralisiereNachAenderung } from "@/lib/reminder-materialize";

/** Ganztägig: 00:00 UTC des Datums; sonst Berlin-Ortszeit → UTC. Fehlt → null, ungültig → 400. */
function parseZeitpunkt(datum: unknown, zeit: unknown, ganztags: boolean, feld: string): Date | null {
  if (datum === undefined || datum === null || datum === "") return null;
  return ganztags ? datumOderNull(datum, feld) : berlinZeitpunkt(datum, zeit, feld);
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const termin = await prisma.termin.findUnique({
    where: { id },
    include: { erinnerungen: true, ausnahmen: true },
  });
  if (!termin) {
    return NextResponse.json({ error: "Termin nicht gefunden" }, { status: 404 });
  }
  return NextResponse.json(termin);
}

export const PATCH = mitEingabepruefung(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const bestehend = await prisma.termin.findUnique({ where: { id } });
  if (!bestehend) {
    return NextResponse.json({ error: "Termin nicht gefunden" }, { status: 404 });
  }

  const ganztags = typeof body?.ganztags === "boolean" ? body.ganztags : bestehend.ganztags;
  const data: Record<string, unknown> = { ganztags };

  if (typeof body?.titel === "string") data.titel = body.titel.trim();
  if (body?.datumStart) {
    const start = parseZeitpunkt(body.datumStart, body.zeitStart, ganztags, "Start");
    if (!start) return NextResponse.json({ error: "Start ungültig" }, { status: 400 });
    data.start = start;
  }
  if (body?.datumEnde !== undefined) {
    data.ende = body.datumEnde ? parseZeitpunkt(body.datumEnde, body.zeitEnde, ganztags, "Ende") : null;
  }
  if (typeof body?.ort === "string") data.ort = body.ort.trim() || null;
  if (typeof body?.notiz === "string") data.notiz = body.notiz.trim() || null;
  if (typeof body?.farbe === "string") data.farbe = body.farbe;
  if (["PARTNER_A", "PARTNER_B", "BEIDE"].includes(body?.betrifft)) data.betrifft = body.betrifft;
  if (["KEINE", "WOECHENTLICH", "MONATLICH", "JAEHRLICH"].includes(body?.rhythmus)) data.rhythmus = body.rhythmus;
  if (body?.serienEnde !== undefined) data.serienEnde = datumOderNull(body.serienEnde, "Serienende");

  const erinnerungen: number[] | null = Array.isArray(body?.erinnerungen)
    ? body.erinnerungen.filter((m: unknown): m is number => typeof m === "number")
    : null;

  await prisma.$transaction(async (tx) => {
    await tx.termin.update({ where: { id }, data });
    if (erinnerungen) {
      await tx.terminErinnerung.deleteMany({ where: { terminId: id } });
      await tx.terminErinnerung.createMany({
        data: erinnerungen.map((minutenVorher) => ({ terminId: id, minutenVorher })),
      });
    }
  });

  await remateralisiereNachAenderung(id);

  const termin = await prisma.termin.findUnique({ where: { id }, include: { erinnerungen: true } });
  return NextResponse.json(termin);
});

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.termin.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
