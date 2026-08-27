import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppShell } from "../AppShell";
import { TodoListe } from "./TodoListe";

export const dynamic = "force-dynamic";

export default async function TodosPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const [todos, users] = await Promise.all([
    prisma.todo.findMany({
      include: { erinnerungen: true },
      orderBy: [{ erledigt: "asc" }, { prioritaet: "desc" }, { faelligkeit: "asc" }, { createdAt: "asc" }],
    }),
    prisma.user.findMany({ orderBy: { createdAt: "asc" }, take: 2, select: { name: true } }),
  ]);

  return (
    <AppShell title="Todos">
      <TodoListe initial={todos} partnerAName={users[0]?.name ?? "Person 1"} partnerBName={users[1]?.name ?? "Person 2"} />
    </AppShell>
  );
}
