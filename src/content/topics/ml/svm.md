---
title: Support Vector Machines
short: SVM
subject: ml
group: Supervised models
order: 8
summary: Find the boundary with the widest possible gap between classes. Only the points nearest the boundary (support vectors) matter, and kernels let it draw curved boundaries.
minutes: 20
---

SVM questions are mostly conceptual: what's a margin, what are support vectors, what do C and gamma do, what's the kernel trick, and why it's slow on big data. Get the intuition right and the maths follows.

## 1. What is an SVM?

A Support Vector Machine is a classifier that separates two classes with a straight boundary (a line in 2D, a plane or hyperplane in more dimensions), chosen so that the **gap between the boundary and the nearest points of each class is as wide as possible**. That gap is the **margin**.

:::analogy
Building the widest possible road between two villages. The road's edges touch the nearest houses on each side. Only those nearest houses decide where the road goes; you could delete every other house and the road wouldn't move. Those nearest houses are the **support vectors**.
:::

Why the widest gap? A boundary that sits right next to some training points will misclassify slightly different new points. A boundary with a wide safety margin is more likely to classify new points correctly.

## 2. The boundary and the margin

The boundary is written as

$$
w^\top x + b = 0
$$

:::symbols
- $x$ = a row's features.
- $w$ = a weight vector perpendicular to the boundary (it sets the boundary's direction).
- $b$ = bias, which shifts the boundary.
- For a new point, $f(x) = w^\top x + b$: positive → class +1, negative → class −1. The bigger $|f(x)|$, the further from the boundary.
:::

SVM scales $w$ and $b$ so that the closest points on each side satisfy $w^\top x + b = \pm 1$. The distance between those two edge lines, the margin, is then

$$
\text{margin} = \frac{2}{\|w\|}
$$

:::symbols
- $\|w\|$ = the length of the vector $w$: $\sqrt{w_1^2 + w_2^2 + \dots}$.
:::

So **maximising the margin = minimising $\|w\|$**. That's the whole optimisation in one sentence.

## 3. Hard margin vs soft margin

**Hard margin**: require every point to be on the correct side, outside the margin. Only possible if the classes are perfectly separable, and a single outlier can wreck it.

**Soft margin** (what everyone uses): allow some points inside the margin or even on the wrong side, but charge for each violation.

$$
\min_{w,b,\xi}\;\frac{1}{2}\|w\|^2 + C\sum_{i=1}^{n}\xi_i \quad\text{subject to}\quad y_i(w^\top x_i + b) \ge 1 - \xi_i,\;\; \xi_i \ge 0
$$

:::symbols
- $y_i$ = label of row $i$, written as +1 or −1.
- $y_i(w^\top x_i + b)$ = positive if row $i$ is on the correct side; at least 1 if it's also outside the margin.
- $\xi_i$ ("xi") = slack: how much row $i$ violates the margin. 0 = fine; between 0 and 1 = inside the margin but correct; above 1 = misclassified.
- $C$ = how expensive each violation is. The key hyperparameter.
- $\frac{1}{2}\|w\|^2$ = the "keep the margin wide" part.
:::

The same thing written as a loss function:

$$
\min_{w,b}\;\frac{1}{2}\|w\|^2 + C\sum_{i=1}^{n}\max\big(0,\; 1 - y_i f(x_i)\big)
$$

The $\max(0, 1 - y f(x))$ part is the **hinge loss**: zero for points safely on the right side, growing linearly as a point creeps into the margin or crosses over. Points with zero hinge loss have **no influence** on the model at all, which is why only support vectors matter.

So a linear SVM is just **hinge loss + L2 regularisation**, the same structure as logistic regression (log loss + L2).

::viz{name="svm-2d"}

## 4. What C does

| Small C | Large C |
|---|---|
| Violations are cheap | Violations are expensive |
| Wide margin, many points inside it | Narrow margin, tries to classify every training point |
| Many support vectors | Fewer support vectors |
| Simpler, may underfit | Follows the data closely, may overfit |

Move the slider in the visual above to see it.

## 5. The kernel trick: curved boundaries

Some data can't be separated by a straight line, e.g. one class in a ring around the other. Idea: map each point into a higher-dimensional space where a straight boundary *does* work, then come back.

::viz{name="svm-kernel"}

The clever part: when SVM is solved in its **dual form**, the data only ever appears as **dot products between pairs of points**, $x_i^\top x_j$. So we can swap each dot product for a **kernel function** $K(x_i, x_j)$, which equals the dot product in some high-dimensional space, **without ever computing that space**. That's the kernel trick.

$$
f(x) = \sum_{i \in SV}\alpha_i\,y_i\,K(x_i, x) + b
$$

:::symbols
- $SV$ = the set of support vectors (only they appear in the sum).
- $\alpha_i$ = a learned weight for support vector $i$ (0 for all non-support vectors).
- $K(x_i, x)$ = similarity between support vector $x_i$ and the new point $x$.
:::

Prediction is a weighted vote of the support vectors, each weighted by how similar it is to the new point.

| Kernel | Formula | Use |
|---|---|---|
| Linear | $x^\top x'$ | Text and other high-dimensional data; fastest |
| Polynomial | $(\gamma\,x^\top x' + r)^d$ | Interactions up to degree $d$ |
| RBF (Gaussian) | $e^{-\gamma\|x - x'\|^2}$ | Default for general non-linear problems |
| Sigmoid | $\tanh(\gamma\,x^\top x' + r)$ | Rarely used |

### What gamma does (RBF kernel)

$\gamma$ sets how far one point's influence reaches. $\|x - x'\|^2$ is the squared distance between two points.

- **Small γ**: similarity fades slowly with distance, so each point influences a wide area → smooth boundary (can underfit).
- **Large γ**: similarity drops to zero very quickly → each point only influences its immediate neighbourhood → wiggly islands around individual points (overfits).

Tune C and γ together on a log grid (e.g. C in 0.1, 1, 10, 100 and γ in 0.001, 0.01, 0.1, 1).

## 6. Training and prediction, step by step

**Training**

1. Scale the features (essential).
2. Choose a kernel and values for C (and γ for RBF).
3. Solve the optimisation (a convex quadratic programme; libraries use SMO or coordinate descent). Convex means there's a single best answer, no local minima.
4. Keep only the support vectors and their $\alpha$ weights; discard everything else.

**Prediction**: compute $f(x)$ from the support vectors; the sign gives the class. The value itself is a distance-like score, **not a probability**.

## 7. Practical points interviewers probe

- **Scaling is mandatory.** Margins and the RBF kernel both use distances, so a feature in rupees would swamp one in years.
- **No native probabilities.** `SVC(probability=True)` fits Platt scaling (a logistic regression on the SVM scores) with internal cross-validation: slow, and its probabilities can disagree slightly with `predict`. Use `decision_function` for ranking.
- **Slow on big data.** Kernel SVM training scales roughly between $n^2$ and $n^3$ and needs an $n \times n$ kernel matrix. Above ~100k rows, use `LinearSVC`, `SGDClassifier(loss="hinge")`, kernel approximations (Nystroem, random Fourier features), or switch to gradient boosting.
- **Multiclass.** SVMs are binary; `SVC` uses one-vs-one ($K(K-1)/2$ models), `LinearSVC` uses one-vs-rest.
- **Regression: SVR.** Fits a tube of width ε around the data; errors inside the tube cost nothing; points outside the tube are the support vectors.
- **SVM vs logistic regression.** Both linear with L2; SVM uses hinge loss (only margin points matter, no probabilities), logistic uses log loss (every point matters, calibrated probabilities). Similar accuracy in practice; linear SVM is often slightly better on high-dimensional text.

## 8. Strengths, weaknesses, when to use

**Strengths**: works well in high dimensions (even more features than rows); memory-efficient (keeps only support vectors); kernels give flexible boundaries; convex, so one global optimum; good generalisation on small to medium data.

**Weaknesses**: slow beyond ~100k rows with kernels; needs scaling and careful C/γ tuning; no native probabilities; hard to interpret with non-linear kernels; struggles with heavy class overlap and noise.

| Good fit | Not a good fit |
|---|---|
| Text classification with TF-IDF (linear SVM) | Millions of rows with a kernel |
| Small to medium data with clear separation | When you need probabilities or explanations |
| Bioinformatics, many features and few samples | Very noisy, overlapping classes |

## 9. Code

```python
from sklearn.svm import SVC, LinearSVC
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import GridSearchCV

scaler = StandardScaler().fit(X_train)
Xtr, Xte = scaler.transform(X_train), scaler.transform(X_test)

grid = GridSearchCV(SVC(kernel="rbf"), {"C": [0.1, 1, 10, 100], "gamma": [0.001, 0.01, 0.1, 1]},
                    cv=5, scoring="roc_auc", n_jobs=-1)
grid.fit(Xtr, y_train)
best = grid.best_estimator_
print(grid.best_params_, "support vectors:", best.n_support_)
scores = best.decision_function(Xte)        # signed distance, not a probability

text_clf = LinearSVC(C=1.0).fit(X_tfidf_train, y_train)   # fast for sparse text
```

:::say
"An SVM finds the hyperplane with the maximum margin between the classes, which means minimising the length of w. With a soft margin, C trades off a wide margin against violations; it's equivalent to hinge loss plus L2 regularisation. Only the support vectors, the points on or inside the margin, define the boundary. Because the dual problem only uses dot products, the kernel trick, for example RBF, gives non-linear boundaries without computing the high-dimensional features; gamma controls how local each point's influence is. It needs scaling, doesn't give native probabilities and doesn't scale well past about a hundred thousand rows."
:::
