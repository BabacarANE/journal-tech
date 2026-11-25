---
title: Docker Compose, décrire plusieurs conteneurs dans un seul fichier
date: 2026-11-25
track: devops
topic: docker-compose-pour-le-developpement
level: débutant
reading: 9
summary: Au lieu d'enchaîner de longues commandes `docker run`, on décrit tout l'environnement de développement dans un fichier `compose.yaml`. On voit comment services, réseau, volumes et ordre de démarrage s'articulent, puis on le démontre avec un exemple qui tient en vingt lignes.
---

## Pourquoi c'est important

Dans la leçon précédente, on a lancé un conteneur avec `docker run -d --name web -p 8080:80 nginx`. Pour un seul service, c'est supportable. Mais une application réelle en demande presque toujours plusieurs : un serveur web, une API, une base de données, parfois un cache. Chacun a ses options (ports, variables, stockage), et ils doivent se parler.

Taper et retaper quatre longues commandes, dans le bon ordre, en se souvenant des options, n'est ni fiable ni partageable. **Docker Compose** résout cela : on décrit l'ensemble de l'application dans **un fichier YAML**, et une seule commande crée, démarre ou arrête le tout. Ce fichier se versionne avec le code : un nouveau collègue (ou vous, sur un autre poste) lance tout l'environnement en une commande. En alternance, c'est un réflexe attendu : « clone le dépôt, lance `docker compose up`, ça tourne ».

## Comment ça marche

### Le modèle de Compose

D'après la documentation officielle, un fichier Compose décrit une application à partir de quelques notions :

- les **services** : chaque service est un composant de l'application, implémenté en exécutant une image (avec une configuration donnée) une ou plusieurs fois ;
- les **réseaux** : ils permettent aux services de communiquer entre eux ;
- les **volumes** : ils stockent les données de façon persistante, au-delà de la vie d'un conteneur ;
- les **configs** et les **secrets** : des données de configuration montées dans les conteneurs sous forme de fichiers, les secrets étant réservés aux données sensibles.

Le fichier s'appelle de préférence `compose.yaml` (ou `compose.yml`) et se place à la racine du projet. Les anciens noms `docker-compose.yml` et `docker-compose.yaml` restent pris en charge pour la compatibilité, mais si les deux types de fichiers coexistent, c'est `compose.yaml` qui l'emporte. Un détail qui évite de la confusion en lisant de vieux tutoriels : la ligne `version:` en tête de fichier, très courante autrefois, est **obsolète**. Elle n'est conservée que pour la compatibilité, n'a qu'une valeur informative et provoque un avertissement. À l'inverse, la clé `name:` (nom du projet) est utile : elle regroupe les ressources du projet et les isole d'un autre déploiement de la même application.

### Le réseau : joindre un service par son nom

Par défaut, `docker compose up` crée un réseau pour le projet, nommé `<nom-du-projet>_default`, et y connecte tous les services. Chaque service est enregistré dans un DNS interne sous son **nom de service**. Concrètement, un service `web` joint la base de données avec une adresse comme `db:5432`, sans jamais connaître d'adresse IP (elles changent d'un démarrage à l'autre, ne vous y fiez pas).

Il faut bien distinguer deux ports quand on écrit `"8001:5432"` :

- **5432** est le port du conteneur : c'est celui qu'utilisent les autres services du réseau (`db:5432`) ;
- **8001** est le port publié sur votre machine : il ne sert qu'à y accéder depuis l'extérieur du réseau (`localhost:8001`).

Erreur classique de débutant : configurer l'API pour joindre `localhost:8001` au lieu de `db:5432`. Dans un conteneur, `localhost` désigne le conteneur lui-même.

### Les volumes : garder les données

On l'a vu : ce qu'un conteneur écrit vit dans sa couche d'écriture, liée à ce conteneur. Compose utilise deux mécanismes pour conserver des données ou partager des fichiers avec votre machine :

- le **volume nommé** : on le déclare dans la section `volumes:` du fichier, puis on le monte par son nom dans un service. `docker compose up` le crée s'il n'existe pas, sinon il réutilise l'existant ;
- le **bind mount** : on monte un dossier de votre machine dans le conteneur (syntaxe `./dossier:/chemin/dans/le/conteneur`). Le chemin relatif doit commencer par `.` ou `..`, sinon Compose le prendrait pour un nom de volume. On peut ajouter `:ro` pour un montage en lecture seule.

En pratique : volume nommé pour des données qui doivent survivre (base de données), bind mount pour du code ou de la configuration que vous éditez depuis votre poste.

### L'ordre de démarrage : depends_on et healthcheck

`depends_on` indique qu'un service dépend d'un autre. Sous sa forme courte (une simple liste de noms), Compose démarre les dépendances d'abord, mais **n'attend pas qu'elles soient prêtes**. Or « démarré » ne veut pas dire « prêt à répondre » : une base de données met parfois plusieurs secondes à accepter des connexions.

