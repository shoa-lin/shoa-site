---
translationKey: "ai-agent-patterns"
locale: "fr"
title: "Patrons de conception pour agents IA (I) : une execution fiable"
description: "Un guide pratique de raisonnement, d'appel d'outils, de collaboration, de memoire et de garde-fous pour exploiter un agent IA de facon fiable en production."
publishedAt: "2026-04-09"
updatedAt: "2026-07-13"
category: "architecture"
sourceLocale: "zh"
sourceUrl: "https://www.bydziwen.top/blog/ai-agent-patterns/"
sourceAuthor: "Shoa Lin"
contentType: "original"
translationStatus: "reviewed"
---

De nombreux articles sur Agent parlent de deux choses ensemble : **comment faire en sorte que le modèle accomplisse la tâche** et **comment écrire le système de manière fiable**. Le résultat est que je me souviens d’un tas de noms, et quand je commence à concevoir, je ne sais pas quel problème résoudre en premier.

Cet article ne répondra qu'à la première chose : comment un Agent juge, agit, coopère et reste contrôlable dans un environnement réel. Vous pouvez le considérer comme une cartographie des tâches : partir de la boucle de raisonnement d'un seul agent, entrer progressivement dans la collaboration, la mémoire et les connaissances de plusieurs personnes, et enfin ajouter la sécurité et la tolérance aux pannes requises pour le fonctionnement de la production.

Vous n'avez pas besoin de vous souvenir du nom du schéma lors de la lecture. Ce à quoi chaque section veut réellement répondre est la suivante : **Quel type d'incertitude doit être éliminé dans ce type de tâche ? ** Parfois, il s'agit de savoir quoi faire ensuite, parfois de savoir qui le fait, parfois de savoir comment s'en souvenir et parfois de savoir comment éviter des conséquences irréversibles.

## La première couche : mode principal à agent unique

### 01 ReAct — Raisonnement et action entrelacés

**Article** : Yao et al., 2022 — _ReAct : Synergizing Reasoning and Acting in Language Models_

💡 Idée de base

N'y pensez pas d'abord, puis faites-le, pensez-y en le faisant. LLM génère alternativement **Pensée** et **Action** et continue le raisonnement après avoir observé les résultats.

> Pensée : L'utilisateur souhaite connaître la météo à Pékin aujourd'hui. Je dois chercher.
> Action : rechercher ("Météo de Pékin le 9 avril 2026")
> Observation : Ensoleillé, 18°C, vent de nord niveau 3
> Pensée : j'ai les données météo, donc je peux répondre.
> Réponse : Il fait beau à Pékin aujourd'hui, avec une température de 18°C ​​et un vent du nord de niveau 3.

**Pourquoi ça marche** :

- **Le raisonnement guide l'action** : Chaque étape d'action comporte une pensée expliquant "pourquoi vous devriez faire cela" pour réduire les tentatives aveugles.
- **Les actions renvoient au raisonnement** : l'observation fournit des informations du monde réel pour rendre le raisonnement ultérieur plus précis
- **Explicabilité** : le lien de pensée lui-même est un "journal de décision" naturel

**Scénarios applicables** : tâches nécessitant un raisonnement en plusieurs étapes + appel d'outils (question et réponse, analyse, débogage)

**Limitations** : les longues chaînes sont sujettes à des « déviations » et les observations ultérieures peuvent s'écarter de la cible d'origine. Besoin de coopérer avec le mode Réflexion ou Planification pour contraindre la direction.

### 02 Planifier et exécuter — Réfléchissez clairement avant d'agir

💡 Idée de base

Générez un plan d'exécution complet, puis exécutez-le étape par étape au lieu de le regarder étape par étape. À la différence de la « réflexion et de l'action » de ReAct, la **planification** et l'**exécution** sont séparées en deux étapes claires.

