import { prisma } from "@/lib/prisma";
import { getPartnerUserIds, userIdsFuerBetrifft } from "@/lib/partner";

/**
 * Deutlich einfacher als materialisiereTermin (siehe reminder-materialize.ts):
 * ein Todo hat weder Serie noch Uhrzeit, also keine expandiereTermin-Expansion
 * nötig — nur dueAt = faelligkeit − minutenVorher je Erinnerung und Nutzer.
 */
export async function materialisiereTodo(todoId: string): Promise<void> {
  const todo = await prisma.todo.findUnique({ where: { id: todoId }, include: { erinnerungen: true } });
  if (!todo || todo.erledigt || !todo.faelligkeit || todo.erinnerungen.length === 0) return;

  const heuteUTC = new Date();
  heuteUTC.setUTCHours(0, 0, 0, 0);
  if (todo.faelligkeit < heuteUTC) return; // Fälligkeit schon vorbei — keine Erinnerung mehr sinnvoll

  const partner = await getPartnerUserIds();
  if (partner.length === 0) return;
  const [partnerA, partnerB] = partner;
  const userIds = userIdsFuerBetrifft(todo.betrifft, partnerA, partnerB);

  const jobs = todo.erinnerungen.flatMap((erinnerung) =>
    userIds.map((userId) => ({
      todoId: todo.id,
      userId,
      dueAt: new Date(todo.faelligkeit!.getTime() - erinnerung.minutenVorher * 60_000),
    })),
  );

  if (jobs.length > 0) {
    await prisma.todoReminderJob.createMany({ data: jobs, skipDuplicates: true });
  }
}

export async function materialisiereAlleTodos(): Promise<void> {
  const todos = await prisma.todo.findMany({ where: { erledigt: false }, select: { id: true } });
  for (const t of todos) {
    await materialisiereTodo(t.id);
  }
}

/** Nach Anlegen/Ändern eines Todos: offene Jobs verwerfen, frisch materialisieren. */
export async function remateralisiereTodoNachAenderung(todoId: string): Promise<void> {
  await prisma.todoReminderJob.deleteMany({ where: { todoId, sentAt: null } });
  await materialisiereTodo(todoId);
}
