"use client";

import { useEffect, useState } from "react";
import { formatCent, parseEuroToCent } from "@/lib/money";

type Item = { id: string; text: string; abgehakt: boolean; sortierung: number };
type Liste = { id: string; woche: Date | string; items: Item[] } | null;
type Topf = { id: string; name: string };

const PENDING_KEY = "bothy_pending_item_toggles";

function ladePending(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function speicherePending(pending: Record<string, boolean>) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    // localStorage nicht verfügbar (z.B. privater Modus) — Offline-Queue entfällt dann
  }
}

async function sendeToggle(itemId: string, abgehakt: boolean): Promise<boolean> {
  try {
    const res = await fetch(`/api/einkaufsliste/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ abgehakt }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function EinkaufslisteClient({ woche, initial, toepfe }: { woche: string; initial: Liste; toepfe: Topf[] }) {
  const [liste, setListe] = useState(initial);
  const [erzeugeBusy, setErzeugeBusy] = useState(false);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    async function flushPending() {
      const pending = ladePending();
      const ids = Object.keys(pending);
      if (ids.length === 0) return;
      for (const id of ids) {
        const ok = await sendeToggle(id, pending[id]);
        if (ok) {
          delete pending[id];
          speicherePending(pending);
        }
      }
      setOffline(Object.keys(ladePending()).length > 0);
    }

    flushPending();
    window.addEventListener("online", flushPending);
    setOffline(Object.keys(ladePending()).length > 0 || !navigator.onLine);
    return () => window.removeEventListener("online", flushPending);
  }, []);

  async function erzeugen() {
    setErzeugeBusy(true);
    try {
      const res = await fetch("/api/einkaufsliste/generieren", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ woche }),
      });
      setListe(await res.json());
    } finally {
      setErzeugeBusy(false);
    }
  }

  async function toggle(item: Item) {
    const neu = !item.abgehakt;
    setListe((prev) =>
      prev ? { ...prev, items: prev.items.map((i) => (i.id === item.id ? { ...i, abgehakt: neu } : i)) } : prev,
    );

    const ok = await sendeToggle(item.id, neu);
    if (!ok) {
      const pending = ladePending();
      pending[item.id] = neu;
      speicherePending(pending);
      setOffline(true);
    } else {
      const pending = ladePending();
      if (item.id in pending) {
        delete pending[item.id];
        speicherePending(pending);
      }
    }
  }

  if (!liste) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-gray-500">Noch keine Liste für diese Woche.</p>
        <button
          onClick={erzeugen}
          disabled={erzeugeBusy}
          className="self-start rounded-full bg-[#ff1dce] px-4 py-2 text-sm font-medium text-white hover:bg-[#e619b8] disabled:opacity-50"
        >
          {erzeugeBusy ? "…" : "Aus Essensplan erzeugen"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {offline && (
        <p className="rounded bg-yellow-100 px-3 py-2 text-xs text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          Offline — Häkchen werden gespeichert und synchronisiert, sobald wieder Netz da ist.
        </p>
      )}

      {liste.items.length === 0 ? (
        <p className="text-sm text-gray-500">Keine Zutaten geplant.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {liste.items.map((item) => (
            <li key={item.id}>
              <label className="flex items-center gap-2 rounded p-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-900">
                <input type="checkbox" checked={item.abgehakt} onChange={() => toggle(item)} />
                <span className={item.abgehakt ? "text-gray-400 line-through" : ""}>{item.text}</span>
              </label>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={erzeugen}
        disabled={erzeugeBusy}
        className="self-start text-sm text-gray-500 hover:underline disabled:opacity-50"
      >
        Neu aus Essensplan erzeugen (überschreibt Häkchen)
      </button>

      {toepfe.length > 0 && <EinkaufBuchen listeId={liste.id} toepfe={toepfe} />}
    </div>
  );
}

function EinkaufBuchen({ listeId, toepfe }: { listeId: string; toepfe: Topf[] }) {
  const [betrag, setBetrag] = useState("");
  const [topfId, setTopfId] = useState(
    toepfe.find((t) => t.name.toLowerCase().includes("einkauf"))?.id ?? toepfe[0].id,
  );
  const [busy, setBusy] = useState(false);
  const [erledigt, setErledigt] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buchen(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const betragCent = parseEuroToCent(betrag);
      const res = await fetch(`/api/einkaufsliste/${listeId}/buchen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ betragCent, topfId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Buchung fehlgeschlagen");
      setErledigt(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

  if (erledigt) {
    return <p className="text-sm text-green-600">{formatCent(parseEuroToCent(betrag))} gebucht.</p>;
  }

  return (
    <form onSubmit={buchen} className="flex flex-col gap-2 border-t border-gray-200 pt-4 dark:border-gray-800">
      <p className="text-sm font-medium">Einkauf abschließen</p>
      <div className="flex gap-2">
        <input
          inputMode="decimal"
          placeholder="0,00"
          value={betrag}
          onChange={(e) => setBetrag(e.target.value)}
          required
          className="w-28 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-transparent"
        />
        <select
          value={topfId}
          onChange={(e) => setTopfId(e.target.value)}
          className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-transparent"
        >
          {toepfe.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-[#ff1dce] px-3 py-1 text-sm text-white hover:bg-[#e619b8] disabled:opacity-50"
        >
          Buchen
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
