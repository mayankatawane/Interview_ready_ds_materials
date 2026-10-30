---
title: Joins without the confusion
short: Joins
subject: sql
group: Foundations
order: 2
summary: INNER, LEFT, RIGHT, FULL, CROSS, self-joins and anti-joins with a hands-on join lab. Why joins multiply rows, the LEFT JOIN + WHERE trap, and joining on dates and ranges.
minutes: 15
---

Joins appear in nearly every SQL question. Interviewers check three things: do you pick the right join, do you notice when a join **duplicates rows**, and do you know the **LEFT JOIN + WHERE** trap.

## 1. The idea

A join glues rows from two tables side by side when a condition (`ON`) is true. Every join type answers: **what happens to rows that have no match?**

::viz{name="join-lab"}

| Join | Keeps | Unmatched rows |
|---|---|---|
| `INNER JOIN` | Only pairs that match | Dropped from both sides |
| `LEFT JOIN` | Every left row | Left rows without a match get NULLs on the right |
| `RIGHT JOIN` | Every right row | Mirror of LEFT (rarely used; swap the tables instead) |
| `FULL OUTER JOIN` | Everything | NULLs on whichever side is missing |
| `CROSS JOIN` | Every combination | No ON condition; rows = left × right |

:::analogy
A school dance. INNER: only students who found a partner are in the photo. LEFT: every student from the left line is in the photo, some standing alone. FULL: everyone, paired or not. CROSS: every possible pairing is photographed.
:::

## 2. LEFT JOIN in practice

```sql run db=emp
SELECT d.name AS department, e.name AS employee
FROM departments d
LEFT JOIN employees e ON e.dept_id = d.id
ORDER BY d.id;
```

HR has no employees, so it appears once with a NULL employee. With an INNER JOIN, HR would vanish.

## 3. Anti-join: "who has no match?"

"Customers who never ordered", "products never sold", "employees without a department" all use the same pattern:

```sql run db=shop
SELECT c.name
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.id IS NULL;          -- no matching order
```

Equivalent: `WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)`. Avoid `NOT IN (subquery)` if the subquery can return NULL (see Subqueries and CTEs).

## 4. The LEFT JOIN + WHERE trap

Putting a condition on the **right** table in `WHERE` silently turns a LEFT JOIN into an INNER JOIN, because rows with NULLs on the right fail the condition.

```sql run db=shop
-- Goal: every customer with their number of COMPLETED orders (0 if none)
-- Wrong: Eshan and Farah (no orders) and anyone with only cancelled orders vanish
SELECT c.name, COUNT(o.id) AS completed_orders
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.status = 'completed'
GROUP BY c.name;
```

:::solution[Show the fix]
Move the right-table condition into the `ON` clause, so it decides which orders match without removing customers.

```sql run db=shop
SELECT c.name, COUNT(o.id) AS completed_orders
FROM customers c
LEFT JOIN orders o
       ON o.customer_id = c.id
      AND o.status = 'completed'
GROUP BY c.name
ORDER BY completed_orders DESC, c.name;
```

`COUNT(o.id)` (not `COUNT(*)`) gives 0 for customers without matches, because their `o.id` is NULL.
:::

:::remember
**Filters on the left table → WHERE. Filters on the right table of a LEFT JOIN → ON.**
:::

## 5. Joins multiply rows (fan-out)

If one customer has 3 orders, joining customers to orders gives 3 rows for that customer. Join a third table (say order_items) and the rows multiply again. Aggregating after such joins **double-counts**.

```sql run db=shop
-- Wrong: order amounts are repeated once per item line, so revenue is inflated
SELECT SUM(o.amount) AS inflated_revenue
FROM orders o
JOIN order_items i ON i.order_id = o.id
WHERE o.status = 'completed';
```

:::solution[Show the fix]
Aggregate each table at its own level **before** joining, or don't join tables you don't need.

```sql run db=shop
SELECT SUM(amount) AS true_revenue
FROM orders
WHERE status = 'completed';
```
:::

:::trap
**"How do you spot a fan-out?"** Count rows before and after the join, and check the join key is unique on the side you expect (`SELECT key, COUNT(*) ... GROUP BY key HAVING COUNT(*) > 1`).
:::

## 6. Self-join: a table joined to itself

Use two aliases of the same table. Classic: employees earning more than their manager.

```sql run db=emp
SELECT e.name AS employee, e.salary, m.name AS manager, m.salary AS manager_salary
FROM employees e
JOIN employees m ON e.manager_id = m.id
WHERE e.salary > m.salary;
```

Other self-join uses: comparing each day with the previous day (though LAG is usually cleaner), finding pairs of users in the same city, and hierarchies.

## 7. Non-equal joins: ranges and dates

`ON` can use any condition, not just `=`:

- **Range join**: match a transaction to the price that was valid on its date: `ON t.product_id = p.product_id AND t.dt BETWEEN p.valid_from AND p.valid_to`.
- **Date windows**: "orders within 7 days of signup": `ON o.customer_id = c.id AND o.order_date <= date(c.signup_date, '+7 days')`.

```sql run db=shop
-- Customers who ordered within 7 days of signing up
SELECT c.name, c.signup_date, MIN(o.order_date) AS first_order
FROM customers c
JOIN orders o
  ON o.customer_id = c.id
 AND o.order_date <= date(c.signup_date, '+7 days')
GROUP BY c.name, c.signup_date;
```

## 8. CROSS JOIN for building grids

To report zeros for missing combinations (every customer × every month), first build the full grid with a CROSS JOIN, then LEFT JOIN the facts onto it.

```sql run db=shop
WITH months AS (SELECT DISTINCT strftime('%Y-%m', order_date) AS m FROM orders)
SELECT c.name, months.m,
       COALESCE(SUM(o.amount), 0) AS revenue
FROM customers c
CROSS JOIN months
LEFT JOIN orders o
       ON o.customer_id = c.id
      AND strftime('%Y-%m', o.order_date) = months.m
      AND o.status = 'completed'
WHERE c.id <= 3
GROUP BY c.name, months.m
ORDER BY c.name, months.m;
```

:::say
"I choose the join by what should happen to unmatched rows: INNER drops them, LEFT keeps all rows from the main table, FULL keeps both sides. For 'never did X' I use a LEFT JOIN with WHERE right-key IS NULL, or NOT EXISTS. Two things I always check: conditions on the right table of a LEFT JOIN go in ON, not WHERE, otherwise it becomes an inner join; and whether the join key is unique, because one-to-many joins multiply rows and inflate sums, so I aggregate before joining."
:::
