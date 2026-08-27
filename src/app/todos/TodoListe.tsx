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

  return (
    <div className="flex flex-col gap-6">
      <NeuesTodoForm partnerAName={partnerAName} partnerBName={partnerBName} onCreated={onCreated} />

      {todos.length === 0 ? (
        <p className="card text-center text-sm text-muted">Noch keine Todos.</p>
      ) : (
        <ul className="card flex flex-col divide-y divide-border !p-0">
          {todos.map((todo) => (
            <TodoRow key={todo.id} todo={todo} onToggle={toggle} onDelete={loeschen} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TodoRow({
  todo,
  onToggle,
  onDelete,
}: {
  todo: Todo;
  onToggle: (todo: Todo) => void;
  onDelete: (id: string) => void;
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
      <div className="min-w-0 flex-1">
        <p className={todo.erledigt ? "text-muted line-through" : ""}>{todo.text}</p>
        {faelligkeitDate && (
          <p className={`mt-0.5 text-xs ${ueberfaellig ? "text-danger" : "text-muted"}`}>
            {ueberfaellig ? "überfällig · " : ""}
            {formatBerlinDatum(faelligkeitDate)}
          </p>
        )}
      </div>
      <button onClick={() => onDelete(todo.id)} className="shrink-0 text-xs text-muted hover:text-danger">
        löschen
      </button>
    </li>
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
  const [text, setText] = useState("");
  const [mehr, setMehr] = useState(false);
  const [prioritaet, setPrioritaet] = useState<Prioritaet>("NORMAL");
  const [faelligkeit, setFaelligkeit] = useState("");
  const [betrifft, setBetrifft] = useState<Betrifft>("BEIDE");
  const [erinnerungen, setErinnerungen] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleErinnerung(minuten: number) {
    setErinnerungen((prev) => (prev.includes(minuten) ? prev.filter((m) => m !== minuten) : [...prev, minuten]));
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
          text,
          prioritaet,
          betrifft,
          faelligkeit: faelligkeit || undefined,
          erinnerungen: faelligkeit ? erinnerungen : [],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Todo konnte nicht angelegt werden");

      onCreated(json);
      setText("");
      setPrioritaet("NORMAL");
      setFaelligkeit("");
      setBetrifft("BEIDE");
      setErinnerungen([]);
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
          value={text}
          onChange={(e) => setText(e.target.value)}
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
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PRIO_LABEL) as Prioritaet[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPrioritaet(p)}
                className={`chip ${prioritaet === p ? "chip-active" : ""}`}
              >
                <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ backgroundColor: PRIO_FARBE[p] }} />
                {PRIO_LABEL[p]}
              </button>
            ))}
          </div>

          <label className="field">
            <span className="field-label">Fälligkeit (optional)</span>
            <input type="date" className="input" value={faelligkeit} onChange={(e) => setFaelligkeit(e.target.value)} />
          </label>

          {faelligkeit && (
            <div className="field">
              <span className="field-label">Erinnerung</span>
              <div className="flex flex-col gap-1">
                {ERINNERUNGS_OPTIONEN.map((o) => (
                  <label key={o.minuten} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={erinnerungen.includes(o.minuten)}
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
                  onClick={() => setBetrifft(wert)}
                  className={`chip ${betrifft === wert ? "chip-active" : ""}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}
