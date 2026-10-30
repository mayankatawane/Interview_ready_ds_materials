---
title: Practice set — 15 interview-style problems
short: Practice problems
subject: sql
group: Interview patterns
order: 4
summary: Fifteen medium-level problems modelled on the LeetCode SQL 50 classics and DS interview favourites, on this app's own data. Try each in the live box, then open the hint and the solution.
minutes: 40
---

Each problem is modelled on a well-known LeetCode SQL problem (number in brackets) or a common DS interview question, adapted to the practice databases so you can run it here. Work in the **try it** box, then compare with the solution. Aim to say your plan out loud first: that's what interviewers grade.

:::remember
**A plan that works for almost every problem**

1. What's the **grain** of the answer (one row per what)?
2. Which tables, and how do they **join** (watch for fan-out)?
3. Any **per-group** first/last/rank → window function in a CTE.
4. **Aggregate**, then filter groups with HAVING.
5. Edge cases: **NULLs, ties, duplicates, missing dates, integer division**.
:::

## Employees (emp database)

:::problem[P1 · Second highest salary (176)]
Return the second highest **distinct** salary as `second_highest`. If there isn't one, return NULL (one row).
:::

```sql run db=emp
SELECT salary FROM employees ORDER BY salary DESC;
```

:::solution
**Plan:** rank distinct salaries with DENSE_RANK; MAX over the filtered rows returns NULL when nothing matches.

```sql run db=emp
SELECT MAX(salary) AS second_highest
FROM (SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS r FROM employees) t
WHERE r = 2;
```

Answer: 150,000. Edge case: if everyone earned the same, you'd get one row with NULL.
:::

:::problem[P2 · Highest earner in each department, ties included (184)]
Return department name, employee and salary for the top earner(s) of each department.
:::

```sql run db=emp
SELECT * FROM employees;
```

:::solution
**Plan:** RANK (or DENSE_RANK) partitioned by department, keep rank 1; ties both survive.

```sql run db=emp
WITH r AS (
  SELECT d.name AS department, e.name AS employee, e.salary,
         RANK() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC) AS rk
  FROM employees e JOIN departments d ON d.id = e.dept_id
)
SELECT department, employee, salary FROM r WHERE rk = 1;
```

Alternative without windows: join to `(SELECT dept_id, MAX(salary) ... GROUP BY dept_id)` on both columns.
:::

:::problem[P3 · Managers with at least 2 direct reports (570)]
Return the names of managers who have 2 or more people reporting directly to them.
:::

```sql run db=emp
SELECT id, name, manager_id FROM employees;
```

:::solution
**Plan:** count reports by manager_id, keep counts ≥ 2, join back for names.

```sql run db=emp
SELECT m.name, COUNT(*) AS direct_reports
FROM employees e
JOIN employees m ON m.id = e.manager_id
GROUP BY m.id, m.name
HAVING COUNT(*) >= 2
ORDER BY direct_reports DESC, m.name;
```
:::

:::problem[P4 · Salary bands, including empty ones (1907)]
Count employees in each band: 'Low' (< 100,000), 'Average' (100,000 to 130,000 inclusive), 'High' (> 130,000 up to 200,000) and 'Very high' (> 200,000). Every band must appear, even with 0.
:::

```sql run db=emp
SELECT name, salary FROM employees ORDER BY salary;
```

:::solution
**Plan:** a GROUP BY on a CASE would drop empty bands. Instead list the bands explicitly with UNION ALL, each with a conditional count.

```sql run db=emp
SELECT 'Low' AS band, SUM(CASE WHEN salary < 100000 THEN 1 ELSE 0 END) AS employees FROM employees
UNION ALL
SELECT 'Average', SUM(CASE WHEN salary BETWEEN 100000 AND 130000 THEN 1 ELSE 0 END) FROM employees
UNION ALL
SELECT 'High', SUM(CASE WHEN salary > 130000 AND salary <= 200000 THEN 1 ELSE 0 END) FROM employees
UNION ALL
SELECT 'Very high', SUM(CASE WHEN salary > 200000 THEN 1 ELSE 0 END) FROM employees;
```
:::

:::problem[P5 · Last hire that fits the budget (like 1204 "Last Person to Fit in the Bus")]
Employees were hired in hire_date order. The salary budget is 600,000. Walking through hires in order and adding salaries, who is the **last** person whose cumulative total is still within budget?
:::

```sql run db=emp
SELECT name, hire_date, salary FROM employees ORDER BY hire_date;
```

