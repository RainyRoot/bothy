import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { remateralisiereTodoNachAenderung } from "@/lib/todo-materialize";

const PRIORITAETEN = ["NIEDRIG", "NORMAL", "HOCH"] as const;
const BETRIFFT_WERTE = ["PARTNER_A", "PARTNER_B", "BEIDE"] as const;

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const bestehend = await prisma.todo.findUnique({ where: { id } });
  if (!bestehend) {
    return NextResponse.json({ error: "Todo nicht gefunden" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body?.text === "string") data.text = body.text.trim();
  if (typeof body?.erledigt === "boolean") data.erledigt = body.erledigt;
  if (PRIORITAETEN.includes(body?.prioritaet)) data.prioritaet = body.prioritaet;
  if (BETRIFFT_WERTE.includes(body?.betrifft)) data.betrifft = body.betrifft;
  if (body?.faelligkeit !== undefined) {
    data.faelligkeit = typeof body.faelligkeit === "string" && body.faelligkeit ? new Date(body.faelligkeit) : null;
  }

  const erinnerungen: number[] | null = Array.isArray(body?.erinnerungen)
    ? body.erinnerungen.filter((m: unknown): m is number => typeof m === "number")
    : null;

  await prisma.$transaction(async (tx) => {
    if (Object.keys(data).length > 0) {
      await tx.todo.update({ where: { id }, data });
    }
    if (erinnerungen) {
      await tx.todoErinnerung.deleteMany({ where: { todoId: id } });
      await tx.todoErinnerung.createMany({
        data: erinnerungen.map((minutenVorher) => ({ todoId: id, minutenVorher })),
      });
    }
  });

  await remateralisiereTodoNachAenderung(id);

  const todo = await prisma.todo.findUnique({ where: { id }, include: { erinnerungen: true } });
  return NextResponse.json(todo);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.todo.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
