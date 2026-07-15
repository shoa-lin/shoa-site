---
translationKey: "ai-agent-patterns"
locale: "de"
title: "KI-Agent-Designmuster (Teil 1): Zuverlässiger Betrieb"
description: "Eine praktische Aufgabenkarte dafür, wie Agenten schlussfolgern, Werkzeuge einsetzen, zusammenarbeiten, sich erinnern und in Produktionsumgebungen sicher und kontrollierbar bleiben."
publishedAt: "2026-04-09"
updatedAt: "2026-07-16"
category: "architecture"
sourceLocale: "zh"
sourceUrl: "https://www.bydziwen.top/blog/ai-agent-patterns/"
sourceAuthor: "Shoa Lin"
contentType: "original"
translationStatus: "reviewed"
---

Viele Agenten-Artikel vermischen zwei Dinge: **wie man ein Modell eine Aufgabe ausführen lässt** und **wie man das System zuverlässig macht**. Das Ergebnis ist, dass man eine Reihe von Begriffen auswendig kennt, aber beim eigentlichen Design nicht weiß, welches Problem man zuerst lösen soll.

Dieser Artikel beantwortet zuerst nur die erste Sache: Wie ein Agent entscheidet, handelt, kooperiert und in einer realen Umgebung kontrollierbar bleibt. Du kannst es als eine Art Aufgabenkarte betrachten: Beginnend mit dem Interaktionszyklus eines einzelnen Agents, dann schrittweise über Mehrpersonen-Zusammenarbeit, Gedächtnis und Wissen, und schließlich ergänzt um Sicherheit und Fehlertoleranz für den Produktivbetrieb.

Beim Lesen musst du die Namen der Modelle nicht auswendig lernen. Jede Sektion will im Kern beantworten: **Welche Unsicherheit muss in dieser Art von Aufgabe beseitigt werden?** Manchmal geht es darum, was als Nächstes zu tun ist, manchmal wer es tun soll, manchmal wie man sich etwas merkt, und manchmal darum, irreversible Folgen zu vermeiden.

## Erste Ebene: Kernmuster für einen einzelnen Agenten

### 01 ReAct — Verzahntes Denken und Handeln

**Paper**: Yao et al., 2022 — _ReAct: Synergizing Reasoning and Acting in Language Models_

💡 Kernidee

Nicht zuerst alles durchdenken und dann handeln, sondern **denken und handeln gleichzeitig**. LLMs erzeugen abwechselnd **Thought (Überlegung)** und **Action (Handlung)** und führen nach Beobachtung des Ergebnisses weiteres Denken aus.

> Thought: Der Benutzer möchte das Wetter in Peking heute wissen. Ich muss nachschauen.
> Action: search("Pekinger Wetter 9. April 2026")
> Observation: Sonnig, 18°C, Nordwind Stufe 3
> Thought: Ich habe die Wetterdaten, kann antworten.
> Answer: In Peking ist es heute sonnig, 18°C, Nordwind Stufe 3.

**Warum es funktioniert**:

-   **Denken leitet die Handlung**: Jede Action wird durch ein Thought erklärt, wodurch willkürliche Versuche reduziert werden
-   **Handlung unterstützt das Denken**: Observation liefert Informationen aus der realen Welt, wodurch weitere Überlegungen genauer werden
-   **Erklärbarkeit**: Die Thought-Kette dient gleichzeitig als „Entscheidungsprotokoll“

**Anwendungsbereich**: Aufgaben, die mehrstufiges Denken + Tool-Aufrufe erfordern (Fragen und Antworten, Analyse, Debugging)

**Begrenzungen**: Lange Ketten neigen dazu, "abzuschweifen"; nachfolgende Beobachtungen könnten vom ursprünglichen Ziel abweichen. Es ist notwendig, den Ansatz mit Reflection- oder Planning-Modi zur Richtungsbegrenzung zu kombinieren.

### 02 Plan-and-Execute — Erst nachdenken, dann handeln

💡 Kernidee

Erstelle einen vollständigen Ausführungsplan und führe ihn dann **schrittweise aus**, anstatt bei jedem Schritt neu zu improvisieren. Im Gegensatz zu ReActs „Denken während des Handelns“ trennt dieses Muster **Planung** und **Ausführung** in zwei klar definierte Phasen.

