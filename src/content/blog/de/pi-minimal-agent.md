---
translationKey: "pi-minimal-agent"
locale: "de"
title: "Pi: Der minimale Agent im Kern von OpenClaw"
description: "Eine strukturierte Adaption von Armin Ronachers Einführung in Pi: ein kleiner Kern, erweiterbare Sitzungen und die Idee von Software, die Software baut."
publishedAt: "2026-01-31"
updatedAt: "2026-07-16"
category: "architecture"
sourceLocale: "en"
sourceUrl: "https://lucumr.pocoo.org/2026/1/31/pi/"
sourceAuthor: "Armin Ronacher"
contentType: "adaptation"
translationStatus: "reviewed"
---

<div class="blog-article-body">

*Verfasst am 31. Januar 2026*

OpenClaw verbreitete sich unter mehreren Namen viral, darunter ClawdBot und MoltBot. Im Kern ist es ein Agent, der mit einem Kommunikationskanal verbunden ist und Code ausführen kann.

Unter der Haube verwendet OpenClaw einen kleinen Coding-Agenten namens **Pi**. Armin Ronacher beschreibt Pi als den Coding-Agenten, den er inzwischen fast ausschließlich nutzt, und erklärt, warum dessen bewusst kleines Design so überzeugend ist.

Pi wurde von **Mario Zechner** entwickelt. Marios bodenständiger Ansatz unterscheidet sich von Peters „Science-Fiction mit einer Prise Wahnsinn“, doch Pi und OpenClaw beruhen auf derselben Annahme: LLMs sind sehr gut darin, Code zu schreiben und auszuführen – also sollte das System genau diese Fähigkeit nutzen.

## Was ist Pi?

Pi ist einer von vielen Coding-Agenten, hebt sich aber durch zwei Eigenschaften ab. Armin verweist außerdem auf **AMP** als ein weiteres Produkt, das von Menschen geprägt wurde, die agentenbasiertes Programmieren ernsthaft erprobt haben, statt es nur in eine elegante Oberfläche zu verpacken.

Pi ist aus zwei Gründen besonders interessant:

- **Der Kern ist winzig.** Der System-Prompt ist ungewöhnlich kurz, und der Kern stellt nur vier Werkzeuge bereit: Read, Write, Edit und Bash.
- **Das Erweiterungssystem ist leistungsfähig.** Erweiterungen können Verhalten hinzufügen und ihren eigenen Zustand in Sitzungen speichern.

Dazu kommt ein praktischer Vorteil: Pi ist sorgfältig entwickelt und fühlt sich wie gut gemachte Software an. Es läuft stabil, benötigt wenig Arbeitsspeicher und lenkt nicht durch Flackern oder zufällige Fehler ab.

Pi ist zugleich eine Sammlung kleiner Bausteine, aus denen andere Agenten entstehen können. OpenClaw basiert auf diesen Komponenten; Armin nutzte sie für einen Telegram-Bot und Mario für `mom`. Richtet man Pi auf seinen eigenen Code und ein Beispiel wie `mom`, kann es dabei helfen, einen weiteren Agenten für die gewünschte Integration zusammenzustellen.

## Was Pi bewusst nicht enthält

Pi zu verstehen heißt auch, die bewussten Auslassungen zu verstehen. Der Kern besitzt **keine eingebaute MCP-Unterstützung**. Das macht MCP nicht unmöglich: Eine Erweiterung kann es ergänzen, oder ein Agent verwendet **mcporter**, das MCP-Aufrufe über eine CLI oder TypeScript-Bindings bereitstellt.

Die Auslassung entspricht Pis Philosophie. Fehlt dem Agenten eine Fähigkeit, besteht der Standardschritt nicht darin, auf einem Marktplatz nach einer fertigen Erweiterung zu suchen. Stattdessen soll der Agent sich selbst erweitern, indem er Code schreibt und ausführt.

