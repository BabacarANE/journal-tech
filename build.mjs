// Générateur statique du journal : entries/*.md -> dist/
import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
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
  'Une leçon par jour : frameworks, bonnes pratiques, DevOps, IA, cybersécurité, législation des données et système d\'information.';

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const slugify = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const fmtDate = (d) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString('fr-FR', { dateStyle: 'full', timeZone: 'UTC' });
const fmtMonth = (d) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

// ---------- lecture des données ----------
const tracks = JSON.parse(await readFile(path.join(ROOT, 'tracks.json'), 'utf8'));
const trackBySlug = Object.fromEntries(tracks.map((t) => [t.slug, t]));

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
          if (depth === 2) toc.push({ id, text: plain });
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
  const html = marked.parse(body);
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

function layout({ title, desc = SITE_DESC, body, active = '' }) {
  const nav = [
    ['', 'Accueil', 'home'],
    ['archive/', 'Archive', 'archive'],
    ['parcours/', 'Parcours', 'tracks'],
  ]
    .map(([href, label, key]) => `<a href="${url(href)}"${active === key ? ' aria-current="page"' : ''}>${label}</a>`)
    .join('');
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="stylesheet" href="${url('assets/style.css')}">
<link rel="stylesheet" href="${url('assets/hljs.css')}">
<link rel="alternate" type="application/rss+xml" title="${SITE_TITLE}" href="${url('feed.xml')}">
</head>
<body>
<header class="top"><div class="wrap">
<a class="brand" href="${url()}">${SITE_TITLE}</a>
<nav>${nav}<a href="${url('feed.xml')}">RSS</a></nav>
</div></header>
<main class="wrap">
${body}
</main>
<footer class="wrap foot">Une leçon par jour, générée et archivée automatiquement.</footer>
</body>
</html>
`;
}

const badge = (t) => `<a class="badge" style="--c:${t.color}" href="${url(`parcours/${t.slug}/`)}">${esc(t.label)}</a>`;

const card = (e) => `<article class="card">
<div class="meta">${badge(e.track)}<time datetime="${e.date}">${fmtDate(e.date)}</time><span>${e.reading} min</span></div>
<h3><a href="${entryUrl(e)}">${esc(e.title)}</a></h3>
<p>${esc(e.summary)}</p>
</article>`;

const row = (e) => `<li data-track="${e.track.slug}" data-text="${esc(`${e.title} ${e.summary} ${e.topic || ''} ${e.track.label}`.toLowerCase())}">
<time datetime="${e.date}">${e.date.slice(8)}/${e.date.slice(5, 7)}</time>
${badge(e.track)}
<a href="${entryUrl(e)}">${esc(e.title)}</a>
</li>`;

// ---------- pages ----------
const pages = [];
const add = (p, html) => pages.push([p, html]);

// Accueil
{
  const [latest, ...rest] = entries;
  const counts = tracks
    .map((t) => ({ t, n: entries.filter((e) => e.track.slug === t.slug).length }))
    .filter((x) => x.n > 0);
  const body = `<section class="hero">
<h1>Une leçon par jour</h1>
<p>${esc(SITE_DESC)}</p>
</section>
${
  latest
    ? `<h2 class="section">Dernière leçon</h2>
<div class="featured">${card(latest)}</div>
<h2 class="section">Les précédentes</h2>
<div class="cards">${rest.slice(0, 6).map(card).join('') || '<p class="muted">La prochaine leçon arrive demain matin.</p>'}</div>
<p><a href="${url('archive/')}">Voir toute l'archive (${entries.length} leçons) →</a></p>`
    : '<p class="muted">Aucune leçon pour le moment.</p>'
}
<h2 class="section">Parcours</h2>
<div class="tracks">${counts
    .map(
      ({ t, n }) =>
        `<a class="track" style="--c:${t.color}" href="${url(`parcours/${t.slug}/`)}"><strong>${esc(t.label)}</strong><span>${n} leçon${n > 1 ? 's' : ''}</span></a>`,
    )
    .join('')}</div>`;
  add('index.html', layout({ title: `${SITE_TITLE} — une leçon par jour`, body, active: 'home' }));
}

// Archive (groupée par mois, avec filtre)
{
  const groups = new Map();
  for (const e of entries) {
    const k = fmtMonth(e.date);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(e);
  }
  const body = `<h1>Archive</h1>
<p class="muted">${entries.length} leçon${entries.length > 1 ? 's' : ''}, de la plus récente à la plus ancienne.</p>
<div class="filters">
<input id="q" type="search" placeholder="Rechercher une leçon (ex. docker, rgpd, spring)…" aria-label="Rechercher">
<div class="chips" id="chips">
<button type="button" data-track="" aria-pressed="true">Tout</button>
${tracks
  .filter((t) => entries.some((e) => e.track.slug === t.slug))
  .map((t) => `<button type="button" data-track="${t.slug}" aria-pressed="false">${esc(t.label)}</button>`)
  .join('')}
</div>
</div>
<div id="list">
${[...groups]
  .map(([month, list]) => `<section class="month"><h2>${esc(month)}</h2><ul class="rows">${list.map(row).join('')}</ul></section>`)
  .join('\n')}
</div>
<p id="empty" class="muted" hidden>Aucune leçon ne correspond.</p>
<script>
(() => {
  const q = document.getElementById('q'), chips = document.getElementById('chips');
  const items = [...document.querySelectorAll('#list li')], months = [...document.querySelectorAll('.month')];
  let track = '';
  function apply() {
    const term = q.value.trim().toLowerCase();
    items.forEach((li) => {
      const ok = (!track || li.dataset.track === track) && (!term || li.dataset.text.includes(term));
      li.hidden = !ok;
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
  add('archive/index.html', layout({ title: `Archive — ${SITE_TITLE}`, body, active: 'archive' }));
}

// Parcours
{
  const body = `<h1>Parcours</h1>
<p class="muted">Un parcours par jour de la semaine : la leçon du jour suit la rotation ci-dessous.</p>
<div class="tracks big">${tracks
    .map((t) => {
      const n = entries.filter((e) => e.track.slug === t.slug).length;
      return `<a class="track" style="--c:${t.color}" href="${url(`parcours/${t.slug}/`)}"><strong>${esc(t.label)}</strong><span>${esc(t.desc)}</span><em>${n} leçon${n > 1 ? 's' : ''}</em></a>`;
    })
    .join('')}</div>`;
  add('parcours/index.html', layout({ title: `Parcours — ${SITE_TITLE}`, body, active: 'tracks' }));

  for (const t of tracks) {
    const list = entries.filter((e) => e.track.slug === t.slug);
    const b = `<p><a href="${url('parcours/')}">← Tous les parcours</a></p>
<h1>${esc(t.label)}</h1>
<p class="muted">${esc(t.desc)}</p>
${list.length ? `<ul class="rows">${list.map(row).join('')}</ul>` : '<p class="muted">Pas encore de leçon dans ce parcours.</p>'}`;
    add(`parcours/${t.slug}/index.html`, layout({ title: `${t.label} — ${SITE_TITLE}`, body: b, active: 'tracks' }));
  }
}

// Leçons
entries.forEach((e, i) => {
  const newer = entries[i - 1];
  const older = entries[i + 1];
  const toc =
    e.toc.length >= 3
      ? `<nav class="toc" aria-label="Sommaire"><strong>Sommaire</strong><ol>${e.toc
          .map((h) => `<li><a href="#${h.id}">${h.text}</a></li>`)
          .join('')}</ol></nav>`
      : '';
  const body = `<article class="entry">
<p class="crumb"><a href="${url('archive/')}">← Archive</a></p>
<div class="meta">${badge(e.track)}<time datetime="${e.date}">${fmtDate(e.date)}</time><span>${e.reading} min de lecture</span>${e.level ? `<span>${esc(e.level)}</span>` : ''}</div>
<h1>${esc(e.title)}</h1>
<p class="lede">${esc(e.summary)}</p>
${toc}
<div class="prose">${e.html}</div>
<nav class="pager">
${older ? `<a rel="prev" href="${entryUrl(older)}"><small>Leçon précédente</small>${esc(older.title)}</a>` : '<span></span>'}
${newer ? `<a rel="next" href="${entryUrl(newer)}"><small>Leçon suivante</small>${esc(newer.title)}</a>` : '<span></span>'}
</nav>
</article>`;
  add(`entries/${e.slug}/index.html`, layout({ title: `${e.title} — ${SITE_TITLE}`, desc: e.summary, body }));
});

// 404
add(
  '404.html',
  layout({
    title: `Page introuvable — ${SITE_TITLE}`,
    body: `<h1>Page introuvable</h1><p><a href="${url()}">Retour à l'accueil</a></p>`,
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
await mkdir(path.join(OUT, 'assets'), { recursive: true });
await writeFile(path.join(OUT, 'assets/style.css'), await readFile(path.join(ROOT, 'style.css')));
const hl = (f) => readFile(path.join(ROOT, 'node_modules/highlight.js/styles', f), 'utf8');
await writeFile(
  path.join(OUT, 'assets/hljs.css'),
  `@media (prefers-color-scheme: light){${await hl('github.css')}}\n@media (prefers-color-scheme: dark){${await hl('github-dark.css')}}\n`,
);
await writeFile(path.join(OUT, '.nojekyll'), '');

console.log(`OK : ${entries.length} leçon(s), ${pages.length} pages -> dist/ (BASE=${BASE})`);
