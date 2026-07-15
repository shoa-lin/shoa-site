---
translationKey: "dynamic-workflows-in-claude-code"
locale: "de"
title: "Ein Harness für jede Aufgabe: Dynamic Workflows in Claude Code"
description: "Claude Code kann spontan einen aufgabenspezifischen Multi-Agenten-Harness schreiben und orchestrieren."
publishedAt: "2026-06-02"
updatedAt: "2026-07-16"
category: "development"
sourceLocale: "en"
sourceUrl: "https://claude.com/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code"
sourceAuthor: "Thariq Shihipar, Sid Bidasaria"
contentType: "adaptation"
translationStatus: "reviewed"
---

Letzte Woche wurden [Dynamic Workflows](https://code.claude.com/docs/en/workflows) in Claude Code veröffentlicht. Claude kann nun spontan einen eigenen [Harness](https://code.claude.com/docs/en/glossary#agentic-harness) schreiben, der genau auf die aktuelle Aufgabe zugeschnitten ist.

> **Harness** bezeichnet die Kontrollschicht um ein KI-Modell, einschließlich Prompt-Zusammenstellung, Tool-Orchestrierung, Kontextverwaltung und Fehlerbehandlung. Claude Code lässt sich als **Modell + Harness** verstehen. Dieser Artikel behält den englischen Begriff bei.

Der Standard-Harness von Claude Code ist für Coding gebaut, funktioniert aber auch für viele andere Aufgaben, weil diese häufig Coding-Problemen ähneln. Einige Arbeitsklassen erreichen ihre beste Leistung jedoch erst mit eigenen Harnesses, darunter [Research](https://support.claude.com/en/articles/11088861-using-research-on-claude), [Security Analysis](https://support.claude.com/en/articles/11932705-automated-security-reviews-in-claude-code), [Agent Teams](https://code.claude.com/docs/en/agent-teams) und [Code Review](https://code.claude.com/docs/en/code-review).

Workflows lassen Claude solche aufgabenspezifischen Harnesses dynamisch auf Claude Code aufbauen. Sie können gespeichert, geteilt und wiederverwendet werden. Die Best Practices entwickeln sich noch: Dynamic Workflows benötigen oft mehr Tokens und eignen sich vor allem für komplexe Aufgaben mit hohem Wert.

## Beispiel-Prompts

Einige Beispiele zeigen die Bandbreite:

„Dieser Test schlägt ungefähr in einem von 50 Läufen fehl. Richte einen Workflow ein, der den Fehler reproduziert, konkurrierende Race-Hypothesen bildet und erst stoppt, wenn eine Hypothese die Evidenz übersteht.“

„Untersuche meine letzten 50 Sitzungen, finde wiederkehrende Korrekturen und überführe sie als Regeln in `CLAUDE.md`."

„Durchsuche sechs Monate `#incidents` in Slack nach wiederkehrenden Ursachen, für die noch niemand ein Ticket angelegt hat.“

„Lass verschiedene Agenten meinen Businessplan aus Sicht eines Investors, Kunden und Wettbewerbers zerlegen.“

„Rangiere 80 Lebensläufe für eine Backend-Stelle, prüfe die besten zehn doppelt und frage mich mit AskUserQuestion nach dem Bewertungsraster.“

„Erzeuge viele Namen für dieses CLI-Werkzeug und wähle die drei besten in einem Turnier.“

„Benenne unser User-Modell überall in Account um.“

„Prüfe jede technische Aussage meines Blogentwurfs gegen die Codebasis. Ich möchte nichts Falsches veröffentlichen.“

## Wie Dynamic Workflows funktionieren

Dynamic Workflows führen eine JavaScript-Datei mit einigen besonderen Funktionen aus, die [Subagenten](https://code.claude.com/docs/en/sub-agents) starten und koordinieren:

![Diagramm: Ein Dynamic Workflow startet und koordiniert Subagenten](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f1684f559cc83ff4b465b_image1.png)

Standardobjekte wie JSON, Math und Array stehen ebenfalls zur Datenverarbeitung bereit. Ein Workflow kann Modell und Worktree-Isolation pro Agent wählen. Wird er durch den Nutzer oder das Beenden des Terminals unterbrochen, setzt eine wiederaufgenommene Sitzung an derselben Stelle fort.

## Warum Dynamic Workflows?

Der Standard-Harness muss Planung und Ausführung im selben Kontextfenster bewältigen. Das funktioniert für viele Coding-Aufgaben sehr gut, stößt aber bei langlebiger, massiv paralleler, stark strukturierter oder adversarialer Arbeit an Grenzen.

Je länger Claude in einem Kontextfenster an einer komplexen Aufgabe arbeitet, desto anfälliger wird es für:

- **Agentic Laziness**: Claude stoppt nach Teilerfolg und erklärt eine mehrteilige Aufgabe zu früh für fertig.
- **Self-Preferential Bias**: Claude bevorzugt eigene Ergebnisse, insbesondere wenn es sie nach einem Raster bewerten soll.
- **Goal Drift**: Die Treue zum ursprünglichen Ziel nimmt über viele Turns und Compactions ab; Randbedingungen und Verbote können verloren gehen.

Ein Workflow wirkt dem entgegen, indem getrennte Subagenten mit eigenen Kontextfenstern und fokussierten, isolierten Zielen orchestriert werden.

## Dynamische und statische Workflows

Statische Workflows mit Claude Agent SDK oder `claude -p` müssen Randfälle im Voraus berücksichtigen und bleiben deshalb oft generisch. Mit [Claude Opus 4.8](https://www.anthropic.com/news/claude-opus-4-8) und Dynamic Workflows kann Claude dagegen einen Harness speziell für den aktuellen Fall schreiben.

![Vergleich zwischen statischen und dynamischen Workflows](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f3a0e17e2844bed86f22a_image9.png)

## Hilfreiche Muster für Dynamic Workflows

Man kann Claude einfach bitten, einen Dynamic Workflow zu erstellen, oder das Triggerwort `ultracode` verwenden. Ein mentales Modell der gängigen Muster hilft dabei, passende Aufgaben zu erkennen und den Workflow im Prompt zu steuern.

![Übersicht häufiger Muster für Dynamic Workflows](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f16d86247e586b929a407_image10.png)

### Classify and Act

Ein Klassifikator erkennt den Aufgabentyp und leitet ihn an unterschiedliche Agenten oder Verhaltensweisen weiter. Er kann auch am Ende entscheiden, wie mit dem Ergebnis umzugehen ist.

### Fan Out and Synthesize

Die Aufgabe wird in Schritte zerlegt, jeder Schritt erhält einen eigenen Agenten, anschließend werden strukturierte Ergebnisse zusammengeführt. Die Synthese wartet wie eine Barriere auf alle Fan-out-Agenten und verhindert Kontextvermischung.

### Adversarial Verification

Für jeden erzeugenden Agenten wird ein unabhängiger Agent gestartet, der das Ergebnis gegen ein Raster oder explizite Kriterien angreift.

### Generate and Filter

Viele Ideen erzeugen, anhand eines Rasters prüfen, Duplikate entfernen und nur die stärksten getesteten Kandidaten zurückgeben.

### Tournament

N Agenten lösen dieselbe Aufgabe mit unterschiedlichen Ansätzen. Ein Judge vergleicht die Ergebnisse paarweise, bis ein Gewinner übrig bleibt.

### Loop Until Done

Bei unbekanntem Arbeitsumfang werden Agenten gestartet, bis eine Abbruchbedingung gilt – etwa keine neuen Befunde oder keine verbleibenden Fehler – statt eine feste Zahl von Durchläufen zu wählen.

## Anwendungsfälle

Dynamic Workflows können bei nichttechnischer Arbeit sogar nützlicher sein als beim Coding.

### Migrationen und Refactorings

[Bun](https://bun.com/) wurde mithilfe von Workflows von Zig nach Rust umgeschrieben. [Jarreds X-Thread](https://x.com/jarredsumner/status/2060050578026189172) beschreibt den Ansatz. Migrationen sollten in konkrete Einheiten wie Call Sites, fehlgeschlagene Tests oder Module zerlegt werden. Jeder Fix erhält einen Worktree-Agenten und einen adversarialen Reviewer, danach werden die Änderungen zusammengeführt.

### Deep Research

Der Skill `/deep-research` in Claude Code nutzt Dynamic Workflows: Websuchen werden aufgefächert, Quellen abgerufen, Aussagen adversarial geprüft und zu einem Bericht mit Zitaten synthetisiert. Dasselbe Muster eignet sich für Slack-Statusberichte oder tiefgehende Codebase-Erkundung.

### Deep Verification

![Workflow für tiefe Verifikation](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f1721824a27cf13da87f4_image2.png)

Ein Agent extrahiert die Tatsachenbehauptungen eines Berichts, getrennte Subagenten untersuchen jeweils eine Aussage, und ein weiterer Prüfer bewertet die Zuverlässigkeit der Quellen.

### Sortierung

![Workflow zur Sortierung](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f173ce727a972001584cc_image3.png)

Qualitative Listen mit mehr als 1.000 Zeilen sollten nicht in einem Prompt absolut bewertet werden. Turniere, paarweise Vergleiche oder parallele Buckets mit anschließendem Merge liefern stabileres relatives Urteil und ein eigenes Kontextfenster pro Vergleich.

### Gedächtnis und Regeleinhaltung

![Workflow für Gedächtnis und Regeleinhaltung](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f17517076bb59050d90bb_image8.png)

Wenn Claude Regeln in `CLAUDE.md` wiederholt verfehlt, kann ein Workflow pro Regel einen Verifier starten und einen skeptischen Agenten die Regeln selbst auf Fehlalarme prüfen lassen. Umgekehrt lassen sich Sitzungen und Review-Kommentare nach wiederkehrenden Korrekturen durchsuchen, clustern, adversarial testen und als belastbare Regeln zurückführen.

### Ursachenanalyse

Debugging profitiert von mehreren unabhängigen Hypothesen. Ein einzelnes Kontextfenster verstärkt Selbstbevorzugung. Workflows können Agenten getrennte Evidenz aus Logs, Dateien und Daten zuweisen und jede Hypothese durch unabhängige Verifier und Refuter prüfen lassen. Das Muster gilt auch für Sales-Analysen, Data-Engineering-Ausfälle und Post-Mortems.

### Triage im großen Maßstab

![Workflow für Triage im großen Maßstab](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f1778dc00d34cca70819d_image6.png)

Ein Triage-Workflow klassifiziert jedes Element, dedupliziert es gegen bekannte Einträge und führt die passende Aktion aus – Fix versuchen oder an einen Menschen eskalieren. Quarantäne trennt Agenten, die nicht vertrauenswürdige öffentliche Inhalte lesen, von hoch privilegierten Aktionen. Mit [`/loop`](https://claude.com/blog/getting-started-with-loops) kann dieser Workflow dauerhaft laufen.

### Exploration und Geschmack

Wenn die endgültige Wahl von Geschmack abhängt, etwa bei Design oder Naming, können viele Lösungen erkundet und anhand eines Rasters geprüft werden. Ein Turnier kann Kandidaten zusätzlich ordnen.

### Evals

Leichtgewichtige Evals lassen sich mit unabhängigen Agenten in Worktrees und Vergleichsagenten durchführen, die Ergebnisse anhand eines Rasters bewerten. So kann beispielsweise ein Skill iterativ verbessert werden.

### Modell- und Intelligenz-Routing

Ein auf die Aufgabe abgestimmter Klassifikator kann nach erster Recherche entscheiden, welches Modell benötigt wird. Ob „erkläre das Auth-Modul“ Sonnet oder Opus braucht, hängt von Größe und Struktur dieses Moduls ab.

## Wann Dynamic Workflows nicht passen

Workflows sind neu, können überproportionale Ergebnisse liefern, aber auch deutlich mehr Tokens verbrauchen. Sie lohnen sich, wenn Parallelität, Spezialisierung oder adversariale Prüfungen ihre Koordinationskosten rechtfertigen. Die meisten normalen Coding-Aufgaben benötigen kein Panel aus fünf Reviewern. Dasselbe Urteil gilt auf Architekturebene bei der Wahl zwischen [Multi-Agenten- und Single-Agenten-Systemen](https://claude.com/blog/building-multi-agent-systems-when-and-how-to-use-them).

## Tipps zum Aufbau von Dynamic Workflows

### Prompting

Detaillierte Prompts, die relevante Workflow-Muster benennen, liefern die besten Ergebnisse. Workflows müssen nicht groß sein; auch ein „quick workflow“ für eine kurze adversariale Prüfung ist möglich.

### Mit `/goal` und `/loop` kombinieren

Wiederholbare Workflows für Triage, Recherche oder Verifikation lassen sich mit [`/loop`](https://claude.com/blog/getting-started-with-loops) regelmäßig ausführen und durch [`/goal`](https://code.claude.com/docs/en/workflows) mit einer harten Abschlussbedingung versehen.

### Token-Budgets

Ein Dynamic Workflow kann ein explizites Token-Budget erhalten. „use 10k tokens“ setzt beispielsweise eine Obergrenze von 10k Tokens.

### Dynamic Workflows speichern und teilen

Mit `s` im Workflow-Menü lässt sich ein Workflow speichern. Er kann unter `~/.claude/workflows` eingecheckt oder über einen Skill verteilt werden.

![Workflow aus dem Workflow-Menü speichern](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f17b1ca20533e666c867c_image4.png)

Zum Teilen über einen Skill werden die JavaScript-Dateien in den Skill-Ordner gelegt und in `SKILL.md` referenziert. Für mehr Flexibilität sollte Claude den Workflow als Vorlage statt als wortwörtlich auszuführendes Skript behandeln.

![Workflow über einen Skill teilen](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f17cb835cf4f9fd5da921_image7.png)

## Ein neuer Ausgangspunkt für Discovery

Workflows sind eine neue Möglichkeit, Claude Code zu erweitern. Sie sollten als Ausgangspunkt verstanden werden, um neue Formen der Unterstützung zu entdecken; über ihren guten Einsatz ist noch viel zu lernen.

Hinweise dazu, was in einen Harness gehört, bieten Anthrophics [drei Harness-Designmuster](https://claude.com/blog/harnessing-claudes-intelligence).

---

*Dieser Artikel wurde von Thariq Shihipar und Sid Bidasaria verfasst, Members of Technical Staff bei Anthropic, die an Claude Code arbeiten.*
