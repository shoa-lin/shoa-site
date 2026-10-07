---
translationKey: "agent-permission-context"
locale: "fr"
title: "Ce qu’il peut toucher, ce qu’il sait : pourquoi l’agent change sans cesse de forme"
description: "Un agent ne fait le travail que là où « pouvoir agir » et « connaître la situation » se recouvrent. En suivant ces deux axes, on voit l’agent passer du dépôt à l’ordinateur, au canal, puis à sa propre identité."
publishedAt: "2026-10-05"
updatedAt: "2026-10-05"
category: "architecture"
sourceLocale: "zh"
sourceUrl: "https://www.bydziwen.top/blog/agent-permission-context/"
sourceAuthor: "Shoa Lin"
contentType: "original"
translationStatus: "reviewed"
---

Depuis un peu plus d’un an, les produits d’agents changent d’apparence à toute vitesse. D’abord des assistants de programmation dans le terminal et l’IDE, puis des applications de bureau et des bots dans les messageries ; plus tard, certains ont donné à l’agent un ordinateur dans le cloud, d’autres l’ont invité dans le canal de l’équipe, d’autres encore lui ont attribué sa propre adresse e-mail et son propre numéro de téléphone.

À première vue, on dirait que chacun bricole une nouvelle coquille. Pour y voir clair, je m’appuie sur deux questions :

- **Permissions** : sur quoi l’agent a-t-il le droit d’agir ?
- **Contexte** : que sait l’agent, et que peut-il retenir ?

L’agent ne fait le travail que là où ces deux choses se recouvrent. S’il connaît la situation mais ne peut pas agir, il n’est qu’un conseiller ; s’il peut agir sans connaître la situation, c’est un inconnu qui tient vos clés. D’où mon point de vue : **la forme d’un agent, c’est la zone où permissions et contexte se recouvrent**. Chaque fois qu’un produit change de forme, il repousse cette zone d’un cran vers l’extérieur : un axe s’élance d’abord, l’autre le rattrape ensuite.

## Une carte pour commencer

![Carte à deux dimensions permissions × contexte : l’axe horizontal est l’étendue des permissions, l’axe vertical l’étendue du contexte, sept groupes de produits y sont placés](/assets/blog/agent-permission-context/map-fr.svg)

*Légende : plus on va vers la droite, plus il y a de choses sur lesquelles l’agent peut agir, et plus une erreur est difficile à rattraper. La position de chaque produit relève de mon jugement, pas du discours des éditeurs.*

Cette carte ne regarde que deux choses : qui se trouve sur la diagonale, les deux axes avançant ensemble ; et qui s’en écarte, un axe ayant pris les devants. Les sections qui suivent déroulent le raisonnement pas à pas, chacune découlant de la précédente.

## Pourquoi le code est parti en premier

Dans une fenêtre de chat, l’agent sait ce que vous avez dit, mais tout ce qu’il peut faire, c’est répondre ; le travail reste pour vous.

Le dépôt, lui, est différent : il range les deux axes dans un même répertoire. Le code, l’historique des commits, les tests, c’est le contexte dont l’agent a besoin ; modifier des fichiers, lancer des commandes, ce sont ses permissions. Plus important encore, ces permissions sont réversibles : si une modification casse quelque chose, git permet de revenir en arrière ; pour savoir si elle est correcte, les tests tranchent. Quand les actions s’annulent, on peut accorder un peu plus de permissions sans crainte.

En mai 2025, OpenAI a lancé Codex, qui exécute des tâches d’ingénierie en parallèle dans un environnement isolé ; quelques jours plus tard, Claude Code devenait officiellement disponible, avec des modifications qui apparaissent directement dans vos fichiers, dans VS Code ou JetBrains. Les deux ont, sans se concerter, commencé par le dépôt.

![Comparaison : dans la fenêtre de chat, contexte et permissions ne se recouvrent presque pas ; dans le dépôt, ils se recouvrent largement](/assets/blog/agent-permission-context/repo-fr.svg)

*Légende : le dépôt est le premier endroit où « la situation est connue et l’erreur réversible ».*

Donc, pour savoir quand un domaine pourra être confié à un agent, regardez d’abord s’il existe un tel endroit : un contexte complet, et des actions qui s’annulent.

