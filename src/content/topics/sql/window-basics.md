---
title: Window functions, the core idea
short: "Window functions: OVER & PARTITION BY"
subject: sql
group: Window functions
order: 1
summary: What OVER, PARTITION BY and ORDER BY inside a window do, how a window differs from GROUP BY, comparing each row to its group, and why you can't filter on a window function directly.
minutes: 13
---

Window functions are the single most tested SQL topic at medium level. The good news: there's only one idea to understand. **A window function computes something over a group of related rows, but keeps every row.**

## 1. GROUP BY vs window

::viz{name="win-partition"}

| | GROUP BY | Window function |
|---|---|---|
| Rows out | One per group | **Same as rows in** |
| Can show the detail row next to the group value | No | **Yes** |
| Typical question | "Total salary per department" | "Each employee's salary and their department's average" |

:::analogy
GROUP BY is a class photo replaced by one summary card per class. A window function keeps every student's photo and writes their class average in the corner of each one.
:::

## 2. The anatomy of OVER

```sql
function(...) OVER (
    PARTITION BY dept_id        -- which rows are "my group"   (optional)
    ORDER BY salary DESC        -- order inside the group       (optional)
    ROWS BETWEEN ... AND ...    -- which part of the group      (optional: the frame)
)
```

- **PARTITION BY**: splits rows into groups. Without it, the whole table is one group.
- **ORDER BY** (inside OVER): orders rows within each group. Needed for ranking, LAG/LEAD and running totals.
- **Frame**: which rows around the current one to include (see Running totals and frames).

Families of window functions:

| Family | Functions | Needs ORDER BY? |
|---|---|---|
| Aggregate | `SUM`, `AVG`, `COUNT`, `MIN`, `MAX` | No (whole partition) or yes (running) |
| Ranking | `ROW_NUMBER`, `RANK`, `DENSE_RANK`, `NTILE`, `PERCENT_RANK` | Yes |
| Value / offset | `LAG`, `LEAD`, `FIRST_VALUE`, `LAST_VALUE`, `NTH_VALUE` | Yes |

## 3. Compare each row with its group

```sql run db=emp
SELECT name, dept_id, salary,
       AVG(salary) OVER (PARTITION BY dept_id)            AS dept_avg,
       salary - AVG(salary) OVER (PARTITION BY dept_id)   AS diff_from_avg,
       ROUND(100.0 * salary / SUM(salary) OVER (PARTITION BY dept_id), 1) AS pct_of_dept_payroll,
       MAX(salary) OVER ()                                AS company_max
FROM employees
WHERE dept_id IS NOT NULL
ORDER BY dept_id, salary DESC;
```

`OVER ()` with nothing inside = the whole result set, handy for "percent of total".

## 4. Filtering on a window result

Window functions run in the SELECT step, **after** WHERE and HAVING. So you can't write `WHERE salary > AVG(salary) OVER (...)`. Compute first, filter outside:

```sql run db=emp
WITH t AS (
  SELECT name, dept_id, salary,
         AVG(salary) OVER (PARTITION BY dept_id) AS dept_avg
  FROM employees
)
SELECT name, dept_id, salary, ROUND(dept_avg) AS dept_avg
FROM t
WHERE salary > dept_avg;
```

:::trap
**`QUALIFY`.** Snowflake, BigQuery, Databricks and DuckDB let you filter window results directly: `... QUALIFY ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary DESC) = 1`. PostgreSQL, MySQL and SQLite don't: use a CTE. Mention both in interviews.
:::

## 5. Windows after GROUP BY

Aggregates (GROUP BY) are calculated before window functions, so you can window over aggregated values in the same query. Very common for "share of total" and "rank of each group".

```sql run db=shop
SELECT strftime('%Y-%m', order_date) AS month,
       SUM(amount) AS revenue,
       SUM(SUM(amount)) OVER (ORDER BY strftime('%Y-%m', order_date)) AS cumulative_revenue,
       RANK() OVER (ORDER BY SUM(amount) DESC) AS revenue_rank
FROM orders
WHERE status = 'completed'
GROUP BY month
ORDER BY month;
```

:::remember
Order of operations again: **WHERE → GROUP BY → HAVING → window functions → ORDER BY**. So windows see the grouped rows, and you filter windows in an outer query.
:::

## 6. Naming a window

When several functions use the same window, name it once (PostgreSQL, MySQL 8, SQLite):

```sql run db=emp
SELECT name, dept_id, salary,
       RANK()      OVER w AS rnk,
       AVG(salary) OVER w AS running_avg
FROM employees
WHERE dept_id IS NOT NULL
WINDOW w AS (PARTITION BY dept_id ORDER BY salary DESC);
```

:::say
"A window function computes over a set of related rows defined by OVER, but unlike GROUP BY it keeps every row. PARTITION BY defines the group, ORDER BY inside OVER orders rows for ranking, offsets and running totals, and the frame chooses which neighbouring rows to include. Because windows are evaluated after WHERE, GROUP BY and HAVING, I filter on them in an outer query or CTE, or with QUALIFY in Snowflake or BigQuery. And I can window over aggregates, like SUM of SUM for percent of total."
:::
