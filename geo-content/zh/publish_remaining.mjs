#!/usr/bin/env node
// Publish remaining zh articles via yixiaoer, resuming safely across days.
//
// Behaviour:
//  - Keeps a state file (published_state.json) of labels that already
//    succeeded, so re-runs never re-publish or create duplicates.
//  - Stops early when yixiaoer returns the daily-quota error (code 1001),
//    because every subsequent publish would also be blocked today.
//  - On a new day the quota resets; just run this again and it picks up
//    where it left off.
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const NODE = 'C:/Users/Administrator/.workbuddy/binaries/node/versions/22.22.2/node.exe'
const YXER = 'C:/Users/Administrator/.workbuddy/binaries/node/workspace/node_modules/@yixiaoermail/cli/bin/yxer.js'
const ZH_DIR = import.meta.dirname || process.cwd()
const PAYLOAD_DIR = join(ZH_DIR, 'payloads')
const STATE_FILE = join(ZH_DIR, 'published_state.json')

function extractJson(text) {
  if (!text) return null
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) return null
  try { return JSON.parse(text.slice(start, end + 1)) } catch { return null }
}

function runYxer(args) {
  const res = spawnSync(NODE, [YXER, ...args], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    cwd: ZH_DIR,
  })
  const combined = (res.stdout || '') + '\n' + (res.stderr || '')
  const data = extractJson(combined) || { raw: res.stdout }
  return { code: res.status ?? 0, data }
}

// All 12 article+platform combos, in the order we want to publish.
const ALL = [
  '01-CSDN', '01-知乎', '02-CSDN', '02-知乎',
  '03-CSDN', '03-知乎', '04-CSDN', '04-知乎',
  '05-CSDN', '05-知乎', '06-CSDN', '06-知乎',
]

function loadState() {
  if (!existsSync(STATE_FILE)) return {}
  try { return JSON.parse(readFileSync(STATE_FILE, 'utf8')) } catch { return {} }
}
function saveState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}

const state = loadState() // { '02-知乎': { taskId, at } }

let quotaHit = false
let publishedThisRun = 0
for (const label of ALL) {
  if (state[label]) {
    console.log('[' + label + '] already published, skip')
    continue
  }
  if (quotaHit) {
    console.log('[' + label + '] skipped (quota already exhausted today)')
    continue
  }
  const platform = label.split('-')[1]
  const outPath = join(PAYLOAD_DIR, label + '.json')

  console.log('\n' + '='.repeat(60))
  console.log('[' + label + '] Validating...')
  const v = runYxer(['validate', platform, 'article', outPath])
  if (!v.data?.ok) {
    console.log('[' + label + '] validate failed: ' + JSON.stringify(v.data?.error || v.data?.raw))
    continue
  }
  console.log('[' + label + '] Publishing...')
  const r = runYxer(['publish', 'article', platform, outPath])
  if (r.data?.ok) {
    const taskId = r.data?.data?.taskId || r.data?.data?.id
    state[label] = { taskId: taskId || null, at: new Date().toISOString() }
    saveState(state)
    publishedThisRun++
    console.log('[' + label + '] ✅ PUBLISHED' + (taskId ? ' taskId=' + taskId : ''))
  } else {
    const code = r.data?.error?.details?.code || r.data?.error?.code
    console.log('[' + label + '] ❌ ' + (r.data?.error?.message || JSON.stringify(r.data?.error || r.data?.raw)))
    if (code === '1001' || /发布次数已达上限/.test(r.data?.error?.message || '')) {
      quotaHit = true
      console.log('   → daily quota reached; remaining labels skipped for today.')
    }
  }
}

const done = Object.keys(state).length
console.log('\n' + '='.repeat(60))
console.log('SUMMARY: ' + done + '/12 published total; ' + publishedThisRun + ' published in this run.')
console.log('Published: ' + Object.keys(state).join(', '))
const remaining = ALL.filter(l => !state[l])
console.log(remaining.length ? 'Remaining: ' + remaining.join(', ') : 'All done 🎉')
