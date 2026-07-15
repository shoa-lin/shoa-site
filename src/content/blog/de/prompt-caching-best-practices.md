---
translationKey: "prompt-caching-best-practices"
locale: "de"
title: "Lehren aus Claude Code: Prompt Caching ist entscheidend"
description: "Eine strukturierte Adaption der Produktionserfahrungen des Claude-Code-Teams zu stabilen Präfixen, Werkzeugen, Modellwechseln und cache-sicherer Komprimierung."
publishedAt: "2026-02-20"
updatedAt: "2026-07-16"
category: "architecture"
sourceLocale: "en"
sourceUrl: "https://x.com/trq212/status/2024574133011673516"
sourceAuthor: "Thariq Shihipar"
contentType: "adaptation"
translationStatus: "reviewed"
---

<div class="blog-article-body">

## Einführung

Engineers sagen manchmal, dass der Cache alles um sie herum bestimmt. Für langlebige Agenten gilt dasselbe.

Produkte wie Claude Code sind wirtschaftlich tragfähig, weil Prompt Caching späteren Anfragen erlaubt, Berechnungen aus früheren Turns wiederzuverwenden. Diese Wiederverwendung senkt Latenz und Kosten – besonders bei wachsenden Gesprächen.

## Die Caching-Architektur von Claude Code

Claude Code wurde um Prompt Caching herum entworfen. Eine hohe Cache-Hit-Rate senkt Betriebskosten und ermöglicht großzügigere Rate Limits für Abonnements. Das Team überwacht diese Kennzahl so genau, dass ein deutlicher Einbruch als Incident behandelt werden kann.

Die folgenden Abschnitte fassen die Erfahrungen zusammen, die bei der Optimierung von Prompt Caching im Produktionsmaßstab entstanden sind.

