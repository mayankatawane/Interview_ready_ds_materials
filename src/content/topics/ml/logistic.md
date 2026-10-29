---
title: Logistic regression
short: Logistic regression
subject: ml
group: Supervised models
order: 2
summary: A linear model that outputs probabilities for yes/no (and multi-class) problems. The standard baseline for classification and the heart of credit scorecards.
minutes: 24
---

Logistic regression is asked about constantly: why not linear regression, what the sigmoid does, why log loss, how to read a coefficient, how multiclass works (softmax, one-vs-rest, one-vs-one), and how to handle imbalance. One of the candidates in your feedback reports lost marks exactly here, so this page goes slowly.

## 1. What is logistic regression?

Despite the name, it's a **classification** model. It predicts the **probability** that a row belongs to the positive class (default = yes, churn = yes), then turns that probability into a decision with a threshold.

It works in two steps:

1. Compute a linear score, just like linear regression: $z = w_0 + w_1x_1 + \dots + w_px_p$.
2. Squash that score into the range 0 to 1 with the **sigmoid** function to get a probability.

:::analogy
A loan officer adds up points: +2 for each missed payment, +1.5 if credit utilisation is high, −1 if income is high. The total can be any number, like −3 or +7. The sigmoid turns that total into "31% chance of default".
:::

## 2. Why not just use linear regression for yes/no?

- A straight line can predict −0.4 or 1.7, which aren't valid probabilities.
- A few extreme, easy examples can drag the line and move the decision point, even though they were already classified correctly.
- Squared error isn't the right way to judge probability guesses (more on this in section 5).

The sigmoid fixes the first problem; log loss fixes the others.

## 3. The sigmoid and odds

$$
p = \sigma(z) = \frac{1}{1 + e^{-z}}, \qquad z = w^\top x + b
$$

:::symbols
- $z$ = the linear score (also called the **logit** or log-odds).
- $w^\top x$ = each feature times its weight, added up; $b$ = the intercept (same as $w_0$).
- $e \approx 2.718$; $e^{-z}$ is large when $z$ is very negative and tiny when $z$ is very positive.
- $\sigma(z)$ = the sigmoid; the output $p$ is between 0 and 1.
:::

| $z$ | $p = \sigma(z)$ |
|---|---|
| −4 | 0.018 |
| −1 | 0.269 |
| 0 | 0.5 |
| 1 | 0.731 |
| 4 | 0.982 |

### Odds and log-odds

- **Odds** = $\frac{p}{1-p}$. A probability of 0.8 means odds of 4 ("4 to 1").
- **Log-odds** = $\log\frac{p}{1-p}$.

Rearranging the sigmoid gives the key line:

$$
\log\frac{p}{1-p} = w^\top x + b
$$

So logistic regression is a **linear model for the log-odds**. That's where "regression" in the name comes from.

::viz{name="log-sigmoid"}

## 4. Reading a coefficient

Because the log-odds are linear, one extra unit of $x_j$ adds $w_j$ to the log-odds, which **multiplies the odds by $e^{w_j}$**.

:::worked
$w_{\text{missed payments}} = 0.7$. Then $e^{0.7} \approx 2.01$: each extra missed payment roughly **doubles the odds** of default, holding other features fixed.

$w_{\text{income (lakh)}} = -0.3$: $e^{-0.3} \approx 0.74$, so each extra lakh of income cuts the odds by about 26%.
:::

:::trap
**Does a coefficient of 0.7 mean the probability goes up by 0.7?** No. It's constant on the **odds** scale, not the probability scale. The change in probability depends on where you are on the S-curve: from 0.5 it moves a lot; from 0.98 it barely moves.
:::

## 5. How it learns: maximum likelihood and log loss

We want weights that make the observed labels as **likely** as possible. For one row with label $y$ (0 or 1) and predicted probability $p$, the likelihood is $p$ if $y=1$ and $1-p$ if $y=0$. Taking the negative log and averaging over rows gives **log loss** (binary cross-entropy):

