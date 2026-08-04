# Crypto Portfolio Drawdown Monitoring — From SQLite to a Real-Time Dashboard

Running one grid bot is easy to watch. Running ten across three exchanges is not. I learned that drawdown — not daily PnL — is the number that tells you if you're about to get hurt. This is how I went from a hand-rolled SQLite logger to a real-time monitor, and what I'd do differently.

## What is drawdown and why does it matter more than PnL?

Drawdown is the distance from your peak equity to your current equity. PnL can look fine day to day while drawdown silently climbs toward a liquidation cliff. Drawdown is the early-warning signal; PnL is the scoreboard.

```
drawdown = (peak_equity - current_equity) / peak_equity
max_drawdown = max over time of drawdown
```

## Why track a portfolio, not just one grid?

A single grid can be green while two others bleed. Portfolio-level drawdown captures the combined margin stress. If you size grids independently you'll underestimate total risk — the exchange sees your whole account, not each bot in isolation.

## The naive approach: SQLite + a cron job

Early on I logged equity every 5 minutes into SQLite and computed drawdown in a nightly query. It worked and taught me the metric. Sketch:

```sql
CREATE TABLE equity_snapshots (
  ts        TIMESTAMPTZ PRIMARY KEY,
  account   TEXT,
  equity    NUMERIC
);

-- peak and current drawdown for one account
WITH ranked AS (
  SELECT ts, equity,
         MAX(equity) OVER (ORDER BY ts) AS peak
  FROM equity_snapshots
  WHERE account = 'gate_main'
)
SELECT ts,
       1 - equity / peak AS drawdown
FROM ranked
ORDER BY ts DESC
LIMIT 1;
```

[占位：把上面 SQL 接到你自己的账户/交易所标识；此例为单账户，多账户需 UNION 或按 account 分组。]

## Why polling breaks at scale

A 5-minute cron is fine for one account. At ten grids across three venues, you're making 30+ calls every cycle, handling rate limits, and still seeing drawdown up to 5 minutes late — exactly when a fast move hurts. Polling is simple but blind between ticks.

## A real-time architecture: Edge Function + Supabase + push

The pattern that scaled for me:

1. An Edge Function pulls each exchange on a short interval (server-side, keys never touch the browser).
2. Normalize to a common shape `(account, equity, margin_used, unrealized)` and upsert into Supabase Postgres.
3. Compute drawdown / margin metrics in the database or a view.
4. Push alerts when thresholds breach — no human polling.

```
[Exchange APIs] --read-only--> [Edge Function] --> [Supabase Postgres]
                                              \--> [metrics view] --> [alert push]
```

This keeps secrets server-side, respects per-exchange rate limits in one place, and makes the dashboard a pure read of computed state.

## A metrics view you can actually query

```sql
CREATE VIEW account_health AS
SELECT account,
       equity,
       margin_used,
       CASE WHEN margin_used > 0
            THEN equity / margin_used ELSE NULL END AS margin_ratio,
       unrealized
FROM latest_equity;
```

[占位：上面是简化视图；真实实现需维护 latest_equity（每账户最新快照）并叠加历史峰值以算 max_drawdown。]

## FAQ

**Q: Should I monitor drawdown per grid or per account?**
A: Both. Per-grid shows which bot is the problem; per-account shows your true liquidation risk, which is what the exchange acts on.

**Q: How often should I sample equity?**
A: Every 1–3 minutes during active trading. Faster than that usually just adds rate-limit pain without catching more risk.

**Q: SQLite or a database?**
A: SQLite is fine to learn the metric. Once you have multiple accounts and want alerts, a hosted Postgres (e.g. Supabase) with server-side fetching saves you from cron and rate-limit sprawl.

**Q: What drawdown level should worry me?**
A: It depends on leverage, but treat a rising drawdown toward your margin-stress zone as the real alarm — not the daily PnL sign.

## See it without building it

I ended up consolidating all of this into one view. [GridLens](https://gridlens.vercel.app) aggregates equity and margin across Gate.io, Binance, and Bybit, computes drawdown and margin health, and pushes alerts — the architecture above, already built.

*This is not financial advice. Futures and grid trading involve substantial risk of loss. Monitor with read-only keys and trade only what you can afford to lose.*