![Architekturdiagramm zu Prompt Caching](https://pbs.twimg.com/media/HBipHa1boAAXD_A?format=jpg&name=large)

## Wie Prompt Caching funktioniert

### Präfixabgleich

Prompt Caching arbeitet mit **Prefix Matching**. Die API kann Inhalte vom Beginn einer Anfrage bis zu den Cache Breakpoints wiederverwenden, solange dieses Präfix unverändert bleibt.

Die Reihenfolge ist deshalb entscheidend: Je mehr Anfragen denselben Anfang teilen, desto mehr bereits berechnete Arbeit lässt sich wiederverwenden.

### Die cache-freundliche Reihenfolge von Claude Code

Claude Code nutzt eine einfache Regel: **stabile Inhalte zuerst, dynamische Inhalte zuletzt**.

Eine Anfrage ist ungefähr so aufgebaut:

1. **Stabile System-Prompts und Werkzeuge** (breit geteilt)
2. **Projektkontext** (innerhalb eines Projekts geteilt)
3. **Sitzungskontext** (innerhalb einer Sitzung geteilt)
4. **Gesprächsnachrichten**

Dadurch steigt die Wahrscheinlichkeit, dass Anfragen und Sitzungen ein wiederverwendbares Präfix besitzen.

### Warum die Reihenfolge empfindlich ist

Schon scheinbar harmlose Änderungen können das Präfix brechen, zum Beispiel:

- ein genauer Zeitstempel in einem stabilen System-Prompt;
- Tool-Definitionen in nicht deterministischer Reihenfolge;
- veränderte Tool-Parameter, etwa welche Agenten ein Agentenwerkzeug aufrufen darf.

## Den Cache gültig halten

### Veraltete Informationen aktualisieren

Einige Informationen im Prompt veralten zwangsläufig: Das Datum wechselt, eine Datei wird geändert oder Runtime-Zustand bewegt sich weiter.

Einen frühen System-Prompt zu editieren wirkt sauber, verändert aber das Präfix und verursacht einen Cache Miss für alles, was folgt.

Claude Code sendet Aktualisierungen deshalb in einer späteren Nachricht. Die nächste Nutzer- oder Tool-Nachricht kann beispielsweise ein `<system-reminder>` enthalten, dass inzwischen Mittwoch ist. Das alte Präfix bleibt wiederverwendbar, während das Modell aktuelle Informationen erhält.

## Die Falle beim Modellwechsel

### Caches sind modellspezifisch

Prompt Caches sind an ein Modell gebunden. Dadurch sind Kosten weniger intuitiv, als sie zunächst wirken.

Wenn ein Gespräch bereits 100k Tokens für Opus im Cache enthält, kann eine weitere einfache Frage an Opus günstiger sein als ein Wechsel zu Haiku, weil Haiku für dieselbe Historie einen neuen Prompt Cache aufbauen müsste.

### Modellübergaben über einen Subagenten

Ist ein anderes Modell passend, bevorzugt Claude Code eine Übergabe an einen **Subagenten**, statt das Modell der bestehenden Unterhaltung zu wechseln. Opus kann für das andere Modell eine kompakte Aufgabenbeschreibung erstellen.

Explore-Agenten sind ein typisches Beispiel: Sie können Haiku verwenden, ohne den modellspezifischen Cache der Elternunterhaltung zu verwerfen.

## Warum Werkzeugänderungen teuer sind

Das Tool-Set mitten in einer Unterhaltung zu ändern ist ein weiterer häufiger Weg, die Wiederverwendung des Prompt Cache zu zerstören.

Es wirkt effizient, nur die gerade benötigten Werkzeuge bereitzustellen. Tool-Definitionen sind jedoch Teil des gecachten Präfixes. Das Hinzufügen oder Entfernen eines Werkzeugs invalidiert deshalb den nachfolgenden Gesprächspräfix.

### Plan Mode: Zustand darstellen, ohne Werkzeuge zu ändern

Plan Mode zeigt, wie Claude Code Features um diese Einschränkung herum entwirft.

Die naheliegende Implementierung würde beim Eintritt in Plan Mode das normale Tool-Set durch schreibgeschützte Werkzeuge ersetzen. Diese Schemaänderung würde den Cache brechen.

Stattdessen hält Claude Code die Werkzeuge stabil und führt `EnterPlanMode` und `ExitPlanMode` als reguläre Tools. Eine spätere Systemnachricht erklärt dem Agenten, dass er sich im Plan Mode befindet: Codebasis untersuchen, keine Dateien ändern und nach Abschluss `ExitPlanMode` aufrufen. Die Tool-Definitionen bleiben unverändert.

Da `EnterPlanMode` selbst ein Werkzeug ist, kann das Modell Plan Mode auch selbst betreten, wenn eine Aufgabe tiefere Planung erfordert – ohne das gecachte Präfix zu invalidieren.

### Tool Search: Laden aufschieben, statt Werkzeuge zu entfernen

Dasselbe Prinzip gilt für Tool Search. Claude Code kann Dutzende MCP-Werkzeuge besitzen, doch sämtliche vollständigen Schemas bei jeder Anfrage zu senden wäre teuer. Werkzeuge mitten im Gespräch zu entfernen würde den Cache ebenfalls brechen.

Die Lösung ist `defer_loading`. Claude Code sendet stabile, leichtgewichtige Tool-Stubs mit `defer_loading: true`. Bei Bedarf verwendet das Modell `ToolSearch`, um das vollständige Schema zu laden. Die Stubs bleiben in derselben Reihenfolge und erhalten so das Präfix.

Die API stellt `ToolSearch` bereit, damit Anwendungen dasselbe Muster nutzen können.

## Komprimierung und Caching

![Diagramm zu Komprimierung und Caching](https://pbs.twimg.com/media/HBitEdRbUAMVSnM?format=jpg&name=large)

Compaction geschieht, wenn sich eine Unterhaltung dem Limit des Kontextfensters nähert. Das System erzeugt eine Zusammenfassung und setzt die Arbeit mit dieser kleineren Darstellung fort.

Dadurch entstehen mehrere Sonderfälle für Prompt Caching.

### Das Problem

Für die Zusammenfassung benötigt das Modell die Gesprächshistorie. Eine naive Implementierung sendet eine separate Anfrage mit anderen System-Prompts und ohne Werkzeuge. Diese Anfrage passt nicht mehr zum Präfix des Hauptgesprächs, sodass sämtliche Input-Tokens zum vollen Preis verarbeitet werden.

### Die Lösung: ein cache-sicherer Fork

Claude Code behandelt Compaction als cache-sicheren Fork. Die Compaction-Anfrage verwendet dieselben System-Prompts, Nutzer- und Systemkontexte, Tool-Definitionen und dieselbe Historie wie die Elternanfrage. Die Compaction-Anweisung wird als neue Nutzernachricht am Ende angehängt.

Aus Sicht der Präfixabrechnung teilt die Anfrage Präfix, Tools und Historie mit der Elternanfrage. Der Cache kann wiederverwendet werden; frisch verarbeitet werden hauptsächlich die Tokens der angehängten Compaction-Anweisung. Das Modell muss die Zusammenfassung weiterhin generieren, daher werden diese Berechnung und Output-Tokens weiterhin berechnet.

Außerdem wird ein Compaction-Puffer benötigt: Im Kontextfenster muss genug Platz für die neue Anweisung und die erzeugte Zusammenfassung bleiben.

## Fünf Lehren

Compaction ist subtil, doch die allgemeinen Lehren gelten für jeden Agenten auf Basis von Prompt Caching.

<div class="info-box">

**1. Prompt Caching ist Präfixabgleich**

Jede Änderung im Präfix invalidiert alles danach. Entwirf die Anfrage von Anfang an mit stabiler Reihenfolge.

</div>

<div class="tip-box">

**2. Aktualisierungen als Nachrichten senden**

Änderungen an Datum, Runtime-Zustand oder Modus sollten angehängt werden, statt frühe System-Prompts umzuschreiben.

</div>

<div class="warning-box">

**3. Modell oder Werkzeuge nicht mitten im Gespräch wechseln**

Nutze Übergaben für Modellwechsel, Tools für Zustandsübergänge und Deferred Loading für große Werkzeugkataloge.

</div>

<div class="info-box">

**4. Cache-Hit-Rate wie Uptime überwachen**

Wenige Prozentpunkte können Kosten und Latenz spürbar verändern. Cache-Regressionen verdienen operative Alarme.

</div>

<div class="tip-box">

**5. Abgezweigte Arbeit sollte das Elternpräfix erhalten**

Compaction, Zusammenfassungen und andere Nebenberechnungen sollten möglichst die cache-sichere Anfrageform des Elternprozesses wiederverwenden.

</div>

## Fazit

Claude Code wurde von Beginn an um Prompt Caching herum gebaut. Die praktische Lehre lautet nicht, dass jeder Agent exakt dieselbe Anordnung kopieren muss. Cache-Stabilität sollte jedoch als architektonische Anforderung erster Klasse behandelt werden.

---

> Strukturierte Adaption eines X-Artikels von Thariq Shihipar auf Basis der Produktionserfahrungen des Claude-Code-Teams.

</div>