> [Planungsphase]
> Nutzer: Hilf mir, die neuesten Entwicklungen des Konkurrenten HireGo zu analysieren
> Plan:
>   1. Informationen über das Produkt auf der HireGo-Website suchen
>   2. Bewertungen im Google Play / App Store durchsuchen
>   3. Die letzten 30 Tage relevante Berichte in der Technologiepresse suchen
>   4. Stellenangebote auf LinkedIn durchsuchen (um die Richtung der Teamerweiterung zu beurteilen)
>   5. Basierend auf den obigen Informationen ein Wettbewerbsinformationsdossier erstellen
>
> [Ausführungsphase]
> Schritt 1 ausführen → beobachten → Schritt 2 ausführen → beobachten → ... → endgültiger Bericht

**Wichtige Gestaltungspunkte**:

-   **Der Plan kann dynamisch angepasst werden**: Wenn während Schritt 2 neue Hinweise auftauchen, kann man Schritt 1 der Suche nachträglich ergänzen
-   **Ergänzend zu ReAct**: Plan-and-Execute bietet die "globale Übersicht", ReAct die "lokale Flexibilität"
-   **In der Praxis oft kombiniert**: Zuerst einen grobgranularen Plan erstellen, in jedem Schritt den ReAct-Modus für die Ausführung verwenden

**Anwendungsbereiche**: Mehrschrittige Aufgaben mit klarem Ablauf (Forschungsberichte, Datenverarbeitungspipelines, Code-Refactoring)

**Begrenzungen**: Der initiale Plan ist möglicherweise nicht perfekt; bei starken Umweltänderungen wird ein statischer Plan überholt.

### 03 Reflection — Rückblick nach Abschluss

💡 Kernidee

Der Agent sollte **seine Ausgaben bewerten**, Mängel erkennen und sich selbst korrigieren. Dies ist möglicherweise der "menschlichste" Modus — man bearbeitet eine Aufgabe, überprüft sie, erkennt Fehler und korrigiert sie.

> [Erste Ausgabe]
> "NVIDIA Umsatz im Q1 2026: 28 Milliarden US-Dollar, +78% gegenüber dem Vorjahr"
>
> [Selbstreflexion]
> Moment, lass mich überprüfen: 28 Milliarden vs 26 Milliarden im ersten Quartal des letzten Jahres...
> 28/26 - 1 = 7,7%, nicht 78%. 78% ist das Wachstum im Vergleich zum ersten Quartal 2024.
> Ich sollte die Vergleichsbasis klar angeben.
>
> [Korrigierte Ausgabe]
> "NVIDIA Umsatz im Q1 2026: 28 Mrd. USD, ein Anstieg von 7,7% im Vergleich zum Vorquartal, ein Anstieg von 78% zum Vorjahresquartal"

**Das klassische Beispiel von Andrew Ng**: LLM Code schreiben lassen → Test ausführen → Fehler an LLM zurückmelden → LLM Code korrigieren → erneut testen. Dieser Zyklus kann mehrmals wiederholt werden, bis alles korrekt ist.

**Wichtige Umsetzungspunkte**:

- Rückmeldesignale können **extern** sein (Testergebnisse, Benutzerfeedback, Tool-Rückmeldungen) oder **intern** (LLM Selbstbewertung)
- Die Reflexionshäufigkeit sollte kontrolliert werden: ständiges Reflektieren verschwendet Zeit, nur an kritischen Punkten reflektieren (nach Fertigstellung des Codes, nach Erstellung des Berichts)
- Es werden klare "Abschlusskriterien" benötigt, sonst arbeitet der Agent unendlich im "Reflektionsmodus"

**Anwendbare Szenarien**: Codegenerierung, Schreiben, Datenanalyse – jede Aufgabe, bei der "Qualität wichtig ist"

### 04 Tool Use — Agenten handlungsfähig machen

💡 Kernidee

LLM ist selbst nur ein Textgenerator. Durch **Function Calling / Tool Use** kann es echte Werkzeuge bedienen. Dies ist die **Infrastruktur** aller Agent-Systeme – ohne Tool Use kein Agent.

