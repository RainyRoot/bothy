import { notFound, redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppShell } from "../../../AppShell";
import { PlanForm } from "../PlanForm";

export const dynamic = "force-dynamic";

export default async function PlanBearbeitenPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const { id } = await params;
  const [plan, uebungen] = await Promise.all([
    prisma.trainingsplan.findUnique({
      where: { id },
      include: { uebungen: { orderBy: { sortierung: "asc" }, include: { uebung: { select: { name: true } } } } },
    }),
    prisma.uebung.findMany({ where: { archiviert: false }, orderBy: { name: "asc" } }),
  ]);
  if (!plan) notFound();

  return (
    <AppShell title="Plan bearbeiten" back="/gym/plaene">
      <PlanForm
        planId={plan.id}
        archiviert={plan.archiviert}
        uebungsNamen={uebungen.map((u) => u.name)}
        initial={{
          name: plan.name,
          uebungen: plan.uebungen.map((u) => ({
            uebungName: u.uebung.name,
            zielSaetze: u.zielSaetze,
            zielWdh: u.zielWdh,
          })),
        }}
      />
    </AppShell>
  );
}
