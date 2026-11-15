---
title: C'est quoi un système d'information ? Bien plus qu'un ensemble de logiciels
date: 2026-11-15
track: si-data
topic: c-est-quoi-un-systeme-d-information
level: débutant
reading: 8
summary: Un système d'information, ce sont des personnes, des procédures, des données et des outils qui collectent, stockent, traitent et diffusent l'information d'une organisation. On pose le vocabulaire, on dessine une première cartographie et on prépare les phrases qui font la différence en entretien.
---

## Pourquoi c'est important

Quand on débute, on entend « le SI » partout : « c'est en panne côté SI », « la DSI a validé », « il faut l'intégrer au SI ». Le terme laisse penser à un logiciel unique, une sorte de grosse application. C'est faux, et comprendre pourquoi est le premier pas pour travailler efficacement en entreprise, que ce soit comme développeur fullstack ou comme analyste de données.

Un **système d'information** (SI) est l'ensemble organisé des ressources (humaines, matérielles, logicielles, procédures) qu'une organisation mobilise pour **collecter, stocker, traiter et diffuser** l'information dont elle a besoin pour fonctionner. Ce cycle en quatre verbes revient dans la plupart des cours et des ressources de référence sur le sujet. Votre application Spring Boot, votre base PostgreSQL ou votre rapport Power BI sont des **pièces** du SI, pas le SI lui-même.

Pourquoi cela vous concerne directement : en alternance, vous serez rarement seul face à une application isolée. Votre code lira des données produites par un autre outil, alimentera un tableau de bord consulté par un service différent, et devra respecter des règles (sécurité, protection des données) décidées à l'échelle de l'organisation. Connaître le SI, c'est savoir où votre travail s'insère.

## Comment ça marche

### SI et système informatique : deux notions emboîtées

Le **système informatique** désigne la partie technique : serveurs, postes de travail, réseaux, logiciels, services cloud. Le **système d'information** est plus large : il ajoute les personnes, les **processus métiers** (la façon réelle dont les équipes travaillent : traiter une commande, embaucher, facturer), les règles de gestion et la gouvernance des données. Un SI peut même exister en partie sur papier ; l'informatique est un moyen, pas la définition.

```
┌───────────────────────── Système d'information ─────────────────────────┐
│  Personnes   Processus métiers   Règles de gestion   Gouvernance       │
│  ┌───────────────── Système informatique ──────────────────┐           │
│  │  Matériel (serveurs, postes)  Réseaux  Logiciels  Cloud │           │
│  └──────────────────────────────────────────────────────────┘           │
└──────────────────────────────────────────────────────────────────────────┘
```

### Le cycle de l'information

Quatre fonctions se répètent en boucle :

| Fonction | Question | Exemple concret |
|---|---|---|
| Collecter | D'où vient la donnée ? | Formulaire de commande, import d'un fichier, capteur |
| Stocker | Où et comment est-elle conservée de façon durable ? | Base relationnelle, entrepôt de données |
| Traiter | Que fait-on avec ? | Calcul d'une remise, agrégation, contrôle qualité |
| Diffuser | Qui la reçoit, sous quelle forme ? | Facture PDF, API, tableau de bord Power BI |

### Les briques que l'on rencontre

Une organisation moyenne assemble généralement plusieurs **applications métier** (un logiciel qui couvre un domaine d'activité complet). Voici les familles les plus courantes :

- **ERP** (*Enterprise Resource Planning*, progiciel de gestion intégré) : regroupe des fonctions comme la comptabilité, la paie, les achats, les ventes, les stocks ou la production dans un même socle de données.
- **CRM** (*Customer Relationship Management*) : gestion de la relation client, contacts, opportunités, historique des échanges.
- **SIRH** : système d'information des ressources humaines (paie, congés, recrutement, formation).
- **SI décisionnel** (BI, *Business Intelligence*) : outils qui transforment les données en indicateurs pour piloter l'activité.

Ces briques ne s'ignorent pas : elles échangent des données grâce à des **interfaces de programmation** (API, *Application Programming Interface*), c'est-à-dire des points d'accès qui permettent à deux systèmes de communiquer. On parle d'**interopérabilité** quand deux SI peuvent s'échanger de l'information sans bricolage manuel. C'est précisément là que se situe une grande partie du travail d'un développeur en entreprise.

### Qui s'en occupe ?

La **DSI** (direction des systèmes d'information, dirigée par le ou la directeur·rice des systèmes d'information) est généralement responsable de la cohérence globale du SI : arbitrer les choix technologiques, piloter les projets, gérer les risques de sécurité et faire le lien entre besoins métiers et capacités techniques. La sécurité reste toutefois une responsabilité partagée entre la DSI, les métiers et la direction générale.

## Mise en place pas à pas

Le meilleur moyen de comprendre un SI est d'en dessiner un. Les autorités françaises de cybersécurité le recommandent d'ailleurs : l'ANSSI publie un guide d'élaboration d'une **cartographie du système d'information** en cinq étapes (initier la démarche, choisir un modèle, choisir les outils, construire pas à pas, pérenniser). Elle y décrit trois visions, du métier vers la technique : une vision **métier** (vue de l'écosystème, vue métier du SI), une vision **applicative** (vue des applications, vue de l'administration) et une vision **infrastructure** (vue des infrastructures logiques, vue des infrastructures physiques).

Faisons une version miniature, sur un cas fictif : une librairie en ligne.

**Étape 1, le métier.** Listez les processus : « prendre une commande », « expédier », « facturer », « suivre les ventes ».

**Étape 2, les applications.** Quel outil soutient chaque processus ?

**Étape 3, les flux.** Qui envoie quelles données à qui ?

```
[Client web] -> (commande) -> [Boutique en ligne : Laravel + MySQL]
                                   │ API REST (JSON)
                                   ▼
                          [ERP : stocks + facturation]
                                   │ export nocturne (CSV)
                                   ▼
                      [Entrepôt de données] -> [Tableau de bord Power BI]
```

**Étape 4, l'inventaire exploitable.** Plutôt qu'un dessin perdu dans un dossier, tenez un inventaire sous forme de données. Un petit schéma relationnel suffit pour commencer (SQL standard) :

```sql
CREATE TABLE application (
    id          INTEGER PRIMARY KEY,
    nom         VARCHAR(80) NOT NULL,
    role        VARCHAR(200) NOT NULL,  -- ce qu'elle fait pour le métier
    responsable VARCHAR(80)             -- équipe ou personne référente
);

CREATE TABLE flux (
    id            INTEGER PRIMARY KEY,
    source_id     INTEGER NOT NULL REFERENCES application(id),
    cible_id      INTEGER NOT NULL REFERENCES application(id),
    donnees       VARCHAR(200) NOT NULL,   -- ex. : commandes validées
    mode          VARCHAR(40) NOT NULL     -- API, fichier, base partagée...
);

-- Quelles applications dépendent de la boutique ?
SELECT a.nom, f.donnees, f.mode
FROM flux f
JOIN application a ON a.id = f.cible_id
WHERE f.source_id = (SELECT id FROM application WHERE nom = 'Boutique en ligne');
```

Cette requête répond à une question très concrète : « si je modifie la boutique, qui est touché ? ». C'est exactement l'intérêt d'une cartographie : mesurer l'impact d'un changement ou d'un incident avant qu'il ne survienne.

**Étape 5, la pérennité.** Une cartographie qui n'est pas mise à jour devient fausse en quelques mois. Désignez un responsable et reliez la mise à jour au cycle de vie des projets (chaque nouvelle application ou nouveau flux entre dans l'inventaire avant la mise en production).

