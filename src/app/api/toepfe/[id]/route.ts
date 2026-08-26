import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTopfStand } from "@/lib/toepfe";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const topf = await prisma.topf.findUnique({
    where: { id },
    include: {
      buchungen: { orderBy: { datum: "desc" }, include: { vonUser: { select: { id: true, name: true } } } },
    },
  });
  if (!topf) {
    return NextResponse.json({ error: "Topf nicht gefunden" }, { status: 404 });
  }

  const standCent = await getTopfStand(id);

  return NextResponse.json({ ...topf, standCent });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const data: Record<string, unknown> = {};
  if (typeof body?.name === "string") data.name = body.name.trim();
  if (typeof body?.farbe === "string") data.farbe = body.farbe;
  if (typeof body?.sortierung === "number") data.sortierung = body.sortierung;
  if (typeof body?.archiviert === "boolean") data.archiviert = body.archiviert;
  if (typeof body?.zielCent === "number") data.zielCent = Math.round(body.zielCent);
  if (typeof body?.zielDatum === "string") data.zielDatum = body.zielDatum ? new Date(body.zielDatum) : null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Keine Änderungen übergeben" }, { status: 400 });
  }

  const topf = await prisma.topf.update({ where: { id }, data });
  return NextResponse.json(topf);
}
