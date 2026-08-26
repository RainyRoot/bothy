"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startAuthentication } from "@simplewebauthn/browser";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleLogin() {
    setError(null);
    setBusy(true);
    try {
      const optionsRes = await fetch("/api/login/options", { method: "POST" });
      const optionsJSON = await optionsRes.json();
      if (!optionsRes.ok) {
        throw new Error(optionsJSON.error ?? "Fehler beim Login");
      }

      const authResponse = await startAuthentication({ optionsJSON });

      const verifyRes = await fetch("/api/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: authResponse }),
      });
      const verifyJSON = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyJSON.error ?? "Anmeldung fehlgeschlagen");
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
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        onClick={handleLogin}
        disabled={busy}
        className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
      >
        {busy ? "…" : "Mit Passkey anmelden"}
      </button>
    </div>
  );
}
