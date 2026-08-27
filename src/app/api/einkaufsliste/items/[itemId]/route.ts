import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const body = await request.json().catch(() => null);

  const data: Record<string, unknown> = {};
  if (typeof body?.abgehakt === "boolean") data.abgehakt = body.abgehakt;
  if (typeof body?.text === "string") {
    const text = body.text.trim();
    if (!text) {
      return NextResponse.json({ error: "Text fehlt" }, { status: 400 });
    }
    data.text = text;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nichts zu ändern" }, { status: 400 });
  }

  const item = await prisma.einkaufslistenItem.update({ where: { id: itemId }, data }).catch(() => null);
  if (!item) {
    return NextResponse.json({ error: "Eintrag nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json(item);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  await prisma.einkaufslistenItem.delete({ where: { id: itemId } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
