---
title: Boosting — AdaBoost and Gradient Boosting
short: AdaBoost & Gradient Boosting
subject: ml
group: Supervised models
order: 5
summary: Build small trees one after another, each fixing what the previous ones got wrong. The idea behind XGBoost, LightGBM and CatBoost.
minutes: 22
---

XGBoost, LightGBM and CatBoost are all versions of **gradient boosting**. If you can explain plain gradient boosting clearly, with a small numeric example, every follow-up about those libraries becomes much easier.

## 1. What is boosting?

Boosting builds a strong model from many **weak** models (usually small trees), trained **one after another**. Each new tree focuses on the mistakes the trees before it still make. The final prediction is the sum of all their contributions.

:::analogy
Golf. Your first shot gets the ball most of the way. Your second shot only has to cover the remaining distance. The third covers what's left after that. Each shot is small and imperfect, but together they reach the hole. In gradient boosting, the "remaining distance" is the **residual**: truth minus current prediction.
:::

## 2. Bagging vs boosting

Both combine many trees, but in opposite ways. This comparison is asked constantly.

| | Bagging (Random Forest) | Boosting (GBM, XGBoost, LightGBM) |
|---|---|---|
| How trees are built | Independently, in parallel | One after another; each depends on the previous ones |
| Tree size | Deep (low bias, high variance) | Shallow, depth 3 to 8 (high bias, low variance) |
| What it mainly reduces | Variance | Bias |
| More trees | Never overfits, just plateaus | **Can overfit**; needs early stopping |
| Noisy labels / outliers | Fairly robust | Sensitive (keeps chasing them) |
| Tuning effort | Low | Higher |
| Typical accuracy on tabular data | Very good | Usually best when tuned |

## 3. Gradient boosting step by step (regression)

### The idea in plain words

1. Start with a very simple prediction for everyone: the **average** of the target.
2. Compute how wrong it is for each row: the **residual** $=$ truth − prediction.
3. Fit a small tree that predicts those residuals from the features.
4. Add that tree's output to the current prediction, but only a fraction of it (the **learning rate**).
5. Recompute residuals and repeat for many rounds.

### Worked example

:::worked
Three flats, prices in ₹ lakh: **50, 70, 90**. Learning rate $\eta = 0.1$.

**Round 0.** Predict the average for everyone: 70, 70, 70. Residuals: **−20, 0, +20**.

**Round 1.** A small tree learns from the features: "small flats → −20, medium → 0, large → +20". Add 0.1 × that: predictions become **68, 70, 72**. New residuals: −18, 0, +18.

**Round 2.** Another tree fits −18, 0, +18. Add 0.1 ×: predictions **66.2, 70, 73.8**. Residuals: −16.2, 0, +16.2.

Each round closes 10% of the remaining gap. After many rounds the predictions approach 50, 70, 90. A smaller learning rate needs more rounds but generalises better, because no single tree can push the model too far.
:::

::viz{name="gb-1d"}

## 4. Why it's called "gradient" boosting

The residual is a special case of something more general. For any loss function $L$, each round fits the new tree to the **negative gradient** of the loss with respect to the current prediction. These targets are called **pseudo-residuals**.

$$
F_0(x) = \arg\min_c \sum_{i=1}^{n} L(y_i, c)
$$

$$
r_{im} = -\left[\frac{\partial L\big(y_i, F(x_i)\big)}{\partial F(x_i)}\right]_{F = F_{m-1}}
$$

$$
F_m(x) = F_{m-1}(x) + \eta\, h_m(x)
$$

:::symbols
- $F_m(x)$ = the model's prediction after $m$ rounds.
- $F_0(x)$ = the starting prediction: the single constant $c$ that minimises the loss (the mean for squared error).
- $\arg\min_c$ = "the value of $c$ that makes this smallest".
- $L(y, F)$ = the loss: how bad prediction $F$ is when the truth is $y$.
- $\frac{\partial L}{\partial F(x_i)}$ = how much the loss for row $i$ changes if we nudge its prediction. The minus sign points toward lower loss.
- $r_{im}$ = the pseudo-residual for row $i$ in round $m$: the target the new tree learns.
- $h_m(x)$ = the small tree fitted in round $m$.
- $\eta$ ("eta") = learning rate, between 0 and 1.
:::

What the pseudo-residual turns into for common losses:

| Loss | Pseudo-residual | Meaning |
|---|---|---|
| Squared error $\frac{1}{2}(y-F)^2$ | $y - F$ | The ordinary residual |
| Absolute error $\lvert y-F\rvert$ | $\text{sign}(y - F)$ | Only the direction (+1 or −1), robust to outliers |
| Log loss (classification, $F$ = log-odds) | $y - p$ | Label minus predicted probability |

So gradient boosting is **gradient descent**, but instead of nudging weights it nudges the predictions, using a tree to decide how much to nudge each region of feature space. That's why it works with any differentiable loss.

## 5. Gradient boosting for classification

The model works on the **log-odds** scale (like logistic regression):

1. Start with $F_0$ = log-odds of the overall positive rate. If 20% of customers churn: $\log(0.2/0.8) = -1.386$.
2. Convert to a probability with the sigmoid: $p = \sigma(F)$.
3. Pseudo-residuals: $y - p$ (e.g. a churner with $p = 0.2$ has residual 0.8).
4. Fit a small regression tree to those residuals.
5. Each leaf's value is computed with a Newton step: $\frac{\sum (y_i - p_i)}{\sum p_i(1-p_i)}$ over the rows in that leaf.
6. Add $\eta \times$ leaf value to $F$ and repeat.

## 6. AdaBoost: the original boosting

