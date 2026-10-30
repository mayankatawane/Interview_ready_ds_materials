---
title: LAG and LEAD for change over time
short: LAG, LEAD & growth
subject: sql
group: Window functions
order: 4
summary: Comparing each row with the previous or next one. Month-over-month growth, day-over-day changes, time between events, duplicate detection within a time window, and the missing-period trap.
minutes: 12
---

Whenever a question says "compared with the previous…", "growth", "change", "time since last…" or "next event", reach for **LAG** (look back) or **LEAD** (look forward).

## 1. What they do

```sql
LAG(column, n, default)  OVER (PARTITION BY ... ORDER BY ...)   -- value n rows BEFORE
LEAD(column, n, default) OVER (PARTITION BY ... ORDER BY ...)   -- value n rows AFTER
```

- `n` defaults to 1. `default` is returned when there's no such row (otherwise NULL).
- ORDER BY inside OVER defines what "previous" means. Always include it.

::viz{name="lag-arrows"}

## 2. Period-over-period growth

$$
\text{growth \%} = \frac{\text{this period} - \text{previous period}}{\text{previous period}} \times 100
$$

:::symbols
- "this period" = the current row's value, e.g. March revenue.
- "previous period" = `LAG(value)`, e.g. February revenue.
- If the previous value is 0, growth is undefined, so wrap it in `NULLIF(…, 0)`.
:::

Aggregate first (GROUP BY month), then LAG over the aggregated rows:

```sql run db=rx
SELECT brand, month,
       SUM(trx) AS trx,
       LAG(SUM(trx)) OVER (PARTITION BY brand ORDER BY month) AS prev_trx,
       ROUND(100.0 * (SUM(trx) - LAG(SUM(trx)) OVER (PARTITION BY brand ORDER BY month))
             / NULLIF(LAG(SUM(trx)) OVER (PARTITION BY brand ORDER BY month), 0), 1) AS mom_growth_pct
FROM rx
GROUP BY brand, month
ORDER BY brand, month;
```

:::worked
Brand A: January 83, February 107. Growth $= (107 - 83) / 83 = 24 / 83 = 0.289$ → **28.9%**. January has no previous month, so its growth is NULL.
:::

## 3. Day-over-day: "Rising temperature"

LeetCode 197 asks for days warmer than the previous day. Same idea with our sales:

```sql run db=sales
WITH t AS (
  SELECT sale_date, revenue,
         LAG(revenue)   OVER (ORDER BY sale_date) AS prev_rev,
         LAG(sale_date) OVER (ORDER BY sale_date) AS prev_date
  FROM daily_sales WHERE region = 'South'
)
SELECT sale_date, revenue, prev_rev, prev_date
FROM t
WHERE revenue > prev_rev
  AND julianday(sale_date) - julianday(prev_date) = 1;     -- must really be the day before
```

:::trap
**LAG gives the previous ROW, not the previous DAY.** South has no March 4, so March 5's LAG is March 3. The question says "the previous day", so check that the dates are exactly 1 day apart (or join the table to itself on `date - 1 day`). That's why March 5 (90 vs 75 on Mar 3) is excluded above.
:::

## 4. Time between events

"Average days between a customer's orders" or "days to second purchase":

```sql run db=shop
WITH t AS (
  SELECT customer_id, order_date,
         ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date) AS n,
         julianday(order_date)
           - julianday(LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date)) AS days_since_prev
  FROM orders
)
SELECT customer_id,
       MAX(CASE WHEN n = 2 THEN days_since_prev END) AS days_to_2nd_order,
       ROUND(AVG(days_since_prev), 1)                AS avg_gap_days
FROM t
GROUP BY customer_id;
```

Date differences by dialect: SQLite `julianday(a) - julianday(b)`; MySQL `DATEDIFF(a, b)`; PostgreSQL `a - b` (dates) or `EXTRACT(EPOCH FROM a - b)` (timestamps); Snowflake `DATEDIFF('day', b, a)`.

## 5. Sessions and duplicate detection

LAG on timestamps answers "same card charged the same amount within 10 minutes" (possible duplicate payment) or "new session if more than 30 minutes since the last event":

```sql run db=activity
WITH t AS (
  SELECT user_id, event, event_time,
         (julianday(event_time) - julianday(LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time))) * 24 * 60
           AS minutes_since_prev
  FROM events
)
SELECT user_id, event, event_time, ROUND(minutes_since_prev, 1) AS minutes_since_prev,
       CASE WHEN minutes_since_prev IS NULL OR minutes_since_prev > 10 THEN 1 ELSE 0 END AS new_session
FROM t
WHERE user_id IN (1, 2, 8);
```

A running `SUM(new_session) OVER (PARTITION BY user_id ORDER BY event_time)` then numbers the sessions.

:::say
"LAG and LEAD fetch a value from the previous or next row within a partition ordered by time. I aggregate to the right grain first, then use LAG for month-over-month growth, wrapping the denominator in NULLIF to avoid dividing by zero. I remember LAG returns the previous row, not the previous calendar period, so I check the date gap or use a date spine. LEAD is handy for time until the next event, and LAG on timestamps for sessionisation and duplicate detection."
:::
