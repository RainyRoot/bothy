import { notFound, redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { toISODatum, berlinWallParts } from "@/lib/timezone";
import { BearbeitenForm } from "./BearbeitenForm";
import { TerminAktionen } from "./TerminAktionen";
import type { TerminFormWerte } from "../TerminForm";

export const dynamic = "force-dynamic";

export default async function TerminDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const { id } = await params;
  const [termin, users] = await Promise.all([
    prisma.termin.findUnique({ where: { id }, include: { erinnerungen: true } }),
    prisma.user.findMany({ orderBy: { createdAt: "asc" }, take: 2, select: { name: true } }),
  ]);
  if (!termin) notFound();

  const startTeile = termin.ganztags ? { datum: toISODatum(termin.start), zeit: "" } : berlinWallParts(termin.start);
  const endeTeile = termin.ende
    ? termin.ganztags
      ? { datum: toISODatum(termin.ende), zeit: "" }
      : berlinWallParts(termin.ende)
    : { datum: "", zeit: "" };

  const initial: TerminFormWerte = {
    titel: termin.titel,
    ganztags: termin.ganztags,
    datumStart: startTeile.datum,
    zeitStart: startTeile.zeit,
    datumEnde: endeTeile.datum,
    zeitEnde: endeTeile.zeit,
    ort: termin.ort ?? "",
    notiz: termin.notiz ?? "",
    farbe: termin.farbe ?? "#6b7280",
    betrifft: termin.betrifft,
    rhythmus: termin.rhythmus,
    serienEnde: termin.serienEnde ? toISODatum(termin.serienEnde) : "",
    erinnerungen: termin.erinnerungen.map((e) => e.minutenVorher),
  };

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Termin bearbeiten</h1>
      <BearbeitenForm
        terminId={termin.id}
        initial={initial}
        partnerAName={users[0]?.name ?? "Person 1"}
        partnerBName={users[1]?.name ?? "Person 2"}
      />
      <TerminAktionen terminId={termin.id} istSerie={termin.rhythmus !== "KEINE"} />
    </main>
  );
}
