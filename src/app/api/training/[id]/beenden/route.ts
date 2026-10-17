import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const training = await prisma.training.findUnique({ where: { id } });
  if (!training) return NextResponse.json({ error: "Training nicht gefunden" }, { status: 404 });

  // Wiederholt gesendet (Outbox) oder schon von der anderen Person beendet: kein Fehler
  if (!training.beendetAt) {
    await prisma.training.update({ where: { id }, data: { beendetAt: new Date() } });
  }
  return NextResponse.json({ ok: true });
}
