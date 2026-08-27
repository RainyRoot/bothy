"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatBerlinDatum } from "@/lib/timezone";
import { IconPlus } from "../icons";

type Prioritaet = "NIEDRIG" | "NORMAL" | "HOCH";
type Betrifft = "PARTNER_A" | "PARTNER_B" | "BEIDE";

type Todo = {
  id: string;
  text: string;
  prioritaet: Prioritaet;
  erledigt: boolean;
  faelligkeit: Date | string | null;
  betrifft: Betrifft;
  erinnerungen: { id: string; minutenVorher: number }[];
};

type TodoWerte = {
  text: string;
  prioritaet: Prioritaet;
  faelligkeit: string; // "" oder "YYYY-MM-DD"
  betrifft: Betrifft;
  erinnerungen: number[];
};

const LEERE_TODO_WERTE: TodoWerte = {
  text: "",
  prioritaet: "NORMAL",
  faelligkeit: "",
  betrifft: "BEIDE",
  erinnerungen: [],
};

const PRIO_LABEL: Record<Prioritaet, string> = { NIEDRIG: "Niedrig", NORMAL: "Normal", HOCH: "Hoch" };
const PRIO_FARBE: Record<Prioritaet, string> = {
  NIEDRIG: "var(--prio-niedrig)",
  NORMAL: "var(--prio-normal)",
  HOCH: "var(--prio-hoch)",
};
const ERINNERUNGS_OPTIONEN: { minuten: number; label: string }[] = [
  { minuten: 0, label: "Am Fälligkeitstag" },
  { minuten: 1440, label: "1 Tag vorher" },
  { minuten: 2880, label: "2 Tage vorher" },
  { minuten: 4320, label: "3 Tage vorher" },
  { minuten: 10080, label: "1 Woche vorher" },
];

function toDateInputValue(d: Date | string | null): string {
  if (!d) return "";
  const iso = typeof d === "string" ? d : d.toISOString();
  return iso.slice(0, 10);
}

function todoZuWerten(todo: Todo): TodoWerte {
  return {
    text: todo.text,
    prioritaet: todo.prioritaet,
    faelligkeit: toDateInputValue(todo.faelligkeit),
    betrifft: todo.betrifft,
    erinnerungen: todo.erinnerungen.map((e) => e.minutenVorher),
  };
}

export function TodoListe({
  initial,
  partnerAName,
  partnerBName,
}: {
  initial: Todo[];
  partnerAName: string;
  partnerBName: string;
}) {
  const router = useRouter();
  const [todos, setTodos] = useState<Todo[]>(initial);
  const [bearbeiteId, setBearbeiteId] = useState<string | null>(null);

  async function toggle(todo: Todo) {
    const erledigt = !todo.erledigt;
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, erledigt } : t)));
    await fetch(`/api/todos/${todo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ erledigt }),
    });
    router.refresh();
  }

  async function loeschen(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/todos/${id}`, { method: "DELETE" });
  }

  function onCreated(todo: Todo) {
    setTodos((prev) => [...prev, todo]);
    router.refresh();
  }

  function onUpdated(todo: Todo) {
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? todo : t)));
    setBearbeiteId(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <NeuesTodoForm partnerAName={partnerAName} partnerBName={partnerBName} onCreated={onCreated} />

      {todos.length === 0 ? (
        <p className="card text-center text-sm text-muted">Noch keine Todos.</p>
      ) : (
        <ul className="card flex flex-col divide-y divide-border !p-0">
          {todos.map((todo) =>
            bearbeiteId === todo.id ? (
              <li key={todo.id} className="px-3.5 py-3">
                <BearbeitenForm
                  todo={todo}
                  partnerAName={partnerAName}
                  partnerBName={partnerBName}
                  onSaved={onUpdated}
                  onCancel={() => setBearbeiteId(null)}
                />
              </li>
            ) : (
              <TodoRow
                key={todo.id}
                todo={todo}
                onToggle={toggle}
                onDelete={loeschen}
                onEdit={() => setBearbeiteId(todo.id)}
              />
            ),
          )}
        </ul>
      )}
    </div>
  );
}

function TodoRow({
  todo,
  onToggle,
  onDelete,
  onEdit,
}: {
  todo: Todo;
  onToggle: (todo: Todo) => void;
  onDelete: (id: string) => void;
  onEdit: () => void;
}) {
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  const faelligkeitDate = todo.faelligkeit ? new Date(todo.faelligkeit) : null;
  const ueberfaellig = !todo.erledigt && faelligkeitDate !== null && faelligkeitDate < heute;

  return (
    <li className="flex items-start gap-3 px-3.5 py-3 text-sm">
      <input
        type="checkbox"
        checked={todo.erledigt}
        onChange={() => onToggle(todo)}
        className="mt-0.5 h-4 w-4 shrink-0"
      />
      <span
        className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: PRIO_FARBE[todo.prioritaet] }}
        title={`Priorität: ${PRIO_LABEL[todo.prioritaet]}`}
      />
      <button onClick={onEdit} className="min-w-0 flex-1 text-left">
        <p className={todo.erledigt ? "text-muted line-through" : ""}>{todo.text}</p>
        {faelligkeitDate && (
          <p className={`mt-0.5 text-xs ${ueberfaellig ? "text-danger" : "text-muted"}`}>
            {ueberfaellig ? "überfällig · " : ""}
            {formatBerlinDatum(faelligkeitDate)}
          </p>
        )}
      </button>
      <button onClick={() => onDelete(todo.id)} className="shrink-0 text-xs text-muted hover:text-danger">
        löschen
      </button>
    </li>
  );
}

