import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mitEingabepruefung } from "@/lib/eingabe";
import { parsePlanEintraege, setzePlanUebungen } from "@/lib/trainingsplan";

/** Name, Archiv-Status und/oder die komplette Übungsliste ändern. */
export const PATCH = mitEingabepruefung(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const body = await request.json().catch(() => null);

    const plan = await prisma.trainingsplan.findUnique({ where: { id } });
    if (!plan) return NextResponse.json({ error: "Plan nicht gefunden" }, { status: 404 });

    const data: { name?: string; archiviert?: boolean } = {};
    if (typeof body?.name === "string") {
      const name = body.name.trim();
      if (!name || name.length > 50) return NextResponse.json({ error: "Name fehlt oder ist zu lang" }, { status: 400 });
      data.name = name;
    }
    if (typeof body?.archiviert === "boolean") data.archiviert = body.archiviert;
    const eintraege = body?.uebungen !== undefined ? parsePlanEintraege(body.uebungen) : null;

    if (Object.keys(data).length > 0) await prisma.trainingsplan.update({ where: { id }, data });
    if (eintraege) await setzePlanUebungen(id, eintraege);

    return NextResponse.json({ ok: true });
  },
);

/** Vergangene Trainings bleiben, ihr planId wird null (onDelete: SetNull). */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.trainingsplan.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
