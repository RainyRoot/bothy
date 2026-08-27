"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TopfMitStand } from "@/lib/toepfe-shared";
import { formatCent, parseEuroToCent } from "@/lib/money";

export function UmbuchenForm({ toepfe }: { toepfe: TopfMitStand[] }) {
  const router = useRouter();
  const [vonTopfId, setVonTopfId] = useState(toepfe[0]?.id ?? "");
  const [nachTopfId, setNachTopfId] = useState(toepfe[1]?.id ?? toepfe[0]?.id ?? "");
  const [betrag, setBetrag] = useState("");
  const [notiz, setNotiz] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const betragCent = parseEuroToCent(betrag);
      const res = await fetch("/api/toepfe/umbuchen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vonTopfId, nachTopfId, betragCent, notiz: notiz || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Umbuchung fehlgeschlagen");

      router.push("/toepfe");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

  if (toepfe.length < 2) {
    return <p className="text-sm text-muted">Für eine Umbuchung braucht es mindestens zwei Töpfe.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="field">
        <span className="field-label">Von</span>
        <select className="input" value={vonTopfId} onChange={(e) => setVonTopfId(e.target.value)}>
          {toepfe.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({formatCent(t.standCent)})
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field-label">Nach</span>
        <select className="input" value={nachTopfId} onChange={(e) => setNachTopfId(e.target.value)}>
          {toepfe.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({formatCent(t.standCent)})
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field-label">Betrag</span>
        <input
          inputMode="decimal"
          placeholder="0,00"
          className="input"
          value={betrag}
          onChange={(e) => setBetrag(e.target.value)}
          required
        />
      </label>

      <label className="field">
        <span className="field-label">Notiz (optional)</span>
        <input className="input" value={notiz} onChange={(e) => setNotiz(e.target.value)} />
      </label>

      {error && <p className="text-sm text-danger">{error}</p>}
      <button type="submit" disabled={busy || vonTopfId === nachTopfId} className="btn-primary">
        {busy ? "…" : "Umbuchen"}
      </button>
    </form>
  );
}
