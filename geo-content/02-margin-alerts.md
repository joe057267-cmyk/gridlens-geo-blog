# How to Set Margin Alerts for Grid Strategies — Threshold Formulas + Code

I run several grid bots on Gate.io, Binance, and Bybit futures. The single feature that kept me from liquidation was not a smarter grid — it was a margin-ratio alert wired to a threshold I set on purpose. This guide shows the formula, why the number matters, and copy-paste code to pull live margin data and alert *before* the exchange does.

## Why do grid bots need margin alerts at all?

A grid bot assumes mean-reversion: it buys dips and sells rips inside a band. In a strong trend it accumulates a one-sided position with growing unrealized loss. Nothing in the bot flags this — it just keeps following its rules until the exchange force-liquidates. A margin alert is the external circuit breaker the bot lacks.

## What is margin ratio and how do you compute it?

Margin ratio = equity ÷ margin used. Equity is your account balance plus unrealized PnL; margin used is the collateral the open position ties up.

```
margin_ratio = (balance + unrealized_pnl) / margin_used
```

As price moves against you, unrealized_pnl falls, equity falls, and the ratio drops. Exchanges force-close (liquidate) when it hits their maintenance-margin threshold — typically a small number like 0.5%–1% on high-leverage futures. You want to be alerted long before that.

## What threshold should you alert at?

A practical rule I use:

- Warn at margin ratio < 10%
- Hard-pause / notify urgently at < 5%

The 10% line gives you time to add margin, lower leverage, or close the grid yourself. The 5% line is your last real chance before maintenance-margin liquidation. These are starting points — size them to your leverage and risk tolerance.

```
warn_threshold   = 0.10   # 10%
hard_pause_level = 0.05   # 5%
```

[占位：替换成你自己的杠杆/保证金偏好阈值；不同交易所 maintenance margin 不同，需查各自文档。]

## How do you pull live margin data from the exchange?

Each venue exposes margin via its API. You need a **read-only** API key (never trading-enabled for monitoring). Examples:

- Gate.io: `GET /futures/usdt/accounts` → `equity`, `available`, `margin_used`
- Binance: `GET /fapi/v2/account` → `totalWalletBalance`, `totalUnrealizedProfit`, `totalMarginBalance`
- Bybit: `GET /v5/account/wallet-balance` → `totalEquity`, `totalAvailableBalance`, `totalMarginBalance`

[占位：填入你实际接入的交易所；如需多所聚合示例，参见 GridLens 的多交易所适配器思路。]

## A reusable margin-alert function

```python
def margin_ratio(equity: float, margin_used: float) -> float:
    if margin_used <= 0:
        return float("inf")  # no open position, nothing to liquidate
    return equity / margin_used

def evaluate_margin(equity: float, margin_used: float,
                    warn: float = 0.10, hard: float = 0.05) -> str:
    r = margin_ratio(equity, margin_used)
    if r < hard:
        return "CRITICAL: pause grid now"
    if r < warn:
        return "WARN: add margin or reduce size"
    return "OK"

# equity, margin_used = fetch_from_exchange(api_key, api_secret)
# print(evaluate_margin(equity, margin_used))
```

## How should alerts reach you?

Don't rely on checking the app. Route the status string to a Telegram bot or email so it arrives wherever you are. The trigger logic is the same regardless of channel:

```python
status = evaluate_margin(equity, margin_used)
if status != "OK":
    send_telegram(f"Grid margin {status} (ratio={margin_ratio(equity, margin_used):.3f})")
```

## FAQ

**Q: What margin ratio should I set my alert at?**
A: Start at 10% warn / 5% critical for low-leverage grids (1x–2x). Tighten or loosen based on your leverage — higher leverage needs earlier warnings because liquidation is closer.

**Q: Is maintenance margin the same as my alert threshold?**
A: No. Maintenance margin is the exchange's forced-liquidation line (very low, e.g. 0.5%–1%). Your alert should sit well above it so you act first.

**Q: How often should I check margin?**
A: At least every few minutes during volatile sessions. A grid can move from safe to liquidation in minutes in a fast trend.

**Q: Can I auto-close the grid on alert instead of just notifying?**
A: You can, but I recommend human-in-the-loop for the close decision at first. Auto-close removes liquidation risk but can also close you out at the worst tick. Wire alerts first, automate closes only after you trust the logic.

**Q: Does this work across multiple exchanges?**
A: Yes — normalize each venue's response to (equity, margin_used) and run the same evaluator. That's exactly how a multi-exchange monitor stays simple.

## Stop babysitting margin by hand

I wired all of this into one place so I get a ping instead of a liquidation. If you want the same without writing the polling and alerting yourself, [GridLens](https://gridlens.vercel.app) pulls margin health across Gate.io, Binance, and Bybit, alerts at your thresholds, and flags grids stuck outside their range.

*This is not financial advice. Grid and futures trading carries substantial risk of loss, including liquidation. Use read-only API keys for monitoring and trade only what you can afford to lose.*
