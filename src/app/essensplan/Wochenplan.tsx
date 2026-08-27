"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addTage, tagSchluesselISO } from "@/lib/essensplan-shared";
import { berlinHeute } from "@/lib/timezone";
import { IconPlus } from "../icons";

type Mahlzeit = { id: string; datum: Date | string; titel: string; zutaten: string };

const WOCHENTAGE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

export function Wochenplan({ montag, mahlzeiten }: { montag: string; mahlzeiten: Mahlzeit[] }) {
  const router = useRouter();
  const [offenerTag, setOffenerTag] = useState<string | null>(null);
  const [bearbeiteId, setBearbeiteId] = useState<string | null>(null);
  const heuteISO = (() => {
    const h = berlinHeute();
    return `${h.jahr}-${String(h.monat).padStart(2, "0")}-${String(h.tag).padStart(2, "0")}`;
  })();

  const mahlzeitenProTag = new Map<string, Mahlzeit[]>();
  for (const m of mahlzeiten) {
    const schluessel = tagSchluesselISO(m.datum);
    const liste = mahlzeitenProTag.get(schluessel) ?? [];
    liste.push(m);
    mahlzeitenProTag.set(schluessel, liste);
  }

  async function loeschen(id: string) {
    await fetch(`/api/mahlzeiten/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <ul className="flex flex-col gap-2">
      {WOCHENTAGE.map((name, i) => {
        const tagISO = addTage(montag, i);
        const tagMahlzeiten = mahlzeitenProTag.get(tagISO) ?? [];
        const istHeute = tagISO === heuteISO;
        return (
          <li key={tagISO} className={`card ${istHeute ? "border-accent" : ""}`}>
            <div className="flex items-center justify-between">
              <span className={`text-sm font-medium ${istHeute ? "text-accent" : ""}`}>{name}</span>
              <button
                onClick={() => setOffenerTag(offenerTag === tagISO ? null : tagISO)}
                className="btn-ghost -mr-2 btn-sm"
              >
                <IconPlus className="h-3.5 w-3.5" /> Mahlzeit
              </button>
            </div>
            {tagMahlzeiten.map((m) =>
              bearbeiteId === m.id ? (
                <BearbeitenMahlzeitForm
                  key={m.id}
                  mahlzeit={m}
                  onSaved={() => {
                    setBearbeiteId(null);
                    router.refresh();
                  }}
                  onCancel={() => setBearbeiteId(null)}
                />
              ) : (
                <div key={m.id} className="mt-1.5 flex items-start justify-between gap-2 text-sm">
                  <button onClick={() => setBearbeiteId(m.id)} className="min-w-0 flex-1 text-left hover:underline">
                    {m.titel}
                  </button>
                  <button onClick={() => loeschen(m.id)} className="shrink-0 text-xs text-muted hover:text-danger">
                    entfernen
                  </button>
                </div>
              ),
            )}
            {offenerTag === tagISO && (
              <MahlzeitForm
                datum={tagISO}
                onDone={() => {
                  setOffenerTag(null);
                  router.refresh();
                }}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function MahlzeitForm({ datum, onDone }: { datum: string; onDone: () => void }) {
  const [titel, setTitel] = useState("");
  const [zutaten, setZutaten] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await fetch("/api/mahlzeiten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datum, titel, zutaten }),
      });
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-2 flex flex-col gap-2">
      <input
        placeholder="Titel"
        value={titel}
        onChange={(e) => setTitel(e.target.value)}
        required
        className="input !py-1.5 text-sm"
      />
      <textarea
        placeholder="Zutaten, eine pro Zeile"
        value={zutaten}
        onChange={(e) => setZutaten(e.target.value)}
        rows={3}
        className="input text-sm"
      />
      <button type="submit" disabled={busy} className="btn-primary btn-sm self-start">
        {busy ? "…" : "Speichern"}
      </button>
    </form>
  );
}

function BearbeitenMahlzeitForm({
  mahlzeit,
  onSaved,
  onCancel,
}: {
  mahlzeit: Mahlzeit;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [titel, setTitel] = useState(mahlzeit.titel);
  const [zutaten, setZutaten] = useState(mahlzeit.zutaten);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Klick/Tap außerhalb schließt wieder — gleiches Muster wie beim Todo-Bearbeiten.
  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (formRef.current && !formRef.current.contains(event.target as Node)) onCancel();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [onCancel]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await fetch(`/api/mahlzeiten/${mahlzeit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titel, zutaten }),
      });
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={submit} className="mt-2 flex flex-col gap-2">
      <input
        value={titel}
        onChange={(e) => setTitel(e.target.value)}
        required
        maxLength={100}
        autoFocus
        className="input !py-1.5 text-sm"
      />
      <textarea
        placeholder="Zutaten, eine pro Zeile"
        value={zutaten}
        onChange={(e) => setZutaten(e.target.value)}
        rows={3}
        className="input text-sm"
      />
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="btn-primary btn-sm">
          {busy ? "…" : "Speichern"}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-muted">
          Abbrechen
        </button>
      </div>
    </form>
  );
}
