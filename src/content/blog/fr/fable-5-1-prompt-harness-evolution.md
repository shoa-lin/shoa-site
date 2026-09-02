---
translationKey: "fable-5-1-prompt-harness-evolution"
locale: "fr"
title: "De Fable 5 à Fable 5.1 : le System Prompt devient un Agent OS"
description: "Comparaison de deux générations de Claude Runtime Prompt : évolution structurelle de la Memory, des Past Chats, des Skills, du routage d’outils, de la gouvernance de sécurité et avenir des Agent Harnesses."
publishedAt: "2026-09-02"
updatedAt: "2026-09-02"
category: "architecture"
sourceLocale: "zh"
sourceUrl: "https://www.bydziwen.top/blog/fable-5-1-prompt-harness-evolution/"
sourceAuthor: "Shoa Lin"
contentType: "original"
translationStatus: "reviewed"
---

## La conclusion d’abord

Anthropic a lancé Claude Fable 5.1 le 1er septembre 2026. La plupart des commentaires se concentrent sur les capacités du modèle, les prix et les benchmarks. Je m’intéresse davantage à un matériau moins spectaculaire en apparence, mais beaucoup plus révélateur de la direction du produit : **le System Prompt et le Runtime Prompt utilisés lorsque Claude fonctionne dans le produit réel.**

J’ai comparé l’archive du Runtime Prompt complet de Fable 5 datée du 9 juin 2026 à un snapshot du Runtime Prompt de Fable 5.1 obtenu le 2 septembre 2026. Le premier compte environ 1 580 lignes et 126 943 octets ; le second 2 195 lignes et 275 723 octets. Le nombre de définitions d’outils passe également de 18 à 44.

Cela ne signifie pas simplement que « le Prompt a doublé ». Une grande partie du volume vient des Tool Schemas, des exemples et de la description de l’environnement d’exécution dynamique. **La longueur n’est ni l’intelligence ni la capacité du produit.** Ce qui compte est la structure :

> Fable 5 était déjà un Agent équipé de Tools, Skills, MCP et Artifacts. Fable 5.1 commence à organiser la Memory, les conversations passées, la découverte de capacités, le routage des sorties, les permissions et la gouvernance de sécurité en un Agent Runtime plus complet.

Autrement dit, le Harness qui entoure Claude passe de « donner quelques outils au modèle » à « donner un système d’exploitation au modèle ».

## Commençons par délimiter la comparaison

Cet article ne compare ni les poids du modèle, ni ses données d’entraînement, ni le code source serveur d’Anthropic. Il compare deux **snapshots observables de Prompt et de configuration Runtime**.

Les pages publiques System Prompt d’Anthropic montrent surtout les instructions comportementales centrales utilisées sur claude.ai et dans les applications mobiles. Un snapshot Runtime complet inclut aussi les définitions d’outils disponibles dans la session, les Skills, les règles de système de fichiers, les permissions réseau, les placeholders de contexte utilisateur et les politiques de routage du produit. J’appelle donc cet ensemble un **Runtime Prompt Bundle**.

Cette comparaison permet de comprendre assez précisément comment le produit organise les capacités autour du modèle. Elle ne permet pas, à elle seule, de mesurer l’amélioration du raisonnement du modèle de base. Les capacités du modèle et celles du Harness doivent être évaluées séparément.

## Les principales évolutions en un tableau

