---
translationKey: "loop-engineering"
locale: "de"
title: "Loop Engineering"
description: "Eine Analyse der fünf Bausteine des Loop Engineering und seines externen Zustands – und warum Verifikation, Verständnisverlust und kognitive Kapitulation weiterhin in der Verantwortung des Engineers liegen."
publishedAt: "2026-06-09"
updatedAt: "2026-07-16"
category: "development"
sourceLocale: "en"
sourceUrl: "https://addyosmani.com/blog/loop-engineering/"
sourceAuthor: "Addy Osmani"
contentType: "adaptation"
translationStatus: "reviewed"
---

**Loop Engineering bedeutet, sich selbst als die Person zu ersetzen, die dem Agenten Prompts gibt. Stattdessen entwirft man das System, das diese Aufgabe übernimmt.** Ein Loop lässt sich hier als rekursives Ziel verstehen: Man definiert den Zweck, und die KI iteriert, bis er erreicht ist. Ich glaube, dass dies die Zukunft der Zusammenarbeit mit Coding-Agenten sein könnte. Dennoch stehen wir am Anfang, ich bleibe skeptisch, und wegen der stark veränderten Nutzungsmuster bei größeren Token-Budgets muss man bei den Token-Kosten unbedingt [vorsichtig](https://x.com/weswinder/status/2063700289710964906) sein. Deshalb möchte ich erklären, was Loop Engineering ist und welche Folgen es hat.

---

Peter Steinberger [sagte](https://x.com/steipete/status/2063697162748260627) kürzlich: „Ihr solltet Coding-Agenten nicht mehr selbst prompten. Ihr solltet Loops entwerfen, die eure Agenten prompten.“ Ähnlich [zitiert](https://addyosmani.com/blog/loop-engineering/) die kanonische Quelle Boris Cherny, Leiter von Claude Code bei Anthropic: „Ich prompte Claude nicht mehr. Bei mir laufen Loops, die Claude prompten und herausfinden, was zu tun ist. Meine Aufgabe ist es, Loops zu schreiben.“

Was bedeutet das konkret?

Etwa zwei Jahre lang bestand der Weg zu brauchbaren Ergebnissen mit einem Coding-Agenten darin, einen guten Prompt zu schreiben und genügend Kontext bereitzustellen. Man tippte etwas, las die Antwort und schrieb dann die nächste Anweisung. Der Agent war ein Werkzeug, das man während des gesamten Prozesses selbst führte – Zug um Zug. Diese Phase ist im Grunde vorbei, zumindest glauben das einige.

Heute baut man ein kleines System, das Arbeit findet, zuweist, prüft, Erledigtes festhält und entscheidet, was als Nächstes geschieht. Dieses System steuert die Agenten, statt dass man jeden Schritt selbst auslöst. Ich habe über zwei nahe Verwandte geschrieben: [Agent Harness Engineering](https://addyosmani.com/blog/agent-harness-engineering/), das die Umgebung eines einzelnen Agenten gestaltet, und das [Factory Model](https://addyosmani.com/blog/factory-model/), also das System, das Software baut. Loop Engineering liegt eine Ebene über dem Harness. Es ist ein Harness, der zeitgesteuert läuft, Helfer startet und Ergebnisse in den nächsten Zyklus einspeist.

Überraschend ist, dass dies inzwischen keine reine Werkzeugfrage mehr ist. Vor einem Jahr hätte man für einen Loop einen Stapel Bash-Skripte geschrieben, sie dauerhaft gepflegt und ein einmaliges System besessen, das sonst niemand hatte. Heute sind die Bausteine in den Produkten enthalten. Steinbergers Liste passt fast exakt zur Codex-App und beinahe ebenso gut zu Claude Code. Sobald man erkennt, dass die Form dieselbe ist, diskutiert man weniger über Werkzeuge und entwirft stattdessen einen Loop, der unabhängig vom konkreten Produkt funktioniert.

## Die fünf Bausteine – plus ein Hinweis zum Zustand

Ein [Loop](https://x.com/reach_vb/status/2063713960495558940) benötigt fünf Dinge und zusätzlich einen Ort, an dem Zustand erhalten bleibt. Zunächst die Übersicht:

1. **Automations**, die nach Zeitplan laufen und Discovery sowie Triage selbstständig erledigen.
2. **Worktrees**, damit zwei parallel arbeitende Agenten nicht dieselben Dateien überschreiben.
3. **Skills**, die Projektwissen festhalten, das der Agent sonst erraten müsste.
4. **Plugins und Connectors**, die den Agenten mit den bereits genutzten Werkzeugen verbinden.
5. **Subagenten**, sodass ein Agent eine Lösung vorschlagen und ein anderer sie prüfen kann.

Dazu kommt ein sechstes Element: Gedächtnis. Das kann eine Markdown-Datei, ein Linear-Board oder ein anderes Medium sein, das eine einzelne Unterhaltung überdauert und festhält, was erledigt wurde und was als Nächstes ansteht. Das klingt fast zu einfach, um wichtig zu sein. Doch genau diese Technik benötigt jeder langlebige Agent, wie ich in [Long-Running Agents](https://addyosmani.com/blog/long-running-agents/) beschrieben habe: Das Modell vergisst zwischen Ausführungen alles, deshalb muss das Gedächtnis auf der Festplatte statt im Kontext leben. Der Agent vergisst; das Repository nicht.

Beide Produkte stellen inzwischen alle fünf Bausteine bereit.

| Primitive | Aufgabe im Loop | Codex-App | Claude Code |
| --- | --- | --- | --- |
| **Automations** | Zeitgesteuerte Discovery + Triage | [Automations-Tab](https://developers.openai.com/codex/app/automations): Projekt, Prompt, Takt und Umgebung wählen; Ergebnisse landen in einer Triage-Inbox; `/goal` ermöglicht „bis zur Erledigung weiterarbeiten“ | Geplante Aufgaben und Cron, `/loop`, `/goal`, Hooks, GitHub Actions |
| **Worktrees** | Parallele Features isolieren | Eingebauter Worktree pro Thread | `git worktree`, `--worktree` und `isolation: worktree` bei einem Subagenten |
| **Skills** | Projektwissen kodifizieren | [Agent Skills](https://developers.openai.com/codex/skills) (`SKILL.md`), über `$name` oder implizit ausgelöst | [Agent Skills](https://addyosmani.com/blog/agent-skills/) (`SKILL.md`) |
| **Plugins / Connectors** | Werkzeuge anbinden | Connectors (MCP) plus Plugins zur Verteilung | MCP-Server plus Plugins |
| **Subagenten** | Lösungen entwickeln und prüfen | [Subagents](https://developers.openai.com/codex/subagents), als TOML unter `.codex/agents/` definiert | Subagenten unter `.claude/agents/`, zusätzlich Agent Teams |
| **Zustand** | Erledigte Arbeit verfolgen | Markdown oder Linear über einen Connector | Markdown (`AGENTS.md`, Fortschrittsdateien) oder Linear über MCP |

Die Bezeichnungen unterscheiden sich leicht, die Fähigkeiten sind jedoch dieselben. Die Details sind wichtig, weil sie bestimmen, ob ein Loop zusammenhält oder unbemerkt überall Zustand verliert.

## Automations: der Herzschlag

Automations machen aus einem einmaligen Lauf einen echten Loop. In der Codex-App legt man im Automations-Tab Projekt, Prompt, Takt und die Ausführung in einem lokalen Checkout oder Hintergrund-Worktree fest. Läufe mit Ergebnissen erscheinen in der Triage-Inbox; Läufe ohne Befund archivieren sich selbst. OpenAI nutzt Automations intern für Routineaufgaben wie tägliche Issue-Triage, Zusammenfassungen von CI-Fehlern, Commit-Briefings und die Suche nach Fehlern, die in der Vorwoche eingeführt wurden. Eine Automation kann außerdem einen Skill aufrufen. So bleibt wiederverwendbares Verhalten wartbar: `$skill-name` auslösen, statt eine Wand aus Anweisungen in einen Zeitplan zu kopieren, den später niemand aktualisiert.

Claude Code erreicht dasselbe Ziel über Planung und Hooks. Mit `/loop` lässt sich ein Prompt oder Befehl regelmäßig ausführen, Cron-Aufgaben können geplant, Shell-Befehle an bestimmten Punkten des Agentenlebenszyklus über Hooks gestartet oder der gesamte Prozess in GitHub Actions verlagert werden, damit er nach dem Schließen des Laptops weiterläuft. Die Idee ist identisch: eine autonome Aufgabe definieren, ihr einen Takt geben und die Ergebnisse zu sich kommen lassen, statt jedes System selbst zu kontrollieren.

Daneben gibt es ein Primitive innerhalb einer Sitzung, das den Kern dieses Artikels noch besser trifft. `/loop` wiederholt etwas nach Zeitplan. `/goal` arbeitet weiter, bis eine formulierte Bedingung tatsächlich erfüllt ist. Nach jedem Turn prüft ein separates kleines Modell, ob das Ziel erreicht wurde, sodass der Agent, der den Code geschrieben hat, nicht seine eigene Arbeit bewertet. Man gibt beispielsweise die Bedingung „alle Tests unter test/auth bestehen und der Linter ist sauber“ an und geht weg. Codex besitzt dasselbe Primitive, ebenfalls `/goal` genannt: Es setzt die Arbeit über mehrere Turns fort, bis eine überprüfbare Abbruchbedingung erfüllt ist, inklusive Pause, Fortsetzen und Löschen. Dasselbe Muster existiert in beiden Werkzeugen – wie viele der folgenden Bausteine.

Dieser Teil bringt die Arbeit an die Oberfläche. Der Rest des Loops verarbeitet sie.

## Worktrees verhindern Chaos bei paralleler Arbeit

Sobald mehr als ein Agent läuft, kollidieren Dateien. Zwei Agenten, die dieselbe Datei bearbeiten, erzeugen dasselbe Problem wie zwei Engineers, die ohne Abstimmung dieselben Zeilen ändern. Ein Git-Worktree löst das mechanische Problem: Er ist ein unabhängiges Arbeitsverzeichnis auf einem eigenen Branch, teilt aber die Repository-Historie. Dadurch können die Änderungen eines Agenten den Checkout eines anderen nicht berühren.

Codex integriert Worktree-Unterstützung direkt in die App, sodass mehrere Threads am selben Repository arbeiten können, ohne den Checkout der anderen zu verändern. Claude Code bietet dieselbe Isolation über `git worktree`, ein `--worktree`-Flag für Sitzungen in einem eigenen Checkout und `isolation: worktree` für Subagenten, das jedem Helfer einen frischen Checkout gibt und ihn anschließend bereinigt. Über die menschliche Seite habe ich in [The Orchestration Tax](https://addyosmani.com/blog/orchestration-tax/) geschrieben: Worktrees beseitigen mechanische Kollisionen, doch **du** bleibst die Obergrenze. Deine Review-Kapazität, nicht das Werkzeug, bestimmt, wie viele Agenten du tatsächlich parallel betreiben kannst.

## Skills ersparen die ständige Neuerklärung des Projekts

Ein Skill verhindert, dass derselbe Projektkontext in jeder Sitzung erneut erklärt werden muss. Beide Werkzeuge verwenden dasselbe Format: einen Ordner mit `SKILL.md`, der Anweisungen und Metadaten sowie optional Skripte, Referenzen und Assets enthält. Codex führt einen Skill aus, wenn man ihn mit `$` oder `/skills` aufruft, oder löst ihn automatisch aus, wenn die Aufgabe zur Beschreibung passt. Deshalb ist eine knappe, wörtliche Beschreibung besser als eine clevere. Claude Code funktioniert genauso – ein Muster, das ich in [Agent Skills](https://addyosmani.com/blog/agent-skills/) beschrieben habe.

In Skills muss Absicht außerdem nicht immer wieder bezahlt werden. In [Intent Debt](https://addyosmani.com/blog/intent-debt/) argumentierte ich, dass ein Agent jede Sitzung ohne Vorwissen beginnt und Lücken in der Absicht mit selbstbewussten Vermutungen füllt. Ein Skill externalisiert diese Absicht: Konventionen, Build-Schritte und Hinweise wie „wir machen es nicht auf diese Weise, weil damals X passiert ist“. Einmal geschrieben, liest der Agent sie bei jedem Lauf. Ohne Skills leitet der Loop das Projekt in jedem Zyklus erneut von null ab. Mit Skills kann Projektwissen über Zyklen hinweg wachsen.

Eine Unterscheidung ist wichtig: Ein Skill ist das Autorenformat, ein Plugin die Form der Verteilung. Wer einen Skill über mehrere Repositories teilen oder mehrere Skills bündeln möchte, verpackt sie als Plugin. Das gilt für Codex und Claude Code gleichermaßen.

## Plugins und Connectors öffnen dem Loop reale Werkzeuge

Ein Loop, der nur das Dateisystem sieht, bleibt sehr klein. Connectors auf Basis von MCP ermöglichen es dem Agenten, den Issue-Tracker zu lesen, eine Datenbank abzufragen, eine Staging-API aufzurufen oder eine Nachricht in Slack zu senden. Codex und Claude Code unterstützen beide MCP, weshalb ein Connector für das eine Produkt meist auch mit dem anderen funktioniert. Plugins bündeln Connectors und Skills, sodass ein Teammitglied die vollständige Einrichtung auf einmal installieren kann, statt sie aus dem Gedächtnis nachzubauen.

Das ist der Unterschied zwischen einem Agenten, der sagt „hier ist der Fix“, und einem Loop, der den PR öffnet, das Linear-Ticket verknüpft und den Kanal informiert, sobald CI grün ist. Connectors lassen den Loop in der tatsächlichen Umgebung handeln, statt nur zu beschreiben, was er mit Zugriff tun würde.

## Subagenten trennen Ersteller und Prüfer

Die nützlichste strukturelle Technik in einem Loop ist die Trennung zwischen dem Agenten, der schreibt, und dem Agenten, der prüft. Ein Modell bewertet die eigene Arbeit zu großzügig. Ein zweiter Agent mit anderen Anweisungen und manchmal einem anderen Modell erkennt eher die Punkte, die der erste sich selbst als akzeptabel erklärt hat.

Codex startet auf Anfrage Subagenten, führt sie parallel aus und führt ihre Ergebnisse in einer Antwort zusammen. Eigene Agenten werden als TOML-Dateien unter `.codex/agents/` definiert, jeweils mit Name, Beschreibung, Anweisungen sowie optional Modell und Reasoning-Aufwand. Dadurch kann ein Security-Reviewer ein starkes Modell mit hohem Aufwand nutzen, während ein Explorer schnell und schreibgeschützt arbeitet. Claude Code bietet dasselbe über Subagenten unter `.claude/agents/` und Agent Teams, die Arbeit untereinander weiterreichen. Eine typische Aufteilung ist in beiden Werkzeugen: ein Agent zum Erkunden, einer zum Implementieren und einer zum Prüfen gegen die Spezifikation.

Ich habe dieses Argument bereits zweimal gemacht: in [The Code Agent Orchestra](https://addyosmani.com/blog/code-agent-orchestra/) und in [Agentic Code Review](https://addyosmani.com/blog/agentic-code-review/). In einem Loop ist es besonders wichtig, weil dieser läuft, während man nicht zusieht. Erst ein Prüfer, dem man wirklich vertraut, macht es möglich, wegzugehen. Subagenten verbrauchen mehr Tokens, weil jeder eigene Modell- und Werkzeugarbeit ausführt. Diese Tokens sollte man dort einsetzen, wo eine zweite Meinung ihren Preis wert ist. Dasselbe Muster steckt hinter `/goal` in Claude Code: Ein frisches Modell entscheidet, ob der Loop abgeschlossen ist, nicht das Modell, das die Arbeit erledigt hat. Die Maker-Checker-Trennung wird damit sogar auf die Abbruchbedingung angewendet.

## So sieht ein Loop aus

Zusammengesetzt wird aus einem einzelnen Thread eine kleine Steuerzentrale. Ein Muster, das ich häufig verwende, sieht so aus:

Jeden Morgen läuft eine Automation gegen das Repository. Ihr Prompt ruft einen Triage-Skill auf, der die CI-Fehler, offenen Issues und jüngsten Commits des Vortags liest und die Ergebnisse in eine Markdown-Datei oder ein Linear-Board schreibt. Für jeden relevanten Befund öffnet der Thread einen isolierten Worktree, lässt einen Subagenten einen Fix entwerfen und einen zweiten diesen Entwurf gegen den Projekt-Skill und die bestehenden Tests prüfen.

Connectors erlauben dem Loop, den PR zu öffnen und das Ticket zu aktualisieren. Alles, was der Loop nicht selbst bearbeiten kann, landet in meiner Triage-Inbox. Die Zustandsdatei bildet das Rückgrat des Systems: Sie hält fest, was versucht wurde, was bestanden hat und was offen bleibt, sodass der Lauf am nächsten Morgen dort weitermachen kann, wo der heutige aufgehört hat.

Was hast du tatsächlich getan? Du hast den Prozess einmal entworfen. Keinen der einzelnen Schritte hast du selbst gepromptet. Das macht Steinbergers Aussage konkret – und derselbe Loop funktioniert in Codex und Claude Code, weil die Bausteine gleich sind.

## Was der Loop dir weiterhin nicht abnimmt

Der Loop verändert die Arbeit, aber er entfernt dich nicht aus ihr. Drei Probleme werden mit einem besseren Loop deutlicher, nicht einfacher.

**Verifikation bleibt deine Verantwortung.** Ein unbeaufsichtigter Loop kann auch unbeaufsichtigt Fehler machen. Die Trennung von Prüfer und Ersteller soll der Behauptung „fertig“ mehr Gewicht geben. Trotzdem bleibt „fertig“ eine Behauptung und kein Beweis. Ich wiederhole dieselbe Aussage aus [Code Review in the Age of AI](https://addyosmani.com/blog/code-review-ai/): Deine Aufgabe ist es, Code auszuliefern, dessen Funktion du bestätigt hast.

**Dein Verständnis nimmt weiterhin ab, wenn du es zulässt.** Je schneller der Loop Code ausliefert, den du nicht geschrieben hast, desto größer wird die Lücke zwischen dem existierenden System und dem System, das du tatsächlich verstehst. Das ist [Comprehension Debt](https://addyosmani.com/blog/comprehension-debt/). Wenn du die Ergebnisse des Loops nicht sorgfältig liest, lässt ein reibungsloser Loop diese Schuld nur schneller wachsen.

**Eine bequeme Haltung ist gefährlich.** Wenn der Loop von selbst läuft, ist es verlockend, keine eigenen Urteile mehr zu bilden und alles zu akzeptieren, was zurückkommt. Ich nenne das [Cognitive Surrender](https://addyosmani.com/blog/cognitive-surrender/). Einen Loop mit Urteilskraft zu entwerfen kann das Gegenmittel sein; ihn zu bauen, um Denken zu vermeiden, beschleunigt das Problem. Die Handlung sieht gleich aus, das Ergebnis ist das Gegenteil.

## Baue den Loop. Bleib der Engineer.

Ich glaube, dies ist ein Vorgeschmack darauf, wie sich unsere Arbeit entwickeln wird. Würde ich jedoch aufhören, den Code selbst zu prüfen, oder mich vollständig auf automatisierte Loops verlassen, um ihn zu reparieren, würde die Qualität meines Produkts leiden. Wahrscheinlich geriete ich in eine Abwärtsspirale und würde das Loch immer tiefer graben.

Baue also deine Loops, aber vergiss nicht, dass direkte Prompts an Agenten weiterhin wirksam sind. Es geht darum, das richtige Gleichgewicht zu finden.

Loops können je nach Person zu völlig unterschiedlichen Ergebnissen führen. Zwei Menschen können denselben Loop bauen und Gegenteiliges erreichen. Der eine nutzt ihn, um bei Arbeit schneller zu werden, die er tief versteht. Der andere nutzt ihn, um die Arbeit überhaupt nicht verstehen zu müssen. Der Loop kennt den Unterschied nicht. Du schon.

Deshalb ist Loop-Design schwieriger als Prompt Engineering, nicht leichter. Chernys Aussage lautet nicht, dass die Arbeit einfacher geworden sei. Der Hebelpunkt hat sich verschoben.

Baue den Loop. Aber baue ihn wie jemand, der Engineer bleiben will – nicht wie jemand, der nur noch auf Start drückt.
