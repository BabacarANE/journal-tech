---
title: Spring Boot, comment l'auto-configuration décide à votre place (et comment reprendre la main)
date: 2026-11-16
track: frameworks
topic: spring-boot-fonctionnement-auto-configuration
level: intermédiaire
reading: 9
summary: Vous ajoutez une dépendance, et Spring Boot configure une base de données, un serveur web ou un sérialiseur JSON sans une ligne de code. On ouvre le capot : conditions, ordre de décision, rapport de conditions, exclusion et remplacement d'une configuration automatique.
---

## Pourquoi c'est important

Quand on démarre un projet Spring Boot, il suffit d'ajouter une dépendance pour qu'un serveur web, une connexion à une base ou un convertisseur JSON apparaissent comme par magie. Cette « magie » s'appelle l'**auto-configuration**. Elle est la raison principale pour laquelle Spring Boot est devenu le standard du développement Java côté serveur : on écrit la logique métier, le framework s'occupe de la plomberie.

Le revers, c'est que beaucoup de débutants (et quelques développeurs confirmés) ne savent pas ce qui se passe réellement. Résultat : quand une configuration automatique ne se déclenche pas, ou se déclenche alors qu'on ne la veut pas, on tâtonne. Comprendre le mécanisme permet de diagnostiquer en quelques minutes ce qui prenait une heure, et c'est une question classique en entretien : « Comment Spring Boot sait-il quoi configurer ? »

Un terme à définir tout de suite : un **bean** est un objet géré par le conteneur Spring (créé, configuré et injecté par lui). L'auto-configuration, c'est donc, pour l'essentiel, la création automatique de beans en fonction de ce que contient votre projet.

## Comment ça marche

### L'idée : décider en fonction du contexte

Selon la documentation officielle, Spring Boot tente de configurer automatiquement votre application d'après les dépendances (jars) présentes sur le classpath. Exemple donné par la documentation : si une base en mémoire comme HSQLDB est présente et que vous n'avez défini aucun bean de connexion, une base en mémoire est configurée pour vous.

Le **classpath** est l'ensemble des bibliothèques disponibles pour votre programme au moment où il s'exécute. Ajouter une dépendance dans votre `pom.xml` (Maven) ou votre `build.gradle` (Gradle), c'est donc modifier ce que Spring Boot « voit » et, par conséquent, ce qu'il configure.

### Les trois ingrédients

1. **Un point d'entrée** : l'annotation `@EnableAutoConfiguration`, que `@SpringBootApplication` inclut. La documentation recommande de n'ajouter qu'une seule fois `@SpringBootApplication` ou `@EnableAutoConfiguration`, sur votre classe de configuration principale.
2. **Une liste de candidats** : des classes d'auto-configuration, annotées `@AutoConfiguration` (cette annotation est elle-même une `@Configuration`, c'est-à-dire une classe qui déclare des beans). Spring Boot les trouve dans un fichier d'enregistrement placé dans le jar : `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`, qui contient un nom de classe complet par ligne.
3. **Des conditions** : chaque classe candidate porte des annotations `@Conditional...` qui décident si elle s'applique. Les plus courantes sont `@ConditionalOnClass` (une classe est présente sur le classpath), `@ConditionalOnMissingBean` (vous n'avez pas déjà défini ce bean) et `@ConditionalOnProperty` (une propriété de configuration a la bonne valeur).

### Le principe du « retrait poli »

La documentation décrit l'auto-configuration comme **non invasive** : à tout moment, vous pouvez définir votre propre configuration pour remplacer une partie de ce qui est fourni. Si vous déclarez votre propre bean `DataSource`, la prise en charge de la base embarquée « s'efface ». C'est précisément le rôle de `@ConditionalOnMissingBean` : la configuration automatique ne crée son bean que si le vôtre n'existe pas. D'où la règle d'or : **votre configuration explicite gagne toujours**.

Voici le modèle mental sous forme de schéma :

