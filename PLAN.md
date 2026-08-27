# PLAN.md — Bothy

Gemeinsame App für zwei Nutzer: Kalender mit Erinnerungen, Geldtöpfe,
Essensplan und Einkaufsliste, später eine Todo-Liste.

> *Bothy* — eine einfache, unverschlossene Hütte in den schottischen Bergen,
> die sich Wanderer teilen. Ein kleiner gemeinsamer Unterschlupf für zwei.
> Repo: `RainyRoot/bothy`, Branch `dev`.

---

## 1. Rahmen

| | |
|---|---|
| Nutzer | genau 2, beide Android (Samsung) |
| Plattform | PWA, installiert über Chrome / Samsung Internet |
| Apple | **out of scope**, bewusst |
| Stack | Next.js 15 (App Router), TypeScript, Prisma, PostgreSQL, Tailwind |
| Betrieb | Docker Compose: `app` + `postgres` + `caddy` |
| Hosting | **NAS + Tailscale** jetzt, Umzug auf Hetzner CX22 später bei Bedarf (siehe unten und `PROGRESS.md`) |
| Push | Web Push (VAPID) → FCM, serverseitig geplant |

### Hosting: NAS + Tailscale, Hetzner bleibt der spätere Weg

Entscheidung 2026-08-27 (siehe `PROGRESS.md`): Betrieb läuft auf dem
NAS, Geräte-Zugriff über Tailscale (`tailscale cert` liefert ein
gültiges Zertifikat — Pflicht, siehe Fallen). Play Store lohnt für
zwei Nutzer laut Abschnitt 8 ohnehin nicht, Sideload reicht.

Nichts im Setup ist anbieterspezifisch, damit der Weg offen bleibt:
Umzug auf Hetzner ist bei Bedarf nur `docker compose up` plus DNS,
kein zweiter Codestand.

---

## 2. Nicht-Ziele (v1)

Explizit draußen, damit es draußen bleibt:

