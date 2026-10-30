---
title: Dates, strings, NULLs and speed
short: Dates, strings & performance
subject: sql
group: Interview patterns
order: 3
summary: The everyday toolkit. Date functions in each dialect, string functions and pattern matching, COALESCE and NULLIF, median and percentiles, and how to make a slow query fast.
minutes: 12
---

This page collects the small functions that trip people up under time pressure, plus the "how would you speed this up?" follow-up.

## 1. Dates across dialects

| Task | PostgreSQL / Snowflake | MySQL | SQLite (this app) |
|---|---|---|---|
| Truncate to month | `DATE_TRUNC('month', d)` | `DATE_FORMAT(d, '%Y-%m-01')` | `strftime('%Y-%m-01', d)` |
| Year / month number | `EXTRACT(YEAR FROM d)` | `YEAR(d)`, `MONTH(d)` | `strftime('%Y', d)` |
| Add days | `d + INTERVAL '7 days'` | `DATE_ADD(d, INTERVAL 7 DAY)` | `date(d, '+7 days')` |
| Days between | `d2 - d1` (Snowflake: `DATEDIFF('day', d1, d2)`) | `DATEDIFF(d2, d1)` | `julianday(d2) - julianday(d1)` |
| Today | `CURRENT_DATE` | `CURDATE()` | `date('now')` |
| Day of week | `EXTRACT(DOW FROM d)` | `DAYOFWEEK(d)` | `strftime('%w', d)` (0 = Sunday) |

:::trap
**Filtering a date range with timestamps.** `WHERE created_at BETWEEN '2026-03-01' AND '2026-03-31'` misses most of March 31, because `'2026-03-31'` means midnight. Use a half-open range: `created_at >= '2026-03-01' AND created_at < '2026-04-01'`.
:::

```sql run db=shop
-- Orders in the last 30 days of the data, by weekday
SELECT CASE strftime('%w', order_date) WHEN '0' THEN 'Sun' WHEN '6' THEN 'Sat' ELSE 'Weekday' END AS day_type,
       COUNT(*) AS orders
FROM orders
WHERE order_date >= date((SELECT MAX(order_date) FROM orders), '-30 days')
GROUP BY day_type;
```

## 2. Strings

| Task | Function |
|---|---|
| Upper / lower case | `UPPER(s)`, `LOWER(s)` |
| Trim spaces | `TRIM(s)` |
| Part of a string | `SUBSTR(s, start, length)` (1-based) |
| Join strings | `s1 || s2` (standard, SQLite, PostgreSQL); `CONCAT(s1, s2)` (MySQL, most others) |
| Pattern match | `s LIKE 'A%'` (% = any characters, _ = one character) |
| Regex | `REGEXP_LIKE` / `~` (PostgreSQL) / `REGEXP` (MySQL) |
| List in one cell | `STRING_AGG(s, ', ')` (PostgreSQL), `GROUP_CONCAT(s)` (MySQL, SQLite), `LISTAGG` (Snowflake) |

```sql run db=emp
-- "Fix names" style: first letter upper, rest lower; plus a list of people per department
SELECT d.name AS department,
       GROUP_CONCAT(UPPER(SUBSTR(e.name, 1, 1)) || LOWER(SUBSTR(e.name, 2)), ', ') AS people,
       SUM(CASE WHEN e.name LIKE '%a' THEN 1 ELSE 0 END) AS names_ending_in_a
FROM employees e JOIN departments d ON d.id = e.dept_id
GROUP BY d.name;
```

## 3. Median and percentiles

PostgreSQL/Snowflake: `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary)`. In engines without it (MySQL, SQLite), use row numbers:

```sql run db=emp
WITH r AS (
  SELECT salary,
         ROW_NUMBER() OVER (ORDER BY salary) AS rn,
         COUNT(*) OVER () AS n
  FROM employees
)
SELECT AVG(salary) AS median_salary
FROM r
WHERE rn IN ((n + 1) / 2, (n + 2) / 2);    -- the middle row, or the two middle rows
```

:::worked
12 salaries: $(n+1)/2 = 6$ and $(n+2)/2 = 7$ (integer division), so it averages the 6th and 7th values. With 11 rows both give 6, so it returns the single middle value.
:::

## 4. Making a slow query fast

What interviewers want to hear, roughly in order of impact:

1. **Read less data**: select only needed columns (no `SELECT *` on wide tables); filter early in WHERE; on partitioned tables (date partitions in BigQuery, Snowflake, Databricks/Delta), filter on the partition column so whole partitions are skipped.
2. **Make filters index-friendly ("sargable")**: `WHERE order_date >= '2026-03-01'` can use an index; `WHERE strftime('%Y', order_date) = '2026'` wraps the column in a function and can't (in most row-store databases).
3. **Indexes** on columns used in joins, WHERE and ORDER BY (row-store databases like PostgreSQL/MySQL). Columnar warehouses use clustering/partitioning instead.
4. **Aggregate before joining** to shrink tables, and check join keys aren't causing a fan-out.
5. **Avoid row-by-row work**: replace correlated subqueries with joins or window functions.
6. **UNION ALL instead of UNION** when duplicates are impossible or acceptable.
7. **EXISTS instead of COUNT(*) > 0** when you only need to know whether something exists.
8. **Read the plan**: `EXPLAIN` / `EXPLAIN ANALYZE` shows full scans, join types and where time goes.

```sql run db=shop
EXPLAIN QUERY PLAN
SELECT c.name, SUM(o.amount)
FROM customers c JOIN orders o ON o.customer_id = c.id
WHERE o.order_date >= '2026-03-01'
GROUP BY c.name;
```

:::say
"I use half-open date ranges, NULLIF for safe division and COALESCE for defaults, and I know the date functions differ by dialect, mainly DATE_TRUNC versus DATE_FORMAT and how to take date differences. For a slow query, I first check the plan with EXPLAIN, then reduce the data read: needed columns only, filters on partition or indexed columns written without wrapping the column in a function, aggregating before joins, and replacing correlated subqueries with window functions."
:::