```
Démarrage de l'application
        │
        ▼
@EnableAutoConfiguration  ──►  lit le fichier .imports des jars du classpath
        │
        ▼
Pour chaque classe candidate :
   ├─ @ConditionalOnClass   : la bibliothèque est-elle présente ?   non ─► ignorée
   ├─ @ConditionalOnProperty: la propriété l'autorise-t-elle ?       non ─► ignorée
   └─ @ConditionalOnMissingBean : l'utilisateur a-t-il déjà son bean ? oui ─► on s'efface
        │
        ▼
Les beans restants sont enregistrés dans le conteneur Spring
```

### Ordre : vos beans d'abord

Les conditions sur les beans (`@ConditionalOnBean`, `@ConditionalOnMissingBean`) sont évaluées après le chargement de vos propres beans, ce qui est la raison pour laquelle elles sont recommandées dans les auto-configurations. Entre auto-configurations, l'ordre peut être précisé avec les attributs `before` et `after` de `@AutoConfiguration`, ou avec `@AutoConfigureBefore` et `@AutoConfigureAfter`. Cet ordre ne concerne que l'enregistrement des définitions de beans, pas leur création effective.

## Mise en place pas à pas

Versions de référence au moment de la rédaction (documentation officielle de Spring Boot) : Spring Boot **4.1.2** est la version stable affichée sur le site du projet, elle exige **Java 17 minimum** et est compatible jusqu'à Java 27, avec **Spring Framework 7.0.10 ou plus**, **Maven 3.6.3 ou plus** ou **Gradle 8.14 ou plus (ou 9.x)**.

### Étape 1 : voir ce qui est appliqué

Démarrez votre application avec l'option `--debug`. D'après la documentation, elle active les journaux de débogage de plusieurs composants centraux et affiche dans la console un **rapport de conditions** : pour chaque auto-configuration, on lit si elle a été appliquée ou non, et pourquoi.

```bash
java -jar mon-application.jar --debug
```

En production, si l'extension **Actuator** est activée, le point d'accès `GET /actuator/conditions` expose le même rapport en JSON. Les résultats sont groupés par contexte, avec les clés `positiveMatches` (ce qui s'applique), `negativeMatches` (ce qui a été écarté, avec la raison) et `unconditionalClasses` (ce qui s'applique sans condition).

### Étape 2 : écarter une auto-configuration

Deux possibilités, qui se cumulent selon la documentation.

Par annotation, avec l'attribut `exclude` :

```java
@SpringBootApplication(exclude = { DataSourceAutoConfiguration.class })
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

Si la classe n'est pas sur le classpath, l'attribut `excludeName` accepte le nom complet sous forme de texte. Par propriété, avec `spring.autoconfigure.exclude`, utile pour ne pas toucher au code. Dans Spring Boot 4.x, la classe `DataSourceAutoConfiguration` se trouve dans le paquet `org.springframework.boot.jdbc.autoconfigure`.

### Étape 3 : remplacer par votre propre bean

Pas besoin d'exclure quoi que ce soit dans la plupart des cas : il suffit de déclarer votre bean.

```java
@Configuration
class MaConfiguration {

