---
title: XGBoost
short: XGBoost
subject: ml
group: Supervised models
order: 6
summary: Gradient boosting with a regularised objective, second-order maths, built-in missing-value handling and a lot of speed engineering. The go-to model for tabular data.
minutes: 26
---

XGBoost ("eXtreme Gradient Boosting") is the model most data scientists name as their favourite for tabular data, so interviewers dig deep: what it adds over plain gradient boosting, the leaf-weight and gain formulas, what gamma, lambda and min_child_weight actually do, and how it handles missing values. Read the AdaBoost & Gradient Boosting page first if boosting itself feels shaky.

## 1. What is XGBoost?

XGBoost is a library that implements gradient-boosted decision trees with several improvements:

| Improvement | In simple words |
|---|---|
| Regularised objective | Every tree pays a penalty for having many leaves and for large leaf values, so it can't overfit as easily |
| Second-order (Newton) step | Uses both the slope **and** the curvature of the loss to decide how big each leaf's correction should be |
| Gain-based pruning | A split is kept only if it improves the objective by more than a minimum amount ($\gamma$) |
| Sparsity-aware splits | Learns which way to send missing values at every split |
| Histogram / quantile sketch | Tries ~256 bucket boundaries instead of every unique value: much faster |
| Shrinkage and subsampling | Learning rate, row and column sampling, like other boosting libraries |
| Systems engineering | Parallel split search, cache-friendly data layout, GPU support, out-of-core training |
| Extras | Early stopping, monotonic constraints, custom loss functions, native categorical support (newer versions) |

:::analogy
Plain gradient boosting is a golfer correcting each shot. XGBoost is the same golfer who also reads the slope of the green before putting (second derivative), and who is fined for every extra shot ($\gamma$ per leaf) and for hitting too hard ($\lambda$ on leaf values).
:::

## 2. The objective XGBoost minimises

$$
\mathcal{L} = \sum_{i=1}^{n} l(y_i, \hat y_i) + \sum_{k=1}^{K}\Omega(f_k), \qquad \Omega(f) = \gamma\,T + \frac{1}{2}\lambda\sum_{j=1}^{T} w_j^2
$$

