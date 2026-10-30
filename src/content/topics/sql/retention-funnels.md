---
title: Retention, cohorts, funnels and active users
short: Retention, funnels & DAU
subject: sql
group: Interview patterns
order: 2
summary: The product-analytics SQL that DS interviews love. Day-1 retention, cohort retention tables, funnel conversion, DAU/MAU and rolling active users, and first-touch metrics.
minutes: 16
---

Product and marketing DS interviews (Meta, Amazon, Swiggy, fintechs) ask the same family of questions: retention, cohorts, funnels and active users. They combine everything so far: first events with MIN or ROW_NUMBER, self-joins on dates, conditional aggregation.

## 1. Day-1 retention (LeetCode 550 "Game Play Analysis IV")

"Fraction of users who logged in again on the day right after their first login."

Steps: (1) each user's first login date; (2) did they log in on first date + 1? (3) divide.

```sql run db=activity
WITH firsts AS (
  SELECT user_id, MIN(login_date) AS first_day
  FROM logins
  GROUP BY user_id
)
SELECT ROUND(1.0 * COUNT(l.user_id) / COUNT(*), 2) AS day1_retention
FROM firsts f
LEFT JOIN (SELECT DISTINCT user_id, login_date FROM logins) l
       ON l.user_id = f.user_id
      AND l.login_date = date(f.first_day, '+1 day');
```

:::worked
First days: user 1 Mar 1, user 2 Mar 1, user 3 Mar 2, user 4 Mar 3, user 5 Mar 5. Came back the next day: user 1 (Mar 2), user 3 (Mar 3), user 5 (Mar 6). User 2 skipped Mar 2; user 4 never returned. Retention $= 3/5 = $ **0.60**.
:::

:::trap
**The LEFT JOIN matters.** With an inner join, users who didn't return disappear from the denominator and retention looks like 100%. Also de-duplicate logins, or a user who logged in twice on day 1 would be counted twice.
:::

## 2. Cohort retention table

A **cohort** = users who started in the same period. The table shows, for each cohort, what share was active N periods later.

::viz{name="cohort-grid"}

```sql run db=activity
WITH d AS (SELECT DISTINCT user_id, login_date FROM logins),
firsts AS (SELECT user_id, MIN(login_date) AS cohort_day FROM d GROUP BY user_id),
t AS (
  SELECT f.cohort_day,
         CAST(julianday(d.login_date) - julianday(f.cohort_day) AS INT) AS day_n,
         d.user_id
  FROM d JOIN firsts f ON f.user_id = d.user_id
)
SELECT cohort_day,
       COUNT(DISTINCT CASE WHEN day_n = 0 THEN user_id END) AS size,
       COUNT(DISTINCT CASE WHEN day_n = 1 THEN user_id END) AS d1,
       COUNT(DISTINCT CASE WHEN day_n = 2 THEN user_id END) AS d2,
       COUNT(DISTINCT CASE WHEN day_n = 3 THEN user_id END) AS d3
FROM t
GROUP BY cohort_day
ORDER BY cohort_day;
```

Divide each column by `size` for percentages. In real data you'd use weeks or months: `strftime('%Y-%W', …)` / `DATE_TRUNC('week', …)`.

## 3. Funnel conversion

"Of users who viewed a product, what share added to cart, checked out and purchased?"

```sql run db=activity
WITH u AS (
  SELECT user_id,
         MAX(CASE WHEN event = 'view'     THEN 1 ELSE 0 END) AS viewed,
         MAX(CASE WHEN event = 'cart'     THEN 1 ELSE 0 END) AS carted,
         MAX(CASE WHEN event = 'checkout' THEN 1 ELSE 0 END) AS checked_out,
         MAX(CASE WHEN event = 'purchase' THEN 1 ELSE 0 END) AS purchased
  FROM events
  GROUP BY user_id
)
SELECT SUM(viewed) AS views, SUM(carted) AS carts, SUM(checked_out) AS checkouts, SUM(purchased) AS purchases,
       ROUND(1.0 * SUM(carted)      / SUM(viewed), 2)      AS view_to_cart,
       ROUND(1.0 * SUM(checked_out) / SUM(carted), 2)      AS cart_to_checkout,
       ROUND(1.0 * SUM(purchased)   / SUM(checked_out), 2) AS checkout_to_purchase,
       ROUND(1.0 * SUM(purchased)   / SUM(viewed), 2)      AS overall
FROM u;
```

The `MAX(CASE …)` per user turns many event rows into one row of 0/1 flags (a per-user pivot). Step-to-step rates show **where** users drop off: here the weakest step is cart → checkout (only 67% continue), so that's where you'd investigate first.

:::trap
**Order matters in strict funnels.** This version only checks "did each event at some point". A strict funnel also requires the events in order (cart after view), which you'd check with timestamps: `MIN(CASE WHEN event='cart' THEN event_time END) > MIN(CASE WHEN event='view' THEN event_time END)`.
:::

## 4. DAU, MAU and stickiness

- **DAU** (daily active users) = distinct users per day: `COUNT(DISTINCT user_id) … GROUP BY day`.
- **MAU** = distinct users in the last 30 days (not per calendar month, when asked "rolling").
- **Stickiness** = DAU / MAU: how many monthly users come back daily.

Rolling distinct counts can't be done with `COUNT(DISTINCT) OVER (...)` in most engines. Use a self-join on a date range:

```sql run db=activity
WITH d AS (SELECT DISTINCT user_id, login_date FROM logins),
days AS (SELECT DISTINCT login_date AS day FROM d)
SELECT days.day,
       COUNT(DISTINCT CASE WHEN d.login_date = days.day THEN d.user_id END) AS dau,
       COUNT(DISTINCT d.user_id) AS active_last_3_days
FROM days
JOIN d ON d.login_date BETWEEN date(days.day, '-2 days') AND days.day
GROUP BY days.day
ORDER BY days.day;
```

Replace `-2 days` with `-6 days` for WAU or `-29 days` for MAU.

## 5. First-touch metrics (LeetCode 1174 style)

"Share of customers whose **first** order was immediate / large / completed": find each customer's first order with ROW_NUMBER (or MIN date), then compute the rate over those rows only.

```sql run db=shop
WITH first_orders AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date, id) AS rn
  FROM orders
)
SELECT ROUND(100.0 * AVG(CASE WHEN amount > 1000 THEN 1.0 ELSE 0 END), 1) AS pct_first_orders_over_1000
FROM first_orders
WHERE rn = 1;
```

:::say
"Most product-analytics SQL starts by finding each user's first event, with MIN or ROW_NUMBER, then joining back. For day-1 retention I left-join first day plus one, so non-returners stay in the denominator, and I de-duplicate events first. Cohort tables group users by start period and count distinct actives at each age with conditional COUNT DISTINCT. Funnels pivot events into per-user flags with MAX of CASE, then compute step-to-step conversion to find the leak. Rolling active users need a self-join on a date range, since COUNT DISTINCT doesn't work as a window in most engines."
:::
