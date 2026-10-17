"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ZuruecksetzenForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [neuesPasswort, setNeuesPasswort] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/passwort-zuruecksetzen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, inviteCode, neuesPasswort }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Zurücksetzen fehlgeschlagen");
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="field">
        <span className="field-label">Name</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label className="field">
        <span className="field-label">Invite-Code</span>
        <input className="input" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} required />
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
      {error && <p className="text-sm text-danger">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? "…" : "Neues Passwort setzen"}
      </button>
    </form>
  );
}