Erweiterungen lassen sich weiterhin herunterladen. Der kulturelle Unterschied liegt darin, dass eine vorhandene Erweiterung als Referenz behandelt werden kann, die der Agent für lokale Anforderungen neu kombiniert – nicht als unveränderliche Abhängigkeit.

## Agenten für Agenten, die Agenten bauen

Software, die sich selbst umgestalten soll, benötigt einige grundlegende Fähigkeiten.

Erstens erlaubt Pis AI SDK, Nachrichten verschiedener Modellanbieter in einer Sitzung zu verwenden. Es erkennt an, dass Sitzungen nicht perfekt portierbar sind, vermeidet aber unnötige Abhängigkeiten von anbieterspezifischen Funktionen.

Zweitens können Sitzungsdateien neben Modellnachrichten auch eigene Nachrichtentypen enthalten. Erweiterungen speichern darin Zustand, und das System kann festlegen, dass bestimmte Informationen nie oder nur teilweise an das Modell gesendet werden.

Drittens lässt sich der Zustand von Erweiterungen auf der Festplatte sichern, und Erweiterungen unterstützen Hot Reload. Ein Agent kann eine Erweiterung schreiben, neu laden, testen und weiterentwickeln. Viertens bringt Pi Dokumentation und Beispiele mit, die der Agent beim eigenen Ausbau lesen kann. Fünftens sind Sitzungen Bäume: Nutzer können in eine Nebenaufgabe verzweigen, ein defektes Werkzeug reparieren, ohne den Kontext des Hauptzweigs zu verbrauchen, und anschließend zurückkehren, während Pi zusammenfasst, was im anderen Zweig geschehen ist.

Diese Entscheidungen sind für Werkzeuge wichtig. Bei vielen Modellanbietern werden MCP-Werkzeuge und andere LLM-Tools zu Beginn einer Sitzung in den Systemkontext oder den Werkzeugbereich geladen. Werden ihre Definitionen später vollständig ersetzt, kann das den Cache zerstören oder beim Modell widersprüchliche Erinnerungen daran hinterlassen, wie frühere Aufrufe funktioniert haben.

## Werkzeuge außerhalb des Modellkontexts

Eine Pi-Erweiterung kann ein aufrufbares LLM-Werkzeug registrieren, und Armin nutzt diese Möglichkeit gelegentlich. Sein lokal gebauter Issue-Tracker ist ein Beispiel: Weil der Agent Aufgaben direkt verwalten soll, stellt er ein zusätzliches Werkzeug statt einer CLI bereit. Es ist derzeit das einzige Zusatzwerkzeug, das er in den Modellkontext lädt.

Die meisten zusätzlichen Fähigkeiten müssen den Modellkontext nicht als Werkzeugschema belegen. Sie sind Skills oder TUI-Erweiterungen, die den menschlichen Arbeitsablauf verbessern. Pi-Erweiterungen können Spinner, Fortschrittsbalken, Dateiauswahl, Tabellen und Vorschauen direkt im Terminal darstellen. Mario demonstrierte sogar Doom in der TUI – unpraktisch, aber ein guter Beleg für die Flexibilität der Oberfläche.

Die folgenden Erweiterungen sind Beispiele, kein festes Paket. Der vorgesehene Arbeitsablauf besteht darin, dem Agenten eine davon zu zeigen und ihn zu bitten, das Verhalten für den eigenen Bedarf neu zu kombinieren.

### `/answer`

Armin verwendet keinen Plan Mode. Er bevorzugt einen produktiven Austausch in natürlicher Agentenprosa, in den Erklärungen und Diagramme eingebettet sind, statt eines starren Dialogs mit strukturierten Fragen.

Inline-Fragen lassen sich jedoch oft schwer sauber beantworten. `/answer` liest deshalb die letzte Antwort des Agenten, extrahiert die Fragen und formatiert sie in ein fokussiertes Eingabefeld um.

