---
title: PCA
short: PCA
subject: ml
group: Unsupervised
order: 2
summary: Rotate the data onto new axes ordered by how much variation they capture, then keep only the first few. The standard way to reduce dimensions and remove multicollinearity.
minutes: 16
---

PCA (Principal Component Analysis) questions test whether you understand variance, eigenvectors at an intuitive level, why scaling matters, how many components to keep, and when PCA hurts a model.

## 1. What is PCA?

PCA finds new axes, called **principal components**, that are combinations of your original features:

- The **first** component points in the direction where the data varies the most.
- The **second** points in the direction of most remaining variation, at a right angle (uncorrelated) to the first.
- And so on, one component per original feature.

You then keep only the first few components, which hold most of the information, and drop the rest.

:::analogy
Photographing a 3D object. Some camera angles show its shape clearly (high variance); others show a flat blob. PCA finds the most informative angle, then the second-best angle at a right angle to the first, and so on. Keeping 2 good photos can describe the object almost as well as the full 3D model.
:::

::viz{name="pca-2d"}

## 2. Why use it?

- **Fewer features**: faster training, less memory, less overfitting.
- **Remove multicollinearity**: components are uncorrelated, so linear models become stable.
- **Denoise**: small, late components are often mostly noise.
- **Visualise**: plot data on the first 2 components.

## 3. How PCA works, step by step

1. **Standardise** every feature (mean 0, standard deviation 1). Otherwise features with large units dominate.
2. Compute the **covariance matrix**, which records how every pair of features varies together.
3. Find its **eigenvectors** (the component directions) and **eigenvalues** (how much variance lies along each direction).
4. Sort components by eigenvalue, largest first.
5. Keep the top $k$.
6. **Project** the data: each row's new coordinates are its dot products with the kept directions.

$$
\Sigma = \frac{1}{n-1}X^\top X, \qquad \Sigma\,v_k = \lambda_k v_k, \qquad Z = X\,W_k
$$

:::symbols
- $X$ = the standardised data ($n$ rows × $p$ features).
- $\Sigma$ ("sigma") = the covariance matrix ($p \times p$). Entry $(i, j)$ = covariance between features $i$ and $j$.
- $v_k$ = the $k$-th **eigenvector**: a direction (unit vector) in feature space. Multiplying it by $\Sigma$ just stretches it, without turning it.
- $\lambda_k$ ("lambda k") = its **eigenvalue**: the variance of the data along that direction.
- $W_k$ = the first $k$ eigenvectors placed side by side as columns.
- $Z$ = the new data: $n$ rows × $k$ components.
:::

In practice libraries use the **SVD** (singular value decomposition) of $X$ directly, $X = U S V^\top$, which is more numerically stable. The rows of $V^\top$ are the component directions and $\lambda_k = s_k^2/(n-1)$.

### Explained variance

$$
\text{Explained variance ratio}_k = \frac{\lambda_k}{\sum_{j=1}^{p}\lambda_j}
$$

The share of the total variance captured by component $k$.

:::worked
Two standardised features with correlation 0.8. Eigenvalues are $1 + 0.8 = 1.8$ and $1 - 0.8 = 0.2$. PC1 explains $1.8 / 2 = 90\%$ of the variance and points along the diagonal (both features going up together). Keeping only PC1 loses 10% of the variance but halves the number of features.
:::

## 4. How many components to keep?

- Enough to explain a target share of variance, often **90 to 95%**.
- The "elbow" in a **scree plot** (eigenvalues in order).
- **Kaiser rule**: keep components with eigenvalue above 1 (on standardised data), i.e. those explaining more than one original feature's worth.
- Or whatever number gives the best **downstream cross-validation score**.

## 5. Reading components (loadings)

Each component is a weighted mix of the original features; the weights are called **loadings**. If PC1 has big positive loadings on spend, visits and orders, you might call it "overall activity". It's possible to describe components, but they're never as easy to explain as original features, which matters in regulated settings.

## 6. When PCA hurts

:::trap
**Can PCA make a supervised model worse?** Yes. PCA is **unsupervised**: it keeps directions with high variance and ignores the target. If the target depends on a low-variance direction, PCA throws that signal away. Always check with cross-validation. Partial Least Squares (PLS) or LDA take the target into account.
:::

Other limits: only **linear** structure; sensitive to outliers and to scaling; components are hard to interpret; new data must be transformed with the same fitted PCA (fit on training data only).

## 7. PCA vs other dimensionality reduction

| Method | Type | Use for |
|---|---|---|
| PCA | Linear, unsupervised, keeps global variance | Compression, decorrelation, speed, denoising |
| LDA (Linear Discriminant Analysis) | Linear, supervised: maximises separation between classes | Reducing dimensions for classification |
| t-SNE | Non-linear, preserves local neighbourhoods | 2D pictures only; distances between clusters mean little |
| UMAP | Non-linear, faster, keeps more global structure | Visualisation; sometimes as features |
| Autoencoders | Non-linear, neural network | Complex data, anomaly detection |
| Feature selection | Keep a subset of original features | When interpretability matters |

## 8. Code

```python
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
import numpy as np

scaler = StandardScaler().fit(X_train)
Xtr, Xte = scaler.transform(X_train), scaler.transform(X_test)

pca = PCA(n_components=0.95).fit(Xtr)      # keep enough components for 95% variance
print(pca.n_components_, np.round(pca.explained_variance_ratio_, 3))
Ztr, Zte = pca.transform(Xtr), pca.transform(Xte)

loadings = pca.components_[0]              # how each feature contributes to PC1
print(sorted(zip(loadings.round(2), X.columns), reverse=True)[:5])
```

:::say
"PCA finds orthogonal directions of maximum variance: the eigenvectors of the covariance matrix, computed in practice with SVD after standardising the features. Each eigenvalue is the variance along its direction, so I keep enough components to explain about 95% of the variance, or whatever number gives the best cross-validated score. It removes multicollinearity and compresses the data, but components are harder to interpret, it only captures linear structure, and because it ignores the target it can throw away predictive signal."
:::