> Benutzer: "Hilf mir, eine Erinnerungsfunktion einzurichten, die mich morgen um 9 Uhr an das Meeting erinnert"
>
> Interne LLM-Entscheidung:
>   muss aufgerufen werden → cron_schedule(
>     Nachricht: "Erinnerung: Meeting um 9 Uhr",
>     Zeit: "2026-04-10T09:00:00+08:00"
>   )
>
> → Aufruf erfolgreich → "Erinnerung eingerichtet: Morgen 9:00 Uhr — Meeting nicht vergessen"

**Kategorisierung von Tools**:

| Kategorie | Beispiel | Merkmale |
| --- | --- | --- |
| **Informationsbeschaffung** | web_search, web_fetch, read_file | Nur Lesen, keine Nebenwirkungen |
| **Handlungsausführung** | send_message, write_file, exec | Mit Nebenwirkungen, Vorsicht geboten |
| **Interaktive Werkzeuge** | browser, message, canvas | Bidirektionale Kommunikation |
| **Rechenwerkzeuge** | calculator, code_interpreter | Deterministische Ausgabe |

**Praxis der Technik**:

-   **Die Qualität der Werkzeugbeschreibung bestimmt die Aufrufqualität**: Ob ein LLM das richtige Werkzeug korrekt auswählen kann, hängt zu 90% davon ab, wie gut die Beschreibung des Werkzeugs geschrieben ist
-   **Prinzip der minimalen Rechte**: Ein Agent benötigt nur die Werkzeuge, die für seine aktuelle Aufgabe nötig sind; nicht alle auf einmal geben
-   **Fehlerbehandlung ist zentral**: Werkzeugaufrufe schlagen oft fehl, der Agent muss in der Lage sein, Fehler elegant zu behandeln (erneuter Versuch, Fallback, Meldung)

### 05 Chain-of-Thought & Tree-of-Thought

**Chain-of-Thought**: Den LLM dazu bringen, "den Denkvorgang aufzuschreiben" anstatt direkt die Antwort zu geben.

> Schlechte Methode: "Die Antwort ist 42" (Blackbox)
> Gute Methode: "Sei x..., einsetzen in die Formel ergibt..., also ist die Antwort 42" (Prozess sichtbar)

Dies ist kein eigenständiger Agent-Modus, sondern **die grundlegende Infrastruktur aller Modi** – Thought in ReAct, Plan in Plan-and-Execute, Bewertung in Reflection, alle hängen von CoT ab.

**Tree-of-Thought**: Eine Weiterentwicklung von CoT – nicht nur eine Denkreihe, sondern **mehrere Wege erkunden und den optimalen auswählen**.

> Frage: "Wie kann man die Latenz der Such-API von 2s auf 200ms reduzieren?"
>
> Weg A: Schnelleren API-Anbieter wechseln → Kosten steigen 3x → nicht empfohlen
> Weg B: Caching-Ebene hinzufügen → Trefferquote unbekannt → Bewertung nötig
> Weg C: Mehrere APIs gleichzeitig abfragen, die schnellste Antwort nehmen → Komplexität steigt → einen Versuch wert
>
> Bewertung: Weg C kann das Ziel bei kontrollierbaren Kosten erreichen → Weg C wählen

**Anwendungsfälle**: Komplexe Entscheidungen, die mehrere Lösungsansätze erfordern (Architekturdesign, Auswahl von Lösungen)

## Zweite Ebene: Multi-Agenten-Kollaborationsmodus

Wenn ein einzelner Agent nicht ausreicht, ist **die Zusammenarbeit mehrerer spezialisierter Agenten** erforderlich. Dies führt in den Bereich der Orchestrierung.

### 06 Supervisor — Vorgesetzter weist Aufgaben zu

Ein "Supervisor Agent" ist dafür verantwortlich, die Absichten der Benutzer zu verstehen, die Aufgaben zu zerlegen und sie dann **an spezialisierte Agenten zur Ausführung zu verteilen**.

> Benutzer: "Erstelle mir bitte einen Wochenbericht über die KI-Branche"
>
> Supervisor Agent:
>   → Informationssammlung Agent: "Sammle die wichtigsten Nachrichten der KI-Branche dieser Woche"
>   → Finanz Agent: "Sammle die Aktienkursentwicklungen KI-bezogener Unternehmen dieser Woche"
>   → Forschungs Agent: "Sammle die wichtigen wissenschaftlichen Arbeiten dieser Woche"
>   ← Zusammenfassung aller Ausgaben der Agenten → Integration in einen Wochenbericht → An den Benutzer senden