    @Bean
    DataSource dataSource() {
        // Votre propre configuration de connexion.
        // L'auto-configuration de DataSource se retire d'elle-même.
        return DataSourceBuilder.create().build();
    }
}
```

### Étape 4 : comprendre en écrivant la vôtre (facultatif mais formateur)

Voici une auto-configuration minimale, dans un projet de bibliothèque. L'exemple est inventé pour l'illustration (les imports sont omis par souci de brièveté) :

```java
@AutoConfiguration
@ConditionalOnClass(Greeter.class)
public class GreeterAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    Greeter greeter() {
        return new Greeter("Bonjour");
    }
}
```

Elle devient active uniquement si vous l'enregistrez dans `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`, avec une ligne contenant le nom complet de la classe, par exemple `com.exemple.greeter.GreeterAutoConfiguration`. Pour le **test**, la documentation recommande `ApplicationContextRunner` avec `AutoConfigurations.of(...)`, qui permet de vérifier la présence ou l'absence d'un bean selon un contexte simulé.

## Bonnes pratiques et pièges courants

- **Ne pas exclure par réflexe.** Avant d'écrire un `exclude`, lisez le rapport de conditions : souvent, définir votre propre bean suffit.
- **Un seul `@SpringBootApplication`.** La documentation recommande de n'en placer qu'un, sur la classe principale.
- **Utiliser `@ConditionalOnMissingBean` avec un type de retour précis** dans vos propres auto-configurations, pour que la condition cible le bon bean.
- **Ne pas laisser le balayage de composants charger une auto-configuration.** Elle doit être chargée uniquement via le fichier `.imports`, placée dans un paquet dédié, sans activer elle-même de component scan : on utilise plutôt des `@Import` ciblés.
- **Ne pas dépendre des détails internes.** La documentation précise que seul le nom de la classe d'auto-configuration fait partie de l'API publique ; les classes imbriquées et les méthodes de bean sont internes et peuvent changer.
- **Nommage des modules (si vous publiez une bibliothèque).** Les starters officiels suivent le schéma `spring-boot-starter-*` ; les bibliothèques tierces ne doivent pas commencer par `spring-boot`, nom réservé aux artefacts officiels (par exemple `acme-spring-boot-starter`).
- **Piège classique :** une auto-configuration « ne marche pas » parce que la dépendance qui déclenche `@ConditionalOnClass` est absente, ou parce qu'un bean du même type existe déjà. Le rapport de conditions le dit noir sur blanc.

## En entretien

- **« Comment fonctionne l'auto-configuration de Spring Boot ? »** « Au démarrage, `@EnableAutoConfiguration` charge la liste des classes d'auto-configuration déclarées dans les fichiers `.imports` des jars. Chacune est soumise à des conditions : présence d'une classe, d'une propriété, absence d'un bean utilisateur. Seules celles dont les conditions sont remplies enregistrent leurs beans. »
- **« Comment remplacer ou désactiver une configuration automatique ? »** « Le plus simple est de déclarer son propre bean : l'auto-configuration s'efface grâce à `@ConditionalOnMissingBean`. Sinon, on utilise l'attribut `exclude` de `@SpringBootApplication` ou la propriété `spring.autoconfigure.exclude`. »
- **« Comment savoir pourquoi un bean n'est pas créé ? »** « Je lance l'application avec `--debug` pour lire le rapport de conditions, ou j'interroge `/actuator/conditions` si Actuator est activé. »

## Mini-exercice (15 minutes)

1. Générez un projet Spring Boot avec Java 17 ou plus et une seule dépendance web.
2. Lancez-le avec `--debug` et repérez, dans le rapport, une auto-configuration en « Positive matches » et une en « Negative matches », avec la raison indiquée.
3. Ajoutez une dépendance liée à une base de données (par exemple H2) sans rien configurer, relancez, et observez les nouvelles lignes du rapport.
4. Déclarez votre propre bean `DataSource`, relancez, et vérifiez que l'auto-configuration correspondante a « reculé » (condition sur bean manquant non remplie).

Bonus : écrivez la petite auto-configuration `Greeter` ci-dessus dans un second module, enregistrez-la dans le fichier `.imports` et testez-la avec `ApplicationContextRunner`.

## Sources

- [Auto-configuration, documentation de référence Spring Boot](https://docs.spring.io/spring-boot/reference/using/auto-configuration.html)
- [Créer votre propre auto-configuration, documentation de référence Spring Boot](https://docs.spring.io/spring-boot/reference/features/developing-auto-configuration.html)
- [Configuration requise de Spring Boot (System Requirements)](https://docs.spring.io/spring-boot/system-requirements.html)
- [API REST Actuator : point d'accès conditions](https://docs.spring.io/spring-boot/api/rest/actuator/conditions.html)
- [Systèmes de build et starters, documentation de référence Spring Boot](https://docs.spring.io/spring-boot/reference/using/build-systems.html)
- [Projet Spring Boot sur spring.io](https://spring.io/projects/spring-boot)
