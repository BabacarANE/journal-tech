---
title: Urbaniser un SI : le plan de ville de l'informatique d'une organisation
date: 2026-11-22
track: si-data
topic: urbanisation-et-architecture-du-si
level: intermédiaire
reading: 9
summary: Pourquoi parle-t-on de « zones », de « quartiers » et d'« urbaniste » pour un système d'information ? On découvre les quatre couches d'architecture (métier, fonctionnelle, applicative, technique), la règle « un bloc, une application » et comment s'en servir pour repérer les doublons.
---

## Pourquoi c'est important

Dans la leçon du 15 novembre, on a vu qu'un système d'information (SI) est un ensemble de personnes, de processus, de données et d'outils. Reste une question : comment le SI grandit-il avec le temps ? Dans beaucoup d'organisations, la réponse est « par empilement ». Un besoin apparaît, on achète ou on développe une application ; un autre besoin, une autre application. Les échanges entre elles se bricolent au fil des urgences : un export de fichier ici, un accès direct à la base de données là. Au bout de quelques années, plus personne ne sait ce qui dépend de quoi. On parle d'architecture « spaghetti ».

Les sources francophones de référence situent la naissance de la démarche d'**urbanisation** dans les années 1980, notamment dans les banques, justement pour sortir de cette situation. Le principe : au lieu de réagir projet par projet, on se donne un **plan d'ensemble** du SI, stable et lisible, auquel chaque décision d'investissement se réfère. L'objectif affiché est que le SI puisse évoluer sans détruire l'existant et reste aligné sur la stratégie de l'organisation.

Pour vous, développeur fullstack ou analyste de données en alternance, c'est utile très concrètement. Quand on vous demande « une nouvelle application de suivi », la bonne question est : à quel endroit du plan s'insère-t-elle, et existe-t-il déjà quelque chose qui fait la même chose ? Cette leçon vous donne le vocabulaire pour poser cette question en réunion.

## Comment ça marche

### La métaphore de la ville

**Urbaniser** un SI, c'est reprendre les idées de l'urbanisme. Une ville change en permanence : on construit, on rénove, on démolit. Pourtant, elle reste habitable parce qu'un plan fixe un cadre : des zones, des réseaux (eau, électricité, routes) et des règles de raccordement. On peut remplacer un immeuble sans mettre en péril le quartier, à condition qu'il se branche correctement sur les réseaux.

Le vocabulaire se transpose ainsi :

| Ville | Système d'information |
|---|---|
| Plan d'occupation des sols | Cartographie du SI : où se trouve quelle fonction |
| Zone | Grand domaine d'activité (ex. : cœur de métier, support, pilotage) |
| Quartier | Sous-ensemble d'une zone (ex. : gestion des crédits) |
| Îlot ou bloc | Plus petit ensemble cohérent de fonctions, géré comme un tout |
| Réseaux (routes, eau) | Échanges entre applications : API, bus de messages, fichiers |
| Urbaniste | Personne qui tient le plan et arbitre les évolutions |

Exemple tiré de la littérature sur le sujet, dans une banque : la zone « banque commerciale » contient un quartier « gestion de l'épargne », qui se découpe lui-même en blocs fonctionnels.

### Les quatre couches

L'urbanisation décrit le SI sous quatre angles, du plus proche du métier au plus proche des machines. C'est une démarche descendante (*top-down*) : on part des processus pour arriver à l'infrastructure.

```
Couche métier        Quels processus ? Qui fait quoi, et pourquoi ?
        │            (commander, expédier, facturer)
        ▼
Couche fonctionnelle Quels blocs de fonctions et quelles données ?
        │            (catalogue, commandes, stocks, facturation)
        ▼
Couche applicative   Quelles applications réalisent ces blocs ?
        │            (boutique en ligne, ERP, outil de BI)
        ▼
Couche technique     Sur quelles infrastructures ?
                     (serveurs, bases, réseaux, cloud)
```

La couche **fonctionnelle** est la plus originale. Elle décrit ce que le SI doit faire, indépendamment des produits choisis. Un bloc « Facturation » existe qu'on utilise un ERP, un logiciel spécialisé ou un tableur. C'est ce qui permet de raisonner sur l'organisation sans se perdre dans les noms de logiciels.

### Les règles du plan

Trois principes reviennent dans les cours sur le sujet :