| Dimension | Fable 5 | Fable 5.1 | Évolution structurelle |
| --- | --- | --- | --- |
| Memory | Brève description de l’accès à la mémoire | Règles complètes de classification des fichiers, extraction, lecture-écriture, versions, confidentialité et application | D’une description de fonctionnalité à un Data Plane gouverné |
| Past Chats | Pas de couche autonome de recherche des anciennes conversations | `conversation_search`, `recent_chats`, `read_conversation` | Séparation entre mémoire compressée et preuve source |
| Nombre d’outils | 18 définitions d’outils | 44 définitions d’outils | D’une boîte à outils générale à une Capability Interface plus large |
| Extension des capacités | Skills et MCP Apps | Skills, Plugin Catalog et MCP Apps | De la configuration statique à la découverte et à l’installation |
| Forme de sortie | Texte, fichiers, Artifacts, cartes, etc. | Ajout de graphiques, cartes comparatives, étapes, quiz, traduction, produits, liens et autres sorties typées | De la chaîne de caractères à des UI Types routables |
| Routage de sortie | Réparti dans les instructions de chaque outil | Priorité explicite entre MCP, fichiers et Visualizer | Le Harness commence à jouer le rôle de Capability Router |
| Visibilité du travail | Pas de règle générale de progression | Mises à jour brèves pendant les longues exécutions d’outils, puis résultat final complet | Le produit gouverne explicitement l’expérience des tâches longues |
| Format rédactionnel | Forte suppression des listes, titres et caractères gras | Formatage minimal adapté à la complexité réelle | Recalibrage autour des nouveaux comportements par défaut du modèle |
| Recherche | Vérification des informations sensibles au temps déjà requise | Les produits, modèles et outils en évolution rapide doivent être recherchés même s’ils sont « reconnus » | La familiarité ne prouve plus l’actualité |
| Sécurité et confidentialité | Règles déjà substantielles de refus et de wellbeing | Sécurité des mineurs, continuité du copyright, confidentialité Memory, sémantique de suppression et fin de conversation plus fines | Du filtrage de sortie à la Lifecycle Governance |

## Évolution 1 : la Memory passe de deux phrases à un système de fichiers

La section Memory de Fable 5 est extrêmement mince. Elle indique que Claude peut recevoir des mémoires dérivées de conversations antérieures et précise si l’utilisateur a activé la fonctionnalité. Elle décrit l’existence de Memory, mais pas sa création, sa mise à jour, sa suppression ni la séparation entre différents types de souvenirs.

Fable 5.1 modélise au contraire la Memory comme un système de fichiers persistant, organisé en au moins cinq catégories :

- `/profile.md` pour les informations d’identité et de rôle relativement stables ;
- `/topics/` pour les habitudes, préférences et domaines de discussion récurrents ;
- `/areas/` pour les Projects, responsabilités et Decisions en cours ;
- `/people/` pour le contexte relationnel pertinent à la question actuelle ;
- `/preferences.md` pour la manière dont l’utilisateur souhaite que Claude réponde et collabore.

La conception va bien au-delà des noms de fichiers. Les nouvelles règles définissent un Background Memory Pass, des Provenance Labels comme `[stated]`, le principe Read-before-write, les Version Conflicts, Append contre Replace, la suppression de fichiers entiers, les frontières des Sensitive Data et les conditions dans lesquelles une mémoire existante doit ou ne doit pas être utilisée dans une réponse.

```text
Fin de la conversation
   ↓
Extraction en arrière-plan des Durable Facts
   ↓
Classification, déduplication, filtrage Privacy, fusion de versions
   ↓
Persistent Memory Files
   ↓
Récupération selon la pertinence pour une question future
   ↓
Injection du seul contexte qui modifie réellement la réponse
```

Ce n’est pas simplement « encoder l’historique de chat et exécuter un Top-K Retrieval ». Cela ressemble davantage à une **base de données de contexte** avec Schema, Provenance, Lifecycle et Access Policy.

Ma conclusion est que la compétition en matière d’Agent Memory passera de « peut-il se souvenir ? » à « que retient-il, pourquoi le croire, qui peut le modifier, quand expire-t-il et comment le retirer ? ». La Vector Retrieval n’est qu’un détail d’implémentation dans ce système.

## Évolution 2 : Past Chats et Memory deviennent deux Context Planes distincts

Fable 5.1 ajoute des outils dédiés aux conversations passées : `conversation_search`, `recent_chats` et `read_conversation`. Ce n’est pas une simple extension de Memory. C’est la reconnaissance architecturale d’une différence fondamentale entre deux types d’information :

- **Memory conserve des Durable Claims compressés** pour une réutilisation efficace ;
- **Past Chats préserve les preuves conversationnelles originales** pour reconstruire et vérifier le contexte.

Le Prompt demande explicitement de distinguer ce que l’utilisateur a réellement dit ou décidé de ce que Claude a seulement suggéré. Si une ancienne conversation ne contient qu’une proposition de l’Assistant, la conversation suivante ne doit pas la transformer en décision de l’utilisateur. Si la discussion était hypothétique, la compression ne doit pas transformer l’hypothèse en fait.

Cela traite un problème central de tout système de mémoire longue : **la compression améliore l’utilisabilité mais supprime des preuves.**

