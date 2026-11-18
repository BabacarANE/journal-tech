---
title: Docker, comprendre la différence entre une image et un conteneur
date: 2026-11-18
track: devops
topic: docker-images-et-conteneurs
level: débutant
reading: 8
summary: Une image est un modèle figé, un conteneur est une instance qui tourne. On voit comment les couches empilées expliquent la légèreté de Docker, puis on lance, inspecte et supprime un premier conteneur en ligne de commande.
---

## Pourquoi c'est important

« Chez moi, ça marche. » Cette phrase résume un problème vieux comme le développement : une application dépend d'une version de Java, de Python ou de Node.js, de bibliothèques système, de variables de configuration. Si la machine de production, celle d'un collègue ou celle du serveur d'intégration continue diffère un peu de la vôtre, l'application se comporte autrement.

Docker répond à ce problème en **empaquetant l'application avec tout ce dont elle a besoin pour tourner**. Ce paquet s'exécute ensuite de la même façon partout où Docker est installé. C'est devenu un prérequis dans beaucoup d'offres d'alternance fullstack et data : on attend de vous que vous sachiez lancer une base de données ou un service en une commande, et expliquer ce qui se passe.

Deux mots sont à bien distinguer dès le départ, car ils sont souvent confondus :

- une **image** est le paquet, un modèle en lecture seule ;
- un **conteneur** est une instance de cette image en cours d'exécution (ou arrêtée mais encore présente sur la machine).

L'analogie la plus parlante pour un développeur : l'image est à un conteneur ce que la classe est à l'objet. Une classe, plusieurs objets ; une image, plusieurs conteneurs.

## Comment ça marche

### L'image : un empilement de couches immuables

D'après la documentation officielle de Docker, une image contient les fichiers, binaires, bibliothèques et éléments de configuration nécessaires pour exécuter un conteneur. Deux propriétés sont essentielles.

1. **Elle est immuable** : une fois créée, on ne la modifie pas. Pour changer quelque chose, on construit une nouvelle image, souvent en ajoutant des couches par-dessus une image existante.
2. **Elle est composée de couches** (*layers*). Chaque couche représente un ensemble de modifications du système de fichiers : ajouts, suppressions, changements de fichiers.

Ce découpage a un intérêt pratique énorme. Les couches sont réutilisables d'une image à l'autre : si dix de vos images partent de la même image de base Python, cette base n'est stockée qu'une fois sur la machine et n'est téléchargée qu'une fois. Les constructions et les transferts en sont accélérés, et l'espace disque économisé.

### Le conteneur : l'image plus une couche d'écriture

Quand Docker démarre un conteneur, il fait en gros trois choses, d'après la page de la documentation consacrée aux couches :

- chaque couche est extraite dans son propre répertoire sur la machine hôte ;
- un système de fichiers dit **union** (*union filesystem*) les superpose pour présenter une vue unique ;
- la racine du conteneur est positionnée sur cette vue, avec un mécanisme appelé `chroot` (qui change le répertoire racine vu par un processus).

Chaque conteneur reçoit en plus **son propre répertoire en écriture** au-dessus des couches en lecture seule. Les couches de l'image ne sont jamais modifiées, ce qui permet à de nombreux conteneurs de partager la même image. Conséquence à retenir : ce que le conteneur écrit vit dans sa couche à lui, pas dans l'image.

```
        Conteneur A          Conteneur B
      [ couche écriture ]  [ couche écriture ]   <- propre à chaque conteneur
              \                  /
        ┌──────────────────────────────┐
        │ couche 3 : votre application │
        │ couche 2 : dépendances       │   <- image, en lecture seule,
        │ couche 1 : système de base   │      partagée
        └──────────────────────────────┘
```

### Où l'on trouve les images : les registres

Un **registre** est un service qui stocke et distribue des images. Le registre public par défaut est **Docker Hub**, où l'on trouve notamment les *Docker Official Images*, des images maintenues et sélectionnées pour des logiciels courants (serveurs web, bases de données, langages). Sur une image, un **tag** (par exemple un numéro de version) désigne une variante précise : c'est ce qui permet de choisir quelle version d'un logiciel on utilise.

### Qui fait quoi ?

Quand vous tapez une commande `docker ...`, vous parlez au client Docker en ligne de commande, qui transmet la demande au service Docker en arrière-plan (le *daemon*), lequel gère images et conteneurs. Les noms de versions évoluent régulièrement : la documentation de Docker Engine est organisée aujourd'hui par séries (la série 29 au moment de cette leçon), donc vérifiez toujours la version installée chez vous avec `docker version`.

## Mise en place pas à pas

Installez Docker Desktop (Windows, macOS) ou Docker Engine (Linux) en suivant les instructions de la documentation officielle pour votre système, puis vérifiez :

```bash
docker version
```

### Étape 1 : récupérer une image

```bash
docker pull nginx
docker image ls
```