$$
L(w) = -\frac{1}{n}\sum_{i=1}^{n}\Big[y_i\log p_i + (1-y_i)\log(1-p_i)\Big]
$$

:::symbols
- $y_i$ = the true label of row $i$ (1 = positive, 0 = negative).
- $p_i$ = the predicted probability that row $i$ is positive.
- If $y_i = 1$, only $\log p_i$ counts; if $y_i = 0$, only $\log(1-p_i)$ counts.
- The minus sign turns "maximise likelihood" into "minimise loss".
:::

:::worked
True label 1.

- Model says $p = 0.9$: loss $= -\ln 0.9 = 0.105$.
- Model says $p = 0.1$: loss $= -\ln 0.1 = 2.30$ (22 times bigger).
- Model says $p = 0.01$: loss $= 4.6$.

Log loss punishes **confident mistakes** very hard. Squared error would give $(1-0.01)^2 = 0.98$ for the last case, hardly worse than being 50/50.
:::

### Why log loss and not MSE?

1. With a sigmoid, MSE is **non-convex**: its surface has bumps and flat areas where gradient descent can get stuck. Log loss is **convex**: one bowl, one bottom.
2. MSE's gradient contains $p(1-p)$, which is almost zero when the model is confidently wrong, so it barely learns from its worst mistakes. Log loss cancels that term.

### The gradient (worth knowing)

$$
\frac{\partial L}{\partial w} = \frac{1}{n}X^\top(p - y)
$$

:::symbols
- $p - y$ = "prediction minus truth" for every row.
- $X^\top(p-y)$ = each feature multiplied by those errors and summed.
:::

It has exactly the same shape as linear regression's gradient. There's no closed-form solution, so solvers iterate: `lbfgs` (default), `liblinear`, `newton-cg`, `saga`.

### Training step by step

1. Start with all weights at 0 (every probability is 0.5).
2. Compute $z$ and $p$ for every row.
3. Compute $p - y$ for every row.
4. Compute the gradient and move the weights a small step against it.
5. Repeat until the loss stops improving.

## 6. How it predicts

1. Compute $z = w^\top x + b$ for the new row.
2. $p = \sigma(z)$.
3. Predict class 1 if $p \ge$ threshold, otherwise 0.

The threshold 0.5 is only a default. Choose it on validation data from business costs (see Class imbalance).

### The decision boundary is linear

$p = 0.5$ exactly when $z = 0$, i.e. $w^\top x + b = 0$. That's a straight line (plane) in feature space, so logistic regression is a **linear classifier**. It can't separate XOR-shaped data unless you add features like $x_1 x_2$ or squares.

## 7. Multiclass: three strategies (asked in your feedback reports)

| Strategy | How it works | Models for K classes | Notes |
|---|---|---|---|
| **Multinomial (softmax)** | One weight vector per class, all trained together, probabilities normalised to sum to 1 | 1 model, K weight vectors | Default in scikit-learn with `lbfgs`. Usually best. |
| **One-vs-Rest (OvR)** | Train "class k vs everything else" for each class; pick the highest score | K | Simple; each model sees imbalanced data; scores need normalising |
| **One-vs-One (OvO)** | Train a model for every pair of classes; majority vote | $\frac{K(K-1)}{2}$ | For 5 classes: 10 models. Used by SVMs. |

The softmax:

$$
p(y = k \mid x) = \frac{e^{w_k^\top x}}{\sum_{j=1}^{K} e^{w_j^\top x}}
$$

:::symbols
- $K$ = number of classes; $w_k$ = weight vector for class $k$.
- $w_k^\top x$ = the score for class $k$.
- The exponential makes scores positive; dividing by the sum makes them add up to 1.
:::

Loss: **categorical cross-entropy**, $-\frac{1}{n}\sum_i\sum_k y_{ik}\log p_{ik}$, where $y_{ik}$ is 1 for the true class and 0 otherwise. The boundary between any two classes is still a straight line.

