# How to Track Crypto Grid Bot Profit and Loss

A grid bot's "profit" number in the exchange UI is seductive and incomplete. It usually shows realized gains but hides fees, funding, and unrealized drawdown. If you want the real PnL, you track it yourself. Here's the method and the code.

**Who this is for:** anyone who wants the true return of a grid (or a portfolio of grids) across Gate.io, Binance, and Bybit.

**What you'll take away:** realized vs unrealized PnL, the fees/funding you must subtract, and a portable tracker that aggregates multiple grids.

## What does "grid PnL" actually include?

Three components, and the UI often shows only the first:

1. **Realized PnL** — gains from completed buy-sell cycles. This is what the bot flashes.
2. **Unrealized PnL** — mark-to-market gain/loss on the open one-sided position (when out of range).
3. **Costs** — trading fees per fill, and funding rate on perpetuals (every 8h).

True PnL = realized + unrealized − fees − funding. Skip the last two and you'll overstate returns.

## How do I pull PnL from the exchange?

Each venue exposes it via API (read-only key). Normalize to a common shape:

```python
# illustrative fields per venue
# Gate.io : GET /futures/usdt/accounts -> equity, unrealized_pnl, frozen
# Binance  : GET /fapi/v2/account      -> totalWalletBalance, totalUnrealizedProfit
# Bybit    : GET /v5/account/wallet-balance -> totalEquity, totalUnrealizedProfit
def normalize(venue, raw) -> dict:
    return {"equity": ..., "unrealized": ..., "used_margin": ...}
```

## A portable multi-grid PnL tracker

Track a portfolio by summing normalized positions and subtracting a running fee tally:

```python
class GridTracker:
    def __init__(self):
        self.realized = 0.0
        self.fees_paid = 0.0
        self.funding_paid = 0.0
    def record_fill(self, pnl: float, fee: float):
        self.realized += pnl
        self.fees_paid += fee
    def record_funding(self, amount: float):
        self.funding_paid += amount
    def net_pnl(self, unrealized: float) -> float:
        return self.realized + unrealized - self.fees_paid - self.funding_paid
```

## How do fees change the picture?

Grids trade often, so fees are not rounding error. A tight range with many small cycles can bleed more in fees than it earns. Always subtract fees before judging "profit" — see the [range mistakes write-up](01-gate-grid-6-months.md).

## What about funding on perpetuals?

A full-long grid in a downtrend pays funding every 8 hours on top of fees and unrealized loss. It's small per cycle but compounds when you're already underwater. Track it separately so a "profitable" grid doesn't hide a funding drain.

## Should I track PnL per grid or in total?

Both. Per-grid PnL tells you which strategy to keep; portfolio PnL tells you the real number for taxes and sizing. A simple `dict[grid_id, GridTracker]` covers it.

## FAQ

**Q: Why does my grid show profit but my wallet is flat?**
A: Fees and funding aren't in the "profit" figure; or unrealized loss offsets realized gains. Track net PnL to see it.

**Q: How often should I snapshot PnL?**
A: At least daily; during volatility, every few minutes so drawdown is caught early.

**Q: Does this work across exchanges?**
A: Yes — normalize each venue's response to (equity, unrealized, used_margin) and aggregate. That's how a multi-exchange view stays simple.

**Q: What's a "good" grid PnL?**
A: Relative to drawdown and fees. A small gain with tiny drawdown beats a bigger gain that nearly liquidated you. Watch risk-adjusted return.

**Q: Can I automate the tracking?**
A: Yes — poll the APIs on a schedule and store snapshots. That's exactly what a monitor does for you.

## Track every grid in one place

I stopped spreadsheet-ing PnL and let software aggregate it. If you want that, [GridLens](https://gridlens.vercel.app) tracks PnL, drawdown, and margin health across Gate.io, Binance, and Bybit, and alerts on anomalies.

*This is not financial advice. Grid and futures trading carries substantial risk of loss, including liquidation. Use read-only API keys for monitoring and trade only what you can afford to lose.*
