import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Manuell hinzugefügter Artikel, unabhängig vom Essensplan (z.B. "Spülmittel"). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "Text fehlt" }, { status: 400 });
  }

  const liste = await prisma.einkaufsliste.findUnique({ where: { id } });
  if (!liste) {
    return NextResponse.json({ error: "Liste nicht gefunden" }, { status: 404 });
  }

  const letztes = await prisma.einkaufslistenItem.findFirst({
    where: { einkaufslisteId: id },
    orderBy: { sortierung: "desc" },
  });

  const item = await prisma.einkaufslistenItem.create({
    data: { einkaufslisteId: id, text, sortierung: (letztes?.sortierung ?? -1) + 1 },
  });

  return NextResponse.json(item, { status: 201 });
}
