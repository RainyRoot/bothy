import { prisma } from "@/lib/prisma";
import { ERINNERUNG_NACHLAUF_MS, erinnerungFaelligAm } from "@/lib/kalender-shared";
import { getPartnerUserIds, userIdsFuerBetrifft } from "@/lib/partner";

/**
 * Deutlich einfacher als materialisiereTermin (siehe reminder-materialize.ts):
 * ein Todo hat weder Serie noch Uhrzeit, also keine expandiereTermin-Expansion
 * nötig — nur ein dueAt je Erinnerung und Nutzer, verankert wie bei
 * ganztägigen Terminen (08:00 Berlin, siehe erinnerungFaelligAm).
 */
export async function materialisiereTodo(todoId: string): Promise<void> {
  const todo = await prisma.todo.findUnique({ where: { id: todoId }, include: { erinnerungen: true } });
  if (!todo || todo.erledigt || !todo.faelligkeit || todo.erinnerungen.length === 0) return;
  const faelligkeit = todo.faelligkeit;

  const partner = await getPartnerUserIds();
  if (partner.length === 0) return;
  const [partnerA, partnerB] = partner;
  const userIds = userIdsFuerBetrifft(todo.betrifft, partnerA, partnerB);

  // Schon (länger) vergangene Erinnerungen gar nicht erst anlegen — sonst
  // feuert ein frisches Todo mit "1 Woche vorher" sofort.
  const untergrenze = Date.now() - ERINNERUNG_NACHLAUF_MS;
  const jobs = todo.erinnerungen
    .map((erinnerung) => erinnerungFaelligAm(faelligkeit, true, erinnerung.minutenVorher))
    .filter((dueAt) => dueAt.getTime() >= untergrenze)
    .flatMap((dueAt) => userIds.map((userId) => ({ todoId: todo.id, userId, dueAt })));

  if (jobs.length > 0) {
    await prisma.todoReminderJob.createMany({ data: jobs, skipDuplicates: true });
  }
}

/** Vollständiger Lauf — wie materialisiereAlle: künftige offene Jobs neu berechnen, überfällige stehen lassen. */
export async function materialisiereAlleTodos(): Promise<void> {
  await prisma.todoReminderJob.deleteMany({ where: { sentAt: null, dueAt: { gt: new Date() } } });
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
