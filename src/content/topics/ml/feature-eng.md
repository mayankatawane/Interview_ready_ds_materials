---
title: Feature engineering
short: Feature engineering
subject: ml
group: Data and features
order: 1
summary: Turn raw columns into signals a model can use. Missing values, scaling, encoding categories, building new features, choosing features, and avoiding data leakage.
minutes: 24
---

Good features usually beat clever models. Interviewers ask how you handle missing values, high-cardinality categories, outliers and scaling, how target encoding leaks, and for a real example of leakage you've seen. This page goes through each step in the order you'd do it.

## 1. Missing values

### First, ask why it's missing

| Type | Meaning | Example |
|---|---|---|
| MCAR (missing completely at random) | Missingness has nothing to do with any data | A sensor randomly dropped a reading |
| MAR (missing at random) | Missingness depends on other columns you have | Older customers skip the "app usage" question |
| MNAR (missing not at random) | Missingness depends on the missing value itself | High earners leave "income" blank |

Why it matters: with MNAR, the fact that a value is missing is itself informative, and simply filling it in hides that signal.

### Options

| Method | When |
|---|---|
| Drop the column | Mostly empty and not informative |
| Drop rows | Very few rows affected and missing at random |
| Median (numbers) | Skewed numbers like income; robust to outliers |
| Mean | Roughly symmetric numbers |
| Most frequent value, or a new "Missing" category | Categorical columns ("Missing" is often best) |
| KNN or iterative (MICE) imputation | Values are predictable from other columns (MAR) |
| **Add a missing-indicator flag** | Almost always worth it: lets the model learn that missingness itself matters |
| Leave as NaN | XGBoost, LightGBM, CatBoost, HistGradientBoosting learn their own handling |

:::mistake
Computing the median (or any fill value) on the **whole dataset** before splitting. Fit imputers on the training data only, then apply the same values to validation and test.
:::

## 2. Outliers

First decide: **error or real?** A customer age of 250 is an error (fix or remove). An income of ₹2 crore may be real (keep, but limit its influence).

**Detect**: IQR rule (outside $[Q_1 - 1.5\,\text{IQR},\; Q_3 + 1.5\,\text{IQR}]$, where $Q_1$ and $Q_3$ are the 25th and 75th percentiles and IQR $= Q_3 - Q_1$), z-score above 3, box plots, Isolation Forest.

**Treat**: cap at the 1st and 99th percentiles (winsorising); log transform; robust scaling; robust models (trees) or losses (Huber, MAE). Never remove outliers from the test set; it should reflect reality.

## 3. Scaling and transforming numbers

$$
\text{Standardise: } z = \frac{x - \mu}{\sigma} \qquad \text{Min–max: } x' = \frac{x - x_{\min}}{x_{\max} - x_{\min}} \qquad \text{Robust: } x' = \frac{x - \text{median}}{\text{IQR}}
$$

:::symbols
- $\mu$ = mean of the feature; $\sigma$ = its standard deviation (both from training data).
- Standardised values have mean 0 and standard deviation 1.
- Min–max squeezes values into [0, 1]; one extreme value compresses everything else.
- Robust scaling uses median and IQR, so outliers have little effect.
:::

**Which models need scaling?** Anything based on distances, gradients or penalties: KNN, K-means, SVM, PCA, regularised linear and logistic regression, neural networks. **Trees and tree ensembles don't**: splits only depend on the order of values.

**Skewed features** (income, spend, counts): `log1p` (log of 1 + x, works with zeros), Box–Cox (positive values only), Yeo–Johnson (handles zeros and negatives). These make relationships closer to linear and reduce the pull of extreme values.

## 4. Encoding categories

| Method | Use when | Watch out for |
|---|---|---|
| One-hot | Few levels; linear models | Column explosion with many levels; drop one level for unregularised linear models (dummy trap) |
| Ordinal / label | Real order (Low < Medium < High); fine for trees | Creates a fake order for linear models |
| Frequency / count | High cardinality, tree models | Different categories can get the same number |
| Target (mean) encoding | High cardinality: pincode, merchant, doctor ID | **Leakage**: must be out-of-fold and smoothed |
| WOE (weight of evidence) | Credit scorecards with logistic regression | Needs binning; can leak too |
| Hashing | Huge or ever-changing categories | Collisions; not interpretable |
| Embeddings | Neural networks with very many categories | Needs enough data |
| Native support | LightGBM, CatBoost | Usually the easiest option |

### Target encoding done properly

Replace each category with the average target for that category, **smoothed** toward the overall average so rare categories don't get extreme values:

