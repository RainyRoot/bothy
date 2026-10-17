import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientId, mitEingabepruefung } from "@/lib/eingabe";

export async function GET() {
  const uebungen = await prisma.uebung.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(uebungen);
}

/**
 * Übung anlegen — auch offline aus dem Eingabefeld heraus (PLAN.md 4.5), daher
 * mit vom Client erzeugter ID. Gibt es den Namen schon (egal welche
 * Schreibweise), kommt die bestehende ID zurück; der Client stellt um.
 */
export const POST = mitEingabepruefung(async (request: NextRequest) => {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
  if (!name || name.length > 60) {
    return NextResponse.json({ error: "Name fehlt oder ist zu lang" }, { status: 400 });
  }
  const id = body?.id === undefined ? undefined : clientId(body.id, "Übungs-ID");

  const vorhanden =
    (id ? await prisma.uebung.findUnique({ where: { id } }) : null) ??
    (await prisma.uebung.findFirst({ where: { name: { equals: name, mode: "insensitive" } } }));
  if (vorhanden) {
    // Wer eine archivierte Übung wieder einträgt, will sie offenbar wieder
    if (vorhanden.archiviert) await prisma.uebung.update({ where: { id: vorhanden.id }, data: { archiviert: false } });
    return NextResponse.json({ ...vorhanden, archiviert: false });
  }

  const uebung = await prisma.uebung.create({ data: { ...(id ? { id } : {}), name } });
  return NextResponse.json(uebung, { status: 201 });
});
