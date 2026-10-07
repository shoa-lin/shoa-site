---
translationKey: "agent-permission-context"
locale: "de"
title: "Was er anfassen darf, was er weiß: Warum Agents ständig die Form wechseln"
description: "Ein Agent bekommt nur dort etwas erledigt, wo „handeln dürfen“ und „Bescheid wissen“ sich überschneiden. Entlang dieser beiden Achsen verfolgt der Text, wie Agents vom Repository zum Rechner und in den Kanal wandern – und schließlich zu einer eigenen Identität."
publishedAt: "2026-10-05"
updatedAt: "2026-10-05"
category: "architecture"
sourceLocale: "zh"
sourceUrl: "https://www.bydziwen.top/blog/agent-permission-context/"
sourceAuthor: "Shoa Lin"
contentType: "original"
translationStatus: "reviewed"
---

Seit gut einem Jahr wechseln Agent-Produkte in hohem Tempo ihr Erscheinungsbild. Zuerst waren es Coding-Assistenten im Terminal und in der IDE, dann Desktop-Apps und Bots in Chat-Programmen. Später bekam der Agent von manchen einen Cloud-Rechner, andere holten ihn in den Teamkanal, und wieder andere gaben ihm ein eigenes Postfach und eine eigene Handynummer.

Auf den ersten Blick sieht es so aus, als bastle jeder Anbieter nur an einer neuen Hülle. Ich selbst sortiere diese Veränderungen mit zwei Fragen:

- **Rechte**: Woran darf der Agent Hand anlegen?
- **Kontext**: Was weiß der Agent, und was kann er behalten?

Nur dort, wo sich beides überschneidet, bekommt ein Agent tatsächlich etwas erledigt. Weiß er Bescheid, kann aber nicht handeln, bleibt er Berater; kann er handeln, ohne Bescheid zu wissen, ist er ein Fremder mit Ihrem Schlüsselbund. Meine These lautet deshalb: **Die Form eines Agents ist genau die Stelle, an der sich Rechte und Kontext überschneiden.** Jeder Formwechsel eines Produkts schiebt diese Überschneidungszone ein Stück weiter nach außen: Eine Achse prescht vor, die andere zieht nach.

## Zuerst ein Bild

![Diagramm Rechte × Kontext: horizontale Achse Umfang der Rechte, vertikale Achse Umfang des Kontexts, sieben Produktgruppen eingetragen](/assets/blog/agent-permission-context/map-de.svg)

*Zum Bild: Je weiter rechts auf der horizontalen Achse, desto mehr kann der Agent bewegen, und desto schwerer lässt sich ein Fehler zurücknehmen. Wo ein Produkt steht, ist meine Einschätzung, nicht die Aussage des Herstellers.*

In diesem Bild geht es nur um zwei Dinge: Wer auf der Diagonale liegt, bei dem laufen beide Achsen gemeinsam voran; wer von ihr abweicht, bei dem ist eine Achse vorausgelaufen. Im Folgenden arbeite ich mich Abschnitt für Abschnitt vor, und jeder Abschnitt ergibt sich aus dem vorigen.

## Warum Coding als Erstes durchgestartet ist

Im Chatfenster weiß der Agent, was Sie gesagt haben, aber alles, was er tun kann, ist antworten; die Arbeit bleibt an Ihnen hängen.

Ein Repository ist anders: Es packt beide Achsen in dasselbe Verzeichnis. Code, Commit-Historie und Tests sind der Kontext, den der Agent braucht; Dateien ändern und Befehle ausführen sind seine Rechte. Entscheidender noch: Diese Rechte lassen sich zurückholen. Geht eine Änderung schief, kann git sie zurückrollen; ob sie richtig war, prüfen die Tests ab. Wenn sich Aktionen rückgängig machen lassen, darf man die Rechte auch etwas großzügiger zuschneiden.

Im Mai 2025 veröffentlichte OpenAI Codex, das Engineering-Aufgaben parallel in isolierten Umgebungen erledigt; wenige Tage später wurde Claude Code allgemein verfügbar, und die Änderungen erscheinen direkt in den Dateien in Ihrem VS Code oder JetBrains. Beide haben, ohne sich abzusprechen, beim Repository angesetzt.

![Vergleich: Im Chatfenster überschneiden sich Kontext und Rechte kaum; im Repository überlappen sie großflächig](/assets/blog/agent-permission-context/repo-de.svg)

*Zum Bild: Das Repository ist der erste Ort, an dem „alle Informationen da sind und Fehler sich zurücknehmen lassen“.*

Wer also wissen will, wann sich ein Bereich an einen Agent übergeben lässt, sollte zuerst schauen, ob es dort einen solchen Ort gibt: vollständiger Kontext und Aktionen, die sich rückgängig machen lassen.