AdaBoost (Adaptive Boosting) doesn't fit residuals. It **re-weights rows**: rows the current model gets wrong become heavier, so the next weak learner (usually a one-split "stump") focuses on them. Each learner gets a vote based on how accurate it was.

$$
\varepsilon_m = \sum_{i} w_i\,\mathbb{1}\big[h_m(x_i)\ne y_i\big], \qquad \alpha_m = \frac{1}{2}\ln\frac{1-\varepsilon_m}{\varepsilon_m}
$$

$$
w_i \leftarrow w_i\, e^{-\alpha_m y_i h_m(x_i)} \;\;\text{(then rescale so weights sum to 1)}, \qquad F(x) = \text{sign}\Big(\sum_m \alpha_m h_m(x)\Big)
$$

:::symbols
- $w_i$ = weight of row $i$ (all start equal, $1/n$).
- $h_m(x)$ = weak learner $m$; predicts −1 or +1. Labels $y_i$ are also −1 or +1.
- $\mathbb{1}[\cdot]$ = 1 if the condition is true, else 0. So $\varepsilon_m$ = weighted error rate.
- $\alpha_m$ = the learner's say in the final vote.
- $y_i h_m(x_i)$ = +1 if correct, −1 if wrong. So correct rows' weights shrink ($e^{-\alpha}$), wrong rows' weights grow ($e^{+\alpha}$).
- $\text{sign}(\cdot)$ = +1 if positive, −1 if negative.
:::

:::worked
A stump has weighted error $\varepsilon = 0.2$. Its vote: $\alpha = \frac{1}{2}\ln\frac{0.8}{0.2} = \frac{1}{2}\ln 4 = 0.69$.

A stump at 50% error gets $\alpha = \frac{1}{2}\ln 1 = 0$: no say, because it's no better than a coin flip. Above 50% error $\alpha$ turns negative and its votes get flipped.

Misclassified rows get multiplied by $e^{0.69} \approx 2$, correct rows by $e^{-0.69} \approx 0.5$, then all are rescaled.
:::

AdaBoost is gradient boosting with **exponential loss** $e^{-yF}$. That loss explodes for badly misclassified points, which is why AdaBoost is very sensitive to outliers and wrong labels.

## 7. Hyperparameters

| Parameter | What it does | Typical |
|---|---|---|
| `n_estimators` | Number of boosting rounds (trees) | 100 to several thousand, chosen by early stopping |
| `learning_rate` | Shrinks each tree's contribution | 0.01 to 0.1 |
| `max_depth` | Size of each tree; depth $d$ can capture interactions between up to $d$ features | 3 to 8 |
| `subsample` | Fraction of rows each tree sees (stochastic gradient boosting) | 0.6 to 0.9 |
| `min_samples_leaf` | Smallest allowed leaf | 1 to 50 |
| `max_features` | Features tried per split | 0.5 to 1.0 |
| `loss` | `squared_error`, `absolute_error`, `huber` (robust), `quantile` | depends on goal |

:::trap
**What's the relationship between learning rate and number of trees?** They trade off. Halve the learning rate and you need roughly twice as many trees to reach the same training fit, but the result usually generalises better. Standard practice: small learning rate, many trees, and **early stopping** on a validation set to pick the number of trees.
:::

### Early stopping

After each round, score a validation set. If the score hasn't improved for, say, 50 rounds, stop and keep the best round. This is the main defence against boosting's overfitting. Never use the test set for it.

## 8. Strengths, weaknesses, when to use

**Strengths**: usually the most accurate model on tabular data; any differentiable loss (regression, classification, ranking, quantiles); captures complex interactions; works well with SHAP for explanations.

**Weaknesses**: trees are built sequentially, so training is slower than Random Forest; more hyperparameters; overfits with too many rounds or a high learning rate; sensitive to noisy labels and outliers.

| Good fit | Not a good fit |
|---|---|
| Churn, credit risk, fraud, propensity, pricing | Images, audio, raw text |
| Competitions and anywhere accuracy on tables matters | Very noisy labels (Random Forest is more robust) |
| Custom objectives (ranking, Tweedie for insurance) | Tiny datasets without careful tuning |

In practice you'll use XGBoost, LightGBM or CatBoost rather than scikit-learn's `GradientBoostingClassifier`. scikit-learn's `HistGradientBoostingClassifier` is a fast LightGBM-style option built in.

## 9. Code

```python
from sklearn.ensemble import GradientBoostingClassifier, HistGradientBoostingClassifier, AdaBoostClassifier
from sklearn.metrics import roc_auc_score

gb = GradientBoostingClassifier(
    n_estimators=2000, learning_rate=0.05, max_depth=3, subsample=0.8,
    validation_fraction=0.1, n_iter_no_change=50, random_state=42)   # built-in early stopping
gb.fit(X_train, y_train)
print("Trees used:", gb.n_estimators_)
print("Test ROC-AUC:", roc_auc_score(y_test, gb.predict_proba(X_test)[:, 1]))

hgb = HistGradientBoostingClassifier(learning_rate=0.05, max_iter=2000, early_stopping=True)
hgb.fit(X_train, y_train)          # handles missing values natively

ada = AdaBoostClassifier(n_estimators=300, learning_rate=0.5).fit(X_train, y_train)
```

:::say
"Boosting builds shallow trees one after another. In gradient boosting each new tree is fitted to the negative gradient of the loss with respect to the current predictions, which for squared error is just the residual, and it's added with a learning rate. So it's gradient descent in function space. It mainly reduces bias, unlike bagging, which reduces variance. Because it keeps correcting errors it can overfit with too many rounds, so I use a small learning rate with early stopping on a validation set. AdaBoost is the older version that re-weights misclassified rows; it's gradient boosting with exponential loss, which makes it sensitive to outliers."
:::
