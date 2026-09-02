---
translationKey: "fable-5-1-prompt-harness-evolution"
locale: "de"
title: "Von Fable 5 zu Fable 5.1: Der System Prompt wird zum Agent OS"
description: "Ein Vergleich zweier Claude-Runtime-Prompt-Generationen: strukturelle Veränderungen bei Memory, Past Chats, Skills, Tool-Routing, Sicherheitsgovernance und die Zukunft von Agent Harnesses."
publishedAt: "2026-09-02"
updatedAt: "2026-09-02"
category: "architecture"
sourceLocale: "zh"
sourceUrl: "https://www.bydziwen.top/blog/fable-5-1-prompt-harness-evolution/"
sourceAuthor: "Shoa Lin"
contentType: "original"
translationStatus: "reviewed"
---

## Das Fazit zuerst

Anthropic veröffentlichte Claude Fable 5.1 am 1. September 2026. Die meisten Diskussionen drehen sich um Modellleistung, Preise und Benchmarks. Mich interessiert stärker ein Material, das weniger spektakulär wirkt, aber die Produktrichtung deutlich besser erkennen lässt: **der System Prompt und der Runtime Prompt, mit denen Claude im tatsächlichen Produkt arbeitet.**

Ich habe das vollständige Runtime-Prompt-Archiv von Fable 5 vom 9. Juni 2026 mit einem am 2. September 2026 gewonnenen Runtime-Prompt-Snapshot von Fable 5.1 verglichen. Das erste umfasst ungefähr 1.580 Zeilen und 126.943 Byte, das zweite 2.195 Zeilen und 275.723 Byte. Auch die Zahl der Tool-Definitionen steigt von 18 auf 44.

Das bedeutet jedoch nicht einfach, dass sich „der Prompt verdoppelt“ hat. Ein großer Teil der Dateigröße entfällt auf Tool Schemas, Beispiele und Beschreibungen der dynamischen Laufzeitumgebung. **Länge ist weder Intelligenz noch Produktfähigkeit.** Entscheidend ist die Struktur:

> Fable 5 war bereits ein Agent mit Tools, Skills, MCP und Artifacts. Fable 5.1 beginnt, Memory, frühere Unterhaltungen, Capability Discovery, Output Routing, Berechtigungen und Sicherheitsgovernance zu einer vollständigeren Agent Runtime zu organisieren.

Anders gesagt: Der Harness um Claude entwickelt sich von „dem Modell einige Werkzeuge geben“ hin zu „dem Modell ein Betriebssystem geben“.

## Zuerst die Vergleichsgrenze festlegen

Dieser Artikel vergleicht weder Modellgewichte noch Trainingsdaten oder Anthropic-Servercode. Verglichen werden zwei beobachtbare **Snapshots von Prompt- und Runtime-Konfigurationen**.

Anthropics öffentliche System-Prompt-Seiten zeigen vor allem die zentralen Verhaltensanweisungen für claude.ai und die mobilen Apps. Ein vollständiger Runtime-Snapshot enthält zusätzlich die in der jeweiligen Session verfügbaren Tool-Definitionen, Skills, Dateisystemregeln, Netzwerkberechtigungen, Platzhalter für Benutzerkontext und Routing-Regeln des Produkts. Dieses Gesamtpaket nenne ich daher **Runtime Prompt Bundle**.

Der Vergleich kann ziemlich zuverlässig zeigen, wie das Produkt Fähigkeiten um das Modell herum organisiert. Er kann allein jedoch nicht beantworten, um wie viel sich das Reasoning des Basismodells verbessert hat. Modellfähigkeit und Harness-Fähigkeit müssen getrennt bewertet werden.

## Die wichtigsten Änderungen auf einen Blick

