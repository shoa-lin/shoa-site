---
translationKey: "ai-agent-retry-state"
locale: "fr"
title: "Quand l’IA commence à agir, Retry ne signifie plus simplement « répondre à nouveau »"
description: "De la régénération d’un Chatbot au Fork de Codex : pourquoi le Retry d’un Agent touche à l’état de la conversation, de l’exécution, des systèmes externes et de l’audit."
publishedAt: "2026-07-15"
updatedAt: "2026-07-15"
category: "architecture"
sourceLocale: "zh"
sourceUrl: "https://www.bydziwen.top/blog/ai-agent-retry-state/"
sourceAuthor: "Shoa Lin"
contentType: "original"
translationStatus: "reviewed"
---

## La conclusion d’abord

**Lorsque l’IA ne fait que générer du texte, Retry consiste à produire une autre réponse. Lorsqu’elle commence à agir sur le monde réel, Retry peut signifier exécuter à nouveau toute la tâche.**

Cette distinction permet de comprendre pourquoi les produits Agent comme Codex ne mettent plus en avant le bouton traditionnel « Régénérer » :

- Le Retry d’un Chatbot remplace généralement un simple texte.
- Une exécution d’Agent peut déjà avoir modifié des fichiers, lancé des commandes ou appelé des outils externes.
- Au début de la deuxième exécution, le monde n’est plus dans l’état qui précédait la première.
- Il est donc plus sûr de fournir un feedback, de relancer uniquement l’étape en échec ou de créer un Fork depuis un état clairement identifié.

Une précision est essentielle : aucune source officielle n’affirme que Codex a « supprimé Retry parce que l’état était devenu trop complexe ». Cet article propose une lecture architecturale fondée sur les notions publiques de Thread, Turn, Item et Fork.

![Du Retry qui génère une autre réponse à une branche qui conserve l’historique](/assets/blog/ai-agent-retry-state/retry-becomes-fork.png)

Avec les premiers Chatbots, je m’étais habitué à une petite fonction : **Retry**, souvent appelée **Régénérer**.

On posait une question, l’IA répondait, et si la réponse ne convenait pas, un clic suffisait pour en obtenir une autre, sans reformuler la demande.

Ce geste semblait si naturel qu’en commençant à utiliser Codex, une question m’est venue : **pourquoi le bouton « Régénérer » n’y est-il plus aussi visible ?**

S’agit-il simplement d’une fonction oubliée ? Ou un produit Agent exige-t-il un autre modèle d’interaction ?

L’explication qui me paraît aujourd’hui la plus juste est la suivante :

> Lorsque l’IA ne fait que générer du texte, Retry consiste à produire une autre réponse. Lorsqu’elle commence à agir sur le monde réel, Retry peut signifier exécuter à nouveau toute la tâche.

La différence semble tenir à un bouton, mais elle sépare deux systèmes fondamentalement différents.

## Pourquoi Retry était simple à l’époque des Chatbots

L’interaction d’un Chatbot traditionnel ressemble à ceci :

```text
用户问题 → 模型生成 → 回答 A
                   └→ Retry → 回答 B
```

Si la première réponse n’est pas satisfaisante, le système peut conserver le même contexte et demander au modèle d’en générer une autre. Abandonner la première réponse entraîne rarement une conséquence sérieuse.

Dans la plupart des cas, le Chatbot n’a modifié que le texte affiché à l’écran :

- Il n’a modifié aucun fichier local.
- Il n’a exécuté aucune commande.
- Il n’a changé aucune branche Git.
- Il n’a écrit aucune donnée dans un système externe.
- Il n’a envoyé aucun e-mail impossible à rappeler.

L’expérience ressemble à demander à quelqu’un de répondre autrement à la même question. Si la première feuille ne convient pas, on la froisse et on recommence.

Le Retry d’un Chatbot peut donc se résumer ainsi : **conserver l’entrée, abandonner la sortie et générer un nouveau candidat.**

## Codex ne renvoie pas seulement une « réponse »

Un Agent comme Codex peut avoir accompli de nombreuses actions avant de rédiger son message final.

Dans le modèle du Codex App Server, un Thread contient plusieurs Turns, et chaque Turn contient plusieurs Items. Ces Items ne se limitent pas aux messages de l’utilisateur et de l’IA : ils peuvent aussi représenter des commandes, des modifications de fichiers et des appels d’outils.

