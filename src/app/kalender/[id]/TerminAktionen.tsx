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
    <div className="flex flex-col gap-3 border-t border-gray-200 pt-4 dark:border-gray-800">
      {istSerie && (
        <>
          <form onSubmit={aussetzen} className="flex items-center gap-2 text-sm">
            <input
              type="date"
              value={aussetzenDatum}
              onChange={(e) => setAussetzenDatum(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1 dark:border-gray-700 dark:bg-transparent"
            />
            <button
              type="submit"
              disabled={busy || !aussetzenDatum}
              className="rounded border border-gray-300 px-3 py-1 disabled:opacity-50 dark:border-gray-700"
            >
              Diesen Termin aussetzen
            </button>
          </form>
          <button
            onClick={beenden}
            disabled={busy}
            className="self-start text-sm text-gray-500 hover:underline disabled:opacity-50"
          >
            Serie ab heute beenden
          </button>
        </>
      )}
      <button
        onClick={loeschen}
        disabled={busy}
        className="self-start text-sm text-red-600 hover:underline disabled:opacity-50"
      >
        Löschen
      </button>
    </div>
  );
}
