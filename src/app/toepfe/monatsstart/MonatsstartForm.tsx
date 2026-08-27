"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { parseEuroToCent } from "@/lib/money";

type Vorschlag = { topfId: string; name: string; farbe: string; vorschlagCent: number };

export function MonatsstartForm() {
  const router = useRouter();
  const [vorschlaege, setVorschlaege] = useState<Vorschlag[] | null>(null);
  const [betraege, setBetraege] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/toepfe/monatsstart")
      .then((res) => res.json())
      .then((data: Vorschlag[]) => {
        setVorschlaege(data);
        setBetraege(
          Object.fromEntries(data.map((v) => [v.topfId, v.vorschlagCent ? (v.vorschlagCent / 100).toFixed(2) : ""])),
        );
      })
      .catch(() => setError("Vorschläge konnten nicht geladen werden"));
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const eintraege = Object.entries(betraege)
        .filter(([, wert]) => wert.trim())
        .map(([topfId, wert]) => ({ topfId, betragCent: parseEuroToCent(wert) }));

      if (eintraege.length === 0) {
        throw new Error("Mindestens ein Betrag erforderlich");
      }

      const res = await fetch("/api/toepfe/monatsstart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eintraege }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Monatsstart fehlgeschlagen");

      router.push("/toepfe");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

  if (!vorschlaege) return <p className="text-sm text-muted">Lädt…</p>;
  if (vorschlaege.length === 0) {
    return <p className="text-sm text-muted">Keine Verbrauchs-Töpfe vorhanden.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <ul className="card flex flex-col divide-y divide-border">
        {vorschlaege.map((v) => (
          <li key={v.topfId} className="flex items-center justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: v.farbe }} />
              {v.name}
            </span>
            <input
              inputMode="decimal"
              placeholder="0,00"
              className="input w-28 !py-1.5"
              value={betraege[v.topfId] ?? ""}
              onChange={(e) => setBetraege((prev) => ({ ...prev, [v.topfId]: e.target.value }))}
            />
          </li>
        ))}
      </ul>

      {error && <p className="text-sm text-danger">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary">
        {busy ? "…" : "Bestätigen"}
      </button>
    </form>
  );
}
