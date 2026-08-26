"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startRegistration } from "@simplewebauthn/browser";

export function SetupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const optionsRes = await fetch("/api/setup/register-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, inviteCode }),
      });
      const optionsJSON = await optionsRes.json();
      if (!optionsRes.ok) {
        throw new Error(optionsJSON.error ?? "Fehler beim Setup");
      }

      const registrationResponse = await startRegistration({ optionsJSON });

      const verifyRes = await fetch("/api/setup/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: registrationResponse }),
      });
      const verifyJSON = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyJSON.error ?? "Passkey konnte nicht angelegt werden");
      }

      router.push("/");
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
      <label className="flex flex-col gap-1 text-sm">
        Invite-Code
        <input
          className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-transparent"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          required
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
      >
        {busy ? "…" : "Passkey anlegen"}
      </button>
    </form>
  );
}
