"use client";

import { useRouter } from "next/navigation";
import { TerminForm, LEERE_TERMIN_WERTE, type TerminFormWerte } from "../TerminForm";

export function NeuerTerminForm({ partnerAName, partnerBName }: { partnerAName: string; partnerBName: string }) {
  const router = useRouter();

  async function handleSubmit(werte: TerminFormWerte) {
    const res = await fetch("/api/termine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...werte,
        serienEnde: werte.rhythmus !== "KEINE" && werte.serienEnde ? werte.serienEnde : undefined,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Termin konnte nicht angelegt werden");

    router.push("/kalender");
    router.refresh();
  }

  return (
    <TerminForm
      initial={LEERE_TERMIN_WERTE}
      partnerAName={partnerAName}
      partnerBName={partnerBName}
      onSubmit={handleSubmit}
      submitLabel="Anlegen"
    />
  );
}
