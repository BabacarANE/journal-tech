---
title: Injection SQL : les requêtes préparées, pour que les données ne deviennent jamais du code
date: 2026-11-27
track: cybersecurite
topic: injection-sql-et-requetes-preparees
level: intermédiaire
reading: 9
summary: Une simple apostrophe suffit à montrer pourquoi coller du texte dans une requête SQL est dangereux. On corrige avec les requêtes paramétrées en Python, Java, Django et Node.js, puis on traite les cas qu'elles ne couvrent pas, comme le tri.
---

## Pourquoi c'est important

Presque toute application web ou tout script d'analyse fait la même chose : prendre une valeur venue de l'extérieur (un champ de recherche, un paramètre d'URL, une ligne de fichier CSV) et s'en servir pour interroger une base de données avec **SQL**, le langage des bases relationnelles.

On parle d'**injection SQL** quand une donnée non fiable finit par faire partie de la syntaxe de la requête et en change la logique. La base ne peut pas deviner ce que le développeur voulait : elle exécute le texte qu'elle reçoit. Les conséquences possibles vont de la lecture de données confidentielles à leur modification ou leur suppression, et dans certains cas jusqu'à des opérations d'administration du serveur de base de données.

Le problème est ancien, mais pas réglé. Dans le classement **CWE Top 25** de 2025 (la liste des faiblesses logicielles les plus dangereuses publiée par le MITRE), l'injection SQL, référencée **CWE-89**, occupe la 2e place, derrière le *cross-site scripting*. Dans l'OWASP Top 10:2025 vu la semaine dernière, elle relève de la catégorie **A05, Injection**.

La bonne nouvelle : la parade principale est simple, disponible dans la plupart des langages, et souvent plus courte à écrire que la version dangereuse.

## Comment ça marche

### Le modèle mental

Une requête SQL est du texte que le moteur doit comprendre avant de l'exécuter. Tout dépend de la façon dont la valeur lui parvient.

```text
CONCATÉNATION
  "SELECT ... WHERE nom = '" + saisie + "'"
          -> un seul texte -> la base analyse TOUT comme du SQL

REQUÊTE PARAMÉTRÉE
  texte :   SELECT ... WHERE nom = ?     -> structure de la requête
  valeur :  saisie                       -> donnée, jamais lue comme du SQL
```

Dans une **requête paramétrée**, le texte contient des emplacements réservés (les **paramètres**, notés `?`, `%s`, `$1` ou `:nom` selon l'outil) et les valeurs sont transmises séparément. On parle de **requête préparée** quand le moteur analyse d'abord ce texte, puis l'exécute avec les valeurs fournies ensuite.

La commande `PREPARE` de PostgreSQL montre bien les deux temps : à la préparation, l'instruction est analysée et réécrite ; à l'exécution (`EXECUTE`), on fournit les valeurs, puis la requête est planifiée et exécutée. La structure est donc fixée avant l'arrivée des données.

### Ce qu'un paramètre peut remplacer, ou non

| Élément de la requête | Paramètre possible ? | Protection à utiliser |
|---|---|---|
| Valeur comparée (`WHERE nom = ...`) | Oui | Paramètre |
| Valeur insérée ou mise à jour | Oui | Paramètre |
| Nom de table ou de colonne | Non | Liste blanche dans le code |
| Sens du tri (`ASC`, `DESC`) | Non | Liste blanche dans le code |

Une **liste blanche** (*allow-list*) est l'ensemble des choix autorisés, écrit à l'avance par le développeur. Tout ce qui n'y figure pas est refusé.

## Mise en place pas à pas

L'exemple principal a été exécuté avec **Python 3.13** et son module standard `sqlite3` (SQLite 3.53). Rien à installer si vous avez Python. Mettez les blocs Python ci-dessous, dans l'ordre, dans un fichier `demo.py`.

### 1. Voir le défaut avec une saisie innocente

Inutile de jouer à l'attaquant : un nom de famille avec une apostrophe suffit.

```python
import sqlite3

db = sqlite3.connect(":memory:")
db.execute("CREATE TABLE clients (id INTEGER PRIMARY KEY, nom TEXT, ville TEXT)")
db.executemany(
    "INSERT INTO clients (nom, ville) VALUES (?, ?)",
    [("Martin", "Paris"), ("O'Brien", "Lyon"), ("Diallo", "Lille")],
)


def chercher_fragile(nom: str):
    # À NE PAS FAIRE : la saisie devient une partie du texte SQL
    sql = f"SELECT id, nom, ville FROM clients WHERE nom = '{nom}'"
    return db.execute(sql).fetchall()


try:
    chercher_fragile("O'Brien")
except sqlite3.OperationalError as erreur:
    print("Version fragile :", erreur)
```

Résultat : `Version fragile : near "Brien": syntax error`. L'apostrophe a fermé la chaîne SQL trop tôt, et la suite du nom a été lue comme des instructions. Ici ce n'est qu'un bug. Mais il prouve que **la saisie peut modifier la structure de la requête**, ce qui est exactement la faille.

### 2. Corriger avec un paramètre

```python
def chercher_sur(nom: str):
    # La requête est fixe, la valeur voyage à part
    sql = "SELECT id, nom, ville FROM clients WHERE nom = ?"
    return db.execute(sql, (nom,)).fetchall()


print("Version sûre :", chercher_sur("O'Brien"))
```

Résultat : `Version sûre : [(2, "O'Brien", 'Lyon')]`. Aucun guillemet autour du `?`, aucun nettoyage manuel : la valeur reste une valeur, quels que soient ses caractères.

### 3. Trier sans ouvrir de brèche

On pourrait écrire `ORDER BY ?`. Avec SQLite, cela ne provoque pas d'erreur, mais ne trie pas sur la colonne voulue : le moteur reçoit un texte constant, identique pour toutes les lignes. La solution est la liste blanche.

```python
TRIS = {"nom": "nom", "ville": "ville"}
SENS = {"asc": "ASC", "desc": "DESC"}


def lister(tri: str = "nom", sens: str = "asc"):
    if tri not in TRIS or sens not in SENS:
        raise ValueError("Tri non autorisé")
    # seuls des textes écrits dans le code entrent dans la requête
    sql = f"SELECT nom, ville FROM clients ORDER BY {TRIS[tri]} {SENS[sens]}"
    return db.execute(sql).fetchall()


print(lister("ville", "desc"))
```

Résultat : les villes dans l'ordre Paris, Lyon, Lille. La saisie sert seulement à **choisir** une entrée du dictionnaire, elle n'est jamais recopiée dans le SQL.

### 4. Le cas de LIKE

Un paramètre empêche l'injection, mais dans un motif `LIKE`, les caractères `%` et `_` gardent leur rôle de jokers. Une recherche sur `%` renverrait tout. Si ce n'est pas voulu, on les échappe, c'est-à-dire qu'on les marque comme du texte ordinaire.

```python
def commencant_par(debut: str):
    motif = debut.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
    sql = "SELECT nom FROM clients WHERE nom LIKE ? ESCAPE '\\'"
    return db.execute(sql, (motif,)).fetchall()


print(commencant_par("Mar"))  # [('Martin',)]
print(commencant_par("%"))    # []
```

### 5. Le même réflexe dans votre stack

**Java avec JDBC** (l'API standard d'accès aux bases), extrait compilé avec Java 21 ; `connexion` est une `Connection` ouverte :

```java
String sql = "SELECT ville FROM clients WHERE nom = ?";
try (PreparedStatement requete = connexion.prepareStatement(sql)) {
    requete.setString(1, nom); // les paramètres JDBC commencent à 1
    try (ResultSet resultat = requete.executeQuery()) {
        while (resultat.next()) {
            System.out.println(resultat.getString("ville"));
        }
    }
}
```

**Spring Data JPA** (documentation 4.2.0), avec des paramètres nommés. JPQL est le langage de requête de JPA, proche du SQL mais portant sur les objets Java.

```java
@Query("select c from Client c where c.nom = :nom")
List<Client> chercherParNom(@Param("nom") String nom);
```

**Django 6.1** (testé avec 6.1.3). L'ORM, la couche qui traduit des objets en requêtes, suffit le plus souvent. En SQL brut, on passe les valeurs en second argument, avec `%s` même sur SQLite :

```python
from django.db import connection

with connection.cursor() as cursor:
    cursor.execute("SELECT id, nom FROM clients WHERE nom = %s", [nom])
    lignes = cursor.fetchall()
```

**Node.js avec PostgreSQL** (bibliothèque `pg` 8.23.1, testée sur PostgreSQL 16). Ici les paramètres sont numérotés ; `client` est déjà connecté et le code est dans une fonction `async`.

```javascript
const { rows } = await client.query(
  "SELECT id, nom, ville FROM clients WHERE nom = $1",
  [nom],
);
```

## Bonnes pratiques et pièges courants

- **Piège : « j'utilise un ORM, je suis tranquille ».** Les méthodes standard paramètrent, mais JPQL ou HQL (le langage d'Hibernate) assemblés par concaténation sont injectables eux aussi. En Spring Data JPA, `JpaSort.unsafe` autorise des expressions de tri libres : n'y mettez jamais une saisie.
- **Piège Django : `%` de formatage et `%s` de paramètre se ressemblent.** N'utilisez ni f-string ni opérateur `%` pour construire la requête, et ne mettez pas de guillemets autour de `%s`. La documentation Django met explicitement en garde contre ces deux erreurs.
- **Piège : la procédure stockée** (du code enregistré dans la base). L'appeler avec des paramètres protège l'appel, mais pas le SQL qu'elle construirait elle-même par concaténation. En PostgreSQL, on lie les valeurs avec `EXECUTE ... USING`.
- **Piège : « cette donnée vient de ma base, elle est sûre ».** Une valeur enregistrée hier a pu être saisie par n'importe qui. On la passe aussi en paramètre.
- **Éviter l'échappement fait maison** pour se protéger de l'injection. L'OWASP le déconseille fortement, car les règles changent selon le moteur et sa configuration. L'échappement de `LIKE` vu plus haut a un autre but (le sens de la recherche) et la valeur reste passée en paramètre.
- **Valider les entrées en complément**, pas à la place : vérifier type, longueur et format est utile, mais on paramètre quand même.
- **Appliquer le moindre privilège** : le compte de l'application ne reçoit que les droits nécessaires, jamais ceux d'administrateur. Pour un tableau de bord Power BI, un compte en lecture seule limité aux tables ou aux **vues** (requêtes enregistrées exposant une partie des données) utiles réduit les dégâts en cas de problème.
- **Ne pas confondre injection et autorisation.** Un paramètre n'indique pas si l'utilisateur a le droit de voir la ligne demandée : ce contrôle reste à écrire.
- **Relire le code** en cherchant les requêtes construites avec `+`, des f-strings ou des gabarits JavaScript (les chaînes entre accents graves).

## En entretien

- **« Qu'est-ce qu'une injection SQL ? »** « C'est quand une donnée non fiable est interprétée comme une partie de la requête et en change la logique. La cause typique est la concaténation de chaînes. »
- **« Comment l'éviter ? »** « J'utilise systématiquement des requêtes paramétrées, directement ou via l'ORM. Pour ce qui ne peut pas être un paramètre, comme une colonne de tri, je passe par une liste blanche. J'ajoute un compte de base avec le moins de droits possible et de la validation d'entrée. »
- **« Un ORM suffit-il ? »** « Il réduit beaucoup le risque, mais pas à zéro : dès qu'on écrit du SQL brut ou du JPQL, il faut vérifier que les valeurs sont liées par des paramètres et non collées dans le texte. »

## Mini-exercice (15 minutes)

1. Créez et exécutez `demo.py` avec les blocs Python des étapes 1 à 4.
2. Écrivez `chercher_par_ville_et_nom(ville, nom)` avec deux paramètres, puis testez-la avec un nom contenant une apostrophe.
3. Appelez `lister("telephone", "asc")` et vérifiez que le tri est refusé. Ajoutez ensuite le tri par `id` en modifiant uniquement la liste blanche.
4. Dans un de vos propres projets, cherchez les mots `SELECT`, `UPDATE` et `DELETE`. Pour chaque requête écrite à la main, vérifiez comment les valeurs y entrent et corrigez celles qui sont concaténées.

## Sources

- OWASP, SQL Injection Prevention Cheat Sheet : https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
- OWASP, Query Parameterization Cheat Sheet : https://cheatsheetseries.owasp.org/cheatsheets/Query_Parameterization_Cheat_Sheet.html
- MITRE, 2025 CWE Top 25 : https://cwe.mitre.org/top25/archive/2025/2025_cwe_top25.html
- MITRE, fiche CWE-89 : https://cwe.mitre.org/data/definitions/89.html
- PostgreSQL 18, commande `PREPARE` : https://www.postgresql.org/docs/18/sql-prepare.html
- Django, requêtes SQL brutes : https://docs.djangoproject.com/en/6.1/topics/db/sql/
- Spring Data JPA, méthodes de requête : https://docs.spring.io/spring-data/jpa/reference/jpa/query-methods.html
- node-postgres, requêtes : https://node-postgres.com/features/queries
