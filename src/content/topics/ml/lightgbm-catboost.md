---
title: LightGBM and CatBoost
short: LightGBM & CatBoost
subject: ml
group: Supervised models
order: 7
summary: Two other gradient-boosting libraries. LightGBM is built for speed on big data; CatBoost is built for categorical features and good results with default settings.
minutes: 18
---

All three popular boosting libraries (XGBoost, LightGBM, CatBoost) do gradient boosting with trees. Interviewers want to know **what's different** and **when you'd pick each**. Read the XGBoost page first; this page focuses on the differences.

## 1. LightGBM in one paragraph

LightGBM (Light Gradient Boosting Machine, from Microsoft) is gradient boosting engineered for speed and low memory. It gets there with four ideas: **histogram binning**, **leaf-wise tree growth**, **GOSS** (smart row sampling) and **EFB** (bundling sparse features). It's usually the fastest choice on millions of rows.

## 2. LightGBM's four speed ideas

### A. Histogram binning

Instead of trying every unique value of a feature as a split threshold, LightGBM first buckets each feature into at most 255 bins (`max_bin`), once, before training. Split search then only looks at bin boundaries.

:::worked
A feature with 1,000,000 distinct income values would need up to 999,999 candidate thresholds. With 255 bins, only 254. The best split is found about 4,000 times faster, with almost no loss in accuracy because neighbouring thresholds give nearly the same gain.
:::

XGBoost's `tree_method="hist"` uses the same idea now.

### B. Leaf-wise growth

