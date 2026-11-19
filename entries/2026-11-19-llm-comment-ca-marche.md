---
title: LLM, comment ça marche vraiment ? Des tokens à la réponse
date: 2026-11-19
track: ia
topic: llm-comment-ca-marche
level: débutant
reading: 9
summary: Un LLM ne « comprend » pas une question, il prédit le mot suivant, encore et encore. On suit le trajet d'un texte (tokens, attention, probabilités, température), puis on code un mini modèle en Python pour toucher le principe du doigt.
---

## Pourquoi c'est important

Les assistants de code, les chatbots et les agents qui peuplent les offres d'alternance reposent presque tous sur la même brique : un **LLM** (*Large Language Model*, grand modèle de langage). Un LLM est un modèle d'intelligence artificielle entraîné sur de très grands volumes de texte, capable de produire du langage : répondre, résumer, traduire, écrire du code.

Savoir l'utiliser ne suffit pas. En entretien comme au quotidien, on attend de vous que vous compreniez **pourquoi** il se trompe parfois avec aplomb, pourquoi une même question donne deux réponses différentes, pourquoi il « oublie » le début d'une longue conversation, et pourquoi coller un document dans le prompt change tout. Ces comportements découlent d'un seul principe de base, que cette leçon pose.

## Comment ça marche

### L'idée centrale : prédire le prochain token

Un LLM de type génératif fait une seule chose : **à partir du texte déjà présent, il estime quel élément doit venir ensuite**. Cet élément s'appelle un **token**. Un token est la plus petite unité que manipule le modèle : ce peut être un mot entier, un morceau de mot, un caractère ou même un octet. Le découpage d'un texte en tokens s'appelle la **tokenisation**.

Pourquoi pas simplement des mots ? Parce qu'une langue compte des centaines de milliers de formes de mots, ce qui ferait un vocabulaire énorme et mal adapté aux mots rares. Le cours d'agents de Hugging Face donne un ordre de grandeur parlant : environ 600 000 mots estimés en anglais, contre un vocabulaire d'environ 32 000 tokens pour Llama 2. Les mots rares ou longs sont donc découpés en sous-unités (par exemple une racine plus une terminaison).

Conséquences pratiques à retenir : la facturation des API, la taille maximale d'une conversation et la vitesse se comptent en tokens, pas en mots ; et le nombre de tokens d'un même texte dépend du modèle et de la langue. Le glossaire de la documentation d'Anthropic précise d'ailleurs que, pour obtenir un décompte exact, il faut utiliser le comptage de tokens du modèle visé plutôt qu'une estimation.

### La boucle autorégressive

Le modèle fonctionne en boucle, on dit qu'il est **autorégressif** : la sortie d'un passage devient une partie de l'entrée du passage suivant.

```
Entrée : « La capitale de la France est »
   │
   ▼  tokenisation  →  nombres (identifiants de tokens)
   ▼  réseau de neurones (Transformer)
   ▼  un score par token du vocabulaire
   ▼  choix d'un token : « Paris »
   │
   └─► on ajoute « Paris » à l'entrée et on recommence
       jusqu'à ce que le modèle produise un token spécial de fin
       (EOS, *end of sequence*)
```

Chaque modèle possède ses propres **tokens spéciaux** pour marquer le début ou la fin d'un message ou d'une réponse. Le plus important est le token de fin de séquence : quand il est choisi, la génération s'arrête.

### Le Transformer et l'attention

Le « réseau de neurones » du schéma est, dans la quasi-totalité des LLM actuels, un **Transformer**. Cette architecture a été présentée en 2017 dans l'article *Attention Is All You Need* (Vaswani, Shazeer, Parmar, Uszkoreit, Jones, Gomez, Kaiser, Polosukhin, publié à NIPS 2017). Sa proposition : se passer de la récurrence et de la convolution, qui étaient jusque-là les standards pour traiter des suites de mots, et tout construire sur des mécanismes d'**attention**. Les auteurs mettaient en avant deux bénéfices : une meilleure qualité de traduction sur leurs tests, et un entraînement plus parallélisable, donc plus rapide.

L'**attention** est le mécanisme qui permet au modèle de pondérer l'importance des différents éléments du contexte. Dans « La capitale de la France est… », les mots « capitale » et « France » comptent bien plus que « de » ou « la » pour prédire la suite. Le modèle apprend à regarder les bons mots.

Il existe trois grandes familles de Transformers :