💡 **Eine gängige Praxis** ist, dass der Supervisor Agent die Informationssammlung, Finanzen und Forschung spezialisierter Agenten koordiniert.

**Vorteile**: Klare Verantwortlichkeiten, jeder Agent konzentriert sich auf sein Fachgebiet
**Nachteile**: Supervisor ist ein zentraler Engpass; wenn die Aufgabenzerlegung fehlerhaft ist, kann die gesamte Pipeline aus der Bahn geraten

### 07 Hierarchical — Schichtmanagement

Die erweiterte Version des Supervisors — **eine mehrstufige Befehlskette**.

```text
协调 Agent
├── 产品负责人 Agent — 负责产品相关任务
│   ├── 竞品分析 Agent — 数据搜集
│   └── 用户研究 Agent — 数据搜集
├── 技术负责人 Agent — 负责技术任务
│   ├── 前端开发 Agent
│   └── 后端开发 Agent
└── 运营负责人 Agent — 负责运营任务
    ├── 数据分析 Agent
    └── 内容创作 Agent
```

**Unterschied zum Supervisor**: Supervisor ist "flach" — ein Vorgesetzter leitet direkt alle. Hierarchical ist "baumförmig" — mit mittleren Managementebenen, die größere Aufgaben bewältigen können.

### 08 Swarm — Dezentraler Schwarm

Keine zentrale Kontrolle, Agenten arbeiten über **Hand-off** zusammen.

> Benutzer: "Ich möchte ein Flugticket von Peking nach Shanghai buchen"
>
> Routing Agent:
>   Absicht analysieren → als "Flugbuchung" erkennen
>   → Übergabe an Flugticket Agent
>
> Flugticket Agent:
>   Flüge suchen → Login erforderlich feststellen
>   → Übergabe an Authentifizierungs Agent
>
> Authentifizierungs Agent:
>   Benutzer durch Login führen → erfolgreicher Login
>   → Rückübergabe an Flugticket Agent
>
> Flugticket Agent:
>   Buchungsvorgang fortsetzen → abgeschlossen

**Handoff (Hand-off)**: Nachdem Agent A seinen Teil abgeschlossen hat, übergibt er den Kontext an Agent B zur Fortsetzung. Es gibt keinen globalen Manager, jeder Agent ist nur für seine eigenen Aufgaben verantwortlich.

**Vorteile**: flexibel, skalierbar, kein Single Point of Failure
**Nachteile**: schwer nachverfolgbarer Prozess; wenn die Handoff-Logik schlecht gestaltet ist, kann die Aufgabe zwischen den Agents „Hin- und Her-Pingpong“ laufen

**Typische Implementierung**: Das OpenAI Swarm Framework ist genau nach diesem Muster konzipiert.

### 09 Blackboard — Geteiltes Schwarzes Brett

Mehrere Agents arbeiten um ein **geteiltes Schwarzes Brett**, schreiben nacheinander Informationen darauf und können auch die Informationen anderer lesen.

```text
[共享黑板]
┌─────────────────────────────────┐
│ 用户需求: "做一个天气预报 App"    │
│                                 │
│ [搜索 Agent 写入]               │
│ 天气API: OpenWeatherMap 免费    │
│ 地理API: Nominatim              │
│                                 │
│ [设计 Agent 写入]               │
│ 技术栈: React + Node.js        │
│ 架构: 三层（UI/API/数据）        │
│                                 │
│ [代码 Agent 读取黑板后开始编码]  │
│ ...                            │
└─────────────────────────────────┘
```

**Unterschied zum Supervisor**: Ein Supervisor ist „instruktionsgesteuert“ – der Vorgesetzte sagt, wer was tun soll. Blackboard ist „datengetrieben“ – wer Informationen sieht, die er bearbeiten kann, handelt selbstständig.

### 10 Pipeline / DAG — Produktionskette

Die Aufgabe wird in **feste Phasen** unterteilt, jede Phase wird von einem Agenten bearbeitet, die Daten fließen sequentiell.