- **Level-wise** (XGBoost's default): split every node at the current depth before going one level deeper. Trees come out balanced.
- **Leaf-wise** (LightGBM): look at all current leaves and split **the single leaf with the biggest gain**, wherever it is. Trees come out lopsided and deep on the side where the signal is.

::viz{name="lgbm-growth"}

With the same number of leaves, leaf-wise reaches a lower training loss, which is good for big data. But on small data it can grow deep, narrow branches that fit noise. That's why LightGBM's main complexity control is **`num_leaves`**, not `max_depth`.

### C. GOSS: Gradient-based One-Side Sampling

Rows with **large gradients** are rows the model is still getting badly wrong. They carry most of the information about where to split. Rows with small gradients are already predicted well.

GOSS keeps **all** of the top $a\%$ of rows by gradient size, randomly samples $b\%$ of the rest, and multiplies the sampled small-gradient rows' weight by $\frac{1-a}{b}$ so the gain calculation stays unbiased.

:::worked
1,000,000 rows, $a = 20\%$, $b = 10\%$: keep 200,000 large-gradient rows plus 80,000 sampled from the other 800,000. Each sampled row counts $\frac{1 - 0.2}{0.1} = 8$ times. Split search uses 280,000 rows instead of 1,000,000.
:::

### D. EFB: Exclusive Feature Bundling

Many sparse features are almost never non-zero at the same time (one-hot columns are the extreme case: only one is 1 per row). LightGBM bundles such "mutually exclusive" features into a single feature by shifting their value ranges so they don't overlap. Fewer features to scan, almost no information lost.

### Plus: native categorical splits

For a categorical feature, LightGBM sorts the categories by their average gradient statistic and finds the best place to cut that ordering into two groups. That finds a good partition of categories without one-hot encoding.

## 3. CatBoost in one paragraph

CatBoost (Categorical Boosting, from Yandex) focuses on **categorical features** and on a subtle kind of overfitting called **prediction shift**. It uses **ordered target statistics**, **ordered boosting** and **symmetric trees**, and it's known for strong results with default settings.

## 4. CatBoost's three ideas

### A. Ordered target statistics

Target encoding replaces a category with the average target for that category (e.g. city → default rate in that city). Done naively, each row's own label leaks into its own feature, which inflates scores.

CatBoost shuffles the rows into a random order and encodes each row using **only the rows before it**:

$$
\hat x_i = \frac{\sum_{j < i,\; x_j = x_i} y_j \;+\; a \cdot P}{\big|\{j < i : x_j = x_i\}\big| \;+\; a}
$$

:::symbols
- $\hat x_i$ = the encoded value for row $i$'s category.
- $j < i$ = rows that come before row $i$ in the random order.
- $x_j = x_i$ = rows with the same category as row $i$.
- $y_j$ = their target values; the sum adds them up.
- $|\{\dots\}|$ = how many such rows there are.
- $P$ = a prior (usually the overall average target); $a$ = how much weight the prior gets. This smooths rare categories.
:::

:::worked
Rows in shuffled order, all from city "Pune", targets: 1, 0, 1, 1. Prior $P = 0.2$, $a = 1$.

- Row 1: no earlier Pune rows → $(0 + 0.2)/(0 + 1) = 0.20$
- Row 2: earlier targets {1} → $(1 + 0.2)/(1 + 1) = 0.60$
- Row 3: earlier {1, 0} → $(1 + 0.2)/(2 + 1) = 0.40$
- Row 4: earlier {1, 0, 1} → $(2 + 0.2)/(3 + 1) = 0.55$

No row ever sees its own label. CatBoost repeats this with several permutations to reduce noise.
:::

It can also build **combinations** of categorical features automatically (e.g. city × product).

### B. Ordered boosting: fixing prediction shift

In standard boosting, the residual for a row is computed by a model that was trained on that same row, so residuals on training rows are slightly too optimistic compared with new data. CatBoost computes each row's residual using a model built only from rows earlier in a permutation. It's the same "never use your own label" idea, applied to boosting itself.

### C. Symmetric (oblivious) trees

Every node at the same depth uses **the same split**. A depth-3 tree asks exactly 3 questions, and the 3 yes/no answers form a 3-bit number that indexes one of 8 leaves.

- Balanced trees act as regularisation (less overfitting).
- Prediction is extremely fast: a few comparisons and a table lookup.
- Less flexible per tree, so it may need more trees.

## 5. XGBoost vs LightGBM vs CatBoost

| | XGBoost | LightGBM | CatBoost |
|---|---|---|---|
| Tree growth | Level-wise (default) | Leaf-wise | Symmetric |
| Speed on large data | Good (hist, GPU) | Fastest, lowest memory | Slower to train, fastest to predict |
| Categorical features | Encode yourself (native support is newer) | Native | Best native handling |
| Main complexity knob | `max_depth` | `num_leaves` (+ `min_data_in_leaf`) | `depth` |
| Overfitting risk | Medium | Higher on small data | Lower |
| Tuning effort | Medium | Medium | Low (good defaults) |
| Pick when | Strong general default, mature ecosystem | Millions of rows, many features, speed matters | Many high-cardinality categoricals, little tuning time |

## 6. LightGBM hyperparameters

| Parameter | What it does | Typical |
|---|---|---|
| `num_leaves` | Max leaves per tree: the **main** complexity control. Keep it well below $2^{\text{max\_depth}}$ | 15 to 255 (default 31) |
| `min_data_in_leaf` (`min_child_samples`) | Minimum rows per leaf: the key guard against leaf-wise overfitting | 20 to 500 |
| `max_depth` | Extra safety cap; −1 = none | −1 or 6 to 12 |
| `learning_rate` + `n_estimators` | As in any boosting; use early stopping | 0.01 to 0.1 |
| `feature_fraction` | Column sampling per tree | 0.6 to 0.9 |
| `bagging_fraction` + `bagging_freq` | Row sampling (needs `bagging_freq` > 0) | 0.6 to 0.9, freq 1 |
| `lambda_l1`, `lambda_l2`, `min_gain_to_split` | Regularisation | small values |
| `is_unbalance` or `scale_pos_weight` | Class imbalance | |
| `max_bin` | Number of histogram bins | 255 (default) |

:::trap
**Why does `num_leaves = 2^max_depth` overfit?** A level-wise tree of depth 7 has at most 128 leaves, all balanced. A leaf-wise tree with 128 leaves can be much deeper than 7 on one side, building very specific rules for small groups. Keep `num_leaves` well below $2^{\text{max\_depth}}$ and raise `min_data_in_leaf` on small datasets.
:::

## 7. CatBoost hyperparameters

| Parameter | What it does |
|---|---|
| `iterations`, `learning_rate` | Number of trees and step size (it can pick a learning rate automatically) |
| `depth` | Depth of the symmetric trees (default 6) |
| `l2_leaf_reg` | L2 regularisation on leaf values |
| `cat_features` | Which columns are categorical (pass them raw, no encoding) |
| `one_hot_max_size` | Categories with at most this many levels get one-hot instead of target statistics |
| `auto_class_weights` | `"Balanced"` for imbalance |

## 8. Code

```python
import lightgbm as lgb
from catboost import CatBoostClassifier

lgbm = lgb.LGBMClassifier(n_estimators=5000, learning_rate=0.05, num_leaves=31,
                          min_child_samples=50, feature_fraction=0.8,
                          bagging_fraction=0.8, bagging_freq=1)
lgbm.fit(X_tr, y_tr, eval_set=[(X_val, y_val)], eval_metric="auc",
         callbacks=[lgb.early_stopping(100), lgb.log_evaluation(0)])

cat_cols = ["city", "channel", "product"]          # raw strings are fine
cb = CatBoostClassifier(iterations=5000, learning_rate=0.05, depth=6,
                        eval_metric="AUC", early_stopping_rounds=100, verbose=0)
cb.fit(X_tr, y_tr, cat_features=cat_cols, eval_set=(X_val, y_val))
```

:::say
"All three are gradient-boosted trees. LightGBM is fastest on big data: it bins features into histograms, grows trees leaf-wise by always splitting the leaf with the largest gain, uses GOSS to keep large-gradient rows and sample the rest, and EFB to bundle sparse features. Because of leaf-wise growth I control it mainly with num_leaves and min_data_in_leaf. CatBoost is best with categorical features: ordered target statistics encode categories using only earlier rows so there's no target leakage, ordered boosting reduces prediction shift, and symmetric trees make prediction very fast. I'd pick LightGBM for scale, CatBoost for many categoricals or little tuning time, XGBoost as a strong general default."
:::