## Jenseits des Repositorys teilt sich der Weg

Sobald man das Repository verlässt, wird es schwierig. Ihr Kontext ist über Chatverläufe, Dateien und allerlei Konten verstreut; die Stellen, an denen sich handeln lässt, verteilen sich auf einen Haufen Websites und Apps ohne API. Es gibt keinen fertigen Ort, der beides zugleich aufnimmt, und so gabelt sich der Weg.

Der eine Weg baut zuerst den Kontext aus: Der Agent kommt in die Chat-Programme, die Sie ohnehin benutzen, und Memory und Sitzungen bleiben bei Ihnen. OpenClaw bindet sich über ein Gateway an Kanäle wie WhatsApp, Telegram und Slack an; Arbeitsbereich, Memory-Dateien, Sitzungen und Schlüssel liegen in der Hand des Nutzers. Bei Hermes teilen sich Kommandozeile, Desktop-App und Messaging-Gateway dieselben Sitzungen und dieselbe Konfiguration.

Der andere Weg weitet zuerst die Rechte aus: Er gibt dem Agent schlicht einen Rechner. Eine grafische Oberfläche plus ein eingeloggter Browser ist das universellste Mittel gegen „Dinge ohne API“. Grok Bot arbeitet auf einem persistenten Cloud-Rechner mit Browser, Dateisystem und Terminal und meldet sich bei Ihren vorhandenen Tools und Websites an; Muse gibt jedem Nutzer eine abgesicherte virtuelle Maschine mit Browser, die weiterarbeitet, wenn Sie die App schließen.

![Gabelung: Nach dem Repository baut ein Weg zuerst den Kontext aus, der andere zuerst die Rechte; am Ende müssen beide die andere Achse nachholen](/assets/blog/agent-permission-context/fork-de.svg)

*Zum Bild: Welche Achse auch vorausläuft, die andere ist die Schuld, die als Nächstes zu begleichen ist.*

## Freigaben: Der Mensch liefert den fehlenden Kontext nach

Wer zuerst den Weg der Rechte geht, stößt sofort auf ein Problem. Ein Rechner, der in Ihre Konten eingeloggt ist, kann jeden Knopf drücken, weiß aber nicht, welche Aktionen Sie mittragen würden: wie hoch Ihr Budget ist, in welchem Verhältnis Sie zum Empfänger stehen, wo Ihre Grenzen liegen.

Mit jeder Freigabe-Abfrage, die dann aufpoppt, bittet Sie in Wahrheit der Agent um das Stück Kontext, das ihm fehlt. Regeln vorab festzulegen heißt, ihm diesen Kontext in einem Rutsch zu übergeben. Dots lässt Sie dafür Aktionen in drei Stufen einteilen: erlaubt, freigabepflichtig, verboten. Muse fragt vor dem Versenden einer Mail oder vor einem Einkauf nach und protokolliert das zudem.

![Schema: Die Rechte reichen ein Stück über den Kontext hinaus; die Lücke wird durch Freigabe-Dialoge, vorab festgelegte Regeln sowie gesammeltes Memory und Präferenzen geschlossen](/assets/blog/agent-permission-context/approval-de.svg)

*Zum Bild: Viele Freigabe-Dialoge bedeuten, dass die beiden Achsen weit auseinanderliegen.*

„Wie oft muss ich pro Aufgabe freigeben?“ lässt sich daher als Messwert lesen: Er misst den Abstand zwischen Rechten und Kontext. Wer ihn senken will, sollte Kontext nachliefern – Regeln, Memory, Präferenzen – und nicht die Schranke abmontieren.

Ein Stück Kontext wird absichtlich vorenthalten: die Passwörter. Muse legt Zugangsdaten in einem sicheren Speicher ab; das Modell sieht weder Ihre Passwörter noch Ihre Zahlungsmittel. Der Agent kann sie benutzen, aber nicht sehen.

## Der Einstieg wandert dorthin, wo sich der Kontext sammelt

Ein Blick zurück auf den Weg, der zuerst den Kontext wachsen ließ, zeigt noch etwas anderes.

Ob der Einstieg Terminal, Chat-Programm, Desktop oder WhatsApp heißt, ändert nichts daran, was der Agent anfassen darf und was er weiß. Einstiege lassen sich deshalb beliebig öffnen und wieder schließen. Was sich wirklich nach und nach ansammelt, ist der Kontext: Memory, Skills, Sitzungen, Threads. Und genau das verlieren Sie beim Produktwechsel.

