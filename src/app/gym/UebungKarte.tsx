"use client";

import { useState } from "react";
import {
  GEWICHT_SCHRITT_GRAMM,
  formatSatz,
  formatSatzListe,
  grammZuKgText,
  parseKgZuGramm,
  type SatzWerte,
} from "@/lib/training-shared";
import type { SatzLokal } from "./typen";

/**
 * Vorschlag für den nächsten Satz (PLAN.md 4.5: "die Werte vom letzten Mal
 * stehen schon drin"): Satz Nr. n vom letzten Mal, sonst der eben geloggte,
 * sonst der letzte vom letzten Mal.
 */
function vorschlag(letztesMal: SatzWerte[], meine: SatzWerte[], zielWdh: number | null): { kg: string; wdh: string } {
  const basis = letztesMal[meine.length] ?? meine[meine.length - 1] ?? letztesMal[letztesMal.length - 1];
  if (!basis) return { kg: "", wdh: zielWdh ? String(zielWdh) : "" };
  return { kg: grammZuKgText(basis.gewichtGramm), wdh: String(basis.wiederholungen) };
}

function leseWerte(kg: string, wdh: string): SatzWerte {
  const gewichtGramm = parseKgZuGramm(kg);
  const wiederholungen = Number(wdh);
  if (!Number.isInteger(wiederholungen) || wiederholungen < 1 || wiederholungen > 1000) {
    throw new Error("Wiederholungen fehlen");
  }
  return { gewichtGramm, wiederholungen };
}