Le dernier texte affiché dans l’interface n’est parfois qu’un résumé du travail effectué :

```text
用户任务
   │
   ▼
理解仓库与上下文
   │
   ▼
读取文件 → 运行命令 → 调用工具 → 修改代码 → 执行测试
   │
   ▼
最终回复：“已经修改了这些内容……”
```

Si l’utilisateur n’aime pas ce message final, que doit réellement répéter Retry ?

Faut-il seulement réécrire le résumé ? Reprendre le raisonnement ? Relancer toutes les commandes ? Ou annuler d’abord les changements déjà produits avant de recommencer ?

À partir de là, Retry n’est plus une opération simple.

## Lors de la deuxième exécution, le monde a déjà changé

Imaginons que je demande à Codex :

> Corrige ce bug, exécute les tests, puis ouvre une Pull Request.

Lors de la première exécution, Codex peut déjà avoir :

1. Lu le code et localisé le problème.
2. Modifié trois fichiers.
3. Exécuté la suite de tests.
4. Créé une nouvelle branche.
5. Commité et poussé les changements.
6. Ouvert une Pull Request.

Que devrait-il se passer si j’appuie maintenant sur Retry ?

- Régénérer uniquement le texte peut produire un compte rendu qui ne correspond plus aux actions effectuées.
- Reprendre le raisonnement commence depuis un dépôt déjà modifié.
- Rejouer les outils peut créer des commits en double, des branches concurrentes ou une seconde PR.
- Annuler d’abord les changements peut être impossible pour certaines actions externes.

Un fichier peut être restauré, mais un e-mail est peut-être déjà parti. Une branche locale peut être supprimée, alors qu’une approbation, un message ou une transaction dans un système externe ne peuvent pas toujours être effacés sans laisser de trace.

Le vrai problème n’est donc pas seulement que « les informations intermédiaires sont complexes » :

> Une exécution d’Agent crée une véritable chaîne de causes et d’effets. La deuxième exécution ne commence plus dans le monde qui existait avant la première.

![Le texte peut être réécrit, mais l’Agent a déjà modifié l’état du monde](/assets/blog/ai-agent-retry-state/text-vs-world-state.png)

## Le Retry d’un Agent touche à au moins quatre états

Du point de vue du système, une tâche d’Agent peut modifier quatre formes d’état.

### 1. L’état de la conversation

Il comprend la demande de l’utilisateur, les messages précédents, les contraintes confirmées, le contexte de raisonnement et les résultats des outils.

Un Retry doit décider quelles parties de cet historique restent valides et lesquelles doivent être écartées.

### 2. L’état d’exécution

Il comprend les fichiers locaux, le working tree Git, les processus en cours, les résultats de tests, les fichiers temporaires et les dépendances installées.

La première exécution peut déjà les avoir modifiés.

### 3. L’état externe

Il comprend les Pull Requests GitHub, les enregistrements de base de données, les messages envoyés, les jobs cloud, les formulaires soumis et les systèmes tiers.

Cette catégorie est la plus risquée, car de nombreuses actions externes ne peuvent pas être totalement annulées.

### 4. L’état des permissions et de l’audit

Il consigne les actions approuvées par l’utilisateur, les outils appelés, le moment de chaque événement et les informations nécessaires pour attribuer les responsabilités.

Si Retry rejoue silencieusement une suite d’actions, la deuxième exécution est-elle couverte par la première autorisation ou nécessite-t-elle une nouvelle validation ? Comment relier les deux exécutions dans le journal d’audit ?

Lorsque ces quatre états se superposent, Retry n’est plus un bouton : il devient un mécanisme de rollback, de prévention des doublons et de gestion des branches.

## Que peut réellement signifier Retry ?

Dans un produit Agent, « réessayer » peut désigner au moins quatre opérations différentes :

```text
再写一次    → 保留已完成的工作，只重写最终回答
重新规划    → 保留当前环境，但换一条推理和执行路线
重新执行    → 再运行一次失败的命令或工具
回到分叉点  → 保留原始历史，从某个状态创建一条新分支
```

