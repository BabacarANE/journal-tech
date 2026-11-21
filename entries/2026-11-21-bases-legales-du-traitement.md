---
title: Bases légales du traitement : sur quoi repose le droit de traiter une donnée
date: 2026-11-21
track: donnees-legislation
topic: bases-legales-du-traitement
level: intermédiaire
reading: 9
summary: Consentement, contrat, obligation légale, intérêt légitime : l'article 6 du RGPD liste six bases légales et en exige une par finalité. On voit comment choisir, comment le test de l'intérêt légitime fonctionne et ce que cela change dans le code.
---

> Leçon informative : elle ne constitue pas un conseil juridique. Pour un cas réel, rapprochez-vous du délégué à la protection des données (DPO) de votre organisation ou d'un juriste.

## Pourquoi c'est important

La leçon du 14 novembre sur les principes du RGPD s'arrêtait sur une question laissée ouverte : au nom de quoi a-t-on le droit de traiter une donnée personnelle ? Le premier principe de l'article 5 exige un traitement « licite », et l'article 6 du règlement (UE) 2016/679 précise ce que cela veut dire : il faut s'appuyer sur une **base légale**. La CNIL la définit comme ce qui autorise légalement la mise en œuvre d'un traitement.

Pour un développeur, ce n'est pas qu'un sujet de juriste. La base légale décide de choses très concrètes : faut-il une case à cocher dans le formulaire, un bouton de retrait, un mécanisme d'opposition, une possibilité d'exporter les données ? Elle conditionne aussi les droits que les personnes peuvent exercer. Choisir la mauvaise base après coup oblige parfois à refaire une partie de l'application. La CNIL insiste d'ailleurs sur un point : le choix doit être fait **avant** de commencer le traitement.

## Comment ça marche

L'article 6 prévoit six bases. Voici comment la CNIL les présente, avec un exemple parlant pour chacune.

| Base légale | Idée en une phrase | Exemple typique |
|---|---|---|
| Consentement | La personne a accepté le traitement | Recevoir de la prospection commerciale par e-mail |
| Contrat | Le traitement est nécessaire pour exécuter ou préparer un contrat avec la personne | Gérer commandes et livraisons d'une boutique en ligne |
| Obligation légale | Un texte impose le traitement | Tenir la comptabilité |
| Mission d'intérêt public | Le traitement est nécessaire à une mission confiée à un organisme public | Services d'une collectivité |
| Intérêt légitime | L'organisme (ou un tiers) poursuit un intérêt légitime, sans déséquilibre au détriment des personnes | Sécurité du réseau, prévention de la fraude |
| Sauvegarde des intérêts vitaux | Le traitement protège la vie de quelqu'un | Situation d'urgence, cas très spécifique |

Trois règles de choix, tirées des pages de la CNIL, sont à retenir :

1. **Une seule base par finalité.** On ne peut pas cumuler plusieurs bases pour un même but. En revanche, un traitement qui poursuit plusieurs finalités a une base pour chacune. Dans un fichier clients, la gestion de la commande relève du contrat, la facturation conservée relève d'une obligation légale, et l'envoi de promotions peut relever du consentement.
2. **Aucune hiérarchie.** Le consentement n'est pas la « meilleure » base. C'est le responsable du traitement qui choisit, au cas par cas, selon le contexte.
3. **Le traitement doit être « nécessaire ».** Pour le contrat, l'obligation légale ou l'intérêt légitime, on doit pouvoir justifier que le traitement est réellement utile à l'objectif, pas simplement pratique.

Il existe aussi un régime à part pour les **données sensibles** (santé, opinions politiques, appartenance syndicale, etc., article 9) : leur traitement est interdit par principe, sauf exceptions. Il faut alors une base de l'article 6 **et** une exception de l'article 9. Le consentement explicite de l'article 9 n'est pas, à lui seul, une base légale.

### Ce que la base change pour les droits des personnes

Le tableau de la CNIL met en évidence un lien direct avec le code que l'on écrit. Version simplifiée pour les bases les plus courantes :

| Base | Effacement | Opposition | Portabilité |
|---|---|---|---|
| Consentement | oui | non, mais la personne peut retirer son consentement | oui |
| Contrat | oui | non | oui |
| Intérêt légitime | oui | oui | non |
| Obligation légale | non (sauf cas particuliers) | non | non |

Accès, rectification et limitation s'appliquent dans tous les cas évoqués. Autrement dit, si vous choisissez l'intérêt légitime, votre application doit permettre de gérer une **opposition**. Si vous choisissez le consentement, elle doit permettre de le **retirer**, et d'exporter les données dans un format réutilisable (portabilité).

