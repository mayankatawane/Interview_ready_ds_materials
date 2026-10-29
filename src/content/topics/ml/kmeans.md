---
title: K-means and clustering
short: K-means & clustering
subject: ml
group: Unsupervised
order: 1
summary: Group unlabelled data into clusters. How K-means works step by step, how to choose K, and when to switch to DBSCAN, hierarchical clustering or Gaussian mixtures.
minutes: 20
---

Clustering questions are common in DS interviews, especially for segmentation work: how K-means works, how to choose K, its assumptions and failure cases, how to evaluate clusters without labels, and which alternative to use when it fails.

## 1. What is clustering?

Clustering groups rows so that rows in the same group are similar and rows in different groups are different, **without any labels**. It's **unsupervised** learning: there's no "right answer" column to learn from.

Typical uses: customer or HCP segmentation, grouping documents by topic, compressing colours in an image, creating a "segment" feature for another model, finding unusual points.

## 2. K-means in plain words

K-means splits the data into **K** groups. Each group has a **centre** (centroid), the average of its points. Every point belongs to the group with the nearest centre.

:::analogy
Placing K pizza shops in a city. Each customer orders from the closest shop. Then each shop moves to the middle of its customers. Customers re-pick their closest shop, shops move again, and so on until nobody switches.
:::

## 3. How K-means trains, step by step

1. **Choose K** and place K starting centres (k-means++ spreads them out; see below).
2. **Assign**: each point joins its nearest centre (usually Euclidean distance).
3. **Update**: move each centre to the average of the points assigned to it.
4. **Repeat** steps 2 and 3 until assignments stop changing (or centres barely move).
5. Because the result depends on the start, run it several times (`n_init`) and keep the run with the lowest inertia.

::viz{name="kmeans"}

:::worked
1D points: 1, 2, 3, 10, 11, 12. K = 2, starting centres 1 and 2.

- Assign: {1} → centre 1; {2, 3, 10, 11, 12} → centre 2.
- Update: centres become 1 and $(2+3+10+11+12)/5 = 7.6$.
- Assign: {1, 2, 3} closer to 1 (3 is 2 away from 1 and 4.6 from 7.6); {10, 11, 12} closer to 7.6.
- Update: centres 2 and 11.
- Assign: nothing changes → stop. Clusters {1, 2, 3} and {10, 11, 12}.
:::

### What K-means minimises

$$
\text{Inertia (WCSS)} = \sum_{k=1}^{K}\;\sum_{x \in C_k}\|x - \mu_k\|^2
$$

:::symbols
- $K$ = number of clusters; $C_k$ = the set of points in cluster $k$.
- $\mu_k$ ("mu k") = the centre of cluster $k$ (average of its points).
- $\|x - \mu_k\|^2$ = squared distance from a point to its centre.
- WCSS = within-cluster sum of squares: total squared distance of every point to its own centre. Smaller = tighter clusters.
:::

Each assign step and each update step can only lower (or keep) the inertia, so K-means always **converges**. But it converges to a **local** minimum that depends on the starting centres, which is why we restart it several times.

### k-means++ initialisation

1. Pick the first centre at random from the data.
2. For each point, compute its distance $D$ to the nearest centre chosen so far.
3. Pick the next centre randomly, with probability proportional to $D^2$, so far-away points are more likely.
4. Repeat until K centres are chosen.

Centres start spread out, so results are better and more consistent. It's the default in scikit-learn.

## 4. How to choose K