> [Phase de planification]
> Utilisateur : Aidez-moi à analyser les derniers développements du produit concurrent HireGo
>Planifier :
> 1. Recherchez sur le site officiel de HireGo pour obtenir des informations sur le produit
> 2. Recherchez les avis sur Google Play / App Store
> 3. Recherchez dans les médias technologiques les rapports pertinents des 30 derniers jours
> 4. Rechercher des mises à jour de recrutement sur LinkedIn (pour déterminer la direction de l'expansion de l'équipe)
> 5. Sur la base des informations ci-dessus, générer un briefing sur la veille concurrentielle sur les produits
>
> [Phase d'exécution]
> Effectuer l'étape 1 → Observer → Effectuer l'étape 2 → Observer → ... → Rapport final

**Conception des clés** :

- **Le plan peut être ajusté dynamiquement** : Si de nouveaux indices sont trouvés lors de l'exécution de l'étape 2, vous pouvez revenir en arrière et compléter la recherche à l'étape 1
- **Complémentaire de ReAct** : Plan-and-Execute fournit une "vision globale", ReAct offre une "flexibilité locale"
- **Souvent mélangé à des projets réels** : générez d'abord un plan grossier et exécutez-le en mode ReAct à chaque étape

**Scénarios applicables** : tâches en plusieurs étapes avec des processus clairs (rapports de recherche, pipelines de traitement de données, refactorisation de code)

**Limites** : Le plan initial peut ne pas être parfait ; si l’environnement change radicalement, le plan statique deviendra obsolète.

### 03 Réflexion — Rétrospective après avoir terminé

💡 Idée de base

Laissez l'agent **évaluer son propre résultat** et se corriger lorsqu'il détecte des lacunes. C'est peut-être le mode le plus « humain » : terminez un problème, vérifiez-le à nouveau et constatez que vous avez fait une erreur, puis corrigez-la.

> [Sortie du premier tour]
> "Le chiffre d'affaires de NVIDIA au premier trimestre 2026 s'élève à 28 milliards de dollars, soit une augmentation de 78 % sur un an"
>
> [Introspection]
> Attendez, je vérifie : 28 milliards contre 26 milliards au premier trimestre de l'année dernière...
> 280/260 - 1 = 7,7 %, et non 78 %. 78 % d’une année sur l’autre par rapport au premier trimestre 2024.
> Je dois clairement étiqueter la référence de comparaison.
>
> [Sortie de correction]
> "Le chiffre d'affaires de NVIDIA au premier trimestre 2026 s'élevait à 28 milliards de dollars, soit une augmentation d'une année sur l'autre de 7,7 % (en glissement trimestriel) et une augmentation d'une année sur l'autre de 78 % (en glissement annuel)"

**Cas classique d'Andrew Ng** : laissez LLM écrire le code → exécuter le test → renvoyer l'erreur à LLM → LLM corrige le code → tester à nouveau. Ce cycle peut être répété plusieurs fois jusqu'à ce qu'il soit réussi.

**Points de mise en œuvre** :

- Les signaux de retour peuvent être **externes** (résultats de tests, commentaires des utilisateurs, valeurs de retour de l'outil) ou **internes** (auto-évaluation LLM)
- La fréquence de réflexion doit être contrôlée : réfléchir à chaque fois fera perdre du temps, réfléchir uniquement aux nœuds clés (une fois le code écrit et le rapport généré)
- Une « norme d'achèvement » claire est requise, sinon l'Agent « réfléchira » dans une boucle infinie

**Scénarios applicables** : génération de code, écriture, analyse de données – toute tâche « la qualité est importante »

### 04 Utilisation des outils – Laisser l'agent faire pousser ses bras et ses jambes

💡 Idée de base

LLM lui-même n'est qu'un générateur de texte qui lui permet de fonctionner sur des outils du monde réel via **Appel de fonction / Utilisation d'outils**. Il s'agit de l'**infrastructure** de tous les systèmes d'agent : sans l'utilisation des outils, il n'y aurait pas d'agent.

> Utilisateur : "Créez-moi un rappel programmé pour me rappeler un rendez-vous à 9h demain matin"
>
> Prise de décision interne LLM :
> Besoin d'appeler → cron_schedule(
> message : "Rappel : Rendez-vous à 9h",
> heure : "2026-04-10T09:00:00+08:00"
> )
>
> → Appel réussi → "Un rappel a été défini : 9h00 demain — pour vous rappeler la réunion"

**Classification des outils** :

| Catégories | Exemples | Caractéristiques |
| --- | --- | --- |
| **Récupération d'informations** | web\_search, web\_fetch, lecture\_file | Lecture seule, aucun effet secondaire |
| **Exécution d'actions** | envoyer\_message, écrire\_fichier, exec | Il y a des effets secondaires, soyez prudent |
| **Outils interactifs** | navigateur, message, toile | Communication bidirectionnelle |
| **Calculatrice** | calculatrice, code\_interpreter | Sortie déterministe |

**Pratique d'ingénierie** :

- **La qualité de la description de l'outil détermine la qualité de l'appel** : La capacité de LLM à sélectionner correctement l'outil dépend à 90 % de la qualité de la rédaction de la description de l'outil.
- **Principe du moindre privilège** : l'agent n'a besoin que des outils dont il a besoin pour sa tâche en cours, ne les donnez pas tous en même temps
- **La gestion des erreurs est au cœur** : l'échec des appels d'outils est la norme et l'agent doit être capable de gérer les échecs avec élégance (nouvelle tentative, repli, reporting)

### 05 Chaîne de pensée et arbre de pensée

**Chaîne de pensée** : demandez à LLM de « rédiger le processus de réflexion » au lieu de donner la réponse directement.

> Mauvaise pratique : « La réponse est 42 » (boîte noire)
> Bonne pratique : « Soit x..., substituons dans la formule pour obtenir..., donc la réponse est 42 » (le processus est visible)

Il ne s'agit pas d'un mode Agent indépendant, mais de l'infrastructure sous-jacente de tous les modes - Pensée dans ReAct, Plan dans Plan-and-Execute et évaluation dans Reflection - tous reposent sur CoT.

**Arbre de pensée** : une version améliorée de CoT - pas seulement une chaîne de pensée, mais **explorez plusieurs chemins et choisissez le meilleur**.

> Question : "Comment réduire la latence de l'API de recherche de 2s à 200ms ?"
>
> Chemin A : Passer à un fournisseur d'API plus rapide → Augmentation des coûts par 3 → Non recommandé
> Chemin B : Ajouter une couche de cache → Taux de réussite inconnu → Besoin d'évaluer
> Chemin C : demandez simultanément plusieurs API et obtenez le retour le plus rapide → Complexité accrue → Cela vaut la peine d'essayer
>
> Évaluation : le chemin C peut atteindre l'objectif si le coût est contrôlable → Sélectionnez le chemin C

**Scénarios applicables** : décisions complexes nécessitant l'exploration de plusieurs solutions (conception d'architecture, sélection de solutions)

