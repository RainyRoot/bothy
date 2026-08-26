# CLAUDE.md

Arbeitsvereinbarung für **Bothy**. Gilt für jede Claude-Instanz, die in
diesem Repo arbeitet.

---

## Als Erstes

1. **`PROGRESS.md` lesen.** Da steht, wo das Projekt steht und was der
   nächste Schritt ist. Nicht raten, nicht neu anfangen.
2. `PLAN.md` ist die Spezifikation. Sie ist verbindlich — besonders
   Abschnitt 2 (Nicht-Ziele).
3. `git branch --show-current` prüfen. Muss `dev` sein.

## Als Letztes in jeder Session

`PROGRESS.md` aktualisieren: Stand, nächster Schritt, neue Entscheidungen,
Session-Log-Eintrag. Dann committen und pushen.

---

## Git

- **Nur `dev`.** Keine Feature-Branches, kein `main`, keine Merges.
- **Nach jedem abgeschlossenen Schritt committen und pushen** — auch bei
  Kleinigkeiten. Lieber zwanzig kleine Commits als einer am Abend.
  „Abgeschlossen" heißt: das Projekt baut und der Stand ist beschreibbar.
- Nie `--force`, nie `push --force-with-lease`, nie History umschreiben.
- Secrets gehören nicht ins Repo. `.env` steht in `.gitignore`,
  `.env.example` wird gepflegt.

Commit-Format:

```
<typ>: <was, in einem Satz, deutsch>

<optional: warum, wenn nicht offensichtlich>
```

Typen: `feat`, `fix`, `refactor`, `chore`, `docs`, `schema`, `wip`.
`wip` ist erlaubt und erwünscht — ein unfertiger Stand im Repo ist besser
als ein fertiger auf einem Laptop.

---

## Harte Regeln

Diese sind nicht verhandelbar. Verstöße sind Bugs, keine Stilfragen.

| Regel | Warum |
|---|---|
| Geldbeträge **immer** `Int` in Cent | Float rundet, und zwar irgendwann falsch |
| Zeitstempel **immer** UTC in der DB, `Europe/Berlin` nur zur Anzeige | sonst Sommerzeit-Bugs, die man erst im März merkt |
| Ganztägige Termine als `@db.Date` | sonst springt ein Geburtstag einen Tag zurück |
| Topfstände werden gerechnet (`SUM`), nie gespeichert | ein Cache-Feld driftet und ist nicht rekonstruierbar |
| Eine Serie ist **eine** Zeile in `Termin` | siehe PLAN.md 4.3 |
| Erinnerungen werden **serverseitig** geplant | ein Client, der zu ist, plant nichts |
| Kalenderansicht und Materialisierer nutzen **dieselbe** Expansionsfunktion | sonst gibt es Termine ohne Erinnerung |

## Sonstiges

- Keine neuen Dependencies ohne Rückfrage bei Chris. Der Stack steht in
  `PLAN.md` Abschnitt 1.
- Schemaänderungen nur über `prisma migrate dev`, nie `db push`. Das
  Migrationsfile gehört in den Commit.
- Neue Idee, die nicht in `PLAN.md` steht → Backlog in `PROGRESS.md`,
  **nicht** in die laufende Stufe. Scope Creep ist hier das Hauptrisiko,
  nicht Tempo.
- Eine Stufe gilt erst als fertig, wenn ihre Definition of Done aus
  `PLAN.md` Abschnitt 5 **auf echten Geräten** erfüllt ist. Nicht im
  Emulator, nicht „müsste gehen".

## Befehle

```bash
npm run dev              # Entwicklungsserver
npx prisma migrate dev   # Schemaänderung + Migration
npx prisma studio        # DB anschauen
npm run lint             # vor jedem Commit
docker compose up -d     # lokaler Stack (app + postgres + caddy)
```