:::mistake
When asked about multiclass logistic regression, answer **that**: softmax, OvR, OvO and their model counts. Drifting into "I'd balance the data or use an ensemble" lost one candidate marks.
:::

## 8. Regularisation and hyperparameters

scikit-learn applies L2 regularisation by default.

| Parameter | What it does |
|---|---|
| `C` | Inverse of regularisation strength ($C = 1/\lambda$). **Smaller C = simpler model.** Default 1.0. |
| `penalty` | `"l2"` (default), `"l1"` (feature selection; needs `liblinear` or `saga`), `"elasticnet"` (`saga`), or `None` |
| `class_weight` | `"balanced"` weights classes by $\frac{n}{K\,n_c}$ to handle imbalance |
| `solver` | Optimisation method: `lbfgs`, `liblinear`, `saga`, `newton-cg` |
| `max_iter` | Raise it (and scale features) if you see a convergence warning |

:::trap
**What happens if the classes are perfectly separable?** The likelihood keeps improving as the weights grow, so without regularisation they head to infinity and the solver never converges. L2 regularisation (on by default) keeps them finite.
:::

## 9. Assumptions

- The **log-odds** are a linear function of the features.
- Observations are independent.
- Little multicollinearity (otherwise coefficients are unstable).
- Enough data: a rule of thumb is at least about 10 events (positives) per feature.
- No extreme influential outliers.

It does **not** need normally distributed features or errors, or constant variance.

## 10. Imbalanced data

1. `class_weight="balanced"` so mistakes on the rare class cost more.
2. Resample (undersample the majority, SMOTE the minority) **inside the training fold only**.
3. Tune the threshold on validation data instead of using 0.5.
4. Evaluate with PR-AUC or recall at a fixed precision, not accuracy.
5. If you need true probabilities afterwards (e.g. probability of default), **recalibrate**, because weighting and resampling inflate the predicted probabilities.

## 11. Strengths, weaknesses, when to use

**Strengths**: well-calibrated probabilities by default; coefficients explain direction and size (odds ratios); fast to train and score; tiny model; accepted by regulators (credit scorecards).

**Weaknesses**: linear boundary, so interactions must be engineered; unstable with multicollinearity; needs feature scaling, encoding and outlier handling; usually less accurate than boosting on complex tabular data.

| Good fit | Not a good fit |
|---|---|
| Credit scoring (WOE scorecard), medical risk scores | Complex non-linear patterns when accuracy is everything |
| Baseline for every binary problem | Raw images, audio |
| Text classification with TF-IDF | |
| Very large-scale click prediction | |

## 12. Code

```python
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, classification_report
import numpy as np

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
scaler = StandardScaler().fit(X_train)
Xtr, Xte = scaler.transform(X_train), scaler.transform(X_test)

clf = LogisticRegression(C=1.0, class_weight="balanced", max_iter=1000)
clf.fit(Xtr, y_train)

proba = clf.predict_proba(Xte)[:, 1]
print("ROC-AUC:", round(roc_auc_score(y_test, proba), 3))
print(classification_report(y_test, (proba >= 0.5).astype(int)))

odds_ratios = dict(zip(X.columns, np.exp(clf.coef_[0]).round(2)))   # per 1 std of each feature
print(odds_ratios)

# multiclass: softmax is the default with lbfgs
multi = LogisticRegression(max_iter=1000).fit(Xtr, y_multi_train)
```

:::say
"Logistic regression models the log-odds of the positive class as a linear function of the features and uses the sigmoid to turn that into a probability. It's trained by maximum likelihood, which means minimising log loss, and that loss is convex, so there's one global minimum. A coefficient multiplies the odds by e to the power of the coefficient. For multiclass I'd use multinomial softmax, one model with a weight vector per class; the alternatives are one-vs-rest with K models or one-vs-one with K(K−1)/2. For imbalance I use class weights, tune the threshold on validation and judge with PR-AUC, and recalibrate if the probabilities themselves matter."
:::
