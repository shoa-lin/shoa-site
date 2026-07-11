---
translationKey: "getting-started-with-loops"
locale: "fr"
title: "Bien démarrer avec les boucles Claude Code : des tours manuels aux boucles proactives"
description: "Comprendre comment les boucles par tour, par objectif, par intervalle et proactives se déclenchent, s'arrêtent et dans quels cas les utiliser."
publishedAt: "2026-07-07"
updatedAt: "2026-07-07"
category: "development"
sourceLocale: "en"
sourceUrl: "https://claude.com/blog/getting-started-with-loops"
sourceAuthor: "Delba de Oliveira, Michael Segner"
contentType: "adaptation"
translationStatus: "reviewed"
---

![Image de couverture de Getting started with loops](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6903d229e73ca2d0d73d78f7_682ac293884c9d4ee4ebe2355a2f6c4ecfdd9c1b-1000x1000.svg)

---

On parle beaucoup, en ce moment, de « concevoir des boucles » plutôt que de simplement envoyer des prompts à son agent de programmation. Il suffit de passer un peu de temps sur X à chercher ce qu'est réellement une boucle pour trouver plusieurs réponses différentes.

Pour l'équipe Claude Code, une boucle est un agent qui répète des cycles de travail jusqu'à ce qu'une condition d'arrêt soit satisfaite. L'équipe distingue les types de boucles selon plusieurs dimensions :

1. La manière dont la boucle se déclenche.
2. La manière dont elle s'arrête.
3. La primitive Claude Code qu'elle utilise.
4. Les tâches auxquelles elle convient le mieux.

Cet article présente les principaux types de boucles, les situations dans lesquelles les utiliser et la façon de préserver la qualité du code tout en maîtrisant la consommation de tokens. Toutes les tâches ne nécessitent pas une boucle complexe. Commencez par la solution la plus simple, puis appliquez ces modèles de manière sélective lorsqu'ils sont adaptés.

## Quatre types de boucles

L'article d'origine distingue quatre catégories : les boucles par tour, par objectif, par intervalle et proactives. Leur différence ne tient pas seulement au degré d'automatisation : chacune a son propre déclencheur, sa condition d'arrêt et son périmètre de travail.

### Boucle par tour

