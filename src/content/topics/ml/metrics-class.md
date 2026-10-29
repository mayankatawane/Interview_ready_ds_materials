---
title: Classification metrics
short: Classification metrics
subject: ml
group: Evaluation
order: 1
summary: Confusion matrix, precision, recall, F1, ROC-AUC, PR-AUC, Gini, KS, log loss and calibration, with when to use each.
minutes: 22
---

"Which metric would you use and why?" is asked in almost every interview. The answer always comes from the **cost of each kind of mistake**. This page builds every metric from the confusion matrix with one running example.

## 1. The confusion matrix

Every prediction falls into one of four boxes:

| | Predicted positive | Predicted negative |
|---|---|---|
| **Actually positive** | TP: true positive (caught it) | FN: false negative (missed it) |
| **Actually negative** | FP: false positive (false alarm) | TN: true negative (correctly ignored) |

:::worked
**Running example.** 1,000 patients, 50 have the disease. The model flags 80 patients; 40 of them really have it.

- TP = 40 (flagged and sick)
- FP = 40 (flagged but healthy)
- FN = 10 (sick but missed: 50 − 40)
- TN = 910 (healthy and not flagged: 1000 − 40 − 40 − 10)
:::

## 2. The basic metrics

$$
\text{Accuracy} = \frac{TP + TN}{\text{all}} \qquad \text{Precision} = \frac{TP}{TP + FP} \qquad \text{Recall} = \frac{TP}{TP + FN}
$$

$$
\text{Specificity} = \frac{TN}{TN + FP} \qquad \text{False positive rate (FPR)} = \frac{FP}{FP + TN} = 1 - \text{Specificity}
$$

| Metric | Plain question it answers | Running example |
|---|---|---|
| Accuracy | What share of all predictions were right? | (40 + 910) / 1000 = **0.95** |
| Precision | Of everyone I flagged, how many were really positive? | 40 / 80 = **0.50** |
| Recall (sensitivity, TPR) | Of all real positives, how many did I catch? | 40 / 50 = **0.80** |
| Specificity | Of all real negatives, how many did I correctly leave alone? | 910 / 950 = **0.958** |
| FPR | Of all real negatives, how many did I wrongly flag? | 40 / 950 = **0.042** |

:::trap
**The accuracy paradox.** A model that flags nobody in this example also scores 950 / 1000 = **95% accuracy**, with recall 0. Accuracy hides failure on the rare class.
:::

### Precision or recall: which matters more?

| Prioritise recall (misses are expensive) | Prioritise precision (false alarms are expensive) |
|---|---|
| Cancer screening | Spam filter (deleting real email is bad) |
| Fraud detection | Expensive field investigations |
| Safety defects | Sales reps with limited visits |
| Credit default early warning | Recommending content to a user |

Raising the threshold usually increases precision and lowers recall; lowering it does the opposite.

## 3. F1 and Fβ

$$
F_1 = \frac{2 \cdot P \cdot R}{P + R} \qquad F_\beta = \frac{(1 + \beta^2)\,P\,R}{\beta^2 P + R}
$$

:::symbols
- $P$ = precision, $R$ = recall.
- $F_1$ is their **harmonic mean**.
- $\beta$ ("beta") = how much more you care about recall: $\beta = 2$ weights recall 4 times as much ($\beta^2$); $\beta = 0.5$ favours precision.
:::

Running example: $F_1 = 2 \times 0.5 \times 0.8 / 1.3 = 0.615$.

:::trap
**Why the harmonic mean and not the normal average?** The harmonic mean is dragged down by the smaller value, so you can't score well by maxing one and ignoring the other. Precision 1.0 with recall 0.01: the normal average is 0.505, but F1 is only 0.02.
:::

## 4. Threshold-free metrics: ROC-AUC and PR-AUC

A model outputs a score; the metrics above depend on where you put the threshold. These two look at **all thresholds at once**.

### ROC curve and ROC-AUC

Plot **TPR (recall)** on the y-axis against **FPR** on the x-axis as the threshold moves from 1 down to 0. The area under it is **ROC-AUC**.

**Plain meaning**: pick one random positive and one random negative; ROC-AUC is the probability that the model scores the positive higher. 0.5 = random guessing, 1.0 = perfect ranking. Below 0.5 means the ranking is backwards (flip it).

### PR curve and PR-AUC (average precision)

Plot **precision** against **recall** across thresholds. A random model's PR-AUC equals the **positive rate** (e.g. 0.02 if 2% are positive), so PR-AUC shows clearly how much better than random you are on the rare class.