### Le cas de l'intérêt légitime

C'est la base la plus souple, donc la plus délicate. La CNIL rappelle qu'elle n'est pas une base « par défaut » et qu'elle est réservée en principe aux organismes privés : une autorité publique ne peut pas l'utiliser pour ses missions. Le test se fait en trois conditions, qui rejoignent les lignes directrices 1/2024 du Comité européen de la protection des données (CEPD) :

1. **L'intérêt est légitime** : licite, formulé clairement, réel et présent (pas hypothétique).
2. **Le traitement est nécessaire** à cet intérêt : il n'existe pas de moyen moins intrusif d'atteindre le même but, par exemple sans donnée personnelle.
3. **La mise en balance** : l'impact sur la vie privée et les droits des personnes ne doit pas prendre le dessus, en tenant compte de leurs **attentes raisonnables** (le traitement ne doit pas les surprendre). Si l'équilibre n'est pas atteint, on peut prévoir des mesures compensatoires (pseudonymisation, opposition facilitée), sinon il faut chercher une autre base.

D'après la page du CEPD consultée aujourd'hui, ces lignes directrices ont été adoptées en version finale (version 2.0) le 10 novembre 2026, après une consultation publique ouverte à l'automne 2024. La version 1.0 n'était qu'un projet.

## Mise en place pas à pas

Reprenons l'application d'inscription à une newsletter de formation de la leçon précédente et ajoutons un site de vente de petites formations. Il y a donc plusieurs finalités. Notre point de départ est un **registre simple** des finalités, versionné avec le code. La syntaxe SQL ci-dessous est celle de PostgreSQL.

**Étape 1 : lister les finalités et choisir une base pour chacune.**

```sql
CREATE TABLE finalites (
    code            VARCHAR(40) PRIMARY KEY,
    description     TEXT NOT NULL,
    base_legale     VARCHAR(30) NOT NULL
        CHECK (base_legale IN ('consentement','contrat','obligation_legale',
                               'mission_interet_public','interet_legitime',
                               'interets_vitaux')),
    justification   TEXT NOT NULL,   -- pourquoi cette base, en une phrase
    duree_conservation TEXT NOT NULL
);

INSERT INTO finalites VALUES
 ('commande', 'Traiter et livrer une commande', 'contrat',
  'Sans ces données, la commande ne peut pas être exécutée', 'Durée de la relation contractuelle'),
 ('facturation', 'Conserver les factures', 'obligation_legale',
  'Obligations comptables', 'Durée fixée par les textes applicables'),
 ('newsletter', 'Envoyer la newsletter', 'consentement',
  'Prospection par e-mail : consentement demandé', 'Jusqu''au retrait ou à l''inactivité'),
 ('anti_fraude', 'Détecter les paiements suspects', 'interet_legitime',
  'Prévention de la fraude, test de pondération documenté', 'Durée courte, à valider avec le DPO');
```

La colonne `justification` joue le rôle de preuve de responsabilité : le choix est écrit, daté et versionné.

**Étape 2 : si la base est le consentement, enregistrer une preuve.** Il faut pouvoir montrer qui a consenti, à quoi et à quel moment, avec le texte présenté à l'époque.

```sql
CREATE TABLE consentements (
    id            BIGSERIAL PRIMARY KEY,
    abonne_id     BIGINT NOT NULL REFERENCES abonnes(id),
    finalite      VARCHAR(40) NOT NULL REFERENCES finalites(code),
    version_texte VARCHAR(20) NOT NULL,       -- version du libellé affiché
    donne_le      TIMESTAMP NOT NULL DEFAULT now(),
    retire_le     TIMESTAMP                   -- NULL tant que le consentement est actif
);
```

Côté Java, une méthode de retrait doit être aussi accessible que l'inscription :

```java
@PostMapping("/preferences/newsletter/retrait")
public ResponseEntity<Void> retirer(@AuthenticationPrincipal Abonne abonne) {
    consentementService.retirer(abonne.getId(), "newsletter");
    return ResponseEntity.noContent().build();
}
```