:::solution
**Plan:** running total with ROWS frame ordered by hire_date, keep rows ≤ budget, take the last one.

```sql run db=emp
WITH t AS (
  SELECT name, hire_date, salary,
         SUM(salary) OVER (ORDER BY hire_date, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running
  FROM employees
)
SELECT name, running
FROM t
WHERE running <= 600000
ORDER BY running DESC
LIMIT 1;
```

Answer: Priya (Neha 160k + Asha 150k + Arjun 130k + Priya 130k = 570k; adding Dev's 90k would be 660k).
:::

## Shop (shop database)

:::problem[P6 · Customers who never ordered (183)]
Return the names of customers with no orders at all.
:::

```sql run db=shop
SELECT * FROM customers;
```

:::solution
```sql run db=shop
SELECT c.name
FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);
```

Equivalent: LEFT JOIN orders and keep `o.id IS NULL`. Avoid `NOT IN` if customer_id could be NULL.
:::

:::problem[P7 · Completion rate per customer (1934 "Confirmation Rate")]
For **every** customer, the share of their orders that are 'completed', rounded to 2 decimals. Customers with no orders get 0.
:::

```sql run db=shop
SELECT customer_id, status FROM orders ORDER BY customer_id;
```

:::solution
**Plan:** LEFT JOIN so everyone stays; AVG of a 1/0 flag is the rate; COALESCE turns "no orders" (NULL) into 0.

```sql run db=shop
SELECT c.id, c.name,
       ROUND(COALESCE(AVG(CASE WHEN o.status = 'completed' THEN 1.0 ELSE 0 END), 0), 2) AS completion_rate
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.name
ORDER BY c.id;
```
:::

:::problem[P8 · Monthly orders by city (1193 "Monthly Transactions I")]
For each month and customer city: number of orders, number of completed orders, total amount, and completed amount.
:::

```sql run db=shop
SELECT o.*, c.city FROM orders o JOIN customers c ON c.id = o.customer_id;
```

:::solution
```sql run db=shop
SELECT strftime('%Y-%m', o.order_date) AS month, c.city,
       COUNT(*) AS orders,
       SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) AS completed_orders,
       SUM(o.amount) AS total_amount,
       SUM(CASE WHEN o.status = 'completed' THEN o.amount ELSE 0 END) AS completed_amount
FROM orders o
JOIN customers c ON c.id = o.customer_id
GROUP BY month, c.city
ORDER BY month, c.city;
```
:::

:::problem[P9 · Price on a given date (1164 "Product Price at a Given Date")]
Using `price_changes`, find every product's price on **2026-02-20**: the latest change on or before that date. If a product had no change by then, use its list price from `products`.
:::

```sql run db=shop
SELECT * FROM price_changes ORDER BY product_id, change_date;
```

:::solution
**Plan:** rank each product's changes up to the date, newest first; LEFT JOIN from products so every product appears; COALESCE to the list price.

```sql run db=shop
WITH latest AS (
  SELECT product_id, new_price,
         ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY change_date DESC) AS rn
  FROM price_changes
  WHERE change_date <= '2026-02-20'
)
SELECT p.id, p.name, COALESCE(l.new_price, p.price) AS price_on_date
FROM products p
LEFT JOIN latest l ON l.product_id = p.id AND l.rn = 1
ORDER BY p.id;
```

Notebook 100 (changed Feb 15), Headphones 1,400 (the Mar 1 change is later), Charger 800 (list price; its change is Mar 10).
:::

:::problem[P10 · Swap neighbours (626 "Exchange Seats")]
Customers sit in seats numbered by id. Swap every pair of neighbours (1↔2, 3↔4, …). If the count is odd, the last one stays. Return id and the new name in that seat.
:::

```sql run db=shop
SELECT id, name FROM customers ORDER BY id;
```

:::solution
**Plan:** odd ids take the next row's name (LEAD), even ids take the previous (LAG); the last odd seat keeps its own name via COALESCE.

```sql run db=shop
SELECT id,
       CASE WHEN id % 2 = 1 THEN COALESCE(LEAD(name) OVER (ORDER BY id), name)
            ELSE LAG(name) OVER (ORDER BY id) END AS name
FROM customers
ORDER BY id;
```
:::

## Daily sales (sales database)

:::problem[P11 · Up on the day before (197 "Rising Temperature")]
For the South region, return dates whose revenue is higher than on the **calendar day before**. Solve it with a self-join this time.
:::

```sql run db=sales
SELECT * FROM daily_sales WHERE region = 'South';
```

:::solution
**Plan:** join each day to the row for date − 1; a missing previous day simply finds no match.

```sql run db=sales
SELECT today.sale_date, today.revenue, yest.revenue AS prev_day
FROM daily_sales today
JOIN daily_sales yest
  ON yest.region = today.region
 AND yest.sale_date = date(today.sale_date, '-1 day')
WHERE today.region = 'South'
  AND today.revenue > yest.revenue;
```

MySQL: `DATEDIFF(today.d, yest.d) = 1`; PostgreSQL: `yest.d = today.d - 1`.
:::

:::problem[P12 · 3-day moving total, full windows only (1321 "Restaurant Growth")]
Total revenue per day (both regions combined), then for each day the 3-day moving sum and average. Only output days that have a full 3-day window.
:::

```sql run db=sales
SELECT sale_date, SUM(revenue) AS day_total FROM daily_sales GROUP BY sale_date;
```

:::solution
**Plan:** aggregate per day first, then a ROWS frame of 2 preceding; skip the first 2 rows (warm-up).

```sql run db=sales
WITH d AS (SELECT sale_date, SUM(revenue) AS total FROM daily_sales GROUP BY sale_date),
w AS (
  SELECT sale_date, total,
         SUM(total) OVER (ORDER BY sale_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS sum_3d,
         ROUND(AVG(total) OVER (ORDER BY sale_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS avg_3d,
         ROW_NUMBER() OVER (ORDER BY sale_date) AS rn
  FROM d
)
SELECT sale_date, sum_3d, avg_3d FROM w WHERE rn >= 3;
```

This works because every date has at least one row here. If whole days could be missing, build a date spine first.
:::

## Activity (activity database)

:::problem[P13 · Three days in a row (180-style)]
Return users who logged in on at least 3 consecutive days.
:::

```sql run db=activity
SELECT * FROM logins ORDER BY user_id, login_date;
```

:::solution
**Plan:** de-duplicate, then the island key date − ROW_NUMBER; keep islands of length ≥ 3.

```sql run db=activity
WITH d AS (SELECT DISTINCT user_id, login_date FROM logins),
g AS (
  SELECT user_id,
         date(login_date, '-' || ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date) || ' days') AS island
  FROM d
)
SELECT DISTINCT user_id
FROM g
GROUP BY user_id, island
HAVING COUNT(*) >= 3;
```
:::

## Pharma field data (rx database)

:::problem[P14 · Top prescriber per territory]
For each territory, the doctor(s) with the highest total prescriptions (trx) across all brands and months. Keep ties.
:::

```sql run db=rx
SELECT h.name, h.territory, r.brand, r.month, r.trx FROM rx r JOIN hcps h ON h.id = r.hcp_id;
```

:::solution
**Plan:** aggregate per doctor first (grain = doctor), then rank within territory.

```sql run db=rx
WITH totals AS (
  SELECT h.territory, h.name, SUM(r.trx) AS total_trx
  FROM rx r JOIN hcps h ON h.id = r.hcp_id
  GROUP BY h.territory, h.name
),
ranked AS (
  SELECT *, RANK() OVER (PARTITION BY territory ORDER BY total_trx DESC) AS rk FROM totals
)
SELECT territory, name, total_trx FROM ranked WHERE rk = 1;
```
:::

:::problem[P15 · Brand A's share of monthly prescriptions]
For each month, Brand A's trx as a percentage of all trx that month, and the change in share (percentage points) from the previous month.
:::

```sql run db=rx
SELECT month, brand, SUM(trx) AS trx FROM rx GROUP BY month, brand;
```

:::solution
**Plan:** conditional aggregation for the share, then LAG on the aggregated share.

```sql run db=rx
WITH m AS (
  SELECT month,
         ROUND(100.0 * SUM(CASE WHEN brand = 'Brand A' THEN trx ELSE 0 END) / SUM(trx), 1) AS share_a
  FROM rx
  GROUP BY month
)
SELECT month, share_a,
       ROUND(share_a - LAG(share_a) OVER (ORDER BY month), 1) AS change_pp
FROM m
ORDER BY month;
```

"pp" = percentage points: going from 64.8% to 66.5% is +1.7 pp (not +1.7%).
:::

:::say
"I start by saying the grain of the answer and which tables join, then look for per-group first, last or rank logic that needs a window function in a CTE. I aggregate before joining where a join could duplicate rows, and I finish by checking edge cases out loud: NULLs, ties, duplicates, missing dates and integer division."
:::
