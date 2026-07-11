---
translationKey: "harness-engineering"
locale: "fr"
title: "L'ingénierie des harnais d'exécution pour les utilisateurs d'agents de programmation"
description: "Un modèle pratique fondé sur les guides, les capteurs, les boucles de rétroaction et les contraintes architecturales pour rendre les agents de programmation plus fiables."
publishedAt: "2026-04-02"
updatedAt: "2026-04-02"
category: "architecture"
sourceLocale: "en"
sourceUrl: "https://martinfowler.com/articles/harness-engineering.html"
sourceAuthor: "Birgitta Böckeler"
contentType: "adaptation"
translationStatus: "reviewed"
---

> **Terminologie**
>
> Le **harnais d'exécution** désigne tout ce qui compose un agent d'IA en dehors du modèle lui-même : Agent = Modèle + Harnais d'exécution. Pour un agent de programmation, cela comprend aussi bien les prompts système, la recherche de code et l'orchestration fournis par son concepteur que la couche externe de règles, de Skills, de scripts et de contrôles placée sous la maîtrise de l'utilisateur.
>
> **Guides / Sensors** : les guides sont des contrôles par anticipation, ou *feedforward*, qui orientent l'agent avant son action. Les sensors, ou capteurs, sont des contrôles par rétroaction, ou *feedback*, qui observent le résultat après l'action et déclenchent une autocorrection.
>
> **Computational / Inferential** : les contrôles computational reposent sur un calcul déterministe, comme les tests, les linters ou les vérificateurs de types. Les contrôles inferential reposent sur un jugement sémantique, par exemple une revue de code par IA ou un LLM utilisé comme juge.

---

