---
translationKey: "gpt-6-astra-codex-harness"
locale: "fr"
title: "Du tour par tour au plan de contrôle : comment GPT-6 Astra réécrit le Codex Harness"
description: "Appels d’outils asynchrones, Mid-turn steering, raisonnement dynamique et Agents API : le développement d’agents quitte le runtime maison pour une nouvelle répartition des capacités et des responsabilités."
publishedAt: "2026-09-15"
updatedAt: "2026-09-15"
category: "architecture"
sourceLocale: "zh"
sourceUrl: "https://developers.openai.com/api/docs/guides/latest-model"
sourceAuthor: "OpenAI Developers et ressources communautaires"
contentType: "adaptation"
translationStatus: "reviewed"
---

## La conclusion d’abord

Ce que GPT-6 Astra change, ce n’est pas seulement la puissance du modèle : c’est le modèle temporel de l’agent, son modèle de contrôle et les frontières de son runtime qui bougent en même temps.

Les appels d’outils asynchrones permettent au modèle de poursuivre un travail indépendant pendant qu’un outil lent s’exécute ; le Mid-turn steering permet à l’utilisateur de modifier sa demande avant que le modèle ait terminé ; `configuration_update` permet à l’application d’ajuster l’intensité de raisonnement des réponses suivantes sans réécrire les paramètres de raisonnement au niveau de la requête, tout en conservant le préfixe du prompt cache.

Le changement le plus important vient de l’Agents API, en test public depuis le 10 septembre 2026. Elle expose, via l’API, un Codex Harness géré par OpenAI : l’application fournit les instructions du modèle, les outils métier et l’environnement d’exécution ; OpenAI gère la session, l’orchestration, la compression du contexte, la reprise et le flux d’événements.

Autrement dit, le développement d’agents est en train de vivre un transfert de responsabilités :

> La plateforme absorbe le runtime générique, le modèle absorbe une partie du protocole d’interaction, et les équipes applicatives reportent leur énergie sur les capacités métier, les frontières de permissions, l’environnement d’exécution et la vérification des résultats.

## Pourquoi j’ai dû construire tout cela moi-même

Aux débuts des agents, les appels d’outils asynchrones et le « changement de cap en cours de route » n’étaient généralement pas deux paramètres d’API, mais un ensemble de problèmes de machine à états.

Il fallait persister les tâches inachevées, distinguer le tour du modèle des tâches en arrière-plan, gérer les redémarrages de processus, les délais d’expiration, les annulations, les rappels en double et les résultats dans le désordre ; insérer une nouvelle instruction de l’utilisateur dans un flux en cours, puis décider si l’ancienne sortie était caduque et si les actions déjà exécutées pouvaient être annulées. Et chaque changement d’intensité de raisonnement se répercutait sur la structure des requêtes, les hits de cache et le rejeu du contexte.

Cette ingénierie ne produit aucune valeur métier, mais elle décide de la stabilité de l’agent. Les équipes passaient souvent un temps considérable à entretenir une « couche de compensation » bâtie autour des limites du modèle.

Astra commence à transformer une partie de cela en sémantique de protocole.

## Avec Astra, le modèle n’est plus bloqué par les outils lents

Les appels d’outils asynchrones de la Responses API exigent de déclarer `async: true` dans la définition de la function ou du custom tool. Une fois l’appel émis, le modèle peut continuer le travail qui ne dépend pas de ce résultat, et l’application renvoie le résultat avec le `call_id` d’origine lorsque la tâche est terminée.

Ce qui diminue ici, c’est l’attente côté modèle, pas le travail côté application. OpenAI n’exécute pas les tâches en arrière-plan à la place de l’application et ne fournit pas de file d’attente métier. Un système de production doit toujours décider qui est responsable de la tâche, comment elle est autorisée, comment on la réessaie, combien de temps on conserve le résultat et comment on présente un échec.

Si plusieurs tâches tournent en parallèle, l’application peut aussi définir un outil ordinaire `wait_for_tasks`, afin que le modèle n’attende qu’au moment où il a réellement besoin de comparer les résultats. Cet outil wait relève du protocole propre à l’application.

