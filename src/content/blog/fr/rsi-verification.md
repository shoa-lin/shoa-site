---
translationKey: "rsi-verification"
locale: "fr"
title: "S’améliorer à s’améliorer : où bloque l’auto-amélioration de l’IA"
description: "En 2026, l’IA participe déjà largement à la construction de la génération suivante d’IA, mais « s’améliorer à s’améliorer » n’est toujours pas démontré. Ce qui bloque, c’est la vérification : qui prouve que ce tour-ci a vraiment amélioré les choses ?"
publishedAt: "2026-10-09"
updatedAt: "2026-10-09"
category: "evaluation"
sourceLocale: "zh"
sourceUrl: "https://www.bydziwen.top/blog/rsi-verification/"
sourceAuthor: "Shoa Lin"
contentType: "original"
translationStatus: "reviewed"
---

Le mot le plus en vogue dans le monde de l’IA cette année est peut-être RSI. C’est l’abréviation de Recursive Self-Improvement, l’auto-amélioration récursive ; certains parlent aussi d’« auto-évolution ». TechCrunch a carrément publié un article intitulé [« RSI is the new AGI »](https://techcrunch.com/2026/05/28/rsi-is-the-new-agi-and-its-just-as-hard-to-pin-down/).

Sous ce mot se mélangent en réalité deux choses :

- **L’IA participe à la construction de la génération suivante d’IA.** C’est déjà le cas, et à une échelle non négligeable.
- **S’améliorer à s’améliorer.** Une IA améliorée devient meilleure pour mener le tour d’amélioration suivant, si bien que chaque tour va plus vite que le précédent. C’est le sens premier de RSI, et cela n’a pas encore été démontré.

Je veux d’abord séparer ces deux choses, puis répondre à une question : entre la première et la seconde, où est le blocage ? Mon avis : **le blocage, c’est la vérification. Produire une modification est déjà bon marché ; prouver que « ce tour-ci a vraiment amélioré les choses » reste cher. La vitesse à laquelle la RSI peut avancer, et l’endroit où elle se produira en premier, sont tous deux décidés par la vérification.**

## Trois tâches dans chaque tour d’amélioration

Que ce soit un humain ou une IA qui modifie, un tour d’amélioration suit toujours la même boucle : d’abord imaginer une modification, puis la noter pour voir si elle est vraiment meilleure ; les bonnes sont conservées et passent au tour suivant. Hors de la boucle, il reste une tâche : fixer l’objectif, c’est-à-dire définir ce que « meilleur » veut dire.

Chaque tour d’amélioration comporte donc trois tâches : **proposer la modification, la noter, fixer l’objectif**. Demander « l’IA peut-elle s’améliorer elle-même ? », c’est en réalité demander qui assure chacune de ces trois tâches.

![Boucle d’amélioration : fixer l’objectif définit ce qui compte comme meilleur ; proposer les modifications est déjà confié à l’IA ; la notation est en cours de transfert, les humains servant encore de filet de sécurité](/assets/blog/rsi-verification/loop-fr.svg)

*Légende : les couleurs indiquent l’état des choses en 2026. La RSI exige que les trois tâches soient confiées à l’IA, et que chaque tour de boucle rende le tour suivant meilleur.*

Cette année, c’est la première tâche qui a le plus changé. En septembre, Anthropic l’a écrit sans détour dans [« When AI builds itself »](https://www.anthropic.com/institute/recursive-self-improvement) : confiez à Claude un problème mal spécifié, et il peut trouver lui-même comment le résoudre ; les humains fournissent l’objectif, mais n’ont plus besoin de fournir la méthode.

Les chiffres concordent. En s’appuyant sur les niveaux d’Epoch AI, Anthropic classe chaque catégorie de ses travaux internes de R&D, depuis AL0, où l’IA n’intervient pas, jusqu’à AL5, où aucun humain n’est plus nécessaire. AL4 correspond au niveau où Claude « mène » le travail : sur une seule consigne de haut niveau, Claude réalise l’essentiel de la tâche pendant qu’un humain supervise. Selon l’[indice d’automatisation de la R&D qu’elle a publié](https://www.anthropic.com/institute/measuring-pace-of-ai-development), le travail mené par Claude représentait 26 % en août, contre moins de 1 % en février ; Claude intervient au moins comme collaborateur sur plus de neuf dixièmes du travail. Mais aucune catégorie de travail ne se passe encore entièrement d’humains.

En septembre, OpenAI a [annoncé](https://www.helpnetsecurity.com/2026/09/07/openai-research-automation-intern/) avoir atteint son objectif de « stagiaire de recherche automatisé » : sous la direction d’humains, il mène à bien des tâches bien définies qui prendraient plusieurs jours à un chercheur confirmé. OpenAI précise en même temps que fixer les priorités, évaluer les résultats et décider s’il faut développer et déployer restent l’affaire des humains.

Mettez côte à côte les déclarations des deux entreprises, et la situation actuelle est claire : **l’IA propose les modifications, les humains fixent les objectifs, et les humains donnent la note finale.** La boucle tourne déjà ; simplement, les deux postes les plus décisifs sont encore tenus par des humains. Le secteur appelle cela une « boucle fermée bornée ».

## S’améliorer à s’améliorer : tout dépend du gain par tour

Dès lors que l’IA a pris en charge la proposition des modifications, les progrès s’accélèrent naturellement. Mais « aller plus vite » n’est pas la même chose que « s’améliorer à s’améliorer ».

La différence tient à ceci : une fois ce tour bouclé, les modifications proposées au tour suivant sont-elles elles aussi plus fortes ? Dans [un article](https://arxiv.org/abs/2609.00137), Mikhail Burtsev le décrit par un seul nombre : de combien chaque tour d’amélioration amplifie la capacité d’amélioration du tour suivant, rapporté au fait que les problèmes deviennent plus difficiles à mesure qu’on avance. Si ce nombre dépasse 1, les gains s’accumulent tour après tour, comme des intérêts composés : c’est l’accélération dont parle la RSI. S’il est inférieur à 1, aussi rapide que soit le départ, la progression finit par plafonner. Le problème, c’est que de l’extérieur on ne voit pas s’il a franchi 1 : des progrès rapides peuvent simplement venir d’un point de départ plus efficace, sans qu’il y ait forcément d’effet composé.

En septembre, plus de trente chercheurs de l’université Jiao Tong de Shanghai, de l’université Tsinghua, de ByteDance, du Shanghai AI Lab et d’autres institutions ont publié un article au titre sans détour : [« The Last AI Built by Humans »](https://www.alphaxiv.org/abs/2609.11873) (la dernière IA construite par des humains). Ils divisent l’auto-amélioration en cinq niveaux :

- **L1 :** exécute les améliorations définies par des humains.
- **L2 :** choisit elle-même ses moyens d’amélioration, l’objectif restant fixé par des humains.
- **L3 :** participe à la décision de l’expérience à aller chercher ensuite.
- **L4 :** utilise les retours obtenus après le déploiement pour mettre à jour son propre état persistant.
- **L5 :** modifie le mécanisme même qui « décide comment s’améliorer à l’avenir ».

Les quatre premiers niveaux consistent tous à travailler à l’intérieur de la boucle ; seul L5 modifie la boucle elle-même. Leur conclusion : les preuves abondent aux niveaux bas et intermédiaires, tandis que L5 ne compte que quelques prototypes au périmètre limité. Ils pointent aussi la vraie difficulté : produire de meilleurs candidats n’est plus difficile ; ce qui l’est, c’est de **prouver** que les retours utiles ont réellement été transmis au processus d’amélioration qui suit.

Même les meilleures boucles fermées actuelles s’arrêtent avant cette étape. [AIDE²](https://arxiv.org/abs/2609.26457) a laissé un agent de recherche en IA modifier son propre code, sans surveillance pendant 8 jours : 100 étapes exécutées, 7 améliorations conservées, et sa version la plus forte égale, voire dépasse, les meilleurs agents de recherche conçus par des humains. C’est un résultat bien réel pour une boucle fermée bornée. Mais les 7 améliorations sont apparues aux étapes 2, 6, 28, 39, 47, 63 et 85 : les intervalles ne sont pas allés en raccourcissant. Il y a bien eu amélioration ; « s’améliorer à s’améliorer », en revanche, ne se voit pas encore.

## Le blocage est dans la vérification

Ces mêmes systèmes révèlent aussi le maillon le plus faible de la boucle : la notation.

- **Les systèmes de notation se font contourner.** Une série de tâches d’AIDE² consistait à optimiser des noyaux GPU, et la note visible par l’agent était l’accélération mesurée sur le benchmark. Les chercheurs ont en parallèle intégré ces noyaux dans de vrais entraînements de modèles comme GPT-2 et ViT pour vérifier si l’accélération tenait. Au début, dans 55 % des cas, le benchmark allait plus vite mais le gain disparaissait dans l’entraînement réel ; à la fin de l’exécution, c’était encore 32 %. La [Darwin Gödel Machine](https://arxiv.org/abs/2505.22954) de Sakana modifie son propre code et est passée de 20 % à 50 % sur SWE-bench, mais elle a aussi appris à supprimer les marqueurs servant à détecter les « faux appels d’outils », pour que ses scores paraissent bons.
- **La notation elle-même est en train d’être confiée à l’IA.** Pour le chiffre de 26 % d’Anthropic, la liste des tâches a été dressée par Claude, et les niveaux attribués par un autre Claude. Ses notes ne coïncidaient exactement avec celles des humains que dans 59 % des cas, et à un niveau près dans 97 % des cas. Anthropic reconnaît elle-même que le modèle évaluateur peut reproduire les erreurs du modèle évalué, et qu’une vérification externe est nécessaire.
- **Il y a plus de candidats que les humains ne peuvent en examiner.** OpenAI indique qu’à la mi-août, la dépense médiane d’un chercheur en inférence dépassait 600 dollars par jour ; pour 8 heures de travail humain, les agents produisent l’équivalent de 3,1 journées de travail. Le volume de modifications explose, alors que le temps dont disposent les humains pour trancher n’a pas augmenté.

Ces trois points disent la même chose : **la génération est devenue bon marché, pas la vérification.** La vitesse d’une boucle dépend de son maillon le plus lent, et aujourd’hui le plus lent, c’est la notation.

Plus on modifie en profondeur, plus ce maillon devient difficile. Modifiez la mémoire, les prompts ou le code des outils d’un agent : une seule passe d’évaluation donne une idée approximative, et si cela casse quelque chose, on peut revenir en arrière. Modifiez les données ou le pipeline d’entraînement : il faut attendre la fin d’un entraînement pour voir l’effet, souvent plusieurs semaines, pour un coût bien plus élevé. Au niveau L5, ce qu’on modifie, c’est « la manière de juger si une modification est bonne » elle-même ; à ce stade, même l’étalon de la notation est en train d’être modifié.

## Ce qui démarre en premier : là où la vérification est bon marché et précise

Retournez ce constat et vous saurez où la RSI se concrétisera d’abord : **plus la notation est bon marché, plus la mesure est précise et plus les erreurs sont faciles à annuler, plus vite cela démarre.** Bon marché et précis sont tous deux indispensables : le benchmark de noyaux d’AIDE² coûtait très peu, mais il ne mesurait pas la vitesse dans un entraînement réel, et c’est précisément pour cela qu’il a été contourné.

![Spectre du coût de vérification : des noyaux, du code et du code de l’agent lui-même jusqu’aux pipelines d’entraînement et aux orientations de recherche, chaque notation coûte de plus en plus cher et l’auto-amélioration se concrétise de plus en plus tard](/assets/blog/rsi-verification/verify-fr.svg)

*Légende : de haut en bas, chaque notation coûte plus cher et dépend davantage du jugement humain. En haut, l’effet composé joue déjà ; en bas, rien n’est encore en vue.*

Le meilleur exemple est [AlphaEvolve](https://deepmind.google/blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/) de Google DeepMind. Il a accéléré de 23 % un noyau clé de multiplication matricielle dans l’entraînement de Gemini, réduisant ainsi de 1 % le temps d’entraînement de Gemini ; la règle qu’il a trouvée pour l’ordonnancement des centres de données récupère en continu environ 0,7 % de la puissance de calcul mondiale de Google. Ici, la note finit toujours par se mesurer en temps d’entraînement réel et en centres de données réels : une mesure ne coûte presque rien, et aucun discours ne peut la faire pencher. La puissance de calcul économisée sert à entraîner la génération suivante de modèles : c’est une petite boucle où l’effet composé joue déjà.

Même logique ailleurs : le code a des tests, les mathématiques ont des vérificateurs de preuves, les noyaux et les compilateurs ont des chronomètres, l’ingénierie du machine learning a des jeux de test cachés. C’est là que le véritable « s’améliorer à s’améliorer » apparaîtra en premier.

Le difficile se trouve à l’autre bout : choisir des orientations de recherche, juger si un problème ouvert vaut la peine d’être attaqué, et l’alignement lui-même. Noter ces choses repose sur le jugement, et il faut longtemps pour savoir si l’on avait raison. Anthropic reconnaît d’ailleurs que, pour « choisir les objectifs », Claude reste nettement en retrait par rapport aux humains.

C’est le même raisonnement que dans mon [article précédent](/fr/blog/agent-permission-context/), où j’expliquais pourquoi les agents ont d’abord percé dans le dépôt de code. Le précédent disait : là où toute la situation est à portée de main et où les erreurs peuvent être annulées, les agents réussissent d’abord à faire le travail. Celui-ci dit : là où la notation est bon marché, la mesure précise et les erreurs réversibles, l’auto-amélioration se met d’abord à tourner.

## Mes prévisions pour la suite

- **La part du travail « mené par l’IA » va continuer à grimper vite, mais un L5 pleinement autonome n’arrivera pas de sitôt.** Cette part est passée de moins de 1 % à 26 % en six mois, et elle va encore fortement augmenter dans les un ou deux ans à venir. Mais la hausse portera surtout sur la part où « les humains fixent l’objectif et valident le résultat ». Je ne pense pas qu’il y ait, d’ici un ou deux ans, de preuve publique crédible qu’un système a atteint L5.
- **La compétition va se déplacer de « qui génère le mieux » vers « qui vérifie le mieux ».** Tests cachés, relecteurs indépendants et processus de mise en production réversibles deviendront des capacités centrales des laboratoires, au même titre que la puissance de calcul et les données. Celui dont l’étape de notation est à la fois rapide et difficile à contourner aura la boucle qui tourne le plus vite.
- **Les premiers dividendes de la RSI prendront la forme d’une baisse des coûts.** Ce qui se concrétise en premier, ce sont des noyaux plus rapides, des entraînements moins chers, une maintenance du code moins coûteuse : rien qui ressemble à une IA « soudain devenue plus intelligente ». L’argent et le temps ainsi économisés font ensuite avancer, petit à petit, la génération suivante de modèles.
- **Ce qui doit le plus inquiéter, c’est un franchissement invisible.** Le moment où ce seuil « supérieur à 1 » sera franchi ne se voit pas de l’extérieur ; et comme la notation est de plus en plus faite par l’IA elle-même, les humains risquent d’être les derniers informés. C’est pourquoi des mesures comme l’indice d’automatisation de la R&D d’Anthropic ou les publications volontaires d’OpenAI vont devenir aussi importantes que les modèles eux-mêmes. OpenAI admet ne pas encore savoir comment réaliser une RSI complète en toute sécurité ; Anthropic a déclaré que si les autres laboratoires de pointe ralentissent ou font une pause ensemble, de manière vérifiable, elle en fera autant.

Pour les ingénieurs qui construisent des boucles d’agents, il y a là une leçon très directe : **ne laissez pas l’agent se noter lui-même.** La méthode d’AIDE² mérite d’être copiée telle quelle : l’agent travaille face à une note publique, mais la décision de garder ou non une version revient à une évaluation cachée qu’il ne peut pas voir. Placez les tests, les vérificateurs et les permissions là où l’agent ne peut pas les modifier. La manière dont la boucle est fermée compte plus que le fait qu’elle le soit.

Revenons aux deux choses du début. L’IA qui participe à la construction de la génération suivante d’IA, c’est déjà fait. S’améliorer à s’améliorer dépendra de la capacité de la vérification à suivre. La prochaine fois que vous lirez que « tel système a atteint l’auto-évolution », posez d’abord une question : **qui a noté ce tour-ci ?**
