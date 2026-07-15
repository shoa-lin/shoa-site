---
translationKey: "getting-started-with-loops"
locale: "de"
title: "Einstieg in Claude-Code-Loops: Von manuellen Turns zu proaktiven Schleifen"
description: "Wie turn-, ziel-, zeitbasierte und proaktive Loops ausgelöst und beendet werden – und wann welcher Typ sinnvoll ist."
publishedAt: "2026-07-07"
updatedAt: "2026-07-16"
category: "development"
sourceLocale: "en"
sourceUrl: "https://claude.com/blog/getting-started-with-loops"
sourceAuthor: "Delba de Oliveira, Michael Segner"
contentType: "adaptation"
translationStatus: "reviewed"
---

![Titelbild zum Einstieg in Loops](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6903d229e73ca2d0d73d78f7_682ac293884c9d4ee4ebe2355a2f6c4ecfdd9c1b-1000x1000.svg)

---

Derzeit wird viel darüber gesprochen, „Loops zu entwerfen“, statt einem Coding-Agenten einfach Prompts zu geben. Wer auf X kurz nach einer eindeutigen Definition sucht, findet mehrere verschiedene Antworten.

Für das Claude-Code-Team ist ein Loop ein Agent, der Arbeitszyklen wiederholt, bis eine Abbruchbedingung erfüllt ist. Das Team unterscheidet Loop-Typen anhand mehrerer Dimensionen:

1. Wie der Loop ausgelöst wird.
2. Wie er endet.
3. Welches Claude-Code-Primitive er verwendet.
4. Für welche Aufgaben er sich am besten eignet.

Dieser Artikel behandelt die wichtigsten Loop-Typen, ihren jeweiligen Einsatz und den Erhalt der Codequalität bei kontrollierter Token-Nutzung. Nicht jede Aufgabe benötigt einen komplexen Loop. Beginne mit der einfachsten Lösung und setze die Muster nur dort ein, wo sie wirklich passen.

## Vier Arten von Loops

Der Originalartikel beschreibt vier Kategorien: turn-basierte, zielbasierte, zeitbasierte und proaktive Loops. Sie unterscheiden sich nicht nur im Grad der Automatisierung. Jeder Typ besitzt einen eigenen Auslöser, eine eigene Abbruchbedingung und eine eigene Aufgabengrenze.

### Turn-basierter Loop

![Diagramm eines turn-basierten Loops](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a43eb603762e725a739d98c_8ace2295.png)

- **Ausgelöst durch**: einen Nutzer-Prompt.
- **Abbruchbedingung**: Claude entscheidet, dass die Aufgabe abgeschlossen ist oder mehr Kontext benötigt wird.
- **Am besten für**: kurze, einmalige Aufgaben außerhalb regelmäßiger Prozesse oder Zeitpläne.
- **Nutzung steuern durch**: präzise Prompts und bessere Verifikation mit Skills, um die Anzahl der Turns zu reduzieren.

Jeder Prompt startet einen manuellen Loop, in dem du jeden Turn steuerst. Claude sammelt Kontext, handelt, prüft die Arbeit, wiederholt bei Bedarf und antwortet. Das ist der agentische Loop aus dem Originalartikel.

Bitte Claude beispielsweise, einen Like-Button zu erstellen. Es liest den Code, nimmt die Änderung vor, führt Tests aus und liefert etwas zurück, das seiner Einschätzung nach funktioniert. Danach prüfst du das Ergebnis und schreibst den nächsten Prompt.

Dieser Verifikationsschritt lässt sich verbessern, indem du deine manuellen Prüfungen in `SKILL.md` kodifizierst. So kann Claude mehr seiner Arbeit selbstständig Ende-zu-Ende prüfen. Hinweise zur Wahl zwischen Skills, Hooks und Subagenten findest du unter [Steering Claude Code](https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more). Der Skill sollte Claude Werkzeuge oder Connectors geben, mit denen es das Ergebnis sehen, messen oder bedienen kann. Je quantitativer die Prüfungen sind, desto leichter kann Claude die eigene Arbeit verifizieren.