La valeur de l’asynchrone ne consiste donc pas à mettre async sur tous les outils, mais à lancer tôt le travail réellement indépendant tout en conservant des barrières de dépendance explicites.

## Le Mid-turn steering fait de l’utilisateur un signal de contrôle en cours d’exécution

Le Mid-turn steering d’Astra passe par le mode WebSocket de la Responses API. L’application envoie `response.steer`, l’API met la nouvelle demande de l’utilisateur en file dans la réponse en cours et génère automatiquement la continuation qui suit.

Il ne réécrit pas la sortie déjà envoyée et n’annule pas les outils déjà lancés. `accepted` signifie seulement que l’entrée a été mise en file ; pour savoir si le modèle l’a déjà prise en compte, il faut continuer à lire les événements.

Le steering est donc une « contrainte ajoutée », pas un « retour en arrière dans le temps ». Le harness doit toujours maintenir :

- la relation entre la réponse courante et la réponse successor ;
- l’ordre de plusieurs steerings successifs ;
- les frontières de permissions pour les effets de bord déjà produits ;
- la gestion des conflits entre résultats d’outils et nouvelle direction ;
- la stratégie de reprise en cas de coupure de connexion ou de livraison en double.

C’est plus fiable que l’ancien « interrompre la requête puis reconstruire le contexte » écrit à la main, parce que le protocole exprime désormais le cycle de vie de la continuation ; mais il ne définit pas pour l’application la sémantique métier de l’annulation.

## configuration_update transforme l’intensité de raisonnement en état de session

L’application peut insérer dans l’historique :

```json
{
  "type": "configuration_update",
  "reasoning": { "effort": "high" }
}
```

Le `reasoning.effort` au niveau de la requête garde sa valeur d’origine ; la mise à jour n’affecte que les réponses suivantes. On peut ainsi utiliser une intensité de raisonnement basse pour les tâches ordinaires et la relever face à une analyse d’incident ou une évaluation de risque, tout en conservant le préfixe de prompt existant, ce qui favorise la réutilisation du cache.

Ce mécanisme ne prend actuellement en charge que le mode mono-agent standard de GPT-6 Astra et ne modifie que le reasoning effort ; les mises à jour adjacentes, la compaction automatique et la truncation automatique font l’objet de limites explicites.

