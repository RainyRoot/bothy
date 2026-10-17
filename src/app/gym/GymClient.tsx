"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { berlinWallParts, formatBerlinDatum } from "@/lib/timezone";
import { formatSatz, type SatzWerte } from "@/lib/training-shared";
import { abarbeiten, ausstehend, einreihen, ladeOutbox, neueId, type Rueckmeldungen } from "./outbox";
import { UebungKarte } from "./UebungKarte";
import { schluessel, type GymDaten, type SatzLokal, type TrainingLokal, type UebungInfo } from "./typen";

// Wie Töpfe und Einkaufsliste: die Sätze der anderen Person erscheinen ohne Neuladen
const POLL_INTERVAL_MS = 10_000;
const LOKAL_KEY = "bothy_gym_lokal";

type Lokal = {
  training: TrainingLokal | null;
  meine: SatzLokal[];
  /** Während des Trainings ergänzte Übungen (zusätzlich zum Plan) */
  extra: string[];
  /** Offline angelegte Übungen, die der Server noch nicht kennt */
  neueUebungen: UebungInfo[];
};

function ladeLokal(): Lokal | null {
  try {
    return JSON.parse(localStorage.getItem(LOKAL_KEY) ?? "null");
  } catch {
    return null;
  }
}

function speichereLokal(lokal: Lokal | null) {
  try {
    if (lokal) localStorage.setItem(LOKAL_KEY, JSON.stringify(lokal));
    else localStorage.removeItem(LOKAL_KEY);
  } catch {
    // ohne localStorage überlebt ein laufendes Training kein Neuladen
  }
}

function heuteBerlin(): string {
  return berlinWallParts(new Date()).datum;
}

const nachZeit = (a: SatzLokal, b: SatzLokal) => a.createdAt.localeCompare(b.createdAt);

/**
 * Ein lokales Training von einem früheren Tag (vergessenes "Beenden") wird
 * verworfen, sobald nichts mehr dafür in der Outbox wartet — der Server
 * schließt es im 03:00-Lauf ohnehin. Sonst landen heutige Sätze im Training
 * von gestern, und die andere Person sieht es nicht als laufend.
 */
function istAbgelaufen(t: TrainingLokal | null): boolean {
  return t !== null && t.datum !== heuteBerlin() && ladeOutbox().length === 0;
}

