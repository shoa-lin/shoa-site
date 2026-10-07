---
translationKey: "gpt-6-astra-codex-harness"
locale: "de"
title: "Vom Rundenprinzip zur Control Plane: Wie GPT-6 Astra das Codex Harness neu schreibt"
description: "Asynchrone Tool-Calls, Mid-turn steering, dynamisches Reasoning und die Agents API verschieben die Agent-Entwicklung weg von selbstgebauten Runtimes hin zu einer neuen Schichtung von Fähigkeiten und Verantwortung."
publishedAt: "2026-09-15"
updatedAt: "2026-09-15"
category: "architecture"
sourceLocale: "zh"
sourceUrl: "https://developers.openai.com/api/docs/guides/latest-model"
sourceAuthor: "OpenAI Developers und Community-Material"
contentType: "adaptation"
translationStatus: "reviewed"
---

## Das Fazit vorweg

Was GPT-6 Astra verändert, ist nicht nur ein stärkeres Modell: Das Zeitmodell, das Steuerungsmodell und die Runtime-Grenzen von Agents verschieben sich gleichzeitig.

Asynchrone Tool-Calls erlauben dem Modell, während ein langsames Tool läuft, an unabhängigen Aufgaben weiterzuarbeiten; Mid-turn steering erlaubt dem Nutzer, die Anforderungen zu ändern, bevor das Modell fertig ist; `configuration_update` erlaubt der Anwendung, die Reasoning-Intensität für die folgenden Schritte anzupassen, ohne die Reasoning-Parameter auf Request-Ebene umzuschreiben, und behält dabei das Prompt-Cache-Präfix bei.

Die größere Veränderung kommt mit der Agents API, die am 10. September 2026 in die öffentliche Beta ging. Sie stellt das von OpenAI verwaltete Codex Harness über eine API bereit: Die Anwendung liefert Modellanweisungen, fachliche Tools und die Ausführungsumgebung, OpenAI übernimmt Sessions, Orchestrierung, Kontextkompaktierung, Wiederaufnahme und den Event-Stream.

Das bedeutet, dass sich in der Agent-Entwicklung gerade Verantwortung verlagert:

> Die Plattform absorbiert die generische Runtime, das Modell absorbiert einen Teil des Interaktionsprotokolls, und die Anwendungsteams konzentrieren sich wieder auf fachliche Fähigkeiten, Berechtigungsgrenzen, Ausführungsumgebung und Ergebnisverifikation.

## Warum ich diese Dinge früher selbst bauen musste

In der frühen Agent-Entwicklung waren asynchrone Tool-Calls und „unterwegs die Richtung ändern“ meist keine zwei API-Parameter, sondern ein Bündel von Zustandsmaschinen-Problemen.

Man musste unerledigte Aufgaben persistieren, Modell-Turns von Hintergrundaufgaben unterscheiden, Prozessneustarts, Timeouts, Abbrüche, doppelte Callbacks und Ergebnisse in falscher Reihenfolge behandeln; man musste neue Nutzeranweisungen in einen laufenden Ablauf einschleusen und dabei entscheiden, ob alte Ausgaben hinfällig sind und ob bereits ausgeführte Aktionen rückgängig gemacht werden können. Änderungen an der Reasoning-Intensität wirkten sich wiederum auf Request-Struktur, Cache-Treffer und das Wiedereinspielen des Kontexts aus.

Diese Arbeit erzeugt keinen fachlichen Wert, entscheidet aber darüber, ob ein Agent stabil läuft. Teams verbrachten oft viel Zeit damit, eine „Kompensationsschicht“ zu pflegen, die um die Grenzen des Modells herumgebaut war.

Astra beginnt, einen Teil davon in Protokollsemantik zu überführen.

## Mit Astra bleibt das Modell nicht mehr an langsamen Tools hängen

Asynchrone Tool-Calls in der Responses API setzen voraus, dass in der Definition eines function tool oder custom tool `async: true` gesetzt ist. Nachdem das Modell den Aufruf abgesetzt hat, kann es mit Arbeit fortfahren, die nicht von diesem Ergebnis abhängt; die Anwendung liefert das Ergebnis nach Abschluss der Aufgabe mit der ursprünglichen `call_id` zurück.

Reduziert wird hier das Warten auf Modellseite, nicht die Arbeit auf Anwendungsseite. OpenAI führt keine Hintergrundaufgaben für die Anwendung aus und stellt keine fachliche Queue bereit. Ein Produktivsystem muss weiterhin entscheiden, wer für eine Aufgabe zuständig ist, wie sie autorisiert wird, wie Retries ablaufen, wie lange Ergebnisse aufbewahrt werden und wie Fehlschläge dargestellt werden.

Laufen mehrere Aufgaben gleichzeitig, kann die Anwendung zusätzlich ein gewöhnliches `wait_for_tasks`-Tool definieren, damit das Modell erst dann wartet, wenn es die Ergebnisse tatsächlich vergleichen muss. Dieses wait-Tool gehört zum Protokoll der Anwendung selbst.