Il faut ici distinguer trois niveaux : l’API prend en charge ce protocole, Codex dispose peut-être déjà en interne d’une partie des structures de données, mais savoir si le client Codex actuel l’utilise correctement lors d’un simple changement de réglage doit être vérifié version par version. L’issue publique [Codex Issue #42996](https://github.com/openai/codex/issues/42996) signale encore des problèmes de hits de cache après un changement d’intensité de raisonnement ; on ne peut donc pas prendre la documentation de l’API comme preuve que l’intégration côté client est achevée.

## De la Responses API au Codex Harness, puis à l’Agents API

OpenAI décrit désormais clairement trois frontières de runtime :

| Approche | Qui gère le runtime | Pour quoi faire |
| --- | --- | --- |
| Responses API | L’application elle-même | Garder le contrôle total de la boucle de l’agent |
| Codex SDK / App Server | Réutiliser le runtime Codex local | Intégrer Codex à ses propres outils et produits |
| Agents API | Codex Harness hébergé par OpenAI | Laisser la plateforme gérer session, orchestration, compression et reprise |

L’intérêt de l’Agents API est de transformer en capacité de plateforme le harness générique que chaque équipe devait jusqu’ici réimplémenter. Les capacités gérées listées dans la documentation officielle comprennent le sandbox, les Skills, MCP, le steering, la gestion du contexte, les sous-agents et la reprise de session.

Les équipes applicatives doivent toujours fournir les outils et choisir l’environnement d’exécution, mais elles n’ont plus à implémenter de zéro toute la boucle d’agent générique.

Cela ne veut pas dire « tout confier à la plateforme ». La plateforme prend en charge la mécanique d’exécution générique ; l’application reste garante de la vérité métier. Par exemple :

- quel tenant a le droit de lire ces données ;
- si un appel d’outil est autorisé à produire des effets de bord externes ;
- si une nouvelle tentative risque de facturer ou de déployer deux fois ;
- quelle preuve suffit à établir qu’une tâche est terminée ;
- quels résultats doivent passer par une validation humaine.

## La complexité du harness ne disparaît pas, elle se redistribue en couches

On peut répartir la complexité d’ingénierie passée en trois catégories :

1. **Complexité de compensation du modèle** : attendre, reconstruire le contexte, simuler des interruptions, écrire à la main un protocole asynchrone. Astra en absorbe une partie.
2. **Complexité du runtime générique** : session, flux d’événements, compression, reprise, sous-agents et sandbox. Le Codex Harness et l’Agents API en absorbent une partie.
3. **Complexité de la justesse métier** : permissions, cohérence des données, validation, idempotence, recette et audit. Tout cela reste du ressort de l’application.

Le vrai changement n’est donc pas « il n’y aura plus d’ingénierie à faire », mais un déplacement du centre de gravité :

```text
Avant : construire soi-même l’Agent Runtime
Maintenant : connecter des capacités, déclarer des frontières, vérifier des résultats
```

## Ce que cela annonce pour Codex

Si le Codex Harness continue d’évoluer, son cœur passera de la boucle de tours à un plan de contrôle :

```text
Flux d’événements
  ├─ réponses du modèle
  ├─ démarrage et fin des outils
  ├─ steering de l’utilisateur
  ├─ mises à jour de la configuration de raisonnement
  └─ continuation

Plan de contrôle
  ├─ conversation head courant
  ├─ pending task registry
  ├─ permissions et validations
  ├─ invariants de cache
  ├─ reprise et idempotence
  └─ vérification des résultats
```

Les discussions de la communauté autour de LangChain, Hermes, ZeroClaw et d’autres passerelles montrent aussi qu’une fois le protocole apparu, l’adaptation de l’écosystème demande encore du temps. Le problème courant n’est pas « peut-on émettre le champ async », mais de savoir si la conversion en streaming, le rejeu des messages, les complétions dans le désordre, la reprise après déconnexion et les livraisons en double préservent la sémantique d’origine.

## Le verdict

Astra et l’Agents API pointent ensemble vers une nouvelle répartition des rôles dans les agents :

> Le modèle se charge de penser avec plus de souplesse, le protocole d’exprimer le contrôle en cours d’exécution, le harness de l’orchestration générique, et l’application des contraintes réelles du monde métier.

Cela va fortement abaisser le coût de démarrage d’un nouvel agent. La boucle asynchrone, la reprise d’état et l’intervention en cours de route, qui demandaient des semaines de construction, pourraient demain se réduire à configurer un runtime et brancher des outils.

Mais cela relève aussi le niveau d’exigence sur la « définition du problème » pour les équipes applicatives. Plus la plateforme reprend de mécanismes génériques, plus ce qui différencie vraiment se concentre dans la conception des outils, le modèle de permissions, les frontières de l’environnement, les validateurs et la boucle de feedback.

La question centrale du développement d’agents passe de « comment faire tourner le modèle » à « comment le rendre utilisable de façon fiable dans le monde réel ».

## Références

- [OpenAI : Using GPT-6 Astra](https://developers.openai.com/api/docs/guides/latest-model)
- [OpenAI : Async tool calling](https://developers.openai.com/api/docs/guides/async-tool-calling)
- [OpenAI : Mid-turn steering](https://developers.openai.com/api/docs/guides/steering)
- [OpenAI : Change reasoning mid-conversation](https://developers.openai.com/api/docs/guides/reasoning#change-reasoning-mid-conversation)
- [OpenAI : Agents API overview](https://developers.openai.com/api/docs/guides/agents-api/overview)
- [OpenAI : Agents runtime comparison](https://developers.openai.com/api/docs/guides/agents)
- [OpenAI : Codex SDK](https://learn.chatgpt.com/docs/codex-sdk)
- [OpenAI : Codex App Server](https://learn.chatgpt.com/docs/app-server)
- [Chasing Next : Async Tool Calling in the Responses API](https://chasingnext.com/updates/async-tool-calling-in-the-responses-api)
- [The Syntax Diaries : OpenAI Async Tool Calling Without Lost Results](https://thesyntaxdiaries.com/openai-async-tool-calling)
- [LangChain Issue #40204](https://github.com/langchain-ai/langchain/issues/40204)
