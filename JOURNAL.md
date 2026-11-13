# Guide éditorial du journal

Ce fichier décrit comment écrire chaque leçon quotidienne. Il est lu à chaque exécution par la tâche planifiée : modifiez-le pour changer le style, la longueur ou la rotation des sujets.

## Lecteur

Babacar, étudiant en Master 2 Développement & Data (EPSI Paris), en recherche d'alternance en développement web fullstack ou data analyse. Stack : Java/Spring Boot, Django, Node.js, Laravel, React, Vue.js, SQL, Power BI, Python. Il veut enrichir sa culture générale du métier et savoir en parler en entretien.

## Rotation (fuseau Europe/Paris)

| Jour | Parcours (`track`) |
|---|---|
| Lundi | `frameworks` |
| Mardi | `bonnes-pratiques` |
| Mercredi | `devops` |
| Jeudi | `ia` |
| Vendredi | `cybersecurite` |
| Samedi | `donnees-legislation` |
| Dimanche | `si-data` |

Le sujet du jour se choisit dans `curriculum.md` : premier sujet du parcours qui n'a pas encore d'entrée (champ `topic` des fichiers de `entries/`). Si la liste du parcours est épuisée, proposer un nouveau sujet cohérent et l'ajouter à `curriculum.md`.

## Fichier d'une leçon

Chemin : `entries/AAAA-MM-JJ-<topic>.md` (date du jour à Paris, `topic` en minuscules séparées par des tirets).

```
---
title: Titre clair et concret
date: AAAA-MM-JJ
track: frameworks
topic: spring-boot-injection-dependances
level: débutant | intermédiaire | avancé
reading: 9
summary: Une ou deux phrases qui donnent envie de lire et disent ce qu'on apprend.
---
```

## Structure de la leçon (1 200 à 1 800 mots, environ 8 à 10 minutes)

1. **Pourquoi c'est important** : le problème que le sujet résout, en quelques phrases.
2. **Comment ça marche** : le modèle mental, avec un schéma en texte ou un petit tableau si utile.
3. **Mise en place pas à pas** : commandes et code courts, cohérents entre eux, avec la version utilisée (indiquée explicitement).
4. **Bonnes pratiques et pièges courants**.
5. **En entretien** : 2 à 3 phrases ou questions-réponses que Babacar peut réutiliser en entretien d'alternance.
6. **Mini-exercice** : une petite tâche réalisable en 15 minutes.
7. **Sources** : liens vers la documentation officielle et les textes de référence utilisés.

## Règles de qualité

- Vérifier le contenu sur la documentation officielle avec la recherche web avant d'écrire, surtout les numéros de version, les commandes et les dates. Ne jamais citer de version ou de fait de mémoire.
- Ne rien inventer : si un point n'a pas pu être vérifié, ne pas l'écrire.
- Reformuler avec ses propres mots ; pas de passages recopiés de la documentation ou d'articles.
- Français clair, ton pédagogique, définir chaque terme technique à sa première apparition.
- Cybersécurité : angle défensif uniquement (comprendre les attaques pour s'en protéger), aucun mode d'emploi d'exploitation.
- Législation (RGPD, CNIL, AI Act, etc.) : s'appuyer sur les textes officiels (EUR-Lex, Légifrance, CNIL), indiquer que la leçon est informative et ne constitue pas un conseil juridique.
- Code : blocs avec la langue indiquée (` ```java `, ` ```python `, etc.).
