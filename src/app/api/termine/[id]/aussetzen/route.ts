import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { remateralisiereNachAenderung } from "@/lib/reminder-materialize";
import { datumOderNull, mitEingabepruefung } from "@/lib/eingabe";

export const POST = mitEingabepruefung(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const datum = datumOderNull(body?.datum, "Datum");
  if (!datum) {
    return NextResponse.json({ error: "Datum fehlt" }, { status: 400 });
  }

  const termin = await prisma.termin.findUnique({ where: { id } });
  if (!termin) {
    return NextResponse.json({ error: "Termin nicht gefunden" }, { status: 404 });
  }

  await prisma.terminAusnahme.upsert({
    where: { terminId_datum: { terminId: id, datum } },
    create: { terminId: id, datum },
    update: {},
  });

  await remateralisiereNachAenderung(id);

  return NextResponse.json({ ok: true });
});
