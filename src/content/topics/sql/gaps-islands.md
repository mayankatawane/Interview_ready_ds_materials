---
title: Streaks, gaps and islands
short: Consecutive days & streaks
subject: sql
group: Interview patterns
order: 1
summary: The famous "consecutive" problems. Login streaks, three consecutive numbers, the date minus ROW_NUMBER trick explained visually, and finding gaps in sequences.
minutes: 13
---

"Users who logged in 3 days in a row", "longest streak", "numbers appearing 3 times consecutively" (LeetCode 180), "find missing IDs". These look hard until you learn one trick.

## 1. The trick: date minus row number

Number each user's (distinct) login dates in order with ROW_NUMBER. Inside a run of consecutive days, both the date and the row number go up by 1 each step, so **date − row number stays constant**. That constant is a label for the streak (an "island").

| login_date | ROW_NUMBER | date − rn |
|---|---|---|
| Mar 1 | 1 | Feb 28 |
| Mar 2 | 2 | Feb 28 |
| Mar 3 | 3 | Feb 28 |
| Mar 5 | 4 | **Mar 1** ← new island |
| Mar 6 | 5 | Mar 1 |

::viz{name="islands"}

:::analogy
Two people walking up a staircase one step per second, starting together. As long as nobody skips a step, the distance between them stays the same. When the date "skips" a day, the gap changes, and a new island begins.
:::

## 2. All streaks per user

```sql run db=activity
WITH d AS (                                   -- 1. one row per user per day
  SELECT DISTINCT user_id, login_date FROM logins
),
g AS (                                        -- 2. island key = date − row number
  SELECT user_id, login_date,
         date(login_date, '-' || ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date) || ' days') AS island
  FROM d
)
SELECT user_id, MIN(login_date) AS streak_start, MAX(login_date) AS streak_end,
       COUNT(*) AS streak_days                -- 3. one row per island
FROM g
GROUP BY user_id, island
ORDER BY user_id, streak_start;
```

From here:

- **Users with a 3+ day streak**: add `HAVING COUNT(*) >= 3` and select distinct users.
- **Longest streak per user**: wrap it and take `MAX(streak_days)` per user.

Dialects: PostgreSQL `login_date - ROW_NUMBER() OVER (...)::int`; MySQL `DATE_SUB(login_date, INTERVAL rn DAY)`.

:::trap
**De-duplicate first.** User 1 logged in twice on March 3. Without `DISTINCT`, the row number jumps by 2 on that day while the date jumps by 1, breaking the streak. Interviewers often plant exactly this.
:::

## 3. Simpler alternative for a fixed length: LAG / LEAD

For "at least 3 in a row" you can compare with the rows 1 and 2 positions back. LeetCode 180 "Consecutive Numbers" (a number appearing at least 3 times consecutively by id) is usually solved like this:

```sql run db=activity
WITH d AS (SELECT DISTINCT user_id, login_date FROM logins),
t AS (
  SELECT user_id, login_date,
         LAG(login_date, 2) OVER (PARTITION BY user_id ORDER BY login_date) AS two_back
  FROM d
)
SELECT DISTINCT user_id
FROM t
WHERE julianday(login_date) - julianday(two_back) = 2;    -- 3 distinct days spanning exactly 2 days
```

Use the island method when the length is variable ("longest streak") and LAG when it's fixed and small.

## 4. Gaps: what's missing?

The mirror question: find missing days or IDs. Use LEAD to see where the next value jumps by more than 1:

```sql run db=sales
WITH t AS (
  SELECT region, sale_date,
         LEAD(sale_date) OVER (PARTITION BY region ORDER BY sale_date) AS next_date
  FROM daily_sales
)
SELECT region,
       date(sale_date, '+1 day') AS gap_starts,
       date(next_date, '-1 day') AS gap_ends
FROM t
WHERE julianday(next_date) - julianday(sale_date) > 1;
```

## 5. The same trick for statuses (not just dates)

"Group consecutive rows with the same status" (e.g. a machine's ON/OFF periods): use the **difference of two row numbers**:

`ROW_NUMBER() OVER (ORDER BY t) − ROW_NUMBER() OVER (PARTITION BY status ORDER BY t)`

It's constant within each consecutive run of the same status. Group by (status, difference) to get each run's start, end and length.

:::say
"For streak problems I first de-duplicate to one row per user per day, then number the days with ROW_NUMBER. In a run of consecutive dates, the date minus the row number is constant, so it labels each island; grouping by user and that key gives each streak's start, end and length, and then HAVING or MAX answers 'at least N' or 'longest'. For a small fixed length I can also use LAG two rows back and check the date difference. Gaps are the mirror image: LEAD to find where the next date jumps by more than one."
:::
