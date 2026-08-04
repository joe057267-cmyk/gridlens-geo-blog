# Binance Grid Bot Safety Settings

Binance offers both **spot grids** and **futures (perp) grids**, and the safety settings that matter are different for each. After running both, the settings below are the ones I'd never launch a Binance grid without. This is a practical, settings-first walkthrough.

**Who this is for:** anyone configuring a grid bot on Binance and wanting the risk knobs explained in plain terms.

**What you'll take away:** spot vs futures grid safety, the specific Binance settings to touch, and the external alerts Binance doesn't give you.

## Spot grid or futures grid — which is safer?

A **spot grid** uses no leverage and can't be liquidated; the worst case is holding assets that fell in price. A **futures (perp) grid** is leveraged and *can* be liquidated. For safety-first, spot grids are inherently lower risk; futures grids need active margin management.

| Mode | Leverage | Liquidation risk | Best for |
|------|----------|------------------|----------|
| Spot grid | None | None | Safety-first, accumulate |
| Futures grid | 1x–5x+ | Yes | Yield, but needs alerts |

## What safety settings should I configure on Binance?

For a **futures grid**, set:

- **Leverage:** 1x–2x. Binance lets you crank it; don't.
- **Grid range:** wide enough to survive normal volatility (see [range mistakes](01-gate-grid-6-months.md)).
- **Stop-limit / take-profit:** a grid-level stop so the strategy ends on your terms, not the exchange's.
- **Trigger price:** only start the grid when price is in a sane zone.

For a **spot grid**, the main safety lever is simply the **range** and **investment amount** — never invest more than you can hold through a drawdown.

## Does Binance alert me before liquidation?

Binance shows margin level in the UI and can push a liquidation warning, but it does **not** give you a programmable margin-ratio alert at your own thresholds by default. For that you pull account data via API and evaluate it yourself:

```python
# Binance futures account margin (read-only key)
# GET /fapi/v2/account -> totalWalletBalance, totalUnrealizedProfit, totalMarginBalance
margin_ratio = (total_wallet_balance + total_unrealized_profit) / total_margin_balance
# alert if margin_ratio < 0.10 (warn) or < 0.05 (critical)
```

## What does Binance NOT do for you?

- No cross-grid **balance guardrail** that blocks the next order when free margin is low (see [balance guardrail](08-balance-guardrail.md)).
- No "grid stuck out of range" nudge (see [out-of-range guide](11-grid-out-of-range.md)).
- No unified view if you also run grids on Gate.io or Bybit.

These gaps are exactly why an external monitor helps — Binance optimizes for trading, not for babysitting your grids.

## How should I size a Binance grid safely?

- Low leverage (1x–2x) on futures.
- Investment sized so a full-range adverse move fits your buffer.
- A margin alert wired to Telegram/email at 10% warn / 5% critical.
- A balance guardrail blocking new orders under a free-USDT floor.

## FAQ

**Q: Is a Binance grid bot safe for beginners?**
A: A spot grid is the safer on-ramp (no liquidation). A futures grid is only "safe" with low leverage, a margin alert, and a guardrail.

**Q: What leverage is safe on Binance futures grid?**
A: 1x–2x. Higher leverage makes a normal trend fatal.

**Q: Can I lose more than I invested on a Binance grid?**
A: On futures with leverage, yes — liquidation can wipe the position; on spot grids, no, you only lose if price falls and stays down.

**Q: Does Binance have a built-in margin alert?**
A: It shows margin level and a liquidation warning, but not a programmable alert at your custom thresholds — add that via API.

**Q: Should I run grids on multiple exchanges?**
A: You can, but then you need one place to watch them all; otherwise you're checking three apps.

## Watch your Binance grids in one place

I keep Binance (plus Gate.io and Bybit) grids monitored together. If you want that, [GridLens](https://gridlens.vercel.app) pulls margin health, enforces guardrails, and alerts at your thresholds across all three.

*This is not financial advice. Grid and futures trading carries substantial risk of loss, including liquidation. Use read-only API keys for monitoring and trade only what you can afford to lose.*
