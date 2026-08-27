# PROGRESS.md

**Stand:** Alle vier Stufen aus `PLAN.md` sind code-komplett und **alle
im Browser getestet** (Gerüst/Auth/Push, Töpfe, Kalender, Essensplan) —
inklusive Offline-Queue der Einkaufsliste und echter Zustellung einer
Kalender-Erinnerung als Push. Offen ist inhaltlich nur noch, was echte
Geräte/Zeit braucht: der Drei-Tage-Handy-DoD aus Stufe 0 und der
Zwei-Geräte-Gleichzeitigkeitstest aus Stufe 1, dazu Docker Compose
(auf diesem Rechner nicht testbar) und die Design-Restpunkte
(Farbschema/Icon/App-Name).
**Letzte Aktualisierung:** 2026-08-27
**Branch:** `dev`

---

## Nächster Schritt

1. Stufe-0-DoD auf echten Handys (siehe „Offene Fragen" von früher —
   Tailscale-Login war schon gestartet, dann auf Chris' Wunsch
   zurückgestellt; jetzt akut, da Hosting auf NAS+Tailscale entschieden
   ist). Login-URL war `https://login.tailscale.com/a/e11d2c9015be0`,
   vermutlich abgelaufen — bei Bedarf `tailscale up` neu ausführen.
2. Docker Compose einmal real durchlaufen lassen — auf diesem
   Entwicklungsrechner nicht möglich (keine Virtualisierung, siehe
   Session-Log), muss auf dem NAS passieren.
3. Zwei-Geräte-Gleichzeitigkeitstest für Stufe 1 (Töpfe): Änderung auf
   einem Gerät binnen 30s beim anderen sichtbar.
4. Farbschema, Icon, App-Name auf dem Homescreen entscheiden (PLAN.md 9).

Danach ist inhaltlich nichts mehr offen aus PLAN.md 5 außer den
Geräte-Verifikationen selbst.

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
  - [x] PWA-Manifest, Service Worker, VAPID-Keys, Subscription-Handling — im Desktop-Browser (Chrome) getestet, funktioniert
  - [x] Button „Test-Benachrichtigung in 2 Minuten" — getestet, Zustellung nach 2 Minuten bestätigt
  - [ ] **DoD:** zuverlässige Zustellung auf beiden Handys, App geschlossen, nach 30 min Standby, an drei Tagen in Folge — bewusst zurückgestellt, siehe „Nächster Schritt"
- [x] **Stufe 1 — Töpfe** (gebaut, im Browser von Chris getestet)
  - [x] Töpfe anlegen/archivieren, Buchungen erfassen, Umbuchen, Fortschrittsbalken bei Sparzielen, Monatsstart-Aktion
  - [x] Liste pollt alle 10s (DoD: Änderung binnen 30s sichtbar) — noch nicht mit zwei gleichzeitigen Sessions/Geräten getestet
  - [ ] **DoD:** siehe `PLAN.md` 5, noch nicht auf zwei Geräten gleichzeitig verifiziert
- [x] **Stufe 2 — Kalender** (gebaut, im Browser von Chris getestet)
  - [x] Termin-CRUD, Wiederholungen (wöchentlich/monatlich/jährlich), Erinnerungen, Monatsraster, Agenda-Liste
  - [x] Löschen, Serie beenden, Einzeltermin aussetzen (PLAN.md 4.3)
  - [x] Materialisierer (60-Tage-Fenster, täglich 03:00 + sofort nach Änderung) über denselben Expansionscode wie die Kalenderansicht
  - [x] **DoD-Fälle per curl verifiziert:** Zeitzonen-Test (Geburtstag 1. März erscheint nicht am 28.2.), wöchentlich/monatlich korrekt über 3 Monate, Monatsklemmung am 31. bleibt stabil (kein Drift auf den 30.), `betrifft=PARTNER_A` erreicht nur einen Nutzer
  - [x] Im Browser angeschaut; Erinnerungs-Push tatsächlich zugestellt bekommen (Chris bestätigt, 2026-08-27)
