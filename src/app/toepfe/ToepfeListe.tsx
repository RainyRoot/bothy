"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { TopfMitStand } from "@/lib/toepfe-shared";
import { monatsrateCent } from "@/lib/toepfe-shared";
import { formatCent, parseEuroToCent } from "@/lib/money";
import { IconPlus } from "../icons";

const POLL_INTERVAL_MS = 10_000;

export function ToepfeListe({ initial }: { initial: TopfMitStand[] }) {
  const [toepfe, setToepfe] = useState<TopfMitStand[]>(initial);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/toepfe");
        if (res.ok) setToepfe(await res.json());
      } catch {
        // nächster Poll versucht's wieder
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  if (toepfe.length === 0) {
    return (
      <div className="card text-center text-sm text-muted">
        Noch keine Töpfe angelegt.
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {toepfe.map((topf) => (
        <TopfCard key={topf.id} topf={topf} onBooked={(t) => setToepfe((prev) => prev.map((p) => (p.id === t.id ? t : p)))} />
      ))}
    </ul>
  );
}

function TopfCard({ topf, onBooked }: { topf: TopfMitStand; onBooked: (t: TopfMitStand) => void }) {
  const [open, setOpen] = useState(false);
  const [betrag, setBetrag] = useState("");
  const [ausgabe, setAusgabe] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const zielCent = topf.zielCent;
  const progress = zielCent ? Math.min(100, Math.max(0, (topf.standCent / zielCent) * 100)) : null;
  const rate =
    zielCent && topf.zielDatum ? monatsrateCent(zielCent, topf.standCent, new Date(topf.zielDatum)) : null;

  async function submitBuchung(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const cent = parseEuroToCent(betrag);
      const betragCent = ausgabe ? -Math.abs(cent) : Math.abs(cent);
      setBusy(true);
      const res = await fetch(`/api/toepfe/${topf.id}/buchungen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ betragCent }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Buchung fehlgeschlagen");
      }
      onBooked({ ...topf, standCent: topf.standCent + betragCent });
      setBetrag("");
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="card">
      <div className="flex items-center gap-2.5">
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: topf.farbe }} />
        <Link href={`/toepfe/${topf.id}`} className="flex-1 font-medium hover:underline">
          {topf.name}
        </Link>
        <span className="tabular-nums font-medium">{formatCent(topf.standCent)}</span>
      </div>

      {progress !== null && (
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-hover">
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{ width: `${progress}%`, backgroundColor: topf.farbe }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted">
            Ziel {formatCent(zielCent!)}, Rest {formatCent(Math.max(zielCent! - topf.standCent, 0))}
            {rate !== null && rate > 0 && <> — {formatCent(rate)}/Monat nötig</>}
          </p>
        </div>
      )}

      {!open ? (
        <button
          onClick={() => {
            setOpen(true);
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
          className="btn-ghost -ml-3 mt-2"
        >
          <IconPlus className="h-3.5 w-3.5" /> Buchung
        </button>
      ) : (
        <form onSubmit={submitBuchung} className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAusgabe((a) => !a)}
            className="btn-secondary btn-sm !rounded-lg px-2.5"
            aria-label="Vorzeichen wechseln"
          >
            {ausgabe ? "−" : "+"}
          </button>
          <input
            ref={inputRef}
            inputMode="decimal"
            placeholder="0,00"
            value={betrag}
            onChange={(e) => setBetrag(e.target.value)}
            className="input !rounded-lg w-24 !py-1.5"
            required
          />
          <button type="submit" disabled={busy} className="btn-primary btn-sm">
            OK
          </button>
          <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted">
            Abbrechen
          </button>
        </form>
      )}
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </li>
  );
}
