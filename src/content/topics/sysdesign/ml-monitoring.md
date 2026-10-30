---
title: Monitoring, drift and retraining
short: Monitoring, drift & governance
subject: sysdesign
group: ML system design
order: 3
summary: What to watch after deployment and why models decay. Data drift vs concept drift, PSI worked by hand, monitoring with delayed labels, retraining strategies, feedback loops, and model governance in regulated industries.
minutes: 15
---

A deployed model starts ageing on day one. Customers change, fraudsters adapt, a new product launches, an upstream team renames a column. Monitoring is how you notice **before** the business does.

## 1. Four layers to monitor

| Layer | Question | Examples | Speed |
|---|---|---|---|
| **Service health** | Is it up and fast? | Latency p95/p99, error rate, throughput, CPU/memory | Seconds |
| **Data quality** | Is the input sane? | Missing values, out-of-range values, schema changes, row counts | Minutes–daily |
| **Drift** | Has the data changed? | Feature distributions (PSI), prediction distribution, flag rate | Daily–weekly |
| **Model performance & business** | Is it still right and still useful? | AUC, precision at threshold, calibration, fraud caught, money saved | Weeks–months (labels are late) |

:::trap
**"The API is green, so the model is fine."** Service health says nothing about prediction quality. A pipeline bug that sends all incomes as 0 keeps the API perfectly healthy while every score is wrong. Data-quality and drift checks catch it.
:::

## 2. Kinds of drift

| Drift | What changed | Example | Detect with |
|---|---|---|---|
| **Data (covariate) drift** | The inputs $P(X)$ | More young applicants after a new digital channel | PSI / KS test on features |
| **Prediction drift** | The model's outputs | Average fraud score jumps | PSI on scores, flag rate |
| **Concept drift** | The relationship $P(y \mid X)$ | Fraudsters learn the red flags; a pandemic changes readmission patterns | Performance drop once labels arrive |
| **Label drift** | The base rate $P(y)$ | Default rate rises in a recession | Outcome rates |

:::symbols
- $P(X)$ = how the input features are distributed.
- $P(y \mid X)$ = the chance of the outcome given the features: the pattern the model learned.
- $P(y)$ = how common the outcome is overall.
:::

## 3. PSI: the drift number everyone uses

The **Population Stability Index** compares a feature's (or score's) distribution now with a baseline (usually training), bin by bin:

$$
\text{PSI} = \sum_{i=1}^{B} (a_i - e_i)\,\ln\!\Big(\frac{a_i}{e_i}\Big)
$$

:::symbols
- $B$ = number of bins (often 10, cut at the training deciles).
- $e_i$ = share of baseline (expected) records in bin $i$.
- $a_i$ = share of current (actual) records in bin $i$.
- $\ln$ = natural log. Each term is ≥ 0, so PSI only grows when bins move.
:::

:::worked
Three bins. Training shares: 30%, 40%, 30%. This month: 20%, 40%, 40%.

- Bin 1: $(0.20 - 0.30)\ln(0.20/0.30) = (-0.10)(-0.405) = 0.0405$
- Bin 2: $(0.40 - 0.40)\ln(1) = 0$
- Bin 3: $(0.40 - 0.30)\ln(0.40/0.30) = (0.10)(0.288) = 0.0288$

PSI $= 0.069$ → stable (below 0.10).
:::

| PSI | Rule-of-thumb reading |
|---|---|
| < 0.10 | No significant change |
| 0.10 – 0.25 | Moderate shift: investigate |
| > 0.25 | Major shift: check the pipeline, consider recalibration or retraining |

::viz{name="psi-calc"}

:::trap
**PSI thresholds are conventions, not statistical tests.** With very large samples, tiny meaningless shifts can be "significant" in a KS test, while PSI can miss changes inside a single bin. Use PSI for a quick flag, then look at the actual distributions and, above all, at whether performance or business outcomes changed.
:::

## 4. Performance when labels are late

Fraud is confirmed months later; a loan defaults within 12–24 months; readmission is known after 30 days. Meanwhile:

- Watch **leading indicators**: drift on top features, score distribution, flag rate, early outcomes (e.g. payments missed in the first 3 months).
- Use **proxy labels** where they exist (investigator's first-pass decision, chargebacks).
- When labels mature, compute AUC/precision/calibration **by scoring month** (a cohort view) to see the trend.

## 5. Retraining strategies

| Strategy | When it fits |
|---|---|
| **Scheduled** (monthly/quarterly) | Stable domains; simple to govern |
| **Triggered** (drift or performance threshold breached) | Fast-changing domains; needs good monitoring |
| **Continuous / online learning** | Very fast-changing, high-volume (ads); rare in regulated industries |

Every retrained model still goes through **validation, champion–challenger comparison and approval**. Never auto-deploy blindly.

:::trap
**Feedback loops.** A fraud model flags claims, only flagged claims get investigated, so new fraud labels only come from what the model already suspects. Retraining on that data reinforces its blind spots. Fix: investigate a small random sample of unflagged cases, and record which cases were acted on.
:::

## 6. Governance in regulated industries

Banking, insurance and healthcare add requirements beyond accuracy:

- **Model inventory and documentation**: purpose, data, limitations, owner (a "model card").
- **Independent validation** before use and periodically (banks: model risk management such as US SR 11-7).
- **Explainability**: reason codes for each decision (credit declines, flagged claims, clinical alerts).
- **Fairness**: performance and error rates across groups; avoid proxies for protected attributes.
- **Audit trail**: which model version made each decision, with which inputs.
- **Data protection**: consent, minimisation, retention (GDPR, India's DPDP Act, HIPAA for US health data).

:::say
"I monitor four layers: service health, data quality, drift, and model and business performance. For drift I use PSI on top features and the score, with 0.1 and 0.25 as investigation and action levels, but I confirm with the actual distributions and outcomes. Because labels are late, I watch leading indicators and evaluate performance by scoring cohort as labels mature. Retraining is scheduled or triggered, but every new model goes through validation and champion–challenger. I also watch for feedback loops, by reviewing a random sample of cases the model didn't flag, and in regulated settings keep documentation, reason codes, fairness checks and an audit trail."
:::