| Famille | Rôle | Exemples cités | Usages typiques |
|---|---|---|---|
| Encodeur | Transformer un texte en représentation numérique (*embedding*) | BERT | Classification, recherche sémantique |
| Décodeur | Générer des tokens un par un | Llama | Chatbots, génération de texte et de code |
| Encodeur-décodeur | Lire une entrée puis générer une sortie | T5, BART | Traduction, résumé |

Les LLM dont on parle au quotidien sont typiquement des modèles **décodeurs** à plusieurs milliards de paramètres. Un **paramètre** est un nombre ajusté pendant l'entraînement : c'est ce qui constitue la « connaissance » du modèle.

### Comment le modèle est entraîné

L'entraînement se déroule en plusieurs étapes, décrites dans le glossaire d'Anthropic et le cours de Hugging Face :

1. **Pré-entraînement** : le modèle lit un énorme corpus de texte non annoté et apprend à prédire le mot suivant. Il y acquiert la structure de la langue et une large culture générale. Mais un modèle uniquement pré-entraîné n'est pas naturellement bon pour suivre des instructions.
2. **Fine-tuning** (ajustement fin) : on poursuit l'entraînement sur des données plus ciblées, par exemple pour qu'il tienne une conversation, utilise des outils ou génère du code.
3. **RLHF** (*Reinforcement Learning from Human Feedback*, apprentissage par renforcement à partir de retours humains) : des personnes classent plusieurs réponses, et le modèle est poussé vers celles qui sont préférées. C'est ce qui l'aligne sur les attentes d'un assistant utile.

### Choisir le token : probabilités et température

À chaque étape, le modèle ne renvoie pas « un mot » mais un **score pour chaque token du vocabulaire**. Il faut ensuite choisir. La méthode la plus simple (décodage glouton, *greedy*) prend toujours le meilleur score. La recherche par faisceau (*beam search*) explore plusieurs suites candidates pour maximiser le score global. Dans la pratique des API, on tire au sort selon les probabilités, et la **température** règle ce tirage : une valeur basse rend la sortie plus conservatrice et prévisible, une valeur haute la rend plus variée et créative.

Point important, rappelé par la documentation d'Anthropic : même avec une température de 0, le résultat n'est pas garanti identique d'un appel à l'autre.

### La fenêtre de contexte

La **fenêtre de contexte** est la quantité de texte que le modèle peut « avoir sous les yeux » pour générer la suite. Le glossaire d'Anthropic la compare à une mémoire de travail, et précise qu'elle est distincte du corpus sur lequel le modèle a été entraîné. Les connaissances du pré-entraînement sont figées dans les paramètres ; ce que vous écrivez dans la conversation, vous, vit dans la fenêtre de contexte. Si une conversation devient trop longue, le début n'est plus pris en compte. C'est aussi pour cela que la technique **RAG** (*Retrieval Augmented Generation*, génération augmentée par la recherche) existe : on va chercher des documents pertinents et on les injecte dans le contexte pour que le modèle s'en serve, sans avoir à le réentraîner.

## Mise en place pas à pas : un mini LLM en Python

Pour toucher le principe, voici un « modèle de langage » minuscule : il compte quel mot suit quel mot dans un petit texte, puis génère en tirant selon ces fréquences. Ce n'est évidemment pas un Transformer (aucune attention, un seul mot de contexte), mais la boucle de génération est la même. Testé avec Python 3.13, sans aucune bibliothèque à installer.

```python
import random
from collections import defaultdict, Counter

corpus = (
    "le chat dort sur le canapé . le chat mange du poisson . "
    "le chien dort sur le tapis . le chien mange un os . "
    "le chat regarde le chien . le chien regarde le chat ."
)
tokens = corpus.split()

# 1. « Entraînement » : on compte quel token suit quel token
suivants = defaultdict(Counter)
for courant, suivant in zip(tokens, tokens[1:]):
    suivants[courant][suivant] += 1

print(suivants["le"])
# Counter({'chat': 4, 'chien': 4, 'canapé': 1, 'tapis': 1})

# 2. « Inférence » : on tire le token suivant selon les fréquences
def generer(debut, longueur=8, graine=0):
    random.seed(graine)
    sortie = [debut]
    for _ in range(longueur):
        compteur = suivants[sortie[-1]]
        mots = list(compteur)
        poids = list(compteur.values())
        sortie.append(random.choices(mots, weights=poids)[0])
    return " ".join(sortie)

for graine in range(3):
    print(generer("le", graine=graine))
```

