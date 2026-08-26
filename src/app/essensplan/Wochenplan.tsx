"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addTage, tagSchluesselISO } from "@/lib/essensplan-shared";

type Mahlzeit = { id: string; datum: Date | string; titel: string; zutaten: string };

const WOCHENTAGE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

export function Wochenplan({ montag, mahlzeiten }: { montag: string; mahlzeiten: Mahlzeit[] }) {
  const router = useRouter();
  const [offenerTag, setOffenerTag] = useState<string | null>(null);

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
        return (
          <li key={tagISO} className="rounded border border-gray-200 p-2 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{name}</span>
              <button
                onClick={() => setOffenerTag(offenerTag === tagISO ? null : tagISO)}
                className="text-sm text-gray-500 hover:underline"
              >
                + Mahlzeit
              </button>
            </div>
            {tagMahlzeiten.map((m) => (
              <div key={m.id} className="mt-1 flex items-start justify-between gap-2 text-sm">
                <span>{m.titel}</span>
                <button onClick={() => loeschen(m.id)} className="text-xs text-gray-400 hover:text-red-600">
                  entfernen
                </button>
              </div>
            ))}
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
        className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-transparent"
      />
      <textarea
        placeholder="Zutaten, eine pro Zeile"
        value={zutaten}
        onChange={(e) => setZutaten(e.target.value)}
        rows={3}
        className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-transparent"
      />
      <button
        type="submit"
        disabled={busy}
        className="self-start rounded-full bg-[#ff1dce] px-3 py-1 text-sm text-white hover:bg-[#e619b8] disabled:opacity-50"
      >
        {busy ? "…" : "Speichern"}
      </button>
    </form>
  );
}