| Dimension | Fable 5 | Fable 5.1 | Strukturelle Veränderung |
| --- | --- | --- | --- |
| Memory | Kurze Beschreibung des Memory-Zugriffs | Vollständige Regeln für Dateikategorien, Extraktion, Lesen und Schreiben, Versionen, Privacy und Anwendung | Von einer Feature-Beschreibung zu einer geregelten Data Plane |
| Past Chats | Keine eigenständige Schicht zum Abruf früherer Gespräche | `conversation_search`, `recent_chats`, `read_conversation` | Komprimierte Memory wird von Quellbelegen getrennt |
| Tool-Anzahl | 18 Tool-Definitionen | 44 Tool-Definitionen | Von einem allgemeinen Werkzeugkasten zu einer breiteren Capability Interface |
| Fähigkeitserweiterung | Skills und MCP Apps | Skills, Plugin Catalog und MCP Apps | Von statischer Konfiguration zu Discovery und Installation |
| Ausgabeform | Text, Dateien, Artifacts, Maps und Ähnliches | Zusätzlich Charts, Vergleichskarten, Schrittkarten, Quiz, Übersetzung, Produkte, Links und weitere typisierte Ausgaben | Von Strings zu routingfähigen UI Types |
| Output Routing | Über einzelne Tool-Anweisungen verteilt | Klare Priorität zwischen MCP, Dateien und Visualizer | Der Harness wird zum Capability Router |
| Sichtbarkeit der Arbeit | Keine allgemeine Regel für Fortschrittsmeldungen | Kurze Updates während langer Tool Runs, anschließend ein vollständiges Ergebnis | Das Produkt steuert die Erfahrung langer Aufgaben explizit |
| Schreibformat | Starke Unterdrückung von Listen, Überschriften und Fettdruck | Nur das Minimum an Formatierung, das die Komplexität erfordert | Rekalibrierung auf neue Standardverhalten des Modells |
| Search | Zeitabhängige Informationen mussten bereits geprüft werden | Schnelllebige Produkte, Modelle und Tools müssen selbst bei „Wiedererkennung“ recherchiert werden | Vertrautheit gilt nicht mehr als Aktualitätsbeweis |
| Safety und Privacy | Bereits umfangreiche Regeln für Ablehnungen und Wellbeing | Feinere Regeln für Kinderschutz, Copyright-Kontinuität, Memory Privacy, Löschsemantik und Gesprächsende | Vom Output-Filter zur Lifecycle Governance |

## Änderung eins: Memory wächst von zwei Sätzen zu einem Dateisystem

Der Memory-Abschnitt in Fable 5 ist extrem dünn. Er besagt, dass Claude aus früheren Gesprächen abgeleitete Memories erhalten kann, und vermerkt, ob der Benutzer diese Funktion aktiviert hat. Er beschreibt, dass Memory existiert, aber nicht, wie Erinnerungen angelegt, aktualisiert, gelöscht oder voneinander getrennt werden.

Fable 5.1 modelliert Memory dagegen als persistentes Dateisystem mit mindestens fünf Inhaltsklassen:

- `/profile.md` für relativ stabile Informationen zu Identität und Rolle;
- `/topics/` für Gewohnheiten, Präferenzen und wiederkehrende Themen;
- `/areas/` für laufende Projects, Verantwortlichkeiten und Decisions;
- `/people/` für Beziehungskontext, der für die aktuelle Frage relevant ist;
- `/preferences.md` dafür, wie der Benutzer Antworten und Zusammenarbeit mit Claude wünscht.

Das Design geht weit über Dateinamen hinaus. Die neuen Regeln definieren einen Background Memory Pass, Provenance Labels wie `[stated]`, Read-before-write, Version Conflicts, Append gegenüber Replace, das Löschen kompletter Dateien, Grenzen für Sensitive Data sowie die Bedingungen, unter denen eine vorhandene Erinnerung in einer Antwort verwendet oder gerade nicht erwähnt werden soll.

```text
Gespräch endet
   ↓
Hintergrundextraktion dauerhafter Fakten
   ↓
Klassifizierung, Deduplizierung, Privacy-Filter, Versionszusammenführung
   ↓
Persistente Memory-Dateien
   ↓
Relevanzbasierter Abruf bei einer späteren Frage
   ↓
Nur Kontext einfügen, der die Antwort tatsächlich verändert
```