Also ziehen die Anbieter die Einstiege dorthin zusammen, wo sich der Kontext angesammelt hat, und die Ausführungsumgebung, die die eigentliche Arbeit erledigt, tritt in den Hintergrund und wird zu einem jederzeit austauschbaren Backend. Die neue ChatGPT-Desktop-App fasst Chat, Work und Codex in einer Hülle zusammen; Dots stößt Aufgaben in Codex oder Work an, und diese werden weiterhin wie bisher abgerechnet. Der Bot Mode von Hermes ist nur ein Desktop-Plugin: Schaltet man ihn ab, bleiben Profil und Sitzungen erhalten. Die Oberfläche lässt sich abbauen, der Zustand bleibt.

Der eigentliche Burggraben eines Agents ist also der Zustand, den er für Sie angesammelt hat. Exportieren, Vergessen, Zurücksetzen, Isolieren – diese Dinge müssen als Kern des Produkts behandelt werden.

## Teamarbeit: Der Kanal schneidet beide Achsen an derselben Stelle

Sobald der Kontext mehreren Personen gehört, taucht ein neues Problem auf. Das Wissen eines Teams verteilt sich auf seine Mitglieder; ein Agent für Einzelnutzer sieht nur den Kontext einer Person und kann nur deren Rechte nutzen.

Der Kanal löst beides auf einmal. Claude Tag ist das Team-Claude in Slack: Administratoren schalten ihm pro Kanal Tools, Daten und Code-Repositories frei, und jeder im Kanal kann es per @ mit Aufgaben betrauen. Ein Kanal, ein Claude; was es tut, sieht der ganze Kanal, und Administratoren können Ausgabenlimits setzen und das Aktivitätsprotokoll einsehen. Die Grenze der Rechte und die Grenze des Kontexts fallen auf demselben Kanal zusammen. Deshalb steht es im Diagramm oben rechts.

Zum Vergleich der Bot Mode von Hermes: mehrere benannte Bots mit jeweils eigener Rolle, eigenem Modell, Memory und Skills, die Gruppenchats führen und einander Nachrichten schicken können – aber alle gehören demselben Nutzer. Das teilt den Kontext einer Person in mehrere Teile auf, berührt aber noch nicht den Kontext anderer.

Wer einen Team-Agent baut, sollte deshalb zuerst suchen, wo sich der Kontext des Teams bereits angesammelt hat (Kanal, Projekt, Repository), und die Rechte dort festmachen, nicht an einer einzelnen Person.

## Identität: Rechte so fein schneiden wie den Kontext

In der letzten Runde liegt das Problem darin, dass „der Agent sich als Sie anmeldet“. Handelt er unter Ihrer Identität, bekommt er Ihre sämtlichen Rechte: Sie lassen sich nicht kleiner schneiden und nicht einzeln entziehen; wer sie entzieht, entzieht sie Ihnen gleich mit.

Mit vielen Agents wird dieses Problem größer. Grok Bot ist ein gutes Beispiel: Mehrere Bots teilen sich einen Cloud-Rechner, jeder mit eigenem Bildschirm; Gespräche und Gelerntes sind pro Bot getrennt, Dateien und Browser-Logins dagegen gemeinsam. Der Kontext ist pro Bot aufgeteilt, die Rechte bleiben ein einziger Block für das ganze Konto.

![Schema: Mehrere Bots haben jeweils eigenen Kontext, teilen sich aber die Rechte des ganzen Kontos; mit einer eigenen Identität pro Agent werden Kontext und Rechte beide pro Agent getrennt](/assets/blog/agent-permission-context/identity-de.svg)

*Zum Bild: Jeder Bot hält sämtliche Rechte, kennt aber nur einen Ausschnitt der Lage.*

Dem Agent eine eigene Identität zu geben, ist der direkteste Weg, Rechte so fein zu schneiden wie den Kontext. Cue stattet jeden Agent mit eigenem Postfach, eigener Telefonnummer, eigenem Wallet und eigenem Rechner aus und lässt ihn nur innerhalb des von Ihnen gesetzten Budgets bezahlen; der Spezialisten-dot von Dots hat eine eigene Identität und von der IT eingerichtete Hardware und kann sich an Firmensysteme anbinden, befindet sich derzeit aber noch in der Preview. Damit werden Rechte zu etwas, das sich einzeln vergeben, mit einem Limit versehen und widerrufen lässt, und sind nicht länger ein Login-Zustand, den man dem Agent leiht.

Man könnte fragen, ob Identität eine dritte Achse ist. Aus meiner Sicht geht sie weniger auf der horizontalen Achse noch einen Schritt nach rechts, als dass sie eine andere Frage stellt: Wem gehört dieses Recht?

## Zum Schluss

Jeder Formwechsel ist letztlich dieselbe Geschichte: Eine Achse prescht vor, die andere zieht nach, und an der Überschneidung wächst ein neues Produkt. Wenn Sie das nächste Mal einen neuen Agent sehen, schauen Sie nicht zuerst darauf, wie der Einstieg aussieht; zwei Fragen genügen: Was darf er anfassen, und was weiß er?
