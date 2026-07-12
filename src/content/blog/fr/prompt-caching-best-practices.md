---
translationKey: "prompt-caching-best-practices"
locale: "fr"
title: "Leçons de Claude Code : le Prompt Caching est essentiel"
description: "Une adaptation structurée des enseignements tirés en production par l'équipe Claude Code sur les préfixes stables, les outils, les changements de modèle et la compaction préservant le cache."
publishedAt: "2026-02-20"
updatedAt: "2026-02-20"
category: "architecture"
sourceLocale: "en"
sourceUrl: "https://x.com/trq212/status/2024574133011673516"
sourceAuthor: "Claude Code Team"
contentType: "adaptation"
translationStatus: "reviewed"
---

<div class="blog-article-body">

## Introduction

Les ingénieurs disent parfois que le cache régit tout ce qui l'entoure. Il en va de même pour les agents conçus pour fonctionner longtemps.

Des produits comme Claude Code sont économiquement viables parce que le Prompt Caching, ou mise en cache des prompts, permet aux requêtes suivantes de réutiliser les calculs effectués lors des tours précédents. Cette réutilisation réduit la latence et les coûts, en particulier à mesure que les conversations s'allongent.

## L'architecture de cache de Claude Code

Claude Code est conçu autour du Prompt Caching. Un taux élevé de requêtes satisfaites par le cache de prompts réduit les coûts d'exploitation et permet d'offrir des limites d'utilisation plus généreuses aux abonnés. L'équipe surveille ce taux de si près qu'une baisse importante peut être traitée comme un incident.

Les sections suivantes présentent les enseignements tirés en production lors de l'optimisation du Prompt Caching à grande échelle.