Der Wert der Asynchronität liegt deshalb nicht darin, jedem Tool async zu verpassen, sondern darin, wirklich unabhängige Arbeit früh zu starten und zugleich explizite Abhängigkeitsbarrieren beizubehalten.

## Mid-turn steering macht den Nutzer zum Steuersignal im laufenden Betrieb

Astras Mid-turn steering wird über den WebSocket-Modus der Responses API bereitgestellt. Die Anwendung sendet `response.steer`, die API reiht die neue Nutzeranforderung in die aktuelle Response ein und erzeugt automatisch eine nachfolgende continuation.

Bereits gesendete Ausgaben werden dabei nicht umgeschrieben, bereits gestartete Tools nicht zurückgenommen. `accepted` bedeutet nur, dass die Eingabe in die Warteschlange aufgenommen wurde; ob das Modell sie schon umgesetzt hat, muss man weiterhin aus den Events ablesen.

Steering ist also „Einschränkungen anhängen“, nicht „die Zeit zurückdrehen“. Das Harness muss weiterhin verwalten:

- die Beziehung zwischen der aktuellen Response und der successor-Response;
- die Reihenfolge mehrerer Steering-Eingriffe;
- die Berechtigungsgrenzen bei bereits eingetretenen Nebenwirkungen;
- die Auflösung von Konflikten zwischen Tool-Ergebnissen und der neuen Richtung;
- die Wiederaufnahmestrategie bei Verbindungsabbruch und doppelter Zustellung.

Das ist verlässlicher als das frühere handgeschriebene „Request abbrechen und Kontext neu aufbauen“, weil das Protokoll den Lebenszyklus der continuation nun selbst ausdrückt; die fachliche Semantik des Rückgängigmachens definiert es für die Anwendung aber nicht.

## configuration_update macht die Reasoning-Intensität zum Session-Zustand

Die Anwendung kann in den Verlauf einfügen:

```json
{
  "type": "configuration_update",
  "reasoning": { "effort": "high" }
}
```

Das `reasoning.effort` auf Request-Ebene behält seinen Wert, das Update wirkt nur auf die folgenden Responses. So lässt sich für Routineaufgaben eine niedrigere Reasoning-Intensität nutzen und bei Fehleranalysen oder Risikobewertungen hochfahren, während das ursprüngliche Prompt-Präfix erhalten bleibt, was der Cache-Wiederverwendung zugutekommt.

Dieser Mechanismus unterstützt derzeit nur den Standard-Einzel-Agent-Modus von GPT-6 Astra und ändert ausschließlich den reasoning effort; für aufeinanderfolgende Updates, automatische compaction und automatische truncation gelten klare Einschränkungen.

