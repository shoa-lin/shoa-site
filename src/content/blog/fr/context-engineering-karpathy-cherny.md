---
translationKey: "context-engineering-karpathy-cherny"
locale: "fr"
title: "Context engineering et loop engineering : transformer un prompt en système exécutable"
description: "De la fenêtre de contexte de Karpathy aux boucles de Boris Cherny : la qualité d'un Agent dépend de ce qu'il voit, vérifie et conserve."
publishedAt: "2026-07-08"
updatedAt: "2026-07-26"
category: "development"
sourceLocale: "en"
sourceUrl: "https://x.com/vartekxx/status/2074864291568664646"
sourceAuthor: "vartekx"
contentType: "adaptation"
translationStatus: "reviewed"
---

> Cet article est une adaptation structurée de [l'article de vartekx](https://x.com/vartekxx/status/2074864291568664646), non une traduction phrase à phrase. Vérifiez à la source les affirmations sur les personnes, produits et chiffres.

## Conclusion d'abord

Un prompt ne représente qu'une petite partie de l'entrée d'un Agent. La fiabilité dépend du système de contexte entier : les faits visibles à l'étape présente, la sélection et la compression de l'historique, l'isolation des sous-tâches et une vérification indépendante.

Karpathy traite la fenêtre de contexte comme une nouvelle interface de programmation. Boris Cherny prolonge l'idée par une boucle qui s'exécute, vérifie et accumule de l'expérience. L'enjeu n'est pas un prompt plus long, mais un système capable de refaire correctement son travail.

- Le **context engineering** décide ce que le modèle doit savoir maintenant.
- Le **loop engineering** organise l'exécution, le contrôle et l'amélioration continus.
- Les **vérificateurs** distinguent le progrès réel d'une simple hausse de production.
- L'**état persistant** transmet l'expérience validée à l'exécution suivante.

![Règles de projet, mémoire, Skills, Hooks et apprentissages composant une fenêtre de contexte](/assets/blog/context-engineering-karpathy-cherny/cover.jpg)

*Figure : architecture du context engineering (vartekx, image en anglais).*

## Le contexte devient l'environnement de travail

Le même modèle peut répondre différemment selon le contexte. Il ne lit pas une unique phrase : dans une mémoire de travail limitée, il comprend la tâche, lit des fichiers, utilise des outils, traite l'historique et choisit l'action suivante.

Les bonnes questions sont donc : quels faits, fichiers et contraintes sont nécessaires maintenant ? Quelles informations sont périmées ou bruitées ? Quelles recherches doivent rester séparées ? Qui contrôle la sortie de façon indépendante ?

L'article distingue trois couches : **prompt engineering** pour l'instruction ponctuelle, **context engineering** pour l'environnement vu par le modèle, et **loop engineering** pour son intégration à un cycle automatique et répétable.

![Progression du prompt engineering au context engineering puis au loop engineering](/assets/blog/context-engineering-karpathy-cherny/three-layers.png)

*Figure : les trois couches se complètent (vartekx, image en anglais).*

## La fenêtre de contexte est une mémoire de travail à orchestrer

L'analogie de Karpathy est simple : le modèle est le processeur, la fenêtre de contexte sa mémoire de travail. Il ne faut pas tout y verser, mais y placer la bonne information au bon moment.

![Plusieurs tours consommant une fenêtre de contexte finie](/assets/blog/context-engineering-karpathy-cherny/context-window-program.jpg)

*Figure : entrées et sorties partagent une fenêtre limitée (vartekx, image en anglais).*

![Instructions système, règles, mémoire, outils, historique et exemples composant le contexte](/assets/blog/context-engineering-karpathy-cherny/context-operations.png)

*Figure : le prompt de l'utilisateur ne forme souvent qu'une petite partie du contexte (vartekx, image en anglais).*

**Écrire, sélectionner, compresser, isoler.**

Les conventions, commandes, décisions d'architecture, causes d'incident et scripts réutilisables doivent vivre dans des notes courtes et recherchables, pas seulement dans une conversation. Leur valeur tient à leur caractère exécutable : commandes testées, chemins protégés, invariants et causes confirmées.

Plus de contexte n'est pas forcément un meilleur contexte. Pour corriger une interface, on charge d'abord son entrée, ses appelants, ses tests, son contrat et l'erreur récente. On compresse les conclusions, contraintes et états utiles, en donnant priorité au code et aux contrôles actuels. Les explorations parallèles doivent renvoyer des résultats structurés, sans contaminer la tâche principale.

## Faire de ces opérations une boucle

La perspective attribuée à Boris Cherny déplace le travail humain : au lieu de relancer sans cesse l'Agent, on conçoit une boucle qui lit l'état, exécute, contrôle, consigne le résultat et repart mieux informée.

![Prompt manuel comparé à un système automatisant contexte et vérification](/assets/blog/context-engineering-karpathy-cherny/loop-context.png)

*Figure : « vous êtes le moteur » face à « le système est le moteur » (vartekx, image en anglais).*

Une bonne boucle écrit l'état important, sélectionne l'état pertinent, résume l'historique obsolète et isole les travaux indépendants. Le context engineering est la recette ; le loop engineering est la cuisine. L'automatisation amplifie autant la discipline que les erreurs.

## Une boucle minimale et praticable

Elle comporte cinq éléments : cadence et conditions d'arrêt ; connaissance de projet courte et validée ; isolation entre implémentation, revue et décision ; connecteurs réels avec permissions adaptées ; vérificateurs indépendants tels que tests, contrôle de types, build, contrat ou approbation humaine.

![Boucle automatisant écriture, sélection, compression, isolation et vérification](/assets/blog/context-engineering-karpathy-cherny/loop-building-blocks.png)

*Figure : le loop engineering automatise le context engineering (vartekx, image en anglais).*

## Du prompt à la spécification

« Refactoriser l'authentification » est un souhait. Une spécification exécutable précise objectif, périmètre, livrables, traitement des conflits et critères d'arrêt : répertoires concernés, zones intouchables, tests à modifier, moment d'escalader et contrôles obligatoires.

![Contexte avant et après édition afin de libérer de la place](/assets/blog/context-engineering-karpathy-cherny/claude-code-context-workflow.jpg)

*Figure : sélection et compression libèrent de l'espace utile (vartekx, image en anglais).*

## Accumuler de l'expérience, pas des transcriptions

Après une tâche, conservez quelques leçons actionnables : ce qui a marché, échoué et ce qu'il faudra vérifier plus tôt. Les échecs répétés peuvent devenir des règles ou contrôles automatiques. L'exécution produit des preuves, les preuves deviennent état, l'exécution suivante les lit sélectivement, et les vérificateurs filtrent encore les erreurs.

![Allégations de temps et de qualité pour spécifications, contexte accumulé et vérification](/assets/blog/context-engineering-karpathy-cherny/self-improving-loop.png)

*Figure : ces chiffres sont des affirmations de l'auteur, non vérifiées indépendamment ici (vartekx, image en anglais).*

## Conclusion

Le context engineering ne supprime ni les hallucinations ni le jugement métier ; davantage de matière ne rend pas la matière meilleure et une automatisation non vérifiée ne devient pas fiable. Concevoir le contexte, construire la boucle, puis vérifier avec des preuves indépendantes évite de mettre les erreurs à l'échelle.
