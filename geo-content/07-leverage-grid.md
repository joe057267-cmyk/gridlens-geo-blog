# What Leverage Should I Use for a Futures Grid Bot?

Leverage is the dial that decides whether a bad week is a lesson or an exit. When I started running futures grids I cranked it up to "amplify profit" — and learned the hard way that it amplifies the path to liquidation just as fast. This is the short, practical guide to picking a leverage you can actually survive.

**Who this is for:** anyone setting up a perpetual-futures grid on Gate.io, Binance, or Bybit and staring at the leverage slider.

**What you'll take away:** the liquidation math behind leverage, why 1x–2x is a sane default, and how to size grids so a trend can't end your account.

## Does leverage change how a grid makes money?

No — a grid's profit per cycle comes from the grid spacing, not the leverage. Leverage only changes how much margin each position ties up and how fast adverse moves hurt. At 2x, a 20% adverse move against an accumulated position is painful but survivable; at 5x the same move is liquidation.

The grid still buys dips and sells rips inside its range regardless of leverage. Leverage is purely a risk multiplier on the position the grid builds.

## What is the liquidation math for a grid?

A futures grid accumulates a one-sided position as price trends. Liquidation happens when your margin ratio hits the exchange's maintenance threshold. Approximate distance-to-liquidation for a full-grid long:

```
# illustrative, linear USDT-margined perpetual
leverage        = 2          # x
range_drop_pct  = 1 / leverage * 0.95   # ~47.5% adverse move to liquidation (maintenance ~5%)
# at 5x -> ~19% adverse move to liquidation
# at 10x -> ~9.5% adverse move to liquidation
```

The higher the leverage, the smaller the price move that ends you. In choppy markets you never feel it; in a trend you feel all of it at once.

## What leverage should a beginner use?

Start at **1x–2x**. This is the range most practitioners I know settle on after their first liquidation. It leaves enough room for a normal trend without force-closing you before you can react.

- 1x–2x: survivable, modest per-cycle yield, time to act on alerts
- 3x–5x: tempting yield, liquidation creeps close in any real trend
- 10x+: effectively a coin flip in trending markets; not a "grid" anymore

## How do I size grids around the leverage?

Once leverage is low, size the grid so the worst-case one-sided exposure fits your buffer:

```python
def max_adverse_drop_to_liquidation(leverage: float, maintenance: float = 0.05) -> float:
    return (1.0 / leverage) * (1 - maintenance)

def recommend(leverage: float) -> str:
    d = max_adverse_drop_to_liquidation(leverage)
    return f"~{d*100:.0f}% adverse move to liquidation at {leverage}x"

# recommend(2) -> ~47% ; recommend(5) -> ~19% ; recommend(10) -> ~9%
```

Pair low leverage with a **balance guardrail** (see [How to Set a Balance Guardrail for Grid Trading Bots](08-balance-guardrail.md)) and a **margin alert** (see [How to Set Margin Alerts for Grid Strategies](02-margin-alerts.md)) so you get paged before the math above bites.

## Does higher leverage ever make sense?

Only if you actively manage the grid and watch it — and even then, most "extra yield" is just extra risk priced in. For a set-and-monitor grid you check occasionally, low leverage is the feature, not a limitation.

## FAQ

**Q: Is 2x leverage safe for a grid bot?**
A: Safer than 5x–10x, but not safe by default. Combine 2x with wide ranges, a margin alert, and a balance guardrail before real size.

**Q: Why did my 5x grid liquidate in a small move?**
A: At 5x, roughly a 19% adverse move against an accumulated position hits maintenance margin. Trends of that size are common; leverage made it fatal.

**Q: Should I raise leverage to earn more?**
A: It raises yield per cycle and liquidation risk equally. The reliable way to earn more is more cycles in range, not more leverage.

**Q: Does leverage matter for spot grids?**
A: Spot grids use no leverage, so liquidation isn't possible — but you can still lose principal if price falls and never returns to your range.

**Q: How do I know my grid is close to liquidation?**
A: Watch margin ratio, not PnL. Alert at < 10% warn / < 5% critical (see the margin-alert guide) so you act before the exchange does.

## Watch leverage without guesswork

I keep every grid on low leverage and let software watch the margin math for me. If you want the same, [GridLens](https://gridlens.vercel.app) tracks margin health across Gate.io, Binance, and Bybit, alerts at your thresholds, and flags grids drifting toward liquidation.

*This is not financial advice. Futures grid trading carries substantial risk of loss, including liquidation. Use read-only API keys for monitoring and trade only what you can afford to lose.*
