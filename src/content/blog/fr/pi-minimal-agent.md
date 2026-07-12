---
translationKey: "pi-minimal-agent"
locale: "fr"
title: "Pi : l'agent minimal au cœur d'OpenClaw"
description: "Une adaptation structurée de la présentation de Pi par Armin Ronacher, consacrée à son noyau réduit, à ses sessions extensibles et à sa philosophie du logiciel qui construit du logiciel."
publishedAt: "2026-01-31"
updatedAt: "2026-01-31"
category: "architecture"
sourceLocale: "en"
sourceUrl: "https://lucumr.pocoo.org/2026/1/31/pi/"
sourceAuthor: "Armin Ronacher"
contentType: "adaptation"
translationStatus: "reviewed"
---

<div class="blog-article-body">

*Écrit le 31 janvier 2026*

OpenClaw est devenu viral sous plusieurs noms, dont ClawdBot et MoltBot. Fondamentalement, il s'agit d'un agent IA connecté à un canal de communication et capable d'exécuter du code.

Sous le capot, OpenClaw utilise un petit agent de programmation nommé **Pi**. Armin Ronacher présente Pi comme l'agent de programmation qu'il emploie désormais presque exclusivement et explique pourquoi sa conception volontairement minimale est si convaincante.

Pi a été créé par **Mario Zechner**. L'approche pragmatique de Mario diffère de la « science-fiction avec une touche de folie » de Peter, mais Pi et OpenClaw partagent le même principe : les LLM excellent dans l'écriture et l'exécution de code, le système doit donc exploiter pleinement cette capacité.

## Qu'est-ce que Pi ?

Pi est l'un des nombreux agents de programmation existants, mais deux caractéristiques le distinguent. Armin cite également **AMP**, un autre produit qui semble avoir été façonné par des personnes ayant véritablement expérimenté la programmation agentique, plutôt que de l'avoir simplement enveloppée dans une interface soignée.

Pi est intéressant pour deux raisons principales :

- **Son noyau est minuscule.** Son prompt système est exceptionnellement court et le noyau n'expose que quatre outils : Read, Write, Edit et Bash.
- **Son système d'extensions est puissant.** Les extensions peuvent ajouter des comportements et conserver leur propre état dans les sessions.

Il présente aussi un avantage pratique : Pi est écrit comme un logiciel conçu avec soin. Il est stable, peu gourmand en mémoire et ne distrait pas l'utilisateur par des clignotements ou des défaillances aléatoires.

Pi est également un ensemble de petits composants permettant de construire d'autres agents. OpenClaw repose sur ces composants ; Armin les a utilisés pour un bot Telegram et Mario pour créer `mom`. En donnant à Pi accès à son propre code et à un exemple comme `mom`, il peut aider à assembler un nouvel agent autour de l'intégration recherchée.

## Ce que Pi n'intègre pas

Comprendre Pi suppose aussi de comprendre ce qui en est délibérément absent. Son noyau ne comporte **aucune prise en charge native de MCP**. Cela ne rend pas MCP inaccessible : une extension peut l'ajouter, ou un agent peut utiliser **mcporter**, qui expose les appels MCP au moyen d'une CLI ou de liaisons TypeScript.

Cette absence reflète la philosophie de Pi. Lorsqu'une capacité manque à l'agent, le réflexe par défaut n'est pas de chercher une extension prête à l'emploi sur une marketplace. Il consiste à demander à l'agent de s'étendre lui-même en écrivant et en exécutant du code.

Le téléchargement d'extensions reste possible. La différence est surtout culturelle : une extension existante peut être utilisée comme référence, puis remaniée par l'agent selon les besoins locaux, plutôt que comme une dépendance immuable.

## Des agents conçus pour des agents qui construisent des agents

Un logiciel destiné à se transformer lui-même a besoin de quelques capacités fondamentales.

Premièrement, l'AI SDK de Pi permet à une session de contenir des messages provenant de différents fournisseurs de modèles. Il reconnaît que les sessions ne sont pas parfaitement portables, tout en évitant de dépendre inutilement de fonctionnalités propres à un fournisseur.

Deuxièmement, les fichiers de session peuvent contenir des messages personnalisés en plus des messages du modèle. Les extensions peuvent s'en servir pour conserver leur état, et le système peut décider que certaines de ces informations ne seront jamais transmises au modèle ou ne le seront qu'en partie.

Troisièmement, l'état des extensions peut être enregistré sur disque et les extensions prennent en charge le rechargement à chaud. Un agent peut écrire une extension, la recharger, la tester et poursuivre ses itérations. Quatrièmement, Pi fournit une documentation et des exemples que l'agent peut lire lorsqu'il s'étend lui-même. Cinquièmement, les sessions sont des arbres : l'utilisateur peut créer une branche pour une tâche annexe, réparer un outil défaillant sans consommer le contexte de la branche principale, puis revenir en arrière tandis que Pi résume ce qui s'est produit sur l'autre branche.