- **Cohésion forte à l'intérieur d'un bloc, couplage faible entre blocs.** Les fonctions d'un même bloc travaillent sur les mêmes données et évoluent ensemble ; entre deux blocs, on n'échange que ce qui est nécessaire, par des interfaces bien définies. Le **couplage** mesure à quel point deux éléments dépendent l'un de l'autre : s'il est faible, on peut en modifier un sans casser l'autre.
- **Une application appartient à un seul bloc** (et un bloc est réalisé, idéalement, par une seule application de référence). Cela évite les doublons et les données contradictoires.
- **Des échanges standardisés.** Plutôt que des liaisons point à point, on passe par des mécanismes communs : services web, **bus d'entreprise** (ESB, *Enterprise Service Bus*, un intermédiaire qui achemine les messages entre applications) ou, aujourd'hui, API. Les microservices, à eux seuls, ne règlent pas les problèmes d'interconnexion : il faut toujours décider qui parle à qui, et comment.

### Et l'architecture d'entreprise ?

L'urbanisation est une approche francophone ; à l'international, on parle plutôt d'**architecture d'entreprise** (*enterprise architecture*). Deux références à connaître de nom :

- **TOGAF** (*The Open Group Architecture Framework*), un cadre méthodologique qui découpe une architecture d'entreprise en quatre domaines : **métier** (*business*), **données** (*data*), **application** et **technologie**. Sa méthode centrale s'appelle l'ADM (*Architecture Development Method*).
- **ArchiMate**, un langage de modélisation graphique du même organisme, l'Open Group. Son noyau est organisé en trois couches : **métier**, **application** et **technologie**, auxquelles s'ajoutent des éléments de stratégie, de motivation, ainsi que de mise en œuvre et de migration. Il sert à décrire, analyser et communiquer une architecture, et propose un format d'échange XML entre outils.

On retrouve la même logique que dans les quatre couches françaises : partir du métier, descendre vers la technique, et relier les deux.

## Mise en place pas à pas

Reprenons la librairie en ligne fictive de la leçon du 15 novembre et construisons un mini plan d'urbanisation sous forme de données. Le SQL ci-dessous est du SQL standard ; je l'ai testé avec SQLite 3.53.1.

**Étape 1, dessiner les zones et les blocs.** Trois zones suffisent : cœur de métier, support, pilotage.

**Étape 2, lister les applications existantes**, y compris les « SI fantômes » (un tableur que quelqu'un utilise tous les jours sans que personne ne l'ait déclaré).

**Étape 3, dire quelle application réalise quel bloc.**

```sql
CREATE TABLE zone (id INTEGER PRIMARY KEY, nom VARCHAR(60) NOT NULL);

CREATE TABLE bloc (
    id      INTEGER PRIMARY KEY,
    nom     VARCHAR(80) NOT NULL,
    zone_id INTEGER NOT NULL REFERENCES zone(id)
);

CREATE TABLE application (id INTEGER PRIMARY KEY, nom VARCHAR(80) NOT NULL);

CREATE TABLE realise (
    application_id INTEGER NOT NULL REFERENCES application(id),
    bloc_id        INTEGER NOT NULL REFERENCES bloc(id),
    PRIMARY KEY (application_id, bloc_id)
);

INSERT INTO zone VALUES (1,'Cœur de métier'),(2,'Support'),(3,'Pilotage');
INSERT INTO bloc VALUES
  (1,'Catalogue',1),(2,'Commandes',1),(3,'Stocks',1),
  (4,'Facturation',2),(5,'Tableaux de bord',3);
INSERT INTO application VALUES
  (1,'Boutique'),(2,'ERP'),(3,'Tableur Excel'),(4,'Power BI');
INSERT INTO realise VALUES
  (1,1),(1,2),(2,3),(2,4),(2,2),(3,4),(4,5);
```

**Étape 4, interroger le plan.** La première requête cherche les blocs réalisés par plusieurs applications, donc les doublons potentiels :

```sql
SELECT b.nom AS bloc, COUNT(*) AS nb_applications
FROM realise r
JOIN bloc b ON b.id = r.bloc_id
GROUP BY b.id, b.nom
HAVING COUNT(*) > 1;
```

Résultat : `Commandes` (2) et `Facturation` (2). Les commandes sont gérées à la fois par la boutique et par l'ERP, et la facturation à la fois par l'ERP et par un tableur. Voilà deux sujets concrets pour l'urbaniste : quelle application fait référence pour les commandes ? Faut-il intégrer le tableur à l'ERP ou le supprimer ?

Deux requêtes complémentaires vérifient l'autre sens : une application qui ne réalise aucun bloc est-elle encore utile, et un bloc sans application est-il un trou dans le SI ?

```sql
-- Applications qui ne réalisent aucun bloc
SELECT a.nom FROM application a
LEFT JOIN realise r ON r.application_id = a.id
WHERE r.bloc_id IS NULL;

-- Blocs sans application
SELECT b.nom FROM bloc b
LEFT JOIN realise r ON r.bloc_id = b.id
WHERE r.application_id IS NULL;
```

