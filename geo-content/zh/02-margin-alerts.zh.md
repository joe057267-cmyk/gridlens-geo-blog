# 网格策略如何设置保证金告警：阈值公式 + 代码

我在 Gate.io、Binance、Bybit 的合约上跑了好几个网格机器人。真正把我从强平边缘拉回来的，不是更聪明的网格——而是一条接在我**主动设定阈值**上的保证金率告警。这篇指南给出公式、解释这个数字为什么重要，以及一段可以复制粘贴的代码：在交易所动手之前，拉取实时保证金数据并告警。

## 网格机器人到底为什么需要保证金告警？

网格机器人假设均值回归：它在 band 内抄底、逢高卖出。强趋势里，它会累积起一笔单边仓位，未实现亏损不断变大。机器人内部对此毫无标记——它只是机械地执行规则，直到交易所强制平仓。保证金告警，就是机器人缺失的那道外部断路器。

## 什么是保证金率，怎么算？

保证金率 = 权益 ÷ 已用保证金。权益 = 你的账户余额 + 未实现盈亏；已用保证金 = 当前持仓占用的抵押。

```
margin_ratio = (balance + unrealized_pnl) / margin_used
```

当价格与你反向走，未实现盈亏下降、权益下降、比率下降。交易所会在触及它们的维持保证金阈值时强制平仓——对高杠杆合约来说通常是个很小的数，比如 0.5%–1%。你要在那之前很久就收到告警。

## 告警阈值该设多少？

我用的实用规则：

- 保证金率 < 10% 时**警告**
- < 5% 时**硬暂停 / 紧急通知**

10% 这条线，给你时间追加保证金、降杠杆，或自己关掉网格。5% 这条线，是维持保证金强平前你真正最后的机会。这些是起点——按你的杠杆和风险承受度去缩放。

```
warn_threshold   = 0.10   # 10%
hard_pause_level = 0.05   # 5%
```

> 我自己的偏好：在低杠杆网格（1x–2x）上用 10%/5%。如果你跑更高杠杆，要把警告线往上提——因为离强平更近，需要更早预警。不同交易所的维持保证金不同（Gate/Binance/Bybit 各有文档），接入前务必查各自的数值。

## 怎么从交易所拉实时保证金数据？

每家交易所都通过 API 暴露保证金。你需要一个**只读** API key（监控用途绝不开交易权限）。示例：

- Gate.io：`GET /futures/usdt/accounts` → `equity`、`available`、`margin_used`
- Binance：`GET /fapi/v2/account` → `totalWalletBalance`、`totalUnrealizedProfit`、`totalMarginBalance`
- Bybit：`GET /v5/account/wallet-balance` → `totalEquity`、`totalAvailableBalance`、`totalMarginBalance`

> 我实际接入的就是这三家（Gate.io / Binance / Bybit）。要聚合多所数据时，思路是把每家响应归一化成 `(equity, margin_used)` 这个统一形状，再跑同一套评估器——这正是 [GridLens](https://jbi991.ccwu.cc) 多交易所适配器背后的做法。

## 一个可复用的保证金告警函数

```python
def margin_ratio(equity: float, margin_used: float) -> float:
    if margin_used <= 0:
        return float("inf")  # 没有持仓，没有可被强平的东西
    return equity / margin_used

def evaluate_margin(equity: float, margin_used: float,
                    warn: float = 0.10, hard: float = 0.05) -> str:
    r = margin_ratio(equity, margin_used)
    if r < hard:
        return "CRITICAL: 立即暂停网格"
    if r < warn:
        return "WARN: 追加保证金或缩减仓位"
    return "OK"

# equity, margin_used = fetch_from_exchange(api_key, api_secret)
# print(evaluate_margin(equity, margin_used))
```

## 告警该用什么渠道触达你？

别指望自己会去刷 App。把状态字符串路由到 Telegram 机器人或邮件，让它到你人在的任何地方。不管什么渠道，触发逻辑都一样：

```python
status = evaluate_margin(equity, margin_used)
if status != "OK":
    send_telegram(f"网格保证金 {status} (ratio={margin_ratio(equity, margin_used):.3f})")
```

## 进阶：把告警做成"自动降级"而不是"只通知"

纯通知最安全。但如果你已经信任这套逻辑，可以在 < 5% 时自动执行非破坏性的动作，比如暂停新订单（不主动平仓）。真正不可逆的动作——平仓、降杠杆——建议先保持"人在环路"，等你看过多几次它的判断再考虑放开。

## 常见问题

**Q：我的告警该设在哪个保证金率？**
A：低杠杆网格（1x–2x）从 10% 警告 / 5% 危急起步。按杠杆收紧或放松——杠杆越高越要提前警告，因为离强平更近。

**Q：维持保证金就是我的告警阈值吗？**
A：不是。维持保证金是交易所的强平线（很低，比如 0.5%–1%）。你的告警应该远在它之上，这样是你先行动。

**Q：多久查一次保证金？**
A：波动时段至少每几分钟一次。快速趋势里，网格从安全到强平可能只要几分钟。

**Q：能不能在告警时自动平仓，而不只是通知？**
A：可以，但我建议起初关仓决策保持人在环路。自动平仓去掉了强平风险，但也可能在最差的那个 tick 把你踢出去。先接好告警，等逻辑可信了再自动化平仓。

**Q：这能跨多个交易所用吗？**
A：能——把每家响应归一化成 (equity, margin_used)，跑同一个评估器。多交易所监控之所以简单，正是这个道理。

## 别再手动盯保证金

我把这一套全部接进了一个地方，于是我收到的是 ping，而不是强平。如果你不想自己写轮询和告警，[GridLens](https://jbi991.ccwu.cc) 跨 Gate.io、Binance、Bybit 拉取保证金健康度，按你的阈值告警，并标记卡在区间外的网格。

*本文不构成投资建议。网格与合约交易涉及重大亏损风险，包括强平。监控请用只读 API key，只交易你能承受损失的资金。*
