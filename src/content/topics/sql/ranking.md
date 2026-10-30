---
title: Ranking, top-N per group and Nth highest
short: ROW_NUMBER, RANK, DENSE_RANK
subject: sql
group: Window functions
order: 2
summary: The three ranking functions and how they treat ties, the top-N-per-group pattern, Nth highest salary, de-duplication with ROW_NUMBER, and NTILE for buckets.
minutes: 14
---

"Top 3 salaries per department", "second highest salary", "latest record per user", "remove duplicates": all are ranking problems. The whole skill is choosing the right function for **ties**.

## 1. The three functions

::viz{name="rank-podium"}

| Salaries (desc) | 160 | 140 | 130 | 130 | 110 |
|---|---|---|---|---|---|
| `ROW_NUMBER()` | 1 | 2 | 3 | 4 | 5 |
| `RANK()` | 1 | 2 | 3 | 3 | **5** (skips 4) |
| `DENSE_RANK()` | 1 | 2 | 3 | 3 | **4** (no gap) |

Which to use:

| Question wording | Function |
|---|---|
| "Exactly one row per group" (latest order, one winner, de-duplicate) | `ROW_NUMBER` + a tie-breaker |
| "Top 3 **distinct** salaries / salary levels" | `DENSE_RANK` |
| "Top 3 positions, ties included, like a leaderboard" | `RANK` |

## 2. Top-N per group

The pattern: rank within each group in a CTE, then filter. LeetCode 185 "Department Top Three Salaries" asks for employees earning one of the top 3 **distinct** salaries in their department → DENSE_RANK.

```sql run db=emp
WITH ranked AS (
  SELECT d.name AS department, e.name AS employee, e.salary,
         DENSE_RANK() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC) AS rnk
  FROM employees e
  JOIN departments d ON d.id = e.dept_id
)
SELECT department, employee, salary, rnk
FROM ranked
WHERE rnk <= 3
ORDER BY department, salary DESC;
```

Engineering returns 4 people, because Arjun and Priya share the third-highest salary. Change `DENSE_RANK` to `ROW_NUMBER` and run again: one of them disappears, which would be a wrong answer.

## 3. Nth highest salary

LeetCode 176/177: "Second highest **distinct** salary; return NULL if there isn't one."

```sql run db=emp
SELECT MAX(salary) AS second_highest       -- MAX over zero rows returns NULL, as required
FROM (
  SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS r
  FROM employees
) t
WHERE r = 2;
```

Other ways interviewers accept:

- `SELECT MAX(salary) FROM employees WHERE salary < (SELECT MAX(salary) FROM employees)` (second highest only).
- `SELECT DISTINCT salary FROM employees ORDER BY salary DESC LIMIT 1 OFFSET 1`, wrapped as `SELECT (...) AS second_highest` so an empty result becomes NULL.

:::trap
**Why wrap in MAX or a scalar subquery?** If there's no second salary, a plain query returns **zero rows**, but the question wants **one row containing NULL**. An aggregate over zero rows (MAX) or a scalar subquery returns NULL.
:::

## 4. Latest record per group (and de-duplication)

"Each customer's most recent order":

```sql run db=shop
WITH r AS (
  SELECT o.*,
         ROW_NUMBER() OVER (PARTITION BY customer_id
                            ORDER BY order_date DESC, id DESC) AS rn   -- id = tie-breaker
  FROM orders o
)
SELECT customer_id, id AS order_id, order_date, amount, status
FROM r
WHERE rn = 1;
```

The same pattern **removes duplicates**: partition by the columns that define a duplicate, keep `rn = 1`. To delete, `DELETE FROM t WHERE id IN (SELECT id FROM r WHERE rn > 1)`.

```sql run db=activity
-- Logins table has a duplicate (user 1 on Mar 3). Keep one row per user per day:
WITH r AS (
  SELECT user_id, login_date,
         ROW_NUMBER() OVER (PARTITION BY user_id, login_date ORDER BY login_date) AS rn
  FROM logins
)
SELECT user_id, login_date FROM r WHERE rn > 1;      -- these are the extra copies
```

:::trap
**Always add a tie-breaker to ROW_NUMBER's ORDER BY** (a unique ID). Without one, rows with equal values are numbered in an arbitrary order, so results can change between runs.
:::

## 5. NTILE: equal-sized buckets

`NTILE(4) OVER (ORDER BY spend DESC)` splits rows into 4 groups (quartiles) of nearly equal size. Uses: customer deciles, top 10% by score, A/B-style splits.

```sql run db=emp
SELECT name, salary,
       NTILE(4) OVER (ORDER BY salary DESC) AS quartile,
       ROUND(PERCENT_RANK() OVER (ORDER BY salary), 2) AS pct_rank
FROM employees;
```

:::trap
**NTILE details.** With 12 rows and 4 buckets, each gets 3. With 10 rows, buckets get 3, 3, 2, 2 (extras go to the first buckets). Ties can be split across buckets. For "top 5% of rows", `ROW_NUMBER() <= CEIL(0.05 * COUNT(*) OVER ())` is more exact than `NTILE(20) = 1`.
:::

:::say
"For ranking I pick by how ties should behave. ROW_NUMBER gives unique numbers, so I use it for one row per group, like latest order or de-duplication, always with a tie-breaker. RANK gives ties the same rank and skips the next, like a leaderboard. DENSE_RANK doesn't skip, so it's right for 'top three distinct salaries'. The pattern is rank inside a CTE partitioned by the group, then filter outside. For Nth highest I use DENSE_RANK and wrap it in MAX so that a missing value returns NULL rather than no rows."
:::
