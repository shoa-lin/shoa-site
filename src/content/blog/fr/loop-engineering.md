---
translationKey: "loop-engineering"
locale: "fr"
title: "Loop Engineering"
description: "Une analyse des cinq composants du loop engineering et de l'état externe, ainsi que des raisons pour lesquelles la vérification, la dette de compréhension et l'abandon cognitif restent du ressort de l'ingénieur."
publishedAt: "2026-06-09"
updatedAt: "2026-06-09"
category: "development"
sourceLocale: "en"
sourceUrl: "https://addyosmani.com/blog/loop-engineering/"
sourceAuthor: "Addy Osmani"
contentType: "adaptation"
translationStatus: "reviewed"
---

**Le loop engineering consiste à ne plus être la personne qui envoie les prompts à l'agent, mais à concevoir le système qui le fait à votre place.** Une boucle peut ici se comprendre comme un objectif récursif : vous définissez le but, puis l'IA itère jusqu'à l'atteindre. Je pense que cela pourrait annoncer l'avenir de notre collaboration avec les agents de programmation. Mais nous n'en sommes qu'au début, je reste sceptique, et vous devez absolument faire [attention](https://x.com/weswinder/status/2063700289710964906) au coût en tokens, car les modes d'utilisation changent fortement selon le budget disponible. Je voudrais donc préciser ce qu'est le loop engineering et ce qu'il implique.

---

