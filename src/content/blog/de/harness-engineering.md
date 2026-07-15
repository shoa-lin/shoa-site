---
translationKey: "harness-engineering"
locale: "de"
title: "Harness Engineering für Nutzer von Coding-Agenten"
description: "Ein praktisches Modell aus Guides, Sensoren, Feedback-Loops und Architekturgrenzen, das Coding-Agenten vertrauenswürdiger macht."
publishedAt: "2026-04-02"
updatedAt: "2026-07-16"
category: "architecture"
sourceLocale: "en"
sourceUrl: "https://martinfowler.com/articles/harness-engineering.html"
sourceAuthor: "Birgitta Böckeler"
contentType: "adaptation"
translationStatus: "reviewed"
---

> **Begriffe**
>
> **Harness** bezeichnet alles an einem KI-Agenten außer dem Modell selbst: Agent = Modell + Harness. Bei Coding-Agenten umfasst das sowohl System-Prompts, Code-Retrieval und Orchestrierung des Herstellers als auch die vom Nutzer kontrollierte äußere Schicht aus Regeln, Skills, Skripten und Prüfungen.
>
> **Guides / Sensoren**: Guides sind Feedforward-Regelungen, die den Agenten vor einer Aktion steuern. Sensoren sind Feedback-Regelungen, die Ergebnisse beobachten und nach der Aktion Selbstkorrektur auslösen.
>
> **Computational / Inferential**: Computational Controls sind deterministische Werkzeuge wie Tests, Linter und Type-Checker. Inferential Controls nutzen semantisches Urteil, etwa KI-Code-Review oder LLM-as-a-Judge.

---