Ces choix ont aussi des conséquences sur les outils. Chez de nombreux fournisseurs de modèles, les outils MCP et les autres outils destinés au LLM sont chargés dans le contexte système ou la section des outils au début de la session. Remplacer ensuite l'intégralité de leurs définitions peut détruire le cache ou laisser au modèle des souvenirs contradictoires sur la manière dont les appels précédents fonctionnaient.

## Des capacités hors du contexte du modèle

Une extension Pi peut déclarer un outil que le LLM peut appeler, et Armin utilise parfois cette possibilité. Son outil local de suivi des issues en est un exemple : comme l'agent doit gérer directement les tâches à accomplir, il expose un outil supplémentaire plutôt qu'une CLI. C'est actuellement le seul outil additionnel qu'il charge dans le contexte du modèle.

La plupart des capacités ajoutées n'ont pas besoin d'occuper le contexte du modèle sous forme de schémas d'outils. Il s'agit de skills ou d'extensions TUI qui améliorent le workflow humain. Les extensions Pi peuvent afficher directement dans le terminal des indicateurs d'activité, des barres de progression, des sélecteurs de fichiers, des tableaux et des volets d'aperçu. Mario a même fait tourner Doom dans la TUI : ce n'est pas pratique, mais cela démontre utilement la souplesse de l'interface.

Les extensions suivantes sont des exemples, et non un ensemble figé. Le workflow prévu consiste à en montrer une à l'agent et à lui demander d'en remanier le comportement.

### `/answer`

Armin n'utilise pas le Plan Mode. Il préfère un échange productif dans la prose naturelle de l'agent, où explications et schémas s'entremêlent, plutôt qu'un dialogue rigide fondé sur des questions structurées.

Les questions insérées dans le fil peuvent devenir difficiles à traiter proprement. `/answer` lit donc la dernière réponse de l'agent, en extrait les questions et les reformate dans une zone de saisie ciblée.

![/answer affichant une boîte de dialogue de questions](https://lucumr.pocoo.org/static/pi-answer.png)

### `/todos`

Bien qu'Armin critique l'implémentation de Beads, il juge utiles les listes de tâches pour agents. `/todos` ouvre sous forme de fichiers Markdown les éléments stockés dans `.pi/todos`. L'utilisateur comme l'agent peuvent les modifier, et une session peut s'attribuer une tâche afin de la marquer comme en cours.

### `/review`

À mesure que les agents écrivent davantage de code, les travaux inachevés devraient être examinés par un agent avant d'être transmis à une personne. Comme les sessions Pi sont des arbres, Armin peut créer une branche dans un nouveau contexte de revue, recueillir les constats, puis réintégrer les corrections dans la session principale.

![/review affichant les options prédéfinies de revue](https://lucumr.pocoo.org/static/pi-review.png)

L'interface s'inspire de Codex et prend en charge plusieurs cibles de revue : commits, diffs, modifications non validées et pull requests distantes. Le prompt de revue insiste sur les retours auxquels Armin accorde de l'importance, notamment le signalement explicite des nouvelles dépendances.

### `/control`

Cette extension est expérimentale et ne fait pas partie du workflow quotidien d'Armin. Elle permet à un agent Pi d'envoyer des prompts à un autre, créant ainsi une petite configuration multi-agents sans couche d'orchestration complexe.

### `/files`

Cette extension répertorie les fichiers modifiés ou référencés dans la session. Ils peuvent être affichés dans Finder, comparés dans VS Code, ouverts avec Quick Look ou référencés dans un prompt. `shift+ctrl+r` affiche rapidement avec Quick Look le dernier fichier mentionné, ce qui est pratique lorsqu'un agent produit un PDF.

D'autres développeurs ont également créé des extensions, dont l'extension de sous-agent de Nico et `interactive-shell`, qui permet à Pi d'exécuter de manière autonome des CLI interactives dans une surcouche TUI dont l'activité reste observable.

## Le logiciel qui construit du logiciel

L'idée centrale est qu'Armin n'a pas écrit ces extensions à la main. Il a décrit ce qu'il voulait, et Pi les a construites. Le noyau de Pi ne contient ni MCP ni skills communautaires préinstallés, mais l'agent peut créer et maintenir des capacités adaptées à son propriétaire. Il peut, par exemple, remplacer des CLI d'automatisation du navigateur ou des intégrations MCP par un skill qui communique directement avec CDP.

Son agent possède de nombreux skills, mais ils sont jetables. Certains lisent les sessions Pi partagées par d'autres ingénieurs pour faciliter la revue de code ; d'autres encadrent les messages de commit, le comportement de commit ou les mises à jour du changelog. Armin transfère aussi certaines anciennes slash commands vers des skills et associe un skill qui encourage l'utilisation de `uv` à une extension qui redirige les appels à `pip` et `python` vers `uv`.

C'est tout l'intérêt d'un agent minimal comme Pi : il fait du logiciel qui construit du logiciel un mode de travail ordinaire. OpenClaw pousse l'idée plus loin en supprimant l'interface locale et en connectant l'agent directement au chat. Armin ne conclut pas que tous les détails sont réglés, mais que cette direction ressemble de plus en plus à une composante de l'avenir du logiciel.

</div>
