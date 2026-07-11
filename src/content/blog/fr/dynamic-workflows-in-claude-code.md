---
translationKey: "dynamic-workflows-in-claude-code"
locale: "fr"
title: "Un harnais d'exécution pour chaque tâche : les workflows dynamiques dans Claude Code"
description: "Claude Code peut écrire et orchestrer à la volée un harnais d'exécution multi-agents adapté à une tâche précise."
publishedAt: "2026-06-02"
updatedAt: "2026-07-07"
category: "development"
sourceLocale: "en"
sourceUrl: "https://claude.com/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code"
sourceAuthor: "Thariq Shihipar, Sid Bidasaria"
contentType: "adaptation"
translationStatus: "reviewed"
---

La semaine dernière, nous avons lancé les [workflows dynamiques](https://code.claude.com/docs/en/workflows) dans Claude Code. Claude peut désormais écrire à la volée son propre [harnais d'exécution](https://code.claude.com/docs/en/glossary#agentic-harness), conçu sur mesure pour la tâche à accomplir.

> Un **harnais d'exécution** désigne la couche de contrôle qui entoure un modèle d'IA : assemblage des prompts, orchestration des outils, gestion du contexte et reprise sur erreur. Claude Code peut ainsi se comprendre comme **Modèle + Harnais d'exécution**.

Le harnais d'exécution par défaut de Claude Code est conçu pour la programmation. Il convient pourtant à de nombreuses autres activités, car beaucoup de tâches finissent par ressembler à des tâches de programmation. Certaines catégories de travail ont néanmoins besoin d'un harnais d'exécution spécialisé au-dessus de Claude Code pour atteindre leur plein potentiel, notamment la [Research](https://support.claude.com/en/articles/11088861-using-research-on-claude), l'[analyse de sécurité](https://support.claude.com/en/articles/11932705-automated-security-reviews-in-claude-code), les [équipes d'agents](https://code.claude.com/docs/en/agent-teams) et la [Code Review](https://code.claude.com/docs/en/code-review).

Les workflows permettent à Claude de créer dynamiquement ces harnais d'exécution spécialisés au-dessus de Claude Code. Ils peuvent également être enregistrés, partagés et réutilisés.

Cet article présente nos premiers retours d'expérience et les enseignements tirés de l'utilisation des workflows. Les bonnes pratiques continuent d'évoluer : les workflows dynamiques consomment souvent davantage de tokens et conviennent surtout aux tâches complexes à forte valeur ajoutée.

## Exemples de prompts

Avant d'entrer dans les détails techniques, voici plusieurs prompts qui illustrent l'étendue des possibilités :

« Ce test échoue peut-être 1 fois sur 50. Mets en place un workflow pour reproduire le problème. Formule plusieurs théories concurrentes sur la condition de course et ne t'arrête pas avant que l'une d'elles résiste à l'épreuve des faits. »

« À l'aide d'un workflow, examine mes 50 dernières sessions, repère les corrections que je répète et transforme celles qui reviennent en règles dans `CLAUDE.md`. »

« Utilise un workflow pour analyser les six derniers mois du canal #incidents dans Slack et trouver les causes racines récurrentes pour lesquelles personne n'a créé de ticket. »

« Prends mon business plan et exécute un workflow dans lequel différents agents le passent au crible du point de vue d'un investisseur, d'un client et d'un concurrent. »

« Voici un dossier de 80 CV. Utilise un workflow pour les classer en vue du poste backend, puis vérifie à nouveau les dix premiers. Interroge-moi avec l'outil AskUserQuestion afin de définir la grille d'évaluation. »

« Je dois trouver un nom pour cet outil CLI. Utilise un workflow pour générer un large éventail d'idées, puis organise un tournoi afin de sélectionner les trois meilleures. »

« Utilise un workflow pour renommer partout notre modèle User en Account. »

« Parcours le brouillon de mon article de blog et vérifie chaque affirmation technique par rapport au code source à l'aide d'un workflow. Je ne veux rien publier d'inexact. »

## Fonctionnement des workflows dynamiques

Les workflows dynamiques exécutent un fichier JavaScript doté de quelques fonctions spéciales qui lancent et coordonnent des [sous-agents](https://code.claude.com/docs/en/sub-agents) :

![Schéma montrant comment un workflow dynamique lance et coordonne des sous-agents](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f1684f559cc83ff4b465b_image1.png)

Ils fournissent également des objets JavaScript standard comme JSON, Math et Array pour traiter les données.

Un workflow dynamique peut choisir le modèle utilisé par un agent et décider si un sous-agent s'exécute dans son propre worktree. Claude peut ainsi sélectionner, à chaque étape, le niveau d'intelligence et d'isolation approprié.

Si un workflow est interrompu par une action de l'utilisateur ou par la fermeture du terminal, la reprise de la session lui permet de continuer là où il s'était arrêté.

## Pourquoi utiliser des workflows dynamiques

Le harnais d'exécution par défaut de Claude Code doit planifier et exécuter une tâche dans une seule fenêtre de contexte. Cette approche fonctionne remarquablement bien pour de nombreuses tâches de programmation, mais peut atteindre ses limites face à des travaux très longs, massivement parallèles, fortement structurés ou adversariaux.

Plus Claude travaille longtemps sur une tâche complexe dans une même fenêtre de contexte, plus il devient vulnérable à plusieurs modes d'échec :

- **Paresse agentique** : Claude s'arrête avant d'avoir terminé une tâche complexe en plusieurs parties et déclare avoir réussi après une progression partielle, par exemple en ne traitant que 35 constats sur 50 dans une revue de sécurité.
- **Biais en faveur de ses propres résultats** : Claude tend à privilégier ses propres conclusions, surtout lorsqu'on lui demande de les vérifier ou de les évaluer selon une grille.
- **Dérive de l'objectif** : la fidélité à l'objectif initial s'érode progressivement au fil des tours, en particulier après une compaction. Chaque étape de synthèse entraîne une perte d'information ; des contraintes ou exigences de cas limites comme « ne fais pas X » peuvent donc disparaître.

Un workflow compense ces modes d'échec en orchestrant des sous-agents Claude distincts, chacun disposant de sa propre fenêtre de contexte et d'un objectif ciblé et isolé.

## Workflows dynamiques et statiques

Vous avez peut-être déjà construit un workflow statique avec le Claude Agent SDK ou `claude -p` afin de coordonner plusieurs instances de Claude Code.

Comme les workflows statiques doivent anticiper tous les cas limites, ils ont tendance à rester génériques. Avec [Claude Opus 4.8](https://www.anthropic.com/news/claude-opus-4-8) et les workflows dynamiques, Claude peut au contraire écrire un harnais d'exécution sur mesure pour le cas d'usage en cours.

![Comparaison des workflows statiques et dynamiques](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f3a0e17e2844bed86f22a_image9.png)

## Modèles utiles pour les workflows dynamiques

Pour commencer, il suffit de demander à Claude de créer un workflow dynamique. Vous pouvez aussi employer le mot déclencheur `ultracode` pour rendre cette intention explicite.

Connaître les modèles les plus courants aide à repérer les situations dans lesquelles les workflows sont utiles et à guider Claude au moyen du prompt.

Claude peut utiliser et combiner des modèles comme ceux-ci :

![Vue d'ensemble des modèles courants de workflows dynamiques](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f16d86247e586b929a407_image10.png)

### Classer puis agir

Utilisez un agent classificateur pour identifier le type de tâche, puis orientez-la vers différents agents ou comportements. Un classificateur peut aussi intervenir à la fin afin de déterminer comment traiter le résultat.

### Distribuer puis synthétiser

Décomposez une tâche en étapes plus petites, confiez chacune à un agent, puis synthétisez les résultats. Ce modèle est particulièrement utile lorsque les étapes sont nombreuses ou que chacune bénéficie d'une fenêtre de contexte vierge, sans interférence ni contamination croisée. La synthèse joue le rôle de barrière : elle attend tous les agents lancés en parallèle, puis fusionne leurs sorties structurées en un résultat unique.

### Vérification adversariale

Pour chaque agent qui produit un résultat, lancez un agent indépendant chargé de le contester à partir d'une grille ou de critères explicites.

### Générer puis filtrer

Générez de nombreuses idées, filtrez-les à l'aide d'une grille ou d'une étape de vérification, supprimez les doublons et ne conservez que les meilleurs candidats ayant résisté aux tests.

### Tournoi

Au lieu de répartir le travail, mettez les agents en concurrence. Lancez N agents sur la même tâche avec des approches différentes, puis demandez à un agent juge ou à un modèle de comparer les résultats deux à deux jusqu'à ce qu'un seul vainqueur reste en lice.

### Boucler jusqu'à la fin

Lorsque la quantité de travail est inconnue, continuez à lancer des agents jusqu'à ce qu'une condition d'arrêt soit remplie, par exemple l'absence de nouveaux constats ou d'erreurs restantes dans les journaux, plutôt que de fixer à l'avance un nombre de passages.

## Cas d'usage

Faites preuve de créativité pour déterminer quand demander un workflow dynamique à Claude Code. Les workflows peuvent s'avérer encore plus utiles pour des travaux non techniques que pour la programmation.

### Migrations et refactorisations

[Bun](https://bun.com/) a été réécrit de Zig vers Rust à l'aide de workflows. [Le fil X de Jarred](https://x.com/jarredsumner/status/2060050578026189172) explique comment l'équipe s'y est prise.

L'essentiel consiste à décomposer la migration en unités concrètes : sites d'appel, tests en échec ou modules. Lancez un sous-agent dans un worktree pour chaque correction, faites-la examiner de manière adversariale par un autre agent, puis fusionnez les modifications. Lorsque c'est nécessaire, demandez aux agents d'éviter les commandes gourmandes en ressources afin que la machine puisse supporter davantage de travail en parallèle.

### Recherche approfondie

Claude Code inclut un skill de recherche approfondie, `/deep-research`, construit avec des workflows dynamiques. Il distribue les recherches sur le Web, récupère les sources, vérifie leurs affirmations de manière adversariale et synthétise un rapport assorti de citations.

Le même modèle s'applique au-delà de la recherche Web. Claude peut produire un rapport d'avancement à partir du contexte Slack ou étudier en profondeur un code source afin de comprendre le fonctionnement d'une fonctionnalité.

### Vérification approfondie

![Workflow de vérification approfondie](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f1721824a27cf13da87f4_image2.png)

Si vous disposez déjà d'un rapport et souhaitez contrôler chaque affirmation factuelle, créez un workflow dans lequel un agent recense les affirmations et un sous-agent distinct examine chacune d'elles. Un autre agent vérificateur peut évaluer si chaque source citée est suffisamment fiable.

### Classement

![Workflow de classement](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f173ce727a972001584cc_image3.png)

Supposons que vous deviez classer une liste selon un critère qualitatif que Claude Code sait évaluer, par exemple des tickets d'assistance ordonnés par gravité des bugs. Tenter de trier plus de 1 000 lignes dans un seul prompt dégrade la qualité et dépasse le contexte réellement exploitable. Utilisez plutôt un tournoi, une chaîne d'agents effectuant des comparaisons deux à deux, ou un classement parallèle par groupes suivi d'une fusion. Le jugement comparatif est plus fiable que la notation absolue, et chaque comparaison bénéficie de sa propre fenêtre de contexte.

### Mémoire et respect des règles

![Workflow consacré à la mémoire et au respect des règles](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f17517076bb59050d90bb_image8.png)

Si Claude continue d'ignorer certaines règles même lorsqu'elles figurent dans `CLAUDE.md`, créez un workflow comportant un vérificateur par règle. Un sous-agent sceptique peut examiner les règles elles-mêmes afin de réduire les faux positifs.

L'inverse fonctionne également : analysez les sessions récentes et les commentaires de revue de code pour trouver les corrections récurrentes, regroupez-les avec des agents parallèles, testez de manière adversariale si chaque règle candidate aurait empêché une erreur réelle, puis réinjectez les règles qui résistent à l'analyse dans `CLAUDE.md`.

### Recherche de la cause racine

Le débogage fonctionne mieux lorsque plusieurs hypothèses indépendantes sont formulées puis testées. Une fenêtre de contexte unique favorise davantage le biais en faveur de ses propres résultats.

Un workflow peut prévenir ce problème par sa structure même, en attribuant à des agents distincts des éléments de preuve disjoints comme les journaux, les fichiers et les données. Chaque hypothèse peut ensuite être confrontée à des vérificateurs et contradicteurs indépendants.

Ce modèle ne se limite pas au code. Il s'applique à l'analyse commerciale, aux incidents d'ingénierie des données et à toute enquête post-mortem.

### Triage à grande échelle

![Workflow de triage à grande échelle](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f1778dc00d34cca70819d_image6.png)

Toutes les équipes ont une file d'assistance, des rapports de bugs ou un autre arriéré que les humains ne peuvent pas traiter intégralement.

Un workflow de triage classe chaque élément, le déduplique par rapport aux éléments déjà suivis, puis entreprend l'action appropriée, qu'il s'agisse de tenter une correction ou de transmettre le problème à une personne.

La quarantaine est ici un modèle utile : les agents qui lisent du contenu public non fiable n'ont pas le droit d'effectuer des actions à privilèges élevés. Des agents distincts agissent à partir des informations obtenues.

Associez les workflows de triage à [`/loop`](https://claude.com/blog/getting-started-with-loops) afin que Claude les exécute en continu.

### Exploration et goût

Les workflows sont utiles pour explorer plusieurs solutions lorsque le choix final dépend du goût, par exemple pour un design ou un nom, et que ce jugement peut être formulé dans une grille.

Demandez à Claude d'explorer de nombreuses options, puis fournissez à un agent chargé de la revue une grille définissant une bonne solution. La tâche prend fin lorsque cet agent estime que les critères sont remplis. Un tournoi peut également classer ou sélectionner les candidats selon cette grille.

### Evals

Exécutez des evals légères en lançant des agents indépendants dans des worktrees, puis des agents de comparaison chargés de noter leurs résultats selon une grille. Cette méthode permet d'évaluer et d'affiner un skill à partir de critères précis.

### Routage du modèle et du niveau d'intelligence

Créez un agent classificateur adapté à la tâche et laissez-le choisir le modèle. Cette approche est utile lorsque les recherches préliminaires et les appels d'outils révèlent le niveau d'intelligence nécessaire à l'exécution proprement dite.

Par exemple, le bon modèle pour « expliquer le fonctionnement du module d'authentification » dépend de la taille et de la structure de ce module. Un classificateur peut l'examiner, puis orienter la tâche vers Sonnet ou Opus selon la complexité attendue.

## Quand ne pas utiliser les workflows dynamiques

Les workflows sont récents. Ils peuvent produire des résultats hors normes, mais ne sont pas nécessaires pour chaque tâche et peuvent consommer nettement plus de tokens.

Utilisez-les lorsque le parallélisme, la spécialisation ou les contrôles adversariaux justifient leur coût de coordination. La plupart des tâches de programmation classiques n'ont pas besoin d'un comité de cinq réviseurs. Le même discernement s'applique au niveau de l'architecture lorsqu'il faut choisir entre un [système multi-agents et un système à agent unique](https://claude.com/blog/building-multi-agent-systems-when-and-how-to-use-them).

## Conseils pour construire des workflows dynamiques

### Rédaction des prompts

Les prompts détaillés qui nomment les modèles de workflow pertinents produisent les meilleurs résultats.

Les workflows ne sont pas réservés aux grandes tâches. Vous pouvez demander un « workflow rapide », par exemple une brève revue adversariale d'une hypothèse.

### Combiner avec `/goal` et `/loop`

Pour les workflows répétables comme le triage, la recherche ou la vérification, associez [`/loop`](https://claude.com/blog/getting-started-with-loops) à [`/goal`](https://code.claude.com/docs/en/workflows) afin de les exécuter à intervalles réguliers et d'imposer une exigence d'achèvement stricte.

### Budgets de tokens

Vous pouvez définir un budget explicite de tokens pour un workflow dynamique. Un prompt comme « use 10k tokens » plafonne la tâche à 10k tokens.

### Enregistrer et partager des workflows dynamiques

Appuyez sur `s` dans le menu des workflows pour en enregistrer un. Vous pouvez le versionner dans `~/.claude/workflows` ou le distribuer au moyen d'un skill.

![Enregistrement d'un workflow depuis le menu des workflows](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f17b1ca20533e666c867c_image4.png)

Pour le partager au moyen d'un skill, placez les fichiers JavaScript du workflow dans le dossier du skill et référencez-les dans `SKILL.md`. Pour gagner en flexibilité, demandez à Claude de traiter le workflow comme un modèle plutôt que comme un script à exécuter mot pour mot.

![Partage d'un workflow au moyen d'un skill](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f17cb835cf4f9fd5da921_image7.png)

## Un nouveau point de départ pour explorer

Les workflows offrent une nouvelle manière d'étendre Claude Code. Considérez-les comme un point de départ pour découvrir d'autres façons dont Claude peut vous aider dans votre travail ; il reste encore beaucoup à apprendre pour bien les utiliser.

Pour savoir ce qu'un harnais d'exécution doit contenir, consultez les [trois modèles de conception de harnais d'exécution](https://claude.com/blog/harnessing-claudes-intelligence) d'Anthropic.

---

*Cet article a été écrit par Thariq Shihipar et Sid Bidasaria, membres du personnel technique d'Anthropic travaillant sur Claude Code.*
