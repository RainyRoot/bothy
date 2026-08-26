# PROGRESS.md

**Stand:** Stufe 0 — Repo steht, Code-Gerüst fehlt noch
**Letzte Aktualisierung:** 2026-08-26
**Branch:** `dev`

---

## Nächster Schritt

Next.js 15 mit TypeScript und Tailwind aufsetzen, Prisma
initialisieren, `docker-compose.yml` (app + postgres + caddy),
`.env.example`, `.gitignore`. Committen und pushen.

---

## Stufen

- [ ] **Stufe 0 — Gerüst & Push-Beweis**
  - [ ] Repo, Next.js, Prisma, Docker Compose
  - [ ] Schema aus `PLAN.md` Abschnitt 3, erste Migration
  - [ ] Auth: Invite-Code beim Setup, danach Passkeys
  - [ ] PWA-Manifest, Service Worker, VAPID-Keys, Subscription-Handling
  - [ ] Button „Test-Benachrichtigung in 2 Minuten"
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
