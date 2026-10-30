---
title: Subqueries, CTEs and recursion
short: Subqueries & CTEs
subject: sql
group: Foundations
order: 4
summary: Scalar, IN, EXISTS and correlated subqueries, the NOT IN with NULL trap, CTEs for readable step-by-step queries, and recursive CTEs for hierarchies and date spines.
minutes: 13
---

Medium-level problems are rarely one SELECT. You build them in steps. **CTEs** (`WITH` blocks) make those steps readable, which interviewers notice. You should also know the **NOT IN + NULL** trap and when a correlated subquery is slow.

## 1. Kinds of subquery

| Kind | Returns | Example use |
|---|---|---|
| **Scalar** | One value | Compare with the average: `WHERE salary > (SELECT AVG(salary) FROM employees)` |
| **IN / NOT IN** | A list | `WHERE dept_id IN (SELECT id FROM departments WHERE name LIKE 'D%')` |
| **EXISTS / NOT EXISTS** | True/false per row | "Has at least one order" |
| **Correlated** | Re-evaluated for each outer row | Compare each employee with their own department's average |
| **Derived table** | A table in FROM | `FROM (SELECT ...) AS t` |

```sql run db=emp
-- Correlated: employees paid above their own department's average
SELECT e.name, e.dept_id, e.salary
FROM employees e
WHERE e.salary > (SELECT AVG(salary) FROM employees x WHERE x.dept_id = e.dept_id);
```

:::analogy
A correlated subquery is like asking "is this student above their own class average?" For every student, you go back and compute their class's average. Clear, but potentially slow on big tables; a window function (`AVG(salary) OVER (PARTITION BY dept_id)`) does it in one pass.
:::

## 2. The NOT IN + NULL trap

`x NOT IN (1, 2, NULL)` means `x <> 1 AND x <> 2 AND x <> NULL`. The last part is UNKNOWN, so the whole condition is never TRUE, and **no rows come back**.

```sql run db=emp
-- Departments with nobody in them?  Returns NOTHING, because one dept_id is NULL (Om).
SELECT name FROM departments
WHERE id NOT IN (SELECT dept_id FROM employees);
```

:::solution[Show the fix]
Use NOT EXISTS (NULL-safe), or filter NULLs out of the subquery.

```sql run db=emp
SELECT d.name FROM departments d
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.dept_id = d.id);
```
:::

:::remember
**Prefer NOT EXISTS (or LEFT JOIN … IS NULL) over NOT IN.** It's NULL-safe and usually optimised just as well.
:::

## 3. CTEs: name each step

A CTE (Common Table Expression) is a named, temporary result you can refer to below it. Write the query as a story: step 1, step 2, answer.

```sql run db=shop
WITH completed AS (                       -- step 1: only completed orders
  SELECT customer_id, amount FROM orders WHERE status = 'completed'
),
per_customer AS (                         -- step 2: spend per customer
  SELECT customer_id, SUM(amount) AS spend, COUNT(*) AS n_orders
  FROM completed GROUP BY customer_id
)
SELECT c.name, p.spend, p.n_orders        -- step 3: answer
FROM per_customer p JOIN customers c ON c.id = p.customer_id
WHERE p.spend > (SELECT AVG(spend) FROM per_customer)
ORDER BY p.spend DESC;
```

:::trap
**CTE vs subquery vs temp table?** CTEs and subqueries are usually equally fast (most engines inline CTEs). CTEs win on readability and reuse within one query. For a result reused across several queries, or very heavy intermediate results, a temp table can be better. In an interview, CTEs make your thinking visible.
:::

## 4. Recursive CTEs

A recursive CTE has an **anchor** (starting rows) and a **recursive part** that refers to the CTE itself, repeated until no new rows appear.

### Org chart: everyone under a manager, with their level

```sql run db=emp
WITH RECURSIVE chain AS (
  SELECT id, name, manager_id, 0 AS level          -- anchor: the boss
  FROM employees WHERE name = 'Neha'
  UNION ALL
  SELECT e.id, e.name, e.manager_id, c.level + 1   -- recursive: their reports
  FROM employees e JOIN chain c ON e.manager_id = c.id
)
SELECT name, level FROM chain ORDER BY level, name;
```

### Date spine: one row per day (to fill gaps with zeros)

```sql run db=sales
WITH RECURSIVE days(d) AS (
  SELECT '2026-03-01'
  UNION ALL
  SELECT date(d, '+1 day') FROM days WHERE d < '2026-03-08'
)
SELECT days.d, COALESCE(s.revenue, 0) AS south_revenue
FROM days
LEFT JOIN daily_sales s ON s.sale_date = days.d AND s.region = 'South'
ORDER BY days.d;
```

March 4 now shows 0 instead of being silently absent. PostgreSQL has `generate_series('2026-03-01'::date, '2026-03-08', interval '1 day')` for the same job.

:::say
"I write multi-step queries as CTEs so each step is testable and readable. For existence checks I use EXISTS and NOT EXISTS; I avoid NOT IN with a subquery because a single NULL makes it return nothing. Correlated subqueries are fine for clarity but can be slow, so I often replace them with a window function. Recursive CTEs handle hierarchies like org charts and generating date spines to fill missing days."
:::
