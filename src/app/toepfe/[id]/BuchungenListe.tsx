"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatBerlinDatum, toISODatum } from "@/lib/timezone";
import { formatCent, parseEuroToCent } from "@/lib/money";

export type BuchungZeile = {
  id: string;
  betragCent: number;
  datum: string; // ISO, @db.Date
  notiz: string | null;
  vonName: string;
  /** Bei Umbuchungen: Name des anderen Topfs */
  gegenTopf: string | null;
};

export function BuchungenListe({ buchungen }: { buchungen: BuchungZeile[] }) {
  const [bearbeiteId, setBearbeiteId] = useState<string | null>(null);

  if (buchungen.length === 0) {
    return <p className="text-sm text-muted">Noch keine Buchungen.</p>;
  }

  return (
    <ul className="flex flex-col">
      {buchungen.map((b) =>
        bearbeiteId === b.id ? (
          <li key={b.id} className="border-b border-border py-3 last:border-0">
            <BuchungBearbeiten buchung={b} onFertig={() => setBearbeiteId(null)} />
          </li>
        ) : (
          <li key={b.id} className="border-b border-border last:border-0">
            <button
              onClick={() => setBearbeiteId(b.id)}
              className="flex w-full items-center justify-between gap-3 py-2 text-left text-sm"
            >
              <span className="min-w-0 truncate text-muted">
                {formatBerlinDatum(new Date(b.datum))} — {b.vonName}
                {b.gegenTopf && <> · Umbuchung {b.betragCent < 0 ? "nach" : "von"} {b.gegenTopf}</>}
                {b.notiz && <> · {b.notiz}</>}
              </span>
              <span className={`shrink-0 tabular-nums font-medium ${b.betragCent < 0 ? "text-danger" : "text-success"}`}>
                {formatCent(b.betragCent)}
              </span>
            </button>
          </li>
        ),
      )}
    </ul>
  );
}

function BuchungBearbeiten({ buchung, onFertig }: { buchung: BuchungZeile; onFertig: () => void }) {
  const router = useRouter();
  const istUmbuchung = buchung.gegenTopf !== null;
  const [ausgabe, setAusgabe] = useState(buchung.betragCent < 0);
  const [betrag, setBetrag] = useState(formatCent(Math.abs(buchung.betragCent)).replace(/[^\d,]/g, ""));
  const [datum, setDatum] = useState(toISODatum(new Date(buchung.datum)));
  const [notiz, setNotiz] = useState(buchung.notiz ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (formRef.current && !formRef.current.contains(event.target as Node)) onFertig();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [onFertig]);

  async function speichern(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const cent = Math.abs(parseEuroToCent(betrag));
      if (cent === 0) throw new Error("Betrag fehlt");
      setBusy(true);
      const res = await fetch(`/api/buchungen/${buchung.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ betragCent: ausgabe ? -cent : cent, datum, notiz }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Speichern fehlgeschlagen");
      onFertig();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function loeschen() {
    const frage = istUmbuchung
      ? `Umbuchung löschen? Das entfernt auch die Gegenbuchung bei ${buchung.gegenTopf}.`
      : "Buchung löschen?";
    if (!confirm(frage)) return;
    setBusy(true);
    try {
      await fetch(`/api/buchungen/${buchung.id}`, { method: "DELETE" });
      onFertig();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={speichern} className="flex flex-col gap-2.5 text-sm">
      <div className="flex items-center gap-2">
        {/* Bei Umbuchungen liegt die Richtung fest — nur die Höhe ist änderbar */}
        {!istUmbuchung && (
          <button
            type="button"
            onClick={() => setAusgabe((a) => !a)}
            className="btn-secondary btn-sm !rounded-lg px-2.5"
            aria-label="Vorzeichen wechseln"
          >
            {ausgabe ? "−" : "+"}
          </button>
        )}
        <input
          inputMode="decimal"
          value={betrag}
          onChange={(e) => setBetrag(e.target.value)}
          required
          autoFocus
          className="input !rounded-lg w-24 !py-1.5"
        />
        <input
          type="date"
          value={datum}
          onChange={(e) => setDatum(e.target.value)}
          required
          className="input !rounded-lg flex-1 !py-1.5"
        />
      </div>
      <input
        placeholder="Notiz"
        value={notiz}
        onChange={(e) => setNotiz(e.target.value)}
        className="input !rounded-lg !py-1.5"
      />
      {istUmbuchung && <p className="text-xs text-muted">Umbuchung — Änderungen gelten auch für {buchung.gegenTopf}.</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex items-center gap-2">
        <button type="submit" disabled={busy} className="btn-primary btn-sm">
          Speichern
        </button>
        <button type="button" onClick={loeschen} disabled={busy} className="btn-danger-ghost">
          Löschen
        </button>
      </div>
    </form>
  );
}