![/answer-Erweiterung mit einem Fragedialog](https://lucumr.pocoo.org/static/pi-answer.png)

### `/todos`

Obwohl Armin die Umsetzung von Beads kritisiert, hält er Aufgabenlisten für Agenten für nützlich. `/todos` öffnet Einträge, die unter `.pi/todos` als Markdown-Dateien gespeichert sind. Nutzer und Agent können sie bearbeiten, und eine Sitzung kann eine Aufgabe übernehmen und als in Bearbeitung markieren.

### `/review`

Wenn Agenten mehr Code schreiben, sollte unfertige Arbeit zuerst von einem Agenten geprüft werden, bevor sie an einen Menschen geht. Da Pi-Sitzungen Bäume sind, kann Armin in einen frischen Review-Kontext verzweigen, Befunde sammeln und die Korrekturen in die Hauptsitzung zurückbringen.

![/review-Erweiterung mit auswählbaren Review-Vorgaben](https://lucumr.pocoo.org/static/pi-review.png)

Die Oberfläche orientiert sich an Codex und unterstützt Prüfziele wie Commits, Diffs, nicht eingecheckte Änderungen und entfernte Pull Requests. Der Review-Prompt betont das Feedback, das Armin wichtig ist, einschließlich ausdrücklicher Hinweise auf neu hinzugefügte Abhängigkeiten.

### `/control`

Dies ist eine experimentelle Erweiterung und kein Teil von Armins täglichem Arbeitsablauf. Sie erlaubt einem Pi-Agenten, Prompts an einen anderen zu senden, und schafft damit ein kleines Multi-Agenten-System ohne komplexe Orchestrierungsschicht.

### `/files`

Diese Erweiterung listet Dateien auf, die in der Sitzung geändert oder erwähnt wurden. Sie können im Finder angezeigt, in VS Code verglichen, mit Quick Look geöffnet oder in einem Prompt referenziert werden. `shift+ctrl+r` öffnet die zuletzt erwähnte Datei in Quick Look – praktisch, wenn ein Agent etwa ein PDF erzeugt.

Auch andere Entwickler haben Erweiterungen gebaut, darunter Nicos Subagent-Erweiterung und `interactive-shell`, mit der Pi interaktive CLIs selbstständig in einem beobachtbaren TUI-Overlay ausführen kann.

## Software, die Software baut

Der zentrale Punkt ist, dass Armin diese Erweiterungen nicht von Hand geschrieben hat. Er beschrieb, was er brauchte, und Pi baute sie. Pis Kern enthält weder MCP noch gebündelte Community-Skills, doch der Agent kann Fähigkeiten erstellen und pflegen, die genau auf seinen Besitzer zugeschnitten sind. Ein Beispiel ist, Browser-Automatisierungs-CLIs oder MCP-Integrationen durch einen Skill zu ersetzen, der direkt mit CDP kommuniziert.

Sein Agent verfügt über viele Skills, doch sie sind austauschbar. Einige lesen gemeinsam genutzte Pi-Sitzungen anderer Entwickler für Code-Reviews; andere gestalten Commit-Nachrichten, Commit-Verhalten oder Changelog-Aktualisierungen. Außerdem verschiebt er frühere Slash-Commands in Skills und kombiniert einen Skill, der zur Nutzung von `uv` anhält, mit einer Erweiterung, die Aufrufe von `pip` und `python` zu `uv` umleitet.

Genau darin liegt der Reiz eines minimalen Agenten wie Pi: Software, die Software baut, wird zum normalen Arbeitsmodus. OpenClaw führt die Idee weiter, indem es die lokale Oberfläche entfernt und den Agenten mit einem Chat verbindet. Armins Schlussfolgerung lautet nicht, dass jedes Detail bereits geklärt sei, sondern dass diese Richtung zunehmend wie ein Teil der Zukunft von Software wirkt.

</div>