Une architecture plus fiable ne demande donc pas à un stockage universel de mémoire de remplir tous les rôles :

```text
Memory = conclusions réutilisables
Past Chats = preuves traçables
Current Session = état de la tâche en cours
```

Un Agent mature ne doit pas seulement se souvenir. Il doit expliquer d’où vient une mémoire et si elle a été formulée par l’utilisateur, vérifiée par un Tool ou inférée par le Model.

## Évolution 3 : Skills, Plugins et MCP forment une chaîne d’approvisionnement de capacités

Fable 5 possédait déjà Skills et MCP Apps. Il savait lire le `SKILL.md` pertinent avant de créer un document, un tableur, une présentation ou un artefact de code, et privilégier un MCP connecté lors de l’accès à un service externe.

Fable 5.1 conserve cette structure et ajoute des catalogues de Plugins et de Skills, avec recherche, recommandation et installation. La nouvelle Capability Layer peut être comprise ainsi :

- un **Skill** regroupe l’expérience, les règles et la méthode d’une classe de tâches ;
- un **Plugin** combine Tools, Commands et Skills en un Capability Bundle distribuable ;
- **MCP** relie les données, les systèmes et l’autorité du monde réel ;
- un **Tool Schema** expose une action concrète au Model ;
- un **Router** décide quelle classe de capacité doit traiter la tâche actuelle.

Le passage de 18 à 44 définitions d’outils ne signifie pas seulement « 26 fonctions supplémentaires ». Les nouveaux outils se concentrent sur le Memory CRUD, la récupération de Past Chats, la découverte de Plugins et de Skills, les suggestions de Research et les Structured UI pour graphiques, comparaisons, étapes, traduction, quiz, produits et liens.

Cela ressemble de plus en plus à une architecture logicielle en couches. Le Model n’a pas besoin de conserver en permanence chaque méthode de travail, et il ne devrait pas détenir directement toutes les permissions externes. Les capacités peuvent être découvertes, chargées, autorisées, invoquées et retirées.

## Évolution 4 : le Prompt contre-calibre désormais le comportement du modèle

Le Prompt de Fable 5 s’efforçait de supprimer les titres, listes et caractères gras, car le Model de l’époque produisait facilement des réponses trop formatées et proches de modèles préfabriqués. Fable 5.1 assouplit cette règle : les listes sont appropriées lorsque le contenu est multidimensionnel, et le formatage doit se limiter à ce qui améliore la clarté.

Ce n’est pas un simple changement de goût produit. Le comportement par défaut du Model a changé. Le guide de prompting Fable 5.1 d’Anthropic précise que le nouveau modèle utilise moins volontiers les titres, listes et caractères gras que Fable 5. Conserver l’ancien Anti-formatting Prompt peut donc produire des murs de texte trop denses.

La même relation de compensation apparaît à deux autres endroits :

- Fable 5.1 donne moins spontanément de mises à jour pendant de longues chaînes d’outils, d’où l’ajout d’une consigne demandant une brève progression après quelques Tool Calls ;
- à faible Effort, Fable 5.1 répond plus facilement à partir de ses connaissances au lieu de chercher, d’où des règles de vérification renforcées pour les Products, Models et Tools en évolution rapide.

La leçon importante pour le Prompt Engineering est la suivante : **un System Prompt n’est pas une spécification produit écrite une fois pour toutes ; c’est un contrôleur du comportement du modèle.** Quand le Model change, l’ancien Prompt peut encore fonctionner mais surcompenser et dégrader le nouveau modèle.

Une équipe mature ne réutilise pas un « Prompt universel » avec tous les Models. Elle observe les Failure Modes avec des Evals et applique le minimum de calibration nécessaire au modèle actuel.

## Évolution 5 : la sécurité passe de « ce qui peut être répondu » à la gouvernance des états et des données

Fable 5 disposait déjà d’une Safety Policy étendue. Le changement important de Fable 5.1 n’est pas seulement l’ajout d’interdictions. Les Safety Rules couvrent désormais tout le cycle de vie de l’interaction.

Le nouveau Prompt traite la manière dont les demandes suivantes héritent d’un état après un refus ; la persistance des limites de copyright lorsqu’une demande est réduite ou reformulée ; les informations qui ne doivent jamais entrer dans la Long-term Memory ; la suppression éventuelle de conclusions dérivées uniquement d’une mémoire supprimée ; les conditions de lecture des Sensitive Memories ; la confirmation d’une demande de fin de conversation ; et la possibilité de mettre fin à une conversation en présence d’abus, de risque d’automutilation ou de violence potentielle.

