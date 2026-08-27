"use client";

import { useState } from "react";

const FARBEN = ["#e11d48", "#ea580c", "#ca8a04", "#16a34a", "#0891b2", "#2563eb", "#7c3aed", "#db2777"];
const ERINNERUNGS_OPTIONEN: { minuten: number; label: string }[] = [
  { minuten: 0, label: "Zum Termin" },
  { minuten: 15, label: "15 Minuten vorher" },
  { minuten: 60, label: "1 Stunde vorher" },
  { minuten: 1440, label: "1 Tag vorher" },
  { minuten: 10080, label: "1 Woche vorher" },
];

export type TerminFormWerte = {
  titel: string;
  ganztags: boolean;
  datumStart: string;
  zeitStart: string;
  datumEnde: string;
  zeitEnde: string;
  ort: string;
  notiz: string;
  farbe: string;
  betrifft: "PARTNER_A" | "PARTNER_B" | "BEIDE";
  rhythmus: "KEINE" | "WOECHENTLICH" | "MONATLICH" | "JAEHRLICH";
  serienEnde: string;
  erinnerungen: number[];
};

export const LEERE_TERMIN_WERTE: TerminFormWerte = {
  titel: "",
  ganztags: false,
  datumStart: "",
  zeitStart: "",
  datumEnde: "",
  zeitEnde: "",
  ort: "",
  notiz: "",
  farbe: FARBEN[0],
  betrifft: "BEIDE",
  rhythmus: "KEINE",
  serienEnde: "",
  erinnerungen: [],
};

export function TerminForm({
  initial,
  partnerAName,
  partnerBName,
  onSubmit,
  submitLabel,
}: {
  initial: TerminFormWerte;
  partnerAName: string;
  partnerBName: string;
  onSubmit: (werte: TerminFormWerte) => Promise<void>;
  submitLabel: string;
}) {
  const [werte, setWerte] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof TerminFormWerte>(key: K, value: TerminFormWerte[K]) {
    setWerte((prev) => ({ ...prev, [key]: value }));
  }

  function toggleErinnerung(minuten: number) {
    setWerte((prev) => ({
      ...prev,
      erinnerungen: prev.erinnerungen.includes(minuten)
        ? prev.erinnerungen.filter((m) => m !== minuten)
        : [...prev.erinnerungen, minuten],
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onSubmit(werte);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="field">
        <span className="field-label">Titel</span>
        <input
          className="input"
          value={werte.titel}
          onChange={(e) => set("titel", e.target.value)}
          required
          maxLength={100}
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={werte.ganztags} onChange={(e) => set("ganztags", e.target.checked)} />
        Ganztägig
      </label>

      <div className="flex gap-2">
        <label className="field flex-1">
          <span className="field-label">Start</span>
          <input
            type="date"
            className="input"
            value={werte.datumStart}
            onChange={(e) => set("datumStart", e.target.value)}
            required
          />
        </label>
        {!werte.ganztags && (
          <label className="field">
            <span className="field-label">Uhrzeit</span>
            <input
              type="time"
              className="input"
              value={werte.zeitStart}
              onChange={(e) => set("zeitStart", e.target.value)}
              required
            />
          </label>
        )}
      </div>

      <label className="field">
        <span className="field-label">Ort (optional)</span>
        <input className="input" value={werte.ort} onChange={(e) => set("ort", e.target.value)} />
      </label>

      <label className="field">
        <span className="field-label">Notiz (optional)</span>
        <textarea className="input" value={werte.notiz} onChange={(e) => set("notiz", e.target.value)} />
      </label>

      <div className="field">
        <span className="field-label">Betrifft</span>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["BEIDE", "Beide"],
              ["PARTNER_A", `Nur ${partnerAName}`],
              ["PARTNER_B", `Nur ${partnerBName}`],
            ] as const
          ).map(([wert, label]) => (
            <button
              key={wert}
              type="button"
              onClick={() => set("betrifft", wert)}
              className={`chip ${werte.betrifft === wert ? "chip-active" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span className="field-label">Wiederholung</span>
        <select
          className="input"
          value={werte.rhythmus}
          onChange={(e) => set("rhythmus", e.target.value as TerminFormWerte["rhythmus"])}
        >
          <option value="KEINE">Keine</option>
          <option value="WOECHENTLICH">Wöchentlich</option>
          <option value="MONATLICH">Monatlich</option>
          <option value="JAEHRLICH">Jährlich</option>
        </select>
      </label>

      <div className="field">
        <span className="field-label">Erinnerungen</span>
        <div className="card flex flex-col divide-y divide-border !p-0">
          {ERINNERUNGS_OPTIONEN.map((o) => (
            <label key={o.minuten} className="flex items-center gap-2 px-3.5 py-2.5">
              <input
                type="checkbox"
                checked={werte.erinnerungen.includes(o.minuten)}
                onChange={() => toggleErinnerung(o.minuten)}
              />
              {o.label}
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="field-label">Farbe</span>
        <div className="flex flex-wrap gap-2">
          {FARBEN.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => set("farbe", f)}
              aria-label={f}
              className="h-8 w-8 rounded-full transition-shadow"
              style={{ backgroundColor: f, boxShadow: werte.farbe === f ? "0 0 0 2px var(--background), 0 0 0 4px currentColor" : "none" }}
            />
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary">
        {busy ? "…" : submitLabel}
      </button>
    </form>
  );
}