/** Priorität/Fälligkeit/Erinnerung/Zuweisung — von Neuanlage und Bearbeiten geteilt. */
function TodoFelder({
  werte,
  set,
  partnerAName,
  partnerBName,
}: {
  werte: TodoWerte;
  set: <K extends keyof TodoWerte>(key: K, value: TodoWerte[K]) => void;
  partnerAName: string;
  partnerBName: string;
}) {
  function toggleErinnerung(minuten: number) {
    set(
      "erinnerungen",
      werte.erinnerungen.includes(minuten)
        ? werte.erinnerungen.filter((m) => m !== minuten)
        : [...werte.erinnerungen, minuten],
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(PRIO_LABEL) as Prioritaet[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => set("prioritaet", p)}
            className={`chip ${werte.prioritaet === p ? "chip-active" : ""}`}
          >
            <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ backgroundColor: PRIO_FARBE[p] }} />
            {PRIO_LABEL[p]}
          </button>
        ))}
      </div>

      <label className="field">
        <span className="field-label">Fälligkeit (optional)</span>
        <input type="date" className="input" value={werte.faelligkeit} onChange={(e) => set("faelligkeit", e.target.value)} />
      </label>

      {werte.faelligkeit && (
        <div className="field">
          <span className="field-label">Erinnerung</span>
          <div className="flex flex-col gap-1">
            {ERINNERUNGS_OPTIONEN.map((o) => (
              <label key={o.minuten} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={werte.erinnerungen.includes(o.minuten)}
                  onChange={() => toggleErinnerung(o.minuten)}
                />
                {o.label}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="field">
        <span className="field-label">Betrifft</span>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["BEIDE", "Beide"],
              ["PARTNER_A", `Nur ${partnerAName}`],
              ["PARTNER_B", `Nur ${partnerBName}`],
            ] as const
          ).map(([wert, label]) => (
            <button
              key={wert}
              type="button"
              onClick={() => set("betrifft", wert)}
              className={`chip ${werte.betrifft === wert ? "chip-active" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function NeuesTodoForm({
  partnerAName,
  partnerBName,
  onCreated,
}: {
  partnerAName: string;
  partnerBName: string;
  onCreated: (todo: Todo) => void;
}) {
  const [werte, setWerte] = useState<TodoWerte>(LEERE_TODO_WERTE);
  const [mehr, setMehr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof TodoWerte>(key: K, value: TodoWerte[K]) {
    setWerte((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: werte.text,
          prioritaet: werte.prioritaet,
          betrifft: werte.betrifft,
          faelligkeit: werte.faelligkeit || undefined,
          erinnerungen: werte.faelligkeit ? werte.erinnerungen : [],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Todo konnte nicht angelegt werden");

      onCreated(json);
      setWerte(LEERE_TODO_WERTE);
      setMehr(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="Neues Todo…"
          value={werte.text}
          onChange={(e) => set("text", e.target.value)}
          required
          maxLength={200}
        />
        <button type="submit" disabled={busy} className="btn-primary shrink-0 !px-3.5">
          <IconPlus className="h-4 w-4" />
        </button>
      </div>

      <button type="button" onClick={() => setMehr((m) => !m)} className="self-start text-xs text-muted hover:text-foreground">
        {mehr ? "Weniger" : "Priorität, Fälligkeit, Erinnerung, Zuweisung …"}
      </button>

      {mehr && (
        <div className="flex flex-col gap-3 border-t border-border pt-3">
          <TodoFelder werte={werte} set={set} partnerAName={partnerAName} partnerBName={partnerBName} />
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}

function BearbeitenForm({
  todo,
  partnerAName,
  partnerBName,
  onSaved,
  onCancel,
}: {
  todo: Todo;
  partnerAName: string;
  partnerBName: string;
  onSaved: (todo: Todo) => void;
  onCancel: () => void;
}) {
  const [werte, setWerte] = useState<TodoWerte>(todoZuWerten(todo));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof TodoWerte>(key: K, value: TodoWerte[K]) {
    setWerte((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: werte.text,
          prioritaet: werte.prioritaet,
          betrifft: werte.betrifft,
          faelligkeit: werte.faelligkeit || null,
          erinnerungen: werte.faelligkeit ? werte.erinnerungen : [],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Todo konnte nicht gespeichert werden");
      onSaved(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input
        className="input"
        value={werte.text}
        onChange={(e) => set("text", e.target.value)}
        required
        maxLength={200}
        autoFocus
      />

      <TodoFelder werte={werte} set={set} partnerAName={partnerAName} partnerBName={partnerBName} />

      {error && <p className="text-sm text-danger">{error}</p>}

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
