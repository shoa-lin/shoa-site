---
translationKey: "how-we-made-claude-ai-faster"
locale: "de"
title: "Wie wir claude.ai in zwei Wochen dreimal schneller gemacht haben"
description: "Ein zweiwöchiger Performance-Sprint, gesteuert aus einem einzigen Slack-Channel: Claude spürte Engpässe auf, baute Benchmarks und lieferte über 3.000 Änderungen aus – claude.ai und die Desktop-App wurden dadurch rund dreimal schneller. Die zentrale Lehre: Sobald Claude etwas messen kann, kann es das auch schneller machen."
publishedAt: "2026-09-23"
updatedAt: "2026-09-23"
category: "development"
sourceLocale: "en"
sourceUrl: "https://claude.dev/blog/how-we-made-claude-ai-faster/"
sourceAuthor: "Raymond Wang, Sam Attard, and Issac G."
contentType: "translation"
translationStatus: "reviewed"
---

> Dieser Beitrag ist eine Bearbeitung von [How we made claude.ai 3x faster in two weeks](https://claude.dev/blog/how-we-made-claude-ai-faster/) von Raymond Wang, Sam Attard und Issac G., erschienen am 23. September 2026. Diagramme und Videos des Originals sind hier als Text zusammengefasst; die Slack-Verläufe sind – wie im Original – Nachstellungen echter Unterhaltungen.

Sobald Claude etwas messen kann, kann es das auch schneller machen. Also hat das Team immer neue Dinge gesucht, die sich messen lassen. Dies ist die Geschichte eines zweiwöchigen Performance-Sprints – und der Arbeitsschleife, mit der eine Handvoll Engineers gemeinsam mit Claude über dreitausend Änderungen ausgeliefert hat, ohne einen einzigen Vorfall, den Nutzer zu spüren bekamen.

## Einleitung

Im August hat das Team das Kernerlebnis von claude.ai und der Claude-Desktop-App in einem zweiwöchigen Sprint etwa dreimal schneller gemacht. Nutzer hatten sich über die Trägheit beschwert, und sie hatten recht. Gesteuert wurde alles aus einem einzigen Slack-Channel, mit Claude in jedem Thread.

Im Fokus standen vier Nutzerpfade, die 95 % der Nutzeraktivität ausmachen. Beim 75. Perzentil (p75) gilt:

- Die Zeit bis zu einer eingabebereiten Seite beim Kaltstart von claude.ai sank von **3,1 auf 0,55 Sekunden**.
- Der Start einer neuen Claude-Code-Session sank von **0,8 auf 0,3 Sekunden**.
- Das Laden einer Claude-Cowork-Cloud-Session sank von **2,6 auf 0,73 Sekunden**.

Insgesamt schätzt das Team, dass Nutzern damit täglich Zehntausende Stunden Wartezeit erspart bleiben.

> **Diagramm-Zusammenfassung: dreizehn Vorher-nachher-Messungen beim p75 realer Nutzer (13. August vs. 27. August).**
>
> - **App starten:** Kaltstart von claude.ai im Web 3.085 → 550 ms (5,6x, −82 %); Kaltstart der Desktop-App 6.310 → 3.328 ms (1,9x, −47 %).
> - **Unterhaltung beginnen:** Chat Web 416 → 273 ms (1,5x); Chat Desktop 460 → 224 ms (2,1x); Claude Code Desktop 837 → 347 ms (2,4x).
> - **Unterhaltung laden:** Chat Web 1.557 → 646 ms (2,4x); Chat Desktop 1.353 → 488 ms (2,8x); Claude Cowork Desktop/Cloud 2.566 → 728 ms (3,5x); Claude Code Desktop 545 → 262 ms (2,1x).
> - **Nachricht senden:** Chat Web 180 → 59 ms (3,1x); Chat Desktop 140 → 64 ms (2,2x); Claude Cowork Desktop/Cloud 928 → 48 ms (19x, −95 %); Claude Code Desktop 250 → 52 ms (4,8x).
>
> Über dreizehn Messungen und vier Pfade hinweg ergibt sich eine durchschnittliche Beschleunigung um den Faktor 3,1 (geometrisches Mittel).

Gearbeitet wurde mit [Claude Tag](https://claude.com/product/tag) (Beta), dahinter ein internes Forschungsmodell, das in etwa mit Opus 5.5 vergleichbar ist. Claude fand Engpässe, baute Benchmarks, lieferte Verbesserungen aus und beobachtete jedes Deployment. Die Menschen steuerten: Sie setzten Ziele, wogen Kompromisse ab und genehmigten jede Änderung. So wurden über dreitausend Änderungen gemergt – ohne einen einzigen kundenrelevanten Vorfall und ohne einen einzigen Rollback.

## Der Auftrag

Vor dem Sprint legte das Team einen Slack-Channel mit folgenden [dauerhaften Anweisungen (Standing Instructions)](https://claude.com/docs/claude-tag/users/getting-started#give-claude-standing-instructions) an:

> **@Claude** Deine Aufgabe ist es, dich um alles zu kümmern, was mit der Performance der Website claude.ai und der Desktop-App zu tun hat. Zu deinen Verantwortlichkeiten gehören: Deployments auf Performance-Regressionen überwachen, die Genauigkeit und Vollständigkeit der vorhandenen Telemetrie bewerten, gut kuratierte Observability-Dashboards pflegen, proaktiv Lösungen für beobachtete Probleme und schnelle Gewinne umsetzen, Performance-Projekte vorschlagen und mit deinen menschlichen Teammitgliedern kommunizieren. […]
>
> Das eigentliche Ziel dieses Channels ist, dass du so autonom wie möglich wirst – aber wir wissen, dass das heute noch nicht geht.

Claude analysierte die Nutzungsdaten über den Datadog-MCP-Server und identifizierte die vier wirkungsvollsten Nutzerpfade: App starten, Unterhaltung beginnen, bestehende Unterhaltung laden und Nachricht senden. Über Web und Desktop und über die verschiedenen Produkte hinweg ergab das dreizehn getrennte Messungen. Für die Baselines ergänzte das Team so lange Instrumentierung, bis die Messungen direkt vergleichbar waren: Jede begann mit einer Nutzerinteraktion, endete, sobald das Ergebnis gerendert war, und trennte Client- von Serverarbeit.

Zum Auftakt gab es eine Liste von rund zwanzig handverlesenen Projekten, jedes auf einen bestimmten Pfad zugeschnitten. Claude schätzte die Wirkung jedes Projekts in Millisekunden, und aus der Summe dieser Schätzungen ergaben sich die Sprintziele. Einige Projekte waren ziemlich umfangreich, aber das Team ging davon aus, das meiste in zwei Wochen zu schaffen.

**Am dritten Tag waren zwölf der dreizehn Ziele erreicht.**

Die geplanten Projekte landeten früh:

- **Schnellere Starts:** ein statischer Composer (das Eingabefeld), direkt ins HTML eingebacken, sodass Nutzer schon tippen können, während React noch initialisiert; dazu ein vorkompilierter V8-Code-Cache, damit der Hauptprozess der Desktop-Shell nicht bei null neu kompilieren muss.
- **Schnellere Navigation:** Der Composer bleibt zwischen Unterhaltungen gemountet, Sessions werden per Prefetch geladen, sobald der Mauszeiger darüber schwebt, und die Re-Renders der Seitenleiste sanken um 90 %.

Das Team hatte Claude auch Raum gelassen, selbst Chancen zu erkennen und neue Arbeitsstränge vorzuschlagen. Die wuchsen schnell zu eigenständigen Projekten heran und übertrafen die ursprünglichen Ziele bei Weitem. Also wurden neue Ziele gesetzt – und die Suche nach weiteren Messgrößen begann:

> **@Claude** wir haben am Ende fast jedes Projekt von der ursprünglichen Liste finanziert und noch mehr. lass uns neu sortieren […] was haben wir noch nicht erkundet, wo können wir hill climbing betreiben, wo liegt jetzt die größte Chance? […] ich bin offen für VERRÜCKTE ideen

## Alles lässt sich schrittweise optimieren

Von Anfang an wollte das Team schneller iterieren, als es der Deploy-Rhythmus erlaubte. Claude konnte stundenlang asynchron arbeiten, sogar über Nacht, und sollte seine Prototypen validieren können, ohne auf Felddaten zu warten. Dafür brauchte es andere Wege, Performance im Labor zu messen.

Sam fand die erste Spur:

> **Nachgestellt nach einer echten Unterhaltung — #claude-apps-perf**
>
> **Sam — 12:34 Uhr:** Was können wir statt Wall-Clock-Zeit messen? Können wir zum Beispiel JS-Instruktionen zählen?
>
> **ClaudeApp — 12:42 Uhr:** Für Browser-Pfade gibt es unter Chromium keine Instruktionszählung, aber eine ganze Leiter anderer deterministischer Zähler: React-Commits pro Interaktion, Funktionsaufrufe aus der Precise Coverage von V8, Anzahl der Layout- und Style-Neuberechnungen, DOM-Mutationen. Womit willst du anfangen?
>
> **Sam — 12:49 Uhr:** Lass uns valgrind + `Ir` + `--predictable` in einem Thread ausprobieren und jede Browser-/React-Bench in einem eigenen neuen Thread. Pingt mich in allen an. Du weißt, was wir wollen. Los geht's

Elf Minuten später liefen fünf Threads, jeder mit einer anderen Messgröße: Instruktionszahlen, V8-Aufrufzahlen, React-Commits, Style-Neuberechnungen und DOM-Mutationen.

Jedem neuen Benchmark begegnete das Team mit einer gewissen Skepsis. Jeder hatte zwei Aufgaben: erstens eine Kennzahl zu sein, die Claude im Labor bewegen kann; zweitens eine Leitplanke in der CI, deren Wert nur nach unten nachgezogen werden kann – eine Ratsche. War ein Benchmark instabil oder korrelierte er nicht wirklich mit der Latenz, die Nutzer spüren, flog er raus, statt Claude den falschen Hügel hinaufklettern zu lassen.

> **@Claude** bitte beweise, dass Hill Climbing auf jeder dieser Größen messbare Wall-Clock-Gewinne bringt. Kandidaten, die das nicht belegen können, bauen wir wieder aus

Wall-Clock-Zeit ist das, was Nutzer spüren, aber sie ist verrauscht, und Millisekunden schwanken zu stark, um als CI-Gate zu taugen. Instruktionszahlen sind deterministisch und daher verlockend – doch Claude musste erst beweisen, dass sie der Wall-Clock-Zeit tatsächlich folgen.

Also bat das Team Claude, die Zahl auf zwei Hot Paths zu drücken: der Routine, die den Nachrichtenbaum einer Unterhaltung zusammensetzt, und einem Scanner für Statuszeilen in der Ausgabe von Claude Code. Beim Profiling mit Valgrind stellte Claude fest, dass ein Viertel der Instruktionen im ersten Pfad megamorphe Dictionary-Lookups waren, die dieselbe Nachrichten-ID dreimal getrennt auflösten.

Eine Stunde später hatte es die Instruktionen auf den beiden Pfaden um 48 % und 31 % gesenkt, und die Wall-Clock-Zeit war um 78 % und 44 % gefallen. Zwei neue Ratschen wurden eingecheckt: Von da an scheiterte jeder PR in der CI, der die Instruktionszahl dieser Pfade erhöhte, und ein täglicher Job senkte die jeweilige Obergrenze, sobald die Zahl sank.

> **Diagramm-Zusammenfassung: zwei Hot Paths, vorher und nachher.**
>
> - **Aufbau des Nachrichtenbaums:** jede Nachrichten-ID einmal statt dreimal aufgelöst; CPU-Instruktionen −48 %, Wall-Clock −78 %, 4,6x schneller.
> - **Statuszeilen-Scanner:** günstige Prüfung des ersten Zeichens vor der Regex; CPU-Instruktionen −31 %, Wall-Clock −44 %, 1,8x schneller.
>
> Gezählt unter Valgrind mit `node --predictable`; gemessen auf demselben Benchmark unter normalem node mit aufgewärmtem JIT.

Daraus ergab sich die zentrale Lehre des Sprints: **Mit Claude wird alles, was man messen kann, auch lösbar.**

Früher war Messen Schritt null: Man fügte eine Kennzahl hinzu, wartete, bis Daten eintrudelten, und begann erst dann, das Problem zu verstehen. Mit Claude ist Messen der erste Schritt des Aufstiegs. Sobald Claude eine Zahl hat, die es zu schlagen gilt, kann es mit dem Optimieren loslegen. Der wirksamste Hebel des Teams war es also, immer mehr Dinge zum Messen zu finden.

## Die Schleife, Thread für Thread

All das spielte sich im selben Slack-Channel ab, in dem mehrere Engineers und Claude in jedem Thread miteinander jammten. Der Sprint pendelte sich bald auf eine [Schleife (Loop)](https://claude.com/blog/getting-started-with-loops) ein:

1. Jemand eröffnet einen Thread zu einer langsamen Stelle in einem Pfad, oft mit Screenshot oder Bildschirmaufnahme.
2. Claude verfolgt den Ablauf und findet oder baut einen Benchmark, der das Problem sichtbar macht.
3. Mit einem vielversprechenden Laborergebnis kommt Claude mit einem PR zurück – oft mehreren, nach Risiko und Review-Aufwand geschnitten, alles Sichtbare hinter einem Flag.
4. Nach dem Release beobachtet Claude das Deployment und liest die Felddaten nach Build und Plattform.
5. Wurde es schneller, sichert Claude den Gewinn, indem es die Ratsche des Benchmarks nachzieht; wenn nicht, schaltet es das Flag ab und iteriert.
6. Dann sucht es die nächste langsame Stelle im selben Pfad.

Ein Beispiel: Jemand teilte eine Bildschirmaufnahme, auf der Zeilen der Seitenleiste erst nach dem Laden der Seite auftauchten. Chat- und Cowork-Zeilen wurden zu unterschiedlichen Zeitpunkten aufgelöst, sodass die Seite ruckelig wirkte. Keiner der bestehenden Monitore schlug an. Am nächsten kam noch der [Cumulative Layout Shift](https://web.dev/articles/cls) (CLS), doch jede Verschiebung erzielte nur etwa 0,008 – deutlich unter dem „guten“ Schwellenwert von 0,1.

Issac kam auf die Idee, direkt auf die zugrunde liegende [Layout Instability API](https://wicg.github.io/layout-instability/) zurückzugreifen. Claude erstellte ein Telemetrie-Event, das die `sources` jedes `layout-shift`-Eintrags einer benannten Region (etwa Seitenleiste oder Verlauf) und einer Phase (etwa vor dem ersten Paint oder nach Eingabebereitschaft) zuordnete. Dazu kam ein Integrationstest, der die Seite mit gefüllter Seitenleiste öffnete, deren Daten bis nach dem ersten Paint zurückhielt und bei jeder Verschiebung in einer benannten Region fehlschlug. Dieser Test wurde zum Benchmark, der den Fix belegte: auf main 20 von 20 Läufen rot, auf dem PR 20 von 20 grün.

Nach dem Deployment des Events las Claude die Felddaten und stellte fest, dass sich **bei 31 % der Web-Seitenaufrufe etwas bewegte, nachdem die Seite bereits nutzbar war** – ganz ohne Nutzerinteraktion. Von da an arbeitete Claude die Ursachen einzeln ab: eine Kopfzeile, die zu spät kam; ein Cursor, der seitlich rutschte, sobald der Nutzername geladen war; eine Liste, die sich verschob, wenn die Scrollleiste erschien. Die größten Übeltäter behob es gebündelt, und als sie verschwunden waren, fand es die nächste Ladung.

> **Video-Zusammenfassung: ruckelnde Seitenleiste, vorher und nachher (gedrosseltes 4G).** Vorher kommen die Zeilen spät und ordnen sich neu: zehn Zeilen springen, neun tauchen auf, vier verschwinden. Nachher füllen sich die Zeilen gleich an ihrer endgültigen Position, und nichts bewegt sich.

Das war ein einziger Thread. Während des Sprints liefen mehr als hundertfünfzig gleichzeitig.

## Horizontal skalieren

Als die Schleife in einem Thread funktionierte, musste man für mehr nur weitere Threads öffnen. Statt einen Thread zu schließen, sobald die ursprüngliche Anfrage erledigt war, *machte Claude einfach weiter*. Ein einzelner Thread brachte fünfzig, manchmal hundert Optimierungs-PRs hervor. Immer öfter war es Claude und nicht ein Mensch, das neue Threads eröffnete, um Chancen nachzugehen, die es selbst entdeckt hatte – im Zuge einer anderen Untersuchung oder eines nächtlichen Jobs. Shelley, eine der Engineers im Channel, brachte es auf den Punkt: „[Dieses Modell] ist ein Zahlendämon.“

Jede Messung förderte etwas zutage:

- Eine Bestandsaufnahme der React-Hooks fand **6.900 Hooks und 900 Store-Subscriptions** im Tipppfad des Composers, die bei jedem Tastendruck neu renderten.
- Das Zählen der Style-Neuberechnungen ergab, dass ein einziger `:root:has()`-Selektor **jede DOM-Änderung um 24 Millisekunden verlängerte**.
- Das Tracing der Codepfade nach dem ersten Paint entlarvte ein übrig gebliebenes `location.reload()`, das **eine halbe Million versteckte Reloads pro Tag** verursachte – für keine Lade-Kennzahl sichtbar.
- Profiler-Samples aus inaktiven Tabs zeigten, dass identische Cache-Snapshots zweimal pro Minute in IndexedDB geklont wurden, komplett auf dem Main Thread.

Wohin ein Thread führen würde, wusste man selten. Bei der Suche nach CPU-Hängern bemerkte Claude, dass das Highlighting eines fertigen Codeblocks die Seite für etwa eine Sekunde einfrieren konnte. Im Labor fand es den Schuldigen: Geviertstriche. Enthielt das Markdown einer Antwort auch nur ein Zeichen außerhalb von Latin-1, etwa einen Geviertstrich oder ein typografisches Anführungszeichen, speicherte V8 den gesamten String als UTF-16 – und schickte damit jede Syntax-Highlighting-Regex auf ihren langsameren Zwei-Byte-Pfad. Die Lösung war eine Änderung von zwanzig Zeilen: Jeder Codeblock wird vor dem Highlighting in einen Ein-Byte-String kopiert.

> **Diagramm-Zusammenfassung: Highlighting eines fertigen Codeblocks in einer Antwort mit Geviertstrich (Labormessung).** Beim ersten TypeScript-Block einer Seite sinkt die Main-Thread-Zeit von 1,0 s auf 0,35 s (−65 %), jeder weitere Durchlauf über diesen Block von 100 ms auf 40 ms. Bedingungen: Container mit 4 vCPUs, Headless Chrome, keine CPU-Drosselung, 2–3 Läufe pro Wert, August 2026.

In der zweiten Woche ließ sich der Output kaum noch in tägliche Updates fassen. An den geschäftigsten Tagen landeten über zweihundert Änderungen. Claude schlug laufend neue Benchmarks vor; etwa ein Drittel der PRs brachte zusätzliche Telemetrie oder Leitplanken mit, und jedes neue Messinstrument erzeugte weitere Threads mit weiteren Chancen.

Die Arbeit in einem einzigen Channel bedeutete, dass alles offen geschah. Man sprang in die Threads der anderen und wieder hinaus, um Entscheidungen zu diskutieren und Erfolge zu feiern. Es sprach sich herum: Andere Teams brachten ihre Änderungen in den Channel, um sie auf Performance prüfen zu lassen. Selbst neue Projekte wurden – dank all der eingeführten Leitplanken und Claude-Skills – unmerklich performanter geschrieben.

## Leitplanken

Auf dieses Tempo war das Team vorbereitet. Fast alles, was es anfasste, lag auf einem Hot Path – der erste Paint, der Composer, der Verlauf –, deshalb standen die Sicherheitsmechanismen von Anfang an:

- Jeder PR durchlief ein [automatisiertes Code-Review](https://claude.com/blog/code-review) und brauchte mindestens eine menschliche Freigabe.
- Unit-Tests kamen immer vor den Optimierungen.
- Alles, was ein für Nutzer sichtbares Problem verursachen konnte, wurde hinter einem kurzlebigen Feature-Flag ausgeliefert.

Als sich die Flags zu stapeln begannen, koordinierte ein eigener Thread ihr Ausrollen und Aufräumen. Claude ordnete jedes Flag als Kill Switch oder Ramp ein und entfernte es, sobald das gefahrlos möglich war. In den zwei Wochen entstanden **fast zweihundert Flags**, von denen am Ende schon mehr als die Hälfte wieder aufgeräumt war.

Dem Team war auch klar, dass Performance-Gewinne in einer schnell wachsenden Codebasis verfallen – und [bei Anthropic wird Code schnell ausgeliefert](https://claude.com/blog/agentic-coding-is-straining-ci-heres-how-we-scaled-test-impact-analysis-at-anthropic). Sobald ein Projekt seinen Nutzen bewiesen hatte, investierte das Team also in dessen Schutz. Der statische Composer etwa ist von Natur aus fragil: Nutzer sehen fast sofort eine HTML-Kopie der Seite, und React zeichnet direkt darüber.

> **Video-Zusammenfassung: statischer Composer, vorher und nachher (gedrosseltes 4G).** Vorher bleibt die Seite beim Kaltstart von claude.ai leer, und der Composer nimmt erst nach 2,93 Sekunden Eingaben an. Nachher nehmen eine statische Begrüßung und ein statischer Composer schon nach 0,36 Sekunden Eingaben an; der Nutzer tippt eine Nachricht, und der Text bleibt erhalten, wenn nach etwa 3 Sekunden der echte Composer eingeblendet wird.

Liegt das React-Rendering auch nur einen Pixel daneben, ist der Zauber dahin. Also baute Claude Dutzende Leitplanken:

- Das statische Markup entsteht, indem die echte React-Komponente in jsdom gerendert wird, und ein Test stellt sicher, dass beide nie auseinanderdriften.
- Eine Integrationstest-Suite vergleicht die statische Seite mit dem React-Rendering bei vierzehn Viewport-Größen und verlangt eine Ausrichtung auf 1 px genau.
- Ein Tastendruck-Test tippt ohne Pause durch die Übergabe hindurch und schlägt bei jeder verlorenen oder vertauschten Taste fehl.
- Im Feld meldet jede Übergabe Verschiebungen auf ein Zehntelpixel genau, und Claude öffnet für jedes Event mit einer Bewegung ungleich null einen Thread.

Nicht alles lässt sich im Labor abfangen, also setzte das Team auch auf die älteste Leitplanke überhaupt: schrittweise Rollouts. Riskante Änderungen gingen zuerst an Mitarbeitende, dann an ein Prozent der Nutzer, dann an alle. Vier Stunden nach dem internen Release des statischen Composers teilte ein Kollege eine Bildschirmaufnahme eines Layout-Shifts, den keine Kennzahl erfasste. Öffnete er claude.ai in einem neuen Tab, rutschte der Composer nach unten – doch schuld war nicht der Code des Teams.

> **Nachgestellt nach einer echten Unterhaltung — #claude-apps-perf**
>
> **Marius — 18:15 Uhr:** Ab und zu sehe ich einen kleineren (vielleicht 15–20 px) vertikalen Layout-Shift, der die Composer-Box nach unten schiebt, wenn ich claude.ai in einem neuen Tab öffne (beim Neuladen der Seite eher nicht). Ich kann nicht genau festmachen, woran es liegt, aber es ist da
>
> *(Bildschirmaufnahme · 0:02)*
>
> **ClaudeApp — 19:05 Uhr:** In deiner Aufnahme gefunden – das ist Chrome, das die Seite in der Größe ändert, nicht die Übergabe vom statischen an den echten Composer (die lag bei allen 49 deiner heutigen Ladevorgänge bei 0 px).

Irgendwie verfolgte Claude das Problem bis zu einem Grenzfall im [spekulativen Laden (Speculative Loading)](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Speculative_loading) von Chrome zurück. Während der Nutzer die URL noch in die Adressleiste tippte, renderte Chrome die Seite im Hintergrund vor – in der Höhe des aktuellen Tabs. In Browsern, die von einer Organisation verwaltet werden, ist die Neuer-Tab-Seite wegen einer Fußzeile etwas niedriger. Drückte der Nutzer Enter, zeigte der erste Frame von claude.ai dieses etwas niedrigere Layout, und Chrome passte die Größe rund eine Zehntelsekunde später an. Claude fixierte das Layout über die Größenänderung hinweg, und das Team ergänzte einen Test, der den Prerender-Ablauf simuliert.

## Steuern

Die Schleife war produktiv, aber nicht autonom. Sie schnell, sicher und auf Kurs zu halten, war Aufgabe der Menschen – und diese Aufgabe hatte drei Teile.

**Ehrgeiz.** Standardmäßig ist Claude beim Umfang vorsichtig. Es legt Tickets für Befunde an, äußert sich zurückhaltend zur Machbarkeit und plant in seinen Schätzungen Puffer ein. Doch das Team vertraute seinen Leitplanken. Ein Großteil der Arbeit bestand – gerade anfangs – darin, Claude zu mehr Mut zu ermuntern.

> **Nachgestellt nach einer echten Unterhaltung — #claude-apps-perf**
>
> **ClaudeApp — 15:32 Uhr:** Ja – ein kleiner PR, der Code dieselben Timing-Marker gibt, die Chat und Cowork schon haben. Ich stelle ihn diese Woche ein; realistisch wartet die Zahl für Code dann ein paar Tage auf Merge, Deployment und ein Baseline-Fenster.
>
> **Raymond — 15:32 Uhr:** wenn du ihn jetzt sofort einstellst, sorge ich dafür, dass er gemergt und deployt wird. wir können hier alles bewegen. sei bitte mutiger
>
> **ClaudeApp — 15:33 Uhr:** Bin dran – der PR ist innerhalb der nächsten Stunde da.

Als die gesetzten Ziele erreicht wurden, fiel auf, dass die Threads langsamer wurden. Sam ging von Thread zu Thread, immer mit derselben Botschaft: „Lasst uns das weiter nach unten drücken, die Ziele sind nicht die Ziellinie. Was kommt als Nächstes? Seid ehrgeizig.“

**Geschmack.** Jeder Thread hatte eine namentlich benannte verantwortliche Person, und Claude legte ihr jede für Nutzer wahrnehmbare Änderung mit Vorher-nachher-Screenshots oder -Aufnahmen zur Entscheidung vor. Soll sich eine Tabelle Zelle für Zelle füllen oder warten, bis jede Zeile vollständig ist? Soll ein Lade-Skeleton sofort erscheinen oder erst nach einer halben Sekunde? Ist ein wortweises Einblenden von gestreamtem Text das Fünftel des Frame-Budgets wert, das es kostet? Claude suchte nach Millisekunden, die sich einsparen ließen; die Menschen wogen die Kompromisse ab.

**Richtung.** Jeder Thread blieb bewusst eng gefasst, fokussiert auf einen Benchmark oder einen Pfad, und Claude sollte Verbesserungen nur innerhalb dieses Rahmens suchen. Das Team betrachtete die Threads als hundertfünfzig Hämmer auf der Suche nach Nägeln. Die meisten menschlichen Entscheidungen drehten sich um Reihenfolge und Nutzerwirkung: welche Oberflächen Vorrang haben, wie man Threads zusammenlegt, die sich in die Quere kommen, und wann man einen Thread schließt, der an abnehmenden Erträgen angelangt ist. Ein PR mit 900 Zeilen bekam eine einzeilige Antwort: „Ich entscheide: 2 ms pro Senden sind die Komplexität nicht wert, dieses Build-Plugin zu pflegen.“

## Ein Budget von 8 Millisekunden

Eine Nebenquest zeigt, wie all das ineinandergreift. Um eine Optimierung an einer Regex fürs Live-Syntax-Highlighting zu demonstrieren, hängte Claude eine Bildschirmaufnahme einer langen Antwort an, die im Labor gestreamt wurde. In der Ecke hatte es eine Bildraten-Anzeige ergänzt, die in der Seite aus Animation-Frame-Zeitstempeln berechnet wurde.

> **Nachgestellt nach einer echten Unterhaltung — #claude-apps-perf**
>
> **Raymond — 14:33 Uhr:** das ist eigentlich eine ziemlich geile bench. sind wir bei 60 fps *gedeckelt*? kannst du versuchen, die flüssigkeit von scrollen und streaming auf 120 zu bringen? wenn ich es richtig verstehe, unterstützt dein rig das vielleicht nicht
>
> **ClaudeApp — 14:34 Uhr:** Richtig, das aktuelle Rig tickt mit 60 Hz, weil Headless Chromium das standardmäßig tut. Ich glaube, man kann es mit 120 betreiben (ungedeckelter Vsync oder Frame-Steuerung über DevTools) – ich prüfe das zuerst und lasse die Auswertung dann mit einem Frame-Budget von 8,3 ms erneut laufen.
>
> **ClaudeApp — 14:59 Uhr:** Update zum 120-Hz-Rig: Es funktioniert. Deterministisches Frame-Stepping mit 120 Hz in Headless Chrome über die Begin-Frame-Steuerung der DevTools – exakt 240 Frames für 240 Begin-Frames bei 8,33 ms. Damit wird „Hat dieser Frame ins 120-Hz-Budget gepasst?“ zu einem exakten Messwert statt zu einem verrauschten.
>
> **Raymond — 15:05 Uhr:** großartig
>
> **Raymond — 15:05 Uhr:** leg los

Mit Mechanismus und Ehrgeiz an Ort und Stelle machte sich Claude an die Arbeit. Jeder gezeichnete Frame hatte ein Budget von 8,33 Millisekunden, also ging Claude eine lange Antwort *Frame für Frame* durch und maß jeden einzelnen, um die langsamen Stellen zu finden. Es eliminierte Arbeit in `O(Nachrichtenlänge)` pro Chunk, indem es fertige Blöcke memoisierte, verlagerte die Tokenisierung wachsender Code-Fences in einen Worker und ließ Tabellen Zelle für Zelle erscheinen.

Allein in diesem Thread wurden fast sechzig PRs gemergt. Lange Antworten blockieren den Main Thread jetzt insgesamt rund 200 Millisekunden statt rund 750, brauchen etwa ein Drittel der CPU und halten auf einem 120-Hz-MacBook von Anfang bis Ende 120 fps. Das 120-Hz-Rig selbst wurde zu einem nächtlichen Job, bei dem Claude nach Regressionen Ausschau hält.

> **Eingebetteter X-Post (Zusammenfassung):** „Lange Antworten von Claude im Web und auf dem Desktop streamen jetzt rund 4x flüssiger. Wir haben den Streaming-Renderer so umgebaut, dass er nur noch anfasst, was sich noch ändert: Auf einem langsameren Laptop stockt eine lange Antwort 9x seltener, ihr schlimmster Hänger ist 4,5x kürzer, und auf einem 120-Hz-MacBook hält sie von Anfang bis Ende 120 fps.“ — ClaudeDevs, 25. August 2026. [Beitrag auf X ansehen](https://x.com/ClaudeDevs/status/2092006814804214163).

Zu Beginn des Sprints hatte niemand vor, die Millisekunden zwischen den Frames beim Streaming zu optimieren. Doch es zeigte sich, dass man sie zählen *konnte* – und alles, was sich zählen lässt, kann Claude hinaufklettern.

## Wie es weitergeht

Heute sind claude.ai und die Desktop-App etwa dreimal schneller als Anfang August, und die Ratschen sollten dafür sorgen, dass das so bleibt. Fertig ist das Team aber nicht: Das 95. Perzentil, weitere Nutzerpfade und sehr lange Unterhaltungen haben noch Luft nach oben. In einem separaten Beitrag will das Team außerdem über einige Nebenquests berichten, die es während des Sprints upstream geführt haben – mit Beiträgen, die in Electron, Chromium, Node.js und weiteren Projekten gelandet sind.

Als die Ergebnisse intern vorgestellt wurden, brachte es Issac am besten auf den Punkt: „Selbst vor sechs Monaten hätte mich niemand davon überzeugen können, dass so etwas möglich ist.“ Das Team will so weiterarbeiten – einen Thread nach dem anderen, in jeder Größenordnung. Der Channel läuft weiter.

*Mit Beiträgen von Alfred Xing, Anthony Morris, Benjamin Pasero, Chase McCoy, Joshua N., Luke Deen Taylor, Marius Schulz und Shelley Vohr. Besonderer Dank an Boris Cherny, der das Team ermutigt hat, ehrgeiziger zu sein.*
