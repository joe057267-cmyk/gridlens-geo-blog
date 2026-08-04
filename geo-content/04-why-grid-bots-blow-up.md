# Why Most Grid Bots Blow Up

Grid bots are marketed as "passive income," and most of them quietly blow up accounts when the market stops cooperating. I've run them long enough to see the same five failure modes repeat. If you run grids, these are the landmines.

## What is the core assumption a grid bot makes?

A grid bot is a mean-reversion strategy. It assumes price oscillates inside a range and profits from the cycles. The entire design breaks the moment the market trends — because the bot has no model for "the range is gone," it just keeps executing its rules.

## Failure 1: Range breach = silent death

When price exits the band, the bot either stops (fine) or sits on a full one-sided position (dangerous). Below the lower bound in a downtrend, it holds a growing long with mounting unrealized loss. Above the upper bound it's flat and misses the rally. The downside case is where accounts die.

## Failure 2: Leverage is the multiplier of doom

Futures grids let you pick leverage. At 5x, a 20% adverse move against an accumulated position is liquidation. At 2x it's a painful loss you can survive. Leverage decides whether a bad week is a lesson or an exit. Most beginners crank it up to "maximize profit" and maximize their blow-up speed instead.

## Failure 3: No external stop

The bot has no drawdown stop. It will hold a losing position indefinitely waiting for mean-reversion that a trend can refuse to deliver. Without an external "close if unrealized loss exceeds X%" rule, you're trusting an assumption trends violate.

## Failure 4: Fee bleed

Every grid cycle pays maker/taker fees. Tight ranges and many grids multiply cycle count, and fees compound. A grid can post "gross profit" while netting negative after fees. Beginners see green cycles and miss the fee tax.

## Failure 5: No margin guardrail

The bot keeps placing orders as price moves. If free balance drops below what the next order or maintenance margin needs, the exchange liquidates part of your position. A balance guardrail that blocks new orders under a threshold is the cheapest insurance there is.

## What do survivors do differently?

- Wide ranges that survive volatility
- Low leverage (1x–2x default)
- An external drawdown stop
- A margin-ratio alert wired to a real threshold
- A balance guardrail before each new order

| Failure mode             | What kills you               | Survivor counter          |
|--------------------------|------------------------------|---------------------------|
| Range breach (downtrend) | Accumulated long, liquidation| Wide range + margin alert |
| Over-leverage            | Fast liquidation             | 1x–2x                     |
| No external stop         | Endless losing position      | Drawdown stop             |
| Fee bleed                | Net-negative after fees      | Wider grids, fewer cycles |
| No balance guardrail     | Forced partial liquidation   | Block orders under buffer |

## FAQ

**Q: Are grid bots safe?**
A: Safer than naked leveraged trading, but not safe by default. Safety comes from low leverage, wide ranges, and external guardrails — not from the bot itself.

**Q: Why did my grid "make money" then suddenly lose it all?**
A: Likely a trending move outside your range with no stop and/or high leverage. Cycles profit in chop; trends reverse it violently.

**Q: What leverage should I use?**
A: 1x–2x for survivability. Higher leverage amplifies liquidation risk far more than it amplifies profit you'll keep.

**Q: Can a grid bot recover on its own?**
A: Sometimes, in a returning range. But a trend can keep going past your margin. Don't rely on recovery — set guardrails.

## Watch the guardrails automatically

The five countermeasures above are exactly what I automated. [GridLens](https://gridlens.vercel.app) monitors margin health, flags grids stuck outside range, and alerts before liquidation — the survivor checklist, on by default.

*This is not financial advice. Grid and futures trading involve substantial risk of loss, including liquidation. Trade only what you can afford to lose.*
