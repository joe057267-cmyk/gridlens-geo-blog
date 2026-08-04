# How to Set a Balance Guardrail for Grid Trading Bots

A grid bot keeps placing orders as price moves — that's its job. The danger is that it places the *next* order even when your balance is too low to safely support it, quietly pushing you toward forced liquidation. A balance guardrail is a tiny check that blocks new orders when free margin gets thin. This is the exact pattern I run, and the one feature I'd never remove.

**Who this is for:** anyone automating grid bots and wanting a hard floor under order placement.

**What you'll take away:** what a balance guardrail is, the code to enforce it, and how to wire it to an alert instead of a retry loop.

## What is a balance guardrail?

It's a pre-flight check before the bot submits any new grid order: *is there enough free USDT to safely place this order and survive the next move?* If not, the order is blocked and you're notified. It preserves margin instead of letting the bot "try again" and creep past your safety buffer.

## Why does a grid need one?

The bot doesn't know your account balance context — it just follows its grid lines. As price trends, the accumulated position grows and free balance shrinks. Without a guardrail, the bot keeps ordering until maintenance margin is breached and the exchange liquidates. The guardrail moves that decision into your control.

## What threshold should I use?

Pick a **minimum free USDT** you want before any new order. In my setup across ~10 concurrent grids I keep about **$40 USDT** free as a buffer. Size yours to how many grids you run and your per-grid order size.

```python
MIN_FREE_USDT = 40.0   # buffer before any new grid order

def should_place_order(free_balance_usdt: float) -> bool:
    """Block new grid orders when free balance is insufficient."""
    return free_balance_usdt >= MIN_FREE_USDT
```

## How do I wire it into order placement?

Wrap the order call so the guardrail is evaluated every single time — not "most of the time":

```python
def place_if_safe(free_balance_usdt: float, place_order) -> str:
    if not should_place_order(free_balance_usdt):
        return "GUARDRAIL: blocked order, alerting"
    place_order()
    return "OK"
```

## What should happen when it trips?

Alert, then pause. Do **not** retry the order a moment later — the balance hasn't changed, so a retry just defeats the guard. Send a notification and stop new orders until you add margin or close a grid.

```python
if not should_place_order(account.free_balance):
    send_alert("Balance guardrail triggered — pausing new orders")
    pause_grid_orders()
else:
    place_next_grid_order()
```

## How often should the guardrail run?

On every tick, because free balance moves with unrealized PnL. If you only check it hourly, a fast trend can breach the buffer between checks. Evaluate it as often as you evaluate margin (see [How to Set Margin Alerts for Grid Strategies](02-margin-alerts.md)).

## FAQ

**Q: Isn't a balance guardrail the same as a margin alert?**
A: Related but different. The guardrail *prevents* the next risky order; the margin alert *warns* you after the position is already stressed. You want both.

**Q: What if my buffer is too high and it blocks legitimate orders?**
A: Lower `MIN_FREE_USDT` until orders flow normally but you still keep a cushion. It's a tuning knob, not a fixed law.

**Q: Does this work on Binance and Bybit too?**
A: Yes — the logic is exchange-agnostic. Pull free balance from each venue's account endpoint and run the same check.

**Q: Should the guardrail auto-close grids?**
A: Start with block + alert (human-in-the-loop). Auto-close is a later optimization once you trust the thresholds.

**Q: Can a guardrail still let me get liquidated?**
A: It sharply reduces the risk but isn't a cure — a violent move can still hurt an open position. Pair it with a margin alert and low leverage.

## Stop hand-checking balances

I automated the guardrail and stopped watching the app. If you want it without writing the polling yourself, [GridLens](https://gridlens.vercel.app) enforces balance guardrails and margin alerts across Gate.io, Binance, and Bybit, and pings you before the exchange acts.

*This is not financial advice. Grid and futures trading carries substantial risk of loss, including liquidation. Use read-only API keys for monitoring and trade only what you can afford to lose.*