Das ist nicht bloß „Chatverlauf embedden und Top-K Retrieval ausführen“. Es ähnelt eher einer **Kontextdatenbank** mit Schema, Provenance, Lifecycle und Access Policy.

Meine Schlussfolgerung ist, dass sich der Wettbewerb bei Agent Memory von „kann es sich erinnern?“ zu „was erinnert es, warum sollten wir es glauben, wer darf es ändern, wann läuft es ab und wie kann es zurückgezogen werden?“ verschiebt. Vector Retrieval ist nur ein Implementierungsdetail innerhalb dieses Systems.

## Änderung zwei: Past Chats und Memory werden getrennte Context Planes

Fable 5.1 fügt eine eigene Gruppe von Werkzeugen für frühere Unterhaltungen hinzu: `conversation_search`, `recent_chats` und `read_conversation`. Das ist mehr als eine zusätzliche Memory-Funktion. Es erkennt auf Architekturebene einen fundamentalen Unterschied zwischen zwei Informationsarten an:

- **Memory speichert komprimierte Durable Claims** zur effizienten Wiederverwendung.
- **Past Chats bewahren die ursprünglichen Gesprächsbelege** zur Rekonstruktion und Überprüfung.

Der Prompt verlangt ausdrücklich, zwischen dem zu unterscheiden, was der Benutzer tatsächlich gesagt oder entschieden hat, und dem, was Claude lediglich vorgeschlagen hat. Enthielt ein früheres Gespräch nur einen Vorschlag des Assistant, darf dieser im nächsten Gespräch nicht zu einer Benutzerentscheidung hochgestuft werden. War die Diskussion hypothetisch, darf die Komprimierung die Hypothese nicht in eine Tatsache verwandeln.

Damit wird ein Kernproblem jedes Langzeitgedächtnisses adressiert: **Komprimierung verbessert die Nutzbarkeit, entfernt aber Belege.**

Eine verlässlichere Architektur verlangt deshalb nicht von einem universellen Memory Store, alle Aufgaben zu übernehmen:

```text
Memory = wiederverwendbare Schlussfolgerungen
Past Chats = nachvollziehbare Belege
Current Session = der gerade entstehende Task State
```

Ein reifer Agent muss mehr tun als sich erinnern. Er muss erklären können, woher eine Erinnerung stammt und ob sie vom Benutzer geäußert, durch ein Tool verifiziert oder vom Model abgeleitet wurde.

## Änderung drei: Skills, Plugins und MCP bilden eine Capability Supply Chain

Fable 5 besaß bereits Skills und MCP Apps. Es wusste, vor der Erstellung eines Dokuments, einer Tabelle, einer Präsentation oder eines Code-Artifacts die passende `SKILL.md` zu lesen, und bei Zugriff auf einen externen Dienst eine vorhandene MCP-Verbindung zu bevorzugen.

Fable 5.1 behält diese Struktur bei und ergänzt Plugin- und Skill-Kataloge mit Such-, Empfehlungs- und Installationspfaden. Die neue Capability Layer lässt sich so verstehen:

- Ein **Skill** bündelt Erfahrung, Regeln und Methoden für eine Aufgabenklasse.
- Ein **Plugin** kombiniert Tools, Commands und Skills zu einem verteilbaren Capability Bundle.
- **MCP** verbindet externe Daten, Systeme und reale Autorität.
- Ein **Tool Schema** stellt dem Model eine konkrete Aktion bereit.
- Ein **Router** entscheidet, welche Fähigkeitsklasse die aktuelle Aufgabe bearbeiten soll.

Der Anstieg von 18 auf 44 Tool-Definitionen bedeutet nicht nur „26 zusätzliche Funktionen“. Die neuen Werkzeuge konzentrieren sich auf Memory CRUD, Past-Chat-Abruf, Plugin- und Skill-Discovery, Research-Vorschläge sowie Structured UI für Charts, Vergleiche, Schritte, Übersetzung, Quiz, Produkte und Links.

Das ähnelt zunehmend klassischer Softwareschichtung. Das Model muss nicht jede Arbeitsmethode dauerhaft behalten und sollte nicht jede externe Berechtigung direkt besitzen. Fähigkeiten können entdeckt, geladen, autorisiert, aufgerufen und entfernt werden.

