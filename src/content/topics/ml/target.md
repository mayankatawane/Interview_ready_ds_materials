---
title: Target engineering and data augmentation
short: Target & augmentation
subject: ml
group: Data and features
order: 3
summary: How you define and transform the thing you predict matters as much as the model. Plus ways to create extra training examples when data is scarce.
minutes: 14
---

Interviewers ask "how did you define the target?" because it reveals whether you understand the business problem and leakage. They also ask how to handle skewed regression targets and how to augment data.

## 1. Defining the target

Most real labels are **business decisions**, not columns that already exist.

| Problem | Example definition |
|---|---|
| Credit default | "Bad" = 90+ days past due at any point in the 12 months after the observation date |
| Churn | No transaction for 60 consecutive days |
| Propensity (pharma) | Doctor writes a first prescription within 90 days of a rep visit |
| Fraud | Transaction confirmed as fraud by investigation within 30 days |

### Observation and performance windows

Pick an **observation date** (the moment you'd make the prediction).

- **Features** come only from the **observation window**: data up to that date.
- The **label** comes from the **performance window**: what happens after that date.

```text
|---- observation window ----| obs date |---- performance window ----|
        build features here               label comes from here
```

This simple rule prevents most target leakage.

### Exclusions

Remove cases that make the classes fuzzy or are irrelevant: **indeterminates** (e.g. 30–60 days past due, neither clearly good nor bad), fraud cases in a credit-risk model, closed or deceased accounts, customers not eligible for the product.

:::trap
**"Your model predicts churn. How did you define churn, and why that window?"** Show you made a deliberate choice: the window should match how the business acts (e.g. a retention campaign needs 30 days' notice), and you checked how sensitive results were to the definition.
:::

## 2. Transforming a regression target

### Skewed targets (revenue, claim amounts, prices)

Train on $\log(1 + y)$ and convert predictions back with $e^{\hat z} - 1$.

- Errors become **relative** (10% off) rather than absolute.
- Huge values have less pull on the model.

:::trap
**If you train on log(y), is exp(prediction) an unbiased estimate of the average?** No. The back-transformed value estimates roughly the **median**, which is lower than the mean for right-skewed data (the average of logs is below the log of the average). If you need the mean, multiply by a correction factor (Duan's smearing estimator, or $e^{\sigma^2/2}$ if the log-errors are normal, where $\sigma^2$ is their variance).
:::

In scikit-learn, `TransformedTargetRegressor` handles the transform and back-transform for you.

### Often better: use a loss that matches the target

| Target shape | Loss / objective | Example |
|---|---|---|
| Counts (0, 1, 2, …) | Poisson | Number of prescriptions, claims |
| Many zeros + positive amounts | Tweedie | Insurance claim cost |
| Positive, right-skewed | Gamma | Claim severity, time to event |
| Need a range, not one number | Quantile (pinball) loss | P10 / P50 / P90 demand forecast |
| Rates between 0 and 1 | Cross-entropy on the rate / logit transform | Conversion rate |
| Extreme target outliers | Huber or MAE | Noisy sensor data |

LightGBM and XGBoost support all of these as objectives.

## 3. Target-based features

Target encoding, WOE and lagged targets in time series all use the label to build features. They need strict **out-of-fold** or **past-only** computation (see Feature engineering), otherwise they leak.

## 4. Data augmentation: creating more training examples

| Data type | Techniques |
|---|---|
| Tabular | SMOTE family for rare classes; small Gaussian noise on numeric features; **mixup** (blend two rows and their labels: $\tilde x = \lambda x_i + (1-\lambda)x_j$); synthetic data with CTGAN, TVAE or copulas |
| Time series | Jitter (small noise), scaling, window slicing, window warping, many overlapping sliding windows |
| Text | Back-translation (translate to another language and back), synonym replacement, LLM paraphrasing |
| Images | Flips, rotations, crops, colour jitter, cutout, mixup |

Rules:

- Augment **training data only**; validate on real, untouched data.
- Check synthetic data keeps the relationships between features (correlations, valid ranges).
- Augmentation is not a substitute for a good label definition.

## 5. Label noise

Wrong labels (mis-tagged fraud, inconsistent annotators) hurt boosting most, because it keeps trying to fit them. Handle with: clearer label definitions, agreement checks between annotators, confident learning (e.g. `cleanlab`) to find suspicious labels, robust losses, bagging, stronger regularisation.

:::say
"For classification, the most important decision is the label definition itself: for a default model, the bad definition, separate observation and performance windows so features only use data from before the cut-off, and excluding indeterminate cases. For a skewed regression target like claim amount, I'd use a Tweedie objective in LightGBM, or model log1p of the target and back-transform, remembering that gives roughly the median. Augmentation only ever touches training data, and I validate on real data."
:::
