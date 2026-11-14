---
title: RGPD, les principes fondamentaux que tout développeur doit connaître
date: 2026-11-14
track: donnees-legislation
topic: rgpd-principes-fondamentaux
level: débutant
reading: 9
summary: L'article 5 du RGPD tient en six principes et une obligation de rendre des comptes. On les relie à des décisions concrètes de code et de base de données, pour pouvoir en parler avec précision en entretien.
---

> Leçon informative : elle ne constitue pas un conseil juridique. Pour un cas réel, rapprochez-vous du délégué à la protection des données (DPO) de votre organisation ou d'un juriste.

## Pourquoi c'est important

Dès que vous écrivez un formulaire d'inscription, une table `clients` ou un tableau de bord Power BI alimenté par des données de ventes, vous manipulez très probablement des **données à caractère personnel**. Le règlement les définit comme toute information se rapportant à une personne physique identifiée ou identifiable. Un nom, bien sûr, mais aussi une adresse e-mail, un identifiant client, une adresse IP ou une combinaison de plusieurs informations qui permettent de retrouver quelqu'un.

Le règlement général sur la protection des données (RGPD, règlement (UE) 2016/679) encadre ce que l'on appelle un **traitement** : toute opération ou série d'opérations effectuée sur ces données, avec ou sans outil automatisé. Collecter, enregistrer, organiser, consulter, transmettre, effacer : tout cela est un traitement. Autrement dit, un `INSERT`, un `SELECT` et une exportation CSV en sont.

Pour un développeur en alternance, l'enjeu est double. D'abord, les choix techniques (quelles colonnes créer, combien de temps garder une ligne, qui peut lire quoi) sont des choix de conformité. Ensuite, les sanctions sont dissuasives : l'article 83 prévoit pour les violations les plus graves des amendes pouvant aller jusqu'à 20 millions d'euros ou 4 % du chiffre d'affaires annuel mondial de l'entreprise, le montant le plus élevé étant retenu. Et la violation des principes de l'article 5, objet de cette leçon, fait partie de cette catégorie haute.

## Comment ça marche

Le cœur du texte est l'article 5, intitulé « Principes relatifs au traitement des données à caractère personnel ». Son premier paragraphe énumère six principes. Son second paragraphe ajoute une obligation qui les chapeaute : la responsabilité (on parle aussi d'*accountability*).

| Principe (art. 5, §1) | L'idée en une phrase | Traduction technique |
|---|---|---|
| a) Licéité, loyauté, transparence | On traite les données de façon légale, honnête et compréhensible pour la personne | Base légale identifiée, mentions d'information claires |
| b) Limitation des finalités | Les données sont collectées pour des buts déterminés, explicites et légitimes, et pas réutilisées n'importe comment | Un traitement = une finalité documentée |
| c) Minimisation | On ne garde que ce qui est adéquat, pertinent et nécessaire | Pas de colonne « au cas où » |
| d) Exactitude | Les données sont justes et mises à jour si besoin | Mécanisme de correction, contrôles de qualité |
| e) Limitation de la conservation | On ne conserve pas les données identifiantes plus longtemps que nécessaire | Durées de rétention, purge automatique |
| f) Intégrité et confidentialité | On protège contre l'accès non autorisé, la perte, la destruction | Chiffrement, contrôle d'accès, sauvegardes |