## Änderung vier: Der Prompt kalibriert das Modellverhalten nun gegenläufig

Der Prompt von Fable 5 unterdrückte Überschriften, Listen und Fettdruck stark, weil das damalige Model leicht überformatierte, schablonenhafte Antworten erzeugte. Fable 5.1 lockert diese Regel: Listen sind bei vielschichtigem Inhalt sinnvoll, und Formatierung soll auf das zur Klarheit nötige Minimum beschränkt werden.

Das ist nicht nur ein neuer Produktgeschmack. Das Standardverhalten des Models hat sich verändert. Anthropics Prompting Guide für Fable 5.1 erklärt, dass das neue Modell Überschriften, Listen und Fettdruck seltener verwendet als Fable 5. Wer den alten Anti-formatting Prompt beibehält, kann dadurch dichte Textwände erzeugen.

Dieselbe kompensierende Beziehung zeigt sich an zwei weiteren Stellen:

- Fable 5.1 liefert während langer Tool Chains weniger ungefragte Fortschrittsupdates, deshalb verlangt der neue Prompt nach einigen Tool Calls eine kurze Meldung;
- bei niedrigem Effort antwortet Fable 5.1 eher aus vorhandenem Wissen statt zu suchen, deshalb verstärkt der neue Prompt die Prüfregeln für schnelllebige Products, Models und Tools.

Die wichtige Lektion für Prompt Engineering lautet: **Ein System Prompt ist keine einmal geschriebene Produktspezifikation, sondern ein Controller für Modellverhalten.** Wenn sich das Model ändert, kann der alte Prompt zwar noch funktionieren, aber überkompensieren und das neue Modell verschlechtern.

Ein reifes Team verwendet nicht denselben „Universal Prompt“ für jedes Model. Es beobachtet Failure Modes durch Evals und wendet nur die minimale, für das aktuelle Modell nötige Kalibrierung an.

## Änderung fünf: Safety wandert von „was beantwortet werden darf“ zu State- und Data-Governance

Fable 5 enthielt bereits umfangreiche Safety Policy. Die wichtige Veränderung in Fable 5.1 besteht nicht einfach aus weiteren Verboten. Die Safety Rules erstrecken sich nun über den gesamten Interaktionslebenszyklus.

Der neue Prompt behandelt, wie spätere Anfragen nach einer Ablehnung Zustand erben; ob Copyright-Grenzen bestehen bleiben, wenn eine Anfrage verkleinert oder umformuliert wird; welche Informationen niemals in Long-term Memory gelangen dürfen; ob beim Löschen einer Erinnerung auch ausschließlich daraus abgeleitete Schlussfolgerungen gelöscht werden müssen; wann Sensitive Memories gelesen werden dürfen; wie eine Bitte um Gesprächsende bestätigt wird; und ob ein Gespräch bei Missbrauch, Selbstverletzungsrisiko oder möglicher Gewalt beendet werden darf.

Diese Regeln steuern mehr als den finalen Text:

- Dürfen Daten gespeichert werden?
- Welches Provenance Label erhalten sie?
- Dürfen sie später wiederverwendet werden?
- Kann der Benutzer sie zurückziehen?
- Wie werden Tool Side Effects begrenzt?
- Wie verändert Conversation State die nächste Entscheidung?

Safety entwickelt sich damit von einem Classifier um eine Antwort herum zu einer Policy Engine innerhalb der Agent Runtime.

## Was sich nicht grundlegend verändert hat

Um nicht jedes Detail als Revolution darzustellen, muss man auch anerkennen, was Fable 5 bereits konnte.

Fable 5 enthielt schon Persistent Artifact Storage, MCP Connectors, Skills, File Creation, Computer Use, Web Search, Image Search und Typed Map Output. Es war kein reiner Text-Chatbot, und Fable 5.1 hat den Agent nicht von Grund auf erfunden.