Avec des graines différentes, on obtient des phrases différentes à partir du même début, par exemple « le chat . le chat mange du poisson . » ou « le tapis . le chat . le chien mange ». Elles ressemblent au corpus mais ne sont pas toujours cohérentes : le modèle imite les régularités, il ne vérifie pas le sens. C'est, en miniature, l'origine des **hallucinations** : une réponse plausible n'est pas forcément vraie.

Voyons maintenant l'effet de la température sur trois scores. La fonction **softmax** transforme des scores en probabilités qui totalisent 1 ; diviser les scores par la température avant de l'appliquer « aplatit » ou « durcit » la distribution.

```python
import math

def softmax(scores, temperature=1.0):
    exps = [math.exp(s / temperature) for s in scores]
    total = sum(exps)
    return [e / total for e in exps]

scores = [2.0, 1.0, 0.1]
for t in (0.2, 1.0, 2.0):
    print(t, [round(p, 2) for p in softmax(scores, t)])
```

Résultat obtenu :

```
0.2 [0.99, 0.01, 0.0]
1.0 [0.66, 0.24, 0.1]
2.0 [0.5, 0.3, 0.19]
```

À température basse, le premier token écrase les autres (comportement quasi déterministe) ; à température haute, les alternatives retrouvent une vraie chance d'être tirées.

## Bonnes pratiques et pièges courants

- **Ne pas confondre fluidité et exactitude.** Le modèle optimise la plausibilité du texte. Pour tout fait important (chiffre, version, référence juridique), vérifiez à la source ou fournissez la source dans le contexte.
- **Compter en tokens, pas en mots.** Estimez vos coûts et vos limites avec le comptage de tokens du modèle réellement utilisé, car le même texte ne donne pas le même nombre de tokens selon le modèle.
- **Ne pas compter sur le déterminisme.** Une température basse réduit la variation mais ne la supprime pas ; ne construisez pas de tests qui exigent une sortie identique au caractère près.
- **Soigner le contexte.** La fenêtre de contexte est votre seul levier à l'exécution : instructions claires, exemples, extraits de documents pertinents. Plus de contexte n'est pas toujours mieux : le bruit nuit.
- **Distinguer connaissance figée et information fournie.** Ce que le modèle « sait » date de son entraînement. Pour de l'actualité ou des données internes, il faut les lui fournir (RAG, outils).

## En entretien

- **« Comment fonctionne un LLM, en deux phrases ? »** « Un LLM est un réseau de neurones de type Transformer entraîné à prédire le token suivant à partir du contexte. À l'usage, il génère du texte token par token, en choisissant parmi des probabilités que règle notamment la température. »
- **« Pourquoi un LLM peut-il halluciner ? »** « Parce qu'il est entraîné à produire une suite plausible, pas à vérifier des faits. Pour limiter le problème, on lui fournit des sources fiables dans le contexte, par exemple avec du RAG, et on vérifie les informations critiques. »
- **« Quelle différence entre pré-entraînement, fine-tuning et contexte ? »** « Le pré-entraînement et le fine-tuning modifient les paramètres du modèle, une fois pour toutes. Le contexte, lui, est ce que je fournis à chaque requête : il n'altère pas le modèle, il guide la réponse du moment. »

## Mini-exercice (15 minutes)

1. Recopiez le script du mini LLM et exécutez-le.
2. Remplacez le corpus par 4 ou 5 phrases de votre choix (un extrait de votre propre rapport de projet, par exemple) et relancez avec plusieurs graines. Que remarquez-vous quand un mot n'a qu'un seul successeur possible dans le corpus ?
3. Modifiez `generer` pour qu'elle s'arrête quand elle rencontre le token `.` (votre « EOS »).
4. Bonus : ajoutez un paramètre `temperature` qui élève chaque poids à la puissance `1 / temperature` avant le tirage, et comparez une température de 0,3 à une température de 2.

## Sources

- Vaswani et al., *Attention Is All You Need*, NIPS 2017 : [page Google Research](https://research.google/pubs/attention-is-all-you-need/) (version arXiv : [1706.03762](https://arxiv.org/pdf/1706.03762.pdf))
- Documentation Claude, [glossaire](https://platform.claude.com/docs/en/about-claude/glossary) (tokens, fenêtre de contexte, température, pré-entraînement, fine-tuning, RLHF, RAG)
- Hugging Face, cours Agents, [What are LLMs?](https://huggingface.co/learn/agents-course/unit1/what-are-llms) (prédiction du token suivant, tokens spéciaux, décodage, familles de Transformers)
