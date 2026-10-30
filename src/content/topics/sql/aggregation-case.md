---
title: GROUP BY, CASE WHEN and pivots
short: Aggregation & CASE WHEN
subject: sql
group: Foundations
order: 3
summary: Grouping rows into buckets, the COUNT variants, conditional aggregation with CASE WHEN (the most useful SQL trick for metrics), pivoting rows into columns, and percentages and rates.
minutes: 14
---

Most DS SQL questions are really "compute a metric per group": conversion rate per channel, revenue per month, share of cancelled orders. The tools are GROUP BY plus **conditional aggregation** with CASE WHEN.

## 1. GROUP BY = buckets

::viz{name="group-buckets"}

Rules:

- Every column in SELECT must be either in GROUP BY or inside an aggregate (`SUM`, `COUNT`, `AVG`, `MIN`, `MAX`). MySQL sometimes lets you break this rule and returns a random value; don't rely on it.
- You can group by an expression: `GROUP BY strftime('%Y-%m', order_date)` (SQLite), `DATE_TRUNC('month', order_date)` (PostgreSQL/Snowflake), `DATE_FORMAT(order_date, '%Y-%m')` (MySQL).

```sql run db=shop
SELECT strftime('%Y-%m', order_date) AS month,
       COUNT(*)            AS orders,
       SUM(amount)         AS gross,
       ROUND(AVG(amount))  AS avg_order
FROM orders
GROUP BY month
ORDER BY month;
```

## 2. CASE WHEN: if/else inside SQL

```sql
CASE
  WHEN amount >= 2000 THEN 'large'
  WHEN amount >= 1000 THEN 'medium'
  ELSE 'small'
END
```

Conditions are checked top to bottom; the first true one wins. Without ELSE, unmatched rows get NULL.

## 3. Conditional aggregation: the metric-builder

Put a CASE **inside** an aggregate to count or sum only some rows. This gives many metrics in one pass.

| Want | Write |
|---|---|
| Count rows meeting a condition | `SUM(CASE WHEN cond THEN 1 ELSE 0 END)` |
| Sum a value only when a condition holds | `SUM(CASE WHEN cond THEN amount ELSE 0 END)` |
| Rate (share) of rows meeting a condition | `AVG(CASE WHEN cond THEN 1.0 ELSE 0 END)` |
| Count distinct users who did X | `COUNT(DISTINCT CASE WHEN cond THEN user_id END)` |

```sql run db=shop
SELECT strftime('%Y-%m', order_date) AS month,
       COUNT(*) AS orders,
       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)       AS completed,
       SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END)  AS completed_revenue,
       ROUND(AVG(CASE WHEN status = 'cancelled' THEN 1.0 ELSE 0 END), 2) AS cancel_rate
FROM orders
GROUP BY month
ORDER BY month;
```

:::why
`AVG(CASE WHEN cond THEN 1.0 ELSE 0 END)` is a rate because the average of 1s and 0s is the share of 1s. E.g. values 1, 0, 0, 1 → average 0.5 = 50%. Use `1.0` to avoid integer division.
:::

:::trap
**`COUNT(CASE WHEN cond THEN 1 ELSE 0 END)` is wrong.** COUNT counts non-NULL values, and 0 is not NULL, so it counts every row. Use `SUM(... THEN 1 ELSE 0 END)` or `COUNT(CASE WHEN cond THEN 1 END)` (no ELSE, so non-matches are NULL). PostgreSQL/SQLite also support `COUNT(*) FILTER (WHERE cond)`.
:::

## 4. Pivot: rows into columns

"Show each customer's completed, cancelled and returned amounts as columns" is a pivot. Conditional aggregation does it in every dialect:

```sql run db=shop
SELECT c.name,
       SUM(CASE WHEN o.status = 'completed' THEN o.amount ELSE 0 END) AS completed,
       SUM(CASE WHEN o.status = 'cancelled' THEN o.amount ELSE 0 END) AS cancelled,
       SUM(CASE WHEN o.status = 'returned'  THEN o.amount ELSE 0 END) AS returned
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.name
ORDER BY completed DESC;
```

The reverse (**unpivot**, columns into rows) is done with `UNION ALL` of one SELECT per column.

## 5. Percent of total

Two common ways: a subquery for the total, or a window function over the whole result (see Window function basics).

```sql run db=shop
SELECT status,
       COUNT(*) AS n,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct_of_orders
FROM orders
GROUP BY status;
```

`SUM(COUNT(*)) OVER ()` looks odd, but it reads as "sum the group counts across all groups". It works because aggregates are computed (step 3) before window functions (step 5).

## 6. Relational division: "bought every product in a category"

Classic LeetCode 1045 ("customers who bought all products"): count distinct products per customer and compare with the total number of products.

```sql run db=shop
-- Customers who bought every Stationery product (answer: customer 2, Bela)
SELECT o.customer_id
FROM orders o
JOIN order_items i ON i.order_id = o.id
JOIN products p    ON p.id = i.product_id
WHERE p.category = 'Stationery'
GROUP BY o.customer_id
HAVING COUNT(DISTINCT p.id) = (SELECT COUNT(*) FROM products WHERE category = 'Stationery');
```

:::say
"For metrics I use conditional aggregation: SUM of CASE WHEN for counts and conditional sums, AVG of CASE WHEN 1.0 ELSE 0 for rates, and COUNT DISTINCT CASE WHEN for unique users who did something. It computes many KPIs in one pass and is also how I pivot rows into columns portably. I watch for integer division, I remember COUNT counts zeros, so I SUM instead, and for 'did all of X' I compare a COUNT DISTINCT in HAVING with the total."
:::
