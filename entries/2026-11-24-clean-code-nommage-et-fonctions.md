---
title: Clean code, bien nommer et écrire des fonctions courtes
date: 2026-11-24
track: bonnes-pratiques
topic: clean-code-nommage-et-fonctions
level: débutant
reading: 9
summary: Un code se lit bien plus souvent qu'il ne s'écrit. On voit comment choisir des noms qui disent la vérité, découper une fonction en petites étapes lisibles, et appliquer les conventions officielles de Python et de Java, avec un avant/après compilé et testé.
---

## Pourquoi c'est important

Un développeur passe nettement plus de temps à **lire** du code qu'à en écrire : relire le sien trois semaines plus tard, comprendre celui d'un collègue, retrouver où se trouve un bug. Le guide de style officiel de Python (PEP 8) part exactement de ce constat : le code est lu bien plus souvent qu'il n'est écrit, donc les conventions existent pour faciliter la lecture. Le *clean code* (« code propre ») désigne l'ensemble des pratiques qui rendent un programme compréhensible par un autre humain, sans explication orale.

Le sujet a été popularisé par le livre de Robert C. Martin, *Clean Code : A Handbook of Agile Software Craftsmanship* (première édition en 2008 chez Pearson). Une seconde édition, remaniée, est parue chez Addison-Wesley Professional le 30 septembre 2025, avec des exemples dans plusieurs langages (Java, JavaScript, Go, Python, entre autres) et un chapitre sur les outils d'IA pour coder. Deux thèmes y reviennent sans cesse : **les noms** et **les fonctions**. C'est le cœur de cette leçon, parce que ce sont les deux leviers les plus rapides pour améliorer son code dès aujourd'hui, en stage comme en alternance.

## Comment ça marche

Le modèle mental tient en une idée : **le code doit se lire presque comme de la prose**. Pour y arriver, on agit à deux niveaux.

**Les noms.** Un bon nom répond à la question « qu'est-ce que c'est, ou que fait-ce ? » sans qu'on ait besoin de lire le corps. Une critique du livre (InfoQ, 2009) résume l'esprit : un nom long et descriptif vaut mieux qu'un nom court et énigmatique, et mieux qu'un commentaire pour l'expliquer. Quelques repères :

| Situation | Plutôt éviter | Plutôt écrire |
|---|---|---|
| Variable à sens métier | `d`, `tmp`, `data2` | `daysSinceLastLogin`, `unpaidInvoices` |
| Fonction qui agit | `process()`, `handle()` | `sendReminderEmail()`, `calculateTotal()` |
| Booléen | `flag`, `status` | `isActive`, `hasUnpaidInvoice` |
| Nombre « magique » | `if (n > 3)` | `if (attempts > MAX_LOGIN_ATTEMPTS)` |

Une règle simple : un nom ne doit ni **mentir** (une variable `accountList` qui est en réalité un dictionnaire), ni obliger à **deviner** (`getData()` : quelles données ?), ni **abréger** au point d'être illisible. Les noms de classes sont plutôt des noms (`InvoiceReader`), les noms de fonctions plutôt des verbes (`readUnpaidInvoices`).

