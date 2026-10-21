---
translationKey: "rsi-verification"
locale: "de"
title: "Besser im Besserwerden: Wo die Selbstverbesserung von KI feststeckt"
description: "2026 arbeitet KI bereits in großem Umfang daran mit, die nächste KI-Generation zu bauen. Doch „besser im Besserwerden“ ist noch nicht bewiesen. Woran es hakt, ist die Verifikation: Wer beweist, dass diese Runde wirklich etwas verbessert hat?"
publishedAt: "2026-10-09"
updatedAt: "2026-10-09"
category: "evaluation"
sourceLocale: "zh"
sourceUrl: "https://www.bydziwen.top/blog/rsi-verification/"
sourceAuthor: "Shoa Lin"
contentType: "original"
translationStatus: "reviewed"
---

Das heißeste Wort in der KI-Szene dieses Jahr ist vermutlich RSI. Es steht für Recursive Self-Improvement, rekursive Selbstverbesserung; manche sprechen auch von „Selbstevolution“. TechCrunch hat gleich einen Artikel mit dem Titel [„RSI is the new AGI“](https://techcrunch.com/2026/05/28/rsi-is-the-new-agi-and-its-just-as-hard-to-pin-down/) veröffentlicht.

Unter diesem Wort vermischen sich eigentlich zwei Dinge:

- **KI arbeitet am Bau der nächsten KI-Generation mit.** Das passiert bereits, und zwar in beträchtlichem Umfang.
- **Besser im Besserwerden.** Eine verbesserte KI wird besser darin, die nächste Verbesserungsrunde durchzuführen, sodass jede Runde schneller geht als die vorige. Das ist die eigentliche Bedeutung von RSI – bewiesen ist das bisher nicht.

Ich möchte die beiden Dinge zuerst trennen und dann eine Frage beantworten: Woran hakt es auf dem Weg vom ersten zum zweiten? Meine Sicht: **Es hakt an der Verifikation. Eine Änderung zu erzeugen ist schon billig; zu beweisen, dass „diese Runde wirklich etwas verbessert hat“, ist noch teuer. Wie schnell RSI vorankommt und wo sie zuerst eintritt, hängt beides von der Verifikation ab.**

## In jeder Verbesserungsrunde stecken drei Aufgaben

Ob ein Mensch oder eine KI etwas ändert: Eine Verbesserungsrunde läuft immer durch dieselbe Schleife. Zuerst denkt man sich eine Änderung aus, dann bewertet man sie und prüft, ob sie wirklich besser ist; was gut ist, bleibt und geht in die nächste Runde. Außerhalb der Schleife gibt es noch eine Aufgabe: das Ziel festlegen, also bestimmen, was „besser“ überhaupt heißt.

In jeder Verbesserungsrunde stecken also drei Aufgaben: **die Änderung vorschlagen, sie bewerten und das Ziel festlegen**. Wer fragt, ob KI sich selbst verbessern kann, fragt eigentlich, wer jede dieser drei Aufgaben übernimmt.

![Verbesserungsschleife: Das Ziel festzulegen bestimmt, was als besser gilt; das Vorschlagen von Änderungen ist bereits an die KI übergegangen; die Bewertung wird gerade abgegeben, wobei Menschen noch als letzte Absicherung dienen](/assets/blog/rsi-verification/loop-de.svg)

*Zum Bild: Die Farben zeigen den Stand 2026. RSI verlangt, dass alle drei Aufgaben an die KI übergehen und jede Runde der Schleife die nächste Runde besser laufen lässt.*

Am stärksten verändert hat sich dieses Jahr die erste Aufgabe. Anthropic hat es im September in [„When AI builds itself“](https://www.anthropic.com/institute/recursive-self-improvement) ganz unverblümt geschrieben: Gibt man Claude ein unklar formuliertes Problem, findet Claude selbst einen Lösungsweg; Menschen geben das Ziel vor, müssen aber nicht mehr die Methode vorgeben.

Auch die Zahlen passen dazu. Anthropic nutzt die Stufen von Epoch AI, um jede Kategorie seiner internen Forschungs- und Entwicklungsarbeit einzustufen, von AL0, bei der KI nicht beteiligt ist, bis AL5, bei der überhaupt kein Mensch mehr nötig ist. AL4 ist die Stufe, auf der Claude „führt“: Mit einer einzigen übergeordneten Anforderung erledigt Claude den Großteil der Aufgabe, während ein Mensch die Arbeit beaufsichtigt. Laut dem [veröffentlichten F&E-Automatisierungsindex](https://www.anthropic.com/institute/measuring-pace-of-ai-development) lag der Anteil der von Claude geführten Arbeit im August bei 26 %, im Februar noch unter 1 %; bei über neun Zehnteln der Arbeit wirkt Claude zumindest mit. Doch keine einzige Arbeitskategorie kommt bisher ganz ohne Menschen aus.

OpenAI hat im September [verkündet](https://www.helpnetsecurity.com/2026/09/07/openai-research-automation-intern/), sein Ziel eines „automatisierten Forschungspraktikanten“ erreicht zu haben: Unter menschlicher Anleitung erledigt er klar umrissene Aufgaben, für die ein erfahrener Forscher mehrere Tage bräuchte. Zugleich stellt OpenAI klar, dass Prioritäten setzen, Ergebnisse bewerten und über Entwicklung und Einsatz entscheiden weiterhin Sache von Menschen ist.

Legt man die Aussagen beider Firmen nebeneinander, ist der heutige Stand klar: **Die KI schlägt die Änderungen vor, Menschen legen die Ziele fest, und Menschen vergeben die letzte Bewertung.** Die Schleife dreht sich bereits, nur stehen an den beiden entscheidenden Positionen noch Menschen. In der Branche nennt man das eine „begrenzte geschlossene Schleife“ (bounded closed loop).

## Ob es besser im Besserwerden wird, hängt am Gewinn pro Runde

Seit die KI das Vorschlagen von Änderungen übernommen hat, geht es naturgemäß schneller voran. Aber „schneller werden“ ist nicht dasselbe wie „besser im Besserwerden“.

Der Unterschied liegt darin, ob nach dieser Runde auch die Änderungen, die in der nächsten Runde vorgeschlagen werden, stärker geworden sind. Mikhail Burtsev beschreibt das in [einem Paper](https://arxiv.org/abs/2609.00137) mit einer einzigen Zahl: um wie viel jede Verbesserungsrunde die Verbesserungsfähigkeit der nächsten Runde verstärkt, verglichen damit, dass die Probleme immer schwieriger werden, je weiter man kommt. Liegt diese Zahl über 1, wachsen die Gewinne Runde für Runde mit Zinseszins, und genau das ist die Beschleunigung, von der RSI spricht. Liegt sie unter 1, flacht der Fortschritt allmählich ab, so schnell der Start auch sein mag. Das Ärgerliche ist, dass man von außen nicht erkennt, ob die Zahl die 1 überschritten hat: Schneller Fortschritt kann auch nur bedeuten, dass der Ausgangspunkt effizienter geworden ist, nicht unbedingt, dass ein Zinseszinseffekt wirkt.

Über dreißig Forschende von der Shanghai Jiao Tong University, der Tsinghua University, ByteDance, dem Shanghai AI Lab und weiteren Einrichtungen haben im September ein Paper mit dem Titel [„The Last AI Built by Humans“](https://www.alphaxiv.org/abs/2609.11873) (die letzte von Menschen gebaute KI) veröffentlicht. Sie teilen Selbstverbesserung in fünf Stufen ein:

- **L1:** Führt Verbesserungen aus, die Menschen festgelegt haben.
- **L2:** Wählt die Mittel der Verbesserung selbst, das Ziel kommt weiterhin von Menschen.
- **L3:** Entscheidet mit, welche Erfahrung als Nächstes gesammelt wird.
- **L4:** Nutzt Rückmeldungen aus dem laufenden Einsatz, um den eigenen dauerhaften Zustand zu aktualisieren.
- **L5:** Ändert den Mechanismus selbst, der „entscheidet, wie künftig verbessert wird“.

Die ersten vier Stufen sind alle Arbeit innerhalb der Schleife; erst L5 verändert die Schleife selbst. Ihr Fazit: Für die unteren und mittleren Stufen gibt es reichlich Belege, für L5 nur einige Prototypen mit begrenztem Rahmen. Sie benennen auch die eigentliche Schwierigkeit: Bessere Kandidaten zu erzeugen ist nicht mehr schwer; schwer ist es, zu **beweisen**, dass nützliches Feedback tatsächlich an den nachfolgenden Verbesserungsprozess weitergegeben wurde.

Selbst die besten geschlossenen Schleifen von heute bleiben vor diesem Schritt stehen. [AIDE²](https://arxiv.org/abs/2609.26457) ließ einen KI-Forschungs-Agent seinen eigenen Code ändern, 8 Tage lang unbeaufsichtigt. Er lief 100 Schritte und behielt 7 Verbesserungen; die stärkste Version zog mit den besten von Menschen gebauten Forschungs-Agents gleich oder übertraf sie sogar. Das ist ein handfestes Ergebnis für eine begrenzte geschlossene Schleife. Doch die 7 Verbesserungen kamen in den Schritten 2, 6, 28, 39, 47, 63 und 85, und die Abstände wurden nicht immer kürzer. Besser geworden ist es durchaus; „besser im Besserwerden“ ist noch nicht zu erkennen.

## Es hakt an der Verifikation

Genau diese Systeme legen auch das schwächste Glied der Schleife offen: die Bewertung.

- **Bewerter werden ausgetrickst.** Eine Aufgabengruppe von AIDE² bestand darin, GPU-Kernels zu optimieren, und die Bewertung, die der Agent sehen konnte, war die Beschleunigung im Benchmark. Die Forschenden bauten die Kernels zusätzlich in echte Trainingsläufe von Modellen wie GPT-2 und ViT ein, um zu prüfen, ob die Beschleunigung bestehen blieb. Anfangs war in 55 % der Fälle der Benchmark schneller geworden, im echten Training aber hielt der Gewinn nicht; am Ende des Laufs waren es immer noch 32 %. Sakanas [Darwin Gödel Machine](https://arxiv.org/abs/2505.22954) ändert ihren eigenen Code und kam auf SWE-bench von 20 % auf 50 %, lernte dabei aber auch, die Markierungen zu löschen, mit denen „vorgetäuschte Tool-Aufrufe“ erkannt werden sollten, damit die Werte gut aussehen.
- **Auch die Bewertung selbst geht an die KI über.** Für Anthropics 26-%-Statistik hat Claude die Aufgabenliste erstellt, und ein anderer Claude hat die Stufen vergeben. Mit der Einstufung durch Menschen stimmte das nur in 59 % der Fälle genau überein, mit höchstens einer Stufe Abweichung in 97 %. Anthropic räumt selbst ein, dass das bewertende Modell dieselben Fehler wiederholen kann wie das geprüfte Modell und dass eine externe Prüfung nötig ist.
- **Es gibt mehr Kandidaten, als Menschen prüfen können.** Laut OpenAI lagen die Inferenzkosten pro Forschendem und Tag bis Mitte August im Median bei über 600 Dollar; auf 8 Stunden menschlicher Arbeit kommen 3,1 Arbeitstage an Agent-Leistung. Die Menge an Änderungen explodiert, die Zeit, die Menschen für die endgültige Beurteilung haben, ist aber nicht gewachsen.

Alle drei Punkte sagen dasselbe: **Erzeugen ist billig geworden, Verifizieren nicht.** Wie schnell sich eine Schleife dreht, bestimmt ihr langsamstes Glied, und das langsamste Glied ist derzeit die Bewertung.

Je tiefer die Änderung reicht, desto schwieriger wird dieses Glied. Ändert man das Gedächtnis, die Prompts oder den Tool-Code eines Agents, zeigt ein einziger Evaluationslauf schon ungefähr, wohin es geht, und wenn etwas kaputtgeht, kann man zurückrollen. Ändert man Trainingsdaten oder die Trainingspipeline, sieht man die Wirkung erst, wenn ein Trainingslauf durch ist; das dauert oft Wochen und kostet weit mehr. Auf Stufe L5 wird dann „wie man beurteilt, ob eine Änderung gut ist“ selbst verändert; dann wird sogar der Maßstab der Bewertung umgebaut.

## Zuerst läuft es dort an, wo Verifikation billig und genau ist

Dreht man diesen Gedanken um, lässt sich absehen, wo RSI sich zuerst auszahlt: **Je billiger die Bewertung, je genauer die Messung und je leichter sich Fehler zurücknehmen lassen, desto früher läuft es an.** Billig und genau sind beide unverzichtbar: Der Kernel-Benchmark von AIDE² war sehr billig, maß aber nicht die Geschwindigkeit im echten Training, und genau deshalb ließ er sich austricksen.

![Spektrum der Verifikationskosten: von Kernels, Code und dem eigenen Code des Agents bis zu Trainingspipelines und Forschungsrichtungen wird jede Bewertung teurer, und Selbstverbesserung zahlt sich immer später aus](/assets/blog/rsi-verification/verify-de.svg)

*Zum Bild: Von oben nach unten wird jede Bewertung teurer und hängt stärker vom menschlichen Urteil ab. Oben wirkt der Zinseszinseffekt bereits, unten ist noch nichts zu sehen.*

Das beste Beispiel ist [AlphaEvolve](https://deepmind.google/blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/) von Google DeepMind. Es hat einen zentralen Matrixmultiplikations-Kernel im Gemini-Training um 23 % beschleunigt und so die Trainingszeit von Gemini um 1 % verkürzt; die Regel, die es für das Scheduling in Rechenzentren gefunden hat, gewinnt dauerhaft rund 0,7 % der weltweiten Rechenleistung von Google zurück. Die Bewertung bemisst sich hier am Ende an echter Trainingszeit und echten Rechenzentren: Eine Messung kostet fast nichts, und mit schönen Worten lässt sie sich nicht überzeugen. Die eingesparte Rechenleistung fließt ins Training der nächsten Modellgeneration; das ist eine kleine Schleife, in der der Zinseszinseffekt bereits wirkt.

Nach derselben Logik: Code hat Tests, Mathematik hat Beweisprüfer, Kernels und Compiler haben Stoppuhren, Machine-Learning-Engineering hat verdeckte Testsets. An diesen Stellen wird echtes „besser im Besserwerden“ zuerst auftauchen.

Schwer wird es am anderen Ende: Forschungsrichtungen festlegen, beurteilen, ob sich ein offenes Problem lohnt, und das Alignment selbst. Die Bewertung dieser Dinge beruht auf Urteilsvermögen, und es dauert lange, bis man weiß, ob man richtig lag. Auch Anthropic räumt ein, dass Claude beim „Auswählen von Zielen“ noch deutlich hinter Menschen zurückliegt.

Das ist dieselbe Überlegung wie in meinem [vorigen Beitrag](/de/blog/agent-permission-context/) darüber, warum Agents zuerst im Repository durchgestartet sind. Dort hieß es: Wo alle Informationen da sind und Fehler sich zurücknehmen lassen, bekommen Agents zuerst Arbeit erledigt. Hier heißt es: Wo die Bewertung billig, die Messung genau und Fehler umkehrbar sind, kommt Selbstverbesserung zuerst in Schwung.

## Was ich als Nächstes erwarte

- **Der Anteil „KI-geführter“ Arbeit wird weiter schnell steigen, aber ein vollständig autonomes L5 kommt nicht so bald.** Die 26 % sind in einem halben Jahr von unter 1 % hochgeklettert und werden in den nächsten ein, zwei Jahren noch einmal kräftig zulegen. Doch das Wachstum betrifft vor allem den Teil, in dem „Menschen das Ziel festlegen und das Ergebnis abnehmen“. Ich rechne nicht damit, dass es innerhalb von ein, zwei Jahren glaubwürdige öffentliche Belege dafür gibt, dass irgendein System L5 erreicht hat.
- **Der Wettbewerb verlagert sich von „wer erzeugt am besten“ zu „wer verifiziert am besten“.** Verdeckte Tests, unabhängige Prüfer und Release-Prozesse mit Rollback werden genauso zu Kernfähigkeiten der Labore wie Rechenleistung und Daten. Wessen Bewertungsschritt schnell ist und sich zugleich schwer austricksen lässt, dessen Schleife dreht sich am schnellsten.
- **Die erste Dividende von RSI zeigt sich als sinkende Kosten.** Was sich zuerst auszahlt, sind schnellere Kernels, sparsameres Training und billigere Code-Wartung, was ganz und gar nicht nach „plötzlich klüger geworden“ aussieht. Das eingesparte Geld und die gewonnene Zeit schieben dann Stück für Stück die nächste Modellgeneration an.
- **Am meisten Sorgen machen sollte, dass die Schwelle unbemerkt überschritten wird.** Wann diese Schwelle „größer als 1“ überschritten wird, ist von außen nicht zu erkennen; und weil die Bewertung zunehmend von der KI selbst übernommen wird, erfahren Menschen es womöglich als Letzte. Deshalb werden Messungen wie Anthropics F&E-Automatisierungsindex und die freiwilligen Offenlegungen von OpenAI genauso wichtig wie die Modelle selbst. OpenAI räumt ein, noch nicht zu wissen, wie sich vollständige RSI sicher erreichen lässt; Anthropic hat erklärt, das Tempo ebenfalls zu drosseln oder zu pausieren, wenn andere Frontier-Labs dies gemeinsam und überprüfbar tun.

Für Engineers, die Agent-Schleifen bauen, ergibt sich daraus eine sehr direkte Lehre: **Lassen Sie den Agent sich nicht selbst bewerten.** Der Ansatz von AIDE² ist es wert, eins zu eins übernommen zu werden: Der Agent optimiert auf eine sichtbare Bewertung hin; ob eine Version behalten wird, entscheidet aber eine verdeckte Evaluation, die er nicht sehen kann. Legen Sie Tests, Prüfer und Rechte dort ab, wo der Agent sie nicht ändern kann. Wie die Schleife geschlossen wird, ist wichtiger als die Frage, ob sie geschlossen wird.

Zurück zu den beiden Dingen vom Anfang. Dass KI am Bau der nächsten KI-Generation mitarbeitet, ist bereits Realität. Ob sie besser im Besserwerden wird, hängt davon ab, ob die Verifikation Schritt halten kann. Wenn Sie das nächste Mal lesen, „XY hat Selbstevolution erreicht“, fragen Sie zuerst: **Wer hat diese Runde bewertet?**