La forme longue permet une `condition` :

- `service_started` : comportement de la forme courte ;
- `service_healthy` : on attend que la vérification de santé du service passe ;
- `service_completed_successfully` : on attend que le service se termine avec succès (pratique pour une migration ponctuelle).

La vérification de santé se déclare avec `healthcheck` : une commande `test`, jouée à intervalle régulier (`interval`), avec un délai maximal (`timeout`), un nombre d'essais (`retries`) et éventuellement une période de grâce au démarrage (`start_period`).

## Mise en place pas à pas

Installez Docker (voir la leçon précédente). Compose est fourni avec Docker Desktop, et s'utilise via la sous-commande `docker compose`. Vérifiez votre version :

```bash
docker compose version
```

Au moment de cette leçon, la dernière version publiée sur la page des releases du projet est la v5.8.0 (17 novembre 2026). La vôtre peut différer : ce n'est pas bloquant, la syntaxe de base est stable.

### Un premier fichier, entièrement vérifiable

Plutôt que d'imaginer une base de données dont les variables dépendent de chaque image, on construit un exemple minimal avec l'image `alpine` (une petite distribution Linux) qui illustre les trois idées de la leçon : ordre de démarrage, réseau implicite et persistance. Créez un dossier vide et un fichier `compose.yaml` :

```yaml
name: demo-compose

services:
  serveur:
    image: alpine
    # Le service met 5 secondes à être "prêt" : il crée alors un fichier témoin.
    command: sh -c "sleep 5 && touch /tmp/pret && sleep 3600"
    healthcheck:
      test: ["CMD-SHELL", "test -f /tmp/pret"]
      interval: 2s
      timeout: 2s
      retries: 10

  client:
    image: alpine
    depends_on:
      serveur:
        condition: service_healthy
    # À chaque exécution, on ajoute une ligne datée puis on affiche tout le fichier.
    command: sh -c "date >> /donnees/journal.txt && cat /donnees/journal.txt"
    volumes:
      - donnees:/donnees

volumes:
  donnees:
```

Lisez-le de haut en bas : `serveur` simule un service lent (prêt après 5 secondes), `client` attend qu'il soit **sain** avant de démarrer, et écrit dans un volume nommé `donnees`. Dans une vraie application, `serveur` serait votre base de données, et `test` une commande qui vérifie qu'elle accepte des connexions.

### Lancer, observer, arrêter

```bash
docker compose up
```

Compose crée le réseau, le volume, démarre `serveur`, attend que son état passe à « sain », puis démarre `client`, qui affiche une première ligne datée. Vous voyez dans la sortie l'ordre imposé par `depends_on`. Quand `client` a fini, interrompez avec Ctrl+C, puis :

```bash
docker compose ps
docker compose down
```

`ps` liste les conteneurs du projet, `down` arrête et nettoie le projet. Pour savoir exactement ce que `down` supprime par défaut et ce que ses options changent, lisez `docker compose down --help` plutôt que de le deviner : c'est l'objet du mini-exercice.

### Rechargement automatique avec Compose Watch

Pendant le développement, on veut que la modification d'un fichier se répercute dans le conteneur sans tout reconstruire. Compose propose pour cela la section `develop.watch`, qui s'applique aux services construits localement (avec `build`). Chaque règle a un `path` et une `action` :

- `sync` : copie les fichiers modifiés dans le conteneur en cours d'exécution (adapté aux outils qui rechargent à chaud) ;
- `rebuild` : reconstruit l'image et remplace le conteneur (adapté à un changement de dépendances, comme un `package.json`) ;
- `sync+restart` : copie puis redémarre le conteneur (adapté à un fichier de configuration).

Exemple pour une application Node.js dont le code est dans `./src` :

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    develop:
      watch:
        - path: ./src
          action: sync
          target: /app/src
        - path: ./package.json
          action: rebuild
