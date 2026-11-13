// Générateur statique du journal : entries/*.md -> dist/
import { readFile, writeFile, mkdir, readdir, rm, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, 'dist');
const BASE = (process.env.BASE || '/').replace(/\/*$/, '/');
const SITE_URL = (process.env.SITE_URL || '').replace(/\/+$/, '');
const SITE_TITLE = 'Journal tech';
const SITE_DESC =
  'Une leçon par jour : frameworks, bonnes pratiques, DevOps, IA, cybersécurité, législation des données et système d’information.';
const NBSP = ' ';

// ---------- typographie française ----------
const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const slugify = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Apostrophes et guillemets typographiques, espaces insécables avant : ; ! ? »
// Appliqué au texte seulement : jamais dans <pre>, <code> ni dans les balises.
function frenchTypo(html) {
  const parts = html.split(/(<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>|<[^>]+>)/g);
  let prev = ' ';
  return parts
    .map((p) => {
      if (!p) return p;
      if (p.startsWith('<pre') || p.startsWith('<code')) { prev = 'x'; return p; }
      if (p.startsWith('<')) {
        if (/^<\/?(p|li|h[1-6]|blockquote|td|th|br|ul|ol|tr)\b/.test(p)) prev = ' ';
        return p;
      }
      const src = p.replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"');
      let out = '';
      for (const c of src) {
        if (c === "'") out += '’';
        else if (c === '"') out += /[\s([{«]/.test(prev) ? `«${NBSP}` : `${NBSP}»`;
        else out += c;
        prev = out[out.length - 1] || prev;
      }
      return out.replace(/\s+([:;!?»])/g, `${NBSP}$1`).replace(/«\s+/g, `«${NBSP}`);
    })
    .join('');
}
const fx = (s = '') => frenchTypo(esc(s)); // texte brut -> HTML typographié

const fmtDate = (d) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString('fr-FR', { dateStyle: 'full', timeZone: 'UTC' });
const fmtMonth = (d) => {
  const m = new Date(`${d}T12:00:00Z`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return m.charAt(0).toUpperCase() + m.slice(1);
};
const fmtShort = (d) => `${d.slice(8)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
const fmtDayMonth = (d) => `${d.slice(8)}/${d.slice(5, 7)}`;
const WEEKDAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const plural = (n, w) => `${n}${NBSP}${w}${n > 1 ? 's' : ''}`;

// ---------- lecture des données ----------
const tracks = JSON.parse(await readFile(path.join(ROOT, 'tracks.json'), 'utf8'));
const trackBySlug = Object.fromEntries(tracks.map((t) => [t.slug, t]));
const rotation = [1, 2, 3, 4, 5, 6, 0]
  .map((d) => tracks.find((t) => t.weekday === d))
  .filter(Boolean);

function parseFrontMatter(raw, file) {
  const m = raw.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`${file} : front matter manquant (bloc --- en tête de fichier)`);
  const meta = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i < 1) continue;
    meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return { meta, body: m[2].trim() };
}

function makeMarked() {
  const toc = [];
  const used = new Set();
  const marked = new Marked(
    markedHighlight({
      emptyLangClass: 'hljs',
      langPrefix: 'hljs language-',
      highlight(code, lang) {
        const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
      },
    }),
    {
      renderer: {
        heading({ tokens, depth }) {
          const html = this.parser.parseInline(tokens);
          const plain = html.replace(/<[^>]+>/g, '');
          const base = slugify(plain) || 'section';
          let id = base;
          let n = 2;
          while (used.has(id)) id = `${base}-${n++}`;
          used.add(id);
          if (depth === 2) toc.push({ id, text: frenchTypo(plain) });
          return `<h${depth} id="${id}">${html}</h${depth}>\n`;
        },
      },
    },
  );
  return { marked, toc };
}

const files = (await readdir(path.join(ROOT, 'entries'))).filter((f) => f.endsWith('.md')).sort();
const entries = [];
for (const file of files) {
  const raw = await readFile(path.join(ROOT, 'entries', file), 'utf8');
  const { meta, body } = parseFrontMatter(raw, file);
  for (const k of ['title', 'date', 'track', 'summary']) {
    if (!meta[k]) throw new Error(`${file} : champ obligatoire manquant « ${k} »`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date)) throw new Error(`${file} : date invalide (attendu AAAA-MM-JJ)`);
  if (!trackBySlug[meta.track]) throw new Error(`${file} : parcours inconnu « ${meta.track} » (voir tracks.json)`);
  const { marked, toc } = makeMarked();
  const html = frenchTypo(marked.parse(body));
  const words = body.split(/\s+/).length;
  entries.push({
    ...meta,
    slug: file.replace(/\.md$/, ''),
    track: trackBySlug[meta.track],
    reading: Number(meta.reading) || Math.max(1, Math.round(words / 200)),
    html,
    toc,
  });
}
entries.sort((a, b) => (a.date === b.date ? b.slug.localeCompare(a.slug) : b.date.localeCompare(a.date)));

// ---------- gabarits ----------
const url = (p = '') => `${BASE}${p}`;
const entryUrl = (e) => url(`entries/${e.slug}/`);
const countFor = (t) => entries.filter((e) => e.track.slug === t.slug).length;
const minutes = (e) => `${e.reading}${NBSP}min`;

function layout({ title, desc = SITE_DESC, body, active = '' }) {
  const link = (href, label, key) =>
    `<a href="${url(href)}"${active === key ? ' aria-current="page"' : ''}>${label}</a>`;
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${fx(title)}</title>
<meta name="description" content="${fx(desc)}">
<link rel="stylesheet" href="${url('assets/style.css')}">
<link rel="alternate" type="application/rss+xml" title="${SITE_TITLE}" href="${url('feed.xml')}">
</head>
<body>
<a class="skip" href="#main">Aller au contenu</a>
<header class="masthead"><div class="container bar">
<a class="wordmark" href="${url()}" aria-label="${SITE_TITLE}, accueil">${SITE_TITLE}</a>
<nav aria-label="Navigation principale">${link('archive/', 'Archive', 'archive')}${link('parcours/', 'Parcours', 'tracks')}<a href="${url('feed.xml')}">Flux RSS</a></nav>
</div></header>
<main id="main">
${body}
</main>
<footer class="colophon"><div class="container">
<p>${SITE_TITLE}. Une leçon par jour, rédigée et archivée automatiquement.</p>
<p><a href="${url('archive/')}">Archive</a> <a href="${url('parcours/')}">Parcours</a> <a href="${url('feed.xml')}">Flux RSS</a></p>
</div></footer>
</body>
</html>
`;
}

// ligne d'index : date, parcours, titre (lien sur toute la ligne), durée
const row = (e, { short = false } = {}) => `<li data-track="${e.track.slug}" data-text="${esc(`${e.title} ${e.summary} ${e.topic || ''} ${e.track.label}`.toLowerCase())}">
<time class="num" datetime="${e.date}">${short ? fmtDayMonth(e.date) : fmtShort(e.date)}</time>
<span class="where">${fx(e.track.label)}</span>
<a class="what" href="${entryUrl(e)}">${fx(e.title)}</a>
<span class="num len">${minutes(e)}</span>
</li>`;

const scheduleRows = (tag = 'h3') =>
  rotation
    .map(
      (t) => `<li>
<span class="day">${WEEKDAYS[t.weekday]}</span>
<${tag} class="name"><a href="${url(`parcours/${t.slug}/`)}">${fx(t.label)}</a></${tag}>
<p class="desc">${fx(t.desc)}</p>
<span class="num count">${countFor(t)}</span>
</li>`,
    )
    .join('\n');

// ---------- pages ----------
const pages = [];
const add = (p, html) => pages.push([p, html]);

// Accueil
{
  const [latest, ...rest] = entries;
  const toc = latest
    ? latest.toc
        .slice(0, 6)
        .map((h) => `<li><a href="${entryUrl(latest)}#${h.id}">${h.text}</a></li>`)
        .join('')
    : '';
  const sheet = latest
    ? `<article class="sheet lead-lesson">
<p class="stamp"><time datetime="${latest.date}">${fmtDate(latest.date)}</time><span>${fx(latest.track.label)}</span><span class="num">${minutes(latest)}</span></p>
<h2><a href="${entryUrl(latest)}">${fx(latest.title)}</a></h2>
<p class="summary">${fx(latest.summary)}</p>
${toc ? `<ol class="contents" aria-label="Sommaire de la leçon">${toc}</ol>` : ''}
</article>`
    : `<article class="sheet lead-lesson"><h2>La première leçon arrive demain matin.</h2></article>`;
  const body = `<section class="hero"><div class="container hero-grid">
<div class="hero-text">
<h1>Une leçon par jour.</h1>
<div class="hero-foot">
<p class="lead">Environ dix minutes de lecture, sept parcours, toute l’archive.</p>
<p class="actions"><a class="btn btn--primary" href="${latest ? entryUrl(latest) : url('archive/')}">Lire la dernière leçon</a><a class="btn" href="${url('archive/')}">Ouvrir l’archive</a></p>
</div>
</div>
${sheet}
</div></section>

<section class="block"><div class="container split">
<div class="split-head"><h2>Les précédentes</h2></div>
<div class="split-body">${
    rest.length
      ? `<ul class="index">${rest.slice(0, 8).map((e) => row(e)).join('')}</ul>
<p class="more"><a href="${url('archive/')}">Toute l’archive, ${plural(entries.length, 'leçon')}</a></p>`
      : '<p class="empty">La prochaine leçon arrive demain matin.</p>'
  }</div>
</div></section>

<section class="block"><div class="container">
<div class="block-head"><h2>Sept parcours, un par jour</h2></div>
<ol class="schedule">
${scheduleRows()}
</ol>
</div></section>

<section class="band band--ink"><div class="container split">
<div class="split-head"><h2>Toujours le même plan</h2></div>
<ol class="parts">
<li><h3>Pourquoi c’est important</h3><p>Le problème que le sujet résout.</p></li>
<li><h3>Comment ça marche</h3><p>Le modèle mental, avec un schéma.</p></li>
<li><h3>Mise en place</h3><p>Commandes et code, version indiquée.</p></li>
<li><h3>Bonnes pratiques</h3><p>Les pièges courants à éviter.</p></li>
<li><h3>En entretien</h3><p>Ce que vous pouvez répondre en alternance.</p></li>
<li><h3>Mini-exercice</h3><p>Quinze minutes pour vous entraîner.</p></li>
<li><h3>Sources</h3><p>La documentation officielle.</p></li>
</ol>
</div></section>`;
  add('index.html', layout({ title: `${SITE_TITLE} : une leçon par jour`, body, active: 'home' }));
}

// Archive (groupée par mois, avec filtre)
{
  const groups = new Map();
  for (const e of entries) {
    const k = fmtMonth(e.date);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(e);
  }
  const body = `<section class="page-head"><div class="container">
<h1>Archive</h1>
<p class="lead">${plural(entries.length, 'leçon')}, de la plus récente à la plus ancienne.</p>
</div></section>
<section class="block block--tight"><div class="container">
<div class="filters">
<label class="visually-hidden" for="q">Rechercher une leçon</label>
<input id="q" type="search" placeholder="Rechercher : docker, rgpd, spring" autocomplete="off">
<div class="chips" id="chips" role="group" aria-label="Filtrer par parcours">
<button type="button" data-track="" aria-pressed="true">Tout</button>
${tracks
  .filter((t) => countFor(t))
  .map((t) => `<button type="button" data-track="${t.slug}" aria-pressed="false">${fx(t.label)}</button>`)
  .join('\n')}
</div>
</div>
<div id="list">
${[...groups]
  .map(
    ([month, list]) =>
      `<section class="month split"><div class="split-head"><h2>${esc(month)}</h2></div><ul class="index split-body">${list.map((e) => row(e, { short: true })).join('')}</ul></section>`,
  )
  .join('\n')}
</div>
<p id="empty" class="empty" hidden>Aucune leçon ne correspond.</p>
</div></section>
<script>
(() => {
  const q = document.getElementById('q'), chips = document.getElementById('chips');
  const items = [...document.querySelectorAll('#list li')], months = [...document.querySelectorAll('.month')];
  let track = '';
  function apply() {
    const term = q.value.trim().toLowerCase();
    items.forEach((li) => {
      li.hidden = !((!track || li.dataset.track === track) && (!term || li.dataset.text.includes(term)));
    });
    months.forEach((m) => { m.hidden = ![...m.querySelectorAll('li')].some((li) => !li.hidden); });
    document.getElementById('empty').hidden = items.some((li) => !li.hidden);
  }
  q.addEventListener('input', apply);
  chips.addEventListener('click', (ev) => {
    const b = ev.target.closest('button'); if (!b) return;
    track = b.dataset.track;
    chips.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    apply();
  });
})();
</script>`;
  add('archive/index.html', layout({ title: `Archive | ${SITE_TITLE}`, desc: 'Toutes les leçons du journal, par mois, avec recherche et filtre par parcours.', body, active: 'archive' }));
}

// Parcours
{
  const body = `<section class="page-head"><div class="container">
<h1>Parcours</h1>
<p class="lead">Un parcours par jour de la semaine, dans cet ordre.</p>
</div></section>
<section class="block block--tight"><div class="container">
<ol class="schedule">
${scheduleRows('h2')}
</ol>
</div></section>`;
  add('parcours/index.html', layout({ title: `Parcours | ${SITE_TITLE}`, desc: 'Les sept parcours du journal et leur jour de publication.', body, active: 'tracks' }));

  for (const t of tracks) {
    const list = entries.filter((e) => e.track.slug === t.slug);
    const when = t.weekday === null || t.weekday === undefined ? 'Hors rotation' : `Chaque ${WEEKDAYS[t.weekday].toLowerCase()}`;
    const b = `<section class="page-head"><div class="container">
<p class="crumb"><a href="${url('parcours/')}">Tous les parcours</a></p>
<h1>${fx(t.label)}</h1>
<p class="lead">${fx(t.desc)}</p>
<dl class="facts"><div><dt>Publication</dt><dd>${when}</dd></div><div><dt>Leçons</dt><dd class="num">${list.length}</dd></div></dl>
</div></section>
<section class="block block--tight"><div class="container">
${list.length ? `<ul class="index">${list.map((e) => row(e)).join('')}</ul>` : '<p class="empty">Pas encore de leçon dans ce parcours.</p>'}
</div></section>`;
    add(`parcours/${t.slug}/index.html`, layout({ title: `${t.label} | ${SITE_TITLE}`, desc: t.desc, body: b, active: 'tracks' }));
  }
}

// Leçons
entries.forEach((e, i) => {
  const newer = entries[i - 1];
  const older = entries[i + 1];
  const toc = e.toc.length
    ? `<aside class="toc"><nav aria-label="Sommaire"><p class="toc-title">Sommaire</p><ol>${e.toc
        .map((h) => `<li><a href="#${h.id}">${h.text}</a></li>`)
        .join('')}</ol></nav></aside>`
    : '<aside class="toc"></aside>';
  const body = `<article class="entry">
<header class="entry-head"><div class="container">
<p class="crumb"><a href="${url('archive/')}">Archive</a></p>
<h1>${fx(e.title)}</h1>
<p class="lead">${fx(e.summary)}</p>
<dl class="facts">
<div><dt>Date</dt><dd><time datetime="${e.date}">${fmtDate(e.date)}</time></dd></div>
<div><dt>Parcours</dt><dd><a href="${url(`parcours/${e.track.slug}/`)}">${fx(e.track.label)}</a></dd></div>
<div><dt>Lecture</dt><dd class="num">${minutes(e)}</dd></div>${e.level ? `\n<div><dt>Niveau</dt><dd>${fx(e.level)}</dd></div>` : ''}
</dl>
</div></header>
<div class="container entry-grid">
${toc}
<div class="prose">${e.html}</div>
</div>
<nav class="container pager" aria-label="Autres leçons">
${older ? `<a rel="prev" href="${entryUrl(older)}"><span>Leçon précédente</span><strong>${fx(older.title)}</strong></a>` : '<span></span>'}
${newer ? `<a rel="next" href="${entryUrl(newer)}"><span>Leçon suivante</span><strong>${fx(newer.title)}</strong></a>` : '<span></span>'}
</nav>
</article>`;
  add(`entries/${e.slug}/index.html`, layout({ title: `${e.title} | ${SITE_TITLE}`, desc: e.summary, body }));
});

// 404
add(
  '404.html',
  layout({
    title: `Page introuvable | ${SITE_TITLE}`,
    body: `<section class="page-head"><div class="container"><h1>Page introuvable.</h1><p class="lead">Cette adresse ne mène à aucune leçon.</p><p class="actions"><a class="btn btn--primary" href="${url()}">Retour à l’accueil</a></p></div></section>`,
  }),
);

// Flux RSS
{
  const items = entries
    .slice(0, 30)
    .map((e) => {
      const link = `${SITE_URL}${entryUrl(e)}`;
      return `<item><title>${esc(e.title)}</title><link>${esc(link)}</link><guid isPermaLink="true">${esc(link)}</guid><pubDate>${new Date(`${e.date}T06:00:00Z`).toUTCString()}</pubDate><category>${esc(e.track.label)}</category><description>${esc(e.summary)}</description></item>`;
    })
    .join('\n');
  add(
    'feed.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>${SITE_TITLE}</title><link>${esc(`${SITE_URL}${url()}`)}</link><description>${esc(SITE_DESC)}</description><language>fr</language>
${items}
</channel></rss>
`,
  );
}

// ---------- écriture ----------
await rm(OUT, { recursive: true, force: true });
for (const [p, html] of pages) {
  const target = path.join(OUT, p);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, html);
}
await mkdir(path.join(OUT, 'assets/fonts'), { recursive: true });
for (const f of ['style.css', 'tokens.css', 'base.css', 'fonts.css']) {
  await copyFile(path.join(ROOT, f), path.join(OUT, 'assets', f));
}
const fontFiles = [
  ['@fontsource-variable/hanken-grotesk/files/hanken-grotesk-latin-wght-normal.woff2'],
  ['@fontsource-variable/newsreader/files/newsreader-latin-wght-normal.woff2'],
  ['@fontsource-variable/newsreader/files/newsreader-latin-wght-italic.woff2'],
  ['@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2'],
  ['@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2'],
];
for (const [f] of fontFiles) {
  await copyFile(path.join(ROOT, 'node_modules', f), path.join(OUT, 'assets/fonts', path.basename(f)));
}
await writeFile(path.join(OUT, '.nojekyll'), '');

console.log(`OK : ${entries.length} leçon(s), ${pages.length} pages -> dist/ (BASE=${BASE})`);
