"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Zeile = { key: string; uebungName: string; zielSaetze: string; zielWdh: string };
type PlanWerte = { name: string; uebungen: { uebungName: string; zielSaetze: number; zielWdh: number | null }[] };

let zaehler = 0;
const neueZeile = (werte?: Partial<Zeile>): Zeile => ({
  key: `z${zaehler++}`,
  uebungName: "",
  zielSaetze: "3",
  zielWdh: "",
  ...werte,
});

/** Plan anlegen (ohne planId) oder bearbeiten. Übungen werden über den Namen gefunden oder neu angelegt. */
export function PlanForm({
  planId,
  archiviert,
  initial,
  uebungsNamen,
}: {
  planId?: string;
  archiviert?: boolean;
  initial?: PlanWerte;
  uebungsNamen: string[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [zeilen, setZeilen] = useState<Zeile[]>(
    initial && initial.uebungen.length > 0
      ? initial.uebungen.map((u) =>
          neueZeile({ uebungName: u.uebungName, zielSaetze: String(u.zielSaetze), zielWdh: u.zielWdh ? String(u.zielWdh) : "" }),
        )
      : [neueZeile()],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function aendereZeile(key: string, feld: keyof Zeile, wert: string) {
    setZeilen((zs) => zs.map((z) => (z.key === key ? { ...z, [feld]: wert } : z)));
  }

  function verschiebe(index: number, richtung: -1 | 1) {
    setZeilen((zs) => {
      const ziel = index + richtung;
      if (ziel < 0 || ziel >= zs.length) return zs;
      const neu = [...zs];
      [neu[index], neu[ziel]] = [neu[ziel], neu[index]];
      return neu;
    });
  }

  async function senden(body: Record<string, unknown>, method: "POST" | "PATCH") {
    const res = await fetch(planId ? `/api/trainingsplaene/${planId}` : "/api/trainingsplaene", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? "Speichern fehlgeschlagen");
  }

  async function speichern(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const uebungen = zeilen
        .filter((z) => z.uebungName.trim())
        .map((z) => ({
          uebungName: z.uebungName.trim(),
          zielSaetze: Number(z.zielSaetze) || 3,
          zielWdh: Number(z.zielWdh) || null,
        }));
      await senden({ name, uebungen }, planId ? "PATCH" : "POST");
      router.push("/gym/plaene");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function archivUmschalten() {
    setBusy(true);
    try {
      await senden({ archiviert: !archiviert }, "PATCH");
      router.push("/gym/plaene");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={speichern} className="flex flex-col gap-4">
      <label className="field">
        <span className="field-label">Name</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={50} placeholder="z.B. Push" />
      </label>

      <div className="field">
        <span className="field-label">Übungen · Sätze × Wdh. (Wdh. optional)</span>
        <datalist id="plan-uebungen">
          {uebungsNamen.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <ol className="flex flex-col gap-2">
          {zeilen.map((z, i) => (
            <li key={z.key} className="flex items-center gap-1.5">
              <input
                list="plan-uebungen"
                value={z.uebungName}
                onChange={(e) => aendereZeile(z.key, "uebungName", e.target.value)}
                placeholder="Übung"
                className="input min-w-0 flex-1 !py-1.5"
              />
              <input
                inputMode="numeric"
                value={z.zielSaetze}
                onChange={(e) => aendereZeile(z.key, "zielSaetze", e.target.value)}
                aria-label="Sätze"
                className="input w-10 !px-1 !py-1.5 text-center"
              />
              <span className="text-xs text-muted">×</span>
              <input
                inputMode="numeric"
                value={z.zielWdh}
                onChange={(e) => aendereZeile(z.key, "zielWdh", e.target.value)}
                aria-label="Wiederholungen"
                placeholder="–"
                className="input w-10 !px-1 !py-1.5 text-center"
              />
              <div className="flex flex-col">
                <button type="button" onClick={() => verschiebe(i, -1)} className="px-1 text-xs leading-none text-muted" aria-label="nach oben">
                  ▲
                </button>
                <button type="button" onClick={() => verschiebe(i, 1)} className="px-1 text-xs leading-none text-muted" aria-label="nach unten">
                  ▼
                </button>
              </div>
              <button
                type="button"
                onClick={() => setZeilen((zs) => zs.filter((x) => x.key !== z.key))}
                className="px-1 text-muted hover:text-danger"
                aria-label="Übung entfernen"
              >
                ×
              </button>
            </li>
          ))}
        </ol>
        <button type="button" onClick={() => setZeilen((zs) => [...zs, neueZeile()])} className="btn-ghost -ml-3 self-start">
          + Übung
        </button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary">
        {busy ? "…" : planId ? "Speichern" : "Anlegen"}
      </button>
      {planId && (
        <button type="button" onClick={archivUmschalten} disabled={busy} className="btn-ghost -ml-3 self-start">
          {archiviert ? "Wiederherstellen" : "Archivieren"}
        </button>
      )}
    </form>
  );
}