> Eingang → [Sammel-Agent] → [Analyse-Agent] → [Schreib-Agent] → [Prüf-Agent] → Ausgang
>          Rohdaten        Strukturierte Analyse   Berichtserstellung  Qualitätskontrolle

- Jede Phase kann parallel bearbeitet werden (wenn keine Abhängigkeit zwischen den Phasen besteht)
- Daten werden zwischen den Phasen über definierte Schnittstellen übertragen
- Einfach zu überwachen und zu debuggen (Eingang und Ausgang jeder Phase sind bestimmt)

**Begrenzung**: Wenig Flexibilität – der Prozess ist fest vorgegeben und kann nicht dynamisch anhand von Zwischenergebnissen angepasst werden.

## Dritte Schicht: Speicher- und Wissensmuster

Agents haben kein „echtes Gedächtnis“, jedes Gespräch beginnt neu. Das Speichermuster löst genau das Problem der **Informationsaufbewahrung über Sitzungen hinweg**.

### 11 Kurzzeitgedächtnis — Aktueller Gesprächskontext

**Wesentlich**: Es ist das Kontextfenster (Context Window) des LLM.

> Aktuelles Gespräch:
> Benutzer: „Hilf mir, NVIDIA zu analysieren“
> Agent: [Verwendet Suchwerkzeuge, um Daten zu bekommen]
> Benutzer: „Und AMD?“ ← Der Agent weiß durch das Kurzzeitgedächtnis, dass „Analyse“ auf Finanzanalyse verweist

**Technische Herausforderungen**:

- **Begrenztes Kontextfenster**: Lange Gespräche „vergessen“ frühere Inhalte (GPT-4 128K, Gemini 1M, GLM 128K)
- **Akkumulation von Rauschen**: Je länger das Gespräch, desto mehr irrelevante Informationen, die die Qualität des Schlussfolgerns beeinträchtigen
- **Kosten**: Token-Anzahl = Geld, langer Kontext = hohe Kosten

**Technische Praxis**: Gesprächskomprimierung (regelmäßige Zusammenfassungen), Schiebefenster (nur die letzten N Runden behalten), Retrieval-gestützt (relevante Abschnitte bei Bedarf abrufen)

### 12 Langzeitgedächtnis — Wissensbewahrung über Sitzungen hinweg

Dem Agent ermöglichen, Informationen **zwischen Gesprächen** zu behalten — sich daran erinnern, wer du bist, was du getan hast, deine Vorlieben.

| Methode | Prinzip | Vorteile | Nachteile |
| --- | --- | --- | --- |
| **Datei-Gedächtnis** | Lesen und Schreiben von MEMORY.md / .learnings/ | Einfach, transparent, überprüfbar | Grobe Granularität, manuelle Pflege |
| **Vektor-Gedächtnis** | Informationen nach Einbettung in eine Vektordatenbank speichern | Semantische Suche, automatische Assoziation | Benötigt zusätzliche Infrastruktur |
| **Strukturiertes Gedächtnis** | Wissensgraph, relationale Datenbank | Präzise Abfragen, starke Schlussfolgerungsfähigkeit | Hohe Aufbaukosten |

💡 **Ein gängiges Praxisbeispiel zur Dateigedächtnisverwaltung**: Verwenden von Langzeitgedächtnisdokumenten, um stabile Fakten zu speichern, die ursprünglichen Kontexte nach Datum archivieren und Fehler sowie Verbesserungen im Lerntagebuch festhalten.

### 13 RAG — Retrieval-gestützte Generierung

Das LLM soll nicht alles Wissen „merken“, sondern bei Bedarf **relevante Informationen aus externen Wissensdatenbanken abrufen** und in die Eingabeaufforderung integrieren.

> Benutzer: „Was haben wir am 02.04.2026 besprochen?“
>
> → Vektordatenbank abrufen: query="02.04.2026 besprochen"
> → Abruf: relevante Abschnitte aus memory/2026-04-02.md
> → In die Aufforderung einfügen: „Beantworte die Nutzerfrage basierend auf folgendem Kontext: [Abrufresultat]“
> → LLM erzeugt Antwort

💡 **RAG ist der „Suchmotor“ des Gedächtnismodells** — es geht nicht darum, **wie man speichert**, sondern **wie man schnell die benötigten Informationen findet**.