## Hors du dépôt, la route se sépare en deux

Dès qu’on quitte le dépôt, les choses se compliquent. Votre contexte est dispersé entre historiques de conversation, fichiers et comptes divers ; les endroits où agir sont éparpillés dans une foule de sites et d’applications sans API. Faute d’un lieu tout prêt capable d’accueillir les deux à la fois, la route bifurque.

Une première voie épaissit d’abord le contexte : installer l’agent dans la messagerie que vous utilisez déjà, et garder mémoire et sessions de votre côté. OpenClaw se branche sur WhatsApp, Telegram, Slack et d’autres canaux via une gateway ; espace de travail, fichiers de mémoire, sessions et clés restent entre les mains de l’utilisateur. Chez Hermes, la ligne de commande, l’application de bureau et la passerelle de messagerie partagent le même jeu de sessions et de configuration.

Une seconde voie élargit d’abord les permissions : donner directement un ordinateur à l’agent. Une interface graphique plus un navigateur déjà connecté, c’est la façon la plus générale d’atteindre « ce qui n’a pas d’API ». Grok Bot travaille sur un ordinateur cloud persistant, avec navigateur, système de fichiers et terminal, et se connecte à vos outils et sites existants ; Muse donne à chacun une machine virtuelle sécurisée avec navigateur, qui continue de travailler quand vous fermez l’app.

![Schéma de bifurcation : après le dépôt, une voie épaissit d’abord le contexte, l’autre élargit d’abord les permissions, et toutes deux doivent finir par combler l’autre axe](/assets/blog/agent-permission-context/fork-fr.svg)

*Légende : quand un axe part en premier, l’autre devient la dette à rembourser ensuite.*

## L’approbation, c’est l’humain qui comble le contexte

Quand on prend d’abord la voie des permissions, on bute vite sur un problème. Un ordinateur connecté à vos comptes peut cliquer sur n’importe quel bouton, mais il ignore quelles actions vous approuveriez : quel est votre budget, quelle relation vous avez avec le destinataire, où se situent vos limites.

Chaque demande d’approbation qui s’affiche alors est en réalité l’agent qui vous réclame le morceau de contexte qui lui manque. Écrire les règles à l’avance, c’est lui remettre ce contexte en une seule fois. Dots vous fait classer les actions en trois niveaux : autorisées, soumises à approbation, interdites. Muse vous demande avant d’envoyer un message ou d’acheter, et garde une trace.

![Schéma : les permissions dépassent le contexte d’une longueur ; l’écart se comble par des fenêtres d’approbation, des règles écrites à l’avance, et l’accumulation de mémoire et de préférences](/assets/blog/agent-permission-context/approval-fr.svg)

*Légende : plus les approbations sont fréquentes, plus les deux axes sont éloignés.*

Ainsi, « combien de fois faut-il votre feu vert pour une tâche » peut servir d’indicateur : il mesure l’écart entre permissions et contexte. Pour le faire baisser, il faut combler le contexte, avec des règles, de la mémoire, des préférences, et non démonter la barrière.

Il y a un morceau de contexte qu’on refuse délibérément de donner : les mots de passe. Muse place les identifiants dans un stockage sécurisé ; le modèle ne voit ni vos mots de passe ni vos moyens de paiement. L’agent peut s’en servir, mais pas les voir.

## L’entrée se replie là où le contexte s’accumule

Revenons à la voie qui fait d’abord croître le contexte : elle révèle autre chose.

Que l’entrée soit un terminal, une messagerie, le bureau ou WhatsApp ne change rien à ce que l’agent peut toucher ni à ce qu’il sait ; on peut donc ouvrir des entrées à volonté, et les refermer de même. Ce qui s’accumule vraiment, petit à petit, c’est le contexte : mémoire, compétences, sessions, fils de discussion. Quand vous changez de produit, c’est précisément cela que vous perdez.

