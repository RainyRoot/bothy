"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatCent, parseEuroToCent } from "@/lib/money";
import { IconPlus } from "../icons";
import { abarbeiten, einreihen, ladeQueue, mitAusstehenden, neueTempId, type Item } from "./offline-queue";

type Liste = { id: string; woche: Date | string; items: Item[] } | null;
type Topf = { id: string; name: string };

// Wie bei den Töpfen: zwei Leute im Supermarkt sollen die Häkchen des
// anderen sehen, ohne neu zu laden
const POLL_INTERVAL_MS = 10_000;

export function EinkaufslisteClient({ woche, initial, toepfe }: { woche: string; initial: Liste; toepfe: Topf[] }) {
  const [liste, setListe] = useState(initial);
  const [erzeugeBusy, setErzeugeBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const [bearbeiteItemId, setBearbeiteItemId] = useState<string | null>(null);
  // Zählt lokale Änderungen hoch — ein Poll, der währenddessen lief, ist veraltet
  const aenderungen = useRef(0);

  const aktualisiereOffline = useCallback(() => {
    setOffline(ladeQueue().length > 0 || !navigator.onLine);
  }, []);

  const synchronisieren = useCallback(async () => {
    await abarbeiten((tempId, item) => {
      setListe((prev) =>
        prev ? { ...prev, items: prev.items.map((i) => (i.id === tempId ? { ...i, id: item.id } : i)) } : prev,
      );
      setBearbeiteItemId((id) => (id === tempId ? item.id : id));
    });
    aktualisiereOffline();
  }, [aktualisiereOffline]);

  const neuLaden = useCallback(async () => {
    const stand = aenderungen.current;
    try {
      const res = await fetch(`/api/einkaufsliste?woche=${woche}`, { cache: "no-store" });
      if (!res.ok || stand !== aenderungen.current) return;
      const frisch: Liste = await res.json();
      if (stand !== aenderungen.current) return;
      setListe(frisch ? { ...frisch, items: mitAusstehenden(frisch.id, frisch.items) } : frisch);
    } catch {
      // offline — nächster Poll versucht es wieder
    }
  }, [woche]);

  useEffect(() => {
    async function syncUndLaden() {
      await synchronisieren();
      await neuLaden();
    }
    function beiSichtbar() {
      if (document.visibilityState === "visible") void syncUndLaden();
    }

    void synchronisieren();
    aktualisiereOffline();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void syncUndLaden();
    }, POLL_INTERVAL_MS);
    window.addEventListener("online", syncUndLaden);
    window.addEventListener("offline", aktualisiereOffline);
    document.addEventListener("visibilitychange", beiSichtbar);
    return () => {
      clearInterval(interval);
      window.removeEventListener("online", syncUndLaden);
      window.removeEventListener("offline", aktualisiereOffline);
      document.removeEventListener("visibilitychange", beiSichtbar);
    };
  }, [synchronisieren, neuLaden, aktualisiereOffline]);

  /** Lokal sofort anzeigen, in die Queue legen, Synchronisierung anstoßen. */
  function aendern(aktualisierung: (items: Item[]) => Item[], op: Parameters<typeof einreihen>[0]) {
    aenderungen.current++;
    setListe((prev) => (prev ? { ...prev, items: aktualisierung(prev.items) } : prev));
    einreihen(op);
    aktualisiereOffline();
    void synchronisieren();
  }

  async function erzeugen() {
    setErzeugeBusy(true);
    try {
      // Wartende Änderungen erst loswerden — nach dem Neu-Erzeugen passen ihre IDs nicht mehr
      await synchronisieren();
      aenderungen.current++;
      const res = await fetch("/api/einkaufsliste/generieren", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // force: true — sonst liefert die Route bei bereits bestehender Liste
        // einfach die alte Liste unverändert zurück (siehe route.ts). Diese
        // Aktion soll immer wirklich neu aus dem aktuellen Essensplan bauen.
        body: JSON.stringify({ woche, force: true }),
      });
      if (res.ok) {
        const frisch = await res.json();
        setListe({ ...frisch, items: mitAusstehenden(frisch.id, frisch.items) });
      }
    } catch {
      // offline — Neu-Erzeugen geht nur mit Netz
    } finally {
      setErzeugeBusy(false);
    }
  }

  function toggle(item: Item) {
    const abgehakt = !item.abgehakt;
    aendern(
      (items) => items.map((i) => (i.id === item.id ? { ...i, abgehakt } : i)),
      { typ: "patch", itemId: item.id, data: { abgehakt } },
    );
  }

  function speichereText(item: Item, text: string) {
    setBearbeiteItemId(null);
    aendern(
      (items) => items.map((i) => (i.id === item.id ? { ...i, text } : i)),
      { typ: "patch", itemId: item.id, data: { text } },
    );
  }

  function loeschenItem(id: string) {
    aendern((items) => items.filter((i) => i.id !== id), { typ: "delete", itemId: id });
  }

  function artikelHinzufuegen(text: string) {
    if (!liste) return;
    const tempId = neueTempId();
    aendern(
      (items) => [...items, { id: tempId, text, abgehakt: false, sortierung: Number.MAX_SAFE_INTEGER }],
      { typ: "add", tempId, listeId: liste.id, text, abgehakt: false },
    );
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
          Offline — Änderungen werden gespeichert und synchronisiert, sobald wieder Netz da ist.
        </p>
      )}

      {liste.items.length === 0 ? (
        <p className="card text-center text-sm text-muted">Keine Zutaten geplant.</p>
      ) : (
        <ul className="card flex flex-col divide-y divide-border !p-0">
          {liste.items.map((item) =>
            bearbeiteItemId === item.id ? (
              <li key={item.id} className="px-3.5 py-2.5">
                <BearbeitenItemForm item={item} onSaved={speichereText} onCancel={() => setBearbeiteItemId(null)} />
              </li>
            ) : (
              <ItemRow
                key={item.id}
                item={item}
                onToggle={toggle}
                onEdit={() => setBearbeiteItemId(item.id)}
                onDelete={loeschenItem}
              />
            ),
          )}
        </ul>
      )}

      <NeuerArtikelForm onAdd={artikelHinzufuegen} />

      <button onClick={erzeugen} disabled={erzeugeBusy} className="btn-secondary self-start">
        {erzeugeBusy ? "…" : "Neu aus Essensplan erzeugen"}
      </button>
      <p className="-mt-4 text-xs text-muted">
        Übernimmt Änderungen am Essensplan. Selbst hinzugefügte oder umbenannte Artikel bleiben, Häkchen auch.
      </p>

      {toepfe.length > 0 && <EinkaufBuchen listeId={liste.id} toepfe={toepfe} />}
    </div>
  );
}