```

On lance ensuite `docker compose up --watch`, ou `docker compose watch` seul, qui sépare les journaux de l'application de ceux de construction et de synchronisation. Condition à connaître : l'utilisateur du conteneur doit pouvoir écrire dans le dossier cible, ce qui passe souvent par `COPY --chown` dans le Dockerfile.

### Variables d'environnement : trois mécanismes à ne pas mélanger

- `environment:` définit des variables **dans le conteneur** (forme `CLE: valeur` ou `- CLE=valeur`) ;
- `env_file:` charge des variables dans le conteneur depuis un ou plusieurs fichiers (le dernier fichier gagne en cas de doublon) ;
- le fichier `.env` à la racine du projet sert à **l'interpolation** : il fournit les valeurs des `${VARIABLE}` écrites dans `compose.yaml`.

Si une variable est définie à la fois dans `env_file` et dans `environment`, c'est celle de `environment` qui est retenue dans le conteneur. Quant aux mots de passe : la documentation déconseille de les passer par des variables d'environnement et recommande plutôt les secrets. Ne commitez jamais un `.env` contenant de vrais mots de passe (ajoutez-le au `.gitignore`).

## Bonnes pratiques et pièges courants

- **Compose est d'abord un outil de développement et de test local.** Il décrit un environnement sur une machine ; pour la production à grande échelle, on s'oriente vers d'autres outils d'orchestration, que l'on verra plus tard dans ce journal.
- **Ne pas écrire `version:`** dans les nouveaux fichiers : elle est obsolète.
- **Attendre la santé, pas seulement le démarrage** : utilisez `condition: service_healthy` pour un service qui doit être réellement prêt (base de données). Sinon l'API peut échouer au premier démarrage avec une erreur de connexion.
- **Joindre un service par son nom**, pas par `localhost` ni par une adresse IP.
- **Port publié ≠ port du conteneur** : entre services, on utilise toujours le port du conteneur. Publiez seulement les ports dont votre navigateur ou vos outils ont besoin. La documentation signale aussi qu'omettre l'adresse hôte dans `ports` expose le port sur toutes les interfaces ; pour un accès local seulement, on précise `127.0.0.1:` devant.
- **Entourer de guillemets les ports courts** (`"8080:80"`) : sans guillemets, YAML peut interpréter certaines valeurs comme des nombres.
- **Fixer le tag des images** dans un vrai projet, comme on l'a vu avec Docker : `alpine` sans tag, ici, est un choix de simplicité pour l'exercice.
- **Séparer ce qui persiste de ce qui est jetable** : volume nommé pour les données, bind mount pour le code que vous éditez.

## En entretien

- **« À quoi sert Docker Compose ? »** « À décrire dans un fichier versionné tous les services d'une application (API, base de données, cache), leur réseau et leurs volumes, pour démarrer tout l'environnement de développement avec une seule commande, de façon reproductible. »
- **« Quelle est la différence entre `depends_on` simple et avec `service_healthy` ? »** « La forme simple ne garantit que l'ordre de démarrage : le service dépendant peut démarrer alors que la base n'est pas encore prête. Avec `condition: service_healthy` et un `healthcheck`, Compose attend que le service réponde réellement. »
- **« Comment deux conteneurs communiquent-ils dans Compose ? »** « Compose crée un réseau par projet, et chaque service est joignable par son nom grâce à un DNS interne. On utilise le port du conteneur, le port publié ne sert que pour l'accès depuis la machine hôte. »

## Mini-exercice

Durée : 15 minutes.

1. Créez le fichier `compose.yaml` ci-dessus dans un dossier vide et lancez `docker compose up`. Notez le délai avant que `client` démarre : c'est `service_healthy` en action.
2. Relancez `docker compose up` : le fichier `journal.txt` affiche maintenant deux lignes. Que s'est-il passé pour le volume ?
3. Lisez `docker compose down --help`, puis exécutez `docker compose down`. Relancez `docker compose up` : retrouvez-vous vos lignes précédentes ? Concluez, avec vos mots, sur ce que `down` fait ou non au volume nommé.
4. Remplacez la condition `service_healthy` par la forme courte `depends_on: [serveur]` et relancez : que change-t-il dans l'ordre et le moment du démarrage ?
5. Bonus : ajoutez un `restart` ou un bind mount en lecture seule sur `client` et vérifiez le résultat avec `docker compose ps`.

## Sources

- Docker, [How Compose works](https://docs.docker.com/compose/intro/compose-application-model/), documentation officielle.
- Docker, [Services top-level element](https://docs.docker.com/reference/compose-file/services/) et [Workload specification](https://docs.docker.com/reference/compose-file/workload-spec/) (`depends_on`, `healthcheck`, `ports`), documentation officielle.
- Docker, [Container specification](https://docs.docker.com/reference/compose-file/container-spec/) (`environment`, `env_file`, `volumes`), documentation officielle.
- Docker, [Version and name top-level elements](https://docs.docker.com/reference/compose-file/version-and-name/), documentation officielle (`version` obsolète).
- Docker, [Networking in Compose](https://docs.docker.com/compose/how-tos/networking/) et [Volumes top-level element](https://docs.docker.com/reference/compose-file/volumes/), documentation officielle.
- Docker, [Environment variables precedence](https://docs.docker.com/compose/how-tos/environment-variables/envvars-precedence/), documentation officielle.
- Docker, [Use Compose Watch](https://docs.docker.com/compose/how-tos/file-watch/), documentation officielle.
- Docker Compose, [Releases](https://github.com/docker/compose/releases), dépôt officiel (version indiquée : v5.8.0).