## Vierte Ebene: Produktionsreife technische Muster

Zwischen akademischem Prototyp und einsatzfähigem Produktionssystem liegen technische Praktiken.

### 14 Guardrails — Sicherheitsvorrichtungen

Setze **Grenzen für das Verhalten des Agents**, um zu verhindern, dass er Dinge tut, die er nicht tun sollte.

```text
[输入护栏]                          [输出护栏]
用户输入 → ┌──────────┐ → LLM → ┌──────────┐ → 最终输出
          │ 过滤敏感词  │         │ 验证事实   │
          │ 检测注入    │         │ 检查格式   │
          │ 限制话题    │         │ 过滤有害内容│
          └──────────┘         └──────────┘
```

| Ebene | Beispiel |
| --- | --- |
| **Eingabeüberprüfung** | Erkennung von Prompt-Injektionen, Filterung sensibler Anweisungen |
| **Werkzeugberechtigungen** | Whitelist für exec-Befehle, Bestätigung erforderlich für Dateischreiboperationen |
| **Ausgabeprüfung** | Faktenprüfung, Formatvalidierung, Filterung sensibler Informationen |
| **Verhaltensbeschränkungen** | Einschränkung des Agenten auf den Zugriff auf bestimmte Datenquellen, keine externen Nachrichten senden zu können |

### 15 Human-in-the-Loop — Mensch im Kreislauf

Der Agent ist nicht vollständig autonom, **wichtige Entscheidungen müssen vom Menschen bestätigt werden**.

> Agent: "Ich bin bereit, das Verzeichnis /tmp/old-data/ zu löschen, insgesamt 342 Dateien. Löschen bestätigen?"
> Mensch: [Bestätigen] / [Ablehnen] / [Ändern: Nur .log-Dateien löschen]

| Entscheidungstyp | Automatisierungsgrad | Grund |
| --- | --- | --- |
| Datei lesen, suchen | Vollautomatisch | Keine Nebenwirkungen |
| Datei an bestimmten Ort schreiben | Halbautomatisch | Kann vorhandene Inhalte überschreiben |
| Nachricht an andere senden | Bestätigung erforderlich | Externe Auswirkungen |
| Daten löschen | Bestätigung erforderlich | Unwiderrufliche Aktion |
| Shell-Befehl ausführen | Nach Risikostufe | Kann Systemsicherheit beeinträchtigen |

**Technische Umsetzung**: Das Genehmigtor (Approval Gate) ist eine typische Implementierung von Human-in-the-Loop.

### 16 Fallback & Retry — Fehlertoleranz und Herabstufung

Jeder Schritt des Agents kann fehlschlagen, das System muss **Fehler elegant verarbeiten** können.

```text
搜索请求 → web_search(Gemini)
              ↓ 429 限流
           unified-search(Tavily)
              ↓ 无结果
           unified-search(Exa)
              ↓ 全部失败
           返回提示: "搜索服务暂时不可用，请稍后重试"
```

💡 **Eine robuste Suchschicht** kann automatisch auf eine Ersatzquelle umschalten, wenn die Hauptsuchquelle keine Ergebnisse liefert, und dem Benutzer bedeutungsvolle Herabstufungsergebnisse bereitstellen.

**Prinzipien der Fehlertoleranzgestaltung**:

1.  **Schnelles Scheitern (Fail Fast)**: Warte nicht zu lange bei einem zum Scheitern verurteilten Vorgang
2.  **Sinnvolle Herabstufung**: Die Fallback-Lösung darf nicht „gar nichts tun“, sie muss Teilfunktionen bereitstellen
3.  **Begrenzte Wiederholungen**: Unendliche Wiederholungen = Endlosschleife, maximale Wiederholungsanzahl muss festgelegt werden
4.  **Aufzeichnung der Fehlerursache**: Schreiben Sie Fehler in eine strukturierte Fehlerwarteschlange zur späteren Analyse und Verbesserung

### 17 Self-Improvement — Selbstverbesserung

Der Agent kann aus seinen eigenen Fehlern lernen und sich kontinuierlich verbessern.

```text
执行任务 → 出错 → 记录错误 → 分析模式 → 提炼规则 → 下次避免
                                                    ↑
                                              注入到行为中
```