Die eigentliche Verbesserung liegt darin, dass Fable 5.1 diesen vorhandenen Komponenten klarere Kontextkategorien, Belegwiederherstellung, Fähigkeitskataloge, Output Routing, Prozessfeedback und Governance-Regeln gibt.

Der Übergang verläuft daher von „viele Komponenten existieren“ zu „die Komponenten besitzen nun betriebssystemähnliche Verantwortungsgrenzen“.

## Meine Zusammenfassung: Vier Ebenen nehmen Gestalt an

Abstrahiert man die Änderungen, lässt sich Claudes Runtime meiner Ansicht nach durch vier Ebenen beschreiben:

```text
Instruction Plane
System Prompt / Turn Instruction / User Preference / Skill

Context Plane
Current Session / Memory / Past Chats / Files / Web

Capability Plane
Tools / Plugins / MCP / Computer / Typed UI

State & Governance Plane
Provenance / Version / Permission / Safety / Audit
```

Fable 5 erweiterte vor allem Capability. Fable 5.1 beginnt deutlich ernsthafter in Context und State Governance zu investieren.

Ich bevorzuge inzwischen folgende Formel, um ein Agent-Produkt zu verstehen:

> **Agent Product Capability = Model × Context × Capability × State Governance**

Das ist Multiplikation, nicht Addition. Ein starkes Model mit falschem Context scheitert trotzdem. Ein Produkt mit vielen Tools und unkontrollierten Permissions kann nicht im Unternehmen eingesetzt werden. Reichhaltige Memory ohne Provenance und Löschmechanismus sammelt Verunreinigungen an. Ein vollständiger Workflow ohne verifizierbares Feedback lässt den Agent nur automatischer Fehler machen.

## Wohin diese Entwicklung führt

### 1. Der monolithische System Prompt wird in modulare Policies zerlegt

Heute lässt sich noch ein Runtime Prompt Bundle mit über zweitausend Zeilen lesen. Viele dieser Regeln sollten aber nicht dauerhaft als Natural Language in das Model injiziert werden. Sie werden schrittweise in versionierte Policies, Skills, Routers, Permission Settings und Task-scoped Instructions wandern.

Prompts werden nicht verschwinden. Sie ziehen sich von „dem Text, der jede Regel trägt“ zu „einer Schnittstelle, die dem Model das aktuelle Ziel und die aktuelle Grenze erklärt“ zurück.

### 2. Context Engineering wird zu State Engineering

Die frühere Frage lautete, wie mehr Context in das Fenster passt. Wichtiger werden die Fragen, wem ein Zustand gehört, welche Version aktuell ist, welche Fakten abgelaufen sind, wie Rollback funktioniert und wie sich eine externe Aktion beweisen lässt.

Memory, Past Chats, Session, Tool Trace und externer Systemzustand werden getrennt modelliert. Agent Context wird Datenbanken und Event Streams ähnlicher als einem ständig wachsenden Prompt.

### 3. Mehr Regeln wandern vom Prompt in die Protokollebene

Fable 5.1 führt gleichzeitig Turn-scoped System Messages, Thinking Block Binding, Content Provenance und Per-message Effort ein. Diese Mechanismen zeigen in dieselbe Richtung: Wichtige Beschränkungen werden direkt durch APIs und Runtime repräsentiert, statt davon abzuhängen, dass das Model „sich an die Regel erinnert“.

Alles, was durch Typsystem, Berechtigungssystem, Versionsnummer oder Protokoll garantiert werden kann, sollte schließlich nicht nur als Prompt-Text existieren.

### 4. Agent-Ausgaben werden typisierte Ergebnisse statt Text

Viele der Ergänzungen unter den 44 Tools sind keine Aktionswerkzeuge, sondern Output Components für Charts, Cards, Steps, Quiz, Translation und Product Lists. Das Endprodukt des Models wandert von einem Markdown String zu einem Typed Result, das eine Anwendung direkt verarbeiten kann.

Zukünftige Frontends werden nicht nur eine Antwort darstellen. Sie wählen anhand des Result Type eine interaktive UI und überführen die nächste Benutzerinteraktion in Zustand für den nächsten Turn.

