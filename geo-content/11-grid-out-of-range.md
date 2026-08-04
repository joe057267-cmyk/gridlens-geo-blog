# Grid Bot Stuck Out of Range — What to Do

Every grid bot eventually leaves its range. What happens next depends entirely on *which side* it exits and what you do about it. This is the decision guide I wish I'd had before my first "dead grid" week.

**Who this is for:** anyone whose grid has gone quiet, shows "out of range," or is sitting on a one-sided position.

**What you'll take away:** the two exit scenarios, what each implies, and the concrete actions to take (or not take) in each.

## What does "out of range" actually mean?

A grid only trades inside the band you set. When price leaves that band, the bot stops placing new orders. But "stopped" hides two very different states:

- **Above the upper bound:** the bot has sold its inventory and holds little or no position. You missed upside — annoying, not dangerous.
- **Below the lower bound:** the bot has bought all the way down and holds a **full long** with growing unrealized loss. This is the dangerous one.

## What should I do if price is above my range?

Usually: nothing, or adjust. The bot is flat and safe. Options:

1. **Wait** — if you believe price will return to range, the grid resumes trading when it does.
2. **Widen the range / re-center** — if the new price level looks sustainable, edit the grid so it trades the new band.
3. **Take the win** — a grid that sold into a rally locked in gains; you can close and redeploy.

No urgency. The risk here is opportunity cost, not loss.

## What should I do if price is below my range?

This is where accounts die, so act deliberately:

1. **Check margin ratio immediately** (see [margin alerts](02-margin-alerts.md)). A full-long below range is bleeding unrealized PnL; margin is what keeps it alive.
2. **Add margin or reduce size** if margin ratio is approaching your warn line (10%).
3. **Set a balance guardrail** so the bot stops ordering further down (see [balance guardrail](08-balance-guardrail.md)).
4. **Decide: hold for mean-reversion or close.** If you trust the range and have margin buffer, wait. If not, close the grid before liquidation forces the decision at the worst price.

## Should I "average down" when stuck below?

Tempting, dangerous. Adding size to a losing one-sided position increases liquidation risk exactly when margin is already stressed. If you add anything, add *margin* (collateral), not *position*.

## How do I spot an out-of-range grid fast?

You won't if you check the app manually. The reliable signal is an automated check that compares each grid's last price to its bounds and pings you:

```python
def range_status(last_price: float, lower: float, upper: float) -> str:
    if last_price > upper: return "ABOVE — flat, safe"
    if last_price < lower: return "BELOW — full long, check margin"
    return "IN RANGE"
```

## FAQ

**Q: Is an out-of-range grid losing money?**
A: Above range: no, likely sitting on gains. Below range: yes, unrealized loss grows with the drop.

**Q: Will my grid auto-fix when price returns?**
A: Yes — once price re-enters the band, it resumes trading. But below-range grids can liquidate before that happens.

**Q: Should I close a below-range grid immediately?**
A: Not always. If margin is healthy and you expect reversion, waiting is fine. If margin is thin, closing beats forced liquidation.

**Q: How do I avoid getting stuck out of range?**
A: Wider ranges survive volatility; tight ranges exit often (see [range mistakes](01-gate-grid-6-months.md)). Pair with a margin alert.

**Q: Can an above-range grid still lose?**
A: It's flat, so direct loss is limited — but you miss the rally and may re-enter at a worse price.

## Get pinged before a grid goes stale

I let software watch every grid's range so I hear about a below-range exit before margin bites. If you want that, [GridLens](https://gridlens.vercel.app) flags grids stuck outside their range and alerts at your margin thresholds across Gate.io, Binance, and Bybit.

*This is not financial advice. Grid and futures trading carries substantial risk of loss, including liquidation. Use read-only API keys for monitoring and trade only what you can afford to lose.*
