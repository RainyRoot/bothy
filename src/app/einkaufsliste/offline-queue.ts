// Offline-Warteschlange der Einkaufsliste (siehe PROGRESS.md-Entscheidung
// "localStorage-Queue + online-Event"). Jede Änderung — Häkchen, Umbenennen,
// Hinzufügen, Entfernen — läuft hier durch, nicht nur die Häkchen: sonst
// zeigt der Bildschirm offline eine Änderung, die nie gespeichert wird.

export type Item = { id: string; text: string; abgehakt: boolean; sortierung: number };

type OpDaten =
  | { typ: "patch"; itemId: string; data: { abgehakt?: boolean; text?: string } }
  | { typ: "delete"; itemId: string }
  | { typ: "add"; tempId: string; listeId: string; text: string; abgehakt: boolean };

export type Op = OpDaten & { opId: string };

const QUEUE_KEY = "bothy_einkauf_queue";
// Vorgänger, der nur Häkchen kannte — einmalig übernehmen
const ALTER_KEY = "bothy_pending_item_toggles";

export function ladeQueue(): Op[] {
  try {
    const q: Op[] = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
    const alt: Record<string, boolean> | null = JSON.parse(localStorage.getItem(ALTER_KEY) ?? "null");
    if (alt) {
      for (const [itemId, abgehakt] of Object.entries(alt)) {
        q.push({ typ: "patch", itemId, data: { abgehakt }, opId: neueOpId() });
      }
      localStorage.removeItem(ALTER_KEY);
      speichereQueue(q);
    }
    return q;
  } catch {
    return [];
  }
}

function speichereQueue(q: Op[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {
    // localStorage nicht verfügbar (z.B. privater Modus) — Offline-Queue entfällt dann
  }
}

export function istTempId(id: string): boolean {
  return id.startsWith("temp-");
}

export function neueTempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function neueOpId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Die gerade gesendete Op darf nicht mehr verändert oder entfernt werden —
// sonst ginge eine Änderung verloren, die während des Requests dazukam.
let unterwegsOpId: string | null = null;

/** Hängt eine Änderung an und fasst sie mit schon wartenden zum selben Eintrag zusammen. */
export function einreihen(daten: OpDaten): void {
  const op: Op = { ...daten, opId: neueOpId() };
  let q = ladeQueue();
  const offen = (o: Op) => o.opId !== unterwegsOpId;
  if (op.typ === "patch") {
    const add = q.find((o) => offen(o) && o.typ === "add" && o.tempId === op.itemId);
    const patch = q.find((o) => offen(o) && o.typ === "patch" && o.itemId === op.itemId);
    if (add && add.typ === "add") Object.assign(add, op.data);
    else if (patch && patch.typ === "patch") patch.data = { ...patch.data, ...op.data };
    else q.push(op);
  } else if (op.typ === "delete") {
    const betrifft = (o: Op) =>
      offen(o) && ((o.typ === "add" && o.tempId === op.itemId) || (o.typ === "patch" && o.itemId === op.itemId));
    const nurLokal = q.some((o) => betrifft(o) && o.typ === "add");
    q = q.filter((o) => !betrifft(o));
    // Nie beim Server angekommen → Wegwerfen reicht. Sonst (auch wenn das
    // Anlegen gerade unterwegs ist) ein echtes Löschen hinterherschicken.
    if (!nurLokal) q.push(op);
  } else {
    q.push(op);
  }
  speichereQueue(q);
}

type Ergebnis = { status: "ok"; item?: Item } | { status: "verwerfen" } | { status: "spaeter" };

async function sende(op: Op): Promise<Ergebnis> {
  try {
    const res =
      op.typ === "patch"
        ? await fetch(`/api/einkaufsliste/items/${op.itemId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(op.data),
          })
        : op.typ === "delete"
          ? await fetch(`/api/einkaufsliste/items/${op.itemId}`, { method: "DELETE" })
          : await fetch(`/api/einkaufsliste/${op.listeId}/items`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: op.text, abgehakt: op.abgehakt }),
            });
    if (res.ok) return { status: "ok", item: op.typ === "add" ? await res.json() : undefined };
    // 4xx wird beim nächsten Versuch nicht besser — z.B. 404, weil die Liste
    // inzwischen neu erzeugt wurde. Behalten hieße: Offline-Hinweis für immer.
    if (res.status >= 400 && res.status < 500) return { status: "verwerfen" };
    return { status: "spaeter" };
  } catch {
    return { status: "spaeter" };
  }
}

let laufend: Promise<void> | null = null;

/**
 * Arbeitet die Queue der Reihe nach ab und hält beim ersten Netzfehler an
 * (Reihenfolge bleibt erhalten). Angelegte Einträge meldet onAngelegt, damit
 * die temporäre ID im Zustand durch die echte ersetzt werden kann.
 */
export function abarbeiten(onAngelegt: (tempId: string, item: Item) => void): Promise<void> {
  if (laufend) return laufend;
  laufend = (async () => {
    try {
      while (true) {
        const [op] = ladeQueue();
        if (!op) return;
        unterwegsOpId = op.opId;
        const ergebnis = await sende(op);
        unterwegsOpId = null;
        if (ergebnis.status === "spaeter") return;
        speichereQueue(ladeQueue().filter((o) => o.opId !== op.opId));
        if (op.typ === "add" && ergebnis.status === "ok" && ergebnis.item) {
          ersetzeTempId(op.tempId, ergebnis.item.id);
          onAngelegt(op.tempId, ergebnis.item);
        }
      }
    } finally {
      unterwegsOpId = null;
      laufend = null;
    }
  })();
  return laufend;
}

/** Spätere Ops, die sich noch auf die temporäre ID beziehen, auf die echte umstellen. */
function ersetzeTempId(tempId: string, echteId: string) {
  const q = ladeQueue().map((o) =>
    (o.typ === "patch" || o.typ === "delete") && o.itemId === tempId ? { ...o, itemId: echteId } : o,
  );
  speichereQueue(q);
}

/** Server-Stand plus alles, was lokal noch auf Synchronisierung wartet. */
export function mitAusstehenden(listeId: string, items: Item[]): Item[] {
  const q = ladeQueue();
  const geloescht = new Set(q.flatMap((o) => (o.typ === "delete" ? [o.itemId] : [])));
  const ergebnis = items
    .filter((i) => !geloescht.has(i.id))
    .map((i) => {
      const patch = q.find((o) => o.typ === "patch" && o.itemId === i.id);
      return patch && patch.typ === "patch" ? { ...i, ...patch.data } : i;
    });
  for (const o of q) {
    if (o.typ === "add" && o.listeId === listeId) {
      ergebnis.push({ id: o.tempId, text: o.text, abgehakt: o.abgehakt, sortierung: Number.MAX_SAFE_INTEGER });
    }
  }
  return ergebnis;
}
