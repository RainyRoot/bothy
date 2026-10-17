import { notFound, redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { toISODatum } from "@/lib/timezone";
import { AppShell } from "../../../AppShell";
import { TopfForm } from "../../TopfForm";

export const dynamic = "force-dynamic";

export default async function TopfBearbeitenPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const { id } = await params;
  const topf = await prisma.topf.findUnique({ where: { id } });
  if (!topf) notFound();

  return (
    <AppShell title="Topf bearbeiten" back={`/toepfe/${id}`}>
      <TopfForm
        topfId={id}
        initial={{
          name: topf.name,
          typ: topf.typ,
          farbe: topf.farbe,
          zielCent: topf.zielCent,
          zielDatum: topf.zielDatum ? toISODatum(topf.zielDatum) : "",
        }}
      />
    </AppShell>
  );
}
