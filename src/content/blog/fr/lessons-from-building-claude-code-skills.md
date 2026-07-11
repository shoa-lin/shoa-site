---
translationKey: "lessons-from-building-claude-code-skills"
locale: "fr"
title: "Leçons tirées de la création de Claude Code : notre usage des Skills"
description: "Ce que l'équipe Claude Code a appris en concevant, organisant et maintenant des centaines de Skills."
publishedAt: "2026-03-17"
updatedAt: "2026-03-17"
category: "development"
sourceLocale: "en"
sourceUrl: "https://x.com/trq212/status/2033949937936085378"
sourceAuthor: "Thariq Shihipar"
contentType: "adaptation"
translationStatus: "reviewed"
---

![Image de couverture de « Leçons tirées de la création de Claude Code : notre usage des Skills »](https://pbs.twimg.com/media/HDl2jn9a0AAZkyz?format=jpg&name=small)

Les Skills sont devenus l'un des points d'extension les plus utilisés dans Claude Code. Ils sont souples, faciles à créer et simples à distribuer.

Cette souplesse rend aussi les bonnes pratiques difficiles à cerner. Quels Skills méritent d'être créés ? Quel est le secret d'un bon Skill ? À quel moment faut-il le partager avec d'autres personnes ?

Chez Anthropic, nous utilisons massivement les Skills dans Claude Code, avec plusieurs centaines actuellement en service. Voici les enseignements que nous avons tirés de leur utilisation pour accélérer le développement.

---

## Que sont les Skills ?

Si vous découvrez les Skills, commencez par [lire la documentation](https://code.claude.com/docs/en/skills) ou par suivre le dernier [cours Skilljar consacré aux Agent Skills](https://anthropic.skilljar.com/introduction-to-agent-skills). Cet article suppose que vous en connaissez déjà les bases.

Une idée reçue consiste à dire que les Skills ne sont « que des fichiers markdown ». Leur intérêt vient précisément du fait qu'ils ne se résument pas à des fichiers texte : ce sont des dossiers qui peuvent contenir des scripts, des assets, des données et d'autres ressources qu'un agent peut découvrir, explorer et manipuler.

Dans Claude Code, les Skills proposent également [de nombreuses options de configuration](https://code.claude.com/docs/en/skills#frontmatter-reference), notamment des hooks dynamiques.

Certains des Skills les plus intéressants exploitent avec créativité ces options de configuration et leur structure de dossiers.

---

## Les différents types de Skills

Après avoir catalogué nos Skills, nous avons constaté qu'ils se regroupaient autour de quelques catégories récurrentes. Les meilleurs Skills entrent clairement dans une catégorie ; les plus déroutants en chevauchent plusieurs. Cette liste n'est pas exhaustive, mais elle constitue un bon cadre pour repérer ce qui manque peut-être dans votre organisation.

![Graphique des catégories courantes de Skills](https://pbs.twimg.com/media/HDlvMmubEAIzF-N?format=jpg&name=small)

---

### 1. Références de bibliothèques et d'API

Ces Skills expliquent comment utiliser correctement une bibliothèque, une CLI ou un SDK. Ils peuvent couvrir des bibliothèques internes ou des outils courants que Claude Code maîtrise parfois moins bien. Ils contiennent souvent des extraits de code de référence et une liste de points d'attention (Gotchas) que Claude doit éviter lorsqu'il écrit des scripts.

**Exemples :**

- **billing-lib** - Les cas limites, pièges et autres détails à risque de votre bibliothèque de facturation interne
- **internal-platform-cli** - Chaque sous-commande de votre wrapper CLI interne, avec des exemples indiquant quand utiliser chacune d'elles
- **frontend-design** - Aide Claude à mieux appliquer votre design system

---

### 2. Vérification produit

Ces Skills expliquent comment tester ou vérifier que le code fonctionne. Ils sont souvent associés à des outils externes comme Playwright ou tmux.

Les Skills de vérification sont extrêmement utiles pour garantir la justesse des résultats produits par Claude. Il peut être tout à fait rentable de confier à un ingénieur une semaine de travail pour les rendre excellents.

Vous pouvez, par exemple, enregistrer une vidéo afin de voir exactement ce que Claude a testé, ou imposer des assertions programmatiques sur l'état à chaque étape. Ces capacités sont souvent mises en œuvre au moyen de scripts inclus dans le Skill.

**Exemples :**

- **signup-flow-driver** - Exécute inscription -> vérification de l'adresse e-mail -> onboarding dans un navigateur headless, avec des hooks qui vérifient l'état à chaque étape
- **checkout-verifier** - Pilote l'interface de paiement avec des cartes de test Stripe et vérifie que la facture atteint l'état attendu
- **tmux-cli-driver** - Teste les CLI interactives lorsque le workflow exige un TTY

---

### 3. Collecte et analyse de données

Ces Skills se connectent aux systèmes de données et de monitoring. Ils peuvent inclure des bibliothèques qui récupèrent des données authentifiées, des identifiants précis de dashboards et des instructions pour les workflows ou requêtes courants.

**Exemples :**

- **funnel-query** - Indique quels événements joindre pour inscription -> activation -> paiement, ainsi que la table qui contient le `user_id` de référence
- **cohort-compare** - Compare la rétention ou la conversion de deux cohortes, signale les écarts statistiquement significatifs et renvoie vers les définitions des segments
- **grafana** - Contient les UID des sources de données, les noms des clusters et une table de correspondance entre problèmes et dashboards

---

### 4. Processus métier et automatisation d'équipe

Ces Skills transforment des workflows répétitifs en une seule commande. Leurs instructions sont souvent simples, mais ils peuvent dépendre d'autres Skills ou de MCPs. Conserver les résultats précédents dans des fichiers de log aide le modèle à rester cohérent et à tirer parti des exécutions antérieures.

**Exemples :**

- **standup-post** - Agrège un outil de suivi des tickets, l'activité GitHub et les précédents messages Slack pour produire un stand-up formaté qui ne présente que les changements
- **create-<ticket-system>-ticket** - Impose un schéma avec des valeurs d'énumération valides et des champs obligatoires, puis exécute le workflow post-création, par exemple notifier un reviewer et ajouter le lien du ticket dans Slack
- **weekly-recap** - Transforme les PR fusionnées, les tickets clôturés et les déploiements en un récapitulatif formaté

---

### 5. Scaffolding de code et modèles

Ces Skills génèrent le boilerplate d'un framework pour une fonction précise de la codebase. Ils peuvent combiner des consignes en langage naturel avec des scripts composables, ce qui est particulièrement utile lorsque les exigences de scaffolding ne peuvent pas être entièrement exprimées dans le code.

**Exemples :**

- **new-<framework>-workflow** - Génère un nouveau service, workflow ou handler avec vos annotations
- **new-migration** - Fournit votre modèle de migration et les points d'attention (Gotchas) courants
- **create-app** - Crée une application interne dont l'authentification, les logs et la configuration de déploiement sont déjà raccordés

---

### 6. Qualité du code et review

Ces Skills appliquent les règles de qualité du code d'une organisation et facilitent la review. Ils peuvent inclure des scripts ou outils déterministes pour gagner en robustesse, et s'exécuter automatiquement au moyen de hooks ou de GitHub Actions.

**Exemples :**

- **adversarial-review** - Lance un subagent au regard neuf pour critiquer le travail, applique les corrections et itère jusqu'à ce que les constats restants ne soient plus que des détails mineurs
- **code-style** - Fait respecter les styles de code que Claude gère mal par défaut
- **testing-practices** - Explique comment écrire les tests et ce qu'il faut tester

---

### 7. CI/CD et déploiement

Ces Skills aident à récupérer, pousser et déployer du code. Ils peuvent appeler d'autres Skills pour collecter des données.

**Exemples :**

- **babysit-pr** - Surveille une PR -> relance la CI instable -> résout les conflits de fusion -> active l'auto-merge
- **deploy-<service>** - Construit -> exécute des smoke tests -> déploie progressivement le trafic en comparant les taux d'erreur -> effectue automatiquement un rollback en cas de régression
- **cherry-pick-prod** - Crée un worktree isolé -> exécute le cherry-pick -> résout les conflits -> ouvre une PR avec le bon modèle

---

### 8. Runbooks

Ces Skills partent d'un symptôme, comme un thread Slack, une alerte ou une signature d'erreur, conduisent une investigation à l'aide de plusieurs outils et produisent un rapport structuré.

**Exemples :**

- **<service>-debugging** - Établit une correspondance symptômes -> outils -> modèles de requêtes pour les services à fort trafic
- **oncall-runner** - Récupère l'alerte -> vérifie les causes habituelles -> met en forme les constats
- **log-correlator** - À partir d'un identifiant de requête, extrait les logs correspondants de tous les systèmes susceptibles de l'avoir traitée

---

### 9. Opérations d'infrastructure

Ces Skills exécutent des opérations de maintenance et des procédures opérationnelles courantes. Certaines impliquent des actions destructrices et nécessitent des garde-fous solides. Ils permettent aux ingénieurs de suivre plus facilement les bonnes pratiques pendant les opérations critiques.

**Exemples :**

- **<resource>-orphans** - Repère les pods ou volumes orphelins -> publie le résultat dans Slack -> attend une période d'observation -> demande confirmation à l'utilisateur -> effectue le nettoyage en cascade
- **dependency-management** - Met en œuvre le workflow d'approbation des dépendances de l'organisation
- **cost-investigation** - Recherche pourquoi les coûts de stockage ou d'egress ont bondi, à l'aide des buckets et modèles de requêtes pertinents

---

## Conseils pour créer des Skills

![Synthèse des conseils pour créer des Skills](https://pbs.twimg.com/media/HDoKg58bEAAL1bw?format=jpg&name=small)

Une fois le Skill choisi, comment faut-il l'écrire ? Voici les pratiques et techniques qui nous ont donné les meilleurs résultats.

Nous avons également publié récemment [Skill Creator](https://claude.com/blog/improving-skill-creator-test-measure-and-refine-agent-skills), afin de faciliter la création de Skills dans Claude Code.

---

### N'énoncez pas l'évidence

Claude Code connaît déjà beaucoup de choses sur votre codebase, et Claude possède de solides connaissances en programmation, avec de nombreuses préférences par défaut. Si un Skill sert principalement à transmettre des connaissances, concentrez-vous sur les informations qui amènent Claude au-delà de ses réflexes habituels.

Le [Skill frontend design](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) en est un très bon exemple. Un ingénieur d'Anthropic l'a construit en itérant avec des clients pour améliorer le goût visuel de Claude et éviter des choix trop familiers comme la police Inter ou les dégradés violets.

---

### Créez une section « Points d'attention » (Gotchas)

![Exemple de section consacrée aux points d'attention (Gotchas)](https://pbs.twimg.com/media/HDlwEG1bEAUdmcV?format=jpg&name=small)

Dans un Skill, la section la plus riche en informations utiles est souvent celle des points d'attention (Gotchas). Construisez-la à partir des erreurs fréquentes que Claude rencontre en utilisant le Skill, puis enrichissez-la à mesure que de nouveaux cas apparaissent.

---

### Exploitez le système de fichiers et la divulgation progressive

![Structure de dossier d'un Skill utilisée pour la divulgation progressive](https://pbs.twimg.com/media/HDlwhSjbEAIJSc9?format=jpg&name=small)

Un Skill est un dossier, pas seulement un fichier markdown. Considérez l'ensemble du système de fichiers comme un outil d'ingénierie du contexte et de divulgation progressive. Indiquez à Claude quels fichiers contient le Skill ; il pourra les lire lorsqu'ils deviendront pertinents.

La forme la plus simple de divulgation progressive consiste à orienter Claude vers d'autres fichiers markdown. Les signatures détaillées des fonctions et leurs exemples d'utilisation peuvent, par exemple, être placés dans `references/api.md`.

Si le résultat final est un document markdown, le Skill peut fournir dans `assets/` un modèle que Claude copiera et utilisera.

Des dossiers consacrés aux références, scripts, exemples et autres ressources aident Claude à travailler plus efficacement.

---

### Évitez d'enfermer Claude dans un chemin unique

Claude cherche généralement à suivre les instructions de près. Comme les Skills sont très réutilisables, des consignes trop spécifiques peuvent les rendre fragiles. Donnez à Claude les informations dont il a besoin tout en lui laissant assez de latitude pour s'adapter à la situation.

![Comparaison entre des consignes souples et des instructions trop restrictives](https://pbs.twimg.com/media/HDlwurvbEAM5ZNu?format=jpg&name=small)

---

### Réfléchissez à la configuration initiale

![Exemple de configuration initiale d'un Skill](https://pbs.twimg.com/media/HDlw1mYbEAY-Bul?format=jpg&name=small)

Certains Skills ont besoin d'informations fournies par l'utilisateur lors de leur configuration. Par exemple, si un Skill publie un stand-up dans Slack, Claude devra peut-être demander quel canal Slack utiliser.

Une bonne pratique consiste à stocker ces informations dans un fichier `config.json` placé dans le dossier du Skill. Si la configuration manque, l'agent peut la demander à l'utilisateur.

Pour présenter des questions structurées à choix multiples, indiquez à Claude d'utiliser l'outil AskUserQuestion.

---

### Le champ Description est destiné au modèle

Au démarrage d'une session, Claude Code construit la liste de tous les Skills disponibles avec leur description. Claude parcourt cette liste pour répondre à la question : « Existe-t-il un Skill pour cette demande ? » La description n'est donc pas un résumé ; elle précise dans quelles situations le modèle doit déclencher le Skill.

![Exemple de description d'un Skill rédigée pour son déclenchement par le modèle](https://pbs.twimg.com/media/HDlw5ULbEAQOqtJ?format=jpg&name=small)

---

### Mémoire et stockage des données

![Exemple de stockage de mémoire et de données pour un Skill](https://pbs.twimg.com/media/HDoImh1bEAU-mMI?format=jpg&name=small)

Certains Skills peuvent disposer d'une mémoire en stockant des données. Cela peut aller d'un simple fichier texte ou JSON alimenté uniquement par ajout à une base de données SQLite.

Par exemple, un Skill `standup-post` peut conserver dans `standups.log` tous les messages qu'il a rédigés. Lors de l'exécution suivante, Claude peut relire cet historique et identifier ce qui a changé depuis la veille.

Les données placées dans le dossier du Skill risquent d'être supprimées lors de sa mise à niveau. Stockez les données durables dans un emplacement stable ; à ce jour, `${CLAUDE_PLUGIN_DATA}` fournit un dossier stable pour chaque plugin.

---

### Stockez des scripts et générez du code

Le code est l'un des outils les plus puissants que vous puissiez fournir à Claude. Les scripts et les bibliothèques lui permettent de consacrer ses tours à composer des capacités et à décider de la suite, au lieu de reconstruire sans cesse le même boilerplate.

Un Skill de data science peut, par exemple, inclure des fonctions qui récupèrent des données depuis une source d'événements. Donnez à Claude un ensemble de fonctions utilitaires (helper functions) afin qu'il puisse composer des analyses plus complexes :

![Exemple de bibliothèque de fonctions utilitaires dans un Skill](https://pbs.twimg.com/media/HDlxbtkbkAAOse7?format=jpg&name=small)

Claude peut ensuite générer à la volée des scripts qui combinent ces fonctions pour répondre à des demandes comme « Que s'est-il passé mardi ? »

![Exemple de script généré par Claude à partir de fonctions utilitaires](https://pbs.twimg.com/media/HDlxfEIb0AA2E7l?format=jpg&name=small)

---

### Hooks à la demande

Les Skills peuvent définir des hooks qui ne s'activent que lorsque le Skill est appelé et restent actifs pendant la session. Utilisez-les pour des protections très prescriptives qui seraient gênantes en permanence, mais précieuses dans certaines situations.

Exemples :

- **/careful** - Utilise un matcher PreToolUse sur Bash pour bloquer `rm -rf`, `DROP TABLE`, le force-push et `kubectl delete`. Activez-le lorsque vous intervenez en production ; le laisser actif en permanence serait insupportable.
- **/freeze** - Bloque toute opération Edit/Write en dehors d'un dossier précis. Ce Skill est utile pendant un débogage lorsque vous souhaitez ajouter des logs sans « corriger » accidentellement du code sans rapport.

---

## Distribuer les Skills

L'un des principaux avantages des Skills est de pouvoir les partager avec le reste de l'équipe.

Il existe deux modes de distribution courants :

- Versionner les Skills dans le dépôt sous `./.claude/skills`
- Créer un plugin et une marketplace de plugins Claude Code où les utilisateurs peuvent l'installer ; consultez la [documentation sur les marketplaces de plugins](https://code.claude.com/docs/en/plugin-marketplaces)

Pour les petites équipes qui travaillent sur un nombre relativement limité de dépôts, versionner les Skills dans chaque dépôt fonctionne bien. Chaque Skill ajouté au dépôt consomme toutefois un peu de contexte supplémentaire pour le modèle. À plus grande échelle, une marketplace interne de plugins permet à l'organisation de distribuer les Skills tout en laissant chaque équipe choisir ceux qu'elle installe.

---

### Gérer une marketplace

Comment une équipe doit-elle décider quels Skills entrent dans la marketplace, et comment les membres doivent-ils les proposer ?

Chez Anthropic, aucune équipe centrale ne prend toutes les décisions. Les Skills utiles émergent de manière organique. Leur owner peut déposer un Skill dans un dossier sandbox sur GitHub, puis le faire connaître dans Slack ou sur un autre forum.

Une fois que le Skill a suscité assez d'intérêt, selon l'appréciation de son owner, celui-ci peut ouvrir une PR pour le déplacer dans la marketplace.

Comme il est facile de créer des Skills médiocres ou redondants, une forme de sélection reste importante avant leur publication.

---

### Composer des Skills

Les Skills peuvent dépendre les uns des autres. Un Skill d'upload de fichiers peut se charger de l'envoi, tandis qu'un Skill de génération de CSV crée le fichier puis appelle le Skill d'upload. Les marketplaces et les Skills ne proposent pas encore de gestion native des dépendances, mais un Skill peut en référencer un autre par son nom ; le modèle l'appellera s'il est installé.

---

### Mesurer les Skills

Pour comprendre les performances d'un Skill, nous utilisons un hook PreToolUse qui enregistre l'utilisation des Skills au sein de l'entreprise. Le [code d'exemple](https://gist.github.com/ThariqS/24defad423d701746e23dc19aace4de5) illustre cette approche. Nous pouvons ainsi voir quels Skills sont populaires et lesquels se déclenchent moins souvent que prévu.

---

## Conclusion

Les Skills sont des outils puissants et souples pour les agents, mais le domaine reste jeune et tout le monde apprend encore à bien les utiliser.

Considérez ces enseignements comme un assortiment de techniques utiles plutôt que comme un guide définitif. La meilleure façon de comprendre les Skills consiste à commencer, expérimenter et observer ce qui fonctionne. La plupart de nos Skills ont débuté avec quelques lignes et un seul point d'attention (Gotcha), puis se sont améliorés à mesure que chacun ajoutait un nouvel enseignement lorsque Claude rencontrait un autre cas limite.

J'espère que cet article vous aura été utile. N'hésitez pas à me faire part de vos questions.