Le terme « harnais d'exécution » est devenu un raccourci pour désigner tout ce qui, dans un agent d'IA, ne relève pas du modèle : [Agent = Modèle + Harnais d'exécution](https://blog.langchain.com/the-anatomy-of-an-agent-harness/). Cette définition est extrêmement large ; il est donc utile de la resserrer dans le contexte délimité des agents de programmation.

Une partie du harnais d'exécution d'un agent de programmation est construite par son concepteur : prompts système, recherche de code et, parfois, [système d'orchestration sophistiqué](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents). Ces agents donnent aussi à leurs utilisateurs les moyens de bâtir un harnais d'exécution externe adapté à leur propre système et à leur cas d'usage.

![Trois cercles concentriques montrant le modèle au centre, le harnais d'exécution fourni par le concepteur de l'agent de programmation autour de lui, puis le harnais d'exécution utilisateur à l'extérieur](/assets/blog/harness-engineering/harness-bounded-contexts.png)

Figure 1 : l'expression « harnais d'exécution » recouvre des réalités différentes selon le contexte délimité.

Un bon harnais d'exécution externe poursuit deux objectifs : augmenter la probabilité que l'agent réussisse la tâche dès sa première tentative, puis fournir une boucle de rétroaction capable de corriger autant de problèmes que possible avant qu'ils n'arrivent jusqu'à un humain. Le résultat recherché est une charge de revue plus faible et une meilleure qualité du système ; la réduction des tokens gaspillés n'est qu'un bénéfice supplémentaire.

![Vue d'ensemble de guides alimentant un agent de programmation et de capteurs renvoyant les résultats vers sa boucle d'autocorrection, sous le pilotage d'un humain](/assets/blog/harness-engineering/harness-overview.png)

## Feedforward et feedback

L'ingénierie des harnais d'exécution associe deux formes de contrôle :

- Les **guides (contrôles feedforward)** anticipent les comportements indésirables et orientent l'agent **avant** qu'il n'agisse, afin d'augmenter ses chances de produire un bon résultat dès le premier passage.
- Les **sensors (contrôles feedback)** observent le résultat **après** l'action et aident l'agent à s'autocorriger. Ils sont particulièrement efficaces lorsque leurs signaux sont conçus pour être consommés par un LLM, par exemple lorsqu'un message de linter personnalisé indique directement comment corriger le problème : une forme positive de prompt injection.

Prise isolément, aucune des deux formes ne suffit. Du feedback sans feedforward laisse l'agent répéter les mêmes erreurs ; du feedforward sans feedback encode des règles sans jamais révéler si elles ont été efficaces.

## Computational ou inferential

Les guides et les sensors peuvent s'appuyer sur deux modes d'exécution :

- **Computational** : déterministe et rapide, généralement exécuté sur CPU. Tests, linters, vérificateurs de types et analyses structurelles s'achèvent en quelques millisecondes ou quelques secondes et produisent des résultats fiables.
- **Inferential** : analyse sémantique, revue de code par IA et évaluation par un LLM-as-judge, généralement exécutées sur GPU ou NPU. Ces contrôles sont plus lents, plus coûteux et non déterministes.

Les guides computational améliorent le premier résultat grâce à des outils déterministes. Les sensors computational sont assez rapides et peu coûteux pour accompagner l'agent à chaque modification. Les contrôles inferential coûtent davantage et varient d'une exécution à l'autre, mais ils peuvent fournir des indications riches et un véritable jugement sémantique. Avec un modèle puissant, ou plus précisément un modèle adapté à la tâche, les sensors inferential peuvent malgré tout renforcer la confiance.

**Exemples**

| Scénario | Direction | Type | Exemple d'implémentation |
| --- | --- | --- | --- |
| Conventions de code | feedforward | Inferential | AGENTS.md, Skills |
| Initialisation d'un nouveau projet | feedforward | Les deux | Skill contenant des instructions et un script de bootstrap |
| Codemods | feedforward | Computational | Outil ayant accès à des recettes OpenRewrite |
| Tests structurels | feedback | Computational | Hook de pre-commit ou d'agent de programmation exécutant des tests ArchUnit sur les frontières entre modules |
| Instructions de revue | feedback | Inferential | Skills |

### Relation avec le context engineering

Le [context engineering](https://martinfowler.com/articles/exploring-gen-ai/context-engineering-coding-agents.html) fournit les moyens de mettre guides et sensors à la disposition d'un agent. Concevoir un harnais d'exécution utilisateur pour un agent de programmation est une forme concrète de context engineering.

## La steering loop

Le rôle de l'humain consiste à **piloter**, ou *steer*, l'agent en faisant évoluer le harnais d'exécution par itérations successives. Chaque fois qu'un problème se répète, il faut améliorer les contrôles feedforward et feedback afin de le rendre moins probable, voire de l'empêcher complètement.

L'IA peut elle-même contribuer à améliorer le harnais d'exécution. Les agents de programmation ont considérablement réduit le coût de création de contrôles sur mesure et d'analyses statiques. Ils peuvent écrire des tests structurels, dériver des ébauches de règles à partir des motifs observés, amorcer des linters personnalisés ou produire des guides pratiques en faisant l'archéologie d'une base de code.

## Temporalité : déplacer la qualité vers l'amont

Les équipes qui pratiquent l'[intégration continue](https://martinfowler.com/articles/continuousIntegration.html) ont toujours dû répartir tests, contrôles et revues humaines sur la chaîne de développement en fonction de leur coût, de leur vitesse et de leur criticité. Celles qui visent la [livraison continue](https://martinfowler.com/bliki/ContinuousDelivery.html) souhaitent idéalement que chaque commit soit déployable. Les contrôles doivent donc se situer aussi à gauche que possible sur le chemin vers la production, car plus un échec est détecté tôt, moins sa correction coûte cher.

Les sensors feedback, y compris les sensors inferential, doivent être distribués sur l'ensemble du cycle de vie selon le même principe.

**Feedforward et feedback dans le cycle de vie d'une modification**

- Quels contrôles sont assez rapides pour s'exécuter avant l'intégration, voire avant même la création d'un commit ? Par exemple les linters, les suites de tests rapides et un agent de revue de code élémentaire.
- Quels contrôles sont assez coûteux pour ne s'exécuter qu'après l'intégration, dans le pipeline, en complément d'une nouvelle exécution des contrôles rapides ? Par exemple le mutation testing et une revue de code plus large nécessitant une vue d'ensemble.

![Exemples de guides feedforward et de sensors feedback avant et après l'intégration dans le cycle de vie d'une modification](/assets/blog/harness-engineering/harness-change-lifecycle-examples.png)

**Sensors continus de dérive et de santé**

- Les **sensors de dérive de la base de code** s'exécutent en dehors du cycle de vie des modifications pour détecter les dégradations qui s'accumulent progressivement, comme le code mort, une couverture de tests fragile ou des problèmes de dépendances.
- Les **sensors de santé à l'exécution** permettent aux agents de surveiller des signaux de production, par exemple la dégradation des SLO, la qualité d'un échantillon de réponses ou des logs anormaux, puis de proposer des améliorations.

![Exemples de détection continue de la dérive de la base de code et de sensors feedback à l'exécution après l'intégration](/assets/blog/harness-engineering/harness-continuous-feedback-examples.png)

## Catégories de régulation

Le harnais d'exécution de l'agent agit comme un régulateur [cybernétique](https://en.wikipedia.org/wiki/Cybernetics) : il combine feedforward et feedback pour conduire la base de code vers un état souhaité. Cet état comporte plusieurs dimensions, chacune exigeant un type de harnais d'exécution différent. Cette distinction est importante, car l'aptitude au harnais d'exécution (*harnessability*) et la complexité varient fortement d'une dimension à l'autre.

Trois catégories sont aujourd'hui utiles :

### Harnais d'exécution de maintenabilité

La plupart des exemples de cet article régulent la qualité interne du code et sa maintenabilité. C'est actuellement le type de harnais d'exécution le plus facile à construire, car des outils éprouvés existent déjà.

Pour évaluer dans quelle mesure ces contrôles renforcent la confiance, comparons-les aux [modes d'échec courants des agents de programmation](https://martinfowler.com/articles/exploring-gen-ai/13-role-of-developer-skills.html) :

- Les **sensors computational détectent de manière fiable les problèmes structurels** tels que le code dupliqué, la complexité cyclomatique, l'absence de couverture, la dérive architecturale et les violations de style. Ces contrôles sont peu coûteux, éprouvés et déterministes.
- Les **LLM peuvent traiter en partie les problèmes sémantiques** comme les duplications de sens, les tests redondants, les corrections brutales et les solutions surconçues, mais seulement de manière coûteuse et probabiliste. Il ne s'agit pas de contrôles à exécuter sur chaque commit.
- **Ni les uns ni les autres ne détectent de façon fiable certains problèmes à fort impact**, notamment un mauvais diagnostic, des fonctionnalités inutiles, la suringénierie ou des instructions mal comprises. Ils peuvent parfois les repérer, mais pas assez sûrement pour supprimer la supervision humaine. Si l'humain n'a jamais formulé clairement le résultat attendu, la justesse sort du périmètre de tout sensor.

### Harnais d'exécution d'aptitude architecturale

Cette catégorie regroupe les guides et les sensors qui définissent et vérifient les caractéristiques architecturales d'une application : autrement dit, des [Fitness Functions](https://www.thoughtworks.com/en-de/radar/techniques/architectural-fitness-function).

Exemples :

- Des Skills transmettent en amont les exigences de performance, tandis que des tests de performance indiquent si les modifications de l'agent les améliorent ou les dégradent.
- Des Skills décrivent les conventions d'observabilité, telles que les normes de journalisation, tandis que les instructions de débogage demandent à l'agent d'examiner la qualité des logs disponibles.

### Harnais d'exécution comportemental

C'est la catégorie la plus difficile : comment guider l'application et vérifier qu'elle se comporte comme les utilisateurs en ont besoin ?

- **Feedforward** : une spécification fonctionnelle, qui peut aller d'un court prompt à une description répartie sur plusieurs fichiers.
- **Feedback** : une suite de tests générée par l'IA qui passe avec une couverture raisonnable, parfois surveillée par mutation testing, complétée par des tests manuels.

Cette approche accorde une confiance excessive aux tests générés par l'IA. Certaines équipes obtiennent de bons résultats avec le pattern des [approved fixtures](https://lexler.github.io/augmented-coding-patterns/patterns/approved-fixtures/), mais son application est plus aisée dans certains domaines que dans d'autres. C'est un outil sélectif, pas une réponse complète au problème de la qualité des tests.

Il reste beaucoup de travail avant que les harnais d'exécution comportementaux permettent aux équipes de réduire avec confiance la supervision et les tests manuels.

![Modèle simplifié du harnais d'exécution, avec guides et sensors répartis entre les dimensions de maintenabilité, d'aptitude architecturale et de comportement](/assets/blog/harness-engineering/harness-types.png)

## Aptitude au harnais d'exécution (*Harnessability*)

Toutes les bases de code ne se prêtent pas aussi bien à la construction d'un harnais d'exécution. Un langage fortement typé fournit naturellement la vérification de types comme sensor. Des frontières de modules nettes permettent d'imposer des contraintes architecturales. Des frameworks comme Spring masquent des détails que l'agent n'a pas besoin de gérer, ce qui augmente indirectement ses chances de réussite. Sans ces propriétés, les contrôles correspondants ne peuvent pas être construits.

Les systèmes greenfield et legacy rencontrent ici des contraintes différentes :

- Les **équipes greenfield** peuvent intégrer l'aptitude au harnais d'exécution dès le premier jour. Leurs choix technologiques et architecturaux déterminent à quel point la base de code pourra être gouvernée.
- Les **équipes travaillant sur un système legacy**, surtout lorsqu'il porte une dette technique importante, font face au problème le plus difficile : le harnais d'exécution est souvent le plus nécessaire précisément là où il est le plus ardu à construire.

## Modèles de harnais d'exécution

La plupart des entreprises s'appuient sur quelques topologies de services récurrentes pour couvrir l'essentiel de leurs besoins : services métier exposés par API, processeurs d'événements et tableaux de bord de données. Les organisations matures encodent souvent déjà ces topologies sous forme de modèles de services.

Ces modèles pourraient évoluer vers des **modèles de harnais d'exécution** : des ensembles de guides et de sensors qui contraignent un agent de programmation à respecter la structure, les conventions et la pile technologique d'une topologie. À terme, les équipes pourraient même choisir leurs technologies en partie selon les harnais d'exécution disponibles.

![Exemples de topologies de services, chacune associée à un modèle de harnais d'exécution contenant ses guides et ses sensors](/assets/blog/harness-engineering/harness-templates.png)

### Loi d'Ashby

La [loi de la variété requise d'Ashby](https://en.wikipedia.org/wiki/Variety_%28cybernetics%29#Law_of_requisite_variety) renforce l'intérêt des topologies prédéfinies. Un régulateur doit posséder au moins autant de variété que le système qu'il gouverne, et il ne peut réguler que ce dont il possède un modèle. Un agent de programmation fondé sur un LLM peut produire presque n'importe quoi ; s'engager sur une topologie réduit cet espace des possibles et rend un harnais d'exécution complet plus accessible. Définir des topologies revient à réduire la variété.

Les modèles de harnais d'exécution héritent du même problème de maintenance que les modèles de services : une fois instanciés, ils dérivent progressivement par rapport aux améliorations en amont. Le versionnement et les contributions peuvent être encore plus difficiles lorsque les guides et les sensors sont non déterministes et délicats à tester.

## Le rôle de l'humain

Les développeurs humains apportent leurs compétences et leur expérience à chaque base de code sous la forme d'un harnais d'exécution implicite. Nous avons assimilé des conventions et de bonnes pratiques, ressenti le coût cognitif de la complexité et savons que notre nom est attaché aux commits. Nous portons aussi le contexte de l'organisation : ce que l'équipe cherche à accomplir, la dette technique que l'entreprise accepte et ce que « bon » signifie ici. Travailler par petites étapes, à un rythme humain, laisse à cette expérience le temps d'émerger.

Un agent de programmation ne possède rien de tout cela. Il n'est soumis à aucune responsabilité sociale, n'éprouve aucune aversion instinctive pour une fonction de 300 lignes, n'a pas l'intuition que « chez nous, on ne fait pas comme ça » et ne dispose d'aucune mémoire organisationnelle. Il ne sait pas distinguer les conventions structurelles des simples habitudes, ni déterminer si une solution techniquement correcte correspond à l'intention de l'équipe.

Les harnais d'exécution externalisent et rendent explicite une partie de ce que l'expérience humaine apporte, mais seulement jusqu'à un certain point. Un système cohérent de guides, de sensors et de boucles d'autocorrection est coûteux. Le but d'un bon harnais d'exécution n'est pas nécessairement d'éliminer l'intervention humaine, mais de diriger l'attention humaine là où elle compte le plus.

## Un point de départ et des questions ouvertes

Ce modèle mental rassemble des techniques déjà présentes dans la pratique et encadre ce qui reste à résoudre. Il élève la discussion au-dessus de fonctionnalités isolées comme les Skills ou les serveurs MCP, vers la conception stratégique d'un système de contrôle capable d'inspirer une véritable confiance dans les résultats de l'agent.

Quelques exemples issus des pratiques actuelles :

- [Une équipe d'OpenAI a documenté son harnais d'exécution](https://openai.com/index/harness-engineering/) : une architecture en couches imposée par des linters personnalisés et des tests structurels, complétée par un « ramassage des déchets » récurrent qui recherche la dérive et demande aux agents de proposer des corrections. Sa conclusion est que les difficultés les plus importantes concernent désormais la conception des environnements, des boucles de rétroaction et des systèmes de contrôle.
- [L'article de Stripe sur ses minions](https://stripe.dev/blog/minions-stripes-one-shot-end-to-end-coding-agents) décrit des hooks de pre-push qui choisissent les linters pertinents à l'aide d'heuristiques, insiste sur le déplacement du feedback vers l'amont et utilise des « blueprints » pour intégrer les sensors feedback aux workflows des agents.
- Le mutation testing et les tests structurels sont des sensors feedback computational longtemps sous-utilisés, qui connaissent aujourd'hui un regain d'intérêt.
- L'intégration du LSP et de l'intelligence de code fournit des exemples de guides feedforward computational.
- Des équipes de Thoughtworks combinent sensors computational et inferential pour lutter contre la dérive architecturale, notamment en associant des agents à des linters personnalisés ou en employant des approches de type « janitor army » pour améliorer la qualité du code.

De nombreuses questions restent ouvertes. Comment maintenir la cohérence entre guides et sensors à mesure que le harnais d'exécution s'étend ? Dans quelle mesure peut-on faire confiance aux agents pour arbitrer entre des instructions et des signaux de feedback contradictoires ? Si un sensor ne se déclenche jamais, est-ce parce que la qualité est élevée ou parce que la détection est trop faible ? Il nous faut des moyens d'évaluer la couverture et la qualité d'un harnais d'exécution, comparables à la couverture de code et au mutation testing pour les tests. Feedforward et feedback restent dispersés entre les différentes étapes de livraison, ce qui laisse de la place à des outils capables de les configurer, de les synchroniser et de les raisonner comme un système.

La construction du harnais d'exécution externe devient une pratique d'ingénierie continue, et non une configuration ponctuelle.