Hier sind drei Ebenen zu unterscheiden: Die API unterstützt das Protokoll bereits; die Codex-Basis hat möglicherweise schon Teile der Datenstrukturen; ob der aktuelle Codex-Client es bei gewöhnlichen Einstellungsänderungen korrekt verwendet, muss man je nach Version prüfen. Das öffentliche [Codex Issue #42996](https://github.com/openai/codex/issues/42996) meldet weiterhin Cache-Treffer-Probleme nach dem Umschalten der Reasoning-Intensität, weshalb die API-Dokumentation nicht ohne Weiteres als Beleg dafür gelten kann, dass der Client die Anbindung abgeschlossen hat.

## Von der Responses API über das Codex Harness zur Agents API

OpenAI beschreibt inzwischen drei Runtime-Grenzen sehr klar:

| Ansatz | Wer verwaltet die Runtime | Wofür geeignet |
| --- | --- | --- |
| Responses API | Die Anwendung selbst | Volle Kontrolle über den Agent-Loop nötig |
| Codex SDK / App Server | Wiederverwendung der lokalen Codex-Runtime | Codex in eigene Tools und Produkte integrieren |
| Agents API | Von OpenAI gehostetes Codex Harness | Sessions, Orchestrierung, Kompaktierung und Wiederaufnahme sollen von der Plattform verwaltet werden |

Die Bedeutung der Agents API liegt darin, dass sie das generische Harness, das bislang jedes Team neu implementieren musste, zu einer Plattformfähigkeit macht. Die offizielle Dokumentation nennt als verwaltete Fähigkeiten Sandbox, Skills, MCP, steering, Kontextverwaltung, Sub-Agents und Session-Wiederaufnahme.

Anwendungsteams müssen weiterhin Tools bereitstellen und die Ausführungsumgebung wählen, aber sie müssen nicht mehr den gesamten generischen agent loop von Grund auf implementieren.

Das heißt nicht „alles der Plattform überlassen“. Die Plattform kümmert sich um den generischen Betriebsmechanismus, die Anwendung um die fachliche Wahrheit. Zum Beispiel:

- welcher Mandant diese Daten lesen darf;
- ob ein Tool-Call externe Nebenwirkungen erzeugen darf;
- ob ein Retry doppelt abbucht oder doppelt deployt;
- welche Belege ausreichen, um eine Aufgabe als erledigt zu betrachten;
- welche Ergebnisse eine menschliche Freigabe durchlaufen müssen.

## Die Komplexität des Harness verschwindet nicht, sie wird neu geschichtet

Die bisherige Engineering-Komplexität lässt sich in drei Klassen einteilen:

1. **Modell-Kompensationskomplexität**: Warten, Kontext neu aufbauen, Unterbrechungen simulieren, asynchrone Protokolle von Hand schreiben. Astra absorbiert davon gerade einen Teil.
2. **Generische Runtime-Komplexität**: Sessions, Event-Stream, Kompaktierung, Wiederaufnahme, Sub-Agents und Sandbox. Codex Harness und Agents API absorbieren davon gerade einen Teil.
3. **Fachliche Korrektheitskomplexität**: Berechtigungen, Datenkonsistenz, Freigaben, Idempotenz, Abnahme und Audit. Das bleibt bei der Anwendung selbst.

Die eigentliche Veränderung ist also nicht „künftig kein Engineering mehr“, sondern eine Verlagerung des Engineering-Schwerpunkts:

```text
Früher: eigene Agent Runtime bauen
Heute:  Fähigkeiten anbinden, Grenzen deklarieren, Ergebnisse verifizieren
```

## Was das für Codex bedeutet

Wenn sich das Codex Harness weiterentwickelt, wandert sein Kern vom Rundenloop zur Control Plane:

```text
Event-Stream
  ├─ Modellantworten
  ├─ Tool-Start und -Abschluss
  ├─ Nutzer-steering
  ├─ Reasoning-Konfigurationsupdates
  └─ continuation

Control Plane
  ├─ aktueller conversation head
  ├─ pending task registry
  ├─ Berechtigungen und Freigaben
  ├─ Cache-Invarianten
  ├─ Wiederaufnahme und Idempotenz
  └─ Ergebnisverifikation
```

Auch die Community-Diskussionen zu LangChain, Hermes, ZeroClaw und anderen Gateways zeigen, dass die Anpassung des Ökosystems Zeit braucht, sobald ein Protokoll da ist. Das typische Problem ist nicht, „ob man das async-Feld senden kann“, sondern ob Streaming-Transformation, Message-Replay, Abschluss in falscher Reihenfolge, Wiederaufnahme nach Verbindungsabbruch und doppelte Zustellung die ursprüngliche Semantik bewahren.

## Das abschließende Urteil

Astra und die Agents API weisen gemeinsam auf eine neue Arbeitsteilung bei Agents:

> Das Modell denkt flexibler, das Protokoll drückt die Steuerung im laufenden Betrieb aus, das Harness übernimmt die generische Orchestrierung, und die Anwendung verantwortet die echten Randbedingungen der fachlichen Welt.

Das senkt die Einstiegskosten neuer Agents erheblich. Was früher Wochen an asynchronem Loop, Zustandswiederherstellung und Eingriffen mitten im Lauf kostete, könnte künftig auf das Konfigurieren der Runtime und das Anbinden von Tools hinauslaufen.

Zugleich steigen damit die Anforderungen an die Anwendungsteams, „das Problem zu definieren“. Je mehr generische Mechanismen die Plattform übernimmt, desto stärker konzentriert sich das wirklich Unterscheidende auf Tool-Design, Berechtigungsmodell, Umgebungsgrenzen, Verifikatoren und geschlossene Feedback-Schleifen.

Die Kernfrage der Agent-Entwicklung verschiebt sich von „Wie bringen wir das Modell zum Laufen?“ zu „Wie lässt es sich in der realen Welt verlässlich einsetzen?“.

## Quellen

- [OpenAI: Using GPT-6 Astra](https://developers.openai.com/api/docs/guides/latest-model)
- [OpenAI: Async tool calling](https://developers.openai.com/api/docs/guides/async-tool-calling)
- [OpenAI: Mid-turn steering](https://developers.openai.com/api/docs/guides/steering)
- [OpenAI: Change reasoning mid-conversation](https://developers.openai.com/api/docs/guides/reasoning#change-reasoning-mid-conversation)
- [OpenAI: Agents API overview](https://developers.openai.com/api/docs/guides/agents-api/overview)
- [OpenAI: Agents runtime comparison](https://developers.openai.com/api/docs/guides/agents)
- [OpenAI: Codex SDK](https://learn.chatgpt.com/docs/codex-sdk)
- [OpenAI: Codex App Server](https://learn.chatgpt.com/docs/app-server)
- [Chasing Next: Async Tool Calling in the Responses API](https://chasingnext.com/updates/async-tool-calling-in-the-responses-api)
- [The Syntax Diaries: OpenAI Async Tool Calling Without Lost Results](https://thesyntaxdiaries.com/openai-async-tool-calling)
- [LangChain Issue #40204](https://github.com/langchain-ai/langchain/issues/40204)
