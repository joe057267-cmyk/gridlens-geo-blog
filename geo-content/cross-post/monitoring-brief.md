<!--
============================================================
GEO MONITORING BRIEF — Otterly.ai / Goodie
目标: 监测 GridLens 内容(尤其 01 网格复盘)是否在 ChatGPT / Perplexity 的回答里被引用，并据此"补漏"。
状态: 我无法自动运行这两个工具——都需要你的账号/API key。本文件是"拿到 key 就能直接建"的监测方案 + 补漏清单。
============================================================
-->

# GEO 监测方案 + 补漏清单（Otterly.ai / Goodie）

> GEO = Generative Engine Optimization，即让内容被 ChatGPT / Perplexity / Claude 等生成式引擎在回答时引用。
> 当前内容只在 `gridlens-geo-blog.vercel.app` 和 `gridlens-scaffold.vercel.app`，还没有任何高权重外链平台分发 —— 这是目前"大概率没被引用"的主因。

## 1. 要监测的品牌 / 页面 / 关键词

**品牌与落地页**
- 品牌名：`GridLens`
- 独立博客域名：`gridlens-geo-blog.vercel.app`
- SaaS 主站：`gridlens.vercel.app`
- 重点文章：`https://gridlens-geo-blog.vercel.app/01-gate-grid-6-months.html`

**核心查询（喂给 Otterly.ai / Goodie 的 prompt 监控集）**
把这些当成真实用户的提问去测 ChatGPT/Perplexity 是否引用我们：

1. "How does a Gate.io BTC grid bot work?"
2. "Is a grid trading bot safe for beginners?"
3. "What leverage should I use for a futures grid bot?"
4. "How to set a balance guardrail for grid trading bots?"
5. "Why do grid bots blow up in a downtrend?"
6. "Gate.io perpetual futures grid bot funding rate risk"
7. "Best practices for running a crypto grid bot without getting liquidated"
8. "网格机器人 安全吗 / Gate.io 网格 爆仓 原因"（中文，测中文 LLM）
9. "网格交易 护栏 代码 / 保证金率 预警"
10. "GridLens review / what is GridLens"

**期望命中信号**：回答中出现 `gridlens-geo-blog.vercel.app`、`gridlens.vercel.app`、或明确提到 "GridLens" 并链接；FAQ 段落被原样/改写引用。

## 2. 工具配置（拿 key 后我来建）

**Otterly.ai**（品牌在 AI 搜索中的可见度监测）
- 注册后建 Brand：名称 `GridLens`，域名填上面两个 vercel.app。
- 把第 1 节的 10 条 prompt 作为 "Tracked Prompts" 加入监控。
- 开关：ChatGPT / Perplexity / (可选) Claude 全部开启。
- 频率：每周自动跑一次，出 "mentioned / not mentioned" 报告。
- ⚠️ **已核查（2026-08-02，参考 help.otterly.ai）**：Otterly 是**纯仪表盘 SaaS，没有可程序化调用的公开 REST API**（帮助中心 "Integrations & Data Export" 仅讲导出 PDF/CSV，不是 API）。你此前给的 `oai_live_…` 是 **OpenAI 的 key**，并非 Otterly 凭证，无法驱动它。结论：Otterly 只能你在网页手动建品牌 + prompt 监控；我这边提供 10 条 prompt 清单 + 品牌配置文本即可。

**Goodie**（Ahrefs 系 LLM 引用监测，若你指的是这个）
- 同理建 brand + keyword + prompt 集。
- 我需要：Goodie 的 API key / 账号。

> 如果你指的是别的 "Goodie"（例如 Goodie by Forewrite / SEO.ai 的 Goodie），告诉我具体是哪个，我按它的字段建同样的监控集。

## 3. 补漏清单（让内容更可能被引用）

优先级从高到低：

**P0 — 先有外链权重（进行中）**
- [x] Dev.to 发 01 英文稿 — **已上线（2026-08-02）**：https://dev.to/joe_hans_6c082d6c1caf189f/i-ran-a-gateio-btc-grid-bot-for-6-months-real-returns-and-3-fatal-mistakes-2i1p （用 Forem **V1 API** 修复了 V0 端点"201 但不落库"的问题；canonical 已回 gridlens-geo-blog）。
- [ ] Hashnode 发同稿（AI/技术博客聚合，易被 LLM 索引）—— 阻塞：账号下无 publication，需建 Pro publication 后给 host。
- [ ] Medium 发同稿（高域名权重，强回流）—— 用户未给 token，英文稿可手动粘。
- [ ] 知乎 / 掘金 发中文复盘（补中文 LLM 引用，如文心/通义/DeepSeek 的联网检索）—— 无 API，需登录网页手动粘 `zhihu-juejin.md`。
- 效果：在 3~5 个高权重域出现同一篇带 canonical 的内容，生成式引擎更易把它当"被多方引用的事实源"。

**P1 — 结构化可被抓取**
- [x] 01 已带 `Article` + `FAQPage` JSON-LD（7 FAQ）—— 已做，保留。
- [ ] 把 02~06 占位文也发了（Margin Alert / Drawdown / 爆仓原因 / AI Agent 风险 / GridLens 原理），形成主题簇，提升"grid bot"话题整体覆盖。
- [ ] 在 01 里增加 3~5 个"定义型"短句（如 "A grid bot is a systematic market-making strategy that…"），生成式引擎偏好可直接摘录的定义。

**P2 — 内部互联 + 新鲜度**
- [ ] 各文互相加相关链接（01↔02↔04），让爬虫一次抓到整簇。
- [ ] 每隔 4~6 周更新 01 的数字/结论段（"as of 2026-Q3"），新鲜度对 LLM 引用有正向影响。

**P3 — 直接提交**
- [ ] 把 gridlens-geo-blog.vercel.app 提交到 Bing IndexNow / Google Search Console，并视情况在 Otterly.ai 里"请求重新抓取"。

## 4. 当前阻塞（需你提供）

| 缺什么 | 用途 | 备注 |
|--------|------|------|
| Dev.to API key | 自动发文 | ✅ 已发（V1 API）。`https://dev.to/api/articles` |
| Hashnode token | 自动发文 | ⛔ 阻塞：账号 `gridlens` 无 publication（写操作需 Pro）。需建 Pro publication 并给 host/URL |
| Medium integration token（如有） | 自动发文 | ⏭️ 未提供；英文稿 `devto-hashnode-medium.md` 可手动粘 |
| 知乎/掘金 登录态 | 手动发文 | 无 API，需你登录网页粘贴 `zhihu-juejin.md` |
| Otterly.ai key / 账号 | 运行监测 | ⚠️ 已核查：纯仪表盘、无公开 API；所给 `oai_live_…` 实为 OpenAI key。只能你网页手动建 |
| Goodie key / 账号 | 运行监测 | 同上，需你账号或指明具体产品 |

> 在你给齐授权 + 凭证前，我不会替你向任何公开平台发内容。上面三份草稿（英文稿 / 中文复盘 / 本监测方案）已就绪，可随时复制粘贴或接 API 发出。