- [x] **Stufe 3 — Essensplan & Einkaufsliste** (gebaut, im Browser von Chris getestet)
  - [x] Wochenplan (Mahlzeiten mit Freitext-Zutaten, kein Rezeptdatenbank-Overhead)
  - [x] Einkaufsliste aggregiert + dedupliziert Zutaten der Woche
  - [x] Service Worker bekam echtes Caching (vorher nur Push-Events) — nötig, damit die Liste offline überhaupt lädt
  - [x] Häkchen laufen optimistisch mit localStorage-Queue + Sync bei `online`-Event (bewusst kein natives Background Sync, siehe Entscheidungen)
  - [x] „Einkauf abschließen" bucht direkt in einen Topf — Weg Essensplan→Liste→Buchung ohne Doppeleingabe
  - [x] Im Browser getestet, inklusive Offline-Queue in einem echten Browser-Offline-Zustand (Chris bestätigt, 2026-08-27)

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
| 2026-08-26 | Stufe 3 wird gebaut, BiteWise ersetzt sie **nicht** | Rückfrage bei Chris beantwortet |
| 2026-08-26 | Essensplan/Einkaufsliste-Schema neu entworfen (`Mahlzeit`, `Einkaufsliste`, `EinkaufslistenItem`) — Freitext-Zutaten, keine Rezeptablage | Stufe 3 hatte kein Schema in PLAN.md 3; Nicht-Ziele (PLAN.md 2) schließen Rezeptdatenbank/Nährwerte/Mengenumrechnung explizit aus |
| 2026-08-26 | PARTNER_A/PARTNER_B = Registrierungsreihenfolge beim Setup, kein Schema-Feld | Bei genau zwei Nutzern reicht „wer hat sich zuerst registriert" als Konvention |
| 2026-08-26 | Offline-Sync der Einkaufsliste über localStorage-Queue + `online`-Event, nicht die native Background-Sync-API | Echtes Background Sync bräuchte IndexedDB-Zugriff aus dem Service Worker (kein `localStorage` dort verfügbar) — für zwei Nutzer und eine Liste mit wenigen Einträgen reicht die einfachere Variante, die nur bei offener App synct statt auch bei geschlossenem Tab |
| 2026-08-27 | Hosting jetzt: **NAS + Tailscale**; Hetzner-Umzug bleibt der spätere Weg, falls Play Store gewünscht | Play Store lohnt laut PLAN.md 8 für zwei Nutzer ohnehin nicht ("falscher Aufwand"), Sideload reicht. `docker-compose.yml` ist bewusst anbieterunabhängig gehalten — Umzug auf Hetzner ist dann nur `docker compose up` + DNS, kein Code-Unterschied. Domain-Entscheidung bleibt aufgeschoben, bis Play Store konkret ansteht (PLAN.md 8: Domain muss vor TWA-Verifizierung feststehen und bleibt dann fest) |

---

## Offene Fragen

Beantwortet werden sie von Chris, nicht von einer Instanz allein.

- Domain (erst nötig, falls/wenn Richtung Play Store — siehe Entscheidungen)
- Farbschema, Icon, App-Name auf dem Homescreen

---

## Backlog

Ideen, die nicht in der laufenden Stufe landen dürfen.

- ICS-Export für externe Kalender
- Beleg-Foto mit OCR zur Buchungserfassung
- Auswertungen und Verläufe pro Topf
- Wochenansicht mit Stundenraster
- Play-Store-Veröffentlichung via Bubblewrap
- PostgreSQL-Windows-Dienst mit korrekten Rechten einrichten, damit `pg_ctl` nach Neustart nicht manuell nötig ist (nur relevant für diesen Entwicklungsrechner, nicht für Betrieb)
- Echtes Background Sync (IndexedDB-Queue im Service Worker) statt localStorage+`online`-Event, falls Sync auch bei geschlossenem Tab gebraucht wird

---

## Session-Log

