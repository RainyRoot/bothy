"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function UebungAktionen({ uebungId, name, archiviert }: { uebungId: string; name: string; archiviert: boolean }) {
  const router = useRouter();
  const [neuerName, setNeuerName] = useState(name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/uebungen/${uebungId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Speichern fehlgeschlagen");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void patch({ name: neuerName });
        }}
        className="flex gap-2"
      >
        <input value={neuerName} onChange={(e) => setNeuerName(e.target.value)} className="input flex-1 !py-1.5" aria-label="Name" />
        <button type="submit" disabled={busy || neuerName.trim() === name} className="btn-secondary btn-sm shrink-0">
          Umbenennen
        </button>
      </form>
      <button onClick={() => patch({ archiviert: !archiviert })} disabled={busy} className="btn-ghost -ml-3 self-start">
        {archiviert ? "Wiederherstellen" : "Archivieren (Verlauf bleibt)"}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