„Harness“ ist zur Kurzform für alles an einem KI-Agenten außer dem Modell geworden: [Agent = Model + Harness](https://blog.langchain.com/the-anatomy-of-an-agent-harness/). Diese Definition ist sehr weit. Für Coding-Agenten lohnt es sich deshalb, sie auf einen klaren bounded context einzugrenzen.

Ein Teil des Harness wird vom Hersteller durch System-Prompts, Code-Retrieval und mitunter ein [anspruchsvolles Orchestrierungssystem](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) gebaut. Coding-Agenten geben Nutzern zusätzlich Werkzeuge, um einen äußeren Harness für das eigene System und den konkreten Anwendungsfall aufzubauen.

![Drei konzentrische Kreise: Modell im Zentrum, Harness des Coding-Agent-Herstellers darum und Nutzer-Harness als äußere Schicht](/assets/blog/harness-engineering/harness-bounded-contexts.png)

Abbildung 1: „Harness“ bedeutet in verschiedenen bounded contexts unterschiedliche Dinge.

Ein guter äußerer Harness verfolgt zwei Ziele: Er erhöht die Wahrscheinlichkeit, dass der Agent die Aufgabe im ersten Versuch korrekt löst, und schafft einen Feedback-Loop, der möglichst viele Probleme korrigiert, bevor sie einen Menschen erreichen. Das soll Review-Aufwand reduzieren und die Systemqualität erhöhen; weniger verschwendete Tokens sind ein zusätzlicher Vorteil.

![Übersicht: Guides speisen einen Coding-Agenten, Sensoren führen Ergebnisse in die Selbstkorrektur zurück, der Mensch steuert beide](/assets/blog/harness-engineering/harness-overview.png)

## Feedforward und Feedback

Harness Engineering kombiniert zwei Regelungsformen:

- **Guides (Feedforward Controls)** antizipieren unerwünschtes Verhalten und steuern den Agenten **vor** der Aktion. Dadurch steigt die Chance auf ein gutes erstes Ergebnis.
- **Sensoren (Feedback Controls)** beobachten das Ergebnis **nach** der Aktion und unterstützen die Selbstkorrektur. Besonders wirksam sind Signale, die für LLMs gestaltet wurden, etwa eigene Linter-Meldungen mit konkreten Korrekturanweisungen – eine positive Form von Prompt Injection.

Keine Form reicht allein aus. Feedback ohne Feedforward lässt den Agenten dieselben Fehler wiederholen; Feedforward ohne Feedback kodiert Regeln, zeigt aber nie, ob sie funktioniert haben.

## Computational und Inferential

Guides und Sensoren können zwei Ausführungstypen nutzen:

- **Computational**: deterministisch und schnell, meist auf der CPU. Tests, Linter, Type-Checker und Strukturanalysen liefern in Millisekunden bis Sekunden verlässliche Ergebnisse.
- **Inferential**: semantische Analyse, KI-Code-Review und LLM-as-a-Judge, meist auf GPU oder NPU. Diese Kontrollen sind langsamer, teurer und nicht deterministisch.

Computational Guides verbessern das erste Ergebnis mit deterministischen Werkzeugen. Computational Sensors sind billig und schnell genug, um bei jeder Änderung neben dem Agenten zu laufen. Inferential Controls kosten mehr und variieren zwischen Läufen, können aber reichhaltige Hinweise und semantisches Urteil liefern. Mit einem starken – genauer: zur Aufgabe passenden – Modell können inferentielle Sensoren das Vertrauen dennoch erhöhen.

**Beispiele**

| Szenario | Richtung | Typ | Beispielimplementierung |
| --- | --- | --- | --- |
| Coding-Konventionen | Feedforward | Inferential | AGENTS.md, Skills |
| Neues Projekt aufsetzen | Feedforward | Beides | Skill mit Anweisungen und Bootstrap-Skript |
| Codemods | Feedforward | Computational | Werkzeug mit Zugriff auf OpenRewrite-Rezepte |
| Strukturtests | Feedback | Computational | Pre-Commit- oder Coding-Agent-Hook, der ArchUnit-Tests gegen Modulgrenzen ausführt |
| Review-Anweisungen | Feedback | Inferential | Skills |

### Beziehung zu Context Engineering

[Context Engineering](https://martinfowler.com/articles/exploring-gen-ai/context-engineering-coding-agents.html) stellt die Mittel bereit, um Guides und Sensoren einem Agenten verfügbar zu machen. Einen Nutzer-Harness für einen Coding-Agenten zu entwickeln ist eine konkrete Form von Context Engineering.

## Der Steuerungs-Loop

Die Rolle des Menschen besteht darin, den Agenten durch Iteration am Harness zu **steuern**. Wiederholt sich ein Problem, werden Feedforward- und Feedback-Regelungen verbessert, sodass es unwahrscheinlicher oder vollständig verhindert wird.

KI kann den Harness selbst mitentwickeln. Coding-Agenten haben eigene Kontrollen und statische Analysen deutlich günstiger gemacht. Sie können Strukturtests schreiben, Regeln aus beobachteten Mustern ableiten, eigene Linter aufsetzen und durch Codebase-Archäologie How-to-Guides erstellen.

## Timing: Qualität nach links verschieben

Teams mit [Continuous Integration](https://martinfowler.com/articles/continuousIntegration.html) verteilen Tests, Checks und menschliches Review seit jeher nach Kosten, Geschwindigkeit und Kritikalität über den Entwicklungsprozess. Teams mit [Continuous Delivery](https://martinfowler.com/bliki/ContinuousDelivery.html) wollen idealerweise jeden Commit deploybar halten. Prüfungen sollten so weit links wie praktikabel auf dem Weg zur Produktion liegen, weil frühe Fehler günstiger zu beheben sind.

Feedback-Sensoren – auch inferentielle – sollten entsprechend über den Lebenszyklus verteilt werden.

**Feedforward und Feedback im Änderungslebenszyklus**

- Welche Kontrollen sind schnell genug, um vor der Integration oder sogar vor einem Commit zu laufen? Beispiele: Linter, schnelle Tests und ein einfacher Code-Review-Agent.
- Welche Kontrollen sind so teuer, dass sie erst nach der Integration in der Pipeline neben einer Wiederholung der schnellen Checks laufen sollten? Beispiele: Mutation Testing und umfassenderes Code-Review, das das Gesamtbild benötigt.

![Beispiele für Feedforward-Guides und Feedback-Sensoren vor und nach der Integration](/assets/blog/harness-engineering/harness-change-lifecycle-examples.png)

**Kontinuierliche Drift- und Gesundheitssensoren**

- **Codebase-Drift-Sensoren** laufen außerhalb des Änderungslebenszyklus und erkennen schleichende Verschlechterung, etwa toten Code, schwache Testabdeckung und Dependency-Probleme.
- **Runtime-Health-Sensoren** lassen Agenten Produktionssignale wie schlechtere SLOs, Stichproben der Antwortqualität oder anomale Logs beobachten und Verbesserungen vorschlagen.

![Beispiele für kontinuierliche Codebase-Drift-Erkennung und Runtime-Feedback nach der Integration](/assets/blog/harness-engineering/harness-continuous-feedback-examples.png)

## Kategorien der Regulierung

Der Agenten-Harness wirkt wie ein [kybernetischer](https://en.wikipedia.org/wiki/Cybernetics) Regler, der Feedforward und Feedback kombiniert, um die Codebasis in einen gewünschten Zustand zu bringen. Dieser Zustand besitzt mehrere Dimensionen; jede benötigt einen anderen Harness. Die Unterscheidung ist wichtig, weil sich Harnessability und Komplexität deutlich unterscheiden.

Heute sind drei Kategorien hilfreich:

### Maintainability Harness

Die meisten Beispiele regulieren interne Codequalität und Wartbarkeit. Dieser Harness ist derzeit am einfachsten zu bauen, weil bereits ausgereifte Werkzeuge existieren.

Wie stark solche Kontrollen Vertrauen erhöhen, lässt sich mit [typischen Fehlerbildern von Coding-Agenten](https://martinfowler.com/articles/exploring-gen-ai/13-role-of-developer-skills.html) vergleichen:

- **Computational Sensors erkennen Strukturprobleme zuverlässig**, etwa duplizierten Code, zyklomatische Komplexität, fehlende Abdeckung, Architekturdrift und Stilabweichungen. Sie sind günstig, erprobt und deterministisch.
- **LLMs können semantische Probleme teilweise behandeln**, etwa semantisch duplizierten Code, redundante Tests, Brute-Force-Fixes und überkomplexe Lösungen – aber nur teuer und probabilistisch. Solche Checks gehören nicht auf jeden Commit.
- **Einige folgenreiche Probleme erkennt keiner zuverlässig**, darunter Fehldiagnosen, unnötige Features, Over-Engineering und missverstandene Anweisungen. Ohne klar spezifiziertes Ziel liegt Korrektheit außerhalb des Zuständigkeitsbereichs jedes Sensors.

### Architecture Fitness Harness

Diese Kategorie umfasst Guides und Sensoren, die architektonische Eigenschaften einer Anwendung definieren und prüfen – also [Fitness Functions](https://www.thoughtworks.com/en-de/radar/techniques/architectural-fitness-function).

Beispiele:

- Skills geben Performance-Anforderungen vor; Performance-Tests melden, ob der Agent sie verbessert oder verschlechtert hat.
- Skills beschreiben Observability-Konventionen wie Logging-Standards; Debugging-Anweisungen lassen den Agenten die Qualität der verfügbaren Logs reflektieren.

### Behaviour Harness

Dies ist die schwierigste Kategorie: Wie steuern und erkennen wir, ob sich die Anwendung so verhält, wie Nutzer es benötigen?

- **Feedforward**: eine funktionale Spezifikation – vom kurzen Prompt bis zur mehrteiligen Beschreibung.
- **Feedback**: eine KI-generierte Testsuite, die mit vernünftiger Abdeckung besteht, eventuell überwacht durch Mutation Testing, plus manuelles Testen.

Dieser Ansatz vertraut KI-generierten Tests zu stark. Einige Teams erzielen gute Ergebnisse mit dem Muster [Approved Fixtures](https://lexler.github.io/augmented-coding-patterns/patterns/approved-fixtures/), doch es passt nicht überall. Es ist ein selektives Werkzeug, keine vollständige Antwort auf Testqualität.

Bevor Teams Aufsicht und manuelles Testen sicher reduzieren können, brauchen wir bessere Behaviour Harnesses.

![Vereinfachtes Harness-Modell mit Guides und Sensoren für Wartbarkeit, Architecture Fitness und Verhalten](/assets/blog/harness-engineering/harness-types.png)

## Harnessability

Nicht jede Codebasis lässt sich gleich gut „harnessen“. Stark typisierte Sprachen liefern Type-Checking als Sensor. Klare Modulgrenzen ermöglichen Architekturregeln. Frameworks wie Spring verbergen Details, die der Agent nicht verwalten muss, und erhöhen indirekt seine Erfolgschance. Fehlen solche Eigenschaften, lassen sich die entsprechenden Kontrollen nicht bauen.

Greenfield- und Legacy-Systeme besitzen unterschiedliche Grenzen:

- **Greenfield-Teams** können vom ersten Tag an für Harnessability entwerfen. Technologie- und Architekturentscheidungen bestimmen, wie gut die Codebasis regulierbar ist.
- **Legacy-Teams** stehen besonders bei hoher technischer Schuld vor dem härteren Problem: Der Harness wird dort am dringendsten benötigt, wo er am schwierigsten zu errichten ist.

## Harness-Templates

Die meisten Unternehmen decken einen Großteil ihrer Anforderungen mit wenigen Service-Topologien ab: API-gestützte Geschäftsdienste, Event-Prozessoren und Daten-Dashboards. Reife Organisationen kodifizieren solche Topologien oft bereits als Service-Templates.

Diese Vorlagen könnten zu **Harness-Templates** werden: Bündel aus Guides und Sensoren, die einen Coding-Agenten auf Struktur, Konventionen und Technologie-Stack einer Topologie begrenzen. Teams könnten Technologien künftig auch danach auswählen, welche Harnesses dafür verfügbar sind.

![Beispielhafte Service-Topologien mit einem Harness-Template aus Guides und Sensoren](/assets/blog/harness-engineering/harness-templates.png)

### Ashbys Gesetz

[Ashbys Law of Requisite Variety](https://en.wikipedia.org/wiki/Variety_%28cybernetics%29#Law_of_requisite_variety) stärkt das Argument für vordefinierte Topologien. Ein Regler muss mindestens so viel Vielfalt besitzen wie das System, das er steuert, und kann nur regulieren, wovon er ein Modell hat. Ein LLM-basierter Coding-Agent kann fast alles erzeugen; die Festlegung auf eine Topologie verkleinert diesen Möglichkeitsraum und macht einen umfassenden Harness realistischer.

Harness-Templates erben das Wartungsproblem von Service-Templates: Nach der Instanziierung driften sie von Upstream-Verbesserungen weg. Versionierung und Beiträge können noch schwieriger werden, wenn Guides und Sensoren nicht deterministisch und schwer testbar sind.

## Die Rolle des Menschen

Menschliche Entwickler bringen Fähigkeit und Erfahrung als impliziten Harness in jede Codebasis ein. Wir kennen Konventionen und gute Praktiken, spüren die kognitive Last von Komplexität und wissen, dass unser Name an Commits steht. Hinzu kommt organisatorischer Kontext: das Ziel des Teams, tolerierte technische Schuld und die lokale Bedeutung von „gut“. Kleine Schritte in menschlichem Tempo schaffen Raum, damit diese Erfahrung wirksam wird.

Ein Coding-Agent besitzt nichts davon. Er kennt keine soziale Verantwortlichkeit, keine instinktive Abneigung gegen eine 300-Zeilen-Funktion, kein Gefühl für „das machen wir hier nicht so“ und kein Organisationsgedächtnis. Er kann nicht unterscheiden, welche Konventionen tragend und welche nur Gewohnheit sind – oder ob eine technisch korrekte Lösung zur Absicht des Teams passt.

Harnesses machen einen Teil menschlicher Erfahrung explizit, aber nur bis zu einem Punkt. Ein kohärentes System aus Guides, Sensoren und Selbstkorrektur-Loops ist teuer. Das Ziel eines guten Harness muss nicht sein, menschlichen Input abzuschaffen, sondern menschliche Aufmerksamkeit dorthin zu lenken, wo sie am meisten zählt.

## Ausgangspunkt und offene Fragen

Dieses Denkmodell verbindet Techniken, die bereits praktisch eingesetzt werden, und rahmt die offenen Probleme. Es hebt die Diskussion über einzelne Features wie Skills oder MCP-Server hinaus auf die strategische Gestaltung eines Regelsystems, das echtes Vertrauen in Agentenergebnisse erzeugt.

Aktuelle Beispiele:

- [Ein OpenAI-Team dokumentierte seinen Harness](https://openai.com/index/harness-engineering/): Schichtenarchitektur, erzwungen durch eigene Linter und Strukturtests, plus wiederkehrende „Garbage Collection“, die nach Drift sucht und Agenten Korrekturen vorschlagen lässt. Die schwierigsten Aufgaben liegen demnach heute im Entwurf von Umgebungen, Feedback-Loops und Kontrollsystemen.
- [Stripes Bericht über seine Minions](https://stripe.dev/blog/minions-stripes-one-shot-end-to-end-coding-agents) beschreibt Pre-Push-Hooks, die relevante Linter heuristisch auswählen, verschiebt Feedback nach links und nutzt „Blueprints“, um Feedback-Sensoren in Agenten-Workflows zu integrieren.
- Mutation Testing und Strukturtests sind Computational Feedback Sensors, die lange zu wenig genutzt wurden und nun neue Aufmerksamkeit erhalten.
- LSP- und Code-Intelligence-Integration sind Beispiele für Computational Feedforward Guides.
- Thoughtworks-Teams kombinieren computational und inferential Sensors gegen Architekturdrift, unter anderem Agenten mit eigenen Lintern und „Janitor Army“-Ansätze.

Viele Fragen bleiben offen. Wie bleiben Guides und Sensoren kohärent, wenn der Harness wächst? Wie weit können Agenten Zielkonflikte zwischen Anweisungen und Feedback verlässlich abwägen? Wenn ein Sensor nie auslöst, ist die Qualität hoch oder die Erkennung schwach? Wir benötigen Maße für Harness-Abdeckung und -Qualität, die mit Code Coverage und Mutation Testing vergleichbar sind. Feedforward und Feedback liegen weiterhin über Delivery-Schritte verstreut; hier besteht Raum für Werkzeuge, die sie als System konfigurieren, synchronisieren und auswerten.

Der äußere Harness wird zu einer dauerhaften Engineering-Praxis, nicht zu einer einmaligen Konfiguration.
