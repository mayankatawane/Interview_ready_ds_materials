---
title: K-Nearest Neighbours
short: KNN
subject: ml
group: Supervised models
order: 9
summary: Predict a new point from the k most similar training points. No real training step; all the work happens at prediction time.
minutes: 14
---

KNN is simple, which makes it a favourite for checking fundamentals: how to choose k, why scaling matters, the curse of dimensionality, and why it's slow. It also connects directly to vector search in RAG.

## 1. What is KNN?

To predict for a new point, find the **k** training points closest to it and:

- **Classification**: take a majority vote of their labels (or the share of each class as a probability).
- **Regression**: average their target values.

:::analogy
Estimating the price of a flat by looking up the 5 most similar flats nearby that sold recently and averaging their prices.
:::

## 2. How it "trains" and predicts

**Training**: store the training data. That's it. KNN is called a **lazy learner** (or instance-based learner) because it builds no model in advance.

**Prediction, step by step**:

1. Compute the distance from the new point to **every** training point.
2. Sort the distances and take the k smallest.
3. Vote (classification) or average (regression), optionally weighting closer neighbours more (weight = 1 / distance).

:::worked
Predict whether a customer churns (k = 3). Their 3 nearest neighbours: churned, stayed, churned → predict **churn** with probability 2/3 ≈ 0.67.

Regression version: the 3 nearest flats sold for ₹70, ₹74 and ₹82 lakh → predict $(70 + 74 + 82)/3 = ₹75.3$ lakh.
:::

## 3. Distance measures

$$
\text{Euclidean: } d(x, x') = \sqrt{\sum_{j=1}^{p}(x_j - x'_j)^2} \qquad \text{Manhattan: } d(x, x') = \sum_{j=1}^{p}|x_j - x'_j|
$$

$$
\text{Minkowski: } d(x, x') = \Big(\sum_{j=1}^{p}|x_j - x'_j|^q\Big)^{1/q} \qquad \text{Cosine distance} = 1 - \frac{x \cdot x'}{\|x\|\,\|x'\|}
$$

:::symbols
- $x$, $x'$ = two points (rows); $x_j$ = feature $j$ of $x$; $p$ = number of features.
- Euclidean = straight-line distance. Manhattan = distance walking along a city grid.
- Minkowski with $q = 2$ is Euclidean, $q = 1$ is Manhattan.
- $x \cdot x'$ = dot product; $\|x\|$ = length of $x$. Cosine distance only cares about **direction**, not length.
:::

| Distance | Use for |
|---|---|
| Euclidean | Continuous, scaled features (default) |
| Manhattan | Many features or some outliers (less dominated by one big difference) |
| Cosine | Text vectors and embeddings |
| Hamming | Binary or categorical features (count of mismatches) |
| Gower | Mixed numeric and categorical data |

## 4. Choosing k

::viz{name="knn-2d"}

- **k = 1**: the boundary wraps around every training point. Training accuracy is 100% (each point's nearest neighbour is itself), but it overfits noise. Low bias, high variance.
- **Large k**: very smooth boundary; at $k = n$ it always predicts the majority class. High bias, low variance.
- Pick k by **cross-validation**. A starting guess is $\sqrt{n}$. Use an **odd k** for binary problems to avoid ties.

## 5. Why you must scale features

Distance adds up differences across features. If income ranges from 0 to 50,00,000 and age from 18 to 80, a difference of ₹10,000 in income outweighs a 40-year age gap. Standardise (or min-max scale) every feature first, fitted on training data only.

## 6. The curse of dimensionality

As the number of features grows:

- Data becomes very sparse: you'd need exponentially more points to fill the space.
- The distance to the nearest neighbour and to the farthest point become almost the same, so "nearest" stops meaning "similar".
- Irrelevant features add noise to every distance.

Fixes: feature selection, PCA, or learned embeddings that put similar items close together.

## 7. Making it fast

Brute-force prediction costs about $n \times p$ operations per query (compare with every training row). Options:

| Method | Idea | Good for |
|---|---|---|
| KD-tree | Recursively split space along coordinates | Low dimensions (under ~20) |
| Ball tree | Nested hyperspheres | Moderate dimensions, other metrics |
| Approximate nearest neighbour (HNSW, IVF, product quantisation; FAISS, Annoy, ScaNN) | Trade a little accuracy for big speed-ups | High dimensions, millions of points |

ANN indexes are exactly what vector databases use for RAG retrieval: KNN on embeddings.

## 8. Other uses and variants

- **KNN imputation**: fill a missing value with the average of that feature among the k most similar rows.
- **Weighted KNN**: closer neighbours count more.
- **Recommendations**: "users similar to you liked…".
- **Anomaly detection**: points whose k-th neighbour is far away are unusual.

## 9. Strengths, weaknesses, when to use

**Strengths**: very simple; no training time; naturally multiclass; flexible, odd-shaped boundaries; new data can be added instantly.

**Weaknesses**: slow and memory-hungry at prediction time; needs scaling; suffers in high dimensions; sensitive to irrelevant features and to class imbalance (the majority class dominates neighbourhoods).

| Good fit | Not a good fit |
|---|---|
| Small, low-dimensional data | Large data needing fast predictions (without an ANN index) |
| Similarity search, recommendations, embeddings | Many irrelevant raw features |
| Imputation, quick baselines | Strongly imbalanced classes without weighting |

## 10. Code

```python
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import GridSearchCV

scaler = StandardScaler().fit(X_train)
Xtr, Xte = scaler.transform(X_train), scaler.transform(X_test)

grid = GridSearchCV(KNeighborsClassifier(),
                    {"n_neighbors": list(range(1, 52, 2)), "weights": ["uniform", "distance"]},
                    cv=5, scoring="accuracy")
grid.fit(Xtr, y_train)
print(grid.best_params_, grid.score(Xte, y_test))
```

:::trap
**K-means vs KNN?** Completely different. K-means is **unsupervised clustering** (K = number of clusters, it finds centroids). KNN is **supervised** prediction (k = number of neighbours used to predict a label). They only share the letter k and the use of distance.
:::

:::say
"KNN is a lazy, instance-based method: it stores the training data and predicts by voting or averaging over the k nearest neighbours. Small k overfits, large k underfits, so I choose k by cross-validation. Features must be scaled because it's distance-based, and it struggles in high dimensions because distances become similar. Prediction is slow on large data, so at scale it's done with approximate nearest-neighbour indexes like HNSW, the same thing vector databases use."
:::