Les risques de ces opérations sont très différents, mais un seul bouton Retry masque cette distinction.

Les produits Agent auront toujours besoin de recommencer certaines opérations. Ils doivent toutefois séparer ce geste en actions dont le sens est explicite :

- Régénérer uniquement la réponse finale.
- Continuer les modifications depuis l’état actuel.
- Relancer uniquement l’étape en échec.
- Créer une nouvelle branche à partir d’ici.
- Restaurer un checkpoint, puis reprendre l’exécution.

Retry ne devient fiable que lorsque l’utilisateur et le système savent exactement ce qui va être répété.

## Codex propose Fork plutôt qu’un Retry générique

Les documents officiels confirment que Codex modélise le travail sous forme de Threads, Turns et Items, et fournit un mécanisme `fork`. Dans le Codex CLI, `/fork` copie la tâche actuelle vers une nouvelle tâche. L’App Server expose aussi `thread/fork`, qui crée un nouveau Thread tout en conservant l’historique d’origine.

Fork et Retry se ressemblent, mais ils racontent deux histoires différentes :

- Retry : « La tentative précédente ne compte pas. Recommence. »
- Fork : « La tentative précédente a réellement eu lieu. Explore maintenant une autre voie à partir d’ici. »

La première interprétation suffit souvent pour un Chatbot qui ne produit que du texte.

Pour un Agent qui modifie des fichiers, exécute des commandes et appelle des outils externes, la seconde est plus honnête et plus facile à retracer.

Fork reconnaît l’existence de l’historique. La nouvelle tentative obtient sa propre branche et sa propre identité au lieu d’écraser discrètement le processus précédent.

## Le feedback est souvent plus utile que Retry

Lorsque le résultat d’un Agent ne nous satisfait pas, nous ne voulons pas toujours recommencer toute la tâche. Nous voulons surtout expliquer ce qui ne va pas.

- Conserver la recherche, mais rendre la conclusion plus directe.
- Ne pas modifier l’API ; corriger seulement l’implémentation interne.
- Garder les résultats de tests, mais réexaminer la cause racine.
- Ne pas revenir sur le code actuel ; explorer une autre direction pour l’interface.
- Arrêter l’exécution et montrer d’abord les changements existants.

Ce type de feedback conserve le travail utile et indique précisément où l’exécution précédente s’est écartée de l’objectif.

Le Retry traditionnel s’appuie sur l’aléatoire et espère que la prochaine réponse sera meilleure. Une bonne collaboration avec un Agent ressemble davantage au travail avec un collègue : signaler l’écart, conserver ce qui est correct et converger depuis l’état actuel.

## Un petit bouton marque une frontière produit

Le fait que Codex mette moins en avant le Retry traditionnel ne signifie pas nécessairement qu’une capacité a disparu.

Il marque une frontière : l’IA passe d’une **machine à répondre** à un **système capable d’agir**.

Lorsque l’IA ne génère que du texte, l’historique peut parfois être remplacé. Dès qu’elle agit, cet historique devient une partie de l’état du système.

La question importante n’est plus seulement « peut-elle répondre à nouveau ? », mais :

- Peut-on voir précisément ce que l’exécution précédente a fait ?
- Peut-on conserver le bon travail et ne corriger que la partie erronée ?
- Peut-on créer une branche depuis un état clairement identifié ?
- Peut-on empêcher les outils et actions externes de s’exécuter deux fois ?
- Chaque tentative conserve-t-elle une relation causale traçable ?

> La disparition progressive du bouton Retry n’est pas seulement celle d’une interaction familière. Dès que l’IA peut modifier le monde réel, « réessayer » doit répondre à une question plus sérieuse : depuis quel état, et quelle action faut-il répéter ?

## Références

- [Référence des commandes Codex CLI : `/fork` et branchement des tâches](https://learn.chatgpt.com/docs/developer-commands?surface=cli)
- [Codex App Server : Thread, Turn, Item et `thread/fork`](https://learn.chatgpt.com/docs/app-server)
- [OpenAI Conversation state : historique de conversation et chaîne d’états](https://developers.openai.com/api/docs/guides/conversation-state)
- [OpenAI Function calling : déroulement d’un appel d’outil en plusieurs étapes](https://developers.openai.com/api/docs/guides/function-calling)
