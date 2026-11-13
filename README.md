# Journal tech

Une leçon par jour (frameworks, bonnes pratiques, DevOps, IA, cybersécurité, législation des données, SI), publiée en site statique avec archive, recherche, parcours et flux RSS.

## Fonctionnement

- Les leçons sont des fichiers Markdown dans `entries/` (une par jour).
- `node build.mjs` génère le site dans `dist/` (sans framework, seulement `marked` et `highlight.js`).
- À chaque `push` sur `main`, GitHub Actions (`.github/workflows/pages.yml`) régénère et publie le site sur GitHub Pages.
- Une tâche planifiée Claude écrit la leçon du jour et la pousse chaque matin.
- L'archive, c'est l'historique complet : toutes les leçons restent dans `entries/` et dans l'historique Git.

## Personnaliser

- `JOURNAL.md` : style, structure et règles de qualité des leçons, rotation hebdomadaire.
- `curriculum.md` : liste des sujets par parcours.
- `tracks.json` : parcours, couleurs, jour de la semaine associé.

## En local

```bash
npm install
npm run build      # génère dist/
npm run preview    # build + serveur local
```