- iOS / Safari
- Bank-Synchronisation (PSD2, FinTS, Beleg-OCR)
- **Verschobene** Einzeltermine einer Serie („dieser eine Termin ist zwei Tage später"). Einen Serientermin *ausfallen lassen* geht dagegen — siehe 4.3
- Wochenansicht mit Stundenraster, Drag & Drop
- ICS-Export
- Rezeptdatenbank, Nährwerte, Mengenumrechnung
- Auswertungen, Charts, Monatsberichte
- Mehr als zwei Nutzer, Rollen, Rechte
- Automatischer Monatsabschluss der Töpfe (bewusst manuell, siehe 4.2)

---

## 3. Datenmodell

```prisma
// ---------- Nutzer & Push ----------

model User {
  id            String             @id @default(cuid())
  name          String
  createdAt     DateTime           @default(now())
  buchungen     Buchung[]
  subscriptions PushSubscription[]
  jobs          ReminderJob[]
}

model PushSubscription {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  endpoint  String    @unique
  p256dh    String
  auth      String
  createdAt DateTime  @default(now())
  lastOkAt  DateTime?
}

// ---------- Töpfe ----------

enum TopfTyp {
  VERBRAUCH   // Einkaufsgeld, Taschengeld
  SPARZIEL    // Umzug, Tattoo
}

model Topf {
  id         String    @id @default(cuid())
  name       String
  typ        TopfTyp
  zielCent   Int?      // nur bei SPARZIEL
  zielDatum  DateTime? // nur bei SPARZIEL
  farbe      String
  sortierung Int       @default(0)
  archiviert Boolean   @default(false)
  buchungen  Buchung[]
}

model Buchung {
  id         String   @id @default(cuid())
  topfId     String
  topf       Topf     @relation(fields: [topfId], references: [id], onDelete: Cascade)
  betragCent Int      // signed: + Zufluss, − Ausgabe. NIEMALS Float.
  datum      DateTime @db.Date
  notiz      String?
  vonUserId  String
  vonUser    User     @relation(fields: [vonUserId], references: [id])
  transferId String?  // zwei Buchungen mit gleicher transferId = Umbuchung
  createdAt  DateTime @default(now())

  @@index([topfId, datum])
  @@index([transferId])
}

// ---------- Kalender ----------

enum Rhythmus {
  KEINE
  WOECHENTLICH
  MONATLICH
  JAEHRLICH
}

enum Betrifft {
  PARTNER_A
  PARTNER_B
  BEIDE
}

model Termin {
  id           String             @id @default(cuid())
  titel        String
  ganztags     Boolean            @default(false)
  start        DateTime           // UTC. Bei ganztags: 00:00 UTC des Datums.
  ende         DateTime?
  ort          String?
  notiz        String?
  farbe        String?
  betrifft     Betrifft           @default(BEIDE)
  rhythmus     Rhythmus           @default(KEINE)
  serienEnde   DateTime?          // Serie läuft ab hier nicht weiter
  archiviert   Boolean            @default(false) // ausgeblendet, Historie bleibt
  erinnerungen TerminErinnerung[]
  ausnahmen    TerminAusnahme[]
  jobs         ReminderJob[]
  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt

  @@index([start])
}

model TerminErinnerung {
  id            String @id @default(cuid())
  terminId      String
  termin        Termin @relation(fields: [terminId], references: [id], onDelete: Cascade)
  minutenVorher Int    // 0 | 15 | 60 | 1440 | 2880 | 4320 | 10080 (um 2/3 Tage erweitert, siehe 4.4)
}

model TerminAusnahme {
  id       String   @id @default(cuid())
  terminId String
  termin   Termin   @relation(fields: [terminId], references: [id], onDelete: Cascade)
  datum    DateTime @db.Date // dieser eine Serientermin fällt aus

  @@unique([terminId, datum])
}

// terminId/todoId: genau eines von beiden ist gesetzt, nie beide, nie
// keines — von den Materialisierern garantiert, nicht per DB-Constraint
// (gleiches Muster wie Buchung.transferId: eine Tabelle statt zwei fast
// identischer, damit der Zusteller nur eine Queue abarbeitet).
model ReminderJob {
  id       String    @id @default(cuid())
  terminId String?
  termin   Termin?   @relation(fields: [terminId], references: [id], onDelete: Cascade)
  todoId   String?
  todo     Todo?     @relation(fields: [todoId], references: [id], onDelete: Cascade)
  userId   String
  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  dueAt    DateTime
  sentAt   DateTime?
  versuche Int       @default(0)
  fehler   String?

  @@unique([terminId, todoId, userId, dueAt])
  @@index([dueAt, sentAt])
}

// ---------- Todo-Liste ----------

enum TodoPrioritaet {
  NIEDRIG
  NORMAL
  HOCH
}

model Todo {
  id           String           @id @default(cuid())
  text         String
  prioritaet   TodoPrioritaet   @default(NORMAL) // feste Farbe je Stufe, keine Frei-Farbwahl
  erledigt     Boolean          @default(false)
  faelligkeit  DateTime?        @db.Date         // optional, ganztägig gedacht — keine Uhrzeit
  betrifft     Betrifft         @default(BEIDE)  // gleiche Konvention wie bei Termin
  erinnerungen TodoErinnerung[]
  jobs         ReminderJob[]
  sortierung   Int              @default(0)
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  @@index([faelligkeit])
}

model TodoErinnerung {
  id            String @id @default(cuid())
  todoId        String
  todo          Todo   @relation(fields: [todoId], references: [id], onDelete: Cascade)
  minutenVorher Int    // 0 | 1440 | 2880 | 4320 | 10080 — nur Tagesbasis, Todos haben keine Uhrzeit
}
```

### Stände werden gerechnet, nicht gespeichert

Topfstand = `SUM(betragCent)`. Kein `aktuellerStand`-Feld.
Sonst driftet der Wert nach der dritten Umbuchung und lässt sich
nicht rekonstruieren.

---

## 4. Kernmechanik

### 4.1 Erinnerungs-Pipeline

Zwei Cron-Läufe, beide im `app`-Container:

**Materialisierer — täglich 03:00**
Für jeden Termin (auch Serien) die Trigger-Zeitpunkte der nächsten
**60 Tage** ausrechnen und als `ReminderJob`-Zeilen anlegen.
`@@unique([terminId, userId, dueAt])` macht den Lauf idempotent —
er darf beliebig oft laufen. Serien werden dadurch nie „unendlich"
materialisiert.

**Zusteller — alle 60 Sekunden**

```sql
SELECT * FROM "ReminderJob"
WHERE "dueAt" <= now() AND "sentAt" IS NULL
ORDER BY "dueAt"
FOR UPDATE SKIP LOCKED
LIMIT 50;
```

Push senden → `sentAt` setzen. Bei Fehler `versuche++` und `fehler`
füllen. Ab 5 Versuchen aufgeben. `410 Gone` von FCM → Subscription löschen.

Vorteile: übersteht Neustarts, doppelt gesendete Pushes ausgeschlossen,
und ein Blick in die Tabelle zeigt sofort, ob etwas hängt.

**Beim Speichern/Ändern/Löschen eines Termins:** alle zugehörigen
`ReminderJob`s mit `sentAt IS NULL` löschen, danach Materialisierer
für diesen Termin einmal laufen lassen.

### 4.2 Töpfe — Monatsablauf ist manuell

Kein Automatismus, kein `Regel`-Model in v1. Stattdessen eine
**„Monatsstart"-Aktion**: ein Screen, der die üblichen Beträge
vorausfüllt (Einkaufsgeld, Taschengeld je Person), die beide noch
anpassen können, und der beim Bestätigen die Buchungen in einem Rutsch
schreibt. Manuell, aber zwei Taps statt fünf Formularen.

Der Rest vom Vormonat bleibt einfach stehen, bis ihr ihn selbst
umbucht — genau so gewollt.

### 4.3 Wiederholungen

Genau vier Fälle: `KEINE`, `WOECHENTLICH`, `MONATLICH`, `JAEHRLICH`.
Keine RRULE-Bibliothek.

**Eine Serie ist genau eine Zeile in `Termin`.** Nicht 30 Zeilen für
30 Jahre Geburtstag. Was materialisiert wird, sind ausschließlich die
`ReminderJob`s der nächsten 60 Tage — und die hängen per Cascade an
der Serie.

Daraus folgen drei Aktionen im UI, alle in einem Schritt:

| Wunsch | Aktion | Wirkung |
|---|---|---|
| „Den Geburtstag will ich gar nicht mehr" | **Löschen** | Eine Zeile weg, Cascade räumt Erinnerungen und offene Jobs mit ab. Vergangenheit ebenfalls weg. |
| „Ab jetzt nicht mehr, aber die alten Einträge sollen bleiben" | **Beenden** → `serienEnde = heute` | Zukunft verschwindet, Historie bleibt sichtbar. |
| „Nur dieses Jahr fällt aus" | **Termin aussetzen** → Zeile in `TerminAusnahme` | Genau dieses Datum wird übersprungen, Serie läuft weiter. |

Der Materialisierer filtert `archiviert`, respektiert `serienEnde` und
überspringt jedes Datum aus `TerminAusnahme`. Die Monatsansicht
verwendet dieselbe Funktion — eine Quelle der Wahrheit, sonst zeigt der
Kalender Termine an, für die es keine Erinnerung gibt.

**Warum „aussetzen" drin ist, „verschieben" aber nicht:** Ein Datum in
eine Skip-Liste zu schreiben sind rund 15 Zeilen. Eine verschobene oder
inhaltlich geänderte Einzelinstanz braucht dagegen vollständige
Override-Zeilen mit allen Feldern, Identität über die Zeit und eine
Auflösungs-Reihenfolge — das ist die eigentliche RRULE-Komplexität.
Verschieben bleibt: Serie aussetzen + Einzeltermin anlegen.

Monatlich am 29./30./31.: auf den **letzten Tag des Monats** klemmen,
nicht in den Folgemonat überlaufen lassen.

### 4.4 Todo-Liste

Einfache Aufgabenliste, bewusst ohne Wiederholung — das deckt der
Kalender schon ab (z.B. "Müll raus" als wöchentlicher Termin). Ein
Todo ist ein einmaliger Eintrag: Text, Priorität (`NIEDRIG`/`NORMAL`/
`HOCH`, feste Farbe je Stufe statt freier Farbwahl), optionales
Fälligkeitsdatum, `betrifft` wie bei Terminen.

**Erinnerungen laufen über dasselbe `ReminderJob` wie der Kalender**
(siehe 4.1) — `ReminderJob.terminId`/`.todoId` sind jetzt beide
optional, genau eines ist gesetzt. Der Zusteller bleibt eine einzige
Queue. Weil ein Todo weder Serie noch Uhrzeit hat, ist seine
Materialisierung trivial gegenüber `expandiereTermin`: keine
Wiederholung zu expandieren, nur `dueAt = faelligkeit − minutenVorher`
je gewählter Erinnerung und je betroffenem Nutzer — läuft im selben
Materialisierer-Zeitfenster mit (täglich 03:00 + sofort nach Ändern),
braucht aber keine 60-Tage-Vorschau, weil es keine Zukunft zu
expandieren gibt.

Die Vorlaufzeiten-Liste ist bei dieser Gelegenheit um **2 Tage** und
**3 Tage vorher** erweitert — für Termine *und* Todos (siehe
`TerminErinnerung`/`TodoErinnerung`-Kommentare in Abschnitt 3). Bei
Todos stehen nur die Tagesstufen zur Wahl (Fälligkeitstag/1/2/3
Tage/1 Woche vorher), da es keine Uhrzeit gibt, an der "15 Minuten
vorher" etwas bedeuten würde.

Erledigte Todos bleiben durchgestrichen sichtbar (wie abgehakte
Einkaufslisten-Einträge), bis sie gelöscht werden — keine Historie,
kein `archiviert`-Feld nötig.

---

## 5. Stufen

### Stufe 0 — Gerüst & Push-Beweis

Auth (Invite-Code beim Setup, danach Passkeys), Prisma-Schema,
Compose-Setup, PWA-Manifest, Service Worker, VAPID-Keys,
Subscription-Handling.

**Definition of Done**
Ein Button „Test-Benachrichtigung in 2 Minuten" liefert zuverlässig
auf **beiden** Handys — bei geschlossener App, nach 30 Minuten Standby,
an drei aufeinanderfolgenden Tagen.

> Das ist der wichtigste DoD im ganzen Dokument. Erst wenn der steht,
> wird ein Feature gebaut. Wenn Push auf euren Geräten nicht sauber
> läuft, ändert sich der ganze Plan — und das will man am Anfang wissen,
> nicht in Stufe 2.

### Stufe 1 — Töpfe

Töpfe anlegen/bearbeiten/archivieren, Buchungen erfassen, Umbuchen,
Fortschrittsbalken bei Sparzielen, „Monatsstart"-Aktion.

**Definition of Done**
- Beide sehen dieselben Stände, Änderung des einen ist beim anderen ohne Reload nach spätestens 30 s sichtbar
- Ausgabe erfassen dauert auf dem Handy unter 10 Sekunden
- Umzug- und Tattoo-Topf zeigen Ziel, Rest und — bei gesetztem Zieldatum — die nötige Monatsrate
- Umbuchung erzeugt zwei Zeilen mit gemeinsamer `transferId`, Summe über alle Töpfe bleibt unverändert

### Stufe 2 — Kalender

Termin-CRUD mit Wiederholung und Erinnerungen, Monatsraster,
Agenda-Liste, Geburtstage.

**Definition of Done**
- Termin mit zwei Erinnerungen (1 Tag / 1 Stunde vorher) — beide kommen pünktlich an
- Wöchentlicher und monatlicher Termin erscheinen korrekt über drei Monate hinweg
- Ein Geburtstag im März wird nicht am 28. Februar angezeigt (Zeitzonen-Test)
- `betrifft = PARTNER_A` schickt Push nur an eine Person

### Stufe 3 — Essensplan & Einkaufsliste

Wochenplan, Einkaufsliste aggregiert die Zutaten, offline abhakbar,
Einkaufsbetrag geht mit einem Tap als Buchung in den Einkaufsgeld-Topf.

**Definition of Done**
- Liste im Supermarkt ohne Netz abhakbar, synct beim nächsten Netz automatisch (Background Sync)
- Der Weg Essensplan → Liste → Buchung ist geschlossen, ohne Doppeleingabe

### Stufe 4 — Todo-Liste

Einmalige Aufgaben mit Priorität (fest gefärbt: Niedrig/Normal/Hoch),
optionalem Fälligkeitsdatum, Erinnerungen und Zuweisung (`betrifft`)
wie beim Kalender. Siehe 4.4 für die Mechanik.

**Definition of Done**
- Todo mit Fälligkeit und einer Erinnerung (z.B. 2 Tage vorher) — Push kommt pünktlich an
- `betrifft = PARTNER_B` schickt die Erinnerung nur an eine Person
- Priorität ist auf einen Blick an der Farbe erkennbar, ohne die Karte zu öffnen
- Erledigtes bleibt bis zum Löschen sichtbar (durchgestrichen), verschwindet nicht automatisch

---

## 6. Bekannte Fallen

| Falle | Gegenmaßnahme |
|---|---|
| Service Worker brauchen einen secure context — `192.168.x.x` reicht **nicht** | Echtes Zertifikat, auch lokal (Tailscale oder Caddy DNS-01). Self-signed hilft auf Android nicht. |
| Samsung One UI legt Apps schlafen → Push kommt verspätet oder nie | Beim Setup einmalig Akku-Optimierung für den Browser deaktivieren. In die Setup-Anleitung schreiben. |
| Beträge als Float | Ausnahmslos Integer-Cent. Formatierung nur in der Anzeige. |
| Ganztägige Termine als Timestamp | `@db.Date`, oder 00:00 UTC. Sonst springen Geburtstage in der Sommerzeit einen Tag zurück. |
| Zeitzonen | Speichern in UTC, Anzeige in `Europe/Berlin`. Keine lokalen Zeiten in der DB. |
| Doppelte Pushes nach Neustart | `@@unique([terminId, userId, dueAt])` + `sentAt`-Flag. |
| Tote Push-Subscriptions | `410 Gone` von FCM → Zeile löschen. Sonst wächst die Fehlerrate still. |
| Scope Creep, weil Code billig ist | Abschnitt 2 ist verbindlich. Neue Idee → Backlog, nicht in die laufende Stufe. |

---

## 7. Betrieb

- **Backup:** `pg_dump` täglich, verschlüsselt, auf ein zweites Ziel (Storage Box / NAS). Einmal im Quartal einen Restore testen — ein ungetestetes Backup ist kein Backup.
- **Härtung:** SSH nur mit Key, ufw, fail2ban, unattended-upgrades.
- **Secrets:** VAPID-Keys und DB-Passwort über `.env`, nicht im Repo.
- **Logs:** Zustellfehler der Push-Pipeline sichtbar machen (einfache Adminseite reicht) — sonst merkt man wochenlang nicht, dass Erinnerungen ausfallen.

---

## 8. Später — Play Store (nach Stufe 3, optional)

Der Weg PWA → Play Store läuft über eine **TWA** (Trusted Web Activity),
gebaut mit Bubblewrap. Kein zweiter Codestand: das APK ist eine Hülle
um dieselbe URL.

Was dafür jetzt schon richtig entschieden werden muss:

- **Öffentliche Domain nötig.** Eine TWA verifiziert sich über
  `/.well-known/assetlinks.json`, das Google von außen abrufen können
  muss. Ein NAS hinter Tailscale kann das nicht. Wer den Play-Store-Pfad
  offenhalten will, hostet auf Hetzner.
- **Stabiler Origin.** Nach der Verifizierung ist die Domain fest
  verdrahtet. Domain jetzt wählen, nicht später wechseln.
- Alles bleibt Progressive Web App — Bubblewrap kommt erst am Ende dazu.

Die Hürde ist nicht die Technik, sondern Googles Freigabeprozess:
<cite index="27-1">Persönliche Entwicklerkonten, die nach dem 13. November 2023 angelegt wurden, müssen einen Closed Test mit mindestens 12 Testern fahren, die 14 Tage durchgehend angemeldet sind, bevor sie Produktionszugang beantragen können.</cite>
<cite index="31-1">Organisationskonten mit D-U-N-S-Nummer sind davon ausgenommen, die Verifizierung dauert allerdings zwei bis vier Wochen.</cite>
Dazu 25 $ einmalige Registrierung.

Für eine App, die zwei Leute benutzen, ist das der falsche Aufwand.
**Der Play Store ergibt erst Sinn, wenn ihr die App wirklich
veröffentlichen wollt.** Bis dahin: Bubblewrap-APK bauen und per
Sideload installieren — gleiches Ergebnis auf euren Geräten, null Bürokratie.

---

## 9. Offen

- Farbschema / Icon
- Domain (erst nötig, falls/wenn Richtung Play Store — siehe 8)
