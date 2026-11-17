---
title: Les principes SOLID en pratique, refactorer une classe qui fait tout
date: 2026-11-17
track: bonnes-pratiques
topic: principes-solid-en-pratique
level: intermédiaire
reading: 9
summary: SOLID, ce sont cinq réflexes de conception qui rendent le code plus facile à modifier et à tester. On part d'une classe de commande qui fait tout, on la découpe pas à pas, et on voit où chaque principe s'applique (et où il ne faut pas en abuser).
---

## Pourquoi c'est important

Un projet qui démarre est agréable : on ajoute une fonctionnalité, ça marche. Quelques mois plus tard, chaque modification casse autre chose, les tests sont impossibles à écrire sans lancer une base de données, et personne n'ose toucher à la grosse classe du milieu. Les principes **SOLID** sont une famille de cinq règles de conception orientée objet qui visent un seul but : que le code reste **facile à changer** sans tout casser.

Le sigle regroupe cinq principes : **S**ingle responsibility (responsabilité unique), **O**pen/closed (ouvert à l'extension, fermé à la modification), **L**iskov substitution (substitution de Liskov), **I**nterface segregation (ségrégation des interfaces) et **D**ependency inversion (inversion des dépendances). En entretien, on vous demandera presque toujours de les citer et de les illustrer par un exemple concret. C'est ce que cette leçon propose.

Deux termes à définir d'emblée. Le **couplage** mesure à quel point une partie du code dépend d'une autre : plus il est fort, plus un changement ici se répercute là-bas. La **cohésion** mesure à quel point ce qui est regroupé dans une même classe va réellement ensemble. L'objectif de SOLID, c'est un couplage faible et une cohésion forte.

## Comment ça marche

Voici le modèle mental, avec une phrase par principe, reformulée simplement :

| Principe | Idée en une phrase | Symptôme qui alerte |
|---|---|---|
| S, responsabilité unique | Une classe a une seule raison de changer. | Une classe modifiée pour des motifs sans rapport (tarifs, base, e-mails). |
| O, ouvert/fermé | On ajoute un comportement en ajoutant du code, pas en réécrivant l'existant. | Un `if / else if` qui grossit à chaque nouveau cas. |
| L, Liskov | Un sous-type doit pouvoir remplacer son type parent sans surprise. | Une méthode héritée qui lève « non supporté » ou change le sens du contrat. |
| I, interfaces ségréguées | Mieux vaut plusieurs petites interfaces ciblées qu'une grosse. | Des classes qui implémentent des méthodes vides pour satisfaire l'interface. |
| D, inversion de dépendance | Le code métier dépend d'abstractions, pas de détails techniques. | Un `new SmtpClient(...)` ou une connexion SQL en dur dans la logique métier. |

Sur Liskov, la formulation de référence vient de Barbara Liskov et Jeannette Wing (« A behavioral notion of subtyping », ACM TOPLAS, 1994) : tout ce qu'on peut démontrer sur les objets du type parent doit rester vrai pour les objets du sous-type. Concrètement, un sous-type ne doit pas **renforcer les préconditions** (exiger plus de l'appelant), ni **affaiblir les postconditions** (promettre moins en retour), ni affaiblir les **invariants** (les règles toujours vraies pour l'objet). Robert C. Martin a popularisé le principe auprès des développeurs dans un article de 1996, publié dans *C++ Report*.

## Mise en place pas à pas

Le code ci-dessous est volontairement simple : il n'utilise que des fonctionnalités de base du langage Java, donc il compile avec n'importe quelle version récente. Java 25, sortie le 16 septembre 2025, est la version à support long (LTS) du moment, d'après l'annonce d'Oracle. Pour l'injection, on s'appuie sur Spring Framework (la documentation de référence consultée est celle de la version 7.0.10).

### Étape 0 : la classe qui fait tout

```java
public class OrderService {

    public void checkout(Order order, String customerType) {
        long total = 0;
        for (OrderLine line : order.lines()) {
            total += line.unitPriceCents() * line.quantity();
        }

        // Règles de remise écrites en dur
        if (customerType.equals("VIP")) {
            total = total * 90 / 100;
        } else if (customerType.equals("STUDENT")) {
            total = total * 95 / 100;
        }

        // Accès base de données en dur
        try (Connection c = DriverManager.getConnection(DB_URL)) {
            // INSERT de la commande et du total...
        }

        // Envoi d'e-mail en dur
        new SmtpClient("smtp.example.com").send(order.customerEmail(), "Commande confirmée");
    }
}
```

Cette classe change pour quatre raisons : le calcul du prix, les remises, le stockage et la notification. Elle est impossible à tester sans base ni serveur de messagerie. C'est l'exemple typique d'une cohésion faible et d'un couplage fort.

### Étape 1 : D et I, sortir les détails techniques derrière des interfaces

On crée de petites interfaces qui expriment ce dont le métier a **besoin**, sans dire comment c'est réalisé :

```java
public interface OrderRepository {
    void save(Order order, long totalCents);
}

public interface Notifier {
    void orderConfirmed(Order order);
}
```

Ces deux interfaces sont petites et ciblées (ségrégation des interfaces) : le code métier n'a pas à connaître des méthodes de lecture, de suppression ou de pagination dont il ne se sert pas. L'implémentation JDBC ou SMTP vit ailleurs, à la périphérie de l'application.

### Étape 2 : O, rendre les remises extensibles

```java
public interface DiscountPolicy {
    long apply(long totalCents);
}

public class VipDiscount implements DiscountPolicy {
    public long apply(long totalCents) { return totalCents * 90 / 100; }
}

public class NoDiscount implements DiscountPolicy {
    public long apply(long totalCents) { return totalCents; }
}
```

Ajouter une remise « étudiant » revient maintenant à écrire une nouvelle classe, sans toucher aux anciennes ni à `OrderService` : c'est le principe ouvert/fermé. C'est aussi le patron de conception **Strategy** (on injecte un algorithme interchangeable).

### Étape 3 : S et D, une classe, une raison de changer, des dépendances injectées

```java
@Service
public class CheckoutService {

    private final DiscountPolicy discount;
    private final OrderRepository repository;
    private final Notifier notifier;

    public CheckoutService(DiscountPolicy discount,
                           OrderRepository repository,
                           Notifier notifier) {
        this.discount = discount;
        this.repository = repository;
        this.notifier = notifier;
    }

    public void checkout(Order order) {
        long total = discount.apply(order.totalCents());
        repository.save(order, total);
        notifier.orderConfirmed(order);
    }
}
```

`CheckoutService` ne fait plus qu'une chose : orchestrer le parcours de commande. Il dépend d'abstractions (inversion de dépendance), qu'on lui **fournit** par le constructeur. Dans une vraie application, une fabrique ou le conteneur Spring choisit l'implémentation de `DiscountPolicy` adaptée au client. La documentation de Spring Framework recommande en général l'injection par constructeur pour les dépendances obligatoires : elle permet des objets immuables, garantit que les dépendances ne sont pas nulles et livre un objet entièrement initialisé.

L'avantage se mesure immédiatement dans les tests : on remplace la base et l'e-mail par de petits faux objets.

```java
class CheckoutServiceTest {
    @Test
    void appliqueLaRemiseAvantEnregistrement() {
        List<Long> saved = new ArrayList<>();
        CheckoutService service = new CheckoutService(
            new VipDiscount(),
            (order, total) -> saved.add(total),   // faux dépôt
            order -> { }                          // faux notifieur
        );

        service.checkout(orderDe10000Centimes());

        assertEquals(List.of(9000L), saved);
    }
}
```

### Étape 4 : L, ne pas trahir le contrat

Imaginons une interface `PaymentMethod` avec `pay(...)` et `refund(...)`. Une classe `GiftCardPayment` qui lèverait `UnsupportedOperationException` dans `refund` violerait Liskov : le code appelant, qui compte sur le contrat de l'interface, plante à l'exécution. La solution passe par la ségrégation d'interfaces : une interface `Payable` (pour payer) et une interface `Refundable` (pour rembourser) qui l'étend ou la complète, et seules les classes capables de rembourser implémentent la seconde. Les deux principes se renforcent mutuellement.

## Bonnes pratiques et pièges courants

- **Ne pas appliquer SOLID par réflexe.** Créer une interface pour chaque classe « au cas où » ajoute du bruit. Une règle utile : on introduit une abstraction quand on constate une vraie variation (deux implémentations, un besoin de test) ou une vraie raison de changer, pas avant. Sur-découper est un défaut aussi réel que la classe fourre-tout.
- **« Une seule responsabilité » ne veut pas dire « une seule méthode ».** Il s'agit d'une seule *raison de changer*, c'est-à-dire d'un seul sujet métier ou technique, pas d'un minuscule fragment de code.
- **Lire les signes d'alerte.** Un `if` sur un « type » qui revient partout, une classe de plus de plusieurs centaines de lignes, des tests qui exigent trop de préparation : autant de signaux pour refactorer.
- **Refactorer avec un filet.** Écrivez d'abord un test qui décrit le comportement actuel, puis découpez par petites étapes en gardant le test au vert.
- **L'héritage n'est pas toujours la bonne réponse.** Quand un sous-type viole Liskov, c'est souvent le signe qu'il vaut mieux utiliser la composition (une classe qui *contient* un collaborateur) plutôt que l'héritage.
- **Dépendre d'abstractions sans en faire un culte.** Les types simples du langage (listes, chaînes) n'ont pas besoin d'être cachés derrière des interfaces.

## En entretien

- **« Pouvez-vous expliquer SOLID ? »** « Ce sont cinq principes de conception pour garder le code facile à modifier : responsabilité unique, ouvert/fermé, substitution de Liskov, ségrégation des interfaces et inversion des dépendances. Dans mon dernier projet, j'ai découpé une classe de commande qui gérait remises, base de données et e-mails en trois abstractions injectées par constructeur, ce qui m'a permis de la tester sans infrastructure. »
- **« Quel principe est le plus difficile à appliquer ? »** « Liskov, car la violation n'est pas visible à la compilation : elle apparaît à l'exécution, quand un sous-type ne respecte pas le contrat du type parent. Je la détecte en vérifiant qu'une sous-classe n'exige pas plus qu'elle ne le doit et ne promet pas moins. »
- **« Quel est le risque de SOLID ? »** « La sur-ingénierie : multiplier les interfaces et les classes sans besoin réel. Je préfère introduire une abstraction quand une variation ou un besoin de test apparaît. »

## Mini-exercice

Prenez une classe de votre projet (ou un petit script que vous avez écrit) qui mélange calcul, accès aux données et affichage ou envoi.

1. Listez ses « raisons de changer » (au moins trois, par exemple règle de calcul, stockage, notification).
2. Écrivez un test qui capture son comportement actuel.
3. Extrayez la dépendance la plus pénible à tester (base de données, e-mail, horloge) derrière une petite interface, et passez-la par le constructeur.
4. Remplacez un `if / else` sur un type par deux implémentations d'une même interface.
5. Réécrivez le test avec un faux objet et vérifiez qu'il ne dépend plus d'aucune infrastructure.

Si vous avez 15 minutes de plus : cherchez dans votre code une classe qui lève « non supporté » ou ignore silencieusement une méthode héritée, et demandez-vous quelle interface plus petite la décrirait mieux.

## Sources

- [Liskov substitution principle, Wikipédia (références : Liskov et Wing, 1994 ; Martin, C++ Report, 1996)](https://en.wikipedia.org/wiki/Liskov_substitution_principle)
- [Annonce de la sortie de Java 25, Oracle, 16 septembre 2025](https://www.oracle.com/hk/news/announcement/oracle-releases-java-25-2025-09-16/)
- [Dependency Injection, documentation de référence Spring Framework](https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html)