export function GymClient({ daten }: { daten: GymDaten }) {
  const router = useRouter();
  const [bereit, setBereit] = useState(false);
  const [training, setTraining] = useState<TrainingLokal | null>(null);
  const [meine, setMeine] = useState<SatzLokal[]>([]);
  const [partnerSaetze, setPartnerSaetze] = useState<SatzLokal[]>([]);
  const [extra, setExtra] = useState<string[]>([]);
  const [uebungen, setUebungen] = useState<UebungInfo[]>(daten.uebungen);
  const [rekorde, setRekorde] = useState(daten.rekorde);
  const [meldung, setMeldung] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  const ich = daten.ich;
  const partner = daten.personen.find((p) => p.id !== ich) ?? null;

  // Für die Outbox-Rückmeldungen, die außerhalb des Render-Zyklus kommen
  const meineRef = useRef(meine);
  meineRef.current = meine;
  const uebungenRef = useRef(uebungen);
  uebungenRef.current = uebungen;
  // Zählt lokale Änderungen hoch — ein Poll, der währenddessen lief, ist veraltet
  const aenderungen = useRef(0);

  // ---- Laden aus localStorage (erst nach dem Mount, sonst Hydration-Mismatch)
  useEffect(() => {
    const lokal = ladeLokal();
    const neue = (lokal?.neueUebungen ?? []).filter((n) => !daten.uebungen.some((u) => u.id === n.id));
    if (neue.length > 0) setUebungen((us) => [...us, ...neue]);

    const serverLaufend = daten.laufend;
    let t = lokal?.training ?? null;
    let lokaleMeine = lokal?.meine ?? [];
    // Kein lokales Training, aber auf dem Server habe ich in einem laufenden
    // schon Sätze (anderes Gerät, Speicher gelöscht) → einfach weitermachen
    if (istAbgelaufen(t)) {
      t = null;
      lokaleMeine = [];
    }
    if (!t && serverLaufend?.saetze.some((s) => s.userId === ich)) {
      t = { id: serverLaufend.id, planId: serverLaufend.planId, datum: serverLaufend.datum, gestartetAt: serverLaufend.gestartetAt };
      lokaleMeine = [];
    }
    if (t) {
      setTraining(t);
      setExtra(lokal?.extra ?? []);
      if (serverLaufend && serverLaufend.id === t.id) {
        const serverMeine = serverLaufend.saetze.filter((s) => s.userId === ich);
        const ids = new Set(lokaleMeine.map((s) => s.id));
        setMeine([...lokaleMeine, ...serverMeine.filter((s) => !ids.has(s.id))].sort(nachZeit));
        setPartnerSaetze(serverLaufend.saetze.filter((s) => s.userId !== ich));
      } else {
        setMeine(lokaleMeine);
      }
    }
    setOffline(ladeOutbox().length > 0 || !navigator.onLine);
    setBereit(true);
  }, [daten, ich]);

  // ---- Lokal mitschreiben, damit ein Training Neuladen und Offline übersteht
  useEffect(() => {
    if (!bereit) return;
    if (!training) {
      speichereLokal(null);
      return;
    }
    const neueUebungen = uebungen.filter((u) => !daten.uebungen.some((d) => d.id === u.id));
    speichereLokal({ training, meine, extra, neueUebungen });
  }, [bereit, training, meine, extra, uebungen, daten.uebungen]);

  const rueckmeldungen: Rueckmeldungen = {
    idGeaendert(art, alt, neu) {
      aenderungen.current++;
      if (art === "training") {
        setTraining((t) => (t && t.id === alt ? { ...t, id: neu } : t));
        setMeine((m) => m.map((s) => (s.trainingId === alt ? { ...s, trainingId: neu } : s)));
      } else {
        setUebungen((us) => {
          const alte = us.find((u) => u.id === alt);
          const ohne = us.filter((u) => u.id !== alt);
          return ohne.some((u) => u.id === neu) || !alte ? ohne : [...ohne, { ...alte, id: neu }];
        });
        setMeine((m) => m.map((s) => (s.uebungId === alt ? { ...s, uebungId: neu } : s)));
        setExtra((e) => [...new Set(e.map((id) => (id === alt ? neu : id)))]);
      }
    },
    rekord(satzId) {
      const satz = meineRef.current.find((s) => s.id === satzId);
      if (!satz) return;
      setRekorde((r) => ({ ...r, [schluessel(ich, satz.uebungId)]: satz }));
      const name = uebungenRef.current.find((u) => u.id === satz.uebungId)?.name ?? "Übung";
      setMeldung(`Neuer Rekord · ${name}: ${formatSatz(satz)}`);
    },
  };
  const rueckRef = useRef(rueckmeldungen);
  rueckRef.current = rueckmeldungen;

  const synchronisieren = useCallback(async () => {
    await abarbeiten({
      idGeaendert: (...a) => rueckRef.current.idGeaendert(...a),
      rekord: (id) => rueckRef.current.rekord(id),
    });
    setOffline(ladeOutbox().length > 0 || !navigator.onLine);
  }, []);

  const trainingId = training?.id ?? null;
  const trainingRef = useRef(training);
  trainingRef.current = training;

  // ---- Polling: erst eigene Outbox loswerden, dann den Stand beider holen
  useEffect(() => {
    if (!bereit) return;
    async function runde() {
      await synchronisieren();
      if (!trainingId) return;
      if (istAbgelaufen(trainingRef.current)) {
        setTraining(null);
        setMeine([]);
        setExtra([]);
        setPartnerSaetze([]);
        router.refresh();
        return;
      }
      const stand = aenderungen.current;
      try {
        const res = await fetch(`/api/training/${trainingId}`, { cache: "no-store" });
        if (!res.ok || stand !== aenderungen.current) return;
        const frisch: { saetze: SatzLokal[] } = await res.json();
        if (stand !== aenderungen.current) return;
        const { saetze: wartend, geloescht } = ausstehend();
        setPartnerSaetze(frisch.saetze.filter((s) => s.userId !== ich));
        setMeine((lokal) => {
          // Server-Stand, außer wo lokal noch eine Änderung wartet
          const serverMeine = frisch.saetze.filter((s) => s.userId === ich && !geloescht.has(s.id));
          const serverIds = new Set(serverMeine.map((s) => s.id));
          const lokalNachId = new Map(lokal.map((s) => [s.id, s]));
          return [
            ...serverMeine.map((s) => (wartend.has(s.id) ? (lokalNachId.get(s.id) ?? s) : s)),
            ...lokal.filter((s) => wartend.has(s.id) && !serverIds.has(s.id)),
          ].sort(nachZeit);
        });
      } catch {
        // offline — die nächste Runde versucht es wieder
      }
    }
    function beiSichtbar() {
      if (document.visibilityState === "visible") void runde();
    }

    void runde();
    const interval = setInterval(beiSichtbar, POLL_INTERVAL_MS);
    const beiOffline = () => setOffline(true);
    window.addEventListener("online", runde);
    window.addEventListener("offline", beiOffline);
    document.addEventListener("visibilitychange", beiSichtbar);
    return () => {
      clearInterval(interval);
      window.removeEventListener("online", runde);
      window.removeEventListener("offline", beiOffline);
      document.removeEventListener("visibilitychange", beiSichtbar);
    };
  }, [bereit, trainingId, ich, synchronisieren, router]);

  useEffect(() => {
    if (!meldung) return;
    const timer = setTimeout(() => setMeldung(null), 6000);
    return () => clearTimeout(timer);
  }, [meldung]);

  // ---- Aktionen. Alles geht erst lokal und in die Outbox, dann wird gesynct.

  function aendern() {
    aenderungen.current++;
    // Der Offline-Hinweis kommt erst, wenn der Sync tatsächlich hängen bleibt —
    // sonst blitzt er bei jedem Satz kurz auf
    void synchronisieren();
  }

  function starten(planId: string | null) {
    const laufend = daten.laufend;
    // Läuft heute schon eins (die andere Person hat angefangen) → beitreten.
    // Offline weiß das hier niemand; dann stellt die Outbox beim Sync um.
    const t: TrainingLokal = laufend
      ? { id: laufend.id, planId: laufend.planId, datum: laufend.datum, gestartetAt: laufend.gestartetAt }
      : { id: neueId(), planId, datum: heuteBerlin(), gestartetAt: new Date().toISOString() };
    einreihen({ typ: "training", ...t });
    setTraining(t);
    setMeine([]);
    setExtra([]);
    setPartnerSaetze(laufend ? laufend.saetze.filter((s) => s.userId !== ich) : []);
    aendern();
  }

  function satzSpeichern(uebungId: string, werte: SatzWerte) {
    if (!training) return;
    const satz: SatzLokal = {
      id: neueId(),
      trainingId: training.id,
      userId: ich,
      uebungId,
      ...werte,
      createdAt: new Date().toISOString(),
    };
    setMeine((m) => [...m, satz]);
    einreihen({ typ: "satz", ...satz });
    aendern();
  }

  function satzAendern(satz: SatzLokal, werte: SatzWerte) {
    const neu = { ...satz, ...werte };
    setMeine((m) => m.map((s) => (s.id === satz.id ? neu : s)));
    einreihen({ typ: "satz", ...neu });
    aendern();
  }

  function satzLoeschen(id: string) {
    setMeine((m) => m.filter((s) => s.id !== id));
    einreihen({ typ: "satzLoeschen", id });
    aendern();
  }

  function uebungHinzufuegen(eingabe: string) {
    const name = eingabe.trim().replace(/\s+/g, " ");
    if (!name) return;
    const vorhanden = uebungen.find((u) => u.name.toLowerCase() === name.toLowerCase());
    let id = vorhanden?.id;
    if (!vorhanden || vorhanden.archiviert) {
      // Neu (oder archiviert): beim Server anlegen bzw. reaktivieren
      id = vorhanden?.id ?? neueId();
      einreihen({ typ: "uebung", id, name: vorhanden?.name ?? name });
      setUebungen((us) =>
        vorhanden ? us.map((u) => (u.id === id ? { ...u, archiviert: false } : u)) : [...us, { id: id!, name, archiviert: false }],
      );
      aendern();
    }
    setExtra((e) => (e.includes(id!) ? e : [...e, id!]));
  }

  function beenden() {
    if (!training) return;
    if (!confirm("Training beenden?")) return;
    einreihen({ typ: "beenden", trainingId: training.id });
    setTraining(null);
    setMeine([]);
    setExtra([]);
    setPartnerSaetze([]);
    aenderungen.current++;
    void synchronisieren().then(() => router.refresh());
  }

  if (!bereit) return null;

  const offlineHinweis = offline && (
    <p className="rounded-xl border border-accent/30 bg-accent-soft px-3.5 py-2.5 text-xs text-accent">
      Offline — alles wird auf dem Handy gespeichert und synchronisiert, sobald wieder Netz da ist.
    </p>
  );

  if (!training) {
    return (
      <>
        {offlineHinweis}
        <Uebersicht daten={daten} partnerName={partner?.name ?? null} onStarten={starten} />
      </>
    );
  }

  // ---- Laufendes Training
  const plan = daten.plaene.find((p) => p.id === training.planId) ?? null;
  const reihenfolge = [
    ...(plan?.uebungen.map((u) => u.uebungId) ?? []),
    ...extra,
    ...meine.map((s) => s.uebungId),
    ...partnerSaetze.map((s) => s.uebungId),
  ];
  const uebungIds = [...new Set(reihenfolge)].filter((id) => uebungen.some((u) => u.id === id));
  const vorschlagsNamen = uebungen.filter((u) => !u.archiviert && !uebungIds.includes(u.id)).map((u) => u.name);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium">{plan?.name ?? "Freies Training"}</p>
          <p className="text-xs text-muted">
            {training.datum === heuteBerlin()
              ? "läuft"
              : `vom ${formatBerlinDatum(new Date(`${training.datum}T00:00:00Z`))} — wird nach dem Sync geschlossen`}
            {" · "}
            {meine.length} Sätze{partner ? ` · ${partner.name}: ${partnerSaetze.length}` : ""}
          </p>
        </div>
        <button onClick={beenden} className="btn-secondary btn-sm">
          Beenden
        </button>
      </div>

      {offlineHinweis}

      {uebungIds.length === 0 && (
        <p className="card text-center text-sm text-muted">Noch keine Übung — unten eine hinzufügen.</p>
      )}

      {uebungIds.map((uebungId) => {
        const uebung = uebungen.find((u) => u.id === uebungId)!;
        const ziel = plan?.uebungen.find((u) => u.uebungId === uebungId) ?? null;
        return (
          <UebungKarte
            key={uebungId}
            name={uebung.name}
            ziel={ziel}
            letztesMal={daten.letztesMal[schluessel(ich, uebungId)] ?? []}
            rekord={rekorde[schluessel(ich, uebungId)] ?? null}
            meine={meine.filter((s) => s.uebungId === uebungId)}
            partnerSaetze={partnerSaetze.filter((s) => s.uebungId === uebungId)}
            partnerName={partner?.name ?? null}
            onSpeichern={(werte) => satzSpeichern(uebungId, werte)}
            onAendern={satzAendern}
            onLoeschen={satzLoeschen}
          />
        );
      })}

      <UebungHinzufuegen namen={vorschlagsNamen} onHinzufuegen={uebungHinzufuegen} />

      {meldung && (
        <div className="fixed inset-x-0 bottom-20 z-30 flex justify-center px-4">
          <p className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white shadow-lg">{meldung}</p>
        </div>
      )}
    </div>
  );
}