**Eine typische Umsetzung**:

-   Automatische Fehlererkennung nach dem Aufruf eines Werkzeugs und Schreiben in eine strukturierte Fehlerwarteschlange
-   Einfügen von Lernhinweisen in den Prompt vor der Konstruktion
-   Durch regelmäßige Prüfung archivierter Fehler, Identifikation wiederkehrender Muster und Überführung von Regeln in stabile Konfigurationen

💡 **Wichtige Erkenntnis**: Das Kernprinzip der Selbstverbesserung ist nicht das „Lernen“ selbst — LLMs lernen von Natur aus aus dem Kontext. Der Kern ist **Lernen nachhaltig, systematisch und automatisiert** zu gestalten, ohne auf menschliche Erinnerungen angewiesen zu sein.

## Übersicht der Muster

```text
[生产级工程层]
├ Guardrails
├ Human-in-Loop
├ Fallback
└ Self-Improvement

[多 Agent 编排层]
├ Supervisor
├ Hierarchical
├ Swarm
├ Blackboard
└ Pipeline

[记忆与知识层]
├ 短期记忆
├ 长期记忆
└ RAG

[单 Agent 核心层]
├ ReAct
├ Plan-Execute
├ Reflection
└ Tool Use · CoT / ToT
```

Ein vollständiges Agentensystem verwendet normalerweise gleichzeitig: **ReAct** (denken und Werkzeuge gleichzeitig nutzen), **Tool Use**, **Supervisor** (koordinierender Fachexperten-Agent), **Dokumentenspeicher**, **Guardrails**, **Human-in-the-Loop**, **Fallback** und **Self-Improvement**. Diese Muster bilden zusammen ein funktionierendes und steuerbares System.

## Auswahlleitfaden

| Aufgabenmerkmale | Empfohlenes Modell | Begründung |
| --- | --- | --- |
| Einfache Frage-Antwort | **ReAct + Werkzeugnutzung** | Kann in ein oder zwei Schritten gelöst werden, erfordert keine komplexe Planung |
| Mehrschrittige Forschung | **Plan-and-Execute + ReAct** | Erfordert einen globalen Überblick, aber jede Phase benötigt Flexibilität |
| Code-Erstellung | **Werkzeugnutzung + Reflexion** | Muss Code tatsächlich ausführen und korrigieren |
| Bereichsübergreifende Zusammenarbeit | **Supervisor / Hierarchisch** | Benötigt fachliche Arbeitsteilung |
| Hohe Parallelverarbeitung | **Schwarm / Pipeline** | Benötigt keine zentrale Koordination, kann parallel arbeiten |
| Wissensintensiv | **RAG + Langzeitgedächtnis** | Muss Wissen aus großen Datenmengen abrufen |
| Sicherheitskritisch | **Richtlinien + Mensch-im-Loop** | Erfordert Einschränkungen und Bestätigung |
| Länger laufend | **Selbstverbesserung + Fallback** | Muss aus Fehlern lernen, benötigt Fehlertoleranz |

## Zusammenfassung: Erst das Aufgabenmuster wählen, dann über die Code-Struktur sprechen

An diesem Punkt solltest du zunächst beurteilen können, wie ein Agent **arbeiten sollte**: Muss er denken und handeln gleichzeitig, oder zuerst planen und dann ausführen; braucht er einen Supervisor zur Koordination oder sollen Fachexperten-Agenten eigenständig übergeben; was muss erinnert werden und bei welchen Schlüsselschritten soll der Mensch zur Kontrolle eingreifen.

Diese Entscheidungen bestimmen die Verhaltensgrenzen des Systems. Der nächste Schritt ist erst, diese Fähigkeiten in eine austauschbare, beobachtbare und wiederherstellbare Code-Struktur zu organisieren.

## Nächster Teil: Designmuster für AI-Agenten

Im nächsten Teil wird nicht mehr diskutiert, was ein Agent tun sollte, sondern die ingenieurstechnische Umsetzung: wie Werkzeuganbieter ersetzt werden können, wie Querschnittslogik zusammengeführt wird, wie lange Aufgaben wieder aufgenommen werden können und wie klassische Software-Designmuster genutzt werden, um Agentensysteme stabiler und leichter weiterentwickelbar zu machen.