Ein Skill zur Frontend-Verifikation könnte so aussehen:

```markdown
---
name: verify-frontend-change
description: Verify any UI change end-to-end before declaring it done.
---

# Verifying frontend changes

Never report a UI change as complete based on a successful edit alone. Verify it the way a human reviewer would:

1. Start the dev server and open the edited page in the browser.
2. Interact with the change directly. For a new control (button, input, toggle): click it, confirm the expected state change, and screenshot before/after.
3. Check the browser console: zero new errors or warnings.
4. Use the Chrome DevTools MCP, run a performance trace and audit Core Web Vitals.

If any step fails, fix the issue and rerun from step 1 — do not hand back partially verified work.
```

Es geht nicht darum, einen universellen Skill zu schreiben, sondern die tatsächliche Definition von „fertig“ explizit zu machen. Andernfalls muss Claude selbst beurteilen, wann es aufhören soll.

### Zielbasierter Loop

![Diagramm eines zielbasierten Loops](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a43eb603762e725a739d98f_c6fa9ae5.png)

- **Ausgelöst durch**: einen manuellen Prompt in Echtzeit.
- **Abbruchbedingung**: Das Ziel ist erreicht oder die maximale Anzahl von Turns wurde ausgeschöpft.
- **Am besten für**: Aufgaben mit überprüfbaren Abschlusskriterien.
- **Nutzung steuern durch**: konkrete Erfolgskriterien und ein klares Turn-Limit, etwa „nach fünf Versuchen stoppen“.

Ein einzelner Turn reicht nicht immer aus, besonders bei komplexen Aufgaben. Agenten liefern meist bessere Ergebnisse, wenn sie iterieren dürfen. Mit `/goal` definierst du, wie „fertig“ aussieht, und gibst Claude mehr Raum, darauf hinzuarbeiten.

Sind die Erfolgskriterien festgelegt, muss Claude nicht selbst entscheiden, was „gut genug“ bedeutet, und beendet den Loop seltener zu früh. Jedes Mal, wenn Claude stoppen möchte, prüft ein Evaluatormodell die Bedingung. Ist sie nicht erfüllt, wird Claude zurück an die Arbeit geschickt, bis das Ziel erreicht oder das Turn-Limit ausgeschöpft ist.

Deterministische Kriterien funktionieren deshalb besonders gut: eine Zahl bestandener Tests, ein Schwellenwert oder eine leere Fehlerliste.

Zum Beispiel:

```text
/goal get the homepage Lighthouse score to 90 or above, stop after 5 tries.
```

Die zentrale Idee besteht darin, die Entscheidung über das Ende vom subjektiven Fertig-Gefühl des Agenten auf eine überprüfbare Bedingung zu verlagern.

### Zeitbasierter Loop

- **Ausgelöst durch**: ein festgelegtes Zeitintervall.
- **Abbruchbedingung**: Du brichst ihn ab oder die Arbeit endet, etwa wenn ein PR gemergt oder eine Warteschlange leer ist.
- **Am besten für**: wiederkehrende Arbeit oder Aufgaben mit externen Umgebungen und Systemen.
- **Nutzung steuern durch**: längere Intervalle oder ereignisbasierte Reaktionen statt Polling nach festem Takt.

Manche agentische Arbeit wiederholt sich: Die Aufgabe bleibt gleich, die Eingaben ändern sich. Ein Beispiel ist die morgendliche Zusammenfassung von Slack-Nachrichten. Andere Aufgaben hängen von externen Systemen ab, bei denen regelmäßiges Prüfen und Reagieren ein einfaches Interaktionsmodell bildet. Ein PR kann etwa neue Review-Kommentare erhalten oder in CI fehlschlagen.

Für solche Fälle kann `/loop` einen Prompt in einem Intervall erneut ausführen. Zum Beispiel:

```text
/loop 5m check my PR, address review comments, and fix failing CI
```

