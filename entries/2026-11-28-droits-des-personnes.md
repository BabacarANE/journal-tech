---
title: Droits des personnes : traiter une demande d'accès ou d'effacement sans paniquer
date: 2026-11-28
track: donnees-legislation
topic: droits-des-personnes
level: intermédiaire
reading: 10
summary: Accès, effacement, portabilité, opposition : ce que le RGPD impose, le délai à tenir et comment le coder, y compris le piège de la sauvegarde qui fait revenir des données effacées.
---

> Leçon informative : elle ne constitue pas un conseil juridique. Pour un cas réel, rapprochez-vous du délégué à la protection des données (DPO) de votre organisation ou d'un juriste.

## Pourquoi c'est important

« Envoyez-moi tout ce que vous avez sur moi. » « Supprimez mon compte et mes données. » Le RGPD (règlement général sur la protection des données) donne ces pouvoirs à toute **personne concernée**, c'est-à-dire la personne à qui les données se rapportent. En face, le **responsable du traitement** (l'organisme qui décide pourquoi et comment les données sont utilisées) doit répondre, dans un délai encadré.

Pour une équipe de développement, la difficulté est rarement juridique au départ. Elle est technique : savoir où se trouvent les données (base principale, journaux, prestataires, sauvegardes), les extraire, les effacer sans casser la comptabilité. Un droit que l'application n'a pas prévu se traite à la main, en urgence, avec un risque d'oubli.

## Comment ça marche

