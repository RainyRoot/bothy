import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { remateralisiereTodoNachAenderung } from "@/lib/todo-materialize";

const PRIORITAETEN = ["NIEDRIG", "NORMAL", "HOCH"] as const;
const BETRIFFT_WERTE = ["PARTNER_A", "PARTNER_B", "BEIDE"] as const;

export async function GET() {
  const todos = await prisma.todo.findMany({
    include: { erinnerungen: true },
    orderBy: [{ erledigt: "asc" }, { prioritaet: "desc" }, { faelligkeit: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(todos);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const prioritaet = PRIORITAETEN.includes(body?.prioritaet) ? body.prioritaet : "NORMAL";
  const betrifft = BETRIFFT_WERTE.includes(body?.betrifft) ? body.betrifft : "BEIDE";
  const faelligkeit = typeof body?.faelligkeit === "string" && body.faelligkeit ? new Date(body.faelligkeit) : null;
  const erinnerungen: number[] = Array.isArray(body?.erinnerungen)
    ? body.erinnerungen.filter((m: unknown): m is number => typeof m === "number")
    : [];

  if (!text || text.length > 200) {
    return NextResponse.json({ error: "Text fehlt oder ist zu lang" }, { status: 400 });
  }

  const todo = await prisma.todo.create({
    data: {
      text,
      prioritaet,
      betrifft,
      faelligkeit,
      erinnerungen: { create: erinnerungen.map((minutenVorher) => ({ minutenVorher })) },
    },
    include: { erinnerungen: true },
  });

  await remateralisiereTodoNachAenderung(todo.id);

  return NextResponse.json(todo, { status: 201 });
}
