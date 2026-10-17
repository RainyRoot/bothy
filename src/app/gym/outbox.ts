// Outbox fürs Training (PLAN.md 4.5: "Offline ist Pflicht"). Anders als bei
// der Einkaufsliste entstehen hier offline *neue* Datensätze — Training,
// Sätze, sogar Übungen. Alle tragen eine Client-UUID, die API speichert per
// Upsert, also darf jede Op beliebig oft gesendet werden.
//
// Zwei Ops können eine andere ID zurückbekommen als gesendet: "training"
// (am selben Tag lief schon eins → beitreten) und "uebung" (Name gab es
// schon). Dann werden alle wartenden Ops auf die echte ID umgestellt.

export type SatzOp = {
  typ: "satz";
  id: string;
  trainingId: string;
  uebungId: string;
  gewichtGramm: number;
  wiederholungen: number;
  createdAt: string;
};

type OpDaten =
  | { typ: "uebung"; id: string; name: string }
  | { typ: "training"; id: string; planId: string | null; datum: string; gestartetAt: string }
  | SatzOp
  | { typ: "satzLoeschen"; id: string }
  | { typ: "beenden"; trainingId: string };

export type Op = OpDaten & { opId: string };

const KEY = "bothy_gym_outbox";
// Vom Server abgelehnte Ops. Anders als bei der Einkaufsliste wird hier
// nichts still verworfen — Trainingsdaten sind nicht wiederherstellbar.
const FEHL_KEY = "bothy_gym_fehlgeschlagen";

export type Fehlgeschlagen = { op: Op; fehler: string };

export function ladeOutbox(): Op[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function speichere(q: Op[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(q));
  } catch {
    // localStorage nicht verfügbar — dann geht nur online
  }
}

export function ladeFehlgeschlagen(): Fehlgeschlagen[] {
  try {
    return JSON.parse(localStorage.getItem(FEHL_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function speichereFehlgeschlagen(liste: Fehlgeschlagen[]) {
  try {
    localStorage.setItem(FEHL_KEY, JSON.stringify(liste));
  } catch {
    // ohne localStorage gibt es auch keine Outbox
  }
}

/** Alle abgelehnten Ops zurück an den Anfang der Outbox, in ursprünglicher Reihenfolge (Übung vor ihren Sätzen). */
export function erneutVersuchen(): void {
  const fehl = ladeFehlgeschlagen();
  if (fehl.length === 0) return;
  speichere([...fehl.map((f) => f.op), ...ladeOutbox()]);
  speichereFehlgeschlagen([]);
}

export function fehlgeschlageneVerwerfen(): void {
  speichereFehlgeschlagen([]);
}

export function neueId(): string {
  return crypto.randomUUID();
}

export function einreihen(op: OpDaten): void {
  speichere([...ladeOutbox(), { ...op, opId: neueId() }]);
}

/** Wartende Sätze (noch nicht oder in geänderter Fassung nicht beim Server) und wartende Löschungen. */
export function ausstehend(): { saetze: Map<string, SatzOp>; geloescht: Set<string> } {
  const saetze = new Map<string, SatzOp>();
  const geloescht = new Set<string>();
  for (const op of [...ladeFehlgeschlagen().map((f) => f.op), ...ladeOutbox()]) {
    if (op.typ === "satz") saetze.set(op.id, op);
    if (op.typ === "satzLoeschen") {
      saetze.delete(op.id);
      geloescht.add(op.id);
    }
  }
  return { saetze, geloescht };
}

export type Rueckmeldungen = {
  idGeaendert: (art: "training" | "uebung", alt: string, neu: string) => void;
  rekord: (satzId: string) => void;
};

type Ergebnis =
  | { status: "ok"; json: Record<string, unknown> | null }
  | { status: "abgelehnt"; fehler: string }
  | { status: "spaeter" };

async function sende(op: Op): Promise<Ergebnis> {
  const json = (body: unknown) => ({
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  try {
    const res =
      op.typ === "uebung"
        ? await fetch("/api/uebungen", { method: "POST", ...json({ id: op.id, name: op.name }) })
        : op.typ === "training"
          ? await fetch("/api/training", {
              method: "POST",
              ...json({ id: op.id, planId: op.planId, datum: op.datum, gestartetAt: op.gestartetAt }),
            })
          : op.typ === "satz"
            ? await fetch(`/api/saetze/${op.id}`, {
                method: "PUT",
                ...json({
                  trainingId: op.trainingId,
                  uebungId: op.uebungId,
                  gewichtGramm: op.gewichtGramm,
                  wiederholungen: op.wiederholungen,
                  createdAt: op.createdAt,
                }),
              })
            : op.typ === "satzLoeschen"
              ? await fetch(`/api/saetze/${op.id}`, { method: "DELETE" })
              : await fetch(`/api/training/${op.trainingId}/beenden`, { method: "POST" });

    if (res.ok) return { status: "ok", json: await res.json().catch(() => null) };
    // Abgemeldet: später nochmal, nach dem Login klappt es
    if (res.status === 401) return { status: "spaeter" };
    // Andere 4xx werden durch Wiederholen nicht besser — beiseitelegen statt
    // die Outbox für immer zu blockieren, aber sichtbar (ladeFehlgeschlagen)
    if (res.status >= 400 && res.status < 500) {
      const json = await res.json().catch(() => null);
      return { status: "abgelehnt", fehler: typeof json?.error === "string" ? json.error : `HTTP ${res.status}` };
    }
    return { status: "spaeter" };
  } catch {
    return { status: "spaeter" };
  }
}

function stelleUm(art: "training" | "uebung", alt: string, neu: string) {
  speichere(
    ladeOutbox().map((o) => {
      if (art === "training" && (o.typ === "satz" || o.typ === "beenden") && o.trainingId === alt) {
        return { ...o, trainingId: neu };
      }
      if (art === "uebung" && o.typ === "satz" && o.uebungId === alt) return { ...o, uebungId: neu };
      return o;
    }),
  );
}

let laufend: Promise<void> | null = null;

/** Arbeitet die Outbox der Reihe nach ab; beim ersten Netzfehler wird angehalten (Reihenfolge bleibt). */
export function abarbeiten(rueck: Rueckmeldungen): Promise<void> {
  if (laufend) return laufend;
  laufend = (async () => {
    try {
      while (true) {
        const [op] = ladeOutbox();
        if (!op) return;
        const ergebnis = await sende(op);
        if (ergebnis.status === "spaeter") return;
        speichere(ladeOutbox().filter((o) => o.opId !== op.opId));
        if (ergebnis.status === "abgelehnt") {
          speichereFehlgeschlagen([...ladeFehlgeschlagen(), { op, fehler: ergebnis.fehler }]);
          continue;
        }

        const antwortId = typeof ergebnis.json?.id === "string" ? ergebnis.json.id : null;
        if ((op.typ === "training" || op.typ === "uebung") && antwortId && antwortId !== op.id) {
          stelleUm(op.typ, op.id, antwortId);
          rueck.idGeaendert(op.typ, op.id, antwortId);
        }
        if (op.typ === "satz" && ergebnis.json?.rekord === true) rueck.rekord(op.id);
      }
    } finally {
      laufend = null;
    }
  })();
  return laufend;
}