$$
\text{TE}(c) = \frac{n_c\,\bar y_c + m\,\bar y}{n_c + m}
$$

:::symbols
- $c$ = a category (e.g. city F).
- $n_c$ = number of training rows in that category.
- $\bar y_c$ = average target in that category (e.g. default rate in city F).
- $\bar y$ = overall average target.
- $m$ = smoothing strength: how many "virtual rows" of the overall average to mix in.
:::

::viz{name="fe-te"}

:::trap
**Why must target encoding be done out-of-fold?** If a row's own label is included in its category average, the feature partly contains the answer. For a category with one row, the encoding *is* the label. The model looks brilliant in training and fails in production. Compute each row's encoding from the other folds only (or use CatBoost's ordered statistics).
:::

### WOE and IV (credit risk)

$$
\text{WOE}_i = \ln\frac{\%\text{Good}_i}{\%\text{Bad}_i}, \qquad \text{IV} = \sum_i(\%\text{Good}_i - \%\text{Bad}_i)\times\text{WOE}_i
$$

:::symbols
- $i$ = a bin of the feature (e.g. income band).
- $\%\text{Good}_i$ = share of all good customers that fall in bin $i$; $\%\text{Bad}_i$ the same for bad customers.
- WOE puts every bin on the log-odds scale, which suits logistic regression; missing values can get their own bin.
- IV (information value) = how predictive the whole feature is.
:::

IV guide: below 0.02 useless · 0.02–0.1 weak · 0.1–0.3 medium · 0.3–0.5 strong · **above 0.5 suspiciously strong, check for leakage**.

## 5. Creating new features

This is where domain knowledge wins.

- **Ratios**: debt ÷ income, balance ÷ credit limit (utilisation), price per square foot. Linear models can't create these themselves.
- **Aggregations per entity** (customer, store, doctor): count, sum, mean, max, standard deviation over a time window; **RFM** = recency (days since last purchase), frequency (number of purchases), monetary (total spend).
- **Dates**: day of week, month, holiday flag, month-end flag, days since an event, tenure.
- **Cyclic encoding** so December sits next to January: $\sin(2\pi m/12)$ and $\cos(2\pi m/12)$ for month $m$.
- **Time series**: lags (sales 7 days ago), rolling mean/std/min/max, differences, growth rates. Use only data available **before** each timestamp.
- **Interactions**: age × income, product × region.
- **Binning**: income bands, age groups. Robust and interpretable, but loses detail inside each bin.
- **Text**: TF-IDF, sentence embeddings, keyword flags.
- **Geography**: distance to the nearest branch or station.

## 6. Choosing features

| Family | Examples | Trade-off |
|---|---|---|
| Filter | Correlation with target, mutual information, chi-square, ANOVA F, IV, variance threshold | Fast, ignores the model and interactions |
| Wrapper | Recursive feature elimination (RFE), forward / backward selection, Boruta | Uses the model; slow; can overfit |
| Embedded | Lasso, tree importances, SHAP-based pruning | Selection happens during training; good balance |

**Multicollinearity** check with VIF:

$$
\text{VIF}_j = \frac{1}{1 - R_j^2}
$$

where $R_j^2$ is how well feature $j$ is predicted by all the other features. VIF above 5 to 10 is a problem for **interpreting** linear coefficients (not for tree accuracy).

## 7. Data leakage: the most dangerous mistake

Leakage = information in training that **wouldn't be available at prediction time**. The model looks great in testing and fails in production.

| Type | Example |
|---|---|
| Target leakage | "Number of collection calls" in a default model: calls only happen after a customer starts missing payments |
| Train–test contamination | Scaling, imputing, encoding, SMOTE or feature selection fitted on all data before splitting |
| Time leakage | Random split on time-ordered data; rolling features that include the current or future rows |
| Group leakage | The same customer appears in both train and test |

**Warning signs**: validation AUC that looks too good to be true; one feature dominating importance; big drop in production.

**Prevention**: split first; fit every transformation on training data only; time-based and group-based splits; for every feature ask **"would I know this value at the moment I make the prediction?"**

:::say
"I start by understanding why values are missing, then use medians or a 'missing' category plus indicator flags, fitted on training data only. Outliers I cap or transform after checking whether they're errors. I scale only for distance- or penalty-based models. For high-cardinality categories I use smoothed target encoding computed out-of-fold, or CatBoost. Then I build domain features: ratios, recency-frequency aggregates, lags for time data. Throughout, I check every feature would exist at prediction time; for example, I once found a collections feature leaking the default label, and the warning sign was an AUC that was too good."
:::