function ItemRow({
  item,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: Item;
  onToggle: (item: Item) => void;
  onEdit: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <li className="flex items-center gap-2 px-3.5 py-2.5 text-sm">
      <input type="checkbox" checked={item.abgehakt} onChange={() => onToggle(item)} className="h-4 w-4 shrink-0" />
      <button onClick={onEdit} className="min-w-0 flex-1 truncate text-left">
        <span className={item.abgehakt ? "text-muted line-through" : ""}>{item.text}</span>
      </button>
      <button onClick={() => onDelete(item.id)} className="shrink-0 text-xs text-muted hover:text-danger">
        entfernen
      </button>
    </li>
  );
}

function BearbeitenItemForm({
  item,
  onSaved,
  onCancel,
}: {
  item: Item;
  onSaved: (item: Item, text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(item.text);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (formRef.current && !formRef.current.contains(event.target as Node)) onCancel();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [onCancel]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (text.trim()) onSaved(item, text.trim());
  }

  return (
    <form ref={formRef} onSubmit={submit} className="flex items-center gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        required
        autoFocus
        className="input flex-1 !py-1.5 text-sm"
      />
      <button type="submit" className="btn-primary btn-sm shrink-0">
        Speichern
      </button>
    </form>
  );
}

function NeuerArtikelForm({ onAdd }: { onAdd: (text: string) => void }) {
  const [text, setText] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    onAdd(text.trim());
    setText("");
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        placeholder="Artikel hinzufügen…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="input flex-1"
      />
      <button type="submit" className="btn-secondary shrink-0 !px-3.5">
        <IconPlus className="h-4 w-4" />
      </button>
    </form>
  );
}

function EinkaufBuchen({ listeId, toepfe }: { listeId: string; toepfe: Topf[] }) {
  const [betrag, setBetrag] = useState("");
  const [topfId, setTopfId] = useState(
    toepfe.find((t) => t.name.toLowerCase().includes("einkauf"))?.id ?? toepfe[0].id,
  );
  const [busy, setBusy] = useState(false);
  const [zuletztGebucht, setZuletztGebucht] = useState<number | null>(null);
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
      setZuletztGebucht(betragCent);
      setBetrag("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={buchen} className="card flex flex-col gap-3">
      <p className="text-sm font-medium">Einkauf abschließen</p>
      <p className="text-xs text-muted">
        Nicht alles bekommen? Einfach mehrfach buchen — z.B. einmal für heute, noch einmal, wenn der Rest besorgt ist.
      </p>
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
      {zuletztGebucht !== null && !error && (
        <p className="text-xs text-success">{formatCent(zuletztGebucht)} gebucht.</p>
      )}
    </form>
  );
}
