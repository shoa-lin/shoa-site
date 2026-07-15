---
translationKey: "ai-agent-retry-state"
locale: "de"
title: "Wenn KI handelt, bedeutet Retry nicht mehr nur „noch einmal antworten“"
description: "Vom erneuten Generieren im Chatbot bis zum Fork in Codex: Warum ein Agent-Retry Gesprächs-, Ausführungs-, externen und Audit-Zustand betrifft."
publishedAt: "2026-07-15"
updatedAt: "2026-07-16"
category: "architecture"
sourceLocale: "zh"
sourceUrl: "https://www.bydziwen.top/blog/ai-agent-retry-state/"
sourceAuthor: "Shoa Lin"
contentType: "original"
translationStatus: "reviewed"
---

## Fazit vorweg

**Solange KI nur Text erzeugt, bedeutet Retry, eine weitere Antwort zu sampeln. Sobald KI in der realen Welt handelt, kann Retry bedeuten, eine Aufgabe ein zweites Mal auszuführen.**

Das ist ein wichtiger Hintergrund dafür, warum Agentenprodukte wie Codex den traditionellen Button zum erneuten Generieren nicht mehr in den Vordergrund stellen:

- Ein Chatbot-Retry ersetzt normalerweise nur einen Textabschnitt.
- Ein Agentenlauf kann bereits Dateien verändert, Befehle ausgeführt oder externe Werkzeuge aufgerufen haben.
- Beim zweiten Lauf ist die Welt nicht mehr dieselbe wie vor dem ersten.
- Eine verlässlichere Interaktion besteht deshalb darin, Feedback zu geben, einen fehlgeschlagenen Schritt erneut auszuführen oder von einem klar definierten Zustand aus zu forken.

Eine Einschränkung ist wichtig: Es gibt keine offizielle Aussage, Codex habe Retry „wegen zu komplexer Zustände abgeschafft“. Dieser Artikel ist eine architektonische Interpretation der öffentlich dokumentierten Modelle Thread, Turn, Item und Fork.

![Retry wird vom erneuten Antworten zu einer Verzweigung, die den Verlauf bewahrt](/assets/blog/ai-agent-retry-state/retry-becomes-fork-de.png)

Bei früheren Chatbots habe ich mich an eine kleine Funktion gewöhnt: **Retry**, häufig auch **Regenerate** genannt.

Man stellte eine Frage, die KI gab eine Antwort, und wenn diese nicht zufriedenstellend war, klickte man einmal, um eine neue Version zu erhalten. Die Frage musste nicht neu formuliert werden.

Diese Interaktion fühlte sich so selbstverständlich an, dass Codex bei mir eine Frage auslöste: **Warum ist der vertraute Button zum erneuten Generieren dort kaum noch zu sehen?**

Wurde er einfach weggelassen? Oder braucht ein Agentenprodukt ein anderes Interaktionsmodell?

Heute halte ich folgende Erklärung für wahrscheinlicher:

> Solange KI nur Text erzeugt, bedeutet Retry, eine weitere Antwort zu sampeln. Sobald KI in der realen Welt handelt, kann Retry bedeuten, eine Aufgabe erneut auszuführen.

Oberflächlich unterscheiden sich diese beiden Vorgänge nur durch einen Button. Dahinter stehen jedoch zwei völlig verschiedene Systeme.

## Warum Retry im Chatbot-Zeitalter so einfach war

Die grundlegende Interaktion eines klassischen Chatbots sieht ungefähr so aus:

```text
Nutzerfrage → Modellgenerierung → Antwort A
                              └→ Retry → Antwort B
```

Ist die erste Antwort unbefriedigend, kann das System denselben Gesprächskontext beibehalten und das Modell erneut generieren lassen. Selbst wenn die alte Antwort verworfen wird, entstehen normalerweise keine schwerwiegenden Folgen.

Denn in den meisten Fällen verändert ein Chatbot lediglich Text auf dem Bildschirm:

