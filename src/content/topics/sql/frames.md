---
title: Running totals, moving averages and frames
short: Running totals & frames
subject: sql
group: Window functions
order: 3
summary: How the window frame decides which rows are included. Running totals, 7-day moving averages, ROWS vs RANGE, the default-frame trap, and why LAST_VALUE surprises everyone.
minutes: 14
---

"Cumulative revenue", "7-day rolling average of active users", "running balance": all are window **frames**. One hidden default causes most of the bugs, so learn it here.

## 1. The frame: which rows count

For each row, the frame is a sliding range of rows **inside its partition**.

```sql
SUM(revenue) OVER (
  PARTITION BY region
  ORDER BY sale_date
  ROWS BETWEEN 6 PRECEDING AND CURRENT ROW    -- the frame: this row + 6 before
)
```

::viz{name="frame-slider"}

| Frame | Meaning | Use |
|---|---|---|
| `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` | From the start up to here | Running total |
| `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW` | This row and the 6 before | 7-row moving average |
| `ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING` | Previous, current, next | Centred smoothing |
| `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` | Whole partition | Same as no ORDER BY |

## 2. Running total and moving average

```sql run db=sales
SELECT sale_date, revenue,
       SUM(revenue) OVER (ORDER BY sale_date
                          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total,
       ROUND(AVG(revenue) OVER (ORDER BY sale_date
                          ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 1)     AS avg_3day
FROM daily_sales
WHERE region = 'North'
ORDER BY sale_date;
```

Add `PARTITION BY region` and remove the WHERE to get the same per region: the running total restarts for each region.

:::trap
**The warm-up rows.** The first two rows of `avg_3day` average only 1 and 2 days. If the question wants the average only when a full window exists (LeetCode 1321 "Restaurant Growth"), filter rows where `ROW_NUMBER() >= 3` or where the window's `COUNT(*) = 3`.
:::

## 3. The default frame trap (RANGE vs ROWS)

If you write `ORDER BY` inside OVER but **no frame**, the default is:

`RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`

**RANGE** treats rows with the **same ORDER BY value** (peers) as one block. So ties get the same running total, which jumps by both at once.

```sql run db=emp
SELECT name, salary,
       SUM(salary) OVER (ORDER BY salary)                                         AS default_range,
       SUM(salary) OVER (ORDER BY salary ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS rows_frame
FROM employees
ORDER BY salary;
```

Look at Rohan and Meera (both 120,000) and Arjun and Priya (both 130,000): with the default RANGE frame they share a total; with ROWS each row adds one at a time.

:::remember
**For running totals, write the frame explicitly with ROWS**, and order by something unique (date + id). Then ties can't surprise you.
:::

## 4. ROWS vs RANGE with dates: missing days

`ROWS BETWEEN 6 PRECEDING` means "6 **rows** before", not "6 **days** before". If a day is missing, the window silently stretches further back in time.

South region has no row for March 4. Compare a 3-row window with a true 3-calendar-day window:

```sql run db=sales
SELECT sale_date, revenue,
       SUM(revenue) OVER (ORDER BY sale_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS last_3_rows,
       SUM(revenue) OVER (ORDER BY julianday(sale_date)
                          RANGE BETWEEN 2 PRECEDING AND CURRENT ROW)                 AS last_3_days
FROM daily_sales
WHERE region = 'South'
ORDER BY sale_date;
```

On March 5, `last_3_rows` = Mar 2 + Mar 3 + Mar 5 = 240, while `last_3_days` = Mar 3 + Mar 5 = 165 (Mar 4 is missing, so it contributes nothing).

Two fixes: build a **date spine** (one row per day, missing days filled with 0, see Subqueries and CTEs) and then use ROWS; or use a RANGE frame on a date value (PostgreSQL: `RANGE BETWEEN INTERVAL '6 days' PRECEDING AND CURRENT ROW`).

## 5. FIRST_VALUE and the LAST_VALUE surprise

`FIRST_VALUE(x)` works as expected. `LAST_VALUE(x)` with the default frame returns the **current row** (the frame ends at the current row!).

```sql run db=emp
SELECT name, dept_id, salary,
       FIRST_VALUE(name) OVER (PARTITION BY dept_id ORDER BY salary DESC) AS top_earner,
       LAST_VALUE(name)  OVER (PARTITION BY dept_id ORDER BY salary DESC) AS last_wrong,
       LAST_VALUE(name)  OVER (PARTITION BY dept_id ORDER BY salary DESC
                               ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS lowest_earner
FROM employees
WHERE dept_id = 1;
```

:::trap
**"Why does LAST_VALUE return the current row?"** Because with ORDER BY, the default frame stops at the current row (and its peers). Extend the frame to `UNBOUNDED FOLLOWING`, or use `FIRST_VALUE` with the order reversed.
:::

:::say
"A frame decides which rows around the current one a window aggregate sees. Running totals use ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW; a 7-day moving average uses 6 PRECEDING. I always write the frame explicitly, because with ORDER BY the default is RANGE up to the current row, which lumps ties together, and it's why LAST_VALUE returns the current row. ROWS counts rows, not days, so with missing dates I either build a date spine or use a RANGE frame on the date."
:::
