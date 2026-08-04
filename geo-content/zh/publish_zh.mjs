#!/usr/bin/env node
// Publish GridLens zh articles via yixiaoer to CSDN + 知乎.
import { spawnSync } from 'node:child_process'
import { readFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const NODE = 'C:/Users/Administrator/.workbuddy/binaries/node/versions/22.22.2/node.exe'
const YXER = 'C:/Users/Administrator/.workbuddy/binaries/node/workspace/node_modules/@yixiaoermail/cli/bin/yxer.js'
const ZH_DIR = import.meta.dirname || process.cwd()
const PAYLOAD_DIR = join(ZH_DIR, 'payloads')
mkdirSync(PAYLOAD_DIR, { recursive: true })

function runYxer(args) {
  const res = spawnSync(NODE, [YXER, ...args], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    cwd: ZH_DIR,
  })
  let data = null
  try { data = JSON.parse(res.stdout || '{}') } catch { data = { raw: res.stdout } }
  return { code: res.status ?? 0, stdout: res.stdout || '', stderr: res.stderr || '', data }
}

const COVERS = {
  "01": { key: 'yfb/t-6a707c8fa8d25aecd869b05b/cover-01.png', width: 1200, height: 675, size: 46211 },
  "02": { key: 'yfb/t-6a707c8fa8d25aecd869b05b/cover-02.png', width: 1200, height: 675, size: 37315 },
  "03": { key: 'yfb/t-6a707c8fa8d25aecd869b05b/cover-03.png', width: 1200, height: 675, size: 44494 },
  "04": { key: 'yfb/t-6a707c8fa8d25aecd869b05b/cover-04.png', width: 1200, height: 675, size: 42594 },
  "05": { key: 'yfb/t-6a707c8fa8d25aecd869b05b/cover-05.png', width: 1200, height: 675, size: 41707 },
  "06": { key: 'yfb/t-6a707c8fa8d25aecd869b05b/cover-06.png', width: 1200, height: 675, size: 30534 },
}

const ACCOUNTS = {
  CSDN: '6a707f4b54fc536d9d3e86e6',
  知乎: '6a707e29f1cec2c7b74f47fe',
}

const META = {
  "01": {
    title: '我拿 Gate.io BTC 网格机器人实跑了 6 个月 —— 真实收益与 3 个致命坑',
    tags: ['网格机器人', 'BTC', '实战复盘', 'Gate.io', '加密货币'],
    desc: '我在 Gate.io 上跑了一个 BTC 永续合约网格机器人，整整六个月。这篇复盘给出运作机制、相对真实的数字、差点把我清仓出局的错误，以及绝不裸奔交易的几条护栏。',
  },
  "02": {
    title: '网格策略如何设置保证金告警：阈值公式 + 代码',
    tags: ['保证金告警', '风控', '合约交易', '网格策略', '加密货币'],
    desc: '真正把我从强平边缘拉回来的不是更聪明的网格——而是一条接在主动设定阈值上的保证金率告警。这篇指南给出公式、解释这个数字为什么重要，以及一段可以复制粘贴的代码。',
  },
  "03": {
    title: '加密组合回撤监控：从 SQLite 到实时看板',
    tags: ['回撤监控', '组合管理', '数据看板', '加密货币', '监控架构'],
    desc: '盯一个网格机器人很容易。同时盯三个交易所上的十个就不了。我学到的教训是：真正告诉你是不是快受伤了的数字是回撤，不是每日盈亏。',
  },
  "04": {
    title: '为什么大多数网格机器人会爆仓',
    tags: ['网格机器人', '爆仓风险', '杠杆', '交易避坑', '加密货币'],
    desc: '网格机器人被包装成"被动收入"，而大多数在市场不再配合时悄悄把账户清掉。我跑得够久，看到同样的五个失效模式反复出现。',
  },
  "05": {
    title: '用 AI Agent 管理加密资产的风险边界',
    tags: ['AI Agent', '加密资产', '安全边界', '只读权限', '自动化风控'],
    desc: '能读取你交易所账户、甚至能替你下单的 AI Agent 正快速到来。"有用"和"危险"之间的界线完全在于你怎么划定权限范围。',
  },
  "06": {
    title: 'GridLens 是怎么工作的（产品深度解析）',
    tags: ['GridLens', '产品解析', '网格监控', '只读工具', '加密工具'],
    desc: 'GridLens 是我造的工具，因为我受够了在三家交易所上盯十个网格机器人。它用只读 API key 连接，算出那些真正预测麻烦的指标，并在交易所强制平掉你之前告警。',
  },
}