- Er ändert keine lokalen Dateien.
- Er führt keinen Befehl aus.
- Er verändert keinen Git-Branch.
- Er schreibt keine Daten in externe Systeme.
- Er sendet keine E-Mail, die sich nicht zurückholen lässt.

Aus Produktsicht ist das so, als würde man eine Person bitten, dieselbe Aufgabe auf eine andere Weise zu beantworten. Ist der erste Entwurf schlecht, zerknüllt man das Papier und schreibt ein neues Blatt.

Chatbot-Retry lässt sich deshalb meist so verstehen: **Eingabe behalten, Ausgabe verwerfen und einen neuen Kandidaten erzeugen.**

## Codex liefert jedoch nicht nur „eine Antwort“

Der Unterschied bei Agenten wie Codex besteht darin, dass sie vor der abschließenden Antwort bereits viele Dinge getan haben können.

In OpenAIs Definition des Codex App Server besteht ein Thread aus mehreren Turns, und jeder Turn enthält mehrere Items. Ein Item ist nicht nur eine Nutzer- oder KI-Nachricht, sondern kann auch eine Befehlsausführung, Dateiänderung oder einen Werkzeugaufruf darstellen.

Mit anderen Worten: Der letzte Text, den wir in der Oberfläche sehen, kann lediglich die Zusammenfassung einer umfangreichen Arbeit sein.

```text
Nutzeraufgabe
   │
   ▼
Repository und Kontext verstehen
   │
   ▼
Dateien lesen → Befehle ausführen → Werkzeuge aufrufen → Code ändern → Tests ausführen
   │
   ▼
Abschlussantwort: „Diese Inhalte wurden geändert …“
```

Wenn der Nutzer nun mit der letzten Antwort unzufrieden ist und Retry klickt, stellt sich die Frage: Welcher Teil soll überhaupt wiederholt werden?

Nur die Zusammenfassung neu schreiben? Die Überlegungen erneut durchführen? Alle Befehle noch einmal ausführen? Oder zunächst sämtliche Änderungen rückgängig machen und von vorn beginnen?

An diesem Punkt ist das Problem nicht mehr einfach.

## Beim zweiten Durchlauf ist die Welt bereits eine andere

Angenommen, ich sage zu Codex:

> Behebe diesen Bug, führe die Tests aus und erstelle anschließend einen Pull Request.

Beim ersten Lauf könnte Codex bereits:

1. den Code gelesen und die Ursache gefunden haben;
2. drei Dateien geändert haben;
3. Tests ausgeführt haben;
4. einen neuen Branch erstellt haben;
5. Code committet und gepusht haben;
6. einen Pull Request erstellt haben.

Was geschieht, wenn jetzt Retry gedrückt wird?

- Wird nur neuer Text erzeugt, kann die neue Antwort nicht mehr zu den bereits ausgeführten Aktionen passen.
- Wird erneut geplant, sieht der zweite Lauf bereits veränderten Code.
- Werden die Werkzeuge erneut ausgeführt, können doppelte Commits, Branch-Konflikte oder ein zweiter PR entstehen.
- Soll zuerst zurückgerollt werden, lassen sich externe Aktionen möglicherweise nicht vollständig rückgängig machen.

Eine Datei kann wiederhergestellt werden, eine E-Mail wurde vielleicht bereits versendet. Ein lokaler Branch kann gelöscht werden, während sich eine Freigabe, Nachricht oder Transaktion in einem externen System nicht spurlos zurücknehmen lässt.

Das eigentliche Problem lautet deshalb nicht bloß „Zwischeninformationen sind kompliziert“, sondern:

> Ein Agentenlauf erzeugt eine reale Kette von Ursache und Wirkung. Der zweite Lauf beginnt nicht mehr in der Welt, die vor dem ersten existierte.

![Text kann neu geschrieben werden, doch der Agent hat den realen Zustand bereits verändert](/assets/blog/ai-agent-retry-state/text-vs-world-state-de.png)

