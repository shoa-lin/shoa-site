---
translationKey: "context-engineering-karpathy-cherny"
locale: "de"
title: "Context Engineering und Loop Engineering: Prompts zu einem ausführbaren System machen"
description: "Von Karpathys Kontextfenster bis zu Boris Chernys Engineering-Schleifen: Die Qualität eines Agenten hängt davon ab, was er sieht, prüft und bewahrt."
publishedAt: "2026-07-08"
updatedAt: "2026-07-26"
category: "development"
sourceLocale: "en"
sourceUrl: "https://x.com/vartekxx/status/2074864291568664646"
sourceAuthor: "vartekx"
contentType: "adaptation"
translationStatus: "reviewed"
---

> Dieser Beitrag ist eine strukturierte Adaption von [vartekxs Artikel](https://x.com/vartekxx/status/2074864291568664646), keine satzweise Übersetzung. Aussagen zu Personen, Produkten und Kennzahlen sollten an der Quelle geprüft werden.

## Die Schlussfolgerung vorweg

Ein Prompt ist nur ein kleiner Teil der Eingabe eines Agenten. Verlässliche Ergebnisse entstehen durch das gesamte Kontextsystem: sichtbare Fakten, Auswahl und Verdichtung der Historie, getrennte Teilaufgaben und eine unabhängige Prüfung.

Karpathy versteht das Kontextfenster als neue Programmierschnittstelle. Boris Cherny erweitert diese Sicht zu einer Engineering-Schleife, die wiederholt läuft, prüft und nutzbare Erfahrung sammelt. Es geht nicht um längere Prompts, sondern um ein System, das richtiges Handeln wiederholen kann.

- **Context Engineering** bestimmt, was das Modell jetzt wissen soll.
- **Loop Engineering** bestimmt, wie dieser Kontext ausgeführt, geprüft und verbessert wird.
- **Verifier** unterscheiden echten Fortschritt von bloß mehr Ausgabe.
- **Persistenter Zustand** übergibt validierte Erfahrung an den nächsten Lauf.

![Projektregeln, Speicher, Skills, Hooks und Lernprotokolle bilden ein Kontextfenster](/assets/blog/context-engineering-karpathy-cherny/cover.jpg)

*Abbildung: Context-Engineering-Architektur (vartekx, englische Grafik).*

## Kontext ist die Arbeitsumgebung

Dasselbe Modell liefert mit anderem Kontext andere Resultate. Es führt nicht nur einen Satz aus: In begrenztem Arbeitsspeicher versteht es die Aufgabe, liest Dateien, nutzt Werkzeuge, verarbeitet Historie und wählt den nächsten Schritt.

Gefragt werden sollte: Welche Fakten, Dateien und Grenzen braucht dieser Schritt? Was ist veraltet, doppelt oder Rauschen? Welche Untersuchungen müssen vom Hauptauftrag getrennt bleiben? Wie wird das Ergebnis unabhängig geprüft?

Der Beitrag beschreibt drei Schichten: **Prompt Engineering** formuliert eine einzelne Anweisung, **Context Engineering** gestaltet die Umgebung des Modells, **Loop Engineering** setzt diese Gestaltung in einen automatisierten, wiederholbaren Ablauf.

![Entwicklung von Prompt Engineering über Context Engineering zu Loop Engineering](/assets/blog/context-engineering-karpathy-cherny/three-layers.png)

*Abbildung: Die drei Schichten bauen aufeinander auf (vartekx, englische Grafik).*

## Das Kontextfenster ist zu orchestrierender Arbeitsspeicher

Karpathys Analogie ist hilfreich: Das Modell ist der Prozessor, das Kontextfenster der Arbeitsspeicher. Nicht alle Unterlagen gehören hinein, sondern die passende Information zum passenden Zeitpunkt.

![Mehrere Turns verbrauchen ein endliches Kontextfenster](/assets/blog/context-engineering-karpathy-cherny/context-window-program.jpg)

*Abbildung: Ein- und Ausgaben mehrerer Turns teilen sich ein begrenztes Fenster (vartekx, englische Grafik).*

![Systemprompts, Regeln, Speicher, Werkzeuge, Historie und Beispiele bilden Kontext](/assets/blog/context-engineering-karpathy-cherny/context-operations.png)

*Abbildung: Der vom Nutzer geschriebene Prompt ist meist nur ein kleiner Teil des Kontexts (vartekx, englische Grafik).*

**Schreiben, auswählen, verdichten, isolieren.**

Konventionen, Befehle, Architekturentscheidungen, Fehlerursachen und wiederverwendbare Skripte sollten als kurze, durchsuchbare Dateien vorliegen. Wertvoll sind nicht lange Texte, sondern ausführbare Fakten: getestete Befehle, geschützte Pfade, Invarianten und bestätigte Ursachen.

Mehr Kontext ist nicht automatisch besser. Bei einer API-Korrektur werden Einstiegspunkt, Aufrufer, Tests, Vertrag und aktueller Fehler geladen; irrelevante Verzeichnisse und alte Logs bleiben draußen. Lange Arbeit verdichtet Schlussfolgerungen, Grenzen und nächsten Zustand, während aktuelle Quellen und Testergebnisse Priorität erhalten. Parallele Recherche liefert nur strukturierte, prüfbare Ergebnisse zurück.

## Aus Operationen wird eine Schleife

Die Boris Cherny zugeschriebene Perspektive verschiebt menschliche Arbeit vom wiederholten Anstoßen eines Agenten zum Entwurf einer Schleife. Jeder Durchlauf liest Zustand, führt aus, prüft, protokolliert und startet besser informiert erneut.

![Manuelles Prompting im Vergleich zu einem System für Kontext und Prüfung](/assets/blog/context-engineering-karpathy-cherny/loop-context.png)

*Abbildung: „Du bist der Motor“ gegenüber „das System ist der Motor“ (vartekx, englische Grafik).*

Eine gesunde Schleife schreibt wichtigen Zustand, wählt aufgabenrelevanten Zustand, fasst veraltete Historie zusammen und isoliert unabhängige Arbeit. Context Engineering ist das Rezept, Loop Engineering die Küche. Automatisierung verstärkt sowohl Disziplin als auch Fehler.

## Eine praktikable minimale Schleife

Sie braucht Takt und Abbruchbedingungen, kurze validierte Projektkenntnis, Trennung von Implementierung und Review, echte Connectoren mit passenden Rechten sowie unabhängige Verifier: Tests, Typprüfung, Build, Vertragsprüfung oder menschliche Freigabe.

![Schleife für Schreiben, Auswahl, Verdichtung, Isolation und Verifikation](/assets/blog/context-engineering-karpathy-cherny/loop-building-blocks.png)

*Abbildung: Loop Engineering automatisiert Context Engineering (vartekx, englische Grafik).*

## Aus einem Prompt eine Spezifikation machen

„Refaktoriere die Authentifizierung“ ist ein Wunsch. Eine ausführbare Spezifikation nennt Ziel, Umfang, Ergebnis, Konfliktbehandlung und Abbruchbedingungen: betroffene Verzeichnisse, unveränderliche Bereiche, anzupassende Tests, Eskalationspunkte und verpflichtende Prüfungen.

![Kontext vor und nach der Bearbeitung mit freiem Raum für nützliche Information](/assets/blog/context-engineering-karpathy-cherny/claude-code-context-workflow.jpg)

*Abbildung: Auswahl und Verdichtung schaffen Platz für hilfreichen Kontext (vartekx, englische Grafik).*

## Erfahrung statt Chatprotokolle ansammeln

Nach einer Aufgabe genügen wenige handlungsorientierte Erkenntnisse: was funktionierte, was scheiterte, was beim nächsten Mal früher zu prüfen ist. Wiederkehrende Fehler werden zu Projektregeln oder automatischen Prüfungen. Ausführung erzeugt Belege, Belege werden Zustand, der nächste Lauf liest ihn gezielt, und Verifier filtern weiter Fehler.

![Zeit- und Qualitätsaussagen zu Spezifikationen, angesammeltem Kontext und Prüfung](/assets/blog/context-engineering-karpathy-cherny/self-improving-loop.png)

*Abbildung: Die Zahlen sind Behauptungen des Autors und hier nicht unabhängig geprüft (vartekx, englische Grafik).*

## Schluss

Context Engineering beseitigt weder Halluzinationen noch Fachurteil. Mehr Material wird nicht von selbst besser, und ungeprüfte Automatisierung wird nicht verlässlich. Erst Kontext entwerfen, dann die Schleife bauen und schließlich mit unabhängigen Belegen prüfen: So skaliert Wiederholung nicht die Fehler.
