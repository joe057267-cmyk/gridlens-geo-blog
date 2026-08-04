# GEO Content Index — GridLens

Structured, AI-citation-friendly technical articles (English primary, per the 落地计划). Each follows the proven GEO format from `01`: question-style H2s + code/data + FAQ + soft CTA + "not financial advice" disclaimer.

| # | File | Topic (EN) | Topic (ZH) | Status |
|---|------|-----------|-----------|--------|
| 01 | [01-gate-grid-6-months.md](01-gate-grid-6-months.md) | I Ran a Gate.io BTC Grid Bot for 6 Months | 我跑 Gate BTC 网格 6 个月的真实收益与 3 个致命坑 | ✅ **Published** (deepened + live) |
| 02 | [02-margin-alerts.md](02-margin-alerts.md) | How to Set Margin Alerts for Grid Strategies | 网格策略如何设保证金告警：阈值公式 + 代码 | 🟡 Placeholder draft |
| 03 | [03-drawdown-monitoring.md](03-drawdown-monitoring.md) | Crypto Portfolio Drawdown Monitoring | 加密组合回撤监控：从 SQLite 到实时看板 | 🟡 Placeholder draft |
| 04 | [04-why-grid-bots-blow-up.md](04-why-grid-bots-blow-up.md) | Why Most Grid Bots Blow Up | 为什么大多数网格 bot 会爆仓 | 🟡 Placeholder draft |
| 05 | [05-ai-agent-risk.md](05-ai-agent-risk.md) | Risk Boundaries of an AI Agent Managing Crypto | 用 AI Agent 管加密资产的风险边界 | 🟡 Placeholder draft |
| 06 | [06-how-gridlens-works.md](06-how-gridlens-works.md) | How GridLens Works (Product Deep-Dive) | GridLens 是怎么做的 | 🟡 Placeholder draft |
| 07 | [07-leverage-grid.md](07-leverage-grid.md) | What Leverage Should I Use for a Futures Grid Bot | 合约网格该用几倍杠杆 | ✍️ Draft (Phase B) |
| 08 | [08-balance-guardrail.md](08-balance-guardrail.md) | How to Set a Balance Guardrail for Grid Trading Bots | 网格余额护栏怎么设 | ✍️ Draft (Phase B) |
| 09 | [09-binance-safety.md](09-binance-safety.md) | Binance Grid Bot Safety Settings | Binance 网格安全设置 | ✍️ Draft (Phase B) |
| 10 | [10-bybit-risk.md](10-bybit-risk.md) | Bybit Grid Bot Risk Management | Bybit 网格风险管理 | ✍️ Draft (Phase B) |
| 11 | [11-grid-out-of-range.md](11-grid-out-of-range.md) | Grid Bot Stuck Out of Range — What to Do | 网格出区间怎么办 | ✍️ Draft (Phase B) |
| 12 | [12-grid-vs-dca.md](12-grid-vs-dca.md) | Grid Trading Bot vs DCA — Which Is Safer | 网格 vs DCA 哪个安全 | ✍️ Draft (Phase B) |
| 13 | [13-track-grid-pnl.md](13-track-grid-pnl.md) | How to Track Crypto Grid Bot Profit and Loss | 网格盈亏怎么算才真实 | ✍️ Draft (Phase B) |

## How to "逐步完成" (finish gradually)

1. Replace each `[占位：...]` marker with your real data / personal anecdotes.
2. Optionally publish to Dev.to / Hashnode / Medium first (high authority, easy AI indexing), then link back to the GridLens landing page.
3. Chinese 复盘 versions can sync to 知乎 / 掘金.
4. Track AI-search citations with Otterly.ai / Goodie and backfill uncovered high-frequency questions.

## Publish status

- **Blog host**: **Independent Vercel project** `gridlens-geo-blog` → live at `https://gridlens-geo-blog.vercel.app/` (created with the new account-level token `vcp_0nk…` that CAN create projects; the old `vcp_5436…` CLI token could not).
- **Article 01 is LIVE (canonical)**: https://gridlens-geo-blog.vercel.app/01-gate-grid-6-months.html — `Article` + `FAQPage` JSON-LD (7 FAQ items) for AI-search citation; 0 console errors on production headless check.
- **SaaS `/blog` removed**: the earlier co-hosted copy on `gridlens-scaffold.vercel.app/blog/` was deleted to avoid duplicate-content dilution across two domains (the SPA fallback now serves the app for those URLs, but the article body is gone).
- **Pipeline**: `geo-blog/build.mjs` converts `geo-content/*.md` → `geo-blog/dist/*.html` (with FAQ/Article JSON-LD, root-relative links, favicon suppressed); `geo-blog/deploy_blog.mjs <TOKEN>` creates the `gridlens-geo-blog` project (if missing) and deploys to production.
- Articles 02–06 are **published via yixiaoer to CSDN + 知乎** (user-confirmed, 2026-08-04). They remain placeholder-grade on the Vercel blog source — deepen + deploy to `gridlens-geo-blog.vercel.app` (canonical) if domain-level AI citation is the goal.
- **Phase B (2026-08-04):** 9 new articles written to close the GEO gaps — EN 07–13 (leverage, balance guardrail, Binance safety, Bybit risk, out-of-range, grid vs DCA, track PnL) + ZH 07/08 (网格安全吗, Gate.io 网格爆仓). All follow the proven GEO format (question H2s + code + FAQ + soft CTA + disclaimer). Next: deploy to blog (canonical) + cross-post via yixiaoer (CSDN/知乎) and Dev.to/Hashnode/Medium.

## Compliance notes

- No fabricated return figures; illustrative numbers are labeled as such.
- Every article carries a "not financial advice" disclaimer.
- Read-only API + non-custodial positioning throughout (no trading/withdrawal permission requested).