![Schéma de l'architecture du Prompt Caching](https://pbs.twimg.com/media/HBipHa1boAAXD_A?format=jpg&name=large)

## Fonctionnement du Prompt Caching

### Correspondance de préfixe

Le Prompt Caching repose sur la **correspondance de préfixe**. L'API peut réutiliser le contenu compris entre le début d'une requête et ses points de rupture de cache tant que ce préfixe reste inchangé.

L'ordre est donc essentiel : plus les requêtes partagent le même début, plus la quantité de calculs mis en cache qu'elles peuvent réutiliser est importante.

### L'ordre favorable au cache dans Claude Code

Claude Code adopte une disposition favorable au cache : **placer le contenu stable en premier et le contenu dynamique en dernier**.

La requête est organisée approximativement comme suit :

1. **Prompts système et outils stables** (largement partagés)
2. **Contexte du projet** (partagé au sein d'un projet)
3. **Contexte de la session** (partagé au sein d'une session)
4. **Messages de la conversation**

Cette organisation augmente les chances que plusieurs requêtes et sessions partagent un préfixe réutilisable.

### Pourquoi cet ordre est fragile

Des modifications apparemment anodines peuvent rompre le préfixe. Par exemple :

- insérer un horodatage précis dans un prompt système stable
- émettre les définitions d'outils dans un ordre non déterministe
- modifier les paramètres d'un outil, par exemple la liste des agents qu'un outil d'agent peut appeler

## Préserver la validité du cache

### Mettre à jour les informations obsolètes

Certaines informations d'un prompt deviennent naturellement obsolètes : la date change, un fichier est modifié ou un autre élément de l'état d'exécution évolue.

Modifier un prompt système antérieur peut sembler plus propre, mais cela change le préfixe et provoque un cache miss pour tout ce qui suit.

Le modèle adopté par Claude Code consiste à transmettre la mise à jour dans un message ultérieur. Par exemple, le message utilisateur ou le résultat d'outil suivant peut contenir un `<system-reminder>` indiquant que nous sommes désormais mercredi. L'ancien préfixe reste réutilisable, tandis que le modèle reçoit tout de même l'information à jour.

## Le piège du changement de modèle

### Les caches sont propres à chaque modèle

Les caches de prompts sont propres à chaque modèle, ce qui rend les calculs de coût moins intuitifs qu'il n'y paraît.

Si une conversation contient déjà 100k tokens mis en cache pour Opus, poser à Opus une nouvelle question simple peut coûter moins cher que de passer à Haiku, car Haiku devrait créer un nouveau cache de prompts pour cet historique.

### Utiliser un sous-agent pour transférer la tâche à un autre modèle

Lorsqu'un autre modèle est plus adapté, Claude Code préfère transférer la tâche à un **sous-agent** plutôt que de changer le modèle de la conversation en cours. Opus peut préparer une description concise de la tâche pour l'autre modèle.

Les agents Explore en sont un exemple courant : ils peuvent utiliser Haiku sans abandonner le cache propre au modèle de la conversation parente.

## Pourquoi les changements d'outils coûtent cher

Modifier l'ensemble d'outils au milieu d'une conversation est une autre manière courante de détruire la réutilisation du cache de prompts.

Il peut sembler efficace de n'exposer que les outils nécessaires à l'instant présent. En pratique, leurs définitions font partie du préfixe mis en cache : ajouter ou retirer un outil invalide donc la partie du préfixe qui les suit.

### Plan Mode : représenter l'état sans changer les outils

Le Plan Mode montre comment Claude Code conçoit ses fonctionnalités autour de cette contrainte.

L'implémentation la plus évidente consisterait à remplacer l'ensemble d'outils normal par des outils en lecture seule lorsque l'utilisateur entre en Plan Mode. Ce changement de schéma d'outils romprait le cache.

À la place, Claude Code conserve des outils stables et inclut `EnterPlanMode` et `ExitPlanMode` parmi les outils ordinaires. Un message système ultérieur indique à l'agent qu'il se trouve en Plan Mode : examiner la base de code, ne modifier aucun fichier et appeler `ExitPlanMode` lorsque le plan est terminé. Les définitions d'outils ne changent pas.

Comme `EnterPlanMode` est lui-même un outil, le modèle peut également entrer en Plan Mode lorsqu'il estime qu'un problème exige une planification plus approfondie, sans invalider le préfixe mis en cache.

### Tool Search : différer le chargement plutôt que retirer des outils

Le même principe s'applique à Tool Search. Claude Code peut disposer de dizaines d'outils MCP, mais transmettre leur schéma complet à chaque requête serait coûteux. Retirer des outils en cours de conversation romprait tout de même le cache.

La solution est `defer_loading`. Claude Code transmet des stubs d'outils légers et stables, marqués `defer_loading: true`. Lorsque c'est nécessaire, le modèle utilise `ToolSearch` pour charger le schéma d'outil complet. Les mêmes stubs restent présents dans le même ordre, ce qui préserve le préfixe.

L'API expose `ToolSearch` afin que les applications puissent adopter le même modèle.

## Compaction et mise en cache

![Schéma de la compaction et de la mise en cache](https://pbs.twimg.com/media/HBitEdRbUAMVSnM?format=jpg&name=large)

La compaction intervient lorsqu'une conversation approche de la limite de la fenêtre de contexte. Le système produit un résumé, puis poursuit avec cette représentation plus petite.

Cette opération crée plusieurs cas limites pour le Prompt Caching.

### Le problème

Pour produire le résumé, le modèle a besoin de l'historique de la conversation. Une implémentation naïve effectue une requête distincte avec d'autres prompts système et sans outils. Cette requête ne partage plus le préfixe de la conversation principale : tous ces tokens d'entrée doivent donc être traités au plein tarif.

### La solution : une branche dérivée qui préserve le cache

Claude Code traite la compaction comme une branche dérivée qui préserve le cache. La requête de compaction utilise les mêmes prompts système, le même contexte utilisateur et système, les mêmes définitions d'outils et le même historique de conversation que la requête parente. Elle ajoute simplement l'instruction de compaction à la fin sous la forme d'un nouveau message utilisateur.

Du point de vue du calcul du préfixe d'entrée, la requête partage le préfixe, les outils et l'historique de la requête parente. Le préfixe mis en cache peut donc être réutilisé : seuls, pour l'essentiel, les tokens d'entrée de l'instruction de compaction ajoutée doivent être retraités. Le modèle doit néanmoins produire le résumé ; ce calcul et les tokens de sortie restent donc facturés.

Cette approche exige également une marge de compaction : il faut conserver suffisamment de capacité dans la fenêtre de contexte pour l'instruction ajoutée et le résumé que le modèle va générer.

## Cinq enseignements

La compaction est subtile, mais les enseignements plus généraux s'appliquent à tout agent fondé sur le Prompt Caching.

<div class="info-box">

**1. Le Prompt Caching repose sur la correspondance de préfixe**

Toute modification à l'intérieur du préfixe invalide ce qui la suit. Concevez dès le départ la requête selon un ordre stable.

</div>

<div class="tip-box">

**2. Transmettez les mises à jour sous forme de messages**

Lorsque la date, l'état d'exécution ou le mode change, ajoutez un message plutôt que de réécrire les prompts système antérieurs.

</div>

<div class="warning-box">

**3. Ne changez ni de modèle ni d'outils en cours de conversation**

Utilisez des transferts de tâche pour changer de modèle, des outils pour les transitions d'état et le chargement différé pour les catalogues d'outils volumineux.

</div>

<div class="info-box">

**4. Surveillez le taux de requêtes satisfaites par le cache de prompts comme la disponibilité**

Quelques points de pourcentage peuvent avoir un effet concret sur les coûts et la latence ; les régressions du cache méritent donc des alertes opérationnelles.

</div>

<div class="tip-box">

**5. Les travaux dérivés doivent préserver le préfixe parent**

La compaction, les résumés et les autres calculs annexes doivent réutiliser autant que possible la forme de requête de leur parent qui préserve le cache.

</div>

## Conclusion

Claude Code a été conçu dès l'origine autour du Prompt Caching. La leçon pratique n'est pas que chaque agent doit reproduire une disposition précise, mais que la stabilité du cache doit être traitée comme une contrainte architecturale de premier ordre.

---

> Adapté de l'article X de l'équipe Claude Code partagé par @trq212.

</div>
