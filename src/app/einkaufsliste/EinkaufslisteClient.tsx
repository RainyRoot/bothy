"use client";

import { useEffect, useState } from "react";
import { formatCent, parseEuroToCent } from "@/lib/money";
import { IconRestart } from "../icons";

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
        // force: true — sonst liefert die Route bei bereits bestehender Liste
        // einfach die alte Liste unverändert zurück (siehe route.ts). Diese
        // Aktion soll immer wirklich neu aus dem aktuellen Essensplan bauen.
        body: JSON.stringify({ woche, force: true }),
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
      <div className="card flex flex-col items-center gap-3 text-center">
        <p className="text-sm text-muted">Noch keine Liste für diese Woche.</p>
        <button onClick={erzeugen} disabled={erzeugeBusy} className="btn-primary">
          {erzeugeBusy ? "…" : "Aus Essensplan erzeugen"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {offline && (
        <p className="rounded-xl border border-accent/30 bg-accent-soft px-3.5 py-2.5 text-xs text-accent">
          Offline — Häkchen werden gespeichert und synchronisiert, sobald wieder Netz da ist.
        </p>
      )}

      {liste.items.length === 0 ? (
        <p className="card text-center text-sm text-muted">Keine Zutaten geplant.</p>
      ) : (
        <ul className="card flex flex-col divide-y divide-border !p-0">
          {liste.items.map((item) => (
            <ItemRow key={item.id} item={item} onToggle={toggle} />
          ))}
        </ul>
      )}

      <div className="flex flex-col items-start gap-1.5">
        <button onClick={erzeugen} disabled={erzeugeBusy} className="btn-secondary">
          <IconRestart className="h-4 w-4" /> {erzeugeBusy ? "…" : "Neu aus Essensplan erzeugen"}
        </button>
        <p className="text-xs text-muted">Baut die Liste komplett neu — bestehende Häkchen gehen dabei verloren.</p>
      </div>

      {toepfe.length > 0 && <EinkaufBuchen listeId={liste.id} toepfe={toepfe} />}
    </div>
  );
}

function ItemRow({ item, onToggle }: { item: Item; onToggle: (item: Item) => void }) {
  return (
    <li>
      <label className="flex items-center gap-3 px-3.5 py-3 text-sm transition-colors duration-150 hover:bg-surface-hover">
        <input type="checkbox" checked={item.abgehakt} onChange={() => onToggle(item)} className="h-4 w-4" />
        <span className={item.abgehakt ? "text-muted line-through" : ""}>{item.text}</span>
      </label>
    </li>
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
    return <p className="card text-sm text-success">{formatCent(parseEuroToCent(betrag))} gebucht.</p>;
  }

  return (
    <form onSubmit={buchen} className="card flex flex-col gap-3">
      <p className="text-sm font-medium">Einkauf abschließen</p>
      <div className="flex gap-2">
        <input
          inputMode="decimal"
          placeholder="0,00"
          value={betrag}
          onChange={(e) => setBetrag(e.target.value)}
          required
          className="input w-28 !py-1.5"
        />
        <select value={topfId} onChange={(e) => setTopfId(e.target.value)} className="input flex-1 !py-1.5">
          {toepfe.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button type="submit" disabled={busy} className="btn-primary btn-sm shrink-0">
          Buchen
        </button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </form>
  );
}
