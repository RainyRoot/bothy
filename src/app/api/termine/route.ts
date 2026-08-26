import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEreignisse } from "@/lib/kalender";
import { berlinWallToUTC } from "@/lib/timezone";
import { remateralisiereNachAenderung } from "@/lib/reminder-materialize";

function parseZeitpunkt(datum: unknown, zeit: unknown, ganztags: boolean): Date | null {
  if (typeof datum !== "string" || !datum) return null;
  if (ganztags) return new Date(datum);
  if (typeof zeit !== "string" || !zeit) return null;
  return berlinWallToUTC(datum, zeit);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const vonParam = searchParams.get("von");
  const bisParam = searchParams.get("bis");
  const von = vonParam ? new Date(vonParam) : new Date();
  const bis = bisParam ? new Date(bisParam) : new Date(von.getTime() + 30 * 86_400_000);

  const ereignisse = await getEreignisse(von, bis);

  return NextResponse.json(ereignisse);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const titel = typeof body?.titel === "string" ? body.titel.trim() : "";
  const ganztags = Boolean(body?.ganztags);
  const start = parseZeitpunkt(body?.datumStart, body?.zeitStart, ganztags);
  const ende = body?.datumEnde ? parseZeitpunkt(body.datumEnde, body?.zeitEnde, ganztags) : null;
  const betrifft = ["PARTNER_A", "PARTNER_B", "BEIDE"].includes(body?.betrifft) ? body.betrifft : "BEIDE";
  const rhythmus = ["KEINE", "WOECHENTLICH", "MONATLICH", "JAEHRLICH"].includes(body?.rhythmus)
    ? body.rhythmus
    : "KEINE";
  const erinnerungen: number[] = Array.isArray(body?.erinnerungen)
    ? body.erinnerungen.filter((m: unknown): m is number => typeof m === "number")
    : [];

  if (!titel || titel.length > 100) {
    return NextResponse.json({ error: "Titel fehlt oder ist zu lang" }, { status: 400 });
  }
  if (!start) {
    return NextResponse.json({ error: "Start fehlt oder ist ungültig" }, { status: 400 });
  }

  const termin = await prisma.termin.create({
    data: {
      titel,
      ganztags,
      start,
      ende,
      ort: typeof body?.ort === "string" && body.ort.trim() ? body.ort.trim() : null,
      notiz: typeof body?.notiz === "string" && body.notiz.trim() ? body.notiz.trim() : null,
      farbe: typeof body?.farbe === "string" ? body.farbe : null,
      betrifft,
      rhythmus,
      serienEnde: typeof body?.serienEnde === "string" && body.serienEnde ? new Date(body.serienEnde) : null,
      erinnerungen: { create: erinnerungen.map((minutenVorher) => ({ minutenVorher })) },
    },
  });

  await remateralisiereNachAenderung(termin.id);

  return NextResponse.json(termin, { status: 201 });
}
