# The Risk Boundaries of Using an AI Agent to Manage Crypto Assets

AI agents that can read your exchange account and even act on it are arriving fast. I've wired one to my own grids — read-only — and the line between "helpful" and "dangerous" is entirely in how you scope permissions. Here are the boundaries I refuse to cross.

## What can an AI agent actually do with your account?

With API access it can read balances, positions, and PnL; place or cancel orders; and move funds depending on the key's permissions. The risk is not the model's intelligence — it's the permission scope you hand it. An agent is only as safe as the key behind it.

## Rule 1: Read-only is non-negotiable for monitoring

For anything that just watches your account — margin health, drawdown, stuck grids — use a **read-only API key**. It cannot place orders or move funds, so the worst an agent can do is see your numbers. Never grant trading or withdrawal permission to a monitoring agent.

[占位：列出你实际使用的交易所及其只读 key 创建入口；Gate/Binance/Bybit 均支持只读权限。]

## Rule 2: Define guardrails before granting access

Before an agent can act, specify exactly what it may and may not do:

- Allowed: alert, pause a grid, reduce size
- Forbidden: open new directional exposure, change leverage, withdraw

Write these as explicit checks, not vibes. An agent without a written boundary will invent one under pressure.

## Rule 3: Alerting is not acting

The safest agent tier only notifies you. It computes margin ratio, drawdown, and range status, then pings you — you make the close/add-margin decision. This keeps a human in the loop for irreversible actions.

```python
# Agent tier: alert-only
def agent_decision(health):
    if health.margin_ratio < 0.05:
        return ("ALERT", "Margin critical — human action required")
    if health.out_of_range:
        return ("ALERT", "Grid stuck outside range")
    return ("OK", None)
# No order placement in this tier. Ever.
```

## Rule 4: Keep the human-in-the-loop for irreversible actions

Closing a grid, adding margin, or changing leverage are market-timed and hard to undo. Even a trusted agent should request, not execute, these. Auto-execution is fine for non-destructive ops (like pausing new orders under a balance guardrail) but not for ones that realize losses.

## Rule 5: Audit everything

Log every agent read and action with a timestamp. If the agent misbehaves you need a trail. A monitoring agent that doesn't log is a black box you can't debug after a bad day.

## Sample permission scope

```
exchange_api_key:
  permissions:
    - read:balances
    - read:positions
    - read:orders
  denied:
    - trade
    - withdraw
agent:
  can: [alert, pause_new_orders]
  cannot: [open_position, close_position, withdraw, change_leverage]
```

[占位：把上面权限骨架换成你实际授权的字段；不同交易所权限字段命名不同。]

## FAQ

**Q: Is it safe to let an AI agent access my exchange?**
A: Only with a read-only key and a written scope. Trading/withdrawal permission to an agent is how accounts get drained.

**Q: Can an AI agent prevent liquidation?**
A: It can alert you early and, if you allow it, pause new orders under a guardrail. It should not be the sole thing standing between you and liquidation — keep your own thresholds.

**Q: Should the agent be allowed to close positions automatically?**
A: Not at first. Start alert-only, watch its judgment, then consider auto-pause of non-destructive ops. Auto-close realizes loss at a tick you didn't choose.

**Q: What's the minimum safe setup?**
A: Read-only key + alert-only agent + your own margin/drawdown thresholds. That combo gives you oversight without handing over the keys.

## A monitored, scoped setup without building it yourself

I run exactly this boundary. [GridLens](https://gridlens.vercel.app) connects with read-only keys, computes margin and drawdown health, and alerts — no trading or withdrawal permission ever requested.

*This is not financial advice. AI agents and automated trading carry risk. Use read-only API keys, scope permissions tightly, and never grant withdrawal access to automation.*