Ces règles gouvernent plus que le texte final :

- les données peuvent-elles être stockées ?
- quel Provenance Label reçoivent-elles ?
- peuvent-elles être réutilisées plus tard ?
- l’utilisateur peut-il les retirer ?
- comment limiter les Tool Side Effects ?
- comment le Conversation State modifie-t-il la décision suivante ?

La Safety évolue donc d’un Classifier placé autour d’une réponse vers un Policy Engine au sein de l’Agent Runtime.

## Ce qui n’a pas fondamentalement changé

Pour éviter de présenter chaque détail comme une révolution, il faut aussi reconnaître ce que Fable 5 possédait déjà.

Fable 5 incluait déjà Persistent Artifact Storage, MCP Connectors, Skills, File Creation, Computer Use, Web Search, Image Search et Typed Map Output. Ce n’était pas un chatbot limité au texte, et Fable 5.1 n’a pas inventé l’Agent à partir de zéro.

La véritable évolution est que Fable 5.1 apporte à ces composants existants des catégories de contexte plus claires, une récupération des preuves, des catalogues de capacités, un routage des sorties, un retour de progression et des règles de gouvernance.

La transition va donc de « nombreux composants existent » à « ces composants possèdent désormais des frontières de responsabilité proches de celles d’un système d’exploitation ».

## Ma synthèse : quatre plans prennent forme

En abstrahant ces changements, je pense que le Runtime de Claude peut désormais être décrit selon quatre plans :

```text
Instruction Plane
System Prompt / Turn Instruction / User Preference / Skill

Context Plane
Current Session / Memory / Past Chats / Files / Web

Capability Plane
Tools / Plugins / MCP / Computer / Typed UI

State & Governance Plane
Provenance / Version / Permission / Safety / Audit
```

Fable 5 élargissait surtout les capacités. Fable 5.1 commence à investir beaucoup plus sérieusement dans le contexte et la gouvernance de l’état.

Je préfère désormais comprendre un produit Agent avec la formule suivante :

> **Agent Product Capability = Model × Context × Capability × State Governance**

Il s’agit d’une multiplication, pas d’une addition. Un Model puissant avec un mauvais Context échoue quand même. Un produit riche en Tools mais sans contrôle des Permissions ne peut pas entrer dans l’entreprise. Une Memory riche sans Provenance ni mécanisme de suppression accumule de la contamination. Un Workflow complet sans Feedback vérifiable permet seulement à l’Agent de se tromper plus automatiquement.

## Où cela nous mène

### 1. Le System Prompt monolithique sera découpé en politiques modulaires

Nous pouvons encore lire aujourd’hui un Runtime Prompt Bundle de plus de deux mille lignes, mais nombre de ces règles ne devraient pas rester du texte naturel injecté en permanence dans le Model. Elles migreront progressivement vers des Policies versionnées, des Skills, des Routers, des Permission Settings et des Task-scoped Instructions.

Les Prompts ne disparaîtront pas. Ils passeront de « texte qui transporte toutes les règles » à « interface qui aide le Model à comprendre le but et la frontière du moment ».

### 2. Le Context Engineering deviendra du State Engineering

La question précédente était de savoir comment faire entrer plus de Context dans la fenêtre. Les questions plus importantes seront : qui possède un état, quelle version est courante, quels faits ont expiré, comment effectuer un rollback et comment prouver qu’une action externe a eu lieu.

Memory, Past Chats, Session, Tool Trace et état des systèmes externes seront modélisés séparément. Le contexte d’un Agent ressemblera de plus en plus à des bases de données et des flux d’événements, plutôt qu’à un Prompt toujours plus long.

### 3. Davantage de contraintes passeront du Prompt à la couche protocolaire

Fable 5.1 introduit également les Turn-scoped System Messages, le Thinking Block Binding, la Content Provenance et le Per-message Effort. Ces mécanismes indiquent la même direction : les contraintes importantes commencent à être représentées directement par les API et le Runtime au lieu de dépendre de la capacité du Model à « se souvenir de la règle ».

Tout ce qui peut être garanti par un système de types, de permissions, un numéro de version ou un protocole ne devrait, à terme, plus exister uniquement comme texte de Prompt.