:::symbols
- $l(y_i, \hat y_i)$ = the loss for row $i$ (e.g. squared error or log loss) comparing truth $y_i$ with prediction $\hat y_i$.
- $f_k$ = tree number $k$; $K$ = number of trees.
- $\Omega(f)$ ("omega") = the complexity penalty for one tree.
- $T$ = number of leaves in the tree.
- $w_j$ = the output value (weight) of leaf $j$: what the tree adds to the prediction for rows landing there.
- $\gamma$ ("gamma") = penalty per leaf. $\lambda$ ("lambda") = L2 penalty on leaf values. (There's also $\alpha$ for an L1 penalty.)
:::

In words: **fit the data well, but keep each tree small and its corrections modest.**

## 3. The second-order trick, in plain steps

When adding a new tree, XGBoost approximates the loss around the current predictions using two numbers per row:

$$
g_i = \frac{\partial\, l(y_i, \hat y_i)}{\partial \hat y_i}, \qquad h_i = \frac{\partial^2 l(y_i, \hat y_i)}{\partial \hat y_i^2}
$$

:::symbols
- $g_i$ = **gradient**: the slope of the loss for row $i$. Which direction to move the prediction, and how strongly.
- $h_i$ = **hessian**: the curvature (second derivative). How quickly that slope changes, i.e. how confident we can be in a big step.
:::

For each leaf, add these up over the rows that land in it:

$$
G_j = \sum_{i \in \text{leaf } j} g_i, \qquad H_j = \sum_{i \in \text{leaf } j} h_i
$$

What $g$ and $h$ are for the two common losses:

| Loss | $g_i$ | $h_i$ |
|---|---|---|
| Squared error | $\hat y_i - y_i$ (prediction minus truth, i.e. minus the residual) | 1 |
| Log loss ($\hat y$ = log-odds, $p = \sigma(\hat y)$) | $p_i - y_i$ | $p_i(1 - p_i)$ |

## 4. The two formulas everything comes from

### Best value for a leaf

$$
w_j^* = -\frac{G_j}{H_j + \lambda}
$$

For squared error this is $\frac{\text{sum of residuals}}{\text{number of rows} + \lambda}$: the average residual, shrunk toward zero by $\lambda$.

### Gain of a split

First define a leaf's **similarity score** (how much the loss drops by giving that group its best value):

$$
\text{Similarity} = \frac{G^2}{H + \lambda}
$$

Then a split of a node into left (L) and right (R) has:

$$
\text{Gain} = \frac{1}{2}\Big[\frac{G_L^2}{H_L+\lambda} + \frac{G_R^2}{H_R+\lambda} - \frac{(G_L+G_R)^2}{H_L+H_R+\lambda}\Big] - \gamma
$$

:::symbols
- $G_L, H_L$ = sums of gradients and hessians of the rows going left; $G_R, H_R$ for the right.
- The first two terms: how good the two children are. The third: how good the parent was. Their difference is the improvement from splitting.
- $-\gamma$: the cost of adding one more leaf. If Gain is not positive, the split is not kept (pruned).
:::

:::worked
Regression, squared error, $\lambda = 1$, $\gamma = 0$. A node has 3 rows with residuals 4, 6, 8 (so $g$ = −4, −6, −8 and $h$ = 1 each).

- Leaf value if we don't split: $G = -18$, $H = 3$ → $w^* = 18 / (3+1) = 4.5$. (Without $\lambda$ it would be 6, the plain average.)
- Similarity of the node: $18^2 / 4 = 81$.
- Try splitting {4} vs {6, 8}: left similarity $= 4^2/(1+1) = 8$; right $= 14^2/(2+1) = 65.3$.
- Gain $= \frac{1}{2}(8 + 65.3 - 81) - 0 = -3.83$. Negative: **don't split**, the regularisation makes this tiny split not worth it.
:::

::viz{name="xgb-gain"}

## 5. What each regularisation knob actually does

| Knob | Where it acts | Effect |
|---|---|---|
| `reg_lambda` ($\lambda$, default 1) | Added to $H$ in the denominator | Shrinks leaf values toward 0, especially small leaves (a 1-row leaf with $\lambda = 1$ gets only half its residual) |
| `reg_alpha` ($\alpha$, default 0) | L1 on leaf values | Can make leaf values exactly 0; useful with many features |
| `gamma` / `min_split_loss` (default 0) | Subtracted from gain | Minimum improvement required to split: prunes weak splits |
| `min_child_weight` (default 1) | Minimum $H$ in each child | For squared error $h = 1$, so it's the minimum rows per leaf. For log loss $h = p(1-p)$ is small for confident rows, so 100 very confident rows can still count as "too light" |
| `max_depth` (default 6) | Tree size | Deeper = more interactions, more overfitting |
| `learning_rate` / `eta` (default 0.3) | Scales each tree | Lower = more trees needed, usually better generalisation |
| `subsample`, `colsample_bytree` | Row and column sampling | Adds randomness, reduces variance |

## 6. How XGBoost handles missing values

At every split it tries sending **all rows with a missing value** to the left child, then to the right child, and keeps whichever gives the higher gain. That **default direction** is stored in the tree and used at prediction time. So missingness itself can carry signal ("income not provided" can behave differently from any actual income), and you don't need to impute.

If a feature had no missing values in training but has them at prediction time, they follow the stored default direction anyway.

## 7. How training and prediction work end to end

**Training**

1. Start every prediction at `base_score` (or the average / log-odds of the positive rate).
2. Compute $g_i$ and $h_i$ for every row.
3. Grow a tree: at each node, try splits (on histogram bin boundaries), compute the gain with the formula, keep the best, stop when gain ≤ 0 or `max_depth` / `min_child_weight` limits are hit.
4. Set each leaf to $w^* = -G/(H+\lambda)$.
5. Add learning rate × tree to every row's prediction.
6. Check the validation metric; stop early if it hasn't improved for `early_stopping_rounds`.
7. Repeat from step 2.

**Prediction**: send the row through every tree, add up the leaf values plus the base score. For classification, apply the sigmoid (binary) or softmax (multiclass) to get probabilities.

## 8. Hyperparameters that matter, with ranges

| Parameter | Typical range | Tune because… |
|---|---|---|
| `n_estimators` + `early_stopping_rounds` | up to 5,000, stop after 50 to 100 bad rounds | Let early stopping choose |
| `learning_rate` | 0.01 to 0.1 for final models | Lower is safer |
| `max_depth` | 3 to 10 | Main complexity control |
| `min_child_weight` | 1 to 20 | Prevents tiny, noisy leaves |
| `subsample` | 0.6 to 1.0 | Row sampling |
| `colsample_bytree` | 0.5 to 1.0 | Feature sampling |
| `gamma` | 0 to 5 | Prune weak splits |
| `reg_lambda`, `reg_alpha` | λ 1 to 10, α 0 to 1 | Shrink leaf values |
| `scale_pos_weight` | #negatives / #positives | Class imbalance |
| `max_delta_step` | 0 to 10 | Stabilises updates with extreme imbalance |

**A tuning order that works**: (1) learning rate 0.1 with early stopping to find the number of trees; (2) `max_depth` and `min_child_weight`; (3) `subsample` and `colsample_bytree`; (4) `gamma`, `lambda`, `alpha`; (5) lower the learning rate to 0.01 to 0.05 and retrain with early stopping.

## 9. Feature importance types

| Type | Meaning |
|---|---|
| `weight` | How many times a feature is used to split. Biased toward continuous features. |
| `gain` | Average loss reduction when the feature is used. Usually the most meaningful. |
| `cover` | Average number of rows (hessian sum) affected by its splits. |
| `total_gain`, `total_cover` | The sums instead of averages. |

They can rank features differently. For explanations people can trust, use **SHAP** (TreeSHAP is exact and fast for XGBoost).

## 10. Strengths, weaknesses, when to use

**Strengths**: top accuracy on tabular data; native missing values; built-in regularisation; fast (parallel, histogram, GPU); custom losses; monotonic constraints for regulated models; early stopping.

**Weaknesses**: many hyperparameters; sensitive to target outliers and label noise; less interpretable than linear models (needs SHAP); can't extrapolate; can be slower than LightGBM on very large data; categorical features traditionally need encoding.

| Good fit | Not a good fit |
|---|---|
| Credit risk challenger models, fraud, churn, propensity | Images, audio, raw text |
| Any structured data with non-linear effects and missing values | Very small data where a linear model generalises better |
| Ranking (with `rank:pairwise`, `rank:ndcg`) | When a fully transparent scorecard is mandatory |

## 11. Code

```python
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, average_precision_score

X_tr, X_val, y_tr, y_val = train_test_split(X_train, y_train, test_size=0.2, stratify=y_train, random_state=42)

model = XGBClassifier(
    n_estimators=5000, learning_rate=0.05, max_depth=5, min_child_weight=5,
    subsample=0.8, colsample_bytree=0.8, reg_lambda=1.0, gamma=0,
    scale_pos_weight=(y_tr == 0).sum() / (y_tr == 1).sum(),
    eval_metric="aucpr", early_stopping_rounds=100, tree_method="hist")
model.fit(X_tr, y_tr, eval_set=[(X_val, y_val)], verbose=False)

proba = model.predict_proba(X_test)[:, 1]
print("Best iteration:", model.best_iteration)
print("ROC-AUC:", roc_auc_score(y_test, proba), "PR-AUC:", average_precision_score(y_test, proba))

import shap
shap_values = shap.TreeExplainer(model).shap_values(X_test)   # per-row explanations
```

:::say
"XGBoost is gradient boosting with a regularised objective: a gamma penalty per leaf and L2 and L1 penalties on leaf values. It uses a second-order Taylor approximation of the loss, so each leaf gets a closed-form value of minus G over H plus lambda, and every candidate split gets a gain score; splits with gain below gamma are pruned. It handles missing values by learning a default direction at each split, and it's fast because split finding uses histograms and runs in parallel. I tune depth, min_child_weight, subsampling and regularisation, with a low learning rate and early stopping on a validation set."
:::