**Elbow method**: run K-means for K = 1 to 10 and plot inertia. Inertia always drops as K grows (with K = n it's zero), so look for the "elbow" where adding clusters stops helping much.

**Silhouette score**: for each point,

$$
s = \frac{b - a}{\max(a, b)}
$$

:::symbols
- $a$ = average distance from the point to the other points in its own cluster (how tight its cluster is).
- $b$ = average distance to the points in the nearest **other** cluster (how separated it is).
- $s$ ranges from −1 to 1: near 1 = well clustered; near 0 = on a border; negative = probably in the wrong cluster.
:::

Average $s$ over all points and pick the K with the highest value.

**Other checks**: Davies–Bouldin index (lower is better), Calinski–Harabasz index (higher is better), the gap statistic, and **business sense**: 4 segments that marketing can act on beat 11 "optimal" ones nobody can use. Also check **stability**: rerun on bootstrap samples; good clusters stay the same.

## 5. Assumptions and failure cases

K-means works best when clusters are **round (spherical), similar in size and similar in density**. It fails when:

- Clusters are elongated, curved or nested (moons, rings).
- Clusters have very different sizes or densities.
- There are outliers (an outlier drags its centre because centres are averages).
- Features are on different scales (always standardise first).
- Data is categorical (averages of categories are meaningless; use k-modes or k-prototypes).

## 6. Other clustering methods

| Method | Idea | Good at | Weak at |
|---|---|---|---|
| K-means | Nearest centre, centres are averages | Large data, round clusters | Odd shapes, outliers; must choose K |
| K-medoids | Centres must be actual data points | Robust to outliers, any distance measure | Slower |
| Hierarchical (agglomerative) | Start with each point alone, repeatedly merge the two closest clusters; draw a dendrogram | Small data; see structure at every K | $O(n^2)$ memory, slow on big data |
| DBSCAN | Dense regions form clusters; sparse points are noise | Any shape, finds outliers, no K needed | Very different densities; choosing `eps` |
| HDBSCAN | DBSCAN across many densities | Varying densities | More complex |
| Gaussian Mixture (GMM) | Data comes from K overlapping bell curves, fitted with the EM algorithm | Soft (probabilistic) membership, elliptical clusters | Assumes Gaussian shapes; choose K with BIC |

### DBSCAN in plain words

Two settings: `eps` (a radius) and `min_samples`.

- A **core point** has at least `min_samples` points within distance `eps`.
- Core points that are within `eps` of each other join the same cluster; nearby non-core points join as **border points**.
- Everything else is **noise** (label −1).

Choose `eps` by plotting each point's distance to its k-th nearest neighbour, sorted, and picking the "knee".

### Hierarchical clustering: linkage

How do you measure the distance between two clusters?

- **Single**: closest pair of points (tends to make long chains).
- **Complete**: farthest pair (compact clusters).
- **Average**: average over all pairs.
- **Ward**: the merge that increases total within-cluster variance the least (the usual default).

Cut the dendrogram at a chosen height to get K clusters.

## 7. Evaluating clusters without labels

- **Internal metrics**: silhouette, Davies–Bouldin, Calinski–Harabasz, inertia.
- **Stability**: do the same clusters appear on resampled data or with different seeds?
- **Profiling**: describe each cluster by its average features. Are the profiles distinct and meaningful?
- **Usefulness**: does using the segments improve a campaign, a model or a decision?
- If some labels exist: Adjusted Rand Index (ARI), Normalised Mutual Information (NMI).

## 8. Strengths, weaknesses, when to use

**K-means strengths**: simple; fast (scales to millions with Mini-Batch K-means); easy to explain through centroid profiles; always converges.

**K-means weaknesses**: must choose K; local optima; assumes round, similar clusters; sensitive to outliers and scale; numeric data only.

| Good fit | Not a good fit |
|---|---|
| Customer or HCP segmentation on scaled behaviour features | Curved or nested clusters (use DBSCAN) |
| Colour quantisation, vector compression | Mostly categorical data |
| Creating a cluster-ID feature for another model | When you need to flag outliers |

## 9. Code

```python
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans, DBSCAN
from sklearn.metrics import silhouette_score

Xs = StandardScaler().fit_transform(X)

for k in range(2, 9):
    km = KMeans(n_clusters=k, n_init=10, random_state=42).fit(Xs)
    print(k, round(km.inertia_, 1), round(silhouette_score(Xs, km.labels_), 3))

km = KMeans(n_clusters=4, n_init=10, random_state=42).fit(Xs)
df["segment"] = km.labels_
print(df.groupby("segment").mean(numeric_only=True))      # profile each segment

db = DBSCAN(eps=0.5, min_samples=10).fit(Xs)               # label -1 = noise
```

:::say
"K-means minimises the within-cluster sum of squares by alternating two steps: assign each point to its nearest centroid, then move each centroid to the mean of its points. It always converges, but to a local optimum, so I use k-means++ initialisation and several restarts. I standardise features first, choose K with the elbow, silhouette and business sense, and check the segments are stable. It assumes round, similar-sized clusters, so for irregular shapes or noise I use DBSCAN, and for soft memberships a Gaussian mixture."
:::
