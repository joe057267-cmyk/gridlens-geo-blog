// Local pre-deploy verification for a static GEO blog.
// Checks: 200/served, <html> well-formed, JSON-LD parses, canonical present,
// no executable (non-JSON-LD) <script> that could throw at runtime.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import http from 'node:http'
import { createReadStream } from 'node:fs'

const DIST = join(process.cwd(), 'dist')
const files = readdirSync(DIST).filter((f) => f.endsWith('.html'))
let server
const port = 4123

function serve() {
  server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0])
    if (p === '/') p = '/index.html'
    const fp = join(DIST, p)
    if (!fp.startsWith(DIST) || !statSync(fp, { throwIfNoEntry: false })) {
      res.writeHead(404); res.end('nf'); return
    }
    const ext = p.split('.').pop()
    const ct = ext === 'html' ? 'text/html; charset=utf-8' : 'text/plain'
    res.writeHead(200, { 'Content-Type': ct })
    createReadStream(fp).pipe(res)
  })
  return new Promise((r) => server.listen(port, r))
}
const get = (path) => new Promise((resolve, reject) => {
  http.get(`http://127.0.0.1:${port}${path}`, (res) => {
    let d = ''
    res.on('data', (c) => (d += c))
    res.on('end', () => resolve({ status: res.statusCode, body: d }))
  }).on('error', reject)
})

await serve()
let fail = 0
for (const f of files) {
  const local = readFileSync(join(DIST, f), 'utf8')
  const r = await get('/' + f)
  const ok200 = r.status === 200
  const hasHtml = /<\/html>\s*$/s.test(local)
  const canonical = /<link rel="canonical" href="https?:\/\/[^"]+"/.test(local)
  // Extract JSON-LD blocks and validate JSON parse
  const blocks = [...local.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1])
  let jsonOk = true
  for (const b of blocks) { try { JSON.parse(b) } catch { jsonOk = false } }
  // Flag inline (non-JSON-LD, no src=) scripts as runtime-executable.
  const scripts = [...local.matchAll(/<script\b([^>]*)>/g)].map((m) => m[1])
  const hasExec = scripts.some((attrs) => !/application\/ld\+json/.test(attrs) && !/src=/.test(attrs))
  const pass = ok200 && hasHtml && canonical && jsonOk && !hasExec
  if (!pass) fail++
  console.log(`${pass ? 'OK ' : 'FAIL'} ${f.padEnd(26)} 200=${ok200} html=${hasHtml} canon=${canonical} jsonLD=${blocks.length}(ok=${jsonOk}) execJS=${hasExec}`)
}
server.close()
console.log(fail === 0 ? '\nVERIFY ALL PASS' : `\nVERIFY FAIL (${fail})`)
process.exit(fail === 0 ? 0 : 1)
