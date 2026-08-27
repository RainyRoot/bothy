import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const data: Record<string, unknown> = {};
  if (typeof body?.titel === "string") {
    const titel = body.titel.trim();
    if (!titel || titel.length > 100) {
      return NextResponse.json({ error: "Titel fehlt oder ist zu lang" }, { status: 400 });
    }
    data.titel = titel;
  }
  if (typeof body?.zutaten === "string") data.zutaten = body.zutaten.trim();
  if (typeof body?.datum === "string" && body.datum) data.datum = new Date(body.datum);

  const mahlzeit = await prisma.mahlzeit.update({ where: { id }, data }).catch(() => null);
  if (!mahlzeit) {
    return NextResponse.json({ error: "Mahlzeit nicht gefunden" }, { status: 404 });
  }
  return NextResponse.json(mahlzeit);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.mahlzeit.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
