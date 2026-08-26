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
    return <p className="text-sm text-gray-500">Für eine Umbuchung braucht es mindestens zwei Töpfe.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Von
        <select
          className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-transparent"
          value={vonTopfId}
          onChange={(e) => setVonTopfId(e.target.value)}
        >
          {toepfe.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({formatCent(t.standCent)})
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Nach
        <select
          className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-transparent"
          value={nachTopfId}
          onChange={(e) => setNachTopfId(e.target.value)}
        >
          {toepfe.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({formatCent(t.standCent)})
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Betrag
        <input
          inputMode="decimal"
          placeholder="0,00"
          className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-transparent"
          value={betrag}
          onChange={(e) => setBetrag(e.target.value)}
          required
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Notiz (optional)
        <input
          className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-transparent"
          value={notiz}
          onChange={(e) => setNotiz(e.target.value)}
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={busy || vonTopfId === nachTopfId}
        className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
      >
        {busy ? "…" : "Umbuchen"}
      </button>
    </form>
  );
}
