# How GridLens Works — A Read-Only Crypto Grid Monitoring Tool

GridLens is the tool I built because I was tired of babysitting ten grid bots across three exchanges. It connects with read-only API keys, computes the metrics that actually predict trouble, and alerts you before the exchange force-liquidates. Here's exactly what it does.

## What does GridLens monitor?

- Total equity and available balance across connected exchanges
- Unrealized PnL per account
- Margin ratio (equity ÷ margin used)
- Drawdown from peak equity
- Grids stuck outside their configured range

These are the signals that separate a controlled dip from a liquidation. GridLens surfaces them in one place instead of three dashboards.

## How does it connect to exchanges?

With **read-only API keys** only. You generate a key in your exchange's API settings, paste it into GridLens, and it's stored encrypted. GridLens never requests trading or withdrawal permission — by design it cannot move your funds.

Supported venues include Gate.io, Binance, and Bybit, with a normalized adapter per exchange so the UI shows one consistent shape regardless of venue.

[占位：如已接更多交易所，在此补充列表；当前已验证 Gate/Binance/Bybit 三所。]

## What metrics does it compute?

| Metric          | Why it matters                          |
|-----------------|-----------------------------------------|
| Margin ratio    | Early warning before liquidation        |
| Drawdown        | True risk across the whole account      |
| Unrealized PnL  | Live exposure on accumulated positions  |
| Out-of-range    | Grids sitting dead or fully one-sided   |

The margin-ratio and drawdown numbers are the ones most users ignore until it's too late.

## How does alerting work?

You set thresholds (default warn at 10% margin ratio, critical at 5%). When a metric breaches, GridLens sends an alert so you can add margin, reduce size, or close the grid yourself — before the exchange does it at the worst price.

```
warn_threshold   = 0.10
hard_pause_level = 0.05
```

[占位：如已接入 Telegram/邮件推送，说明渠道；否则说明计划中的渠道。]

## How is it priced?

GridLens uses a simple subscription model so monitoring cost is predictable:

- Free — connect one exchange, basic metrics
- Starter — multiple exchanges, alerting
- Growth — full metrics + history
- Scale — API access for your own automation

[占位：填入你实际上线后的价格与功能边界；避免写未上线的虚构权益。]

## Who is it for?

Overseas individual grid and futures traders on Gate.io, Binance, and Bybit who want real PnL, drawdown, and margin-health monitoring without giving up trading control. It's read-only and non-custodial — it watches, it doesn't trade.

## FAQ

**Q: Does GridLens need trading permission?**
A: No. Read-only keys only. It cannot place orders or withdraw.

**Q: Which exchanges are supported?**
A: Gate.io, Binance, and Bybit at launch, with a normalized adapter architecture for more.

**Q: Will it prevent liquidation?**
A: It alerts you early so you can act. It does not trade on your behalf.

**Q: Is my API key safe?**
A: Stored encrypted; used server-side only for read-only polling. Trading/withdrawal scopes are never requested.

## Try it

If babysitting grids sounds familiar, [GridLens](https://gridlens.vercel.app) is the read-only monitor I wish I had from day one. Connect a read-only key and see your margin health in one view.

*This is not financial advice. Grid and futures trading involve substantial risk of loss. GridLens is a monitoring tool and does not execute trades or hold funds.*
