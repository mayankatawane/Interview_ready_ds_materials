---
title: "Case study: credit risk and card fraud at a bank"
short: "Case: bank credit & fraud"
subject: sysdesign
group: ML system design
order: 5
summary: Two classic finance designs. Real-time loan decisions with a probability-of-default model, decision engine, reason codes and model risk management; then card fraud on a stream with sub-100 ms budgets.
minutes: 16
---

Finance interviews test whether you understand that **the model never decides alone**: it feeds a decision engine with policy rules, every decision must be explainable, and regulators expect independent validation and monitoring.

## Part A: Real-time loan decisions

**The question:** "You built a model that predicts loan default. How would it be deployed to approve personal loans in the app?"

### 1. Clarify

- Decision: approve / decline / refer to an underwriter, plus limit and interest rate.
- Latency: the customer waits in the app → decision in a few seconds end to end; the model itself well under 100 ms.
- Volume: e.g. 20,000 applications/day, peaking at 10/second during campaigns.
- Regulation: explain declines (reason codes), fair lending, independent model validation, data from credit bureaus with consent.

### 2. Design

::viz{name="arch-credit"}

Flow:

1. Application submitted → orchestration service calls the **credit bureau** (CIBIL/Experian) and internal systems (salary credits, existing loans), each with timeouts.
2. **Feature service** computes the same features as training: debt-to-income, credit utilisation, months since last delinquency, number of recent enquiries.
3. **PD model** (probability of default) scores the application.
4. **Decision engine** applies policy: hard rules (age, KYC, blacklist), score cut-offs, affordability, then sets limit and price.
5. **Reason codes** generated for declines and stored with the decision.
6. Everything logged for audit and monitoring.

### 3. Model choices that matter in banking

| Choice | Why |
|---|---|
| **Logistic regression scorecard** (WOE binning) or **XGBoost with monotonic constraints** | Regulators and risk teams must understand and defend the model; monotonic = "more missed payments never lowers risk" |
| **Calibrated probabilities** | PD feeds pricing, expected loss = PD × LGD × EAD, and capital calculations, so the numbers must be right, not just the ranking |
| **Out-of-time validation** | Train on older vintages, test on newer ones; economic cycles matter |
| **Reject inference** | You only see outcomes for approved applicants; declined ones' behaviour is unknown, which biases the training data |

:::symbols
- PD = probability of default (the model's output).
- LGD = loss given default: the share of the loan lost if the customer defaults.
- EAD = exposure at default: how much is owed at that moment.
- Expected loss = PD × LGD × EAD, e.g. 0.04 × 0.6 × ₹2,00,000 = ₹4,800.
:::

### 4. Release and monitoring

- **Champion–challenger**: the new model runs in shadow for a period, then on a small share of applications; promoted only if better on Gini/AUC, calibration and business KPIs (approval rate, early delinquency), with sign-off from validation.
- **Monitoring**: monthly PSI on the score and key features, approval rates by segment, early-delinquency indicators (e.g. 30+ days past due within 3 months), full performance once loans mature (12+ months).
- **Model risk management**: independent validation before use and annually; model inventory; documentation of limitations. In the US this is SR 11-7; RBI and EU regulators have similar expectations.

:::trap
**"Just use the most accurate black-box model."** In lending, a slightly less accurate but explainable, monotonic and stable model often wins, because every decline needs a defensible reason and the model must pass independent validation. Show you know this trade-off.
:::

## Part B: Card fraud on a stream

**The question:** "Detect fraudulent card transactions in real time."

Now the decision happens **during the payment**: the card network gives the bank a total budget of a few hundred milliseconds, so the fraud check gets **tens of milliseconds**.

1. Transaction event arrives on a stream (Kafka).
2. **Streaming features** are updated continuously (Flink/Spark Structured Streaming): number of transactions in the last 10 minutes, amount vs the customer's average, distance from the last transaction's location, new merchant or device.
3. Features are read from an in-memory **online store** (Redis/Aerospike) by card ID: < 5 ms.
4. A light model (gradient boosting, ~1 ms) scores; rules handle the obvious (card reported stolen).
5. Decision: approve / decline / step-up authentication (OTP) — the middle option reduces friction for borderline scores.
6. Customer confirmations ("was this you?") and chargebacks come back as labels within days to weeks.

:::worked
**Velocity feature by hand.** A card normally makes 2 transactions a day. In the last 10 minutes it made 6 transactions at different online merchants, each ₹4,999. Feature values: `txn_count_10min = 6`, `amount_vs_avg = 4,999 / 800 ≈ 6.2×`, `new_merchants_1h = 6`. Each alone might be fine; together they're a classic card-testing pattern, and gradient boosting captures exactly these interactions.
:::

| Concern | Loan decisions | Card fraud |
|---|---|---|
| Latency | Seconds end to end | Tens of ms for the model step |
| Features | Bureau + application data | Streaming aggregates over minutes/hours |
| Labels | Default after 12+ months | Chargebacks/confirmations in days–weeks |
| Error costs | Bad loans vs lost good customers | Fraud losses vs declined genuine purchases (angry customers) |
| Fallback | Refer to an underwriter | Rules-only decision if the model times out |

:::say
"In lending, the model outputs a calibrated probability of default from bureau and internal features, but a decision engine makes the call with policy rules, affordability and pricing, and every decline gets reason codes. I'd use a scorecard or monotonic XGBoost for explainability, validate out-of-time, release via champion–challenger with independent validation, and monitor PSI and early delinquency because real defaults take a year. Card fraud is a streaming problem: velocity features computed on Kafka with Flink, read from an in-memory store by card ID, a light model scored in milliseconds, step-up authentication for borderline cases, and a rules fallback if the model times out."
:::
