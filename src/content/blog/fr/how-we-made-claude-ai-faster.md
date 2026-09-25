---
translationKey: "how-we-made-claude-ai-faster"
locale: "fr"
title: "Comment nous avons rendu claude.ai 3 fois plus rapide en deux semaines"
description: "Un sprint performance de deux semaines, mené depuis un seul canal Slack : Claude a traqué les goulots d'étranglement, construit des benchmarks et livré plus de 3 000 changements, rendant claude.ai et l'application de bureau environ 3 fois plus rapides. La leçon centrale : dès que Claude peut mesurer quelque chose, il peut l'accélérer."
publishedAt: "2026-09-23"
updatedAt: "2026-09-23"
category: "development"
sourceLocale: "en"
sourceUrl: "https://claude.dev/blog/how-we-made-claude-ai-faster/"
sourceAuthor: "Raymond Wang, Sam Attard, and Issac G."
contentType: "translation"
translationStatus: "reviewed"
---

> Cet article est adapté de [How we made claude.ai 3x faster in two weeks](https://claude.dev/blog/how-we-made-claude-ai-faster/), de Raymond Wang, Sam Attard et Issac G., publié le 23 septembre 2026. Les graphiques et vidéos de l'original sont résumés en texte ; les échanges Slack sont, comme dans la source, des reconstitutions de conversations réelles.

Dès que Claude peut mesurer quelque chose, il peut l'accélérer. L'équipe n'a donc cessé de chercher de nouvelles choses à mesurer. Voici le récit d'un sprint performance de deux semaines, et de la boucle de travail qui a permis à une poignée d'ingénieurs et à Claude de livrer plus de trois mille changements sans le moindre incident visible par les utilisateurs.

## Introduction

En août dernier, l'équipe a rendu l'expérience principale de claude.ai et de l'application de bureau Claude environ 3 fois plus rapide, en un sprint de deux semaines. Les utilisateurs se plaignaient de la lenteur, et ils avaient raison. Tout a été piloté depuis un unique canal Slack, avec Claude dans chaque fil de discussion.

L'équipe s'est concentrée sur quatre parcours qui représentent 95 % de l'activité des utilisateurs. Au 75ᵉ centile (p75) :

- Le temps nécessaire pour obtenir une page où l'on peut taper, lors d'un chargement à froid de claude.ai, est passé de **3,1 secondes à 0,55**.
- Le démarrage d'une nouvelle session Claude Code est passé de **0,8 seconde à 0,3**.
- Le chargement d'une session cloud Claude Cowork est passé de **2,6 secondes à 0,73**.

Au total, l'équipe estime que cela épargne chaque jour des dizaines de milliers d'heures d'attente aux utilisateurs.

> **Résumé du graphique : treize mesures avant/après au p75 d'utilisateurs réels (13 août vs 27 août).**
>
> - **Lancer l'application :** chargement à froid de claude.ai sur le web 3 085 → 550 ms (5,6x, −82 %) ; démarrage à froid sur le bureau 6 310 → 3 328 ms (1,9x, −47 %).
> - **Démarrer une conversation :** Chat web 416 → 273 ms (1,5x) ; Chat bureau 460 → 224 ms (2,1x) ; Claude Code bureau 837 → 347 ms (2,4x).
> - **Charger une conversation :** Chat web 1 557 → 646 ms (2,4x) ; Chat bureau 1 353 → 488 ms (2,8x) ; Claude Cowork bureau/cloud 2 566 → 728 ms (3,5x) ; Claude Code bureau 545 → 262 ms (2,1x).
> - **Envoyer un message :** Chat web 180 → 59 ms (3,1x) ; Chat bureau 140 → 64 ms (2,2x) ; Claude Cowork bureau/cloud 928 → 48 ms (19x, −95 %) ; Claude Code bureau 250 → 52 ms (4,8x).
>
> Sur treize mesures et quatre parcours, le gain moyen est de 3,1x (moyenne géométrique).

Le travail s'est appuyé sur [Claude Tag](https://claude.com/product/tag) (bêta), avec en coulisses un modèle de recherche interne à peu près comparable à Opus 5.5. Claude trouvait les goulots d'étranglement, construisait les benchmarks, livrait les améliorations et surveillait chaque déploiement. Les humains tenaient la barre : ils fixaient les objectifs, arbitraient les compromis et approuvaient chaque changement. Résultat : plus de trois mille changements fusionnés, sans un seul incident client ni retour arrière.

## Le cahier des charges

Avant le sprint, l'équipe a créé un canal Slack assorti des [instructions permanentes](https://claude.com/docs/claude-tag/users/getting-started#give-claude-standing-instructions) suivantes :

> **@Claude** Ton rôle est de prendre en charge tout ce qui touche aux performances du site claude.ai et de l'application de bureau. Tes responsabilités : surveiller chaque déploiement pour détecter les régressions de performance, évaluer l'exactitude et l'exhaustivité de la télémétrie existante, tenir à jour des tableaux de bord d'observabilité bien organisés, mettre en œuvre de ta propre initiative des solutions aux problèmes observés et aux gains faciles, proposer des projets d'optimisation, et communiquer avec tes coéquipiers humains. […]
>
> Le but ultime de ce canal est que tu deviennes aussi autonome que possible, mais nous savons qu'aujourd'hui, ce n'est pas encore possible.

Claude a analysé les données d'usage via le serveur MCP de Datadog et identifié les quatre parcours au plus fort impact : lancer l'application, démarrer une conversation, charger une conversation existante et envoyer un message. Entre le web et le bureau, et à travers les différents produits, cela représentait treize mesures distinctes. Pour établir des références, l'équipe a ajouté de l'instrumentation jusqu'à ce qu'elles soient directement comparables : chacune commençait par une interaction utilisateur, se terminait une fois le résultat affiché, et distinguait le travail côté client du travail côté serveur.

Le sprint a démarré avec une liste d'une vingtaine de projets choisis à la main, chacun ciblant un parcours précis. Claude a estimé l'impact de chacun en millisecondes, et ces estimations cumulées ont servi à fixer les objectifs du sprint. Certains projets étaient assez lourds, mais l'équipe pensait pouvoir boucler l'essentiel en deux semaines.

**Douze des treize objectifs étaient atteints dès le troisième jour.**

Les projets prévus ont abouti en avance :

- **Des lancements plus rapides :** un compositeur (le champ de saisie) statique intégré directement dans le HTML, pour que l'utilisateur puisse taper pendant l'initialisation de React, et un cache de code V8 précompilé, pour que le processus principal de l'application de bureau n'ait plus à tout recompiler.
- **Des navigations plus rapides :** le compositeur reste monté d'une conversation à l'autre, les sessions sont préchargées dès que l'utilisateur les survole, et les rendus de la barre latérale ont chuté de 90 %.

L'équipe avait aussi laissé de la place à Claude pour repérer des opportunités et proposer de nouveaux chantiers. Ceux-ci sont vite devenus des projets à part entière, qui ont largement dépassé les objectifs initiaux. L'équipe a donc fixé de nouveaux objectifs, puis s'est mise en quête d'autres choses à mesurer :

> **@Claude** on a fini par financer presque tous les projets de la liste initiale, et même plus. faisons le point […] qu'est-ce qu'on n'a pas encore exploré, sur quoi peut-on faire du hill climbing, où est la plus grosse opportunité maintenant ? […] je suis ouvert aux idées DÉJANTÉES

## Tout peut s'optimiser par petits pas

Dès le départ, l'équipe voulait itérer plus vite que le rythme des déploiements. Claude pouvait travailler en asynchrone pendant des heures, voire toute la nuit, et devait pouvoir valider ses prototypes sans attendre les données de production. Il fallait donc trouver d'autres façons de mesurer la performance en laboratoire.

C'est Sam qui a trouvé la première piste :

> **Reconstitution d'une conversation réelle — #claude-apps-perf**
>
> **Sam — 12 h 34 :** Qu'est-ce qu'on peut mesurer à la place du temps réel ? On pourrait compter les instructions JS, par exemple ?
>
> **ClaudeApp — 12 h 42 :** Pour les chemins navigateur, Chromium ne permet pas de compter les instructions, mais il existe toute une gamme d'autres compteurs déterministes : commits React par interaction, nombre d'appels de fonctions via la couverture précise de V8, nombre de recalculs de layout et de styles, mutations du DOM. Par lequel veux-tu commencer ?
>
> **Sam — 12 h 49 :** On explore valgrind + `Ir` + `--predictable` dans un fil, et chacun des benchs navigateur/React dans un nouveau fil. Mentionne-moi partout. Tu sais ce qu'on veut. C'est parti

Onze minutes plus tard, cinq fils tournaient, chacun consacré à une mesure : nombre d'instructions, appels V8, commits React, recalculs de styles et mutations du DOM.

Chaque nouveau benchmark était accueilli avec un certain scepticisme. Il avait deux missions : d'abord, être une métrique que Claude pouvait faire bouger en labo ; ensuite, devenir un garde-fou en CI, avec un chiffre qui ne pouvait que descendre (un « cliquet »). Si un benchmark était instable, ou s'il n'était pas réellement corrélé à la latence ressentie, on le jetait plutôt que de laisser Claude gravir la mauvaise colline.

> **@Claude** merci de prouver que l'optimisation sur chacun de ces indicateurs produit des gains mesurables en temps réel. on retirera les benchs de tous les candidats qui ne peuvent pas le prouver

Le temps réel (wall-clock), c'est ce que ressentent les utilisateurs, mais il est bruité, et les millisecondes fluctuent trop pour servir de barrière en CI. Le nombre d'instructions, lui, est déterministe, ce qui le rendait séduisant ; encore fallait-il que Claude prouve qu'il suivait bien le temps réel.

L'équipe a donc demandé à Claude de faire baisser ce compteur sur deux chemins critiques : la routine qui assemble l'arbre des messages d'une conversation, et un analyseur qui repère les lignes de statut dans la sortie de Claude Code. En profilant les deux avec Valgrind, Claude a découvert qu'un quart des instructions du premier chemin étaient des recherches mégamorphiques dans un dictionnaire, qui résolvaient trois fois le même identifiant de message.

Une heure plus tard, il avait réduit les instructions de 48 % et 31 % sur les deux chemins, et le temps réel avait baissé de 78 % et 44 %. Deux nouveaux cliquets ont été intégrés : désormais, toute PR qui augmentait le nombre d'instructions de ces chemins échouait en CI, et une tâche quotidienne abaissait chaque plafond dès que le compteur diminuait.

> **Résumé du graphique : deux chemins critiques, avant et après.**
>
> - **Assemblage de l'arbre des messages :** chaque identifiant de message résolu une fois au lieu de trois ; instructions CPU −48 %, temps réel −78 %, 4,6x plus rapide.
> - **Analyseur de lignes de statut :** un test peu coûteux sur le premier caractère avant l'expression régulière ; instructions CPU −31 %, temps réel −44 %, 1,8x plus rapide.
>
> Comptages réalisés sous Valgrind avec `node --predictable` ; chronométrages sur le même benchmark avec node standard et JIT préchauffé.

C'est de là qu'est née la leçon centrale du sprint : **avec Claude, mesurer quelque chose, c'est le rendre soluble.**

Autrefois, la mesure était l'étape zéro : on ajoutait une métrique, on attendait que les données arrivent, et alors seulement on commençait à comprendre le problème. Avec Claude, c'est la première marche de l'ascension. Dès que Claude a un chiffre à battre, il peut se mettre à optimiser. Le levier le plus puissant pour l'équipe consistait donc à trouver toujours plus de choses à mesurer.

## La boucle, fil après fil

Tout se passait dans le même canal Slack, avec plusieurs ingénieurs et Claude qui improvisaient ensemble dans chaque fil. Le sprint s'est rapidement organisé autour d'une [boucle](https://claude.com/blog/getting-started-with-loops) :

1. Quelqu'un ouvre un fil sur un passage lent d'un parcours, souvent avec une capture ou un enregistrement d'écran.
2. Claude retrace le flux, puis trouve ou construit un benchmark qui met le problème en évidence.
3. Une fois un résultat prometteur obtenu en labo, Claude revient avec une PR — souvent plusieurs, découpées selon le risque et la facilité de relecture, avec tout ce qui est visible par l'utilisateur derrière un flag.
4. Après la mise en production, Claude surveille le déploiement et lit les données terrain par build et par plateforme.
5. Si c'est plus rapide, Claude verrouille le gain en resserrant le cliquet du benchmark ; sinon, il désactive le flag et itère.
6. Puis il part à la recherche du prochain point lent sur le même parcours.

Un exemple : quelqu'un a partagé un enregistrement d'écran montrant les lignes de la barre latérale qui surgissaient après le chargement de la page. Les lignes Chat et Cowork se résolvaient à des moments différents, ce qui donnait une impression de saccade. Aucun des moniteurs existants ne le détectait. Le plus proche était le [Cumulative Layout Shift](https://web.dev/articles/cls) (CLS), mais chaque décalage ne pesait qu'environ 0,008 — bien en deçà du seuil « bon » de 0,1.

Issac a eu l'idée de s'appuyer directement sur l'[API Layout Instability](https://wicg.github.io/layout-instability/) sous-jacente. Claude a créé un événement de télémétrie qui associait les `sources` de chaque entrée `layout-shift` à une zone nommée (barre latérale, transcription…) et à une phase (avant le premier rendu, après que la page est utilisable…). Il a ajouté un test d'intégration qui ouvrait la page avec une barre latérale remplie, retenait les données de celle-ci jusqu'après le premier rendu, et échouait au moindre décalage dans une zone nommée. Ce test a servi de benchmark pour prouver le correctif : rouge 20 fois sur 20 sur main, vert 20 fois sur 20 sur la PR.

Une fois l'événement déployé, Claude a lu les données terrain et constaté que **31 % des chargements de page web déplaçaient quelque chose après que la page était devenue utilisable**, sans aucune interaction de l'utilisateur. Il a ensuite traité les causes une par une : une ligne d'en-tête qui arrivait en retard, un curseur qui glissait sur le côté une fois le nom de l'utilisateur chargé, une liste qui bougeait à l'apparition de la barre de défilement. Il a corrigé les principaux coupables d'un seul coup, puis, une fois ceux-ci éliminés, il a trouvé la série suivante.

> **Résumé de la vidéo : saccades de la barre latérale, avant et après (4G bridée).** Avant, les lignes arrivent en retard et se réorganisent : dix lignes sautent, neuf apparaissent et quatre disparaissent. Après, les lignes se remplissent directement à leur place définitive, et plus rien ne bouge.

Ce n'était qu'un fil. Pendant le sprint, plus de cent cinquante tournaient en même temps.

## Passer à l'échelle horizontalement

Une fois la boucle rodée sur un fil, il suffisait d'en ouvrir d'autres pour la démultiplier. Au lieu de clore un fil une fois la demande initiale satisfaite, Claude *continuait*. Un seul fil pouvait produire cinquante, parfois cent PR d'optimisation. De plus en plus souvent, c'était Claude, et non un humain, qui ouvrait de nouveaux fils pour poursuivre des pistes découvertes par lui-même, au détour d'une autre enquête ou d'une tâche nocturne. Shelley, l'une des ingénieures du canal, a résumé : « [Ce modèle] est un démon des chiffres. »

Chaque mesure révélait quelque chose à améliorer :

- Un recensement des hooks React a mis au jour **6 900 hooks et 900 abonnements au store** sur le chemin de saisie du compositeur, qui se re-rendaient à chaque frappe.
- Le comptage des recalculs de styles a révélé qu'un unique sélecteur `:root:has()` ajoutait **24 millisecondes à chaque modification du DOM**.
- Le traçage des chemins de code après le premier rendu a débusqué un `location.reload()` oublié, responsable d'**un demi-million de rechargements invisibles par jour** qu'aucune métrique de chargement ne voyait.
- L'analyse d'échantillons du profileur sur des onglets inactifs a montré que des instantanés de cache identiques étaient copiés dans IndexedDB deux fois par minute, entièrement sur le thread principal.

On savait rarement où un fil allait mener. En traquant les à-coups du CPU, Claude a remarqué que la coloration syntaxique d'un bloc de code terminé pouvait figer la page pendant près d'une seconde. En creusant en labo, il a trouvé le coupable : le tiret cadratin. Si le markdown d'une réponse contenait le moindre caractère hors Latin-1, comme un tiret cadratin ou un guillemet typographique, V8 stockait toute la chaîne en UTF-16, ce qui envoyait chaque expression régulière de coloration sur son chemin lent à deux octets. Le correctif tenait en vingt lignes : copier chaque bloc de code dans une chaîne à un octet avant de le colorer.

> **Résumé du graphique : coloration d'un bloc de code terminé dans une réponse contenant un tiret cadratin (mesure en labo).** Pour le premier bloc TypeScript de la page, le temps sur le thread principal passe de 1,0 s à 0,35 s (−65 %), et chaque passage ultérieur sur ce bloc de 100 ms à 40 ms. Conditions : conteneur à 4 vCPU, Chrome headless, sans bridage du CPU, 2 à 3 exécutions par valeur, août 2026.

Dès la deuxième semaine, la production était telle qu'on avait du mal à la résumer dans les points quotidiens. Les jours les plus chargés, plus de deux cents changements étaient fusionnés. Claude ne cessait de proposer de nouveaux benchmarks ; environ un tiers des PR ajoutaient de la télémétrie ou des garde-fous, et chaque nouvel instrument engendrait d'autres fils et d'autres opportunités.

Travailler dans un seul canal signifiait que tout se faisait au grand jour. Chacun passait d'un fil à l'autre pour débattre des décisions et célébrer les victoires. Le bouche-à-oreille a fait son œuvre : d'autres équipes ont commencé à apporter leurs propres changements dans le canal pour les faire relire sous l'angle de la performance. Même les nouveaux projets étaient écrits de manière subtilement plus performante, grâce à tous les garde-fous et à toutes les skills Claude mis en place.

## Les garde-fous

L'équipe s'était préparée à ce rythme. Presque tout ce qu'elle touchait relevait d'un chemin critique — le premier rendu, le compositeur, la transcription —, si bien que les mécanismes de sécurité avaient été posés d'emblée :

- Chaque PR passait par une [revue de code automatisée](https://claude.com/blog/code-review) et au moins une approbation humaine.
- Les tests unitaires venaient toujours avant les optimisations.
- Tout ce qui pouvait provoquer un problème visible par l'utilisateur était livré derrière un feature flag à durée de vie courte.

Quand les flags ont commencé à s'accumuler, un fil dédié a coordonné leurs déploiements et leur nettoyage. Claude a classé chaque flag comme coupe-circuit (kill switch) ou déploiement progressif (ramp), et retiré chacun dès que c'était sans risque. En deux semaines, **près de deux cents flags** ont été créés, et plus de la moitié avaient déjà été nettoyés à la fin du sprint.

L'équipe savait aussi que les gains de performance s'érodent dans une base de code qui évolue vite — et [chez Anthropic, le code est livré à grande vitesse](https://claude.com/blog/agentic-coding-is-straining-ci-heres-how-we-scaled-test-impact-analysis-at-anthropic). Une fois qu'un projet avait prouvé son gain, elle investissait donc pour le protéger. Le compositeur statique, par exemple, est fragile par conception : l'utilisateur voit presque immédiatement une copie HTML de la page, et React vient peindre directement par-dessus.

> **Résumé de la vidéo : compositeur statique, avant et après (4G bridée).** Avant, lors d'un chargement à froid de claude.ai, la page reste blanche et le compositeur n'accepte la saisie qu'à 2,93 secondes. Après, un message d'accueil et un compositeur statiques acceptent la saisie dès 0,36 seconde ; l'utilisateur tape un message, et le texte est conservé lorsque le vrai compositeur apparaît en fondu, vers 3 secondes.

Si le rendu React est décalé ne serait-ce que d'un pixel, la magie disparaît. Claude a donc construit des dizaines de garde-fous :

- Le balisage statique est généré en rendant le vrai composant React dans jsdom, et un test garantit que les deux ne divergent jamais.
- Une suite de tests d'intégration compare la page statique au rendu React sur quatorze tailles de viewport, et exige un alignement à 1 px près.
- Un test de frappe continue de taper pendant toute la transition et échoue à la moindre touche perdue ou désordonnée.
- En production, chaque transition remonte les décalages au dixième de pixel près, et Claude ouvre un fil pour tout événement présentant un mouvement non nul.

Tout ne peut pas être détecté en labo ; l'équipe a donc aussi recouru au plus vieux garde-fou qui soit : le déploiement progressif. Les changements à risque étaient d'abord proposés aux employés, puis à 1 % des utilisateurs, puis à tout le monde. Quatre heures après la mise en service interne du compositeur statique, un collègue a partagé l'enregistrement d'un décalage de mise en page qu'aucune métrique ne voyait. Quand il ouvrait claude.ai dans un nouvel onglet, le compositeur descendait d'un cran — mais ce n'était pas le code de l'équipe.

> **Reconstitution d'une conversation réelle — #claude-apps-perf**
>
> **Marius — 18 h 15 :** De temps en temps, je vois un petit décalage vertical (peut-être 15–20 px) qui pousse le compositeur vers le bas quand j'ouvre claude.ai dans un nouvel onglet (moins quand je recharge la page). Je n'arrive pas à identifier exactement ce qui le provoque, mais il est bien là
>
> *(Enregistrement d'écran · 0:02)*
>
> **ClaudeApp — 19 h 05 :** Trouvé dans ton enregistrement : c'est Chrome qui redimensionne la page, pas la transition entre le compositeur statique et le vrai (celle-ci a mesuré 0 px sur tes 49 chargements d'aujourd'hui).

On ne sait trop comment, Claude a remonté la piste jusqu'à un cas limite du [chargement spéculatif](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Speculative_loading) de Chrome. Pendant que l'utilisateur tapait encore l'URL dans la barre d'adresse, Chrome pré-rendait la page en arrière-plan, à la hauteur de l'onglet courant. Sur les navigateurs gérés par une organisation, la page Nouvel onglet est légèrement plus courte à cause d'un pied de page. Quand l'utilisateur appuyait sur Entrée, la première image de claude.ai affichait cette mise en page un peu plus courte, et Chrome la redimensionnait environ un dixième de seconde plus tard. Claude a figé la mise en page pendant le redimensionnement, et l'équipe a ajouté un test simulant le flux de pré-rendu.

## Tenir la barre

La boucle était productive, mais elle n'était pas autonome. La garder rapide, sûre et sur les rails, c'était le travail des humains, et ce travail comportait trois volets.

**L'ambition.** Par défaut, Claude est prudent quant au périmètre. Il consigne ses découvertes dans des tickets, reste évasif sur la faisabilité et gonfle ses estimations. Mais l'équipe avait confiance dans ses garde-fous. Une bonne partie du travail, surtout au début, a consisté à encourager Claude à oser davantage.

> **Reconstitution d'une conversation réelle — #claude-apps-perf**
>
> **ClaudeApp — 15 h 32 :** Oui — une petite PR pour donner à Code les mêmes marqueurs de temps que Chat et Cowork ont déjà. Je la publie cette semaine ; en pratique, le chiffre de Code devra attendre quelques jours le temps du merge, du déploiement et d'une fenêtre de référence.
>
> **Raymond — 15 h 32 :** si tu la publies tout de suite, je la fais fusionner et déployer. on a le pouvoir de tout faire. sois plus audacieux, s'il te plaît
>
> **ClaudeApp — 15 h 33 :** Je m'en occupe — la PR sera en ligne d'ici une heure.

Lorsque les objectifs fixés ont commencé à être atteints, l'équipe a remarqué que les fils ralentissaient. Sam est passé de fil en fil avec le même message : « Continuons à faire baisser ça, les objectifs ne sont pas une ligne d'arrivée. Quelle est la suite ? Soyons ambitieux. »

**Le goût.** Chaque fil avait un responsable humain désigné, et Claude signalait tout changement perceptible par l'utilisateur avec des captures ou enregistrements avant/après, pour qu'il tranche. Un tableau doit-il se remplir cellule par cellule, ou attendre que chaque ligne soit complète ? Un squelette de chargement doit-il apparaître immédiatement, ou seulement au bout d'une demi-seconde ? Un fondu mot par mot sur le texte en streaming vaut-il le cinquième du budget d'image qu'il consomme ? Claude cherchait les millisecondes à gratter ; les humains pesaient les compromis.

**La direction.** Chaque fil restait volontairement étroit, centré sur un benchmark ou un parcours, et Claude n'y cherchait des améliorations que dans ce périmètre. L'équipe voyait les fils comme cent cinquante marteaux en quête de clous. La plupart des arbitrages humains portaient sur l'ordonnancement et l'impact utilisateur : quelles surfaces prioriser, comment fusionner des fils qui se marchaient sur les pieds, quand fermer un fil arrivé au stade des rendements décroissants. Une PR de 900 lignes a reçu une réponse d'une seule ligne : « je tranche : 2 ms par envoi ne valent pas la complexité de maintenir ce plugin de build. »

## Un budget de 8 millisecondes

Une quête annexe montre comment tout cela s'imbrique. Pour illustrer l'optimisation d'une expression régulière utilisée dans la coloration syntaxique en direct, Claude a joint l'enregistrement d'une longue réponse en streaming dans le labo. Dans un coin, il avait ajouté un compteur d'images par seconde, calculé dans la page à partir des horodatages d'animation frame.

> **Reconstitution d'une conversation réelle — #claude-apps-perf**
>
> **Raymond — 14 h 33 :** en fait, c'est un bench plutôt génial. on est *plafonnés* à 60 fps ? tu peux essayer de pousser la fluidité du défilement et du streaming à 120 ? si je comprends bien, ton banc de test ne le permet peut-être pas
>
> **ClaudeApp — 14 h 34 :** Exact, le banc tourne aujourd'hui à 60 Hz parce que c'est le réglage par défaut de Chromium headless. Je pense qu'on peut le piloter à 120 (vsync débridé ou contrôle des frames via DevTools) — je vérifie d'abord, puis je relance l'évaluation avec un budget de 8,3 ms par image.
>
> **ClaudeApp — 14 h 59 :** Point sur le banc à 120 Hz : ça marche. Avancée image par image déterministe à 120 Hz dans Chrome headless grâce au contrôle begin-frame de DevTools — exactement 240 images pour 240 begin-frames à 8,33 ms. « Cette image a-t-elle tenu dans le budget de 120 Hz ? » devient donc une lecture exacte, et non plus une estimation bruitée.
>
> **Raymond — 15 h 05 :** génial
>
> **Raymond — 15 h 05 :** fonce

Une fois le mécanisme et l'ambition en place, Claude s'est mis au travail. Chaque image peinte disposait d'un budget de 8,33 millisecondes : Claude a donc parcouru une longue réponse *image par image*, en chronométrant chacune pour repérer les passages lents. Il a supprimé le travail en `O(longueur du message)` à chaque fragment en mémoïsant les blocs terminés, déplacé la tokenisation des blocs de code en cours de croissance dans un worker, et fait apparaître les tableaux cellule par cellule.

Ce seul fil a abouti à près de soixante PR. Les longues réponses bloquent désormais le thread principal pendant environ 200 millisecondes au total, contre environ 750 auparavant, consomment à peu près un tiers du CPU, et tiennent 120 fps du début à la fin sur un MacBook à 120 Hz. Le banc à 120 Hz est lui-même devenu une tâche nocturne, que Claude surveille pour détecter les régressions.

> **Publication X intégrée (résumé) :** « Les longues réponses de Claude sur le web et le bureau s'affichent désormais en streaming environ 4 fois plus fluidement. Nous avons reconstruit le moteur de rendu en streaming pour qu'il ne touche qu'à ce qui change encore : sur un ordinateur portable plus lent, une longue réponse saccade 9 fois moins, son pire gel est 4,5 fois plus court, et sur un MacBook à 120 Hz elle tient 120 fps du début à la fin. » — ClaudeDevs, 25 août 2026. [Voir la publication sur X](https://x.com/ClaudeDevs/status/2092006814804214163).

Au début du sprint, personne n'avait prévu d'optimiser les millisecondes entre deux images pendant le streaming. Mais il s'est avéré qu'on *pouvait* les compter — et tout ce qui se compte, Claude peut le faire progresser.

## Et ensuite

Aujourd'hui, claude.ai et l'application de bureau sont environ 3 fois plus rapides qu'au début du mois d'août, et les cliquets devraient les maintenir à ce niveau. Mais le travail n'est pas terminé : le 95ᵉ centile, d'autres parcours et les très longues conversations ont encore de la marge. Un prochain article reviendra sur certaines quêtes annexes qui ont mené l'équipe en amont pendant le sprint, avec des contributions intégrées à Electron, Chromium, Node.js et d'autres projets.

Quand les résultats ont été présentés en interne, c'est Issac qui l'a le mieux formulé : « Même il y a six mois, personne n'aurait pu me convaincre que c'était possible. » L'équipe compte continuer à travailler ainsi, un fil à la fois, à n'importe quelle échelle. Le canal tourne toujours.

*Avec les contributions d'Alfred Xing, Anthony Morris, Benjamin Pasero, Chase McCoy, Joshua N., Luke Deen Taylor, Marius Schulz et Shelley Vohr. Remerciements particuliers à Boris Cherny pour avoir encouragé l'équipe à viser plus haut.*