`/loop` läuft auf deinem Rechner und endet deshalb, wenn dieser ausgeschaltet wird. Soll der Loop in der Cloud laufen, lässt sich mit `/schedule` eine Routine erstellen.

Entscheidend ist, die Routine nicht häufiger auszuführen, als sich das zugrunde liegende System tatsächlich verändert. Eine Warteschlange, die sich einmal pro Stunde ändert, sollte nicht jede Minute Tokens für einen Scan verbrauchen.

### Proaktive Loops

![Diagramm eines proaktiven Loops](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a43eb603762e725a739d989_eb9e496a.png)

- **Ausgelöst durch**: ein Ereignis oder einen Zeitplan, ohne dass ein Mensch in Echtzeit anwesend ist.
- **Abbruchbedingung**: Jede Aufgabe endet, wenn ihr Ziel erreicht ist; die Routine selbst läuft weiter, bis du sie abschaltest.
- **Am besten für**: wiederkehrende Ströme klar definierter Arbeit, etwa Bug-Reports, Issue-Triage, Migrationen und Dependency-Upgrades.
- **Nutzung steuern durch**: Routinen an kleinere, schnellere Modelle leiten und das leistungsfähigste Modell für echte Ermessensentscheidungen reservieren.

Die bisherigen Primitive können zusammen mit weiteren Claude-Code-Fähigkeiten wie Auto Mode und Dynamic Workflows (Research Preview) Loops für lang laufende Arbeit bilden.

Für einen kontinuierlichen Strom eingehenden Feedbacks lassen sich beispielsweise folgende Fähigkeiten kombinieren:

1. Mit `/schedule` (Research Preview) eine Routine starten, die nach neuen Meldungen sucht.
2. Mit `/goal` definieren, wie „fertig“ aussieht, und mit Skills dokumentieren, wie es geprüft wird.
3. Dynamic Workflows einsetzen, um Agenten zu orchestrieren, die jede Meldung triagieren, den Fehler beheben und den Fix prüfen.
4. Auto Mode verwenden, damit die Routine nicht bei jedem Schritt für eine Freigabe anhält.

Zusammengesetzt könnte ein Prompt so aussehen:

```text
/schedule every hour: check #project-feedback for bug reports. /goal: don't stop until every report found this run is triaged, actioned, and responded to. When fixing a bug, use a workflow to explore three solutions in parallel worktrees and have a judge adversarially review them.
```

Es geht nicht darum, einen längeren Prompt zu schreiben. Es geht darum, Auslöser, Abbruchbedingungen, parallele Erkundung, Review und Berechtigungsgrenzen in einem Laufzeitsystem zusammenzuführen.

## Codequalität erhalten

Die Qualität der Loop-Ergebnisse hängt vom umgebenden System ab. Der Originalartikel betont mehrere Gestaltungsprinzipien:

1. **Die Codebasis sauber halten**: Claude folgt den vorhandenen Mustern und Konventionen. Eine unordentliche Codebasis liefert dem Loop unordentliche Muster, die er verstärkt.
2. **Claude die eigene Arbeit prüfen lassen**: Mit [Skills](https://code.claude.com/docs/en/skills) lässt sich kodifizieren, was für dich und dein Team gute Arbeit bedeutet.
3. **Dokumentation leicht zugänglich machen**: Framework- und Bibliotheksdokumentation enthält aktuelle Best Practices, auf die Claude zugreifen können muss.
4. **Einen zweiten Agenten für Code-Review verwenden**: Ein Reviewer mit frischem Kontext ist weniger voreingenommen und nicht durch die Überlegungen des Hauptagenten beeinflusst. Dafür eignen sich der eingebaute Skill `/code-review` oder GitHub [Code Review](https://code.claude.com/docs/en/code-review).

Wenn ein einzelnes Ergebnis unzureichend ist, sollte man nicht nach diesem einen Fix aufhören. Der Fehler gehört zurück ins System, damit jede spätere Iteration davon profitiert. Aus einem Fehler sollte ein Skill, Test, Skript, eine Regel oder ein Review-Raster werden – nicht nur ein einmaliger Patch.

## Token-Nutzung steuern

Loops brauchen klare Grenzen, damit die Token-Nutzung kontrollierbar bleibt. Die Empfehlungen des Originalartikels lassen sich so zusammenfassen:

1. **Das passende Primitive und Modell wählen**: Kleine Aufgaben brauchen weder mehrere Agenten noch komplexe Loops. Manche können günstigere, schnellere Modelle verwenden.
2. **Klare Erfolgs- und Abbruchkriterien definieren**: Je präziser sie sind, desto schneller erreicht Claude die Lösung, ohne zu früh aufzuhören.
3. **Vor großen Läufen pilotieren**: Dynamic Workflows können viele Agenten starten. Schätze den Verbrauch zuerst an einem kleinen Ausschnitt.
4. **Skripte für deterministische Arbeit verwenden**: Ein Skript auszuführen ist günstiger, als ein Modell dieselben Schritte jedes Mal neu durchdenken zu lassen. Ein PDF-Skill kann beispielsweise ein Formularskript enthalten, das Claude direkt ausführt, statt den Code neu zu schreiben.
5. **Routinen nicht häufiger als nötig ausführen**: Das Intervall sollte zur tatsächlichen Änderungsrate des beobachteten Systems passen.
6. **Nutzung prüfen**: `/usage` schlüsselt die jüngste Nutzung nach Skills, Subagenten und MCP auf; `/goal` ohne Argumente zeigt aktuelle Turn-Zahl und Token-Verbrauch; `/workflows` zeigt den Verbrauch jedes Agenten und erlaubt, ihn jederzeit zu stoppen.

Auch die Wahl von [Modell und Effort-Level](https://claude.com/blog/claude-model-and-effort-level-in-claude-code) gehört zu den größten Hebeln für die Kosten eines Loops.

Kurz gesagt: Ein Loop ist keine Methode, einen Agenten unbegrenzt laufen zu lassen. Er lässt den Agenten Arbeit innerhalb expliziter Grenzen wiederholen.

## Erste Schritte

Der Originalartikel endet mit einer Vergleichstabelle, die zeigt, welchen Teil der Arbeit man an den jeweiligen Loop abgibt:

| Loop | Was du abgibst | Wann du ihn nutzt | Geeignete Mittel |
| --- | --- | --- | --- |
| Turn-basiert | Die Prüfung | Du erkundest oder entscheidest | Eigene Verifikations-Skills |
| Zielbasiert | Die Abbruchbedingung | Du weißt, wie „fertig“ aussieht | `/goal` |
| Zeitbasiert | Den Auslöser | Die Arbeit geschieht außerhalb des Projekts nach Zeitplan | `/loop`, `/schedule` |
| Proaktiv | Den Prompt | Die Arbeit ist wiederkehrend und klar definiert | Alles oben Genannte plus Dynamic Workflows |

Um mit Loops zu beginnen, betrachte deine bestehende Arbeit. Wähle eine Aufgabe, bei der du selbst der Engpass bist, und frage: Kannst du die Verifikationsprüfung aufschreiben? Ist das Ziel klar genug, um den Abschluss zu beurteilen? Trifft die Arbeit nach Zeitplan oder durch externe Ereignisse ein?

Sobald du eine Idee hast, starte den Loop. Beobachte, wo er feststeckt oder über das Ziel hinausschießt, und entwickle das System weiter.

Weitere Informationen bieten die Claude-Code-Dokumentationen zu [parallelen Agenten](https://code.claude.com/docs/en/agents), [Loop](https://code.claude.com/docs/en/goal), [Schedule](https://code.claude.com/docs/en/routines), [Goal](https://code.claude.com/docs/en/goal) und [Dynamic Workflows](https://code.claude.com/docs/en/workflows#orchestrate-subagents-at-scale-with-dynamic-workflows).