Peter Steinberger a récemment [déclaré](https://x.com/steipete/status/2063697162748260627) : « Vous ne devriez plus envoyer vous-même des prompts aux agents de programmation. Vous devriez concevoir des boucles qui envoient des prompts à vos agents. » Dans le même esprit, Boris Cherny, responsable de Claude Code chez Anthropic, a [déclaré](https://x.com/rohanpaul_ai/status/2063289804708835412) : « Je n'envoie plus de prompts à Claude. J'ai des boucles qui s'en chargent et déterminent ce qu'il faut faire. Mon travail consiste à écrire des boucles. »

Mais qu'est-ce que cela signifie concrètement ?

Pendant environ deux ans, obtenir un résultat utile d'un agent de programmation revenait à rédiger un bon prompt et à fournir suffisamment de contexte. Vous écriviez quelque chose, lisiez la réponse, puis écriviez la suite. L'agent restait un outil que vous gardiez en main tout au long du processus, tour après tour. Cette phase est pratiquement terminée, ou du moins certains le pensent.

Désormais, vous construisez un petit système qui détecte le travail, l'attribue, le contrôle, consigne ce qui est terminé et décide de la suite. Vous laissez ce système piloter les agents à votre place. J'ai déjà écrit sur deux notions proches : [l'ingénierie du harnais d'exécution d'un agent](https://addyosmani.com/blog/agent-harness-engineering/), qui conçoit l'environnement dans lequel s'exécute un agent unique, et le [modèle de fabrique](https://addyosmani.com/blog/factory-model/), c'est-à-dire le système qui produit le logiciel. Le loop engineering se situe un niveau au-dessus du harnais d'exécution. C'est un harnais qui s'exécute selon un calendrier, lance des assistants et réinjecte leurs résultats dans le cycle suivant.

Ce qui m'a surpris, c'est que ce sujet ne relève plus vraiment de l'outillage. Il y a un an, créer une boucle signifiait écrire une pile de scripts bash, les maintenir indéfiniment et posséder un système ad hoc que personne d'autre n'avait. Aujourd'hui, les produits intègrent directement ces composants. La liste de Steinberger correspond presque exactement à l'application Codex, et presque autant à Claude Code. Une fois cette structure commune reconnue, on cesse de débattre des outils pour concevoir une boucle capable de fonctionner quel que soit le produit qui l'exécute.

## Les cinq composants, plus une remarque sur l'état

Une [boucle](https://x.com/reach_vb/status/2063713960495558940) a besoin de cinq éléments, ainsi que d'un emplacement où conserver son état. Les voici avant de les détailler.

1. **Des automatisations** qui s'exécutent selon un calendrier et prennent en charge seules la détection et le tri.
2. **Des worktrees** pour éviter que deux agents travaillant en parallèle ne modifient les mêmes fichiers.
3. **Des skills** qui consignent les connaissances du projet que l'agent devrait sinon deviner.
4. **Des plugins et connecteurs** qui relient l'agent aux outils que vous utilisez déjà.
5. **Des sous-agents** pour que l'un propose une solution et qu'un autre la vérifie.

S'ajoute un sixième élément : la mémoire. Il peut s'agir d'un fichier Markdown, d'un tableau Linear ou de tout support qui survit à une conversation unique et consigne ce qui est fait ainsi que la prochaine étape. Cela paraît presque trop simple pour être important. Pourtant, tous les agents de longue durée reposent sur cette même technique, comme je l'expliquais dans [long-running agents](https://addyosmani.com/blog/long-running-agents/) : le modèle oublie tout entre deux exécutions, la mémoire doit donc vivre sur disque plutôt que dans le contexte. L'agent oublie ; le dépôt, non.

Les deux produits proposent désormais les cinq composants.

| Primitive | Rôle dans la boucle | Application Codex | Claude Code |
| --- | --- | --- | --- |
| **Automatisations** | Détection et tri planifiés | [Onglet Automations](https://developers.openai.com/codex/app/automations) : choix du projet, du prompt, de la fréquence et de l'environnement ; les résultats arrivent dans une boîte de tri ; `/goal` permet de poursuivre jusqu'à l'objectif | Tâches planifiées et cron, `/loop`, `/goal`, hooks, GitHub Actions |
| **Worktrees** | Isoler les fonctionnalités parallèles | Un worktree intégré par thread | `git worktree`, `--worktree` et `isolation: worktree` sur un sous-agent |
| **Skills** | Formaliser les connaissances du projet | [Agent Skills](https://developers.openai.com/codex/skills) (`SKILL.md`), appelés avec `$name` ou déclenchés implicitement | [Agent Skills](https://addyosmani.com/blog/agent-skills/) (`SKILL.md`) |
| **Plugins / connecteurs** | Relier vos outils | Connecteurs (MCP) et plugins pour la distribution | Serveurs MCP et plugins |
| **Sous-agents** | Élaborer et vérifier les solutions | [Subagents](https://developers.openai.com/codex/subagents), définis en TOML dans `.codex/agents/` | Sous-agents dans `.claude/agents/`, plus les équipes d'agents |
| **État** | Suivre le travail terminé | Markdown ou Linear via un connecteur | Markdown (`AGENTS.md`, fichiers de progression) ou Linear via MCP |

Les noms diffèrent légèrement, mais les capacités sont les mêmes. Les détails comptent, car ils déterminent si la boucle tient ensemble ou se délite discrètement de toutes parts.

## Les automatisations : le rythme de la boucle

Les automatisations transforment une exécution ponctuelle en véritable boucle. Dans l'application Codex, vous en créez une depuis l'onglet Automations, puis choisissez le projet, le prompt, la fréquence et une exécution sur le checkout local ou dans un worktree d'arrière-plan. Les exécutions qui trouvent quelque chose arrivent dans la boîte de tri ; celles qui ne trouvent rien s'archivent automatiquement. OpenAI utilise les automatisations en interne pour des tâches régulières comme le tri quotidien des issues, la synthèse des échecs de CI, la rédaction de comptes rendus de commits et la recherche de bugs introduits la semaine précédente. Une automatisation peut aussi appeler un skill, ce qui maintient le comportement réutilisable : déclenchez `$skill-name` plutôt que de coller un mur d'instructions dans une planification que personne ne mettra à jour.

Claude Code atteint le même résultat par la planification et les hooks. Vous pouvez utiliser `/loop` pour exécuter un prompt ou une commande à intervalle régulier, planifier des tâches cron, utiliser des hooks pour lancer des commandes shell à certains moments du cycle de vie de l'agent, ou déplacer l'ensemble dans GitHub Actions afin qu'il continue après la fermeture de votre ordinateur. Le principe est identique : définir une tâche autonome, lui donner une fréquence et laisser les constats venir à vous plutôt que vérifier chaque système manuellement.

Il existe également une primitive interne à la session qui touche au coeur du sujet. `/loop` répète une action selon une fréquence. `/goal` continue jusqu'à ce qu'une condition que vous avez écrite soit réellement vraie. Après chaque tour, un petit modèle distinct vérifie si la condition est satisfaite ; l'agent qui a écrit le code ne note donc pas son propre travail. Donnez-lui une condition comme « tous les tests de test/auth passent et le lint est propre », puis éloignez-vous. Codex possède la même primitive, elle aussi nommée `/goal` : elle poursuit le travail sur plusieurs tours jusqu'à ce qu'une condition d'arrêt vérifiable soit satisfaite, avec la possibilité de suspendre, reprendre et effacer. La même primitive existe dans les deux outils, ce qui illustre le motif général de cet article.

C'est ce qui fait remonter le travail. Le reste de la boucle agit sur lui.

## Les worktrees empêchent le travail parallèle de tourner au chaos

Dès que plusieurs agents s'exécutent, les fichiers commencent à entrer en collision. Deux agents qui modifient le même fichier créent le même problème que deux ingénieurs changeant les mêmes lignes sans coordination. Un worktree git résout le problème mécanique : c'est un répertoire de travail indépendant, sur sa propre branche, qui partage l'historique du dépôt. Les modifications d'un agent ne peuvent donc pas toucher le checkout d'un autre.

Codex intègre directement les worktrees dans l'application, ce qui permet à plusieurs threads de travailler sur le même dépôt sans modifier leurs checkouts respectifs. Claude Code fournit la même isolation avec `git worktree`, l'option `--worktree` qui ouvre une session dans son propre checkout, et le paramètre `isolation: worktree` pour les sous-agents, qui attribue à chaque assistant un checkout neuf et le nettoie ensuite. J'ai décrit l'aspect humain dans [the orchestration tax](https://addyosmani.com/blog/orchestration-tax/) : les worktrees éliminent les collisions mécaniques, mais **vous** restez la limite. C'est votre capacité de revue, et non l'outil, qui détermine combien d'agents vous pouvez réellement exécuter.

## Les skills évitent de réexpliquer le projet

Un skill vous évite de réexpliquer le même contexte de projet à chaque session. Les deux outils utilisent le même format : un dossier contenant un fichier `SKILL.md` avec des instructions et des métadonnées, accompagné éventuellement de scripts, références et ressources. Codex exécute un skill lorsque vous l'appelez avec `$` ou `/skills`, ou le déclenche automatiquement lorsque la tâche correspond à sa description. Une description concise et littérale est donc plus efficace qu'une formule ingénieuse. Claude Code fonctionne de la même manière, comme je l'ai décrit dans [agent skills](https://addyosmani.com/blog/agent-skills/).

Les skills sont aussi l'endroit où votre intention cesse de vous coûter à chaque cycle. Dans [intent debt](https://addyosmani.com/blog/intent-debt/), j'expliquais qu'un agent commence chaque session à froid et comble les lacunes de votre intention par des suppositions formulées avec assurance. Un skill externalise cette intention : conventions, étapes de build et remarques comme « nous ne procédons pas ainsi à cause de cet incident ». Vous l'écrivez une fois et l'agent le lit à chaque exécution. Sans skills, la boucle redéduit le projet depuis zéro à chaque cycle. Avec eux, les connaissances du projet peuvent s'accumuler d'un cycle à l'autre.

Une distinction est importante : le skill est le format de création, tandis que le plugin sert à le distribuer. Pour partager un skill entre plusieurs dépôts ou en regrouper plusieurs, vous les empaquetez sous forme de plugin. Cela vaut pour Codex comme pour Claude Code.

## Les plugins et connecteurs donnent accès aux outils réels

Une boucle limitée au système de fichiers reste très restreinte. Les connecteurs, fondés sur MCP, permettent à l'agent de lire votre outil de suivi des issues, d'interroger une base de données, d'appeler une API de staging ou d'envoyer un message dans Slack. Codex et Claude Code prennent tous deux en charge MCP ; un connecteur écrit pour l'un fonctionne donc généralement avec l'autre. Les plugins regroupent connecteurs et skills, ce qui permet à un collègue d'installer l'ensemble de la configuration en une seule fois au lieu de la reconstruire de mémoire.

C'est la différence entre un agent qui dit « voici la correction » et une boucle qui ouvre la PR, associe le ticket Linear et prévient le canal lorsque la CI passe au vert. Les connecteurs permettent à la boucle d'agir dans votre environnement réel au lieu de seulement décrire ce qu'elle ferait si elle y avait accès.

## Les sous-agents séparent la production du contrôle

La technique structurelle la plus utile dans une boucle consiste à séparer l'agent qui produit de celui qui contrôle. Un modèle se montre trop indulgent lorsqu'il évalue son propre travail. Un second agent, doté d'instructions différentes et parfois d'un autre modèle, peut repérer ce que le premier s'est convaincu d'accepter.

Codex lance des sous-agents à la demande, les exécute en parallèle et rassemble leurs résultats dans une seule réponse. Vous définissez des agents personnalisés sous forme de fichiers TOML dans `.codex/agents/`, avec un nom, une description, des instructions et, éventuellement, un modèle et un niveau d'effort de raisonnement. Un évaluateur de sécurité peut ainsi utiliser un modèle puissant avec un effort élevé, tandis qu'un explorateur emploie un modèle rapide en lecture seule. Claude Code propose le même modèle avec des sous-agents dans `.claude/agents/` et des équipes d'agents qui se transmettent le travail. Dans les deux outils, une répartition courante consiste à confier l'exploration à un agent, l'implémentation à un autre et la vérification par rapport à la spécification à un troisième.

J'ai déjà défendu cette idée à deux reprises : dans [the code agent orchestra](https://addyosmani.com/blog/code-agent-orchestra/), puis dans [agentic code review](https://addyosmani.com/blog/agentic-code-review/). Elle compte particulièrement au sein d'une boucle, car celle-ci s'exécute pendant que vous ne la surveillez pas. Un vérificateur auquel vous faites réellement confiance est ce qui vous permet de vous éloigner. Les sous-agents consomment davantage de tokens, puisque chacun effectue son propre travail de modèle et d'outils ; dépensez donc ces tokens là où un second avis justifie son coût. C'est également la structure qui sous-tend `/goal` dans Claude Code : un modèle neuf décide si la boucle est terminée, et non le modèle qui a effectué le travail. La séparation entre production et contrôle s'applique à la condition d'arrêt elle-même.

## À quoi ressemble une boucle

Une fois les éléments assemblés, un thread unique devient un petit panneau de contrôle. Voici un modèle que j'utilise régulièrement.

Chaque matin, une automatisation s'exécute sur le dépôt. Son prompt appelle un skill de tri qui lit les échecs de CI de la veille, les issues ouvertes et les commits récents, puis écrit ses constats dans un fichier Markdown ou un tableau Linear. Pour chaque constat qui mérite d'être traité, le thread ouvre un worktree isolé, demande à un sous-agent de préparer la correction et à un second de l'examiner au regard du skill du projet et des tests existants.

Les connecteurs permettent à la boucle d'ouvrir la PR et de mettre à jour le ticket. Tout ce qu'elle ne peut pas traiter arrive dans ma boîte de tri. Le fichier d'état constitue l'ossature du système : il mémorise ce qui a été tenté, ce qui a réussi et ce qui reste ouvert, afin que l'exécution du lendemain reprenne là où celle du jour s'est arrêtée.

Regardez ce que vous avez réellement fait. Vous avez conçu le processus une seule fois. Vous n'avez envoyé de prompt à aucune des étapes individuelles. C'est l'idée de Steinberger rendue concrète, et il s'agit de la même boucle dans Codex et Claude Code, car ses composants sont identiques.

## Ce que la boucle ne peut toujours pas faire à votre place

La boucle transforme le travail ; elle ne vous en retire pas. Trois problèmes deviennent plus aigus à mesure qu'elle s'améliore, et non plus faciles.

**La vérification reste votre responsabilité.** Une boucle sans surveillance peut aussi commettre des erreurs sans surveillance. Séparer le sous-agent vérificateur du producteur donne plus de poids à l'affirmation « terminé » de la boucle. Même ainsi, « terminé » reste une affirmation, pas une preuve. Je répète la même phrase depuis [code review in the age of AI](https://addyosmani.com/blog/code-review-ai/) : votre travail consiste à livrer du code dont vous avez confirmé le bon fonctionnement.

**Votre compréhension continue de se dégrader si vous la laissez faire.** Plus la boucle livre rapidement du code que vous n'avez pas écrit, plus l'écart grandit entre le système réel et celui que vous comprenez effectivement. C'est la [dette de compréhension](https://addyosmani.com/blog/comprehension-debt/). Si vous ne lisez pas attentivement ce que produit la boucle, une boucle fluide ne fait qu'accélérer l'accumulation de cette dette.

**Une posture trop confortable est dangereuse.** Lorsqu'une boucle fonctionne seule, il devient tentant de ne plus exercer son jugement et d'accepter ce qu'elle renvoie. J'appelle cela [l'abandon cognitif](https://addyosmani.com/blog/cognitive-surrender/). Concevoir une boucle avec discernement peut en être le remède ; en concevoir une pour éviter de réfléchir accélère le problème. Le geste paraît identique, mais le résultat est opposé.

## Construisez la boucle. Restez l'ingénieur.

Je pense que cela donne un aperçu de l'évolution de notre travail. Cela dit, si je cessais d'examiner moi-même le code ou si je me reposais entièrement sur des boucles automatisées pour le corriger, la qualité de mon produit se dégraderait. Je finirais probablement dans une spirale descendante, en creusant continuellement un trou plus profond.

Construisez donc vos boucles, mais n'oubliez pas qu'envoyer directement des prompts à vos agents reste efficace. L'objectif est de trouver le bon équilibre.

Les boucles peuvent également produire des résultats très différents selon la personne qui les utilise. Deux personnes peuvent construire exactement la même boucle et obtenir des résultats opposés. L'une s'en sert pour avancer plus vite sur un travail qu'elle comprend en profondeur. L'autre pour éviter de comprendre le travail. La boucle ne connaît pas la différence. Vous, si.

C'est ce qui rend la conception de boucles plus difficile que le prompt engineering, et non plus facile. L'idée de Cherny n'est pas que le travail est devenu plus simple. Le point de levier s'est déplacé.

Construisez la boucle. Mais construisez-la comme quelqu'un qui entend rester l'ingénieur, pas comme quelqu'un qui se contente d'appuyer sur le bouton de lancement.