![Schéma d'une boucle par tour](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a43eb603762e725a739d98c_8ace2295.png)

- **Déclenchement** : un prompt utilisateur.
- **Condition d'arrêt** : Claude estime avoir terminé la tâche ou avoir besoin de davantage de contexte.
- **Idéale pour** : les tâches courtes et ponctuelles qui ne relèvent pas d'un processus régulier ou planifié.
- **Maîtrise de la consommation** : rédiger des prompts précis et améliorer la vérification avec des skills afin de réduire le nombre de tours.

Chaque prompt envoyé lance une boucle manuelle dont vous dirigez les tours. Claude collecte le contexte, agit, vérifie son travail, recommence si nécessaire, puis répond. C'est la boucle agentique décrite dans l'article d'origine.

Par exemple, demandez à Claude de créer un bouton « J'aime ». Il lit le code, effectue la modification, exécute les tests et vous remet un résultat qu'il estime fonctionnel. Vous l'examinez ensuite avant de rédiger le prompt suivant.

Vous pouvez améliorer cette étape de vérification en consignant vos contrôles manuels dans `SKILL.md`, afin que Claude puisse valider une plus grande part de son travail de bout en bout. Pour savoir quand choisir des skills, des hooks ou des sous-agents pour ce type d'automatisation, consultez le guide [steering Claude Code](https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more). Le skill doit fournir à Claude des outils ou des connecteurs qui lui permettent d'observer, de mesurer ou de manipuler le résultat. Plus les contrôles sont quantitatifs, plus Claude peut vérifier facilement son propre travail.

Un skill de vérification frontend pourrait par exemple ressembler à ceci :

```markdown
---
name: verify-frontend-change
description: Verify any UI change end-to-end before declaring it done.
---

# Verifying frontend changes

Never report a UI change as complete based on a successful edit alone. Verify it the way a human reviewer would:

1. Start the dev server and open the edited page in the browser.
2. Interact with the change directly. For a new control (button, input, toggle): click it, confirm the expected state change, and screenshot before/after.
3. Check the browser console: zero new errors or warnings.
4. Use the Chrome Devtools MCP, run a performance trace and audit Core Web Vitals.

If any step fails, fix the issue and rerun from step 1 — do not hand back partially verified work.
```

L'objectif n'est pas d'écrire un skill universel, mais de rendre explicite votre véritable définition de « terminé ». Sans cela, Claude doit s'en remettre à son propre jugement pour décider quand s'arrêter.

### Boucle par objectif

![Schéma d'une boucle par objectif](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a43eb603762e725a739d98f_c6fa9ae5.png)

- **Déclenchement** : un prompt manuel en temps réel.
- **Condition d'arrêt** : l'objectif est atteint ou le nombre maximal de tours est atteint.
- **Idéale pour** : les tâches assorties de critères de sortie vérifiables.
- **Maîtrise de la consommation** : définir des critères d'achèvement précis et une limite explicite de tours, par exemple « arrêter après 5 tentatives ».

Un seul tour ne suffit pas toujours, surtout pour les tâches complexes. Les agents obtiennent généralement de meilleurs résultats lorsqu'ils peuvent itérer. Avec `/goal`, vous définissez ce que signifie « terminé » et laissez à Claude davantage de latitude pour poursuivre le travail jusqu'à l'objectif.

Lorsque vous définissez les critères de réussite, Claude n'a plus à décider seul de ce qui est « suffisamment bon » et risque moins d'interrompre la boucle trop tôt. Chaque fois qu'il tente de s'arrêter, un modèle évaluateur contrôle votre condition. Si elle n'est pas satisfaite, il renvoie Claude au travail jusqu'à ce que l'objectif soit atteint ou que la limite de tours soit dépassée.

C'est pourquoi les critères déterministes fonctionnent particulièrement bien : nombre de tests réussis, seuil de score ou liste d'erreurs vide.

Par exemple :

```text
/goal get the homepage Lighthouse score to 90 or above, stop after 5 tries.
```

L'idée centrale consiste à transférer le pouvoir d'arrêter la boucle de l'impression subjective de l'agent à une condition vérifiable.

### Boucle par intervalle

- **Déclenchement** : un intervalle de temps défini.
- **Condition d'arrêt** : vous l'annulez ou le travail s'achève, par exemple lorsqu'une PR est fusionnée ou qu'une file d'attente est vide.
- **Idéale pour** : les travaux récurrents ou les tâches qui interagissent avec des environnements et systèmes externes.
- **Maîtrise de la consommation** : allonger les intervalles ou réagir à des événements plutôt qu'interroger le système à fréquence fixe.

Certains travaux agentiques sont récurrents : la tâche reste la même tandis que les entrées changent. Résumer les messages Slack chaque matin en est un exemple. D'autres travaux dépendent de systèmes externes ; une méthode simple consiste alors à vérifier régulièrement leur état et à réagir aux changements. Une PR peut, par exemple, recevoir des commentaires de revue ou échouer en CI.

Dans ces cas, `/loop` permet de relancer un prompt à intervalle régulier. Par exemple :

```text
/loop 5m check my PR, address review comments, and fix failing CI
```

`/loop` s'exécute sur votre ordinateur et s'arrête donc si celui-ci est éteint. Pour déplacer la boucle dans le cloud, utilisez `/schedule` afin de créer une routine.

L'essentiel est de ne pas exécuter la routine plus souvent que le système sous-jacent ne change réellement. Une file d'attente qui évolue une fois par heure ne devrait pas consommer des tokens en étant analysée chaque minute.

### Boucles proactives

![Schéma d'une boucle proactive](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a43eb603762e725a739d989_eb9e496a.png)

- **Déclenchement** : un événement ou une planification, sans présence humaine en temps réel.
- **Condition d'arrêt** : chaque tâche se termine une fois son objectif atteint ; la routine continue jusqu'à ce que vous la désactiviez.
- **Idéales pour** : les flux récurrents de travaux bien définis, comme les rapports de bugs, le tri des issues, les migrations et les mises à niveau de dépendances.
- **Maîtrise de la consommation** : confier les routines à des modèles plus petits et plus rapides, et réserver le modèle le plus performant aux décisions qui exigent du discernement.

Les primitives précédentes, associées à d'autres capacités de Claude Code comme le mode auto et les workflows dynamiques (research preview), peuvent former des boucles adaptées aux travaux de longue durée.

Pour traiter un flux continu de retours, vous pouvez par exemple combiner ces capacités :

1. Utiliser `/schedule` (research preview) pour exécuter périodiquement une routine qui recherche de nouveaux signalements.
2. Utiliser `/goal` pour définir ce que signifie « terminé », et des skills pour documenter la méthode de vérification.
3. Utiliser des workflows dynamiques pour orchestrer des agents qui trient chaque signalement, corrigent le problème et examinent la correction.
4. Utiliser le mode auto afin que la routine puisse s'exécuter sans s'interrompre à chaque étape pour demander une autorisation.

Une fois ces éléments réunis, le prompt pourrait prendre cette forme :

```text
/schedule every hour: check #project-feedback for bug reports. /goal: don't stop until every report found this run is triaged, actioned, and responded to. When fixing a bug, use a workflow to explore three solutions in parallel worktrees and have a judge adversarially review them.
```

Il ne s'agit pas d'écrire un prompt plus long, mais d'intégrer les déclencheurs, les conditions d'arrêt, l'exploration parallèle, la revue et les limites d'autorisation dans un même système d'exécution.

## Préserver la qualité du code

La qualité des résultats d'une boucle dépend du système qui l'entoure. L'article d'origine insiste sur plusieurs principes de conception :

1. **Maintenir la propreté du code source** : Claude suit les modèles et conventions déjà présents dans votre base de code. Une base désordonnée fournit à la boucle des pratiques désordonnées qu'elle risque d'amplifier.
2. **Donner à Claude un moyen de vérifier son propre travail** : utilisez des [skills](https://code.claude.com/docs/en/skills) pour formaliser ce que votre équipe et vous considérez comme un bon résultat.
3. **Rendre la documentation facile d'accès** : la documentation des frameworks et bibliothèques contient les bonnes pratiques à jour, et Claude doit pouvoir la consulter.
4. **Utiliser un second agent pour la revue de code** : un évaluateur disposant d'un contexte neuf est moins biaisé et n'est pas influencé par le raisonnement de l'agent principal. Vous pouvez utiliser le skill intégré `/code-review` ou [Code Review](https://code.claude.com/docs/en/code-review) sur GitHub.

Lorsqu'un résultat isolé est insuffisant, ne vous contentez pas de corriger ce problème précis. Réinjectez cet échec dans le système afin que toutes les itérations futures en bénéficient. Un échec doit devenir un skill, un test, un script, une règle ou une grille de revue, pas seulement un correctif ponctuel.

## Maîtriser la consommation de tokens

Pour contrôler la consommation de tokens, les boucles doivent avoir des limites claires. Les conseils de l'article d'origine peuvent se résumer ainsi :

1. **Choisir la primitive et le modèle adaptés à la tâche** : les petites tâches ne nécessitent ni plusieurs agents ni des boucles complexes. Certaines peuvent utiliser des modèles moins coûteux et plus rapides.
2. **Définir clairement les critères de réussite et d'arrêt** : plus ils sont précis, plus Claude peut parvenir rapidement à la solution sans s'arrêter trop tôt.
3. **Effectuer un essai avant une exécution à grande échelle** : les workflows dynamiques peuvent lancer de nombreux agents. Estimez d'abord la consommation sur un petit échantillon du travail.
4. **Utiliser des scripts pour les tâches déterministes** : exécuter un script coûte moins cher que demander à un modèle de raisonner sur les mêmes étapes à chaque fois. Un skill PDF peut, par exemple, inclure un script de remplissage de formulaire que Claude exécute directement au lieu d'en réécrire le code.
5. **Ne pas exécuter les routines plus souvent que nécessaire** : adaptez l'intervalle au rythme réel des changements du système observé.
6. **Examiner la consommation** : `/usage` ventile la consommation récente entre les skills, les sous-agents et MCP ; `/goal` sans argument affiche le nombre actuel de tours et la consommation de tokens ; `/workflows` affiche la consommation de chaque agent et permet d'en arrêter un à tout moment.

Le choix du [modèle et du niveau d'effort](https://claude.com/blog/claude-model-and-effort-level-in-claude-code) fait également partie des principaux leviers de coût d'une boucle.

En bref, une boucle ne sert pas à laisser un agent fonctionner indéfiniment. Elle lui permet de répéter un travail à l'intérieur de limites explicites.

## Pour commencer

L'article d'origine se termine par un tableau comparatif qui indique quelle partie du travail vous déléguez à chaque boucle :

| Boucle | Ce que vous déléguez | Quand l'utiliser | Outil à privilégier |
| --- | --- | --- | --- |
| Par tour | Le contrôle | Vous explorez ou prenez une décision | Skills de vérification personnalisés |
| Par objectif | La condition d'arrêt | Vous savez ce que signifie « terminé » | `/goal` |
| Par intervalle | Le déclencheur | Le travail se déroule hors de votre projet selon un calendrier | `/loop`, `/schedule` |
| Proactive | Le prompt | Le travail est récurrent et bien défini | Tous les éléments précédents, plus les workflows dynamiques |

Pour commencer à utiliser des boucles, observez le travail que vous effectuez déjà. Choisissez une tâche pour laquelle vous êtes le facteur limitant et demandez-vous : pouvez-vous écrire le contrôle de vérification ? L'objectif est-il assez clair pour juger qu'il est atteint ? Le travail arrive-t-il selon un calendrier ou à la suite d'événements externes ?

Une fois l'idée trouvée, exécutez la boucle. Observez où elle bloque ou dépasse son périmètre, puis continuez à améliorer le système.

Pour en savoir plus, consultez la documentation Claude Code sur les [agents parallèles](https://code.claude.com/docs/en/agents), [loop](https://code.claude.com/docs/en/goal), [schedule](https://code.claude.com/docs/en/routines), [goal](https://code.claude.com/docs/en/goal) et les [workflows dynamiques](https://code.claude.com/docs/en/workflows#orchestrate-subagents-at-scale-with-dynamic-workflows).