`docker pull` télécharge l'image depuis Docker Hub. `docker image ls` liste les images présentes localement avec leur identifiant, leur tag, leur date de création et leur taille (taille décompressée). Pour voir les couches qui la composent :

```bash
docker image history nginx
```

Chaque ligne correspond à une étape de construction de l'image : c'est exactement l'empilement décrit plus haut.

### Étape 2 : lancer un conteneur

```bash
docker run -d --name web -p 8080:80 nginx
```

- `-d` lance le conteneur en arrière-plan ;
- `--name web` lui donne un nom lisible ;
- `-p 8080:80` relie le port 8080 de votre machine au port 80 du conteneur (le port d'écoute habituel de nginx) ;
- `nginx` est l'image utilisée.

Ouvrez ensuite `http://localhost:8080` dans le navigateur : la page d'accueil de nginx s'affiche.

### Étape 3 : observer et interagir

```bash
docker ps                 # conteneurs en cours d'exécution
docker logs web           # sorties du conteneur
docker exec -it web sh    # ouvre un terminal dans le conteneur
```

Dans ce terminal, tapez `exit` pour revenir à votre machine. Ces trois commandes sont celles que vous utiliserez le plus au quotidien : voir ce qui tourne, lire les journaux, entrer dedans pour comprendre un problème.

### Étape 4 : arrêter et nettoyer

```bash
docker stop web
docker rm web
```

`docker stop` arrête le conteneur, `docker rm` le supprime. L'image, elle, reste disponible localement : on peut relancer un nouveau conteneur à partir d'elle immédiatement.

## Bonnes pratiques et pièges courants

- **Ne pas confondre image et conteneur.** Supprimer un conteneur ne supprime pas l'image, et inversement.
- **Ce qu'on écrit dans un conteneur est lié à ce conteneur.** Les données vivent dans la couche d'écriture propre à celui-ci. Pour conserver des données (base de données, fichiers déposés), Docker propose des mécanismes dédiés de stockage persistant (les volumes), que l'on verra dans une prochaine leçon avec Docker Compose. Retenez pour l'instant qu'il ne faut pas compter sur l'intérieur d'un conteneur pour garder des données importantes.
- **Choisir un tag précis.** Un tag générique peut pointer vers une version différente d'un jour à l'autre. En projet réel, on précise la version voulue, pour que le comportement reste reproductible. Consultez la page de l'image sur Docker Hub pour connaître les tags disponibles.
- **Préférer les images officielles ou vérifiées** : ce sont des sources dont la provenance est plus claire que celle d'une image publiée par un inconnu.
- **Un conteneur = un rôle.** On évite de tout mettre dans un seul conteneur (serveur web, base de données et batch) : on lance un conteneur par service.
- **Penser à nettoyer.** Les conteneurs arrêtés et les images inutilisées occupent du disque. `docker ps -a` montre aussi les conteneurs arrêtés.

## En entretien

- **« C'est quoi la différence entre une image et un conteneur ? »** « Une image est un modèle immuable, fait de couches en lecture seule. Un conteneur est une instance de cette image : Docker ajoute une couche d'écriture propre à chaque conteneur, ce qui permet d'en lancer plusieurs à partir de la même image. »
- **« Pourquoi utiliser Docker ? »** « Pour que l'application tourne de la même manière sur mon poste, en intégration continue et en production, en embarquant ses dépendances. Et pour lancer très vite des services annexes comme une base de données de test. »
- **« Pourquoi les images sont-elles organisées en couches ? »** « Les couches se réutilisent : une image de base commune n'est stockée et téléchargée qu'une seule fois, ce qui accélère les constructions et économise de l'espace. »

## Mini-exercice

Durée : 15 minutes.

1. Lancez un conteneur nginx avec `docker run -d --name web -p 8080:80 nginx` et vérifiez la page sur `http://localhost:8080`.
2. Lancez un second conteneur à partir de la même image, avec un autre nom et un autre port (par exemple `web2` et `8081`). Confirmez avec `docker ps` que les deux tournent.
3. Entrez dans le premier avec `docker exec -it web sh`, créez un fichier avec `touch /tmp/test.txt`, puis sortez. Entrez dans le second et vérifiez que le fichier n'existe pas. Expliquez pourquoi avec vos mots (une couche d'écriture par conteneur).
4. Exécutez `docker image history nginx`, repérez le nombre de couches et notez-le.
5. Arrêtez et supprimez les deux conteneurs, puis vérifiez avec `docker image ls` que l'image est toujours là.

## Sources

- Docker, [What is an image?](https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-an-image/), documentation officielle.
- Docker, [Understanding the image layers](https://docs.docker.com/get-started/docker-concepts/building-images/understanding-image-layers/), documentation officielle.
- Docker, [Docker Engine release notes](https://docs.docker.com/engine/release-notes/), documentation officielle (série 29).
- Pour les options de commande : Docker, [docker container run](https://docs.docker.com/reference/cli/docker/container/run/), référence officielle de la CLI, à consulter pour aller plus loin.