## Agenten-Retry betrifft mindestens vier Arten von Zustand

Aus Systemsicht verändert eine Agentenaufgabe typischerweise vier verschiedene Zustandsarten gleichzeitig.

### 1. Gesprächszustand

Dazu gehören die Nutzeranforderung, frühere Nachrichten, bestätigte Einschränkungen, die Gedankenspuren des Agenten und die Ergebnisse von Werkzeugaufrufen.

Welche Teile der Historie bei einer neuen Generierung erhalten oder verworfen werden, ist bereits eine eigene Entscheidung.

### 2. Ausführungszustand

Dazu gehören lokale Dateien, der Git-Worktree, laufende Prozesse, Testergebnisse, temporäre Dateien und installierte Abhängigkeiten.

Diese Zustände können durch den ersten Lauf bereits verändert worden sein.

### 3. Externer Zustand

Dazu gehören GitHub-PRs, Datenbankeinträge, gesendete Nachrichten, Cloud-Aufgaben, Formulare und Systeme von Drittanbietern.

Diese Kategorie ist am gefährlichsten, weil sie sich häufig nicht vollständig zurückrollen lässt.

### 4. Berechtigungs- und Audit-Zustand

Dazu gehört, welche Aktionen der Nutzer genehmigt hat, welche Werkzeuge aufgerufen wurden, was zu welchem Zeitpunkt geschah und wie das System Verantwortlichkeit nachverfolgt.

Wenn Retry eine Folge von Aktionen still wiederholt, muss das System beantworten: Ist die zweite Ausführung eine neue Genehmigung oder gilt die erste weiter? Und in welcher Beziehung stehen beide Vorgänge im Audit-Protokoll?

Sobald diese vier Zustandsarten zusammenkommen, ist Retry kein einfacher Button mehr, sondern ähnelt einem Mechanismus für Rollback, Deduplizierung und Branch-Verwaltung.

## Was kann Retry überhaupt bedeuten?

In einem Agentenprodukt kann „noch einmal versuchen“ mindestens vier verschiedene Bedeutungen haben:

```text
Neu formulieren   → Erledigte Arbeit behalten, nur die Abschlussantwort neu schreiben
Neu planen        → Aktuelle Umgebung behalten, aber einen anderen Denk- und Ausführungsweg wählen
Neu ausführen     → Einen fehlgeschlagenen Befehl oder Werkzeugaufruf wiederholen
Zum Fork zurück   → Originalhistorie behalten und von einem Zustand aus einen neuen Zweig erzeugen
```

Diese vier Aktionen haben völlig unterschiedliche Risiken, lassen sich aber nur schwer in einem einzigen Retry-Button zusammenfassen.

Deshalb glaube ich nicht, dass Agentenprodukte in Zukunft ganz ohne Retry auskommen. Sie müssen Retry vielmehr **in semantisch klarere Aktionen aufteilen**.

Zum Beispiel:

- „Nur die Antwort neu generieren“;
- „Ausgehend vom aktuellen Zustand weiterarbeiten“;
- „Den fehlgeschlagenen Schritt erneut ausführen“;
- „Von hier aus einen neuen Zweig erstellen“;
- „Zu einem Checkpoint zurückkehren und erneut ausführen“.

Erst wenn Nutzer und System wissen, was genau wiederholt werden soll, wird die Aktion verlässlich.

## Codex hat kein einfaches Retry, bietet aber Fork

Aus offiziellen Quellen lässt sich bestätigen, dass Codex Arbeit als Thread, Turn und Item modelliert und einen `fork`-Mechanismus bereitstellt. Mit `/fork` in der Codex CLI lässt sich die aktuelle Aufgabe als neue Aufgabe kopieren; der App Server stellt `thread/fork` bereit, um einen neuen Thread zu erzeugen, während die ursprüngliche Historie erhalten bleibt.

