---
title: Spring Boot, l'injection de dépendances : laisser le conteneur câbler vos objets
date: 2026-11-23
track: frameworks
topic: spring-boot-injection-dependances
level: débutant
reading: 9
summary: Pourquoi vos classes ne font jamais `new` sur leurs collaborateurs dans Spring Boot, comment le conteneur choisit quoi injecter, et comment gérer les cas délicats : plusieurs implémentations, dépendances optionnelles, dépendances circulaires.
---

## Pourquoi c'est important

Imaginez un service de notification qui envoie des e-mails. Première idée : écrire `new EmailSender()` à l'intérieur de la classe. Problème : le service est maintenant collé à cette implémentation. Pour le tester sans envoyer de vrais e-mails, ou pour passer demain à un envoi par SMS, il faut modifier le code du service.

L'**injection de dépendances** (en anglais *dependency injection*, ou DI) renverse la logique : une classe ne crée pas ses collaborateurs, elle déclare ce dont elle a besoin, et quelqu'un d'autre le lui fournit. Ce « quelqu'un d'autre », dans Spring, c'est le **conteneur** (aussi appelé *ApplicationContext*), l'objet qui crée, configure et relie les objets de votre application. Un objet géré par ce conteneur s'appelle un **bean**.

Le bénéfice est triple : un code plus facile à tester (on fournit une fausse implémentation), plus facile à faire évoluer (on change l'implémentation sans toucher aux classes qui l'utilisent), et plus lisible (les dépendances d'une classe se lisent d'un coup d'œil). C'est aussi l'une des questions les plus fréquentes en entretien sur Spring : « Qu'est-ce que l'injection de dépendances et comment Spring la met-il en œuvre ? »

## Comment ça marche

### Le modèle mental

Au démarrage, le conteneur fait trois choses :

1. Il **découvre les beans** : les classes annotées `@Component` ou l'un de ses dérivés (`@Service`, `@Repository`, `@Controller`), ainsi que les méthodes annotées `@Bean` dans les classes de configuration.
2. Il **construit le graphe des dépendances** : pour chaque bean, il regarde ce dont il a besoin (les paramètres du constructeur, par exemple).
3. Il **crée les beans dans le bon ordre** et fournit à chacun ses collaborateurs.

```
UserController ──► UserService ──► UserRepository ──► DataSource
   (a besoin de)    (a besoin de)     (a besoin de)

Le conteneur crée DataSource, puis UserRepository, puis UserService,
puis UserController, en injectant à chaque étape l'objet déjà prêt.
```

Selon la documentation de Spring Boot, vous êtes libre d'utiliser n'importe quelle technique standard de Spring Framework pour définir vos beans et leurs dépendances, et la documentation recommande l'injection par constructeur. La découverte automatique des composants s'active avec `@ComponentScan` ou, plus simplement, avec `@SpringBootApplication`, qui inclut ce balayage. La documentation conseille de placer la classe principale dans un paquet racine (par exemple `com.exemple.monapp`), au-dessus des autres classes, afin que le balayage ne couvre que votre projet.

### Constructeur ou setter ?

La documentation de Spring Framework distingue deux variantes. L'**injection par constructeur** fournit les dépendances au moment de la création de l'objet. L'**injection par setter** les fournit après, via des méthodes `setXxx`. La règle donnée est simple : constructeur pour les dépendances obligatoires, setter pour les dépendances facultatives ayant une valeur par défaut raisonnable.

L'équipe Spring recommande en général le constructeur, pour trois raisons : on obtient des composants immuables, on a la garantie que les dépendances obligatoires ne sont pas nulles, et l'objet est entièrement initialisé dès qu'il est rendu à son appelant. La documentation signale aussi qu'un constructeur avec beaucoup d'arguments est un signal d'alerte : la classe en fait probablement trop.

Une troisième forme existe, l'injection directe sur un champ (`@Autowired` placé sur l'attribut). Elle est courte à écrire, mais l'objet ne peut plus être construit à la main sans passer par le conteneur ou par de la réflexion, ce qui complique les tests unitaires. C'est la raison pour laquelle on la déconseille en pratique.

## Mise en place pas à pas

