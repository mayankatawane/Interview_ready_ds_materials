---
title: How a SQL query really runs
short: Query order, WHERE vs HAVING, NULLs
subject: sql
group: Foundations
order: 1
summary: Start here for SQL. The order the database actually runs your clauses, why that explains most errors, WHERE vs HAVING, how NULL behaves, and how to use the live SQL boxes in this app.
minutes: 14
---

Most SQL interview mistakes come from one misunderstanding: we **write** a query top to bottom, but the database **runs** it in a different order. Once you see that order, rules like "you can't use an alias in WHERE" or "you can't filter on a window function directly" stop being rules to memorise and become obvious.

## 1. How to use the SQL boxes in this app

Every grey box marked **SQL · try it** is a real database running inside your browser (SQLite). You can edit the query and press **▶ Run** (or Ctrl/Cmd + Enter). **Tables** shows all the data; **Reset** puts the original query back. It works on your phone too, and nothing is sent anywhere.

```sql run db=emp
SELECT name, salary
FROM employees
WHERE salary > 120000
ORDER BY salary DESC;
```

There are five small practice databases used across the SQL pages:

| Database | Tables | Used for |
|---|---|---|
| `emp` | departments, employees | Joins, ranking, top-N, self-joins |
| `shop` | customers, orders, products, order_items | Aggregation, anti-joins, first orders |
| `activity` | logins, events | Streaks, retention, funnels |
| `sales` | daily_sales | Running totals, moving averages, LAG |
| `rx` | hcps, rx | Pharma-style practice: growth, top prescribers |

:::note
**Dialects.** Interviews are usually in PostgreSQL, MySQL, Snowflake/BigQuery or Spark SQL. The ideas are identical; mainly **date functions** differ. SQLite (used here) writes `date(d, '+1 day')` and `julianday(a) - julianday(b)`; MySQL uses `DATE_ADD` and `DATEDIFF`; PostgreSQL uses `d + INTERVAL '1 day'` and `a - b`. Each page notes the differences where they matter.
:::

## 2. The order a query actually runs

::viz{name="sql-order"}

| Step | Clause | What it does |
|---|---|---|
| 1 | **FROM / JOIN** | Get the tables and combine them |
| 2 | **WHERE** | Keep or drop individual **rows** |
| 3 | **GROUP BY** | Put rows into buckets |
| 4 | **HAVING** | Keep or drop whole **groups** (can use aggregates) |
| 5 | **SELECT** | Compute output columns, give aliases, run **window functions** |
| 6 | **DISTINCT** | Remove duplicate output rows |
| 7 | **ORDER BY** | Sort (can use aliases) |
| 8 | **LIMIT / OFFSET** | Keep the first N rows |

:::remember
**"Fat Whales Grow Huge, So Don't OverLoad them"** = FROM, WHERE, GROUP BY, HAVING, SELECT, DISTINCT, ORDER BY, LIMIT.
:::

### Three errors this order explains

1. **Alias in WHERE fails**: `WHERE annual > 100000` when `annual` is defined in SELECT. WHERE runs at step 2; the alias is created at step 5. Repeat the expression or wrap the query in a CTE.
2. **Aggregate in WHERE fails**: `WHERE COUNT(*) > 2`. Groups don't exist yet at step 2. Use HAVING.
3. **Window function in WHERE fails**: `WHERE ROW_NUMBER() OVER (...) = 1`. Window functions run at step 5. Compute them in a CTE, then filter outside (or use `QUALIFY` in Snowflake/BigQuery/Databricks).

Try the broken version, read the error, then fix it:

```sql run db=emp
-- Broken on purpose: the alias doesn't exist yet when WHERE runs.
SELECT name, salary / 12 AS monthly
FROM employees
WHERE monthly > 10000;
```

:::solution[Show the fix]
SQLite is lenient and actually lets this run, but PostgreSQL, MySQL and SQL Server throw an error, so in an interview write it the portable way:

```sql run db=emp
SELECT name, salary / 12 AS monthly
FROM employees
WHERE salary / 12 > 10000;      -- repeat the expression (or use a CTE)
```
:::