::viz{name="met-rocpr"}

:::trap
**Why can ROC-AUC look good on imbalanced data when the model is weak?** FPR divides by **all negatives**. With 100,000 negatives, 1,000 false alarms is only 1% FPR, so the ROC curve looks excellent. But if there are only 200 positives, precision is terrible. The PR curve exposes this. Move the slider above: ROC barely changes as positives get rarer, PR collapses.
:::

## 5. Credit-risk metrics: Gini and KS

$$
\text{Gini} = 2 \times \text{AUC} - 1 \qquad \text{KS} = \max_t\big(\text{TPR}(t) - \text{FPR}(t)\big)
$$

:::symbols
- Gini (accuracy ratio) rescales AUC so random = 0 and perfect = 1. AUC 0.8 ↔ Gini 0.6.
- KS (Kolmogorov–Smirnov) = the largest gap, over all thresholds $t$, between the share of bads captured and the share of goods wrongly captured.
:::

Typical good credit scorecards: Gini 0.4 to 0.7, KS 0.3 to 0.5.

## 6. Probability quality: log loss, Brier score and calibration

AUC only checks **ranking**. If the probabilities themselves drive decisions (expected loss, pricing), check their quality:

$$
\text{Log loss} = -\frac{1}{n}\sum_i\big[y_i\log p_i + (1-y_i)\log(1-p_i)\big] \qquad \text{Brier} = \frac{1}{n}\sum_i (p_i - y_i)^2
$$

:::symbols
- $p_i$ = predicted probability for row $i$; $y_i$ = its true label (0 or 1). Lower is better for both.
:::

**Calibration** means: among cases scored 0.3, about 30% are actually positive. Check with a **reliability diagram** (bin predictions, plot average prediction against actual rate per bin). Fix with Platt scaling (a logistic regression on the scores) or isotonic regression, fitted on held-out data.

| Model | Typical calibration |
|---|---|
| Logistic regression | Usually good |
| Random Forest | Under-confident (pulled toward the middle) |
| Boosting | Often reasonable; check |
| Naive Bayes, SVM | Poor (SVM has no native probabilities) |
| Anything trained with class weights or resampling | Inflated: recalibrate |

## 7. Business metrics: lift and gains

**Lift in the top decile** = positive rate among the top 10% of scores ÷ overall positive rate. If 15% of the top 10% churn vs 3% overall, lift = 5: targeting them is 5 times better than random. **Gains chart**: share of all positives captured as you go down the ranked list. These speak directly to campaign planning.

## 8. Multiclass averaging

| Average | How | Use when |
|---|---|---|
| Macro | Compute the metric per class, then a plain average | Every class matters equally, including rare ones |
| Weighted | Per class, weighted by class size | Reflect class frequency |
| Micro | Pool all TP, FP, FN first | Overall performance; for single-label multiclass, micro-F1 = accuracy |

## 9. Which metric when (cheat sheet)

| Situation | Metric |
|---|---|
| Balanced classes, equal costs | Accuracy, F1 |
| Rare positives | PR-AUC, recall at fixed precision |
| Overall ranking quality | ROC-AUC / Gini |
| Fixed capacity (reps, analysts) | Precision@k, lift |
| Probabilities used directly | Log loss, Brier, calibration plot |
| Credit scorecards | Gini, KS, plus PSI for stability |

## 10. Code

```python
from sklearn.metrics import (confusion_matrix, precision_score, recall_score, f1_score,
    roc_auc_score, average_precision_score, log_loss, brier_score_loss, classification_report)
from sklearn.calibration import calibration_curve

pred = (proba >= 0.5).astype(int)
print(confusion_matrix(y_test, pred))                 # [[TN, FP], [FN, TP]]
print(classification_report(y_test, pred))
print("ROC-AUC", roc_auc_score(y_test, proba), "Gini", 2 * roc_auc_score(y_test, proba) - 1)
print("PR-AUC", average_precision_score(y_test, proba))
print("Log loss", log_loss(y_test, proba), "Brier", brier_score_loss(y_test, proba))
frac_pos, mean_pred = calibration_curve(y_test, proba, n_bins=10)   # reliability diagram data
```

:::say
"I choose the metric from the cost of each mistake. For ranking quality I use ROC-AUC or Gini, but with rare positives I prefer PR-AUC, because ROC is flattered by the huge number of true negatives. At the operating threshold I report precision and recall; precision when false alarms are expensive, recall when misses are. If the business acts on a fixed number of cases I use precision@k or lift, and if the probabilities feed a calculation I check calibration with a reliability plot and Brier score."
:::