### 4. La sortie de l’Agent deviendra un résultat typé plutôt que du texte

Une grande partie des ajouts parmi les 44 Tools ne concerne pas l’action, mais des Output Components pour les graphiques, cartes, étapes, quiz, traductions et listes de produits. Le résultat final du Model passe d’une chaîne Markdown à un Typed Result directement consommable par une application.

Les Frontends futurs ne se contenteront pas d’afficher une réponse. Ils choisiront une UI interactive selon le type de résultat et convertiront la prochaine interaction utilisateur en état pour le tour suivant.

### 5. Models et Harnesses seront entraînés et itérés ensemble

La tendance de long terme la plus importante est que le Model et le Harness ne sont plus des produits indépendants. Le Post-training adaptera de plus en plus les Models à des Tool Protocols, à la progression, aux Editing Patterns, aux Memory Structures et aux Permission Boundaries. Le Harness sera ensuite recalibré par les Prompts, Routers et Evals en fonction des Failure Modes du nouveau Model.

L’inversion des règles de formatage entre Fable 5 et Fable 5.1 en est un exemple petit mais clair : quand le comportement par défaut du Model change, les contrôles environnants doivent changer aussi.

La compétition finale ne portera pas seulement sur la possession du Base Model le plus puissant. Elle portera sur l’environnement réel le plus riche, les Task Trajectories de meilleure qualité, les Feedback Signals les plus fiables et la boucle fermée qui réinjecte ces signaux dans le développement du Model comme du Harness.

## Ce que cela signifie pour les constructeurs d’Agents

Premièrement, il ne faut pas confondre System Prompt et architecture produit. Un Prompt peut décrire une frontière, mais une frontière fiable exige permissions, schemas, versions, idempotence, audit et evals.

Deuxièmement, il ne faut pas réduire la Memory à une base vectorielle. La mémoire à long terme est d’abord un problème de gouvernance des données, puis un problème de retrieval.

Troisièmement, il ne faut pas évaluer uniquement la réponse finale. Pour un Agent qui utilise des Tools, les questions les plus importantes sont la justesse de la trajectoire, le contrôle des effets de bord, la capacité de récupération après échec et la traçabilité des preuves.

Quatrièmement, il ne faut pas supposer qu’un ancien Harness s’améliore automatiquement lorsque le Model change. Chaque mise à niveau de modèle doit relancer des Evals sur des tâches réelles et vérifier les dérives de Search, d’utilisation parallèle des Tools, d’édition de fichiers, de formatage, de conditions d’arrêt et de progression.

## Conclusion

L’aspect le plus révélateur des changements de Prompt de Fable 5.1 n’est pas le nombre de règles ajoutées. C’est le fait qu’Anthropic répond plus systématiquement aux questions que tout produit Agent finit par rencontrer : d’où vient le contexte, comment les capacités sont chargées, comment l’état persiste, comment les effets de bord sont gouvernés, comment les résultats sont présentés et comment les erreurs sont corrigées.

Mon jugement final est le suivant :

> La prochaine génération de compétition entre Agents ne portera pas sur la longueur du Prompt. Elle portera sur la capacité à placer un Model dans un environnement plus réel, plus stateful, plus vérifiable et capable de continuer à apprendre.

À mesure que ces capacités d’environnement se stabiliseront, le System Prompt pourra redevenir plus court. Les règles les plus fiables finissent par évoluer de « dire au modèle comment il doit agir » vers « le système n’autorise que la bonne manière d’agir ».

## Références

- [Anthropic : vue d’ensemble des System prompts](https://platform.claude.com/docs/en/release-notes/system-prompts/overview)
- [Anthropic : Claude Fable 5 System Prompt](https://platform.claude.com/docs/en/release-notes/system-prompts/claude-fable-5)
- [Anthropic : Claude Fable 5.1 System Prompt](https://platform.claude.com/docs/en/release-notes/system-prompts/claude-fable-5-1)
- [Anthropic : présentation du modèle Claude Fable 5.1](https://platform.claude.com/docs/en/models/fable-5-1/overview)
- [Anthropic : Prompting Claude Fable 5.1](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-1)
- [Archive communautaire du Runtime Prompt complet de Fable 5](https://github.com/infineural/fable-5/blob/main/system-prompt/full-system-prompt.md)