Le service met `retire_le` à jour et le traitement correspondant (l'envoi de la newsletter) filtre sur `retire_le IS NULL`.

**Étape 3 : si la base est l'intérêt légitime, documenter le test et prévoir l'opposition.** Écrivez dans un fichier du dépôt (par exemple `docs/interet-legitime-anti-fraude.md`) les trois réponses : quel intérêt, pourquoi nécessaire, quelle mise en balance et quelles mesures compensatoires. Ajoutez un endpoint ou un formulaire permettant d'exercer l'opposition.

**Étape 4 : informer.** Les bases légales doivent figurer dans l'information donnée aux personnes. Si vous retenez l'intérêt légitime, l'intérêt poursuivi doit aussi y apparaître (par exemple la lutte contre la fraude).

**Étape 5 : le cas des cookies et traceurs.** Au-delà du RGPD, la directive ePrivacy impose en principe un consentement avant de stocker ou lire des informations sur le terminal, sauf si le traceur est strictement nécessaire au service demandé. Un même cookie ne doit pas servir à une finalité qui exige le consentement sous couvert d'une finalité qui ne l'exige pas (un cookie d'authentification réutilisé pour du ciblage publicitaire, par exemple). Une leçon dédiée à ce sujet viendra.

## Bonnes pratiques et pièges courants

- **Choisir la base avant d'écrire le code**, pas en rédigeant la politique de confidentialité à la fin du projet.
- **Ne pas tout mettre sur le consentement « pour être tranquille ».** Un consentement doit être libre, spécifique, éclairé et univoque, et il peut être retiré à tout moment : si vous avez besoin des données pour exécuter un contrat, demander un consentement n'a pas de sens, puisque le retirer casserait le service.
- **Ne pas cumuler les bases pour une même finalité** (« contrat ou consentement, au cas où ») : la CNIL indique que ce cumul n'est pas possible.
- **Ne pas utiliser l'intérêt légitime comme fourre-tout.** Sans analyse documentée en trois temps, c'est la base la plus facile à contester.
- **Réévaluer en cas de changement.** Si la finalité, les données ou les durées évoluent de façon importante, la base choisie peut ne plus être valide : il faut refaire l'évaluation.
- **Séparer les finalités dans le modèle de données.** Une table `consentements` par finalité, plutôt qu'un booléen unique `accepte_conditions`, permet de retirer un consentement sans toucher au reste.
- **Documenter.** Registre des traitements, fichier de décisions dans le dépôt ou documentation technique : la CNIL recommande de garder trace du raisonnement.

## En entretien

- *« Qu'est-ce qu'une base légale ? »* : « C'est la justification juridique d'un traitement de données personnelles, prévue à l'article 6 du RGPD. Il y en a six : consentement, contrat, obligation légale, mission d'intérêt public, intérêt légitime et sauvegarde des intérêts vitaux. On en choisit une par finalité, avant de lancer le traitement. »
- *« Le consentement est-il toujours la meilleure base ? »* : « Non, il n'y a pas de hiérarchie. Pour exécuter une commande, la base est le contrat. Le consentement convient quand la personne a un vrai choix, comme pour une newsletter, et il doit pouvoir être retiré aussi simplement que donné. »
- *« Comment avez-vous pris en compte cela dans un projet ? »* : « J'ai listé les finalités, associé une base à chacune dans un registre versionné avec le code, enregistré une preuve horodatée pour les consentements et prévu les mécanismes de retrait ou d'opposition correspondants. »

## Mini-exercice (15 minutes)

Choisissez un de vos projets (boutique, application de réservation, tableau de bord Power BI alimenté par des données clients) :

1. Listez trois finalités distinctes du projet.
2. Pour chacune, choisissez une base légale et écrivez une phrase de justification. Vérifiez que vous n'avez pas deux bases pour une même finalité.
3. Pour la finalité fondée sur le consentement (ou l'intérêt légitime), décrivez la fonctionnalité technique qui en découle : bouton de retrait ou formulaire d'opposition.
4. Pour une finalité fondée sur l'intérêt légitime, rédigez les trois réponses du test (intérêt, nécessité, mise en balance) en dix lignes.

Rangez le tout dans un fichier `BASES_LEGALES.md` : c'est une pièce simple et crédible à présenter en entretien.

## Sources

- CNIL, La licéité du traitement : l'essentiel sur les bases légales prévues par le RGPD : <https://www.cnil.fr/fr/les-bases-legales/liceite-essentiel-sur-les-bases-legales>
- CNIL, L'intérêt légitime : comment fonder un traitement sur cette base légale ? : <https://www.cnil.fr/fr/les-bases-legales/interet-legitime>
- CNIL, Prendre en compte les bases légales dans l'implémentation technique : <https://cnil.fr/fr/prendre-en-compte-les-bases-legales-dans-limplementation-technique>
- CEPD, Lignes directrices 1/2024 sur le traitement fondé sur l'article 6(1)(f) du RGPD (version 2.0, adoptée le 10 novembre 2026) : <https://www.edpb.europa.eu/our-work-tools/documents/public-consultations/2024/guidelines-12024-processing-personal-data-based_en>
- Règlement (UE) 2016/679 (RGPD), texte officiel sur EUR-Lex, à consulter pour les articles 6 et 9 : <https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32016R0679>