Ein Eintrag pro Session. Neueste oben. Kurz halten: was gebaut wurde,
was hängt, wo die nächste Instanz ansetzt.

### 2026-08-27 — Hosting-Entscheidung, Browser-Verifikation Stufe 2 & 3
Hosting-Frage geklärt (war als „nur von Chris zu beantworten" markiert):
**NAS + Tailscale** jetzt, Umzug auf Hetzner bleibt bei Bedarf offen
(`docker-compose.yml` ist bewusst anbieterunabhängig — nur `docker
compose up` + DNS). Play Store lohnt laut PLAN.md 8 für zwei Nutzer
ohnehin nicht. In PLAN.md 1 und 9 nachgezogen, dabei auch einen
veralteten Punkt (Verhältnis zu BiteWise, war schon 2026-08-26
entschieden) aus PLAN.md 9 entfernt.

Chris hat danach Kalender und Essensplan/Einkaufsliste im Browser
durchgeklickt — **beide erfolgreich**, inklusive der zwei kritischen
Fälle, die vorher nur Code-Pfad-getestet waren: Offline-Queue der
Einkaufsliste in einem echten Browser-Offline-Zustand (Häkchen
gesetzt, beim Reconnect gesynct), und eine Kalender-Erinnerung kam
tatsächlich als Push an (nicht nur `ReminderJob`-Zeile in der DB).
Damit sind alle vier Stufen jetzt im Browser verifiziert.

**Kein Browser-Automatisierungstool verfügbar** in dieser Umgebung
(`chromium-cli` fehlt, Playwright nicht installiert) — Browser-Tests
liefen daher wieder manuell durch Chris, nicht durch die Instanz.

Verbleibend laut PLAN.md 5 (siehe „Nächster Schritt"): Stufe-0-Drei-
Tage-DoD und Stufe-1-Zwei-Geräte-Test brauchen echte Handys, Docker
Compose braucht das NAS (auf diesem Rechner keine Virtualisierung),
Farbschema/Icon/App-Name ist noch offen.

### 2026-08-26 (Fortsetzung 3) — Stufe 3: Essensplan & Einkaufsliste
Vor dem Bauen erst die offene Frage aus PROGRESS.md geklärt: BiteWise
ersetzt Stufe 3 nicht, sie wird wie in PLAN.md 5 beschrieben gebaut
(Chris' Antwort, jetzt in „Getroffene Entscheidungen").

PLAN.md 3 hat für diese Stufe kein Schema — neu entworfen: `Mahlzeit`
(Datum, Titel, Zutaten als Freitext, eine Zeile pro Zutat — bewusst
keine Rezept-Entität zum Wiederverwenden, siehe Nicht-Ziele PLAN.md 2),
`Einkaufsliste` + `EinkaufslistenItem` (pro Kalenderwoche, mit
Abhak-Status).

Wochenplan (`/essensplan`, 7-Tage-Ansicht) und Einkaufsliste
(`/einkaufsliste`, aggregiert + dedupliziert Zutaten zeilenweise über
alle Mahlzeiten der Woche) gebaut. „Einkauf abschließen" bucht Betrag
+ gewählten Topf direkt als `Buchung` — schließt den in PLAN.md 5
geforderten Weg Essensplan→Liste→Buchung ohne zweite Eingabe.

Für „offline abhakbar" fiel auf: der Service Worker aus Stufe 0 konnte
bisher **nichts** offline ausliefern, er behandelte nur Push-Events,
keine `fetch`-Requests. Nachgerüstet: Netzwerk-zuerst-mit-Cache-
Fallback für alle GET-Requests derselben Origin, dazu eine allgemeine
SW-Registrierung im Root-Layout (vorher registrierte sich der SW erst
beim Klick auf „Push aktivieren"). Checkbox-Toggles laufen optimistisch
im Client; schlägt der PATCH fehl, landet die Änderung in einer
localStorage-Queue und wird beim `online`-Event nachgeholt — bewusst
kein natives Background Sync (bräuchte IndexedDB-Zugriff im Service
Worker, `localStorage` ist dort nicht verfügbar), für zwei Nutzer und
kleine Listen reicht die einfachere Variante (siehe Entscheidungen,
Grenze im Backlog vermerkt: syncet nur bei offener App, nicht bei
geschlossenem Tab).

Gegen die echte DB getestet: zwei Mahlzeiten mit teils gleichen
Zutaten ("Zwiebeln" in beiden) ergaben eine Liste mit 5 statt 6
Einträgen (Dedup korrekt), Abhaken persistiert, Buchen erzeugt korrekt
eine negative Buchung im gewählten Topf. Ein vergessener Test-Topf aus
einer früheren Session ("test123") fiel beim Aufräumen auf und wurde
mitgelöscht.

**Damit sind alle vier Stufen aus PLAN.md code-komplett.** Offen:
Stufe 2 und 3 noch nicht im Browser angeschaut (nur curl), und der
Stufe-0-DoD auf echten Handys — dafür wird die Hosting-Frage jetzt
akut, siehe „Offene Fragen".

### 2026-08-26 (Fortsetzung 2) — Stufe 2: Kalender
Chris hat Töpfe im Browser getestet ("supi") — weiter mit Stufe 2 laut
Plan-Reihenfolge. Termin-CRUD, Wiederholungen, Erinnerungen,
Monatsraster + Agenda-Liste, die drei Aktionen aus PLAN.md 4.3
(Löschen/Beenden/Aussetzen) gebaut.

Kernstück ist `lib/kalender-shared.ts::expandiereTermin` — eine reine,
UTC-sichere Funktion ohne Server-Importe, die sowohl die Kalender-API
als auch der Materialisierer nutzen (harte Regel aus CLAUDE.md). Dazu
`lib/timezone.ts`: wandelt Berlin-Ortszeit-Eingaben (Formulare) nach
UTC und zurück, inklusive Sommerzeit — nur mit der eingebauten
Intl-API, keine neue Dependency.

**PARTNER_A/PARTNER_B** sind im Schema keine festen Rollen. Als
Konvention festgelegt: Registrierungsreihenfolge beim Setup (wer sich
zuerst per Invite-Code registriert, ist PARTNER_A). Kein Schema
nötig, keine Rückfrage, reine Implementierungsentscheidung wie schon
bei Monatsstart.

Materialisierer läuft jetzt über `instrumentation.ts` als zweite
Hintergrundschleife neben dem Zusteller: einmal sofort beim
Serverstart, danach täglich 03:00, plus sofort nach Anlegen/Ändern
eines Termins (alte offene Jobs löschen, neu materialisieren — PLAN.md
4.1).

Ausführlich per curl gegen die echte DB getestet, inklusive der drei
DoD-kritischen Fälle aus PLAN.md 5:
- **Zeitzonen-Test bestanden:** Geburtstag am 1. März (jährlich,
  ganztägig) erscheint in der März-Abfrage, nicht am 28. Februar.
- **Monatsklemmung ohne Drift:** Termin am 31. läuft Aug 31 → Sep 30
  (geklemmt, September hat nur 30 Tage) → Okt 31 (zurück auf 31, kein
  dauerhaftes Kleben am 30. wie bei einer naiven "+1 Monat auf letztes
  Vorkommen"-Implementierung).
- Wöchentlich und monatlich über 3 Monate ergaben die erwartete
  Anzahl Vorkommen.
- `betrifft=PARTNER_A` erzeugte `ReminderJob`-Zeilen nur für einen
  Nutzer (per DB-Query geprüft).
- Aussetzen (ein Datum übersprungen, Rest der Serie bleibt) und
  Beenden (serienEnde ab heute, Zukunft verschwindet) beide verifiziert.

Ein beim Testen aufgefallenes „M�ll raus" stellte sich als reines
Encoding-Artefakt der Bash-Tool-Kommandozeile unter Windows heraus
(Umlaut direkt im Shell-Befehl), nicht als App-Bug — mit einer
UTF-8-Datei statt Inline-String erneut getestet, „Müll raus (Test)"
kam korrekt zurück. Für künftige Tests mit Umlauten: `--data-binary
@datei.json` statt Umlaute direkt im Bash-Befehl.

**Noch nicht getestet:** Kalender im Browser (nur curl bisher), und ob
die materialisierten ReminderJobs tatsächlich als Push ankommen (der
Zusteller aus Stufe 0 sollte sie automatisch abholen, aber nicht
explizit für Kalender-Erinnerungen beobachtet).

### 2026-08-26 (Fortsetzung) — Stufe 1: Töpfe
Auf Wunsch von Chris den Drei-Tage-Handy-DoD zurückgestellt (Tailscale-
Login war schon gestartet, siehe „Nächster Schritt") und stattdessen
mit Stufe 1 weitergemacht: Töpfe anlegen/archivieren, Buchungen
erfassen (Quick-Add direkt in der Topf-Liste), Umbuchen (zwei
Buchungen, gemeinsame `transferId`), Fortschrittsbalken + nötige
Monatsrate bei Sparzielen, Monatsstart-Aktion. Liste pollt alle 10s.

„Übliche Beträge" für Monatsstart sind nirgends in PLAN.md 3
spezifiziert (kein `Regel`-Modell, bewusst laut 4.2) — als Konvention
implementiert: Vorschlag ist der zuletzt gebuchte Betrag einer
`Buchung` mit `notiz: "Monatsstart"` im selben Topf. Kein Schema
nötig, keine Rückfrage, da reine Implementierungsentscheidung.

Zwei eigene Bugs gefunden und gefixt, bevor Chris testen musste:
(1) Ein Client Component importierte versehentlich aus dem
Prisma-nutzenden `lib/toepfe.ts`, zog dadurch `pg`/`tls`/`net` in den
Browser-Bundle und ließ den Build scheitern — reine Funktionen nach
`lib/toepfe-shared.ts` ausgelagert (keine Server-Importe, darf von
Client Components importiert werden). (2) Die Buchungen-API gab über
`include: { vonUser: true }` den kompletten User inklusive
`passwordHash` zurück — auf `select: { id, name }` eingeschränkt.

**Stolperfalle für die nächste Instanz:** `npm run build` und
`npm run dev` dürfen nicht gleichzeitig auf denselben `.next`-Ordner
zugreifen — sonst korrumpiert der Build den laufenden Dev-Server
(ENOENT auf `_buildManifest.js.tmp.*`, Seite lädt bei Chris nicht
mehr). Ist in dieser Session zweimal passiert. Vor jedem
`npm run build`-Testlauf den Dev-Server stoppen, danach `.next`
löschen und den Dev-Server sauber neu starten.

Gegen die echte lokale DB getestet (curl, danach Testdaten gelöscht):
Topf anlegen, Buchung, Umbuchung (Summe über beide Töpfe bleibt
korrekt), Monatsstart-Vorschlag greift den letzten Betrag auf. Noch
**nicht** im Browser durchgeklickt — das ist der nächste Schritt.

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

**Push-Test im Browser erfolgreich.** Vorher zwei Stolperer: (1) der
Next-Dev-Server lief parallel zu einem `npm run build`-Lauf im selben
`.next`-Ordner und geriet dadurch durcheinander (Manifest-Fehler,
Seite lud bei Chris nicht) — sauberer Neustart mit gelöschtem `.next`
behoben. (2) „Push aktivieren" scheiterte mit „Registration failed -
push service error" — Chris' Adblocker blockierte `fcm.googleapis.com`,
Googles Push-Zustelldienst. Im Inkognito-Fenster (als Ausweichversuch)
kam stattdessen „Benachrichtigungen wurden nicht erlaubt" — Chrome
blockt Notification-Permission-Prompts in Inkognito standardmäßig
ohne sichtbaren Dialog. Lösung: normales Fenster, Adblocker für die
Seite pausiert, danach lief die Test-Benachrichtigung nach 2 Minuten
zuverlässig durch.

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
