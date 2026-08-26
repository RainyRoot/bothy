"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseEuroToCent } from "@/lib/money";

const FARBEN = ["#e11d48", "#ea580c", "#ca8a04", "#16a34a", "#0891b2", "#2563eb", "#7c3aed", "#db2777"];

export function NeuerTopfForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [typ, setTyp] = useState<"VERBRAUCH" | "SPARZIEL">("VERBRAUCH");
  const [farbe, setFarbe] = useState(FARBEN[0]);
  const [zielBetrag, setZielBetrag] = useState("");
  const [zielDatum, setZielDatum] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const body: Record<string, unknown> = { name, typ, farbe };
      if (typ === "SPARZIEL") {
        if (zielBetrag) body.zielCent = parseEuroToCent(zielBetrag);
        if (zielDatum) body.zielDatum = zielDatum;
      }
      const res = await fetch("/api/toepfe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Fehler beim Anlegen");

      router.push("/toepfe");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Name
        <input
          className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-transparent"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={50}
        />
      </label>

      <div className="flex flex-col gap-1 text-sm">
        Typ
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTyp("VERBRAUCH")}
            className={`rounded border px-3 py-2 text-sm ${typ === "VERBRAUCH" ? "border-foreground" : "border-gray-300 dark:border-gray-700"}`}
          >
            Verbrauch
          </button>
          <button
            type="button"
            onClick={() => setTyp("SPARZIEL")}
            className={`rounded border px-3 py-2 text-sm ${typ === "SPARZIEL" ? "border-foreground" : "border-gray-300 dark:border-gray-700"}`}
          >
            Sparziel
          </button>
        </div>
      </div>

      {typ === "SPARZIEL" && (
        <>
          <label className="flex flex-col gap-1 text-sm">
            Zielbetrag (optional)
            <input
              inputMode="decimal"
              placeholder="0,00"
              className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-transparent"
              value={zielBetrag}
              onChange={(e) => setZielBetrag(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Zieldatum (optional)
            <input
              type="date"
              className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-transparent"
              value={zielDatum}
              onChange={(e) => setZielDatum(e.target.value)}
            />
          </label>
        </>
      )}

      <div className="flex flex-col gap-1 text-sm">
        Farbe
        <div className="flex gap-2">
          {FARBEN.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFarbe(f)}
              aria-label={f}
              className="h-7 w-7 rounded-full"
              style={{ backgroundColor: f, outline: farbe === f ? "2px solid currentColor" : "none" }}
            />
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
      >
        {busy ? "…" : "Anlegen"}
      </button>
    </form>
  );
}
