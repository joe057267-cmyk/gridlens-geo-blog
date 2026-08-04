// Headless console-error check for the static GEO blog.
// Uses puppeteer-core + the system Chrome (no browser download).
// Serves dist/ over http, loads every page, captures console.error / pageerror,
// and exercises the interactive controls (dark mode, search) to surface runtime errors.
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import http from 'node:http'
import { createReadStream } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const puppeteer = require('C:/Users/Administrator/.workbuddy/binaries/node/pptr13/node_modules/puppeteer-core')

const DIST = join(process.cwd(), 'dist')
const CHROME = 'C:/Users/Administrator/AppData/Local/Google/Chrome/Bin/chrome.exe'
const PORT = 4199

function pages() {
  const out = ['/index.html', '/zh/index.html']
  for (const f of readdirSync(DIST)) {
    if (f.endsWith('.html') && f !== 'index.html') out.push('/' + f)
  }
  const zh = join(DIST, 'zh')
  for (const f of readdirSync(zh)) if (f.endsWith('.html') && f !== 'index.html') out.push('/zh/' + f)
  const tags = join(DIST, 'tags')
  for (const f of readdirSync(tags)) if (f.endsWith('.html')) out.push('/tags/' + f)
  return out
}

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html'
  const fp = join(DIST, p)
  if (!fp.startsWith(DIST) || !statSync(fp, { throwIfNoEntry: false })) { res.writeHead(404); res.end('nf'); return }
  const ext = p.split('.').pop()
  const ct = ext === 'html' ? 'text/html; charset=utf-8' : ext === 'json' ? 'application/json' : 'text/plain'
  res.writeHead(200, { 'Content-Type': ct }); createReadStream(fp).pipe(res)
})

await new Promise((r) => server.listen(PORT, r))
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  userDataDir: 'C:/Users/Administrator/.workbuddy/binaries/node/pptr13/chrome-profile',
  dumpio: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
})
const errors = []
const urls = pages()

for (const u of urls) {
  const page = await browser.newPage()
  const local = []
  page.on('console', (m) => { if (m.type() === 'error') local.push('console: ' + m.text()) })
  page.on('pageerror', (e) => local.push('pageerror: ' + e.message))
  try {
    await page.goto(`http://127.0.0.1:${PORT}${u}`, { waitUntil: 'networkidle2', timeout: 20000 })
    await new Promise((r) => setTimeout(r, 600))
    // exercise interactive controls to surface runtime errors
    await page.evaluate(() => {
      const dt = document.querySelector('.dark-toggle'); if (dt) dt.click()
      const st = document.querySelector('.search-toggle'); if (st) st.click()
      const inp = document.getElementById('search-input'); if (inp) { inp.value = 'grid'; inp.dispatchEvent(new Event('input', { bubbles: true })) }
    }).catch(() => {})
    await new Promise((r) => setTimeout(r, 300))
  } catch (e) { local.push('nav: ' + e.message) }
  if (local.length) errors.push({ url: u, issues: local })
  await page.close()
}

await browser.close()
server.close()

if (errors.length) {
  console.log(`\nHEADLESS FAIL (${errors.length} pages with errors):`)
  for (const e of errors) { console.log(`  ${e.url}\n    ` + e.issues.join('\n    ')) }
  process.exit(1)
} else {
  console.log(`HEADLESS OK — checked ${urls.length} pages, 0 console/page errors`)
}