Le paragraphe 2 impose au **responsable du traitement** (l'organisation qui décide des finalités et des moyens du traitement) d'être non seulement conforme, mais aussi capable de le **démontrer**. En pratique, ce qui n'est pas documenté n'existe pas : registre, décisions de conception, durées de conservation, journaux d'accès.

Un modèle mental utile est de suivre la vie d'une donnée :

```
Collecte  ->  Stockage  ->  Utilisation  ->  Partage  ->  Suppression
 (a, b, c)    (d, f)         (b, f)          (a, f)         (e)
```

À chaque étape, posez-vous la question : *pourquoi ai-je le droit de faire ça, et est-ce vraiment nécessaire ?*

## Mise en place pas à pas

Les exemples ci-dessous sont illustratifs et ne dépendent d'aucune version particulière d'un framework. Prenons une application web d'inscription à une newsletter de formation.

**Étape 1, la finalité (principe b).** Avant de coder, écrivez en une phrase pourquoi vous collectez : « envoyer la newsletter mensuelle aux personnes qui s'y sont abonnées ». Cette phrase pilote tout le reste. Si un collègue propose plus tard d'utiliser ces adresses pour de la prospection commerciale, vous savez que c'est une autre finalité qui demande un examen à part.

**Étape 2, la minimisation (principe c).** Pour envoyer une newsletter, il faut une adresse e-mail. La date de naissance ou le numéro de téléphone ne sont pas nécessaires. La table reste donc minimale :

```sql
CREATE TABLE abonnes (
    id            BIGSERIAL PRIMARY KEY,
    email         VARCHAR(254) NOT NULL UNIQUE,
    prenom        VARCHAR(80),             -- facultatif, pour personnaliser
    inscrit_le    TIMESTAMP NOT NULL DEFAULT now(),
    derniere_ouverture TIMESTAMP           -- sert à repérer les inactifs
);
```

Côté API, exposez seulement ce dont le consommateur a besoin, par exemple avec un objet de transfert en Java :

```java
// Ce que l'API renvoie : jamais l'entité complète
public record AbonneResume(Long id, String prenom) {}
```

**Étape 3, la conservation (principe e).** Décidez d'une durée et automatisez-la. Ici, on supprime les abonnés inactifs depuis deux ans (la durée est un exemple à valider avec le DPO, pas une règle du RGPD) :

```sql
DELETE FROM abonnes
WHERE COALESCE(derniere_ouverture, inscrit_le) < now() - INTERVAL '2 years';
```

Lancez cette requête depuis une tâche planifiée (cron, job du framework, pipeline) et conservez la trace de son exécution : c'est une preuve pour le principe de responsabilité.

**Étape 4, l'intégrité et la confidentialité (principe f).** Connexion chiffrée vers la base, comptes de base de données à droits limités, mots de passe jamais en clair, accès à la table restreints aux services qui en ont besoin, sauvegardes testées. Vous avez déjà vu ces mesures sous l'étiquette « sécurité » ; le RGPD en fait une obligation juridique pour les données personnelles.

**Étape 5, l'exactitude (principe d).** Prévoyez un moyen de corriger une donnée (lien de mise à jour du profil, endpoint `PATCH`) et évitez de dupliquer l'information dans dix tables : plus une donnée est copiée, plus il est difficile de la tenir à jour.

**Étape 6, la transparence (principe a).** Un formulaire d'inscription doit dire clairement qui collecte, pour quoi faire et comment exercer ses droits. La base légale du traitement (consentement, contrat, intérêt légitime, etc.) fera l'objet d'une leçon dédiée prochainement.

## Bonnes pratiques et pièges courants

Quelques réflexes qui font gagner du temps :

- **Documentez au fil de l'eau.** Une note d'une ligne dans le dépôt (« cette table contient des données personnelles, finalité X, durée Y ») vaut mieux qu'un grand document rédigé six mois plus tard.
- **Séparez les environnements.** N'utilisez pas des copies de production dans les environnements de développement ou de test ; privilégiez des données fictives ou transformées pour ne plus identifier personne.
- **Réfléchissez aux journaux.** Les logs applicatifs sont des traitements. Écrire des e-mails ou des corps de requête complets dans les logs est un piège classique : cela crée des copies non maîtrisées et sans durée de conservation.
- **Pensez au cycle de vie dès la conception.** Se demander « comment supprimer cette donnée proprement ? » au moment de modéliser évite des migrations douloureuses ensuite.

Les pièges fréquents :

- **Croire que « c'est anonyme » parce qu'il n'y a pas de nom.** Un identifiant stable associé à des comportements peut rester une donnée personnelle tant qu'une personne est identifiable.
- **Collecter large « pour plus tard ».** C'est exactement ce que le principe de minimisation vise à éviter.
- **Garder indéfiniment par défaut.** Sans purge prévue, les données s'accumulent et le risque avec elles.
- **Réutiliser une donnée pour un autre usage sans réfléchir.** Un jeu de données collecté pour la facturation ne se recycle pas automatiquement en base marketing ou en jeu d'entraînement pour un modèle d'IA.
- **Confondre sécurité et conformité.** Chiffrer la base ne suffit pas si la finalité est floue ou si la durée de conservation est infinie.

À noter : la Commission européenne a proposé en 2025 un paquet de simplification du numérique, dit « Digital Omnibus », qui toucherait certains points du RGPD. D'après la presse spécialisée de fin octobre 2026, le Conseil de l'UE a arrêté son mandat de négociation le 21 octobre 2026, mais le texte n'est pas adopté, les discussions avec le Parlement européen restent à venir et le RGPD s'applique toujours dans sa version actuelle. Les principes de l'article 5 présentés ici restent donc le socle de référence ; surveillez toutefois l'évolution du dossier.

## En entretien

Quelques réponses courtes et réutilisables :

- *« Que savez-vous du RGPD ? »* : « C'est le règlement européen qui encadre le traitement des données personnelles. Il repose sur des principes de l'article 5 : licéité, loyauté et transparence, limitation des finalités, minimisation, exactitude, limitation de la conservation, intégrité et confidentialité, avec en plus la responsabilité : il faut pouvoir prouver sa conformité. »
- *« Comment l'appliquez-vous en tant que développeur ? »* : « Je pars de la finalité, je ne crée que les champs nécessaires, je prévois une durée de conservation avec purge automatique, je limite les accès et je documente mes choix. »
- *« Quel est le risque en cas de non-respect ? »* : « Des amendes administratives, jusqu'à 20 millions d'euros ou 4 % du chiffre d'affaires mondial pour la catégorie la plus haute, dont fait partie la violation des principes de base, sans oublier l'impact sur l'image de l'organisation. »

## Mini-exercice (15 minutes)

Prenez un de vos projets (un TP de Django, une application Laravel, un schéma SQL d'école) et faites cet audit :

1. Listez chaque champ qui contient une donnée personnelle.
2. Pour chacun, écrivez la finalité en une phrase. Si vous ne trouvez pas, c'est un candidat à la suppression (minimisation).
3. Associez une durée de conservation plausible et écrivez la requête SQL de purge correspondante.
4. Repérez un endroit où la donnée est copiée (logs, export, table de test) et notez comment la limiter.

Gardez le résultat dans un fichier `DONNEES_PERSONNELLES.md` à la racine du projet : c'est une excellente pièce à montrer en entretien.

## Sources

- Règlement (UE) 2016/679 (RGPD), JO L 119 du 4.5.2016, sur EUR-Lex : <https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32016R0679>
- Texte consolidé de l'article 4 (définitions) : <https://www.springlex.eu/fr/packages/gdpr/gdpr-regulation/article-4/>
- Texte consolidé de l'article 5 (principes) : <https://www.springlex.eu/fr/packages/gdpr/gdpr-regulation/article-5/>
- Texte consolidé de l'article 83 (amendes administratives) : <https://www.springlex.eu/fr/packages/gdpr/gdpr-regulation/article-83/>
- Comité européen de la protection des données (CEPD), principes fondamentaux : <https://www.edpb.europa.eu/topics/key-gdpr-concepts/basic-principles_fr>
- CNIL, les principes du RGPD : <https://www.cnil.fr/fr/protection-des-donnees-les-bons-reflexes>
- Sur le Digital Omnibus (état fin octobre 2026) : <https://www.journaldunet.com/cybersecurite/1557131-digital-omnibus-ce-que-change-le-mandat-du-conseil-du-21-octobre-2026/> et <https://www.banquedesterritoires.fr/omnibus-numerique-leurope-peine-finaliser-la-simplification-promise>