**Les fonctions.** Les mêmes sources donnent trois règles : une fonction doit être **petite**, **ne faire qu'une chose** et rester à **un seul niveau d'abstraction** (on ne mélange pas, dans la même fonction, une décision métier et le détail d'un calcul bas niveau). L'avertissement du livre sur les effets de bord vaut la peine d'être retenu : une fonction qui promet de « calculer » mais modifie aussi une base de données ment par son nom. Un **effet de bord** est une modification de l'état extérieur à la fonction (écriture en base, changement d'une variable globale, envoi d'e-mail).

Ces règles sont des guides, pas des lois. Le PEP 8 le rappelle lui-même dans sa section sur la cohérence : il faut savoir ignorer une règle quand l'appliquer rendrait le code moins lisible, ou quand le code existant autour suit une autre convention.

## Mise en place pas à pas

Le code ci-dessous a été compilé et exécuté avec un JDK 21 : les deux versions renvoient le même résultat (2865 centimes). On manipule des montants en centimes (entiers) plutôt qu'en nombres décimaux, pour éviter les erreurs d'arrondi.

### Étape 0 : la fonction illisible

```java
static long calc(List<long[]> l, String t, boolean f) {
    long r = 0;
    if (l != null) {
        if (!l.isEmpty()) {
            for (long[] o : l) {
                r += o[0] * o[1];
            }
            if (t.equals("S")) {
                r = r * 95 / 100;
            }
            if (f) {
                r += 490;
            }
            return r;
        } else {
            return 0;
        }
    } else {
        return 0;
    }
}
```

Problèmes : noms d'une lettre, le tableau `o[0] * o[1]` ne dit pas que c'est « prix unitaire fois quantité », `"S"` et `490` sont des valeurs magiques (on ne sait pas que `"S"` veut dire étudiant), le paramètre booléen `f` est opaque à l'appel (`calc(lignes, "S", true)`), et l'imbrication des `if` pousse le cas normal tout à droite.

### Étape 1 : des noms qui disent la vérité

On remplace les tableaux par un type explicite, les chaînes par une énumération, et les nombres par des constantes nommées.

```java
enum CustomerType { STANDARD, STUDENT }

record OrderLine(long unitPriceCents, int quantity) {
    long totalCents() {
        return unitPriceCents * quantity;
    }
}
```

### Étape 2 : des clauses de garde au lieu de l'imbrication

Une **clause de garde** est un test placé tout en haut de la fonction, qui traite un cas particulier et sort aussitôt (`return` ou exception). La documentation de refactoring de *Refactoring.Guru* décrit ce remaniement comme une façon de remplacer des conditions imbriquées par une liste plate de tests, le cas normal arrivant en dernier. Elle recommande aussi, avant de réordonner, de s'assurer qu'il n'y a pas d'effets de bord et de relancer les tests ensuite.

### Étape 3 : petites fonctions, un niveau d'abstraction

```java
static final class PriceCalculator {
    private static final long SHIPPING_FEE_CENTS = 490;
    private static final long STUDENT_PERCENT_TO_PAY = 95;

    long totalToPayCents(List<OrderLine> lines,
                         CustomerType customerType,
                         boolean shippingIncluded) {
        if (lines == null || lines.isEmpty()) {
            return 0;
        }
        long afterDiscount = applyDiscount(subtotalCents(lines), customerType);
        return shippingIncluded ? afterDiscount + SHIPPING_FEE_CENTS : afterDiscount;
    }

    private long subtotalCents(List<OrderLine> lines) {
        return lines.stream().mapToLong(OrderLine::totalCents).sum();
    }

    private long applyDiscount(long amountCents, CustomerType customerType) {
        return customerType == CustomerType.STUDENT
                ? amountCents * STUDENT_PERCENT_TO_PAY / 100
                : amountCents;
    }
}
```

Lisez `totalToPayCents` à voix haute : « s'il n'y a pas de lignes, zéro ; sinon, sous-total, remise, puis frais de port éventuels ». Chaque étape a sa petite fonction, avec un nom qui sert de commentaire. Le paramètre booléen reste ici (`shippingIncluded`), mais il est nommé comme une question, ce qui rend l'appel plus clair. Pour aller plus loin, on pourrait le remplacer par deux méthodes distinctes : un booléen en paramètre indique souvent qu'une fonction fait deux choses.

### Étape 4 : suivre les conventions du langage

Chaque langage a ses conventions de casse, et il vaut mieux les respecter plutôt que d'inventer les siennes. D'après les guides officiels consultés :

| Élément | Python (PEP 8) | Java (Google Java Style) |
|---|---|---|
| Fonction, méthode | `lower_case_with_underscores` | `lowerCamelCase`, souvent un verbe |
| Variable | `lower_case_with_underscores` | `lowerCamelCase` |
| Classe | `CapWords` | `UpperCamelCase`, souvent un nom |
| Constante | `UPPER_CASE_WITH_UNDERSCORES` | `UPPER_SNAKE_CASE` |
| Paquet / module | minuscules, courts | minuscules, sans underscore |

```python
MAX_LOGIN_ATTEMPTS = 3

class InvoiceReader:
    def __init__(self, folder_path):
        self.folder_path = folder_path

    def read_unpaid_invoices(self):
        return [f"{self.folder_path}/inv-001.csv"]
```

Le PEP 8 déconseille aussi d'utiliser les lettres `l` (L minuscule), `O` et `I` comme noms d'une seule lettre, car elles ressemblent aux chiffres un et zéro dans certaines polices. Côté Java, le guide de Google précise que les acronymes se traitent comme des mots : on écrit `newCustomerId` plutôt que `newCustomerID`. Les équipes importent souvent ces règles via un outil automatique (formateur, linter) pour ne plus en débattre en revue de code.

## Bonnes pratiques et pièges courants

- **Nommer d'abord, abréger jamais par paresse.** Les outils d'autocomplétion rendent les noms longs gratuits à taper ; seul le lecteur paie un nom cryptique.
- **Un nom long n'est pas forcément un bon nom.** `calculateTotalAmountOfAllOrderLinesIncludingDiscount` signale souvent une fonction qui fait trop. Si le nom est difficile à choisir, c'est un indice de plus qu'il faut découper.
- **Garder la même langue et le même vocabulaire.** Choisissez `fetch`, `get` ou `load` et tenez-vous-y dans tout le projet. Mélanger français et anglais dans les identifiants est un piège classique en équipe.
- **Limiter les paramètres.** Au-delà de trois ou quatre, regroupez-les dans un objet (comme `OrderLine` plus haut).
- **Éviter les effets de bord cachés.** Une fonction nommée comme une requête (`isValid`, `totalToPay`) ne doit pas modifier l'état.
- **Les commentaires ne remplacent pas un bon nom.** Réservez-les à l'intention, au « pourquoi » (une contrainte légale, un choix non évident), pas au « quoi » que le code dit déjà.
- **Ne pas dogmatiser.** Les critiques du livre, y compris celle d'InfoQ, restent nuancées : les règles sont des repères utiles pour un débutant, à appliquer avec jugement. Un découpage excessif en fonctions de deux lignes peut aussi nuire à la lecture. Refactorez toujours avec des tests qui passent avant et après.

## En entretien

- **« Qu'est-ce que le clean code pour vous ? »** « C'est du code qu'un autre développeur comprend sans explication : des noms qui disent le métier, des fonctions courtes qui font une seule chose, peu d'imbrication. Je m'appuie sur les conventions officielles du langage, PEP 8 en Python ou le guide de style choisi par l'équipe en Java. »
- **« Comment savez-vous qu'une fonction est trop longue ? »** « Quand je ne peux pas la résumer en une phrase sans dire "et", quand elle mélange plusieurs niveaux de détail, ou quand je dois faire défiler pour la lire. Je l'extrais alors en petites fonctions bien nommées, en gardant les tests au vert. »
- **« Un exemple de refactoring simple ? »** « Remplacer des `if` imbriqués par des clauses de garde, des chaînes magiques par une énumération, et un booléen opaque par un paramètre ou une méthode bien nommée. »

## Mini-exercice

Prenez une fonction de 20 à 40 lignes de l'un de vos projets (ou de vos TP) et améliorez-la en 15 minutes :

1. Écrivez ou vérifiez un test qui capture son comportement actuel.
2. Renommez chaque variable et paramètre d'une lettre ou ambigu (`l`, `t`, `data`, `flag`).
3. Remplacez deux valeurs magiques (chaîne ou nombre) par une constante ou une énumération.
4. Aplatissez les `if` imbriqués avec des clauses de garde.
5. Extrayez au moins une portion de code dans une fonction dont le nom explique ce qu'elle fait, puis relancez le test.

Bonus : lancez le linter de votre langage (par exemple `flake8` ou `pylint` pour Python) et corrigez les remarques de nommage.

## Sources

- [PEP 8, guide de style pour le code Python (peps.python.org)](https://peps.python.org/pep-0008/)
- [Google Java Style Guide, section 5 Naming](https://google.github.io/styleguide/javaguide.html)
- [Replace Nested Conditional with Guard Clauses, Refactoring.Guru](https://refactoring.guru/replace-nested-conditional-with-guard-clauses)
- [Clean Code, 2nd Edition, Robert C. Martin, Pearson / Addison-Wesley (2025)](https://www.pearson.com/en-us/subject-catalog/p/clean-code-a-handbook-of-agile-software-craftsmanship-2nd-edition/P200000013239/9780135398548)
- [Clean Code, 1st edition, Pearson (2008)](https://www.pearson.com/en-us/subject-catalog/p/clean-code/P200000009088/9780132350884)
- [Compte rendu du livre Clean Code, Ryan Cooper, InfoQ, 8 avril 2009](https://www.infoq.com/articles/clean-code-book-review)