## Deuxième niveau : mode de collaboration multi-agents

Lorsqu'un seul agent n'est pas suffisamment compétent, plusieurs agents professionnels doivent collaborer. Cela entre dans le domaine de l’orchestration.

### 06 Superviseur — Le superviseur attribue les tâches

Un « agent superviseur » est chargé de comprendre les intentions des utilisateurs, de décomposer les tâches et de les distribuer aux agents professionnels pour exécution.

> Utilisateur : "Aidez-moi à faire un rapport hebdomadaire sur l'industrie de l'IA"
>
> Agent superviseur :
> → Agent de collecte d'informations : « Collectez les principales actualités de l'industrie de l'IA cette semaine »
> → Agent financier : "Recueillez cette semaine les tendances boursières des sociétés liées à l'IA"
> → Agent de recherche : « Collectez les articles importants cette semaine »
> ← Résumer les résultats de tous les agents → Intégrer dans les rapports hebdomadaires → Envoyer aux utilisateurs

💡 **Une pratique courante** consiste pour un agent superviseur à coordonner des agents spécialisés tels que la collecte d'informations, les finances et la recherche.

**Avantages** : Responsabilités claires, chaque agent se concentre sur son propre domaine
**Inconvénients** : le superviseur constitue un goulot d'étranglement à un seul point ; si la décomposition des tâches est erronée, l’ensemble du pipeline déraillera.

### 07 Hiérarchique — Gestion hiérarchique

Une version améliorée de Supervisor - **Chaîne de commandement à plusieurs niveaux**.

```text
协调 Agent
├── 产品负责人 Agent — 负责产品相关任务
│   ├── 竞品分析 Agent — 数据搜集
│   └── 用户研究 Agent — 数据搜集
├── 技术负责人 Agent — 负责技术任务
│   ├── 前端开发 Agent
│   └── 后端开发 Agent
└── 运营负责人 Agent — 负责运营任务
    ├── 数据分析 Agent
    └── 内容创作 Agent
```

**Différence avec le superviseur** : le superviseur est « plat » : un seul patron gère directement tout le monde. La hiérarchie est « en forme d’arborescence » – avec une couche de gestion intermédiaire qui peut gérer des tâches plus importantes.

### 08 Swarm — Essaim d'abeilles décentralisé

Il n'y a pas de contrôle central et la collaboration entre les agents s'effectue via **Handoff**.