Les éditeurs replient donc les entrées vers l’endroit où le contexte s’accumule, et l’environnement d’exécution qui fait le vrai travail recule à l’arrière-plan, comme un backend interchangeable. La nouvelle version de ChatGPT pour le bureau regroupe Chat, Work et Codex dans une même coquille ; Dots lance des tâches dans Codex ou Work, et ces tâches sont comptabilisées comme avant. Le Bot Mode de Hermes n’est qu’un plugin de bureau : désactivez-le, le profil et les sessions sont toujours là. L’interface se démonte, l’état reste.

Le vrai rempart d’un agent, c’est donc l’état qu’il a accumulé pour vous. Exporter, oublier, réinitialiser, isoler : ces opérations doivent être traitées comme le cœur du produit.

## Le travail d’équipe : le canal découpe les deux axes au même endroit

Dès que le contexte appartient à plusieurs personnes, un nouveau problème apparaît. La situation de l’équipe est répartie entre ses membres ; un agent individuel ne voit que le contexte d’une personne et ne dispose que de ses permissions.

Le canal règle les deux bouts d’un coup. Claude Tag est le Claude d’équipe dans Slack : l’administrateur lui ouvre outils, données et dépôts de code canal par canal, et n’importe qui dans le canal peut le mentionner avec @ pour lui confier une tâche ; un canal, un Claude, dont les actions sont visibles de tout le canal, et l’administrateur peut fixer un plafond de dépenses et consulter le journal des opérations. La frontière des permissions et celle du contexte tombent sur le même canal. C’est pour cela qu’il peut se tenir en haut à droite de la carte.

Comparez avec le Bot Mode de Hermes : plusieurs bots nommés, chacun avec son rôle, son modèle, sa mémoire et ses compétences, capables de discuter en groupe et de s’envoyer des messages, mais appartenant tous au même utilisateur. C’est le contexte d’une seule personne découpé en plusieurs parts ; on n’a pas encore touché au contexte des autres.

Pour un agent d’équipe, cherchez donc d’abord où le contexte de l’équipe s’est déjà accumulé (canal, projet, dépôt), et accrochez-y les permissions, pas à une personne en particulier.

## L’identité : découper les permissions aussi finement que le contexte

Au dernier cran, le problème vient de ceci : « l’agent se connecte en tant que vous ». En agissant sous votre identité, il reçoit l’ensemble de vos permissions : impossible de les découper plus finement, impossible de les révoquer séparément ; pour les lui retirer, il faut vous les retirer en même temps.

Avec la multiplication des agents, ce problème s’amplifie. Grok Bot en est un bon exemple : plusieurs Bots partagent un même ordinateur cloud, chacun avec son écran ; les conversations et ce qu’ils apprennent sont séparés par Bot, mais les fichiers et les sessions du navigateur sont communs. Le contexte est découpé par Bot ; les permissions restent celles du compte entier, en un seul bloc.

![Schéma : plusieurs Bots ont chacun leur contexte mais partagent les permissions de tout le compte ; une fois que chaque agent a sa propre identité, contexte et permissions sont découpés par agent](/assets/blog/agent-permission-context/identity-fr.svg)

*Légende : chaque Bot détient toutes les permissions, mais ne connaît qu’une partie de la situation.*

Donner à l’agent une identité qui lui est propre est le moyen le plus direct de découper les permissions aussi finement que le contexte. Cue attribue à chaque agent son adresse e-mail, son numéro de téléphone, son portefeuille et son ordinateur, et il ne peut payer que dans le budget que vous avez fixé ; chez Dots, le dot spécialiste a sa propre identité et du matériel configuré par l’IT, et peut se brancher sur les systèmes de l’entreprise, mais tout cela reste pour l’instant en preview. La permission devient alors quelque chose qu’on peut accorder, plafonner et révoquer séparément, et non plus une session de connexion prêtée à l’agent.

On me demandera si l’identité constitue un troisième axe. À mon sens, plutôt qu’un cran de plus vers la droite sur l’axe horizontal, elle pose une autre question : à qui appartient cette permission.

## Pour finir

Chaque changement de forme revient, au fond, à la même chose : un axe s’élance, l’autre le rattrape, et là où ils se recouvrent naît un nouveau produit. La prochaine fois que vous verrez un nouvel agent, ne vous précipitez pas sur l’apparence de l’entrée ; deux questions suffisent : que peut-il toucher, et que sait-il.