Il existe aussi des outils dédiés. Par exemple **Mercator**, une application web libre (licence GPL, développée avec PHP et Laravel d'après sa présentation de 2021) conçue pour gérer une cartographie selon le guide de l'ANSSI. Pour un premier exercice, un simple tableau ou le schéma ci-dessus suffit.

## Bonnes pratiques et pièges courants

- **Partir du métier, pas des outils.** Un SI se construit à partir des processus réels des équipes. Un inventaire de serveurs sans les processus qu'ils servent ne dit pas à quoi ils sont utiles.
- **Éviter les silos.** Quand chaque service a son outil et ses fichiers, la même donnée (un client, un produit) existe en plusieurs versions contradictoires. L'un des buts du SI est de structurer les flux entre métiers, outils et personnes.
- **Ne pas confondre SI et application.** Dire « le SI est lent » sans préciser quel composant, quel flux ou quel processus est en cause ne permet pas de diagnostiquer.
- **Documenter les flux cachés.** Le fichier Excel envoyé chaque lundi par e-mail est une interface entre deux systèmes, même si personne ne l'a déclarée. Les « SI fantômes » (outils utilisés sans validation de la DSI) créent des risques de sécurité et de conformité.
- **Penser sécurité et données personnelles dès la cartographie.** Savoir où se trouve chaque donnée est le préalable à tout le reste : protection, sauvegarde, respect du RGPD, plan de continuité.
- **Garder l'inventaire à jour.** Un document périmé est pire qu'une absence de document, car il donne une fausse confiance.

## En entretien

> **« C'est quoi un système d'information ? »** : « C'est l'ensemble organisé de personnes, de procédures, de données et d'outils qui permet à une organisation de collecter, stocker, traiter et diffuser l'information. L'informatique en est la partie technique, mais le SI inclut aussi les processus métiers et la gouvernance des données. »

> **« Quelle différence avec un système informatique ? »** : « Le système informatique, ce sont les machines, les réseaux et les logiciels. Le SI est plus large : il ajoute les utilisateurs, les processus et les règles. »

> **« Comment votre code s'insère-t-il dans le SI ? »** : « Je cherche à savoir d'où viennent mes données, qui les consomme ensuite et par quelle interface (API, fichier, base). Cela me permet d'anticiper l'impact d'une évolution. »

## Mini-exercice (15 minutes)

Choisissez une organisation que vous connaissez : votre école, une association, un stage précédent. Listez trois processus métiers, les applications qui les soutiennent et au moins quatre flux de données entre elles (précisez le mode : API, fichier, saisie manuelle). Dessinez le résultat en texte comme ci-dessus, puis repérez un point fragile : un flux manuel, une application sans responsable, une donnée saisie deux fois. Notez en une phrase ce que vous proposeriez pour le corriger.

## Sources

- OpenClassrooms, [Définissez ce qu'est un système d'information](https://openclassrooms.com/fr/courses/2100086-decouvrez-le-monde-des-systemes-d-information/5195831-definissez-ce-qu-est-un-systeme-d-information) (cours « Découvrez le monde des systèmes d'information »).
- ANSSI, [Cartographie du système d'information : guide d'élaboration en 5 étapes](https://messervices.cyber.gouv.fr/documents-guides/20181213_anssi_guide_cartographie_v1b.pdf).
- LinuxFr.org, [Mercator, la cartographie du système d'information](https://linuxfr.org/news/mercator-la-cartographie-du-systeme-d-information) (dépêche de présentation, mai 2021).
- Lemon Learning, [Système d'information : définition et rôle](https://lemonlearning.com/fr/glossaire/systeme-information).
- PayFit, [Système d'information : définition et exemples](https://payfit.com/fr/fiches-pratiques/systeme-information/).