function Uebersicht({
  daten,
  partnerName,
  onStarten,
}: {
  daten: GymDaten;
  partnerName: string | null;
  onStarten: (planId: string | null) => void;
}) {
  const { serie, laufend } = daten;
  const laufenderPlan = laufend ? daten.plaene.find((p) => p.id === laufend.planId) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="card flex flex-col gap-1.5">
        <p className="text-sm text-muted">Diese Woche</p>
        <p className="text-lg font-medium">
          {daten.personen.map((p) => `${p.name} ${serie.dieseWoche[p.id] ?? 0}×`).join(" · ")}
        </p>
        <p className="text-sm text-muted">
          {serie.wochenInFolge === 0
            ? "Noch keine Serie — die erste Woche zählt."
            : `${serie.wochenInFolge} ${serie.wochenInFolge === 1 ? "Woche" : "Wochen"} in Folge trainiert`}
        </p>
      </div>

      {laufend ? (
        <div className="card flex flex-col items-start gap-3">
          <p className="text-sm">
            {laufenderPlan?.name ?? "Freies Training"} läuft
            {partnerName && laufend.saetze.some((s) => s.userId !== daten.ich) ? ` — ${partnerName} ist schon dabei` : ""}.
          </p>
          <button onClick={() => onStarten(laufend.planId)} className="btn-primary">
            Beitreten
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted">Training starten</p>
          {daten.plaene.map((p) => (
            <button
              key={p.id}
              onClick={() => onStarten(p.id)}
              className="card flex items-center justify-between !p-3.5 text-left transition-transform duration-150 active:scale-[0.98]"
            >
              <span className="font-medium">{p.name}</span>
              <span className="text-xs text-muted">{p.uebungen.length} Übungen</span>
            </button>
          ))}
          <button onClick={() => onStarten(null)} className="btn-secondary self-start">
            Freies Training
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Link href="/gym/plaene" className="chip">
          Pläne
        </Link>
        <Link href="/gym/uebungen" className="chip">
          Übungen & Fortschritt
        </Link>
      </div>
    </div>
  );
}

function UebungHinzufuegen({ namen, onHinzufuegen }: { namen: string[]; onHinzufuegen: (name: string) => void }) {
  const [text, setText] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onHinzufuegen(text);
        setText("");
      }}
      className="flex gap-2"
    >
      <input
        list="gym-uebungen"
        placeholder="Übung hinzufügen…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="input flex-1"
      />
      <datalist id="gym-uebungen">
        {namen.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <button type="submit" disabled={!text.trim()} className="btn-secondary shrink-0">
        Hinzufügen
      </button>
    </form>
  );
}

