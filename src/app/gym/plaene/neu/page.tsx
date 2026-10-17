import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppShell } from "../../../AppShell";
import { PlanForm } from "../PlanForm";

export const dynamic = "force-dynamic";

export default async function NeuerPlanPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  const uebungen = await prisma.uebung.findMany({ where: { archiviert: false }, orderBy: { name: "asc" } });

  return (
    <AppShell title="Neuer Plan" back="/gym/plaene">
      <PlanForm uebungsNamen={uebungen.map((u) => u.name)} />
    </AppShell>
  );
}
