import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Archivieren/Wiederherstellen und Umbenennen. Gelöscht wird nicht — die Historie hängt dran. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const data: { archiviert?: boolean; name?: string } = {};
  if (typeof body?.archiviert === "boolean") data.archiviert = body.archiviert;
  if (typeof body?.name === "string") {
    const name = body.name.trim().replace(/\s+/g, " ");
    if (!name || name.length > 60) return NextResponse.json({ error: "Name fehlt oder ist zu lang" }, { status: 400 });
    const gleichnamig = await prisma.uebung.findFirst({
      where: { name: { equals: name, mode: "insensitive" }, id: { not: id } },
    });
    if (gleichnamig) return NextResponse.json({ error: "Diesen Namen gibt es schon" }, { status: 409 });
    data.name = name;
  }

  const uebung = await prisma.uebung.update({ where: { id }, data }).catch(() => null);
  if (!uebung) return NextResponse.json({ error: "Übung nicht gefunden" }, { status: 404 });
  return NextResponse.json(uebung);
}