Dans notre exemple, ces deux requêtes ne renvoient rien : le plan est complet, mais pas encore simplifié.

## Bonnes pratiques et pièges courants

- **Ne pas se contenter de dessiner.** Une critique classique de l'urbanisation est qu'elle se réduit souvent à une cartographie ou une modélisation, en oubliant l'alignement stratégique et les contraintes technologiques. Un plan magnifique que personne n'utilise pour décider ne sert à rien.
- **Rester pragmatique.** Les descriptions « de manuel » (quatre couches, zones, quartiers, îlots) sont une grille de lecture, pas un rituel à respecter à la lettre. Sur le terrain, on adapte le niveau de détail à la taille de l'organisation.
- **Partir du métier.** Le découpage en blocs doit refléter le vocabulaire et les processus des équipes, pas l'organigramme des outils. La couche métier est sensible : elle touche à l'organisation et aux personnes, donc elle se construit avec les métiers.
- **Distinguer maîtrise d'ouvrage et maîtrise d'œuvre.** La maîtrise d'ouvrage (MOA) exprime le besoin métier ; la maîtrise d'œuvre (MOE) le réalise techniquement. L'urbaniste fait le lien entre les deux.
- **Éviter les liaisons point à point.** Chaque connexion directe entre deux applications est un câble de plus dans le plat de spaghettis. Préférez des interfaces documentées (API) ou un bus commun.
- **Mettre à jour le plan.** Comme la cartographie vue le 15 novembre, un plan non entretenu devient faux, donc trompeur.

## En entretien

> **« Que signifie urbaniser un SI ? »** : « C'est piloter l'évolution du SI avec un plan d'ensemble, comme une ville : on le découpe en zones et en blocs fonctionnels peu dépendants les uns des autres, pour pouvoir remplacer une application sans casser le reste et garder le SI aligné sur les objectifs de l'organisation. »

> **« Quelles sont les couches d'architecture d'un SI ? »** : « On distingue la couche métier (les processus), la couche fonctionnelle (les blocs de fonctions et de données), la couche applicative (les applications qui les réalisent) et la couche technique (l'infrastructure). TOGAF et ArchiMate reprennent une logique voisine avec les domaines métier, données, application et technologie. »

> **« Pourquoi une application ne devrait-elle appartenir qu'à un seul bloc ? »** : « Pour éviter les doublons et les données contradictoires : si deux applications gèrent les commandes, laquelle fait foi ? Un bloc avec une application de référence clarifie les responsabilités et simplifie les échanges. »

## Mini-exercice (15 minutes)

Reprenez l'organisation que vous avez cartographiée le 15 novembre (école, association, ancien stage). Définissez trois zones (par exemple cœur de métier, support, pilotage), puis cinq à six blocs fonctionnels. Recopiez le schéma SQL de cette leçon dans SQLite (ou un autre moteur), insérez vos applications et vos liens `realise`, puis exécutez la requête de détection des doublons. Notez en une phrase, pour chaque bloc réalisé par plusieurs applications, laquelle devrait faire référence et pourquoi.

Cette leçon est informative et pédagogique : elle présente une démarche d'architecture, pas un cadre normatif à appliquer tel quel.

## Sources

- Universalis, [Systèmes informatiques : conception, architecture et urbanisation des systèmes d'information](https://www.universalis.fr/encyclopedie/systemes-informatiques-conception-architecture-et-urbanisation-des-systemes-d-information/3-urbanisation/) (section « Urbanisation »).
- Techno-science.net, [Urbanisation (informatique)](https://www.techno-science.net/fr/definitions/urbanisation-informatique) (article repris de Wikipédia).
- Journal du Net, [Urbanisation informatique : décryptage](https://www.journaldunet.com/solutions/dsi/1093239-urbanisation-informatique-decryptage/).
- Worldline, [Urbanisation des systèmes d'information](https://perso.liris.cnrs.fr/lionel.medini/enseignement/IS/CM/Urbanisation-des-SI-WorldLine-2024-03-26.pdf) (support de cours, 26 mars 2024).
- Université de Genève (SI@UNIGE), [Architecture du SI et partage des responsabilités](https://www.unige.ch/stic/si-unige/architecture).
- The Open Group, [TOGAF Standard : introduction](https://pubs.opengroup.org/togaf-standard/introduction/chap03.html) et [ADM](https://pubs.opengroup.org/togaf-standard/adm/chap01.html).
- The Open Group, [ArchiMate 3.2 Specification](https://pubs.opengroup.org/architecture/archimate32-doc.singlepage).
