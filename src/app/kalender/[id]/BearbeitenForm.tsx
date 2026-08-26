"use client";

import { useRouter } from "next/navigation";
import { TerminForm, type TerminFormWerte } from "../TerminForm";

export function BearbeitenForm({
  terminId,
  initial,
  partnerAName,
  partnerBName,
}: {
  terminId: string;
  initial: TerminFormWerte;
  partnerAName: string;
  partnerBName: string;
}) {
  const router = useRouter();

  async function handleSubmit(werte: TerminFormWerte) {
    const res = await fetch(`/api/termine/${terminId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...werte,
        serienEnde: werte.rhythmus !== "KEINE" && werte.serienEnde ? werte.serienEnde : null,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Termin konnte nicht gespeichert werden");

    router.push("/kalender");
    router.refresh();
  }

  return (
    <TerminForm
      initial={initial}
      partnerAName={partnerAName}
      partnerBName={partnerBName}
      onSubmit={handleSubmit}
      submitLabel="Speichern"
    />
  );
}
