# PROGRESS.md

**Stand:** Stufe 0 — Code für Gerüst, Auth und Push geschrieben, gegen
echte DB noch ungetestet (Docker Desktop wurde neu installiert und
initialisiert gerade)
**Letzte Aktualisierung:** 2026-08-26
**Branch:** `dev`

---

## Nächster Schritt

1. Warten bis Docker Desktop einsatzbereit ist (`docker ps` läuft ohne
   Fehler), dann `docker compose up -d postgres`.
2. `npx prisma migrate dev --name init` — erste Migration, Migrationsfile
   committen.
3. Kompletten Flow manuell durchklicken: `/setup` (Invite-Code aus
   `.env`, Passkey Person 1), noch mal `/setup` (Person 2), `/login`
   mit Passkey, auf `/` „Push aktivieren" → „Test-Benachrichtigung in
   2 Minuten". Erst wenn das lokal sauber durchläuft, ist Stufe 0
   inhaltlich fertig — der DoD selbst (drei Tage, beide echten Handys)
   kommt danach.

---

## Stufen

- [x] **Stufe 0 — Gerüst & Push-Beweis** (Code steht, DB-Test steht aus)
  - [x] Repo, Next.js 15, Prisma 7, Docker Compose (app + postgres + caddy)
  - [x] Schema aus `PLAN.md` Abschnitt 3 + `Passkey`-Modell — [ ] erste Migration noch nicht gelaufen
  - [x] Auth: Invite-Code beim Setup, danach Passkeys (WebAuthn) — Code steht, ungetestet
  - [x] PWA-Manifest, Service Worker, VAPID-Keys, Subscription-Handling — Code steht, ungetestet
  - [x] Button „Test-Benachrichtigung in 2 Minuten" — Code steht, ungetestet
  - [ ] **DoD:** zuverlässige Zustellung auf beiden Handys, App geschlossen, nach 30 min Standby, an drei Tagen in Folge
- [ ] **Stufe 1 — Töpfe**
- [ ] **Stufe 2 — Kalender**
- [ ] **Stufe 3 — Essensplan & Einkaufsliste**

Ausformulierte Definitions of Done: `PLAN.md` Abschnitt 5.

---

## Getroffene Entscheidungen

Nur Beschlossenes. Was hier steht, wird nicht neu diskutiert.

| Datum | Entscheidung | Begründung |
|---|---|---|
| 2026-08-21 | Name: ~~Zwirn~~ (verworfen, siehe unten) | zwei Fäden zu einem gedreht |
| 2026-08-26 | Name: **Bothy** (englisch statt deutsch) | einfache, unverschlossene Schutzhütte, die sich Wanderer teilen — ein gemeinsamer kleiner Unterschlupf für zwei. Repo: `RainyRoot/bothy` |
| 2026-08-21 | Nur Android, kein iOS | beide Samsung; spart die Web-Push-Einschränkungen von Safari |
| 2026-08-21 | PWA, kein React Native | ein Codestand, TWA-Pfad bleibt offen |
| 2026-08-21 | Reihenfolge: Push-Beweis → Töpfe → Kalender → Essensplan | Push ist das größte technische Risiko, Töpfe das kleinste fertige Feature ohne Konkurrenz auf dem Handy |
| 2026-08-21 | Kein Bank-Sync | nicht gewünscht |
| 2026-08-21 | Monatsablauf der Töpfe manuell, kein Regel-Cron | Wunsch von Chris und Mara; stattdessen „Monatsstart"-Aktion mit vorbelegten Beträgen |
| 2026-08-21 | Wiederholungen: jährlich, wöchentlich, monatlich; Aussetzen ja, Verschieben nein | siehe `PLAN.md` 4.3 |
| 2026-08-21 | Hosting bewusst vertagt, Setup bleibt anbieterunabhängig | Compose läuft auf NAS wie auf Hetzner |
| 2026-08-26 | Next.js **15.5.24** fest gepinnt (nicht `@latest`) | `create-next-app@latest` installiert mittlerweile Next 16 — PLAN.md 1 will explizit 15 |
| 2026-08-26 | Prisma **7.10.0** fest gepinnt (nicht `@latest`) | npms `prisma`-Paket zeigte `latest` auf eine Release-Candidate 8.0.0-rc.10, während `@prisma/client` reguär bei 7.10.0 stand — Mismatch vermieden |
| 2026-08-26 | Prisma 7 braucht einen Driver-Adapter (`@prisma/adapter-pg`) | seit v7 verbindet sich `PrismaClient` nicht mehr implizit über die Engine, sondern nur noch über einen Adapter oder Prisma Accelerate |
| 2026-08-26 | Passkeys: `@simplewebauthn/server` + `@simplewebauthn/browser` | Rückfrage bei Chris beantwortet — De-facto-Standard, keine Cloud-Abhängigkeit |
| 2026-08-26 | Session: eigenes signiertes httpOnly-Cookie (Web Crypto API, kein extra Package) | Rückfrage bei Chris beantwortet — passt zu „2 Nutzer, keine Rollen"; Web Crypto statt `node:crypto`, damit dieselbe Signierlogik auch in der Edge-Middleware läuft |
| 2026-08-26 | Web Push: `web-push` (npm) | einzige ernstzunehmende Option für VAPID-Push, keine Rückfrage nötig |
| 2026-08-26 | `Passkey`-Modell zum Schema ergänzt (nicht in PLAN.md 3) | WebAuthn-Credentials brauchten eine Tabelle, die die ursprüngliche Spezifikation nicht vorsah |
| 2026-08-26 | Zusteller als selbst nachplanende Schleife (`instrumentation.ts`), nicht `setInterval` + rohes `FOR UPDATE SKIP LOCKED` | Compose fährt genau einen `app`-Container — die einzige reale Race-Bedingung ist ein überlappender Lauf mit sich selbst, wenn Zustellung >60s dauert. Ein „warte auf Ende, dann Timeout" vermeidet das ohne offene Transaktion über Netzwerk-Calls hinweg |

