# PROGRESS.md

**Stand:** Stufe 0 — Gerüst, Auth (Nutzername/Passwort) und Push-Code
stehen. Setup/Login Ende-zu-Ende gegen echte lokale DB getestet. Der
eigentliche Push-Test (Browser → Service Worker → Zusteller →
Benachrichtigung) steht noch aus.
**Letzte Aktualisierung:** 2026-08-26
**Branch:** `dev`

---

## Nächster Schritt

Im Browser auf **http://localhost:3000**: `/setup` mit Invite-Code aus
`.env` (`bothy-dev`) für beide Personen durchklicken (echte Namen/
Passwörter, die Test-Accounts wurden gelöscht), dann auf `/` „Push
aktivieren" → Benachrichtigungs-Erlaubnis erteilen → „Test-
Benachrichtigung in 2 Minuten" klicken. Erst wenn das lokal sauber
durchläuft, ist Stufe 0 inhaltlich fertig — der DoD selbst (drei Tage,
beide echten Handys, App geschlossen) kommt danach und setzt eine
erreichbare Domain/Tailscale-Setup voraus (siehe „Offene Fragen").

**Vorher prüfen, ob die lokale Postgres noch läuft** (sie ist kein
Windows-Dienst, siehe unten): `curl http://localhost:3000` — falls
kein Response, siehe „Lokale DB neu starten" unten.

---

## Lokale DB neu starten

PostgreSQL läuft NICHT als Windows-Dienst (Rechteproblem, siehe
Session-Log). Nach einem Neustart des Rechners manuell wieder hochfahren:

```powershell
& "C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe" start -D "C:\Program Files\PostgreSQL\17\data" -l "C:\Program Files\PostgreSQL\17\data\log\startup.log"
```

Zugang: `postgres://postgres:bothy-dev-postgres@localhost:5432/bothy`
(steht auch in `.env`, welches nicht im Repo liegt).

---

## Stufen

- [x] **Stufe 0 — Gerüst & Push-Beweis** (Code steht, Push-Test steht aus)
  - [x] Repo, Next.js 15, Prisma 7, Docker Compose (app + postgres + caddy) — Compose ungetestet, siehe Docker-Hinweis im Session-Log
  - [x] Schema aus `PLAN.md` Abschnitt 3, beide Migrationen gegen echte DB gelaufen
  - [x] Auth: Invite-Code beim Setup, dann Login — **Nutzername/Passwort statt Passkeys** (Entscheidung geändert, siehe unten), Ende-zu-Ende getestet
  - [x] PWA-Manifest, Service Worker, VAPID-Keys, Subscription-Handling — Code steht, noch nicht im Browser getestet
  - [x] Button „Test-Benachrichtigung in 2 Minuten" — Code steht, noch nicht im Browser getestet
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
| 2026-08-26 | ~~Passkeys: `@simplewebauthn`~~ — verworfen, siehe unten | Rückfrage bei Chris beantwortet — De-facto-Standard, keine Cloud-Abhängigkeit |
| 2026-08-26 | Session: eigenes signiertes httpOnly-Cookie (Web Crypto API, kein extra Package) | Rückfrage bei Chris beantwortet — passt zu „2 Nutzer, keine Rollen"; Web Crypto statt `node:crypto`, damit dieselbe Signierlogik auch in der Edge-Middleware läuft |
| 2026-08-26 | Web Push: `web-push` (npm) | einzige ernstzunehmende Option für VAPID-Push, keine Rückfrage nötig |
| 2026-08-26 | Zusteller als selbst nachplanende Schleife (`instrumentation.ts`), nicht `setInterval` + rohes `FOR UPDATE SKIP LOCKED` | Compose fährt genau einen `app`-Container — die einzige reale Race-Bedingung ist ein überlappender Lauf mit sich selbst, wenn Zustellung >60s dauert. Ein „warte auf Ende, dann Timeout" vermeidet das ohne offene Transaktion über Netzwerk-Calls hinweg |
| 2026-08-26 | Docker Desktop lokal aufgegeben, natives PostgreSQL 17 für die Entwicklung | Rechner hat eine alte MBR-Platte, WSL2/Hyper-V-Virtualisierung startet nicht (dasselbe Problem blockiert auch das Win11-Upgrade). `docker-compose.yml` bleibt unverändert für NAS/Hetzner |
| 2026-08-26 | Auth: **Nutzername/Passwort statt Passkeys** (`crypto.scrypt`, kein neues Package), für beide Geräte | Kurswechsel von Chris — Passkey-Registrierung ließ sich auf dem Entwicklungsrechner nicht testen (kein Authenticator eingerichtet); statt Workaround bewusst vereinfacht. `Passkey`-Modell wieder aus dem Schema entfernt, `User.name` jetzt `@unique` |

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
- PostgreSQL-Windows-Dienst mit korrekten Rechten einrichten, damit `pg_ctl` nach Neustart nicht manuell nötig ist (nur relevant für diesen Entwicklungsrechner, nicht für Betrieb)

---

## Session-Log

Ein Eintrag pro Session. Neueste oben. Kurz halten: was gebaut wurde,
was hängt, wo die nächste Instanz ansetzt.

### 2026-08-26 — Gerüst, Auth (Kurswechsel), Push-Code steht
Next.js 15 + Prisma 7 + Docker Compose (app/postgres/caddy) aufgesetzt,
Schema aus PLAN.md 3 übernommen. Push-Pipeline (Manifest, Service
Worker, VAPID, `/api/push/subscribe`, Zusteller-Loop, Test-Button)
fertig geschrieben, lintet und baut sauber (`npm run build`).

**Docker geht auf diesem Rechner nicht.** Erst per `winget`
nachinstalliert, dann hing der Engine-Start (WSL2-Backend) fest —
Ursache: alte MBR-Partitionierung, dieselbe, die auch das Win11-Upgrade
blockiert. Statt Virtualisierung erzwingen: lokale Entwicklung läuft
über natives PostgreSQL 17 für Windows (`winget install
PostgreSQL.PostgreSQL.17`), NICHT als Windows-Dienst (das Dienstkonto
hatte keine Start/Stop-Rechte in dieser Session — `pg_ctl start`
manuell, siehe „Lokale DB neu starten" oben). `docker-compose.yml`
bleibt unverändert für den späteren Betrieb auf NAS/Hetzner, wo
Virtualisierung kein Thema ist.

Auf dem Weg dahin zuerst `npx prisma dev` probiert (Prismas
eingebauter lokaler Postgres) — funktionierte anfangs, verhielt sich
dann aber nicht wie echtes Postgres (`template1` „heilte" sich
zwischen Verbindungen selbst, vermutlich eine Embedded/Snapshot-
Variante). Nach mehreren rätselhaften Migrationsfehlern verworfen
zugunsten von echtem PostgreSQL.

**Auth-Kurswechsel:** Passkey-Registrierung ließ sich auf diesem
Rechner nicht testen (kein Authenticator eingerichtet). Auf
ausdrücklichen Wunsch von Chris komplett auf Nutzername/Passwort
umgestellt — nicht nur als Notlösung für den PC, sondern dauerhaft für
beide Geräte. `@simplewebauthn` wieder entfernt, `Passkey`-Modell raus,
`User.passwordHash` (`crypto.scrypt`) rein.

Ende-zu-Ende gegen die echte lokale DB getestet (curl): Setup Person 1
+ 2, Setup schließt sich danach, dritte Registrierung abgelehnt,
falsches Passwort abgelehnt, korrekter Login setzt Session, geschützte
Seite lädt mit Nutzernamen. Middleware gab unauthentifizierte
API-Aufrufe fälschlich als Redirect statt 401 zurück — gefixt.
Test-Accounts danach gelöscht, DB ist für Chris/Mara bereit.

**Noch nicht getestet:** der eigentliche Push-Teil im Browser
(Service-Worker-Registrierung, Benachrichtigungs-Erlaubnis, ob die
Test-Benachrichtigung nach 2 Minuten wirklich ankommt) — das ist der
nächste Schritt.

Kleinere Stolperstelle: der Next-Standalone-Build wirft unter Windows
lokal eine harmlose Warnung beim Kopieren von `node:buffer`-Chunks
(Doppelpunkt im Dateinamen, Windows-FS-Limitierung) — im Docker-Image
(Linux) tritt das nicht auf, keine Aktion nötig.

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