export function UebungKarte({
  name,
  ziel,
  letztesMal,
  rekord,
  meine,
  partnerSaetze,
  partnerName,
  onSpeichern,
  onAendern,
  onLoeschen,
}: {
  name: string;
  ziel: { zielSaetze: number; zielWdh: number | null } | null;
  letztesMal: SatzWerte[];
  rekord: SatzWerte | null;
  meine: SatzLokal[];
  partnerSaetze: SatzLokal[];
  partnerName: string | null;
  onSpeichern: (werte: SatzWerte) => void;
  onAendern: (satz: SatzLokal, werte: SatzWerte) => void;
  onLoeschen: (id: string) => void;
}) {
  const [bearbeiteId, setBearbeiteId] = useState<string | null>(null);
  const v = vorschlag(letztesMal, meine, ziel?.zielWdh ?? null);
  const zeigePartner = partnerName !== null && partnerSaetze.length > 0;

  return (
    <section className="card flex flex-col gap-3">
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-medium">{name}</h2>
          {ziel && (
            <span className="shrink-0 text-xs text-muted">
              Ziel {ziel.zielSaetze}
              {ziel.zielWdh ? `×${ziel.zielWdh}` : " Sätze"}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted">
          {letztesMal.length > 0 ? `Letztes Mal: ${formatSatzListe(letztesMal)}` : "Noch nie gemacht"}
          {rekord && <> · Rekord {formatSatz(rekord)}</>}
        </p>
      </div>

      {(meine.length > 0 || zeigePartner) && (
        <div className={`grid gap-3 text-sm ${zeigePartner ? "grid-cols-2" : "grid-cols-1"}`}>
          <ol className="flex flex-col gap-1">
            {zeigePartner && <li className="text-xs text-muted">Ich</li>}
            {meine.map((s, i) =>
              bearbeiteId === s.id ? (
                <li key={s.id}>
                  <SatzBearbeiten
                    satz={s}
                    onSpeichern={(werte) => {
                      onAendern(s, werte);
                      setBearbeiteId(null);
                    }}
                    onLoeschen={() => {
                      onLoeschen(s.id);
                      setBearbeiteId(null);
                    }}
                    onAbbrechen={() => setBearbeiteId(null)}
                  />
                </li>
              ) : (
                <li key={s.id}>
                  <button onClick={() => setBearbeiteId(s.id)} className="tabular-nums hover:underline">
                    <span className="text-muted">{i + 1}.</span> {formatSatz(s)}
                  </button>
                </li>
              ),
            )}
          </ol>
          {zeigePartner && (
            <ol className="flex flex-col gap-1 border-l border-border pl-3">
              <li className="text-xs text-muted">{partnerName}</li>
              {partnerSaetze.map((s, i) => (
                <li key={s.id} className="tabular-nums text-muted">
                  {i + 1}. {formatSatz(s)}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {/* key: nach jedem Satz frisch mit dem nächsten Vorschlag vorbelegen */}
      <SatzEingabe key={`${meine.length}-${v.kg}-${v.wdh}`} startKg={v.kg} startWdh={v.wdh} onSpeichern={onSpeichern} />
    </section>
  );
}

function Stepper({
  wert,
  onWert,
  schritt,
  label,
  inputMode,
}: {
  wert: string;
  onWert: (w: string) => void;
  schritt: (aktuell: string, richtung: 1 | -1) => string;
  label: string;
  inputMode: "decimal" | "numeric";
}) {
  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={() => onWert(schritt(wert, -1))}
        className="btn-secondary btn-sm !rounded-r-none !px-2.5"
        aria-label={`${label} weniger`}
      >
        −
      </button>
      <input
        inputMode={inputMode}
        value={wert}
        onChange={(e) => onWert(e.target.value)}
        aria-label={label}
        placeholder={inputMode === "decimal" ? "kg" : "Wdh."}
        className="input !rounded-none w-14 !px-1 !py-1.5 text-center tabular-nums"
      />
      <button
        type="button"
        onClick={() => onWert(schritt(wert, 1))}
        className="btn-secondary btn-sm !rounded-l-none !px-2.5"
        aria-label={`${label} mehr`}
      >
        +
      </button>
    </div>
  );
}

function kgSchritt(aktuell: string, richtung: 1 | -1): string {
  let gramm = 0;
  try {
    gramm = parseKgZuGramm(aktuell);
  } catch {
    // unlesbar → von 0 aus
  }
  return grammZuKgText(Math.max(0, gramm + richtung * GEWICHT_SCHRITT_GRAMM));
}

function wdhSchritt(aktuell: string, richtung: 1 | -1): string {
  const n = Number(aktuell);
  return String(Math.max(1, (Number.isInteger(n) ? n : 0) + richtung));
}

/** Ein Tap auf ✓ speichert den vorbelegten Satz — der DoD-Fall "wie letztes Mal". */
function SatzEingabe({
  startKg,
  startWdh,
  onSpeichern,
}: {
  startKg: string;
  startWdh: string;
  onSpeichern: (werte: SatzWerte) => void;
}) {
  const [kg, setKg] = useState(startKg);
  const [wdh, setWdh] = useState(startWdh);
  const [fehler, setFehler] = useState<string | null>(null);

  function speichern(event: React.FormEvent) {
    event.preventDefault();
    try {
      onSpeichern(leseWerte(kg, wdh));
    } catch (err) {
      setFehler(err instanceof Error ? err.message : "Ungültig");
    }
  }

  return (
    <form onSubmit={speichern} className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Stepper wert={kg} onWert={setKg} schritt={kgSchritt} label="Gewicht in kg" inputMode="decimal" />
        <span className="text-xs text-muted">kg</span>
        <Stepper wert={wdh} onWert={setWdh} schritt={wdhSchritt} label="Wiederholungen" inputMode="numeric" />
        <button type="submit" className="btn-primary btn-sm ml-auto !px-4" aria-label="Satz speichern">
          ✓ Satz
        </button>
      </div>
      {fehler && <p className="text-xs text-danger">{fehler}</p>}
    </form>
  );
}

function SatzBearbeiten({
  satz,
  onSpeichern,
  onLoeschen,
  onAbbrechen,
}: {
  satz: SatzLokal;
  onSpeichern: (werte: SatzWerte) => void;
  onLoeschen: () => void;
  onAbbrechen: () => void;
}) {
  const [kg, setKg] = useState(grammZuKgText(satz.gewichtGramm));
  const [wdh, setWdh] = useState(String(satz.wiederholungen));
  const [fehler, setFehler] = useState<string | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        try {
          onSpeichern(leseWerte(kg, wdh));
        } catch (err) {
          setFehler(err instanceof Error ? err.message : "Ungültig");
        }
      }}
      className="flex flex-col gap-1.5 rounded-lg bg-surface-hover p-2"
    >
      <div className="flex items-center gap-1.5">
        <input inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} aria-label="kg" className="input w-16 !py-1 text-center" />
        <span className="text-xs text-muted">×</span>
        <input inputMode="numeric" value={wdh} onChange={(e) => setWdh(e.target.value)} aria-label="Wdh." className="input w-12 !py-1 text-center" />
      </div>
      <div className="flex items-center gap-2 text-xs">
        <button type="submit" className="btn-primary btn-sm">
          OK
        </button>
        <button type="button" onClick={onLoeschen} className="text-danger">
          Löschen
        </button>
        <button type="button" onClick={onAbbrechen} className="text-muted">
          Abbrechen
        </button>
      </div>
      {fehler && <p className="text-xs text-danger">{fehler}</p>}
    </form>
  );
}
