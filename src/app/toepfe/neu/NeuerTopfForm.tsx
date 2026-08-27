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
      <label className="field">
        <span className="field-label">Name</span>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={50}
        />
      </label>

      <div className="field">
        <span className="field-label">Typ</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTyp("VERBRAUCH")}
            className={`chip ${typ === "VERBRAUCH" ? "chip-active" : ""}`}
          >
            Verbrauch
          </button>
          <button
            type="button"
            onClick={() => setTyp("SPARZIEL")}
            className={`chip ${typ === "SPARZIEL" ? "chip-active" : ""}`}
          >
            Sparziel
          </button>
        </div>
      </div>

      {typ === "SPARZIEL" && (
        <>
          <label className="field">
            <span className="field-label">Zielbetrag (optional)</span>
            <input
              inputMode="decimal"
              placeholder="0,00"
              className="input"
              value={zielBetrag}
              onChange={(e) => setZielBetrag(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">Zieldatum (optional)</span>
            <input
              type="date"
              className="input"
              value={zielDatum}
              onChange={(e) => setZielDatum(e.target.value)}
            />
          </label>
        </>
      )}

      <div className="field">
        <span className="field-label">Farbe</span>
        <div className="flex flex-wrap gap-2">
          {FARBEN.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFarbe(f)}
              aria-label={f}
              className="h-8 w-8 rounded-full ring-offset-2 ring-offset-background transition-shadow"
              style={{ backgroundColor: f, boxShadow: farbe === f ? "0 0 0 2px var(--background), 0 0 0 4px currentColor" : "none" }}
            />
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary">
        {busy ? "…" : "Anlegen"}
      </button>
    </form>
  );
}
