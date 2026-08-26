"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes;
}

type Status = "unsupported" | "checking" | "off" | "on";

export function PushSetup() {
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setStatus(subscription ? "on" : "off"))
      .catch(() => setStatus("off"));
  }, []);

  async function enablePush() {
    setError(null);
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Benachrichtigungen wurden nicht erlaubt");
      }

      const registration = await navigator.serviceWorker.ready;
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("VAPID-Key fehlt");

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!res.ok) throw new Error("Subscription konnte nicht gespeichert werden");

      setStatus("on");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setError(null);
    setTestMessage(null);
    setBusy(true);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Fehler beim Planen");
      setTestMessage("Kommt in 2 Minuten — App ruhig schließen.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

  if (status === "unsupported") {
    return <p className="text-sm text-gray-500">Push wird auf diesem Gerät nicht unterstützt.</p>;
  }
  if (status === "checking") {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {status === "off" && (
        <button
          onClick={enablePush}
          disabled={busy}
          className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          Push aktivieren
        </button>
      )}
      {status === "on" && (
        <button
          onClick={sendTest}
          disabled={busy}
          className="rounded border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
        >
          Test-Benachrichtigung in 2 Minuten
        </button>
      )}
      {testMessage && <p className="text-sm text-gray-500">{testMessage}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