Versions de référence au moment de la rédaction : **Spring Boot 4.2.0** (version stable affichée dans la documentation officielle), qui demande **Java 17 minimum** (compatible jusqu'à Java 27) et **Spring Framework 7.1.0 ou plus**.

### Étape 1 : une interface et deux implémentations

```java
public interface MessageSender {
    void send(String destinataire, String message);
}
```

```java
@Component
public class EmailSender implements MessageSender {
    @Override
    public void send(String destinataire, String message) {
        System.out.println("E-mail à " + destinataire + " : " + message);
    }
}
```

```java
@Component
public class SmsSender implements MessageSender {
    @Override
    public void send(String destinataire, String message) {
        System.out.println("SMS à " + destinataire + " : " + message);
    }
}
```

### Étape 2 : un consommateur avec injection par constructeur

```java
@Service
public class NotificationService {

    private final MessageSender sender;

    public NotificationService(MessageSender sender) {
        this.sender = sender;
    }

    public void prevenir(String destinataire) {
        sender.send(destinataire, "Votre commande est expédiée.");
    }
}
```

Deux points à retenir. Le champ est `final` : c'est l'injection par constructeur qui le permet, et il ne pourra plus être modifié. Et il n'y a pas d'annotation `@Autowired`, car selon la documentation, elle n'est pas nécessaire sur un constructeur lorsque la classe n'en possède qu'un seul : ce constructeur unique est toujours utilisé.

### Étape 3 : l'erreur qui apparaît (et ce qu'elle dit)

Ce code ne démarre pas : il existe **deux** beans de type `MessageSender` et le conteneur ne sait pas lequel choisir. Spring lève alors une `NoUniqueBeanDefinitionException` (« plus d'un bean candidat »). Inversement, si aucun bean du type demandé n'existe, une dépendance obligatoire provoque une `NoSuchBeanDefinitionException`. Ces deux noms sont à connaître : le premier signifie « trop de candidats », le second « aucun candidat ». Le message d'erreur de votre application les cite et liste les beans en cause.

### Étape 4 : lever l'ambiguïté

**Option A, `@Primary`** : on désigne un bean préféré par défaut.

```java
@Component
@Primary
public class EmailSender implements MessageSender { /* ... */ }
```

Quand plusieurs candidats existent pour une dépendance à valeur unique et qu'exactement un est marqué `@Primary`, c'est lui qui est injecté. Spring Framework propose aussi `@Fallback` (disponible depuis la version 6.2) pour l'inverse : marquer un bean comme choix de dernier recours.

**Option B, `@Qualifier`** : on choisit explicitement au point d'injection.

```java
public NotificationService(@Qualifier("smsSender") MessageSender sender) {
    this.sender = sender;
}
```

Le qualificatif est un filtre appliqué aux candidats de même type. Sans qualificatif explicite, le nom du bean sert de valeur par défaut : par défaut, le bean de la classe `SmsSender` s'appelle `smsSender`. La documentation indique aussi que, si rien d'autre ne départage les candidats, Spring compare le nom du paramètre aux noms des beans, ce qui suppose de compiler avec l'option `-parameters` (exigence depuis Spring 6.1). Compter sur ce mécanisme implicite est fragile ; un `@Qualifier` explicite est plus lisible.

**Option C, tout injecter** : on demande l'ensemble des beans d'un type.

```java
@Service
public class DiffusionService {

    private final List<MessageSender> senders;

    public DiffusionService(List<MessageSender> senders) {
        this.senders = senders;
    }

    public void diffuser(String destinataire, String message) {
        senders.forEach(s -> s.send(destinataire, message));
    }
}
```

Un tableau ou une collection typée reçoit tous les beans du type d'élément. Une `Map<String, MessageSender>` est aussi possible à condition que la clé soit de type `String` : les clés sont alors les noms de beans. L'ordre suit par défaut l'enregistrement des définitions de beans, et on le contrôle avec `@Order` ou l'interface `Ordered`.

### Étape 5 : tester sans Spring

Voilà le vrai gain de l'injection par constructeur : le test unitaire n'a besoin ni du conteneur ni de la réflexion.

```java
class NotificationServiceTest {

    @Test
    void envoieLeMessageAuDestinataire() {
        List<String> envoyes = new ArrayList<>();
        MessageSender faux = (dest, msg) -> envoyes.add(dest + ":" + msg);

        NotificationService service = new NotificationService(faux);
        service.prevenir("alice@exemple.fr");

        assertEquals(1, envoyes.size());
    }
}
```

## Bonnes pratiques et pièges courants

- **Constructeur pour l'obligatoire, setter pour le facultatif.** C'est la règle de la documentation. Si le constructeur a beaucoup trop d'arguments, c'est la conception qu'il faut revoir (la classe a trop de responsabilités), pas l'injection.
- **Dépendre d'interfaces, pas d'implémentations.** C'est ce qui permet de substituer un faux en test ou une autre implémentation en production.
- **Plusieurs constructeurs : en marquer un.** Si une classe a plusieurs constructeurs, il faut indiquer avec `@Autowired` celui que Spring doit utiliser (sauf s'il existe un constructeur principal ou par défaut). Un seul constructeur annoté peut être obligatoire.
- **Éviter l'injection sur champ** pour le code applicatif : elle masque le nombre de dépendances et rend les tests plus lourds.
- **Dépendance optionnelle.** Pour qu'une dépendance ne fasse pas échouer le démarrage quand aucun bean n'existe, on peut utiliser `Optional<T>`, un paramètre annoté `@Nullable`, ou `@Autowired(required = false)`.
- **Dépendances circulaires.** Si `A` a besoin de `B` par son constructeur et que `B` a besoin de `A`, aucun des deux ne peut être créé en premier. Le conteneur détecte la situation à l'exécution et lève une `BeanCurrentlyInCreationException`. La documentation de Spring Framework indique que la solution est de modifier certaines classes pour utiliser des setters ; elle précise cependant que ce n'est pas recommandé. Spring Boot a de plus choisi d'interdire par défaut les références circulaires (propriété `spring.main.allow-circular-references` pour les réautoriser). La vraie correction est architecturale : extraire la logique commune dans une troisième classe dont `A` et `B` dépendent tous les deux.
- **Les beans sont créés au démarrage.** Par défaut, le contexte crée tous les beans singleton dès le lancement, ce qui fait remonter les erreurs de câblage immédiatement. L'initialisation paresseuse (`@Lazy`, ou la propriété `spring.main.lazy-initialization=true`) reporte la création, mais déplace aussi les erreurs vers l'exécution : à réserver à des cas précis.
- **Un paquet racine pour la classe principale.** Une classe en dehors du paquet balayé n'est pas découverte : le bean est « introuvable » alors que l'annotation est bien là.

## En entretien

- **« Qu'est-ce que l'injection de dépendances ? »** « Une classe ne crée pas elle-même ses collaborateurs : elle les déclare, et le conteneur Spring les lui fournit. Cela réduit le couplage et permet de substituer une implémentation, notamment un faux en test. »
- **« Pourquoi préférer l'injection par constructeur ? »** « Elle permet des champs `final`, garantit que les dépendances obligatoires ne sont pas nulles et fournit un objet complètement initialisé. Elle rend aussi la classe testable sans Spring, avec un simple `new`. Et un constructeur trop long signale une classe qui a trop de responsabilités. »
- **« Que faire si deux beans correspondent au même type ? »** « Je lève l'ambiguïté avec `@Primary` pour un choix par défaut, ou `@Qualifier` pour un choix explicite au point d'injection. Je peux aussi injecter la liste de tous les beans si j'ai besoin de tous. »

## Mini-exercice (15 minutes)

1. Générez un projet Spring Boot (Java 17 ou plus, dépendance web) et recopiez `MessageSender`, `EmailSender`, `SmsSender` et `NotificationService`.
2. Lancez l'application et lisez le message d'erreur d'ambiguïté : repérez les noms des deux candidats proposés.
3. Corrigez d'abord avec `@Primary`, puis avec `@Qualifier("smsSender")`, et vérifiez le comportement à chaque fois.
4. Ajoutez `DiffusionService` avec `List<MessageSender>` et observez que les deux implémentations sont appelées.
5. Écrivez le test unitaire de `NotificationService` avec un faux `MessageSender`, sans annotation Spring.
6. Bonus : provoquez volontairement une dépendance circulaire entre deux services par constructeur et lisez l'exception obtenue.

## Sources

- [Dependency Injection, documentation de référence Spring Framework](https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html)
- [Using @Autowired, documentation de référence Spring Framework](https://docs.spring.io/spring-framework/reference/core/beans/annotation-config/autowired.html)
- [Fine-tuning Annotation-based Autowiring with @Primary or @Fallback](https://docs.spring.io/spring-framework/reference/core/beans/annotation-config/autowired-primary.html)
- [Fine-tuning Annotation-based Autowiring with Qualifiers](https://docs.spring.io/spring-framework/reference/core/beans/annotation-config/autowired-qualifiers.html)
- [NoUniqueBeanDefinitionException, API Spring Framework](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/beans/factory/NoUniqueBeanDefinitionException.html)
- [NoSuchBeanDefinitionException, API Spring Framework](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/beans/factory/NoSuchBeanDefinitionException.html)
- [Lazy-initialized Beans, documentation de référence Spring Framework](https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-lazy-init.html)
- [Spring Beans and Dependency Injection, documentation de référence Spring Boot](https://docs.spring.io/spring-boot/reference/using/spring-beans-and-dependency-injection.html)
- [Structuring Your Code, documentation de référence Spring Boot](https://docs.spring.io/spring-boot/reference/using/structuring-your-code.html)
- [SpringApplication, documentation de référence Spring Boot](https://docs.spring.io/spring-boot/reference/features/spring-application.html)
- [System Requirements, Spring Boot 4.2](https://docs.spring.io/spring-boot/4.2/system-requirements.html)
- [Ticket « Prohibit circular references by default », dépôt Spring Boot](https://github.com/spring-projects/spring-boot/issues/27652)
