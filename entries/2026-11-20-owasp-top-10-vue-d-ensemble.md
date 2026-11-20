---
title: OWASP Top 10 (édition 2025) : les dix risques à connaître pour sécuriser une application web
date: 2026-11-20
track: cybersecurite
topic: owasp-top-10-vue-d-ensemble
level: débutant
reading: 9
summary: Le Top 10 de l'OWASP est la liste de référence des risques de sécurité des applications web. On parcourt l'édition 2025 (ce qui change par rapport à 2021), on comprend ce que chaque catégorie recouvre côté défense, et on code deux réflexes simples en Python.
---

## Pourquoi c'est important

Quand on construit une application (une API Spring Boot, un site Django, un front React), on pense d'abord aux fonctionnalités. La sécurité arrive souvent après, alors que la plupart des failles viennent d'erreurs ordinaires : un contrôle de droits oublié, une requête SQL assemblée à la main, une dépendance jamais mise à jour.

L'**OWASP** (*Open Worldwide Application Security Project*) est une fondation à but non lucratif qui publie des ressources ouvertes sur la sécurité applicative. Son document le plus connu, l'**OWASP Top 10**, recense les dix catégories de risques les plus importantes pour les applications web. Ce n'est pas une norme à cocher, c'est un **vocabulaire commun** : en entretien, dans un audit ou dans une revue de code, dire « ça ressemble à un A01, un contrôle d'accès cassé » permet de se comprendre en cinq secondes.

Pour un profil fullstack ou data, c'est aussi une grille de lecture utile : un tableau de bord Power BI branché sur une base mal protégée, ou une API de données sans contrôle d'accès, entrent directement dans ces catégories.

## Comment ça marche

### D'où vient la liste

