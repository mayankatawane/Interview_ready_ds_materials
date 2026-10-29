---
title: Validation strategy
short: Validation
subject: ml
group: Evaluation
order: 4
summary: How to estimate performance honestly. Holdout, K-fold, stratified, group and time-based splits, out-of-time testing, nested CV, and monitoring drift after deployment.
minutes: 16
---

A model is only as good as the way you tested it. Interviewers ask which split you'd use and why, why random K-fold is wrong for time series, and how you'd detect drift once the model is live. The rule behind every answer: **validation should copy how the model will be used.**

## 1. Why we split data at all

If you score a model on the data it learned from, you measure memory, not skill. So we hold some data back.

| Set | Used for | Touched |
|---|---|---|
| Training | Fitting the model | Constantly |
| Validation | Choosing hyperparameters, features, thresholds, early stopping | Many times |
| Test | One final, honest estimate | **Once**, at the end |

:::trap
**What's wrong with tuning on the test set?** You pick whatever happens to work on that particular test set, so its score becomes optimistic. It's no longer an honest estimate of performance on new data.
:::

## 2. The main schemes

::viz{name="val-split"}

| Scheme | How | Use when |
|---|---|---|
| Holdout | One random train / validation / test split (e.g. 60/20/20) | Large data |
| K-fold (k = 5 or 10) | Split into k parts; train on k−1, validate on the remaining one; repeat k times; average | Small to medium data; also gives a spread (mean ± std) |
| Stratified K-fold | K-fold, but every fold keeps the same class ratio | Classification, especially imbalanced |
| Group K-fold | All rows of one group (customer, patient, doctor) stay in the same fold | Several rows per entity |
| Time-series split | Always train on the past, validate on the next period; no shuffling | Anything time-ordered |
| Out-of-time (OOT) | Hold out the most recent months completely | Credit risk and any model that must survive change over time |
| Nested CV | Inner loop tunes, outer loop evaluates the whole tuning process | Small data where you need an unbiased estimate after tuning |
| Leave-one-out (LOOCV) | k = n | Tiny datasets; expensive and high-variance |

### K-fold step by step

1. Shuffle the rows (unless time matters) and cut them into k equal folds.
2. For fold 1: train on folds 2…k, score on fold 1.
3. Repeat so every fold is the validation set once.
4. Report the average score and its standard deviation.

$$
\text{CV score} = \frac{1}{k}\sum_{j=1}^{k}\text{score}_j
$$

where $\text{score}_j$ is the score on fold $j$ when it was held out.

## 3. Why random splits are wrong for some data

**Time series.** A random split trains on future rows and tests on past ones. Lag and rolling features then contain future information, and the score is too good. Use forward-chaining splits, optionally with a **gap** between training and validation equal to your prediction horizon (if you forecast 4 weeks ahead, leave a 4-week gap).

**Groups.** If one customer has 20 rows and some land in training and others in validation, the model memorises that customer's quirks and looks better than it will on new customers. Use GroupKFold (or StratifiedGroupKFold).

**Rare classes.** A plain random fold may contain no positives, so recall and AUC become undefined or wildly unstable. Use stratification.

## 4. Preprocessing goes inside the loop

Every step that learns from data (imputation values, scaling, encoding, resampling, feature selection) must be fitted **on the training part of each fold only**, then applied to that fold's validation part. Doing it once on all data before splitting leaks validation information into training. A scikit-learn `Pipeline` passed to `cross_val_score` does this for you; without one, fit each step manually per fold.

## 5. Nested cross-validation

When you tune hyperparameters with CV and then report that same best CV score, it's optimistic: you picked the best of many tries on the same folds. Nested CV fixes this:

- **Inner loop**: tunes hyperparameters on the training part.
- **Outer loop**: scores the tuned model on folds the inner loop never saw.

Useful for small datasets and papers; for large datasets a separate test set does the same job.

## 6. Checking train and test look alike: adversarial validation

1. Label training rows 0 and test (or recent production) rows 1.
2. Train a classifier to tell them apart.
3. AUC near 0.5 → the two look alike. AUC well above 0.5 → they differ; the most important features show **what** changed.

## 7. After deployment: drift and monitoring

Models degrade because the world changes.

| Type | What changes | Example | How to detect |
|---|---|---|---|
| Data (covariate) drift | The input distribution, $P(X)$ | New customer mix after a campaign | PSI or KS test on features and scores |
| Concept drift | The relationship between inputs and target, $P(y \mid X)$ | Same profile defaults more after a rate hike | Track performance once labels arrive |
| Label / prior drift | The positive rate, $P(y)$ | Fraud rate doubles | Track the base rate |

### Population Stability Index (PSI)

$$
\text{PSI} = \sum_{i=1}^{B}(A_i - E_i)\,\ln\frac{A_i}{E_i}
$$

:::symbols
- $B$ = number of bins (often 10, by score deciles from development data).
- $E_i$ = expected share of rows in bin $i$ (from development / training).
- $A_i$ = actual share in bin $i$ now.
- $\ln$ = natural logarithm.
:::

Rule of thumb: below 0.1 stable · 0.1 to 0.25 watch · above 0.25 major shift, investigate or retrain.

:::worked
One bin had 10% of development customers and has 15% now: contribution $= (0.15 - 0.10)\ln(0.15/0.10) = 0.05 \times 0.405 = 0.020$. Add up all bins to get PSI.
:::

## 8. Code

```python
from sklearn.model_selection import StratifiedKFold, GroupKFold, TimeSeriesSplit, cross_val_score
from sklearn.ensemble import RandomForestClassifier

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
scores = cross_val_score(RandomForestClassifier(n_jobs=-1), X, y, cv=cv, scoring="roc_auc")
print(scores.mean().round(3), "+/-", scores.std().round(3))

group_scores = cross_val_score(RandomForestClassifier(), X, y, cv=GroupKFold(5), groups=df["customer_id"])
time_scores = cross_val_score(RandomForestClassifier(), X_sorted, y_sorted, cv=TimeSeriesSplit(n_splits=5, gap=4))

import numpy as np
def psi(expected, actual, bins=10):
    edges = np.quantile(expected, np.linspace(0, 1, bins + 1)); edges[0], edges[-1] = -np.inf, np.inf
    e = np.histogram(expected, edges)[0] / len(expected)
    a = np.histogram(actual, edges)[0] / len(actual)
    e, a = np.clip(e, 1e-6, None), np.clip(a, 1e-6, None)
    return np.sum((a - e) * np.log(a / e))
```

:::say
"I match validation to how the model will be used. For customer data over time I use a time-based split with an out-of-time holdout of the latest months, stratified for the rare class and grouped so a customer never appears on both sides. All preprocessing is fitted inside each training fold. I tune on validation folds and touch the test set once. After deployment I monitor PSI on the score and key features for data drift, and track performance once labels arrive to catch concept drift."
:::
