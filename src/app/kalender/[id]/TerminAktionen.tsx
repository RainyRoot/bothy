"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TerminAktionen({ terminId, istSerie }: { terminId: string; istSerie: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [aussetzenDatum, setAussetzenDatum] = useState("");

  async function loeschen() {
    if (!confirm("Diesen Termin wirklich löschen? Das entfernt auch die Vergangenheit.")) return;
    setBusy(true);
    try {
      await fetch(`/api/termine/${terminId}`, { method: "DELETE" });
      router.push("/kalender");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function beenden() {
    if (!confirm("Serie ab heute beenden? Vergangene Termine bleiben sichtbar.")) return;
    setBusy(true);
    try {
      await fetch(`/api/termine/${terminId}/beenden`, { method: "POST" });
      router.push("/kalender");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function aussetzen(event: React.FormEvent) {
    event.preventDefault();
    if (!aussetzenDatum) return;
    setBusy(true);
    try {
      await fetch(`/api/termine/${terminId}/aussetzen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datum: aussetzenDatum }),
      });
      router.refresh();
      setAussetzenDatum("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      {istSerie && (
        <>
          <form onSubmit={aussetzen} className="flex items-center gap-2 text-sm">
            <input
              type="date"
              value={aussetzenDatum}
              onChange={(e) => setAussetzenDatum(e.target.value)}
              className="input !py-1.5"
            />
            <button type="submit" disabled={busy || !aussetzenDatum} className="btn-secondary btn-sm shrink-0">
              Aussetzen
            </button>
          </form>
          <button onClick={beenden} disabled={busy} className="btn-ghost -ml-3 self-start">
            Serie ab heute beenden
          </button>
        </>
      )}
      <button onClick={loeschen} disabled={busy} className="btn-danger-ghost self-start">
        Löschen
      </button>
    </div>
  );
}
