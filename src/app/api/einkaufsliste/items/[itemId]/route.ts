import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const body = await request.json().catch(() => null);
  if (typeof body?.abgehakt !== "boolean") {
    return NextResponse.json({ error: "abgehakt fehlt" }, { status: 400 });
  }

  const item = await prisma.einkaufslistenItem
    .update({ where: { id: itemId }, data: { abgehakt: body.abgehakt } })
    .catch(() => null);
  if (!item) {
    return NextResponse.json({ error: "Eintrag nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json(item);
}
