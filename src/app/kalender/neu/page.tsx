import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppShell } from "../../AppShell";
import { NeuerTerminForm } from "./NeuerTerminForm";

export const dynamic = "force-dynamic";

export default async function NeuerTerminPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" }, take: 2, select: { name: true } });

  return (
    <AppShell title="Neuer Termin" back="/kalender">
      <NeuerTerminForm partnerAName={users[0]?.name ?? "Person 1"} partnerBName={users[1]?.name ?? "Person 2"} />
    </AppShell>
  );
}
