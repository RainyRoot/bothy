"use client";

import { useState } from "react";

export function PasswortForm() {
  const [altesPasswort, setAltesPasswort] = useState("");
  const [neuesPasswort, setNeuesPasswort] = useState("");
  const [busy, setBusy] = useState(false);
  const [meldung, setMeldung] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMeldung(null);
    setBusy(true);
    try {
      const res = await fetch("/api/konto/passwort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ altesPasswort, neuesPasswort }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Ändern fehlgeschlagen");
      setAltesPasswort("");
      setNeuesPasswort("");
      setMeldung({ ok: true, text: "Passwort geändert." });
    } catch (err) {
      setMeldung({ ok: false, text: err instanceof Error ? err.message : "Unbekannter Fehler" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label className="field">
        <span className="field-label">Aktuelles Passwort</span>
        <input
          type="password"
          autoComplete="current-password"
          className="input"
          value={altesPasswort}
          onChange={(e) => setAltesPasswort(e.target.value)}
          required
        />
      </label>
      <label className="field">
        <span className="field-label">Neues Passwort (mind. 8 Zeichen)</span>
        <input
          type="password"
          autoComplete="new-password"
          minLength={8}
          className="input"
          value={neuesPasswort}
          onChange={(e) => setNeuesPasswort(e.target.value)}
          required
        />
      </label>
      {meldung && <p className={`text-sm ${meldung.ok ? "text-success" : "text-danger"}`}>{meldung.text}</p>}
      <button type="submit" disabled={busy} className="btn-secondary self-start">
        {busy ? "…" : "Passwort ändern"}
      </button>
    </form>
  );
}