## 3. WHERE vs HAVING

- **WHERE** filters **rows before** grouping. Cheaper: fewer rows to group.
- **HAVING** filters **groups after** grouping, so it can use `COUNT`, `SUM`, `AVG`.

```sql run db=emp
-- Departments with at least 3 people hired from 2020 onwards
SELECT dept_id, COUNT(*) AS n
FROM employees
WHERE hire_date >= '2020-01-01'     -- row filter
GROUP BY dept_id
HAVING COUNT(*) >= 3;                -- group filter
```

:::trap
**Can HAVING be used without GROUP BY?** Yes: the whole table is treated as one group. And putting a non-aggregate row condition in HAVING instead of WHERE usually still works but is slower, because grouping happens on more rows. Interviewers like this "why WHERE first" point.
:::

## 4. NULL: the value that isn't a value

NULL means **unknown / missing**. Any comparison with NULL gives **UNKNOWN**, not TRUE or FALSE, and WHERE only keeps rows that are TRUE. This is **three-valued logic**.

| Expression | Result |
|---|---|
| `NULL = NULL` | UNKNOWN (not TRUE!) |
| `NULL <> 5` | UNKNOWN |
| `NULL IS NULL` | TRUE |
| `5 + NULL` | NULL |
| `TRUE OR NULL` | TRUE |
| `FALSE AND NULL` | FALSE |

```sql run db=emp
SELECT name, dept_id
FROM employees
WHERE dept_id <> 1;        -- Om (dept_id NULL) disappears too!
```

Om has no department, so `NULL <> 1` is UNKNOWN and he's dropped. To keep him: `WHERE dept_id <> 1 OR dept_id IS NULL`, or `WHERE COALESCE(dept_id, -1) <> 1`.

### NULL in aggregates

- `COUNT(*)` counts rows. `COUNT(col)` counts **non-NULL** values. `COUNT(DISTINCT col)` counts distinct non-NULL values.
- `SUM`, `AVG`, `MIN`, `MAX` **ignore** NULLs. So `AVG(col)` divides by the non-NULL count, not all rows.
- `SUM` of no rows (or only NULLs) is NULL, not 0. Use `COALESCE(SUM(x), 0)`.

```sql run db=emp
SELECT COUNT(*)            AS all_rows,
       COUNT(dept_id)      AS with_dept,
       COUNT(manager_id)   AS with_manager,
       COUNT(DISTINCT dept_id) AS distinct_depts
FROM employees;
```

:::trap
**Useful NULL helpers.** `COALESCE(a, b, c)` returns the first non-NULL. `NULLIF(a, b)` returns NULL when a = b, which is the standard way to avoid division by zero: `revenue / NULLIF(orders, 0)`.
:::

## 5. Integer division and other small traps

- In SQLite, PostgreSQL and SQL Server, `int / int` is **integer division**: `3 / 4 = 0`. Multiply by `1.0` first: `100.0 * a / b`. (MySQL returns a decimal.)
- `ORDER BY` without a tie-breaker gives an unpredictable order among ties. Add a unique column (e.g. `ORDER BY salary DESC, id`).
- `SELECT DISTINCT a, b` makes the **pair** distinct, not each column.
- `UNION` removes duplicates (and sorts, so it's slower); `UNION ALL` keeps everything. Use `UNION ALL` unless you need de-duplication.

```sql run db=shop
SELECT COUNT(*) AS completed,
       (SELECT COUNT(*) FROM orders) AS total,
       COUNT(*) / (SELECT COUNT(*) FROM orders)          AS wrong_rate,
       ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM orders), 1) AS pct_completed
FROM orders
WHERE status = 'completed';
```

:::say
"SQL runs in a logical order: FROM and joins, WHERE, GROUP BY, HAVING, SELECT including window functions, DISTINCT, ORDER BY, LIMIT. That's why I can't use a SELECT alias or a window function in WHERE, and why aggregates are filtered with HAVING. I also watch for NULLs, since comparisons with NULL are unknown and get filtered out, COUNT of a column skips NULLs, and I use NULLIF to avoid dividing by zero and multiply by 1.0 to avoid integer division."
:::