La leçon sur les [bases légales](https://babacarane.github.io/journal-tech/entries/2026-11-21-bases-legales-du-traitement/) répondait à « au nom de quoi traite-t-on ? ». Celle-ci répond à « que peut demander la personne ? ». En plus du droit d'être informé (articles 13 et 14), voici les principaux droits.

| Droit | Article | Ce que la personne obtient | Condition ou limite principale |
|---|---|---|---|
| Accès | 15 | Savoir si on traite ses données, en avoir une copie et des explications | Ne doit pas porter atteinte aux droits d'autrui (pour la copie) |
| Rectification | 16 | Corriger l'inexact, compléter l'incomplet | Dans les meilleurs délais |
| Effacement | 17 | Faire supprimer ses données | Un motif est nécessaire, et il existe des exceptions |
| Limitation | 18 | « Geler » l'usage des données | Cas précis, par exemple pendant qu'on vérifie une exactitude contestée |
| Portabilité | 20 | Récupérer les données qu'elle a fournies, dans un format lisible par machine | Consentement ou contrat, **et** traitement automatisé |
| Opposition | 21 | Faire cesser un traitement | Voir ci-dessous |
| Décision automatisée | 22 | Ne pas subir une décision à effet important prise uniquement par une machine | Exceptions : contrat, loi, consentement explicite |

Quelques précisions qui changent le code :

- **Accès** : en plus de la copie, on indique notamment les finalités, les catégories de données, les destinataires, la durée de conservation, l'origine des données si elles ne viennent pas de la personne, ses autres droits et la possibilité de saisir l'autorité de contrôle. La CNIL précise qu'une simple liste de catégories ne suffit pas.
- **Effacement** : il s'applique par exemple si les données ne sont plus nécessaires, si le consentement est retiré sans autre fondement ou si le traitement est illicite. Il ne s'applique pas quand le traitement reste nécessaire, notamment pour respecter une obligation légale ou pour défendre des droits en justice.
- **Opposition** : pour la prospection, elle est sans condition. Pour un traitement fondé sur l'intérêt légitime ou une mission d'intérêt public, la personne invoque sa situation particulière, et le responsable ne peut continuer que s'il justifie de motifs légitimes impérieux qui l'emportent sur les intérêts et droits de la personne, ou d'un besoin lié à une action en justice.
- **Décision automatisée** : quand elle repose sur le contrat ou le consentement, la personne doit au minimum pouvoir obtenir une intervention humaine, donner son point de vue et contester.
- **Destinataires** (article 19) : une rectification, un effacement ou une limitation doit être répercuté auprès de ceux qui ont reçu les données, sauf impossibilité ou effort disproportionné.

### Le délai et les règles communes (article 12)

- Réponse dans les meilleurs délais, et au plus tard **un mois** après réception.
- Prolongation possible de **deux mois** selon la complexité et le nombre de demandes. La personne doit en être informée, avec les motifs, pendant le premier mois. Le Comité européen de la protection des données (CEPD), qui réunit les autorités de contrôle, précise que cette prolongation doit rester une exception.
- En cas de refus, on explique pourquoi dans le mois, en indiquant la possibilité d'une réclamation (en France auprès de la CNIL) et d'un recours devant un juge.
- C'est **gratuit**. Pour une demande manifestement infondée ou excessive, on peut demander des frais raisonnables ou refuser, mais c'est au responsable de le démontrer.
- En cas de **doute raisonnable** sur l'identité, on peut demander des informations complémentaires. La CNIL indique qu'une pièce d'identité n'est pas à exiger par principe : une demande faite depuis un espace authentifié peut suffire.

Selon les lignes directrices 01/2022 du CEPD, le délai démarre quand la demande arrive sur un canal officiel, même si personne ne l'a encore lue. Il peut être suspendu en attendant une information nécessaire pour identifier la personne, à condition de l'avoir demandée sans tarder. Une échéance qui tombe un week-end ou un jour férié est reportée au jour ouvré suivant.

### Ce qui a bougé en 2026

- La Cour de justice de l'UE (affaire C-526/24, communiqué du 19 mars 2026) a jugé qu'une première demande d'accès peut, dans certaines circonstances, être excessive, si le responsable démontre une intention abusive, par exemple la volonté de créer artificiellement les conditions d'une indemnisation. Ce n'est pas un permis de refuser les demandes gênantes.
- La Commission a proposé le 19 novembre 2025, dans le « Digital Omnibus », de retoucher notamment la règle sur les abus du droit d'accès. Le Conseil de l'UE a arrêté son mandat de négociation le 21 octobre 2026, mais d'après le suivi consulté (à jour au 26 octobre), le texte n'est pas adopté. C'est le RGPD actuel qui s'applique.

## Mise en place pas à pas

Exemple volontairement petit, avec le seul module standard `sqlite3`, **testé avec Python 3.13.18**. L'application a des comptes, une newsletter, des journaux de connexion et des factures.

**Étape 1 : cartographier les données dans le code.** Chaque table est associée à sa colonne d'identification et à sa base légale. Les noms de tables viennent de cette liste fermée, jamais de l'utilisateur, et les valeurs passent par `?` (voir la [leçon sur l'injection SQL](https://babacarane.github.io/journal-tech/entries/2026-11-27-injection-sql-et-requetes-preparees/)).

**Étape 2 : coder les droits.** Fichier `droits.py` :

```python
import calendar
import json
from datetime import date, timedelta

SCHEMA = """
CREATE TABLE utilisateurs (id TEXT PRIMARY KEY, email TEXT, nom TEXT,
                           gele INTEGER NOT NULL DEFAULT 0);
CREATE TABLE newsletter   (utilisateur_id TEXT, inscrit_le TEXT);
CREATE TABLE connexions   (utilisateur_id TEXT, ip TEXT, le TEXT);
CREATE TABLE factures     (utilisateur_id TEXT, nom_facture TEXT, montant REAL);
"""

# nom de table (liste fermée) -> (colonne d'identification, base légale)
TABLES = {
    "utilisateurs": ("id", "contrat"),
    "newsletter": ("utilisateur_id", "consentement"),
    "connexions": ("utilisateur_id", "interet_legitime"),
    "factures": ("utilisateur_id", "obligation_legale"),
}


def echeance(recue_le: date, mois: int = 1) -> date:
    """Date limite de réponse (mois=1, ou 3 en cas de prolongation)."""
    annee, index = divmod(recue_le.month - 1 + mois, 12)
    annee, m = recue_le.year + annee, index + 1
    jour = min(recue_le.day, calendar.monthrange(annee, m)[1])
    limite = date(annee, m, jour)
    while limite.weekday() >= 5:  # samedi, dimanche (jours fériés non gérés)
        limite += timedelta(days=1)
    return limite


def lignes(db, table, uid):
    colonne = TABLES[table][0]
    curseur = db.execute(f"SELECT * FROM {table} WHERE {colonne} = ?", (uid,))
    noms = [c[0] for c in curseur.description]
    return [dict(zip(noms, ligne)) for ligne in curseur]


def acces(db, uid):
    """Droit d'accès : tout ce que l'on détient sur la personne."""
    return {table: lignes(db, table, uid) for table in TABLES}


def portabilite(db, uid):
    """Portabilité : seulement les traitements sur contrat ou consentement."""
    export = {t: lignes(db, t, uid) for t, (_, base) in TABLES.items()
              if base in ("contrat", "consentement")}
    for compte in export["utilisateurs"]:
        compte.pop("gele")  # information interne, non fournie par la personne
    return json.dumps(export, ensure_ascii=False, indent=2)


def purger(db, uid):
    with db:  # une seule transaction
        for table, (colonne, base) in TABLES.items():
            if base != "obligation_legale":
                db.execute(f"DELETE FROM {table} WHERE {colonne} = ?", (uid,))


def effacer(db, registre, uid, jour: date):
    """Efface, note la demande à part, et dit ce qui est conservé."""
    with registre:
        registre.execute("INSERT INTO effacements VALUES (?, ?)",
                         (uid, jour.isoformat()))
    purger(db, uid)
    return {"conserve": {"factures": "obligation légale (art. 17.3.b)"}}


def rejouer_effacements(db, registre):
    """À lancer après toute restauration, avant de rouvrir le service."""
    for (uid,) in registre.execute("SELECT utilisateur_id FROM effacements"):
        purger(db, uid)
```

Trois choix à savoir expliquer. La copie d'accès inclut les journaux et les factures, alors que l'export de portabilité les écarte (leur base légale n'est ni le contrat ni le consentement). L'effacement garde les factures et renvoie le motif, pour pouvoir l'écrire dans la réponse. Enfin, `acces` ne produit que la copie : les explications de l'article 15 restent à joindre.

On suppose ici que la demande d'effacement a été jugée recevable (compte clos, aucun contrat en cours). En production, cette décision et la liste des exceptions se valident avec le DPO.

**Étape 3 : tester, y compris la restauration.** Fichier `test_droits.py`, à lancer avec `python3 test_droits.py` :

```python
import sqlite3, uuid
from datetime import date
from droits import *

db = sqlite3.connect(":memory:")
db.executescript(SCHEMA)
registre = sqlite3.connect(":memory:")  # en vrai : hors de la base sauvegardée
registre.execute("CREATE TABLE effacements (utilisateur_id TEXT, le TEXT)")

uid = str(uuid.uuid4())
db.execute("INSERT INTO utilisateurs (id, email, nom) VALUES (?, 'lea@exemple.fr', 'Léa')", (uid,))
db.execute("INSERT INTO newsletter VALUES (?, '2026-10-01')", (uid,))
db.execute("INSERT INTO connexions VALUES (?, '203.0.113.7', '2026-11-20')", (uid,))
db.execute("INSERT INTO factures VALUES (?, 'Léa', 49.0)", (uid,))
db.commit()

sauvegarde = sqlite3.connect(":memory:")
db.backup(sauvegarde)

assert echeance(date(2027, 3, 5)) == date(2027, 4, 5)
assert echeance(date(2026, 8, 31)) == date(2026, 9, 30)
assert echeance(date(2026, 11, 28)) == date(2026, 12, 28)
assert echeance(date(2026, 11, 28), mois=3) == date(2027, 3, 1)

assert acces(db, uid)["connexions"]
assert "203.0.113.7" not in portabilite(db, uid)

effacer(db, registre, uid, date(2026, 11, 28))
assert acces(db, uid)["utilisateurs"] == []
assert acces(db, uid)["factures"]

sauvegarde.backup(db)                      # restauration : Léa « revient »
assert acces(db, uid)["utilisateurs"]
rejouer_effacements(db, registre)
assert acces(db, uid)["utilisateurs"] == []
assert acces(db, uid)["factures"]
print("OK")
```

Le **registre des effacements** vit hors de la base sauvegardée, sinon la restauration l'écraserait. Il ne contient qu'un identifiant et une date : prévoyez de le purger quand plus aucune sauvegarde ne contient la personne.

**Étape 4 : respecter la limitation et l'opposition.** La colonne `gele` ne sert à rien si les traitements l'ignorent. L'envoi de la newsletter doit filtrer :

```sql
SELECT u.email
FROM utilisateurs u
JOIN newsletter n ON n.utilisateur_id = u.id
WHERE u.gele = 0;
```

Une opposition à la prospection se traduit ici par le retrait de la ligne dans `newsletter` (ou par une liste d'exclusion si un import risque de la recréer).

## Bonnes pratiques et pièges courants

- **Oublier des sources de données.** La recherche couvre tous les systèmes, informatiques ou non, et les données confiées aux sous-traitants (hébergeur d'e-mails, outil de support).
- **Oublier les sauvegardes.** Pour le CEPD, elles sont en principe comparables aux données de production. La CNIL recommande d'y effacer les données, ou de trouver une solution qui évite de les restaurer.
- **Confondre accès et portabilité.** L'accès est plus large ; la portabilité a des conditions et des exigences de format (CSV, XML ou JSON sont les exemples cités par la CNIL).
- **Divulguer les données d'un tiers.** Un export qui contient les messages ou le nom d'une autre personne doit être relu ou masqué.
- **Exiger une carte d'identité à tout le monde.** Si une vérification a été nécessaire, le CEPD suggère de noter qu'elle a eu lieu plutôt que de conserver la copie.
- **Créer une fuite en voulant répondre.** Authentifiez le demandeur et envoyez l'archive par un canal sécurisé.
- **Improviser.** En février 2026, le CEPD a publié le bilan d'une action coordonnée sur l'effacement (32 autorités, 764 responsables de traitement ayant répondu). Parmi les problèmes relevés : absence de procédure interne, formation insuffisante, exceptions mal appliquées, durées de conservation floues, sauvegardes, et anonymisation insuffisante utilisée à la place de l'effacement.

Côté produit, la CNIL conseille aux développeurs de prévoir des fonctions dédiées (consultation, modification, suppression, export, opposition, mise en « quarantaine ») et de tracer les opérations qui touchent aux données.

## En entretien

- *« Un utilisateur demande la suppression de ses données, que faites-vous ? »* : « Je vérifie son identité de façon proportionnée, je regarde quel motif d'effacement s'applique et ce qu'on doit conserver, puis j'efface partout, sous-traitants compris. Je prévois que les sauvegardes restaurées ne fassent pas revenir les données, et je réponds sous un mois en expliquant ce qui est gardé et pourquoi. »
- *« Quelle différence entre accès et portabilité ? »* : « L'accès donne une copie des données traitées, avec des explications. La portabilité concerne les données fournies par la personne, pour un traitement automatisé fondé sur le consentement ou le contrat, dans un format réutilisable par un autre service. »
- *« Comment l'anticipez-vous dans la conception ? »* : « Je tiens une cartographie des tables avec leur base légale, j'ai un identifiant stable par personne et des tests qui couvrent export, effacement et restauration. »

## Mini-exercice (15 minutes)

1. Recopiez les deux fichiers et lancez le test.
2. Ajoutez une table `messages_support (utilisateur_id, texte, agent_nom)` sur la base du contrat, dans `SCHEMA` et dans `TABLES`.
3. Faites en sorte que ni `acces` ni `portabilite` ne divulguent `agent_nom`, puis écrivez le test qui le prouve. En situation réelle, posez-vous aussi la question de ce que le texte libre révèle sur des tiers.
4. Bonus : écrivez en cinq lignes la réponse envoyée à Léa après son effacement (ce qui a été supprimé, ce qui est conservé et pourquoi, comment contester).

## Sources

- CNIL, texte du RGPD, chapitre III « Droits de la personne concernée » (articles 12 à 23) : <https://www.cnil.fr/fr/reglement-europeen-protection-donnees/chapitre3>
- CNIL, Professionnels : comment répondre à une demande de droit d'accès ? : <https://www.cnil.fr/fr/respecter-les-droits-des-personnes/professionnels-comment-repondre-une-demande-de-droit-dacces>
- CNIL, Guide du développeur : préparer l'exercice des droits des personnes : <https://cnil.fr/fr/preparer-lexercice-des-droits-des-personnes>
- CEPD, Lignes directrices 01/2022 sur le droit d'accès, version 2.1 (en anglais) : <https://www.edpb.europa.eu/system/files/2023-04/edpb_guidelines_202201_data_subject_rights_access_v2_en.pdf>
- CEPD, rapport de l'action coordonnée 2025 sur le droit à l'effacement, adopté le 10 février 2026 (en anglais) : <https://www.edpb.europa.eu/documents/coordinated-enforcement-framework/coordinated-enforcement-action-implementation-of-the-0_en>
- CJUE, communiqué n° 38/26 du 19 mars 2026, affaire C-526/24 Brillen Rottler : <https://curia.europa.eu/site/upload/docs/application/pdf/2026-03/cp260038fr.pdf>
- Suivi non officiel du « Digital Omnibus » sur le RGPD (EUTechReg Research, en anglais) : <https://research.eutechreg.com/dossiers/gdpr-reform-digital-omnibus/>
