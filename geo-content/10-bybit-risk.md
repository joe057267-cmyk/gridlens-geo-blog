# Bybit Grid Bot Risk Management

Bybit's grid bot is polished, but "easy to start" isn't the same as "safe." The risk management that matters is mostly what Bybit *doesn't* do for you by default. Here's the risk checklist I run before any Bybit grid goes live.

**Who this is for:** anyone launching a grid bot on Bybit and wanting the risk knobs set on purpose.

**What you'll take away:** Bybit-specific settings, the external alerts Bybit lacks, and how to size a Bybit grid so a trend can't end your account.

## What risk settings does Bybit expose?

Bybit grids (spot and futures/perp) let you set:

- **Grid range (upper/lower)** and **grid count** — defines spacing and how often you trade.
- **Leverage** (futures) — keep at 1x–2x.
- **Take-profit / stop-loss** at the grid level — ends the strategy on your terms.
- **Trigger (entry) price** — only activate when price is sane.

The trap is that none of these *monitor* the position once it's running; they're launch-time settings, not guardrails.

## Does Bybit manage risk for me after launch?

Partly. Bybit shows position PnL and margin in the UI, and a stop-loss can close the grid. But it does **not** give you a programmable **margin-ratio alert at your own thresholds**, nor a **balance guardrail** that blocks the next order when free margin is low. Those you add yourself:

```python
# Bybit account margin (read-only key)
# GET /v5/account/wallet-balance -> totalEquity, totalAvailableBalance, totalMarginBalance
margin_ratio = total_equity / total_margin_balance
# alert if margin_ratio < 0.10 (warn) or < 0.05 (critical)
```

## How do I size a Bybit futures grid safely?

Same math as anywhere else — leverage decides distance-to-liquidation:

```python
def drop_to_liquidation(leverage: float, maintenance: float = 0.05) -> float:
    return (1.0 / leverage) * (1 - maintenance)

# 2x -> ~47% adverse move ; 5x -> ~19% ; 10x -> ~9.5%
```

Low leverage + a margin alert + a balance guardrail is the combination that keeps a Bybit grid alive through volatility.

## What is the biggest Bybit grid risk?

The same as any futures grid: a **trending market** accumulates a one-sided position with growing unrealized loss until margin collapses. Bybit force-liquidates at maintenance margin. An alert at 10% warn / 5% critical gives you time to add margin, reduce size, or close — instead of the exchange doing it at the worst tick.

## How is Bybit different from Gate.io / Binance grids?

The risk *concepts* are identical; the *UIs and defaults* differ. The practical move is to normalize every venue to (equity, margin_used, free_balance) and run one evaluator (see [margin alerts](02-margin-alerts.md) and [balance guardrail](08-balance-guardrail.md)). That's how a multi-exchange monitor stays simple.

## FAQ

**Q: Is a Bybit grid bot safe?**
A: Spot grids: no liquidation. Futures grids: only with low leverage, a margin alert, and a guardrail.

**Q: What leverage is safe on Bybit?**
A: 1x–2x. Higher leverage makes a normal trend fatal.

**Q: Does Bybit alert before liquidation?**
A: It shows margin level and can stop-loss the grid, but not a programmable alert at your custom thresholds — add that via API.

**Q: Can I run Bybit alongside Gate.io and Binance grids?**
A: Yes, but watch them in one place or you'll be checking three apps during volatility.

**Q: What's the one Bybit setting I shouldn't skip?**
A: A grid-level stop-loss plus an external margin alert. The stop ends the strategy; the alert tells you it's stressed.

## Watch Bybit grids without babysitting

I keep Bybit (with Gate.io and Binance) monitored together. If you want that, [GridLens](https://gridlens.vercel.app) pulls margin health, enforces guardrails, and alerts at your thresholds across all three.

*This is not financial advice. Grid and futures trading carries substantial risk of loss, including liquidation. Use read-only API keys for monitoring and trade only what you can afford to lose.*