La page d'introduction de l'édition 2025 présente la huitième édition du Top 10. Elle indique qu'elle repose sur des données fournies par plusieurs éditeurs et sociétés de sécurité (Bugcrowd, Contrast Security, Veracode, Semgrep, Sonar, Orca Security, entre autres) portant sur plus de 2,8 millions d'applications, et sur 589 types de faiblesses (les **CWE**, *Common Weakness Enumeration*, le catalogue public des types de défauts logiciels tenu par le MITRE). Sur ces 589 CWE, 248 sont rattachés aux dix catégories retenues. La liste est établie à partir de ces données, mais deux catégories ont été retenues grâce à un vote de la communauté (notamment la chaîne d'approvisionnement logicielle), pour faire une place à des risques que les statistiques captent encore mal. L'OWASP décrit sa démarche comme guidée par les données sans l'être aveuglément, et centrée sur les causes profondes plutôt que sur les symptômes.

### La liste 2025

| Rang | Catégorie (nom officiel) | En une phrase |
|---|---|---|
| A01 | Broken Access Control | Un utilisateur accède à ce qu'il ne devrait pas voir ou modifier |
| A02 | Security Misconfiguration | Mauvais réglages : comptes par défaut, options de debug, services trop ouverts |
| A03 | Software Supply Chain Failures | La chaîne qui produit et livre le logiciel (dépendances, build, distribution) est compromise ou fragile |
| A04 | Cryptographic Failures | Données mal protégées : chiffrement absent, faible ou mal utilisé |
| A05 | Injection | Des données non fiables sont interprétées comme du code ou une commande |
| A06 | Insecure Design | La conception elle-même ne prévoit pas les abus |
| A07 | Authentication Failures | L'identité d'un utilisateur est mal vérifiée ou mal protégée |
| A08 | Software or Data Integrity Failures | Du code ou des données sont acceptés sans vérifier leur intégrité |
| A09 | Security Logging & Alerting Failures | Les événements importants ne sont pas enregistrés, ou personne n'est alerté |
| A10 | Mishandling of Exceptional Conditions | Les erreurs et situations anormales sont mal gérées |

### Ce qui change par rapport à 2021

L'OWASP indique deux nouvelles catégories et une consolidation :

- **A03 Software Supply Chain Failures** est présentée comme une extension de l'ancienne catégorie « Vulnerable and Outdated Components » (composants vulnérables et obsolètes). On ne se limite plus à « mettre à jour ses bibliothèques » : on regarde toute la chaîne, de la dépendance au pipeline de build.
- **A10 Mishandling of Exceptional Conditions** est entièrement nouvelle.
- Le **SSRF** (*Server-Side Request Forgery*, une attaque où l'on amène un serveur à émettre des requêtes à la place de l'attaquant) a été rattaché à A01, qui reste première.
- **A02 Security Misconfiguration** passe de la 5e à la 2e place, tandis que Cryptographic Failures, Injection et Insecure Design reculent chacune de deux rangs.
- Deux catégories sont renommées : « Authentication Failures » (autrefois « Identification and Authentication Failures ») et « Security Logging & Alerting Failures » (autrefois « Logging and Monitoring »). Ce dernier nom insiste sur l'**alerte** : journaliser sans que personne ne regarde ne protège de rien.

À retenir : l'injection, longtemps vedette, n'est plus qu'en 5e position, mais elle reste une cause majeure de failles et sa prévention est simple. À l'inverse, les risques liés à la **configuration** et à la **chaîne d'approvisionnement** montent, ce qui reflète la réalité d'applications assemblées à partir de dizaines de composants.

## Mise en place pas à pas

On ne « met pas en place » le Top 10 comme un outil. On s'en sert comme d'une liste de contrôle mentale. Voici deux réflexes concrets, testés avec Python 3 (bibliothèque standard uniquement).

### Réflexe 1 : vérifier l'appartenance d'une ressource (A01)

L'erreur classique : une route `/factures/2` qui renvoie la facture numéro 2 à quiconque est connecté, sans vérifier que cette facture est la sienne. Le contrôle doit se faire **côté serveur**, à chaque requête, en liant la ressource à l'utilisateur authentifié.

```python
import sqlite3

db = sqlite3.connect(":memory:")
db.executescript("""
CREATE TABLE factures (id INTEGER PRIMARY KEY, proprietaire_id INTEGER, montant REAL);
INSERT INTO factures VALUES (1, 10, 120.0), (2, 20, 80.0);
""")


def lire_facture(facture_id: int, utilisateur_id: int):
    """Renvoie la facture seulement si elle appartient à l'utilisateur."""
    ligne = db.execute(
        "SELECT id, montant FROM factures WHERE id = ? AND proprietaire_id = ?",
        (facture_id, utilisateur_id),
    ).fetchone()
    if ligne is None:
        # même réponse que la facture soit absente ou interdite : on ne révèle rien
        raise LookupError("Facture introuvable")
    return ligne


print(lire_facture(1, 10))       # (1, 120.0)
try:
    lire_facture(2, 10)          # facture d'un autre utilisateur
except LookupError as e:
    print("Refusé :", e)
```

Ce code affiche `(1, 120.0)` puis `Refusé : Facture introuvable`. Deux idées à retenir : l'identifiant de l'utilisateur vient de la **session ou du jeton authentifié**, jamais d'un paramètre que le client peut modifier ; et la condition de propriété est dans la requête elle-même, donc impossible à oublier après coup.

### Réflexe 2 : ne jamais assembler du SQL avec des données externes (A05)

Le même exemple illustre la défense contre l'injection : la requête utilise des **paramètres** (les `?`). Le moteur reçoit d'un côté le texte de la requête, de l'autre les valeurs, et ne mélange jamais les deux. À l'inverse, construire la requête par concaténation de chaînes (`"... WHERE id = " + saisie`) laisse la valeur saisie être interprétée comme du SQL. En Spring Data JPA, avec Django ORM ou avec un autre ORM, les méthodes standard paramètrent déjà les requêtes ; le risque réapparaît dès qu'on écrit soi-même du SQL brut avec des morceaux de texte concaténés.

## Bonnes pratiques et pièges courants

- **Refuser par défaut** (A01) : une route sans règle explicite est interdite. Centraliser les contrôles d'accès (filtre, middleware, annotations de sécurité) plutôt que de les répéter à la main dans chaque contrôleur.
- **Masquer ce qui n'a pas à être su** (A10, A02) : en production, ne pas afficher de trace d'erreur au client ; la journaliser côté serveur. Désactiver le mode debug et changer les identifiants par défaut.
- **Échouer de façon sûre** (A10) : si une vérification d'autorisation plante, la réponse par défaut doit être un refus, pas un accès accordé « en attendant ».
- **Tenir à jour et connaître ses dépendances** (A03) : fichier de verrouillage (`package-lock.json`, `poetry.lock`, etc.), analyse automatique des dépendances, sources de paquets de confiance.
- **Ne pas inventer sa cryptographie** (A04) : utiliser les bibliothèques reconnues et le protocole TLS pour les échanges. Les mots de passe se hachent avec des algorithmes dédiés (sujet d'une prochaine leçon).
- **Penser les abus dès la conception** (A06) : se demander dès le départ « comment quelqu'un pourrait-il détourner cette fonction ? ». Aucune correction de code ne rattrape un défaut de conception.
- **Journaliser et alerter** (A09) : tracer les échecs de connexion et les refus d'accès, et surtout définir qui est prévenu et comment.
- **Piège : croire que le Top 10 est exhaustif.** Il hiérarchise des catégories larges ; une application peut être vulnérable à un risque qui n'y figure pas. C'est un point de départ, pas un certificat.
- **Piège : se fier au front-end.** Cacher un bouton dans l'interface ne protège rien ; seul le contrôle serveur compte.

## En entretien

- **« Qu'est-ce que l'OWASP Top 10 ? »** « C'est une liste, mise à jour régulièrement par la communauté OWASP à partir de données réelles, des dix catégories de risques les plus critiques pour les applications web. Je m'en sers comme grille de revue : contrôle d'accès, injection, configuration, dépendances, authentification, journalisation. »
- **« Quel est le risque numéro un et comment s'en protéger ? »** « Dans l'édition 2025, c'est le contrôle d'accès défaillant. Je refuse par défaut, je vérifie les droits côté serveur à chaque requête, et je lie chaque ressource à l'utilisateur authentifié, par exemple avec une condition de propriété dans la requête. »
- **« Qu'est-ce qui change en 2025 ? »** « Deux nouvelles catégories : les failles de chaîne d'approvisionnement logicielle, qui élargissent les composants vulnérables, et la mauvaise gestion des conditions exceptionnelles. La mauvaise configuration monte à la deuxième place, ce qui rappelle l'importance de la revue de configuration et de l'automatisation du déploiement. »

## Mini-exercice (15 minutes)

1. Recopiez le script ci-dessus dans un fichier `demo.py` et exécutez-le avec Python 3.
2. Ajoutez une troisième facture appartenant à l'utilisateur 10, puis vérifiez qu'il peut la lire mais que l'utilisateur 20 ne le peut pas.
3. Prenez un de vos projets (stage, cours, projet perso) et cherchez dedans **une** occurrence de chacun de ces trois points : une requête SQL construite par concaténation, une route sans contrôle d'appartenance, un fichier de configuration avec un secret ou un mode debug actif. Notez ce que vous corrigeriez et rattachez chaque point à son code A0x.

## Sources

- OWASP Top 10:2025, introduction (méthode, données, liste, changements) : https://owasp.org/Top10/2025/0x00_2025-Introduction/
- OWASP Top 10:2025, page d'accueil de l'édition : https://owasp.org/Top10/2025/
- MITRE, Common Weakness Enumeration (CWE) : https://cwe.mitre.org/
- Documentation Python, module `sqlite3` et requêtes paramétrées : https://docs.python.org/3/library/sqlite3.html
