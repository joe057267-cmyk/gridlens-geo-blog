// Create a NEW Vercel project (static) and deploy geo-blog/dist to production.
// Kept separate from the SaaS project so the blog never overwrites gridlens-scaffold.
// Usage: node deploy_blog.mjs <VERCEL_TOKEN>
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const TOKEN = process.argv[2] || process.env.VERCEL_TOKEN
const PROJECT_NAME = 'gridlens-geo-blog'
const DIST = join(process.cwd(), 'dist')
const api = 'https://api.vercel.com'
const auth = { Authorization: `Bearer ${TOKEN}` }

if (!TOKEN) { console.error('missing token'); process.exit(1) }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function createProject() {
  const r = await fetch(`${api}/v9/projects`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: PROJECT_NAME,
      framework: null,
      buildCommand: null,
      installCommand: null,
      outputDirectory: null,
    }),
  })
  const j = await r.json()
  if (r.ok) { console.log('==> project created:', j.id); return }
  const s = JSON.stringify(j)
  if (r.status === 409 || /already exists|conflict|taken/i.test(s)) {
    console.log('==> project already exists, continue')
    return
  }
  console.error('CREATE PROJECT FAILED', r.status, s.slice(0, 500))
  process.exit(1)
}

function walk(dir) {
  const out = []
  for (const n of readdirSync(dir)) {
    const f = join(dir, n)
    if (statSync(f).isDirectory()) out.push(...walk(f))
    else out.push(f)
  }
  return out
}
const files = walk(DIST).map((f) => ({
  file: relative(DIST, f).split(sep).join('/'),
  data: readFileSync(f).toString('base64'),
  encoding: 'base64',
}))
console.log(`==> ${files.length} files inlined`)

await createProject()

console.log('==> creating production deployment')
const cr = await fetch(`${api}/v13/deployments?skipAutoDetectionConfirmation=1`, {
  method: 'POST',
  headers: { ...auth, 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: PROJECT_NAME, target: 'production', files }),
})
const cj = await cr.json()
if (!cr.ok) { console.error('CREATE FAILED', cr.status, JSON.stringify(cj).slice(0, 1000)); process.exit(1) }
const depId = cj.id
console.log(`   deployment ${depId} (${cj.readyState})`)

let state = cj.readyState
for (let i = 0; i < 80 && state !== 'READY' && state !== 'ERROR'; i++) {
  await sleep(3000)
  const j = await (await fetch(`${api}/v13/deployments/${depId}`, { headers: auth })).json()
  state = j.readyState
  if (j.errorMessage) { console.error('DEPLOY ERROR:', j.errorMessage); break }
  process.stdout.write('.')
}
console.log(`\n   final state: ${state}`)

const insp = await (await fetch(`${api}/v13/deployments/${depId}`, { headers: auth })).json()
console.log('Deployment URL:', insp.url ? `https://${insp.url}` : '(unknown)')
console.log('Production aliases:', (insp.alias || []).join(', ') || '(none)')
console.log(state === 'READY' ? 'DEPLOY OK' : 'DEPLOY FAILED')