### 5. Models und Harnesses werden gemeinsam trainiert und iteriert

Der wichtigste langfristige Trend ist, dass Model und Harness keine unabhängigen Produkte mehr sind. Post-training wird Models zunehmend an bestimmte Tool Protocols, Progress Reporting, Editing Patterns, Memory Structures und Permission Boundaries anpassen. Der Harness wird danach anhand der Failure Modes des neuen Models über Prompts, Routers und Evals neu kalibriert.

Die Umkehr der Formatierungsregeln von Fable 5 zu Fable 5.1 ist ein kleines, aber klares Beispiel: Ändert sich das Standardverhalten des Models, müssen sich die umgebenden Kontrollen mitändern.

Der endgültige Wettbewerb geht nicht nur darum, wer das stärkste Base Model besitzt. Entscheidend werden die reichste reale Umgebung, die hochwertigsten Task Trajectories, die zuverlässigsten Feedback Signals und ein Closed Loop, der diese Signale in die Entwicklung von Model und Harness zurückführt.

## Was das für Agent-Entwickler bedeutet

Erstens sollte ein System Prompt nicht mit Produktarchitektur verwechselt werden. Ein Prompt kann eine Grenze beschreiben, aber verlässliche Grenzen benötigen Permissions, Schemas, Versionen, Idempotenz, Audit und Evals.

Zweitens sollte Memory nicht auf eine Vektordatenbank reduziert werden. Langzeitgedächtnis ist zuerst ein Problem der Data Governance und erst danach ein Retrieval-Problem.

Drittens sollte nicht nur die finale Antwort bewertet werden. Bei einem Tool-using Agent sind die wichtigeren Fragen, ob die Trajectory korrekt war, Side Effects kontrolliert wurden, Fehler behebbar waren und Belege nachvollziehbar blieben.

Viertens sollte niemand annehmen, dass ein alter Harness durch einen Modellwechsel automatisch besser wird. Bei jedem Model Upgrade müssen Evals auf realen Aufgaben erneut laufen und Drifts bei Search, paralleler Tool-Nutzung, File Editing, Formatting, Stopping Conditions und Progress Reporting geprüft werden.

## Schluss

Das Aufschlussreichste an den Prompt-Änderungen von Fable 5.1 ist nicht die Zahl der hinzugefügten Regeln. Es ist, dass Anthropic systematischer die Fragen beantwortet, denen jedes Agent-Produkt irgendwann begegnet: Woher kommt Kontext? Wie werden Fähigkeiten geladen? Wie bleibt Zustand erhalten? Wie werden Nebenwirkungen geregelt? Wie werden Ergebnisse dargestellt? Wie werden Fehler korrigiert?

Mein abschließendes Urteil lautet:

> Der Wettbewerb der nächsten Agent-Generation dreht sich nicht darum, wer den längeren Prompt hat. Er dreht sich darum, wer ein Model in eine realistischere, zustandsreichere, überprüfbarere und weiter lernende Umgebung setzen kann.

Wenn diese Umgebungsfähigkeiten stabil werden, kann der System Prompt wieder kürzer werden. Die zuverlässigsten Regeln entwickeln sich letztlich von „dem Modell sagen, wie es handeln soll“ zu „das System erlaubt nur die richtige Art zu handeln“.

## Quellen

- [Anthropic: System prompts overview](https://platform.claude.com/docs/en/release-notes/system-prompts/overview)
- [Anthropic: Claude Fable 5 System Prompt](https://platform.claude.com/docs/en/release-notes/system-prompts/claude-fable-5)
- [Anthropic: Claude Fable 5.1 System Prompt](https://platform.claude.com/docs/en/release-notes/system-prompts/claude-fable-5-1)
- [Anthropic: Claude Fable 5.1 model overview](https://platform.claude.com/docs/en/models/fable-5-1/overview)
- [Anthropic: Prompting Claude Fable 5.1](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-1)
- [Community-Archiv des vollständigen Fable 5 Runtime Prompt](https://github.com/infineural/fable-5/blob/main/system-prompt/full-system-prompt.md)