> Utilisateur : "Je souhaite réserver un billet d'avion de Pékin à Shanghai"
>
> Agent de routage :
> Analyser l'intention → Identifié comme « Réservation de vol »
> → Remettre la carte à l'agent de billetterie
>
> Agent de billetterie :
> Rechercher des vols → Vous devez vous connecter
> → Remettre la carte à main à l'agent d'authentification
>
> Agent d'authentification :
> Guider les utilisateurs pour se connecter → Connexion réussie
> → Agent de billets de retour de carte à main
>
> Agent de billetterie :
> Continuer le processus de réservation → Terminer

**Transfert** : une fois que l'agent A a terminé sa partie, il transmet le contexte à l'agent B pour qu'il continue. Il n’y a pas de manager global et chaque Agent n’est responsable que de ses propres responsabilités.

**Avantages** : Flexible, évolutif, sans goulot d'étranglement unique
**Inconvénients** : Le processus est difficile à suivre ; si la logique de transfert n'est pas conçue correctement, les tâches feront un « ping-pong » entre les agents.

**Implémentation typique** : le framework OpenAI Swarm est conçu sur la base de ce modèle.

### 09 Tableau noir — Tableau noir partagé

Plusieurs agents travaillent autour d'un tableau partagé, chacun écrivant des informations dessus et lisant les informations des autres.

```text
[共享黑板]
┌─────────────────────────────────┐
│ 用户需求: "做一个天气预报 App"    │
│                                 │
│ [搜索 Agent 写入]               │
│ 天气API: OpenWeatherMap 免费    │
│ 地理API: Nominatim              │
│                                 │
│ [设计 Agent 写入]               │
│ 技术栈: React + Node.js        │
│ 架构: 三层（UI/API/数据）        │
│                                 │
│ [代码 Agent 读取黑板后开始编码]  │
│ ...                            │
└─────────────────────────────────┘
```

**Différence avec le superviseur** : le superviseur est « piloté par des commandes » : le superviseur dit qui fait quoi. Blackboard est « axé sur les données » : quiconque voit les informations qu'il peut traiter les traite de manière proactive.

### 10 Pipeline/DAG — Pipeline

La tâche est décomposée en étapes fixes, chaque étape est traitée par un agent et les données la traversent en séquence.

