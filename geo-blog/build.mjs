// Build the bilingual GEO blog:
//   geo-content/*.md        -> dist/<slug>.html            (lang=en)
//   geo-content/zh/*.zh.md  -> dist/zh/<slug>.zh.html      (lang=zh-Hans)
// Each article gets Article + FAQPage JSON-LD, a language switcher (paired by
// basename), server-rendered TOC + related posts, tag pages, a search index,
// a Giscus comments container and a newsletter form.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, statSync } from 'node:fs'
import { join, dirname, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { marked } from 'marked'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SRC_EN = join(__dirname, '..', 'geo-content')
const SRC_ZH = join(__dirname, '..', 'geo-content', 'zh')
const OUT = join(__dirname, 'dist')
const SITE_URL = process.env.SITE_URL || 'https://gridlens-geo-blog.vercel.app'
const SITE_NAME = 'GridLens Blog'
const PUBLISH_DATE = '2026-08-01'

// --- site config (utterances + newsletter). Placeholders until filled by owner. ---
let SITE = { utterances: {}, newsletter: {} }
try { SITE = JSON.parse(readFileSync(join(__dirname, 'site.config.json'), 'utf8')) } catch {}
const G = SITE.utterances || {}
const NL = SITE.newsletter || {}

mkdirSync(join(OUT, 'zh'), { recursive: true })
mkdirSync(join(OUT, 'tags'), { recursive: true })
marked.setOptions({ gfm: true, breaks: false })

// Manual tag map (slug -> tags). Both languages keyed by full slug.
const TAGS = {
  '01-gate-grid-6-months': ['gate', 'case-study'],
  '02-margin-alerts': ['risk', 'margin', 'alerts'],
  '03-drawdown-monitoring': ['risk', 'monitoring', 'drawdown'],
  '04-why-grid-bots-blow-up': ['risk', 'failure'],
  '05-ai-agent-risk': ['risk', 'ai'],
  '06-how-gridlens-works': ['product'],
  '07-leverage-grid': ['risk', 'leverage'],
  '08-balance-guardrail': ['risk', 'guardrail'],
  '09-binance-safety': ['binance', 'safety'],
  '10-bybit-risk': ['bybit', 'risk'],
  '11-grid-out-of-range': ['risk', 'out-of-range'],
  '12-grid-vs-dca': ['compare', 'dca'],
  '13-track-grid-pnl': ['monitoring', 'pnl'],
  '01-gate-grid-6-months.zh': ['gate', 'case-study'],
  '02-margin-alerts.zh': ['risk', 'margin', 'alerts'],
  '03-drawdown-monitoring.zh': ['risk', 'monitoring', 'drawdown'],
  '04-why-grid-bots-blow-up.zh': ['risk', 'failure'],
  '05-ai-agent-risk.zh': ['risk', 'ai'],
  '06-how-gridlens-works.zh': ['product'],
  '07-grid-bot-safe.zh': ['risk', 'safety'],
  '08-gate-grid-liquidation.zh': ['gate', 'risk', 'liquidation'],
}

// ---------- helpers ----------
function extractTitle(md) { const m = md.match(/^#\s+(.+)$/m); return m ? m[1].trim() : 'Untitled' }
function extractFirstPara(md) {
  const lines = md.split('\n'); let started = false
  for (const l of lines) {
    if (/^#\s+/.test(l)) { started = true; continue }
    if (started && l.trim() && !/^#/.test(l) && !/^\[占位/.test(l) && !/^\s*\[/.test(l)) {
      return l.trim().replace(/[*_`]/g, '').slice(0, 180)
    }
  }
  return ''
}
function extractFAQ(md) {
  const idx = md.search(/^##\s*(FAQ|常见问题|问答)\s*$/m); if (idx < 0) return []
  const part = md.slice(idx)
  const re = /\*\*(?:Q|问)[：:]\s*(.+?)\*\*\s*\n\s*(?:A|答)[：:]\s*([\s\S]*?)(?=\n\*\*(?:Q|问)[：:]|$)/g
  const out = []; let m
  while ((m = re.exec(part)) !== null) out.push({ q: m[1].trim(), a: m[2].trim().replace(/\s*\n\s*/g, ' ') })
  return out
}
function baseOf(file) { return file.replace(/^\d{2}-/, '').replace(/\.zh\.md$/, '').replace(/\.md$/, '') }
function slugOf(file) { return file.replace(/\.md$/, '') }
function plainText(md) {
  return md.replace(/```[\s\S]*?```/g, '').replace(/[#>*_`~]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\s+/g, ' ').trim()
}
// Assign ids to h2/h3 and build a TOC list. Returns {html, toc}
function addHeadingIds(html) {
  const toc = []; let n = 0
  const out = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_, lvl, txt) => {
    const id = 'h' + (++n) + '-' + txt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
    toc.push({ level: +lvl, text: txt.replace(/<[^>]+>/g, ''), id })
    return `<h${lvl} id="${id}">${txt}</h${lvl}>`
  })
  return { html: out, toc }
}
function rewriteLinks(html, lang) {
  if (lang === 'zh') {
    html = html.replace(/href="([^"]+?)\.zh\.md"/gi, 'href="$1.zh.html"')
    html = html.replace(/href="([^"]+?)\.md"/gi, 'href="/$1.html"')
  } else {
    html = html.replace(/href="([^"]+?)\.zh\.md"/gi, 'href="/zh/$1.zh.html"')
    html = html.replace(/href="([^"]+?)\.md"/gi, 'href="$1.html"')
  }
  return html
}
function esc(s) { return String(s).replace(/"/g, '&quot;') }

// ---------- CSS ----------
const CSS = `
:root{--bg:#ffffff;--fg:#1a1a1a;--muted:#6b7280;--accent:#0f766e;--border:#e5e7eb;--codebg:#f6f8fa;--card:#ffffff;--chip:#f0fdfa;--chipfg:#0f766e}
*{box-sizing:border-box}
html.dark{--bg:#0f1115;--fg:#e6e6e6;--muted:#9aa0a6;--accent:#2dd4bf;--border:#2a2f36;--codebg:#161b22;--card:#161b22;--chip:#0d2a27;--chipfg:#5eead4}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;transition:background .2s,color .2s}
header.site{border-bottom:1px solid var(--border);padding:14px 20px;display:flex;align-items:center;gap:12px;position:sticky;top:0;background:var(--bg);z-index:20}
header.site a.brand{font-weight:700;color:var(--accent);text-decoration:none;font-size:18px}
header.site span.tag{color:var(--muted);font-size:13px}
.controls{margin-left:auto;display:flex;align-items:center;gap:10px}
.lang-switch{display:flex;border:1px solid var(--border);border-radius:8px;overflow:hidden}
.lang-switch .lang{padding:4px 10px;font-size:13px;text-decoration:none;color:var(--fg);background:var(--bg)}
.lang-switch .lang.active{background:var(--accent);color:#fff;font-weight:600}
.lang-switch .lang:disabled{opacity:.4;cursor:default}
.dark-toggle,.search-toggle{background:var(--bg);border:1px solid var(--border);border-radius:8px;width:34px;height:30px;cursor:pointer;font-size:15px;color:var(--fg)}
main{max-width:760px;margin:0 auto;padding:32px 20px 64px}
article h1{font-size:30px;line-height:1.25;margin:0 0 8px}
article .desc{color:var(--muted);margin:0 0 20px;font-size:15px}
article h2{font-size:22px;margin:36px 0 12px;padding-top:8px;border-top:1px solid var(--border)}
article h3{font-size:18px;margin:26px 0 10px}
article p{margin:14px 0}
article ul,article ol{margin:14px 0;padding-left:24px}
article li{margin:6px 0}
article code{background:var(--codebg);padding:2px 6px;border-radius:5px;font-size:14px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
article pre{background:var(--codebg);padding:16px;border-radius:10px;overflow:auto}
article pre code{background:none;padding:0}
article table{border-collapse:collapse;width:100%;margin:18px 0;font-size:14px}
article th,article td{border:1px solid var(--border);padding:8px 10px;text-align:left}
article th{background:var(--codebg)}
blockquote{margin:18px 0;padding:12px 16px;border-left:4px solid var(--accent);background:var(--chip);color:var(--fg);border-radius:0 8px 8px 0}
a{color:var(--accent)}
.details.toc{border:1px solid var(--border);border-radius:10px;padding:12px 16px;margin:20px 0;background:var(--card)}
.details.toc summary{cursor:pointer;font-weight:600;color:var(--accent)}
.details.toc ol{margin:8px 0 0;padding-left:20px;font-size:14px}
.details.toc .lvl3{margin-left:14px}
.tags{margin:18px 0 4px;display:flex;flex-wrap:wrap;gap:8px}
.tags .chip{background:var(--chip);color:var(--chipfg);border-radius:999px;padding:3px 12px;font-size:13px;text-decoration:none}
.related{border-top:1px solid var(--border);margin-top:40px;padding-top:20px}
.related h3{margin:0 0 12px;font-size:18px}
.related a{display:block;padding:8px 0;border-bottom:1px solid var(--border);text-decoration:none;color:var(--fg)}
.related a:hover{color:var(--accent)}
.comments{margin-top:36px;border-top:1px solid var(--border);padding-top:20px}
.comments .load-comments{background:var(--accent);color:#fff;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-size:14px}
.comments .note{color:var(--muted);font-size:13px}
.newsletter{border:1px solid var(--border);border-radius:12px;padding:18px 20px;margin-top:36px;background:var(--card);display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.newsletter label{flex:1 1 200px;font-weight:600}
.newsletter input{flex:1 1 200px;padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--fg)}
.newsletter button{background:var(--accent);color:#fff;border:none;border-radius:8px;padding:8px 16px;cursor:pointer}
.newsletter .nl-status{flex:1 1 100%;font-size:13px;min-height:16px}
.newsletter .nl-status.ok{color:var(--ok,#1a7f37)}
.newsletter .nl-status.err{color:var(--err,#cf222e)}
.cards{display:grid;gap:16px;margin-top:24px}
.card{border:1px solid var(--border);border-radius:12px;padding:18px 20px;text-decoration:none;color:inherit;display:block;transition:border-color .15s;background:var(--card)}
.card:hover{border-color:var(--accent)}
.card h3{margin:0 0 6px;font-size:18px;color:var(--accent)}
.card p{margin:0;color:var(--muted);font-size:14px}
.tagindex{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}
.tagindex a{background:var(--chip);color:var(--chipfg);border-radius:999px;padding:4px 14px;text-decoration:none;font-size:14px}
footer.site{border-top:1px solid var(--border);padding:24px 20px;color:var(--muted);font-size:13px;max-width:760px;margin:0 auto}
footer.site a{color:var(--accent)}
.search-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;flex-direction:column;align-items:center;padding-top:12vh;z-index:50}
.search-overlay[hidden]{display:none}
.search-box{background:var(--bg);width:min(640px,92vw);border-radius:12px;padding:16px;box-shadow:0 10px 40px rgba(0,0,0,.3)}
.search-box input{width:100%;padding:10px 12px;font-size:16px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--fg)}
.search-results{max-height:50vh;overflow:auto;margin-top:10px}
.search-results a{display:block;padding:10px 8px;border-bottom:1px solid var(--border);text-decoration:none;color:var(--fg)}
.search-results .lang{font-size:11px;color:var(--chipfg);background:var(--chip);border-radius:4px;padding:1px 6px;margin-left:6px}
.search-results .empty{color:var(--muted);padding:10px}
`

// ---------- page builders ----------
function controls(lang, otherHref) {
  const en = lang === 'en'
    ? '<button class="lang active" disabled>EN</button>'
    : `<a class="lang" href="${otherHref || '#'}">EN</a>`
  const zh = lang === 'zh'
    ? '<button class="lang active" disabled>中文</button>'
    : (otherHref ? `<a class="lang" href="${otherHref}">中文</a>` : '<button class="lang" disabled title="暂无中文版">中文</button>')
  return `<div class="controls"><span class="lang-switch">${en}${zh}</span>` +
    `<button class="dark-toggle" aria-label="Toggle dark mode">🌓</button>` +
    `<button class="search-toggle" aria-label="Search">🔍</button></div>`
}
function hreflang(base, pair) {
  if (!pair) return ''
  const enU = `${SITE_URL}/${pair.en}`
  const zhU = `${SITE_URL}/zh/${pair.zh}`
  return `<link rel="alternate" hreflang="en" href="${enU}">\n<link rel="alternate" hreflang="zh-Hans" href="${zhU}">`
}
function commentsSection() {
  const ready = G.repo && !/YOUR_|example/i.test(G.repo || '')
  const attrs = [
    `data-repo="${esc(G.repo || '')}"`,
    `data-issue-term="${esc(G.issueTerm || 'pathname')}"`,
    `data-label="${esc(G.label || 'comment')}"`,
    `data-theme="${esc(G.theme || 'preferred-color-scheme')}"`,
  ].join(' ')
  if (!ready) return ''
  const inner = `<button class="load-comments">加载评论</button>`
  return `<section id="comments" class="comments" ${attrs}>${inner}</section>`
}
function newsletterSection() {
  if (NL.enabled === false) return ''
  const action = NL.action && !/example/i.test(NL.action) ? NL.action : '#'
  const local = action.startsWith('/api/')
  return `<form class="newsletter" data-newsletter action="${esc(action)}" method="post"${local ? '' : ' target="_blank" rel="noopener"'}>
  <label>订阅 GridLens 博客更新</label>
  <input type="email" name="email" placeholder="you@example.com" required>
  <button type="submit">订阅</button>
  <span class="nl-status" aria-live="polite"></span>
</form>`
}

function articlePage({ lang, title, description, bodyHtml, faq, slug, url, pair, tags, related }) {
  const faqLd = faq.length ? {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  } : null
  const articleLd = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: title, description, inLanguage: lang === 'zh' ? 'zh-Hans' : 'en',
    author: { '@type': 'Organization', name: 'GridLens' },
    publisher: { '@type': 'Organization', name: 'GridLens' },
    datePublished: PUBLISH_DATE, mainEntityOfPage: url,
  }
  const ld = [articleLd, faqLd].filter(Boolean)
  const otherHref = pair ? (lang === 'en' ? `/zh/${pair.zh}` : `/${pair.en}`) : null
  const tagChips = (tags || []).map((t) => `<a class="chip" href="/tags/${t}.html">#${t}</a>`).join('')
  const relatedHtml = related.length ? `<div class="related"><h3>相关文章</h3>${related.map((r) => `<a href="${r.url}">${esc(r.title)} <span class="lang">${r.lang === 'zh' ? '中文' : 'EN'}</span></a>`).join('')}</div>` : ''
  return `<!doctype html>
<html lang="${lang === 'zh' ? 'zh-Hans' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="icon" href="data:,">
<title>${esc(title)} — ${SITE_NAME}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
${hreflang(baseOf(slug), pair)}
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<style>${CSS}</style>
<script src="/blog.js" defer></script>
</head>
<body>
<header class="site"><a class="brand" href="${lang === 'zh' ? '/zh/' : '/'}">${SITE_NAME}</a><span class="tag">${lang === 'zh' ? '网格交易实录与风控笔记' : 'Crypto grid insights & risk notes'}</span>${controls(lang, otherHref)}</header>
<main><article>
<h1>${esc(title)}</h1>
<p class="desc">${esc(description)}</p>
${tagChips ? `<div class="tags">${tagChips}</div>` : ''}
${bodyHtml}
</article>
${relatedHtml}
${newsletterSection()}
${commentsSection()}
</main>
<footer class="site">GridLens 是一个只读加密货币网格监控工具。 <a href="https://gridlens-scaffold.vercel.app/">免费试用</a>。非投资建议——仅用可承受损失的资金交易。</footer>
</body>
</html>`
}

function indexPage(lang, articles, otherHref) {
  const cards = articles.map((a) => `<a class="card" href="${a.url}"><h3>${esc(a.title)}</h3><p>${esc(a.description)}</p></a>`).join('\n')
  const listLd = {
    '@context': 'https://schema.org', '@type': 'ItemList',
    itemListElement: articles.map((a, i) => ({ '@type': 'ListItem', position: i + 1, name: a.title, url: a.url })),
  }
  const tagSet = new Set(); articles.forEach((a) => (a.tags || []).forEach((t) => tagSet.add(t)))
  const tagIndex = [...tagSet].map((t) => `<a href="/tags/${t}.html">#${t}</a>`).join('')
  const intro = lang === 'zh'
    ? '真实运行加密货币网格机器人的笔记——保证金告警、回撤监控、为什么机器人会爆仓，以及如何用只读 API 安全地自动化。'
    : 'Real notes from running crypto grid bots — margin alerts, drawdown monitoring, why bots blow up, and how to automate safely with read-only API keys.'
  return `<!doctype html>
<html lang="${lang === 'zh' ? 'zh-Hans' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="icon" href="data:,">
<title>${SITE_NAME} — ${lang === 'zh' ? '网格交易实录与风控笔记' : 'Crypto Grid Insights & Risk Notes'}</title>
<meta name="description" content="${intro}">
<link rel="canonical" href="${lang === 'zh' ? SITE_URL + '/zh/' : SITE_URL + '/'}">
${lang === 'zh' ? `<link rel="alternate" hreflang="en" href="${SITE_URL}/">\n<link rel="alternate" hreflang="zh-Hans" href="${SITE_URL}/zh/">` : ''}
<meta property="og:type" content="website">
<meta property="og:title" content="${SITE_NAME}">
<meta property="og:url" content="${lang === 'zh' ? SITE_URL + '/zh/' : SITE_URL + '/'}">
<script type="application/ld+json">${JSON.stringify(listLd)}</script>
<style>${CSS}</style>
<script src="/blog.js" defer></script>
</head>
<body>
<header class="site"><a class="brand" href="${lang === 'zh' ? '/zh/' : '/'}">${SITE_NAME}</a><span class="tag">${lang === 'zh' ? '网格交易实录与风控笔记' : 'Crypto grid insights & risk notes'}</span>${controls(lang, otherHref)}</header>
<main>
<h1>${lang === 'zh' ? 'GridLens 博客' : 'GridLens Blog'}</h1>
<p class="desc">${intro}</p>
<div class="tagindex">${tagIndex}</div>
<div class="cards">${cards}</div>
</main>
<footer class="site">GridLens 是一个只读加密货币网格监控工具。 <a href="https://gridlens-scaffold.vercel.app/">免费试用</a>。非投资建议。</footer>
</body>
</html>`
}

function tagPage(tag, articles) {
  const cards = articles.map((a) => `<a class="card" href="${a.url}"><h3>${esc(a.title)} <span class="lang">${a.lang === 'zh' ? '中文' : 'EN'}</span></h3><p>${esc(a.description)}</p></a>`).join('\n')
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="icon" href="data:,">
<title>#${tag} — ${SITE_NAME}</title>
<meta name="description" content="Articles tagged ${tag} on ${SITE_NAME}.">
<link rel="canonical" href="${SITE_URL}/tags/${tag}.html">
<style>${CSS}</style>
<script src="/blog.js" defer></script>
</head>
<body>
<header class="site"><a class="brand" href="/">${SITE_NAME}</a><span class="tag">Crypto grid insights & risk notes</span>${controls('en', '/zh/')}</header>
<main>
<h1>Tag: #${tag}</h1>
<p class="desc">${articles.length} 篇文章</p>
<div class="cards">${cards}</div>
<p style="margin-top:24px"><a href="/">← 返回首页</a></p>
</main>
<footer class="site">GridLens is a read-only crypto grid monitoring tool. <a href="https://gridlens-scaffold.vercel.app/">Try it free</a>. Not financial advice.</footer>
</body>
</html>`
}

// ---------- build ----------
function loadArticles(srcDir, lang) {
  const files = readdirSync(srcDir)
    .filter((f) => (lang === 'zh' ? /^\d{2}-.*\.zh\.md$/ : /^\d{2}-.*\.md$/).test(f) && f !== 'INDEX.md')
    .filter((f) => { try { return statSync(join(srcDir, f)).isFile() } catch { return false } })
    .sort()
  const list = []
  for (const f of files) {
    const md = readFileSync(join(srcDir, f), 'utf8')
    const title = extractTitle(md)
    const description = extractFirstPara(md) || title
    const faq = extractFAQ(md)
    const slug = slugOf(f)
    const base = baseOf(f)
    let body = marked.parse(md)
    body = rewriteLinks(body, lang)
    const { html: bodyHtml, toc } = addHeadingIds(body)
    const tocHtml = toc.length ? `<details class="toc"><summary>目录</summary><ol>${toc.map((t) => `<li class="${t.level === 3 ? 'lvl3' : ''}"><a href="#${t.id}">${esc(t.text)}</a></li>`).join('')}</ol></details>` : ''
    const url = lang === 'zh' ? `${SITE_URL}/zh/${slug}.html` : `${SITE_URL}/${slug}.html`
    const outRel = lang === 'zh' ? `zh/${slug}.html` : `${slug}.html`
    const tags = TAGS[slug] || []
    list.push({ title, description, faq, slug, base, lang, tags, url, outRel, tocHtml, bodyHtml, text: plainText(md) })
  }
  return list
}

const en = loadArticles(SRC_EN, 'en')
const zh = loadArticles(SRC_ZH, 'zh')

// pair by base
const pairByBase = {}
for (const a of [...en, ...zh]) (pairByBase[a.base] ||= {})[a.lang] = a
function pairOf(a) {
  const p = pairByBase[a.base]; if (!p) return null
  if (a.lang === 'en' && p.zh) return { en: a.slug + '.html', zh: p.zh.slug + '.html' }
  if (a.lang === 'zh' && p.en) return { en: p.en.slug + '.html', zh: a.slug + '.html' }
  return null
}

// write EN articles + related
const all = [...en, ...zh]
for (const a of en) {
  const related = all.filter((x) => x.slug !== a.slug && (x.tags || []).some((t) => (a.tags || []).includes(t)))
    .sort((x, y) => {
      const sx = x.tags.filter((t) => a.tags.includes(t)).length + (x.lang === a.lang ? 0.5 : 0)
      const sy = y.tags.filter((t) => a.tags.includes(t)).length + (y.lang === a.lang ? 0.5 : 0)
      return sy - sx
    }).slice(0, 3)
    .map((x) => ({ title: x.title, url: x.url, lang: x.lang }))
  const html = articlePage({ lang: 'en', title: a.title, description: a.description, bodyHtml: a.tocHtml + a.bodyHtml, faq: a.faq, slug: a.slug, url: a.url, pair: pairOf(a), tags: a.tags, related })
  writeFileSync(join(OUT, a.outRel), html)
  console.log(`==> ${a.outRel}  (FAQ:${a.faq.length} tags:${a.tags.join(',')})`)
}
for (const a of zh) {
  const related = all.filter((x) => x.slug !== a.slug && (x.tags || []).some((t) => (a.tags || []).includes(t)))
    .sort((x, y) => {
      const sx = x.tags.filter((t) => a.tags.includes(t)).length + (x.lang === a.lang ? 0.5 : 0)
      const sy = y.tags.filter((t) => a.tags.includes(t)).length + (y.lang === a.lang ? 0.5 : 0)
      return sy - sx
    }).slice(0, 3)
    .map((x) => ({ title: x.title, url: x.url, lang: x.lang }))
  const html = articlePage({ lang: 'zh', title: a.title, description: a.description, bodyHtml: a.tocHtml + a.bodyHtml, faq: a.faq, slug: a.slug, url: a.url, pair: pairOf(a), tags: a.tags, related })
  writeFileSync(join(OUT, a.outRel), html)
  console.log(`==> ${a.outRel}  (FAQ:${a.faq.length} tags:${a.tags.join(',')})`)
}

// indexes
const enIdx = en.map((a) => ({ title: a.title, description: a.description, url: a.url, tags: a.tags }))
const zhIdx = zh.map((a) => ({ title: a.title, description: a.description, url: a.url, tags: a.tags }))
writeFileSync(join(OUT, 'index.html'), indexPage('en', enIdx, '/zh/'))
writeFileSync(join(OUT, 'zh', 'index.html'), indexPage('zh', zhIdx, '/'))
console.log(`==> index.html (${en.length})  zh/index.html (${zh.length})`)

// tag pages (combined EN+ZH)
const tagMap = {}
for (const a of all) for (const t of a.tags || []) (tagMap[t] ||= []).push({ title: a.title, description: a.description, url: a.url, lang: a.lang })
for (const [t, items] of Object.entries(tagMap)) {
  writeFileSync(join(OUT, 'tags', `${t}.html`), tagPage(t, items))
  console.log(`==> tags/${t}.html (${items.length})`)
}

// search index
const searchIdx = all.map((a) => ({ title: a.title, desc: a.description, url: a.url, lang: a.lang, tags: a.tags, text: a.text }))
writeFileSync(join(OUT, 'search.json'), JSON.stringify(searchIdx))
console.log(`==> search.json (${searchIdx.length})`)

// copy client script
if (existsSync(join(__dirname, 'blog.js'))) { copyFileSync(join(__dirname, 'blog.js'), join(OUT, 'blog.js')); console.log('==> blog.js copied') }

// copy serverless api functions (become /api/* on Vercel)
const API_SRC = join(__dirname, 'api')
if (existsSync(API_SRC)) {
  const walkDir = (d) => {
    const out = []
    for (const n of readdirSync(d)) {
      const f = join(d, n)
      if (statSync(f).isDirectory()) out.push(...walkDir(f))
      else out.push(f)
    }
    return out
  }
  for (const f of walkDir(API_SRC)) {
    const rel = relative(API_SRC, f).split(sep).join('/')
    const dest = join(OUT, 'api', rel)
    mkdirSync(dirname(dest), { recursive: true })
    copyFileSync(f, dest)
    console.log(`==> api/${rel} copied`)
  }
}

console.log('BUILD OK')