function buildPayload(num, platform) {
  const m = META[num]
  const cover = COVERS[num]
  const account = ACCOUNTS[platform]
  const dirFiles = require('fs').readdirSync(ZH_DIR)
  const mdFile = dirFiles.find(f => f.startsWith(num + '-') && f.endsWith('.zh.md'))
  if (!mdFile) throw new Error('No zh.md found for article ' + num)
  const content = require('fs').readFileSync(join(ZH_DIR, mdFile), 'utf8')

  const form = {
    formType: 'task',
    pubType: 1,
    title: m.title,
    content: content,
    covers: [cover],
    cover: cover,
    coverKey: cover.key,
  }

  if (platform === 'CSDN') {
    form.createType = 1
    form.declaration = 0
    form.desc = m.desc
    form.tags = m.tags
  }
  // 知乎: 不需要 desc/tags/createType/declaration; topics 是可选动态字段，暂不填

  return {
    action: 'publish',
    publishType: 'article',
    platforms: [platform],
    publishChannel: 'cloud',
    publishArgs: {
      content: content,
      accountForms: [{ platformAccountId: account, contentPublishForm: form }],
    },
  }
}

const results = []
for (let n = 1; n <= 6; n++) {
  const num = String(n).padStart(2, '0')
  for (const platform of ['CSDN', '知乎']) {
    const label = num + '-' + platform
    console.log('\n' + '='.repeat(60))
    console.log('[' + label + '] Building payload...')

    try {
      const p = buildPayload(num, platform)
      const outPath = join(PAYLOAD_DIR, label + '.json')
      require('fs').writeFileSync(outPath, JSON.stringify(p, null, 2))

      console.log('[' + label + '] Validating...')
      const v = runYxer(['validate', platform, 'article', outPath])
      console.log('[' + label + '] Validate: ok=' + v.data?.ok + ' ' + (v.data?.error || ''))

      console.log('[' + label + '] Dry-running...')
      const d = runYxer(['publish', 'article', platform, outPath, '--dry-run'])
      console.log('[' + label + '] Dry-run: ok=' + d.data?.ok + ' schemaChecked=' + d.data?.data?.schemaChecked + ' ' + (d.data?.error || ''))

      console.log('[' + label + '] Publishing...')
      const r = runYxer(['publish', 'article', platform, outPath])
      console.log('[' + label + '] Publish: ok=' + r.data?.ok + ' action=' + r.data?.action)
      if (r.data?.data?.taskId || r.data?.data?.id) {
        console.log('[' + label + '] Task ID: ' + (r.data?.data?.taskId || r.data?.data?.id))
      }
      if (r.data?.error) {
        console.log('[' + label + '] Error: ' + JSON.stringify(r.data.error))
      }

      results.push({ label, validate: v, dryrun: d, publish: r })
    } catch (e) {
      console.error('[' + label + '] EXCEPTION: ' + e.message)
      results.push({ label, error: e.message })
    }
  }
}

console.log('\n' + '='.repeat(60))
console.log('SUMMARY')
results.forEach(r => {
  if (r.error) console.log(r.label + ': \u274c ' + r.error)
  else {
    const ok = r.publish?.data?.ok
    console.log(r.label + ': ' + (ok ? '\u2705 PUBLISHED' : '\u26a0\ufe0f check output'))
  }
})