Fork und Retry wirken ähnlich, drücken aber zwei unterschiedliche Haltungen aus:

- Retry sagt sinngemäß: „Der letzte Versuch zählt nicht. Noch einmal.“
- Fork sagt: „Der letzte Versuch ist tatsächlich geschehen. Von hier aus erkunden wir einen anderen Weg.“

Bei einem Chatbot, der nur Text ausgibt, ist die erste Haltung meist unproblematisch.

Bei einem Agenten, der Dateien ändert, Befehle ausführt und externe Werkzeuge aufruft, ist die zweite Haltung ehrlicher und leichter nachzuverfolgen.

Sie erkennt an, dass Historie bereits entstanden ist. Ein neuer Versuch sollte deshalb einen eigenen Zweig und eine eigene Identität besitzen, statt den alten Prozess still zu überschreiben.

## Häufig ist Feedback nützlicher als Retry

Wenn wir mit dem Ergebnis eines Agenten unzufrieden sind, brauchen wir oft nicht „alles noch einmal“, sondern eine präzise Beschreibung dessen, was nicht passt.

Zum Beispiel:

- Die bisherige Recherche behalten, aber die Schlussfolgerung direkter formulieren.
- Die API nicht verändern, sondern nur die interne Implementierung anpassen.
- Die Testergebnisse behalten und die Ursache erneut prüfen.
- Den aktuellen Code nicht zurückrollen, sondern eine andere UI-Lösung versuchen.
- Nicht weiter ausführen, sondern zuerst die bisherigen Änderungen zeigen.

Solches Feedback nutzt bereits investierte Arbeit weiter und macht dem Agenten klar, welcher Teil der letzten Runde die Anforderungen verfehlt hat.

Traditionelles Retry setzt auf Zufall und hofft, dass der nächste Versuch „mehr Glück“ hat. Gute Zusammenarbeit mit einem Agenten ähnelt dagegen der Arbeit mit einem Kollegen: Abweichungen benennen, korrekte Teile behalten und vom aktuellen Zustand aus weiter konvergieren.

## Die Produktgrenze hinter einem kleinen Button

Dass Codex traditionelles Retry nicht hervorhebt, bedeutet daher nicht zwingend, dass eine Funktion fehlt.

Es markiert vielmehr eine Produktgrenze: KI entwickelt sich von einer „Antwortmaschine“ zu einem „Handlungssystem“.

Solange KI nur Text erzeugt, kann Historie überschrieben werden. Sobald KI handelt, wird Historie selbst zu einem Teil des Systemzustands.

Dann ist nicht mehr entscheidend, ob die KI noch einmal antworten kann, sondern:

- ob wir wissen, was im letzten Lauf tatsächlich geschah;
- ob korrekte Ergebnisse erhalten und nur fehlerhafte Teile geändert werden können;
- ob von einem klaren Zustand aus ein anderer Weg entstehen kann;
- ob sich doppelte Werkzeug- und externe Aktionen vermeiden lassen;
- ob jeder Versuch eine nachvollziehbare Kette von Ursache und Wirkung besitzt.

> Das Verschwinden des Retry-Buttons ist nicht nur der Verlust einer vertrauten Interaktion. Es erinnert uns daran, dass „noch einmal versuchen“ eine ernstere Frage beantworten muss, sobald KI die reale Welt verändert: Von welchem Punkt aus soll was erneut geschehen?

## Referenzen

- [Codex CLI command reference: `/fork` und Aufgabenverzweigung](https://learn.chatgpt.com/docs/developer-commands?surface=cli)
- [Codex App Server: Thread, Turn, Item und `thread/fork`](https://learn.chatgpt.com/docs/app-server)
- [OpenAI Conversation state: Gesprächszustand und Verlaufskette](https://developers.openai.com/api/docs/guides/conversation-state)
- [OpenAI Function calling: mehrstufige Werkzeugausführung](https://developers.openai.com/api/docs/guides/function-calling)
