import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { satzZuDto } from "@/lib/training";

/** Für das 10-s-Polling während des Trainings: Stand und Sätze beider Personen. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const training = await prisma.training.findUnique({
    where: { id },
    include: { saetze: { orderBy: { createdAt: "asc" } } },
  });
  if (!training) return NextResponse.json({ error: "Training nicht gefunden" }, { status: 404 });

  return NextResponse.json({
    id: training.id,
    planId: training.planId,
    beendet: training.beendetAt !== null,
    saetze: training.saetze.map(satzZuDto),
  });
}
