---
title: Class imbalance
short: Class imbalance
subject: ml
group: Data and features
order: 2
summary: When the class you care about is rare (fraud, default, churn), accuracy lies. Fix it with the right metric, class weights, careful resampling and a tuned threshold.
minutes: 18
---

"How do you handle class imbalance?" is one of the most common ML interview questions. A strong answer covers four levels in order (metric, algorithm, data, decision threshold) and avoids the classic leakage trap with SMOTE.

## 1. What's the problem?

If 2% of customers default, a model that predicts "no default" for everyone is **98% accurate** and completely useless. With rare positives:

- Accuracy is dominated by the big class.
- Models learn mostly from the majority and treat the minority as noise.
- Default thresholds (0.5) are usually wrong.

:::analogy
An airport scanner that never raises an alarm is 99.99% "accurate". What matters is how many threats it catches (recall) and how many bags it opens for nothing (precision).
:::

## 2. Level 1: pick the right metric

Stop using accuracy. Use:

- **PR-AUC** (average precision): focuses on the rare class. A random model scores the positive rate (e.g. 0.02).
- **Recall at a fixed precision** (or the other way round): matches business limits ("we can only investigate alerts with at least 30% hit rate").
- **F1 or Fβ**: balance precision and recall (β > 1 favours recall).
- **Precision@k**: if the team can act on only k cases per day.
- **Expected cost**: cost of misses × misses + cost of false alarms × false alarms.

ROC-AUC can look flattering with heavy imbalance (see Classification metrics).

## 3. Level 2: make the algorithm care about the rare class

**Class weights** make each mistake on the rare class cost more in the loss:

$$
w_c = \frac{n}{K\,n_c} \qquad\qquad \texttt{scale\_pos\_weight} = \frac{\#\text{negatives}}{\#\text{positives}}
$$

:::symbols
- $w_c$ = weight for class $c$; $n$ = total rows; $K$ = number of classes; $n_c$ = rows in class $c$.
- `scale_pos_weight` = XGBoost/LightGBM's version for binary problems.
:::

:::worked
10,000 rows, 200 frauds. Weight for fraud $= \frac{10000}{2 \times 200} = 25$; weight for normal $= \frac{10000}{2 \times 9800} \approx 0.51$. Missing one fraud now costs as much as about 49 false alarms.
:::

This is usually the **first thing to try**: no data is thrown away or invented. In scikit-learn: `class_weight="balanced"`.

**Focal loss** (deep learning): $-\alpha_t(1 - p_t)^\gamma \log p_t$. The factor $(1 - p_t)^\gamma$ shrinks the loss for examples already classified confidently ($p_t$ = predicted probability of the true class), so training focuses on hard examples. $\gamma \approx 2$ is common.

## 4. Level 3: change the training data (carefully)

| Method | How | Pros / cons |
|---|---|---|
| Random undersampling | Drop majority rows | Fast; throws away information |
| Random oversampling | Duplicate minority rows | Simple; can overfit the duplicates |
| **SMOTE** | Create synthetic minority points between neighbours | Smoother than duplicating; can create unrealistic points |
| Borderline-SMOTE, ADASYN | Generate more where classes overlap / where it's harder | More focused |
| SMOTE + Tomek links / ENN | Generate, then clean overlapping points | Cleaner boundary |
| BalancedRandomForest, EasyEnsemble | Each model trains on a balanced subsample | Uses all data across the ensemble |

### SMOTE in plain words

1. Pick a minority point.
2. Find its k nearest minority neighbours (k = 5 by default).
3. Pick one neighbour at random.
4. Create a new point somewhere on the straight line between them.

$$
x_{\text{new}} = x_i + \lambda\,(x_{nn} - x_i), \qquad \lambda \sim \text{Uniform}(0, 1)
$$

:::symbols
- $x_i$ = the chosen minority point; $x_{nn}$ = one of its nearest minority neighbours.
- $\lambda$ ("lambda") = a random number between 0 and 1: how far along the line to place the new point.
:::

::viz{name="imb-smote"}

:::trap
**When should SMOTE be applied?** Only to the **training data**, after splitting, inside each cross-validation fold (use `imblearn.pipeline.Pipeline`). If you SMOTE before splitting, synthetic points built from test rows end up in training, and your scores are inflated. **Never resample the validation or test set**; they must keep the real class ratio.
:::

## 5. Level 4: choose the decision threshold

A model outputs a probability; 0.5 is just a default. Pick the threshold on validation data:

- the one that maximises F1 or Fβ,
- the one that hits a required recall or precision,
- the one that gives a fixed number of alerts per day, or
- the one that minimises expected cost. With calibrated probabilities:

$$
\text{predict positive if } p > \frac{C_{FP}}{C_{FP} + C_{FN}}
$$

:::symbols
- $C_{FP}$ = cost of a false positive (false alarm).
- $C_{FN}$ = cost of a false negative (missed case).
:::

:::worked
Missing a fraud costs ₹10,000; a false alarm costs ₹500 of analyst time. Threshold $= 500 / 10{,}500 \approx 0.048$. Flag anything with more than about 5% fraud probability, not 50%.
:::

::viz{name="imb-threshold"}

## 6. Fixing probabilities after resampling or weighting

Training on a 50/50 sample makes the model think positives are common, so its probabilities are inflated. Ranking (AUC) is fine, but if you need real probabilities (expected loss, pricing), correct them:

$$
\text{odds}_{\text{true}} = \text{odds}_{\text{model}} \times \frac{\pi/(1-\pi)}{\pi_s/(1-\pi_s)}
$$

:::symbols
- odds $= p/(1-p)$.
- $\pi$ = the real positive rate; $\pi_s$ = the positive rate in the resampled training data.
:::

Or recalibrate on untouched validation data with Platt scaling (a logistic regression on the scores) or isotonic regression.

## 7. A complete answer, in order

1. Use a **stratified** split so every fold has positives.
2. Choose the **metric** from the business cost (PR-AUC, recall at precision).
3. Start with **class weights** (or `scale_pos_weight`) on a strong model like LightGBM.
4. Try **resampling** inside training folds only if weights aren't enough.
5. **Tune the threshold** on validation.
6. **Recalibrate** if the probabilities themselves are used.
7. Report results on a test set with the **real** class ratio.

## 8. Code

```python
from sklearn.model_selection import train_test_split
from sklearn.metrics import average_precision_score, precision_recall_curve
from imblearn.pipeline import Pipeline
from imblearn.over_sampling import SMOTE
from lightgbm import LGBMClassifier

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

# Option A: class weights
model = LGBMClassifier(scale_pos_weight=(y_train == 0).sum() / (y_train == 1).sum())
model.fit(X_train, y_train)

# Option B: SMOTE inside the training data only
pipe = Pipeline([("smote", SMOTE(random_state=42)), ("clf", LGBMClassifier())])
pipe.fit(X_train, y_train)

proba = model.predict_proba(X_test)[:, 1]
print("PR-AUC:", average_precision_score(y_test, proba))

# threshold for best F1 (choose on a validation set in practice)
p, r, t = precision_recall_curve(y_test, proba)
f1 = 2 * p * r / (p + r + 1e-12)
print("best threshold:", t[f1[:-1].argmax()])
```

:::say
"First the metric: accuracy is meaningless at 2% positives, so I use PR-AUC and recall at a precision the business can handle. Then class weights or scale_pos_weight, which usually work as well as resampling without changing the data. If I resample, SMOTE or undersampling happens inside the training folds only, never on validation or test. Then I tune the decision threshold using the cost of a miss versus a false alarm, and recalibrate if the probabilities feed a downstream calculation."
:::