> Entrée → [Agent de collecte] → [Agent d'analyse] → [Agent d'écriture] → [Agent d'audit] → Sortie
> Données brutes Analyse structurée Génération de rapports Contrôle qualité

- Chaque étape peut être traitée en parallèle (s'il n'y a pas de dépendances entre les étapes)
- Transmettre les données entre les étapes via des interfaces claires
- Facile à surveiller et à déboguer (l'entrée et la sortie de chaque étape sont déterminées)

**Limitations** : Faible flexibilité - le processus est fixe et ne peut pas être ajusté dynamiquement en fonction de résultats intermédiaires.

## Le troisième niveau : mémoire et modèle de connaissance

L'agent n'a pas de « vraie mémoire » et chaque conversation recommence à zéro. Le mode mémoire résout le problème de conservation des informations entre les sessions.

### 11 Mémoire à court terme – Contexte de conversation actuel

**Essence** : C'est la fenêtre contextuelle de LLM.

> Conversation en cours :
> Utilisateur : "Aidez-moi à analyser NVIDIA"
> Agent : [Appel de l'outil de recherche pour obtenir des données]
> Utilisateur : « Et AMD ?» ← L'agent sait, grâce à sa mémoire à court terme, que « analyse » fait référence à l'analyse financière

**Défi d'ingénierie** :

- **Fenêtre contextuelle limitée** : les longues conversations "oublieront" le contenu précédent (GPT-4 128K, Gemini 1M, GLM 128K)
- **Accumulation de bruit** : Plus la conversation est longue, plus les informations sont non pertinentes, ce qui affecte la qualité du raisonnement
- **Coût** : Nombre de jetons = argent, contexte long = coût élevé

**Pratique d'ingénierie** : compression de conversation (résumé régulier), fenêtre glissante (seuls les N tours les plus récents sont conservés), amélioration de la récupération (récupération des fragments pertinents à la demande)

### 12 Mémoire à long terme – conservation des connaissances au fil des sessions

Laissez l'agent conserver les informations entre les sessions, en se souvenant de qui vous êtes, de ce que vous avez fait et de vos préférences.

| Méthode | Principe | Avantages | Inconvénients |
| --- | --- | --- | --- |
| **Mémoire de fichiers** | Lire et écrire MEMORY.md / .learnings/ | Simple, transparent, vérifiable | Entretien manuel à gros grains |
| **Mémoire vectorielle** | Les informations sont stockées dans la base de données vectorielles après l'intégration | Récupération sémantique, association automatique | Une infrastructure supplémentaire est nécessaire |
| **Mémoire structurée** | Graphe de connaissances, base de données relationnelle | Requête précise, forte capacité de raisonnement | Coût de construction élevé |

💡 **Une pratique courante de mémoire de documents** : utilisez des documents de mémoire à long terme pour enregistrer des faits stables, enregistrez le contexte d'origine sous forme d'enregistrements classés par date, puis utilisez les journaux d'apprentissage pour accumuler les erreurs et les améliorations.

### 13 RAG — Génération d'amélioration de récupération

Au lieu de laisser LLM « mémoriser » toutes les connaissances, il récupère les informations pertinentes d'une base de connaissances externe lorsque cela est nécessaire et les injecte dans les mots d'invite.

> Utilisateur : "De quoi avons-nous discuté le 02/04/2026 ?"
>
> → Recherche dans la base de données vectorielles : query="2026-04-02 Discussion"
> → Récupéré : fragments de mémoire pertinents/2026-04-02.md
> → Injecter dans l'invite : "Répondez aux questions des utilisateurs en fonction du contexte suivant : [résultats de récupération]"
> → LLM génère des réponses

💡 **RAG est un "moteur de recherche" en mode mémoire** - il ne résout pas "comment enregistrer", mais "comment trouver rapidement les informations requises".

## La quatrième couche : mode d'ingénierie au niveau de la production

Entre les prototypes académiques et les systèmes de production utilisables se trouve la pratique de l’ingénierie.

### 14 Garde-corps — Garde-corps de sécurité

Définissez des **contraintes de limites** sur le comportement de l'agent pour l'empêcher de faire des choses qu'il ne devrait pas faire.

```text
[输入护栏]                          [输出护栏]
用户输入 → ┌──────────┐ → LLM → ┌──────────┐ → 最终输出
          │ 过滤敏感词  │         │ 验证事实   │
          │ 检测注入    │         │ 检查格式   │
          │ 限制话题    │         │ 过滤有害内容│
          └──────────┘         └──────────┘
```

| Couches | Exemples |
| --- | --- |
| **Vérification des entrées** | Détecter l'injection rapide, filtrer les instructions sensibles |
| **Autorisations des outils** | liste blanche des commandes exec, l'opération d'écriture de fichier nécessite une confirmation |
| **Audit de sortie** | Vérification des faits, validation du format, filtrage des informations sensibles |
| **Contraintes comportementales** | Restreindre l'agent à accéder uniquement à des sources de données spécifiques et ne peut pas envoyer de messages externes |

### 15 Human-in-the-Loop — Personnes dans la boucle

L'agent n'est pas complètement autonome et **les décisions clés nécessitent une confirmation humaine**.

> Agent : "Je vais supprimer le répertoire /tmp/old-data/, avec un total de 342 fichiers. Confirmer la suppression ?"
> Humain : [Confirmer] / [Refuser] / [Modifier : Supprimer uniquement les fichiers .log]

| Type de décision | Degré d'automatisation | Raison |
| --- | --- | --- |
| Lire des fichiers et rechercher | Entièrement automatique | Aucun effet secondaire |
| Écrire le fichier à l'emplacement spécifié | Semi-automatique | Peut écraser le contenu existant |
| Envoyer un message aux autres | Nécessite une confirmation | A une influence externe |
| Supprimer des données | Confirmation requise | Fonctionnement irréversible |
| Exécuter des commandes shell | Classés par risque | Peut affecter la sécurité du système |

**Implémentation technique** : la porte d'approbation est une implémentation typique de Human-in-the-Loop.

### 16 Repli et nouvelle tentative — Tolérance aux pannes et rétrogradation

Chaque étape de l'agent peut échouer et le système doit être capable de gérer les échecs avec élégance.

```text
搜索请求 → web_search(Gemini)
              ↓ 429 限流
           unified-search(Tavily)
              ↓ 无结果
           unified-search(Exa)
              ↓ 全部失败
           返回提示: "搜索服务暂时不可用，请稍后重试"
```

💡 **Une couche de recherche robuste** peut basculer automatiquement vers des sources de sauvegarde lorsque la source de recherche principale n'a aucun résultat et fournir aux utilisateurs des résultats déclassés significatifs.

**Principes de conception tolérants aux pannes** :

1. **Fail Fast** : n'attendez pas trop longtemps une opération vouée à l'échec.
2. **Rétrogradation significative** : La solution de secours ne peut pas être "ne peut rien faire", mais doit fournir certaines fonctions.
3. **Il y a une limite supérieure pour les tentatives** : Nouvelles tentatives infinies = boucle infinie, le nombre maximum de tentatives doit être défini
4. **Enregistrez la raison de l'échec** : écrivez l'échec dans une file d'attente d'erreurs structurée pour une analyse et une amélioration ultérieures.

### 17 Auto-amélioration — Auto-évolution

Les agents peuvent apprendre de leurs propres erreurs et s’améliorer continuellement.

```text
执行任务 → 出错 → 记录错误 → 分析模式 → 提炼规则 → 下次避免
                                                    ↑
                                              注入到行为中
```

**Une implémentation typique** :

- Détecter automatiquement les erreurs après l'appel de l'outil et écrire dans la file d'attente d'erreurs structurée
- Injectez des rappels d'apprentissage en attente avant de créer des mots d'invite
- Archivez les erreurs grâce à un examen régulier, détectez les modèles récurrents et promouvez les règles vers des configurations stables

💡 **Key Insight** : Le cœur de l'auto-évolution n'est pas "l'apprentissage" en soi - LLM apprend intrinsèquement à partir du contexte. L’essentiel est de rendre l’apprentissage continu, systématique et automatisé au lieu de s’appuyer sur des rappels manuels.

## Panorama des motifs

```text
[生产级工程层]
├ Guardrails
├ Human-in-Loop
├ Fallback
└ Self-Improvement

[多 Agent 编排层]
├ Supervisor
├ Hierarchical
├ Swarm
├ Blackboard
└ Pipeline

[记忆与知识层]
├ 短期记忆
├ 长期记忆
└ RAG

[单 Agent 核心层]
├ ReAct
├ Plan-Execute
├ Reflection
└ Tool Use · CoT / ToT
```

Un système d'agent complet utilise généralement : **ReAct** (appeler des outils tout en réfléchissant), **Utilisation des outils**, **Superviseur** (coordonner les agents professionnels), **Mémoire de fichiers**, **Garde-corps**, **Human-in-the-Loop**, **Fallback** et **Auto-amélioration**. Ensemble, ces modèles forment un système fonctionnel et gouvernable.

## Guide de sélection

| Caractéristiques des tâches | Mode recommandé | Raisons |
| --- | --- | --- |
| Questions et réponses simples | **ReAct + Utilisation des outils** | Peut être résolu en une ou deux étapes, aucune planification compliquée requise |
| Recherche en plusieurs étapes | **Planifier et exécuter + ReAct** | Nécessite une vision globale, mais de la flexibilité à chaque étape |
| Génération de codes | **Utilisation de l'outil + Réflexion** | Besoin d'exécuter le code et de le corriger |
| Collaboration multi-domaines | **Superviseur / Hiérarchique** | Nécessite une division professionnelle du travail |
| Traitement à haute concurrence | **Essaim / Pipeline** | Aucune coordination centrale requise, peut être parallélisé |
| Intensif en connaissances | **RAG + Mémoire à long terme** | Besoin de récupérer de grandes quantités de connaissances |
| Sensible à la sécurité | **Garde-corps + Human-in-Loop** | Contraintes et confirmations requises |
| Fonctionnement à long terme | **Auto-amélioration + repli** | Besoin d'apprendre de ses erreurs et de tolérance aux pannes |

## Résumé : choisissez d'abord le mode tâche, puis parlez de la structure du code

À ce stade, vous devriez être en mesure de déterminer comment un agent doit fonctionner : s'il faut y penser en le faisant, ou s'il doit être planifié puis exécuté ; s'il doit être coordonné par un superviseur ou s'il doit être confié de manière autonome par un agent professionnel ; ce qui doit être mémorisé et quelles actions clés doivent être arrêtées pour confirmation.

Ces choix déterminent les limites comportementales du système. L'étape suivante consiste à organiser ces fonctionnalités en structures de code remplaçables, observables et récupérables.

## Article suivant : Modèle de conception technique des agents IA

Le prochain article ne discutera plus de ce que l'Agent doit faire, mais discutera de la mise en œuvre de l'ingénierie : comment remplacer les fournisseurs d'outils, comment condenser la logique transversale, comment récupérer des tâches longues et comment utiliser des modèles de conception logicielle classiques pour rendre le système Agent plus stable et plus facile à évoluer.