---

## Offene Fragen

Beantwortet werden sie von Chris, nicht von einer Instanz allein.

- Hosting final: NAS + Tailscale oder Hetzner CX22? Spätestens vor Stufe 2. Der Play-Store-Pfad braucht Hetzner (`PLAN.md` 8).
- Domain
- Farbschema, Icon, App-Name auf dem Homescreen
- Verhältnis zu BiteWise — ersetzt Stufe 3 es, oder entfällt Stufe 3?

---

## Backlog

Ideen, die nicht in der laufenden Stufe landen dürfen.

- ICS-Export für externe Kalender
- Beleg-Foto mit OCR zur Buchungserfassung
- Auswertungen und Verläufe pro Topf
- Wochenansicht mit Stundenraster
- Play-Store-Veröffentlichung via Bubblewrap

---

## Session-Log

Ein Eintrag pro Session. Neueste oben. Kurz halten: was gebaut wurde,
was hängt, wo die nächste Instanz ansetzt.

### 2026-08-26 — Gerüst, Auth, Push (Code steht, DB-Test steht aus)
Next.js 15 + Prisma 7 + Docker Compose (app/postgres/caddy) aufgesetzt.
Schema aus PLAN.md 3 übernommen, `Passkey`-Modell ergänzt. Auth-Flow
(Invite-Code-Setup für beide Personen, danach Passkey-Login über
`@simplewebauthn`) und Push-Pipeline (Manifest, Service Worker,
VAPID, `/api/push/subscribe`, Zusteller-Loop, Test-Button) fertig
geschrieben, lintet und baut sauber (`npm run build`).

Docker war auf der Maschine nicht installiert — mit Zustimmung von
Chris per `winget` nachinstalliert. Der Engine-Start (WSL2-Backend,
Willkommens-Dialog) zog sich über die Session; deshalb ist der Code
noch **nicht gegen eine echte Postgres-Instanz getestet** — keine
Migration gelaufen, kein Setup/Login/Push-Test durchgeklickt. Das ist
der Blocker für „Nächster Schritt" oben.

Kleinere Stolperstellen für die nächste Instanz: der Next-Standalone-
Build wirft unter Windows lokal eine harmlose Warnung beim Kopieren
von `node:buffer`-Chunks (Doppelpunkt im Dateinamen, Windows-FS-
Limitierung) — im Docker-Image (Linux) tritt das nicht auf, keine
Aktion nötig.

### 2026-08-26 — Umbenennung & Repo-Bootstrap
App von "Zwirn" auf **"Bothy"** umbenannt (englisch statt deutsch,
Chris' Wunsch). GitHub CLI installiert und eingerichtet
(`gh auth login`, Account **RainyRoot**). Repo `RainyRoot/bothy`
angelegt, lokal unter `C:\Users\Chris\VSCode\bothy` initialisiert,
Branch `dev`, Docs gepusht. Noch kein Code.
Nächste Instanz: Next.js/Prisma/Docker-Gerüst aus "Nächster Schritt" oben.

### 2026-08-21 — Planung
Spezifikation erstellt (`PLAN.md`), Arbeitsvereinbarung (`CLAUDE.md`),
diese Datei. Noch kein Code, noch kein Repo.
Nächste Instanz: Repo-Bootstrap oben.
