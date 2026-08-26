import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const woche = searchParams.get("woche");
  if (!woche) {
    return NextResponse.json({ error: "Woche fehlt" }, { status: 400 });
  }

  const liste = await prisma.einkaufsliste.findUnique({
    where: { woche: new Date(woche) },
    include: { items: { orderBy: { sortierung: "asc" } } },
  });

  return NextResponse.json(liste);
}
