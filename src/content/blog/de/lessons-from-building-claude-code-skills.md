---
translationKey: "lessons-from-building-claude-code-skills"
locale: "de"
title: "Lektionen aus dem Aufbau von Claude Code: Wie wir Skills verwenden"
description: "Was das Claude Code-Team aus dem Entwerfen, Organisieren und Pflegen von Hunderten von Skills gelernt hat."
publishedAt: "2026-03-17"
updatedAt: "2026-07-16"
category: "development"
sourceLocale: "en"
sourceUrl: "https://x.com/trq212/status/2033949937936085378"
sourceAuthor: "Thariq Shihipar"
contentType: "adaptation"
translationStatus: "reviewed"
---

![Coverbild für Lektionen aus dem Aufbau von Claude Code: Wie wir Skills verwenden](https://pbs.twimg.com/media/HDl2jn9a0AAZkyz?format=jpg&name=small)

Skills sind zu einem der am häufigsten genutzten Erweiterungspunkte in Claude Code geworden. Sie sind flexibel, leicht herzustellen und einfach zu verteilen.

Diese Flexibilität macht es zugleich schwierig zu erkennen, was am besten funktioniert. Welche Arten von Skills lohnen sich? Was macht einen guten Skill aus? Und wann sollte man ihn mit anderen teilen?

Bei Anthropic verwenden wir Skills intensiv in Claude Code, mit Hunderten, die aktiv im Einsatz sind. Dies sind die Lektionen, die wir über die Nutzung von Skills zur Beschleunigung der Entwicklung gelernt haben.

---

## Was sind Skills?

Wenn Skills für Sie neu sind, beginnen Sie am besten mit der [Dokumentation](https://code.claude.com/docs/en/skills) oder dem aktuellen [Skilljar-Kurs zu Agent Skills](https://anthropic.skilljar.com/introduction-to-agent-skills). Dieser Artikel setzt eine gewisse Vertrautheit mit ihnen voraus.

Ein weit verbreitetes Missverständnis ist, dass Skills „nur Markdown-Dateien“ sind. Der interessante Teil ist, dass sie nicht bloß Textdateien sind: Sie sind Ordner, die Skripte, Assets, Daten und andere Ressourcen enthalten können, die ein Agent entdecken, erkunden und manipulieren kann.

In Claude Code bieten Skills außerdem [zahlreiche Konfigurationsoptionen](https://code.claude.com/docs/en/skills#frontmatter-reference), darunter dynamische Hooks.

Einige der interessantesten Skills nutzen diese Konfigurationsoptionen und ihre Ordnerstruktur kreativ.

---

## Arten von Skills

Nach der Katalogisierung unserer Skills stellten wir fest, dass sie sich in einige wiederkehrende Kategorien gruppieren. Die besten Skills passen klar in eine Kategorie; die verwirrenden erstrecken sich über mehrere. Dies ist keine endgültige Liste, aber es ist eine nützliche Art, darüber nachzudenken, was in Ihrem Unternehmen fehlen könnte.

![Diagramm der gängigen Skill-Kategorien](https://pbs.twimg.com/media/HDlvMmubEAIzF-N?format=jpg&name=small)

---

### 1. Bibliothek & API-Referenz

Skills, die erklären, wie eine Bibliothek, CLI oder ein SDK korrekt verwendet wird. Sie können interne Bibliotheken oder gängige Tools abdecken, mit denen Claude Code manchmal Schwierigkeiten hat. Diese Skills enthalten oft Beispielcode und eine Liste typischer Stolperfallen, die Claude beim Schreiben von Skripten vermeiden sollte.

**Beispiele:**

- **billing-lib** - Ihre interne Abrechnungsbibliothek: Randfälle, Stolperfallen und andere fehleranfällige Details
- **internal-platform-cli** - Jeder Unterbefehl in Ihrem internen CLI-Wrapper, mit Beispielen, wann man welchen Befehl verwendet
- **frontend-design** - Machen Sie Claude besser darin, Ihr Designsystem anzuwenden

---

### 2. Produktverifizierung

Skills, die erklären, wie sich testen oder überprüfen lässt, ob Code funktioniert. Sie werden oft mit externen Tools wie Playwright oder tmux kombiniert.

Verifizierungs-Skills sind äußerst nützlich, um die Korrektheit von Claudes Ausgabe sicherzustellen. Es kann sich lohnen, einen Engineer eine Woche lang daran arbeiten zu lassen, sie wirklich zuverlässig zu machen.

Betrachten Sie Techniken wie das Aufzeichnen eines Videos, damit Sie genau sehen können, was Claude getestet hat, oder das Durchsetzen programmatischer Assertions im Zustand bei jedem Schritt. Diese Fähigkeiten werden oft mit Skripten innerhalb des Skill implementiert.

**Beispiele:**

- **signup-flow-driver** - Führt die Anmeldung -> E-Mail-Verifizierung -> Onboarding in einem Headless-Browser aus, mit Hooks, die den Zustand bei jedem Schritt überprüfen
- **checkout-verifier** - Steuert die Checkout-Benutzeroberfläche mit Stripe-Testkarten und überprüft, ob die Rechnung im richtigen Zustand landet
- **tmux-cli-driver** - Testet interaktive CLIs, wenn der Workflow ein TTY erfordert

---

### 3. Datenerfassung & Analyse

Skills, die sich mit Daten- und Monitoring-Stacks verbinden. Sie können Bibliotheken zum Abrufen authentifizierter Daten, konkrete Dashboard-IDs und Anweisungen für gängige Workflows oder Abfragen enthalten.

**Beispiele:**

- **funnel-query** - Welche Ereignisse für Anmeldung -> Aktivierung -> Bezahlung zusammengeführt werden sollen, sowie die Tabelle, die die kanonischen `user_id` enthält
- **cohort-compare** - Vergleicht Retention oder Conversion zwischen zwei Kohorten, markiert statistisch signifikante Unterschiede und enthält Links zu Segmentdefinitionen
- **grafana** - Datenquellen-UIDs, Cluster-Namen und eine Problem-zu-Dashboard-Nachschlagetabelle

---

### 4. Geschäftsprozesse & Team-Automatisierung

Skills, die wiederkehrende Workflows in einen einzigen Befehl verwandeln. Ihre Anweisungen sind oft einfach, können jedoch von anderen Skills oder MCPs abhängen. Das Speichern früherer Ergebnisse in Protokolldateien kann dem Modell helfen, konsistent zu bleiben und vorherige Durchläufe einzubeziehen.

**Beispiele:**

- **standup-post** - Aggregiert einen Ticket-Tracker, GitHub-Aktivitäten und vorherige Slack-Beiträge in einem formatierten Standup, das nur Änderungen zeigt
- **create-<ticket-system>-ticket** - Erzwingt ein Schema mit gültigen Enum-Werten und Pflichtfeldern und führt dann die Post-Creation-workflow wie Benachrichtigung eines Prüfers und Verknüpfung des Tickets in Slack aus
- **weekly-recap** - Wandelt zusammengeführte PRs, geschlossene Tickets und Deployments in einen formatierten Rückblick-Post um

---

### 5. Code-Scaffolding & Vorlagen

Skills, die Framework-Boilerplate für eine bestimmte Funktion in einem Code-Repository erzeugen. Sie können natürliche Sprachführung mit zusammensetzbaren Skripten kombinieren, was besonders nützlich ist, wenn die Anforderungen für das Gerüst nicht vollständig im Code erfasst werden können.

**Beispiele:**

- **new-<framework>-workflow** - Erstellt ein neues Service-, workflow- oder Handler-Gerüst mit Ihren Anmerkungen
- **new-migration** - Stellt Ihre Migrationsvorlage und häufige Fallstricke bereit
- **create-app** - Erstellt eine interne App mit Authentifizierung, Logging und bereits konfigurierter Bereitstellung

---

### 6. Codequalität & Review

Skills, die die Codequalität innerhalb einer Organisation erzwingen und bei der Codeüberprüfung helfen. Sie können deterministische Skripte oder Tools für größere Robustheit enthalten und möglicherweise automatisch über Hooks oder GitHub Actions ausgeführt werden.

**Beispiele:**

- **adversarial-review** - Erzeugt ein frisches Subagent, um die Arbeit zu kritisieren, implementiert Korrekturen und wiederholt den Prozess, bis die Ergebnisse zu Haarspaltereien degenerieren
- **code-style** - Erzwingt Code-Stile, die Claude standardmäßig nicht gut handhabt
- **testing-practices** - Erklärt, wie man Tests schreibt und was getestet werden sollte

---

### 7. CI/CD & Deployment

Skills die beim Abrufen, Pushen und Bereitstellen von Code helfen. Sie können andere Skills aufrufen, um Daten zu sammeln.

**Beispiele:**

- **babysit-pr** - Überwacht einen PR -> wiederholt fehlerhafte CI -> löst Merge-Konflikte -> aktiviert Auto-Merge
- **deploy-<service>** - Baut -> führt Smoke-Tests durch -> rollt den Traffic nach und nach aus, während die Fehlerraten verglichen werden -> erfolgt ein Rollback bei Regression automatisch
- **cherry-pick-prod** - Erstellt ein isoliertes worktree -> führt Cherry-Picks durch -> löst Konflikte -> öffnet einen PR mit der richtigen Vorlage

---

### 8. Runbooks

Skills die ein Symptom wie einen Slack-Thread, eine Benachrichtigung oder eine Fehlersignatur aufnehmen, eine Untersuchung mit mehreren Werkzeugen durchführen und einen strukturierten Bericht erstellen.

**Beispiele:**

- **<service>-debugging** - Ordnet Symptome -> Werkzeuge -> Abfragemuster für stark frequentierte Dienste zu
- **oncall-runner** - Ruft die Benachrichtigung ab -> prüft die üblichen Verdächtigen -> formatiert die Ergebnisse
- **log-correlator** - Zieht bei gegebener Anforderungs-ID passende Logs aus allen Systemen, die damit in Berührung gekommen sein könnten

---

### 9. Infrastruktur-Operationen

Skills die routinemäßige Wartungs- und Betriebsverfahren durchführen. Einige beinhalten destruktive Aktionen und profitieren von starken Schutzmechanismen. Sie erleichtern es Ingenieuren, bewährte Verfahren während kritischer Operationen einzuhalten.

**Beispiele:**

- **<resource>-Waisen** - Findet verwaiste Pods oder Volumes -> postet in Slack -> wartet durch eine Einwirkungsphase -> fragt nach Benutzerbestätigung -> führt eine kaskadierende Bereinigung durch
- **Abhängigkeitsmanagement** - Implementiert die Abhängigkeitsgenehmigung der Organisation workflow
- **Kostenuntersuchung** - Untersucht, warum Speicher- oder Ausgangskosten gestiegen sind, mit den relevanten Buckets und Abfragemustern

---

## Tipps zur Erstellung von Skills

![Zusammenfassendes Grafik zu Tipps für das Erstellen von Skills](https://pbs.twimg.com/media/HDoKg58bEAAL1bw?format=jpg&name=small)

Sobald Sie sich für ein Skill zum Erstellen entschieden haben, wie sollten Sie es schreiben? Dies sind einige der Praktiken und Techniken, die sich für uns am besten bewährt haben.

Wir haben kürzlich auch [Skill-Ersteller](https://claude.com/blog/improving-skill-creator-test-measure-and-refine-agent-skills) veröffentlicht, um das Erstellen von Skills in Claude Code zu erleichtern.

---

### Nennen Sie nicht das Offensichtliche

Claude Code weiß bereits viel über Ihren Codebestand, und Claude weiß viel über Programmierung, einschließlich vieler Standardmeinungen. Wenn ein Skill in erster Linie um Wissen geht, konzentrieren Sie sich auf Informationen, die Claude über seine normale Denkweise hinausführen.

Das [Frontend-Design skill](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) ist ein starkes Beispiel. Ein Anthropic-Ingenieur hat es durch iteratives Arbeiten mit Kunden entwickelt, um Claudes Designgeschmack zu verbessern und bekannte Standardoptionen wie die Schriftart Inter und lila Verläufe zu vermeiden.

---

### Erstellen Sie einen Abschnitt zu Fallen

![Beispielabschnitt zu Fallstricken](https://pbs.twimg.com/media/HDlwEG1bEAUdmcV?format=jpg&name=small)

Der Inhalte mit dem höchsten Signalgehalt in jedem Skill ist oft der Abschnitt zu Fallen. Erstellen Sie ihn anhand häufiger Fehlerpunkte, auf die Claude bei der Verwendung des Skill stößt, und aktualisieren Sie ihn kontinuierlich, wenn neue Fallen auftreten.

---

### Verwenden Sie das Dateisystem & progressive Offenlegung

![Skill-Ordnerstruktur für schrittweise Offenlegung](https://pbs.twimg.com/media/HDlwhSjbEAIJSc9?format=jpg&name=small)

Ein Skill ist ein Ordner, nicht nur eine Markdown-Datei. Behandle das gesamte Dateisystem als eine Art Kontext-Engineering und progressive Offenlegung. Sage Claude, welche Dateien der Skill enthält, und er kann sie lesen, wenn sie relevant werden.

Die einfachste Form der progressiven Offenlegung besteht darin, Claude auf andere Markdown-Dateien hinzuweisen. Zum Beispiel können detaillierte Funktionssignaturen und Anwendungsbeispiele in `references/api.md` abgelegt werden.

Wenn die endgültige Ausgabe ein Markdown-Dokument ist, kann der Skill eine Vorlage unter `assets/` enthalten, die Claude kopieren und verwenden kann.

Ordner für Referenzen, Skripte, Beispiele und andere Ressourcen helfen Claude, effektiver zu arbeiten.

---

### Vermeide es, Claude einzuengen

Claude versucht im Allgemeinen, Anweisungen genau zu befolgen. Da Skills hochgradig wiederverwendbar sind, können zu spezifische Anweisungen sie anfällig machen. Gib Claude die Informationen, die es benötigt, und bewahre dabei genügend Flexibilität, um sich an die Situation anzupassen.

![Beispiel, das flexible Anleitung mit übermäßig restriktiven Anweisungen vergleicht](https://pbs.twimg.com/media/HDlwurvbEAM5ZNu?format=jpg&name=small)

---

### Den Aufbau durchdenken

![Beispiel für Skill-Setup-Konfiguration](https://pbs.twimg.com/media/HDlw1mYbEAY-Bul?format=jpg&name=small)

Einige Skills benötigen während der Einrichtung Kontext vom Benutzer. Zum Beispiel, wenn ein Skill ein Standup in Slack postet, muss Claude möglicherweise fragen, welchen Slack-Kanal er verwenden soll.

Ein gutes Muster ist, Einrichtungsinformationen in einer `config.json`-Datei im Skill-Verzeichnis zu speichern. Wenn die Konfiguration fehlt, kann der Agent den Benutzer danach fragen.

Um strukturierte Multiple-Choice-Fragen zu stellen, weise Claude an, das Tool AskUserQuestion zu verwenden.

---

### Das Beschreibungsfeld ist für das Modell

Wenn Claude Code eine Sitzung startet, erstellt es eine Liste aller verfügbaren Skill und deren Beschreibung. Claude durchsucht diese Liste, um zu beantworten: „Gibt es ein Skill für diese Anfrage?“ Die Beschreibung ist daher keine Zusammenfassung; sie beschreibt, wann das Modell das Skill auslösen sollte.

![Beispiel für eine Skill-Beschreibung, die für die Modellauslösung geschrieben wurde](https://pbs.twimg.com/media/HDlw5ULbEAQOqtJ?format=jpg&name=small)

---

### Speicher & Datenaufbewahrung

![Beispiel zum Speichern von Speicher und Daten für ein Skill](https://pbs.twimg.com/media/HDoImh1bEAU-mMI?format=jpg&name=small)

Einige Skills können Speicher enthalten, indem sie Daten speichern. Dies kann so einfach sein wie ein nur-anhängen Textprotokoll oder eine JSON-Datei, oder so komplex wie eine SQLite-Datenbank.

Zum Beispiel könnte ein `standup-post` Skill `standups.log` mit jedem Beitrag, den es geschrieben hat, aufbewahren. Beim nächsten Durchlauf kann Claude diese Historie lesen und feststellen, was sich seit gestern geändert hat.

Daten im Skill-Verzeichnis können gelöscht werden, wenn das Skill aktualisiert wird. Speichern Sie dauerhafte Daten an einem stabilen Ort; derzeit stellt `${CLAUDE_PLUGIN_DATA}` für jedes Plugin einen stabilen Ordner bereit.

---

### Skripte speichern & Code generieren

Eines der mächtigsten Dinge, die Sie Claude geben können, ist Code. Skripte und Bibliotheken ermöglichen es Claude, seine Züge damit zu verbringen, Fähigkeiten zu kombinieren und zu entscheiden, was als Nächstes zu tun ist, anstatt Boilerplate neu zu erstellen.

Zum Beispiel könnte ein Data-Science-Skill Funktionen enthalten, die Daten aus einer Ereignisquelle abrufen. Geben Sie Claude eine Reihe von Hilfsfunktionen, damit es komplexere Analysen zusammenstellen kann:

![Beispielbibliothek von Hilfsfunktionen innerhalb eines Skill](https://pbs.twimg.com/media/HDlxbtkbkAAOse7?format=jpg&name=small)

Claude kann dann Skripte spontan generieren, um diese Funktionen für Eingaben wie „Was ist am Dienstag passiert?“ zu kombinieren:

![Beispielskript, erstellt von Claude aus Hilfsfunktionen](https://pbs.twimg.com/media/HDlxfEIb0AA2E7l?format=jpg&name=small)

---

### On-Demand-Hooks

Skills kann Hooks definieren, die nur aktiviert werden, wenn Skill aufgerufen wird, und während der Sitzung aktiv bleiben. Verwenden Sie dies für festgelegte Schutzmaßnahmen, die störend wären, wenn sie die ganze Zeit laufen würden, aber in bestimmten Situationen wertvoll sind.

Beispiele:

- **/careful** - Verwendet einen PreToolUse-Matcher in Bash, um `rm -rf`, `DROP TABLE`, force-push und `kubectl delete` zu blockieren. Aktivieren Sie ihn, wenn Sie die Produktion berühren; ihn dauerhaft eingeschaltet zu lassen, wäre wahnsinnig.
- **/freeze** - Blockiert jede Bearbeitung/schreiben außerhalb eines bestimmten Verzeichnisses. Das ist nützlich beim Debuggen, wenn Sie Logs hinzufügen möchten, ohne versehentlich nicht verwandten Code "zu korrigieren".

---

## Verteilung von Skills

Einer der größten Vorteile von Skills ist, dass sie mit dem restlichen Team geteilt werden können.

Es gibt zwei gängige Verteilungspfade:

- Checken Sie Skills in das Repository unter `./.claude/skills`
- Bauen Sie ein Plugin und einen Claude Code-Plugin-Marktplatz, auf dem Benutzer es installieren können; siehe [Dokumentation des Plugin-Marktplatzes](https://code.claude.com/docs/en/plugin-marketplaces)

Für kleinere Teams, die an relativ wenigen Repositories arbeiten, funktioniert es gut, Skills in jedes Repository einzuchecken. Jeder eingecheckte Skill fügt dem Modell jedoch ein wenig Kontext hinzu. In größerem Maßstab ermöglicht ein internes Plugin-Marktplatz der Organisation, Skills zu verteilen, während jedes Team selbst entscheidet, was installiert werden soll.

---

### Verwaltung eines Marktplatzes

Wie sollte ein Team entscheiden, welche Skills in den Marktplatz aufgenommen werden, und wie sollten sie eingereicht werden?

Bei Anthropic trifft kein zentrales Team jede Entscheidung. Nützliche Skills entstehen organisch. Ein Eigentümer kann ein Skill in einen Sandbox-Ordner auf GitHub hochladen und die Menschen in Slack oder einem anderen Forum darauf hinweisen.

Wenn das Skill genügend Anklang gefunden hat, wie vom Eigentümer beurteilt, kann er einen PR öffnen, um es in den Marktplatz zu verschieben.

Schlechte oder überflüssige Skills lassen sich leicht erstellen, daher ist eine Form der Kuratierung vor der Veröffentlichung wichtig.

---

### Skills zusammensetzen

Skills können voneinander abhängig sein. Ein Datei-Upload-Skill könnte Dateien hochladen, während ein CSV-Generierungs-Skill eine CSV erstellt und dann den Upload-Skill aufruft. Marktplätze und Skills haben noch keine native Abhängigkeitsverwaltung, aber ein Skill kann ein anderes nach Namen referenzieren, und das Modell ruft es beim Installieren auf.

---

### Skills messen

Um zu verstehen, wie ein Skill funktioniert, verwenden wir einen PreToolUse-Hook, der die Skill-Nutzung innerhalb des Unternehmens protokolliert. Das [Beispielcode](https://gist.github.com/ThariqS/24defad423d701746e23dc19aace4de5) zeigt den Ansatz. Dies zeigt, welche Skills beliebt sind und welche seltener als erwartet ausgelöst werden.

---

## Fazit

Skills sind leistungsstarke, flexible Werkzeuge für Agenten, aber das Gebiet ist noch jung und jeder lernt, wie man sie gut einsetzt.

Behandeln Sie diese Lektionen als eine Sammlung nützlicher Techniken anstelle eines endgültigen Leitfadens. Der beste Weg, Skills zu verstehen, ist zu beginnen, zu experimentieren und zu beobachten, was funktioniert. Die meisten unserer Skills begannen als ein paar Zeilen und ein einzelnes Gotcha, und verbesserten sich dann, als Leute neue Lektionen hinzufügten, wann immer Claude auf einen weiteren Randfall stieß.

Ich hoffe, das war hilfreich. Lassen Sie mich wissen, wenn Sie Fragen haben.
