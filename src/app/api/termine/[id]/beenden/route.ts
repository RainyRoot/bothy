import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { remateralisiereNachAenderung } from "@/lib/reminder-materialize";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const termin = await prisma.termin
    .update({ where: { id }, data: { serienEnde: new Date() } })
    .catch(() => null);
  if (!termin) {
    return NextResponse.json({ error: "Termin nicht gefunden" }, { status: 404 });
  }

  await remateralisiereNachAenderung(id);

  return NextResponse.json(termin);
}
