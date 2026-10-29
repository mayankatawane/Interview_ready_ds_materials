---
title: Linear regression
short: Linear regression
subject: ml
group: Supervised models
order: 1
summary: Fit the straight line (or flat plane) that best matches your data. Simple, fast and explainable, and the base for understanding almost every other model.
minutes: 22
---

Linear regression looks simple, which is exactly why interviewers use it to test depth: the formula, why squared error, the assumptions, what multicollinearity does, how to read a coefficient, R² vs adjusted R². This page covers all of it.

## 1. What is linear regression?

Linear regression predicts a **number** as a weighted sum of the input features plus a constant.

$$
\hat y = w_0 + w_1x_1 + w_2x_2 + \dots + w_px_p
$$

:::symbols
- $\hat y$ ("y hat") = the predicted value, e.g. flat price.
- $x_1, \dots, x_p$ = the $p$ input features, e.g. area, floor, distance to station.
- $w_1, \dots, w_p$ = the **weights** or **coefficients**: how much the prediction changes when that feature goes up by 1.
- $w_0$ = the **intercept** (bias): the prediction when every feature is 0.
:::

:::analogy
Pricing flats in Pune: start from a base price ($w_0$), add ₹6,000 for every square foot ($w_1$), add ₹50,000 for every floor ($w_2$), subtract ₹2 lakh for every km from the station ($w_3$). Each coefficient answers: "how much does the price change if this one thing goes up by 1, with everything else unchanged?"
:::

With one feature it's a straight line; with two, a flat plane; with more, a "hyperplane". Same idea.

In matrix form (how libraries write it):

$$
\hat y = Xw
$$

:::symbols
- $X$ = the data matrix: one row per example, one column per feature (plus a column of 1s for the intercept). Size $n \times (p+1)$.
- $w$ = the column of weights.
- $Xw$ = multiply each row by the weights and add up, giving one prediction per row.
:::

## 2. How it learns: least squares

The model needs a way to judge "how good is this line?". For each training row, the **residual** is the gap between truth and prediction, $y_i - \hat y_i$. Linear regression picks the weights that make the **sum of squared residuals** as small as possible. This is **Ordinary Least Squares (OLS)**.

$$
\text{MSE}(w) = \frac{1}{n}\sum_{i=1}^{n}\big(y_i - \hat y_i\big)^2
$$

:::symbols
- $n$ = number of training rows.
- $y_i$ = the true value for row $i$; $\hat y_i$ = the prediction for row $i$.
- MSE = mean squared error.
:::

### Why square the errors?

1. Squaring makes every error positive, so over- and under-predictions don't cancel out.
2. Big misses are punished much more than small ones (a 10-unit miss costs 100; two 5-unit misses cost 50).
3. The resulting loss is a smooth bowl with one bottom, so there's an exact formula for the best weights.
4. If the noise is normally distributed, least squares gives the **maximum likelihood** estimate, i.e. the most probable weights.

The downside: squaring makes the line very sensitive to outliers. Try it below.

::viz{name="lin-outlier"}

### Way 1 to find the weights: the normal equation (exact formula)

$$
\hat w = (X^\top X)^{-1}X^\top y
$$

:::symbols
- $X^\top$ = the transpose of $X$ (rows become columns).
- $(\cdot)^{-1}$ = matrix inverse.
- $y$ = the column of true targets.
- $\hat w$ = the best weights.
:::

It gives the answer in one step, but the inverse costs roughly $p^3$ operations, so it gets slow with thousands of features, and it fails if $X^\top X$ can't be inverted (duplicate or perfectly correlated features, or more features than rows).

### Way 2: gradient descent (step by step)

1. Start with random or zero weights.
2. Compute predictions and the error.
3. Compute the **gradient**: the direction in which the error increases fastest.
4. Move the weights a small step the opposite way.
5. Repeat until the error stops falling.

$$
w \leftarrow w - \eta\,\nabla_w \text{MSE}, \qquad \nabla_w \text{MSE} = -\frac{2}{n}X^\top(y - Xw)
$$

:::symbols
- $\leftarrow$ = "update to".
- $\eta$ ("eta") = learning rate: the step size.
- $\nabla_w$ = gradient with respect to the weights: one slope per weight.
- $y - Xw$ = the residuals.
:::

:::worked
Three flats (area in 100s of sq ft, price in ₹ lakh): (5, 52), (8, 79), (10, 101).

A line $\hat y = 10x$ predicts 50, 80, 100. Residuals: 2, −1, 1. MSE $= (4 + 1 + 1)/3 = 2$.

A line $\hat y = 9x + 5$ predicts 50, 77, 95. Residuals: 2, 2, 6. MSE $= (4 + 4 + 36)/3 = 14.7$.

The first line fits better. OLS searches all possible lines and returns the one with the lowest MSE.
:::

Use gradient descent (or stochastic gradient descent on mini-batches) when data is huge; use the normal equation (or better, a QR/SVD solver, which libraries use) when it fits in memory.

## 3. How it predicts

Multiply each feature of the new row by its weight, add them up, add the intercept. That's it, which is why it's so fast and easy to explain.

:::worked
Using the Pune pricing model, in lakh: base 20, +0.06 per sq ft, +0.5 per floor, −2 per km from the station.

A 900 sq ft flat on floor 4, 1.5 km from the station: $\hat y = 20 + 0.06 \times 900 + 0.5 \times 4 - 2 \times 1.5 = 20 + 54 + 2 - 3 = ₹73$ lakh.
:::

## 4. Reading coefficients correctly

- $w_j = 6{,}000$ means: one extra square foot raises the predicted price by ₹6,000, **holding all other features constant**.
- Coefficients are only comparable with each other if features are on the same scale (standardise first).
- A coefficient shows **association**, not cause. Without an experiment or a causal design, you can't claim that changing $x$ will change $y$.

**With log transforms:**

| Model | How to read $w$ |
|---|---|
| $y = w x$ | +1 in $x$ → $y$ changes by $w$ units |
| $\log y = w x$ | +1 in $x$ → $y$ changes by about $100w$ % |
| $y = w \log x$ | +1% in $x$ → $y$ changes by about $w/100$ units |
| $\log y = w\log x$ | +1% in $x$ → $y$ changes by about $w$ % (elasticity) |

## 5. Measuring fit: R² and adjusted R²

$$
R^2 = 1 - \frac{\sum_i (y_i - \hat y_i)^2}{\sum_i (y_i - \bar y)^2} = 1 - \frac{SS_{res}}{SS_{tot}}
$$

:::symbols
- $\bar y$ = the average of the true values.
- $SS_{res}$ = residual sum of squares: the error left after using the model.
- $SS_{tot}$ = total sum of squares: the error if you just predicted the average every time.
:::

$R^2$ = the share of the variation in $y$ that the model explains. 0.8 means 80% explained. 0 means no better than predicting the average. On a test set it can even be **negative** (worse than the average).

**Problem**: on training data, $R^2$ never goes down when you add a feature, even a random one. **Adjusted R²** charges for each feature:

$$
R^2_{adj} = 1 - (1-R^2)\,\frac{n-1}{n-p-1}
$$

It only goes up if the new feature helps more than chance would. Also report MAE or RMSE in real units: "off by ₹3 lakh on average" is what a business understands.

## 6. The assumptions (remember LINE + no multicollinearity)

These matter mainly for **trusting p-values and confidence intervals**. Predictions can still be useful when some are mildly violated.

| Assumption | Meaning | How to check | If violated |
|---|---|---|---|
| **L**inearity | $y$ is a linear function of the features (the parameters, really) | Residuals vs fitted plot shows no curve | Add squared terms, logs, interactions; or use trees |
| **I**ndependence | Errors of different rows aren't related | Durbin–Watson ≈ 2; plot residuals over time | Time-series models, add lag features, clustered errors |
| **N**ormality | Errors follow a normal distribution | Q-Q plot | Transform $y$, bootstrap confidence intervals |
| **E**qual variance (homoscedasticity) | Error spread is the same for small and large predictions | Residual plot has no funnel; Breusch–Pagan test | Log $y$, weighted least squares, robust standard errors |
| No multicollinearity | Features aren't strongly correlated with each other | Correlation matrix, VIF | Drop or combine features, Ridge, PCA |

:::trap
**Does linear regression assume the features are normally distributed?** No. It assumes the **errors** (residuals) are normal, and only for inference. The features can have any distribution.
:::

## 7. Multicollinearity

When two features carry nearly the same information (e.g. area in sq ft and number of rooms), the model can't tell how to split the credit between them. Consequences:

- Coefficients become unstable: small data changes flip them around, sometimes even their sign.
- Standard errors grow, so features look "not significant".
- **Predictions can still be fine**; the problem is interpreting the coefficients.

Detect with the **Variance Inflation Factor**:

$$
\text{VIF}_j = \frac{1}{1-R_j^2}
$$

:::symbols
- $R_j^2$ = the $R^2$ you get when predicting feature $j$ from all the **other** features.
- If feature $j$ is almost perfectly predictable from the others, $R_j^2 \to 1$ and VIF shoots up.
:::

VIF of 1 = no correlation; above 5 to 10 = a problem. Fix by dropping one of the pair, combining them, or using Ridge.

## 8. Regularised versions

| Model | Penalty added to MSE | Use when |
|---|---|---|
| Ridge | $\lambda\sum w_j^2$ | Many useful features, multicollinearity |
| Lasso | $\lambda\sum |w_j|$ | You want automatic feature selection |
| Elastic Net | Mix of both | Many correlated features and you want sparsity |

Details on the Bias–variance & regularisation page.

## 9. Strengths, weaknesses and when to use

**Strengths**: very fast; easy to explain; works with little data; gives confidence intervals and p-values; **can extrapolate a trend** (trees can't); great baseline.

**Weaknesses**: only captures straight-line relationships unless you engineer features; sensitive to outliers; unstable coefficients with multicollinearity; interactions must be added by hand.

| Good fit | Not a good fit |
|---|---|
| Baseline for any regression problem | Strongly non-linear patterns with interactions (use boosting) |
| Driver analysis: "what moves sales?" | Many outliers (use Huber or quantile regression) |
| Price elasticity (log-log model) | A category target (use logistic regression) |
| Marketing mix models (with Ridge or Bayesian priors) | |
| When you must extrapolate a trend | |

## 10. Code

```python
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

lr = LinearRegression()
lr.fit(X_train, y_train)                    # finds the least-squares weights
pred = lr.predict(X_test)

print("Intercept:", lr.intercept_)
print(dict(zip(X.columns, lr.coef_.round(2))))
print("MAE :", mean_absolute_error(y_test, pred))
print("RMSE:", np.sqrt(mean_squared_error(y_test, pred)))
print("R2  :", r2_score(y_test, pred))

# p-values and confidence intervals: use statsmodels
import statsmodels.api as sm
ols = sm.OLS(y_train, sm.add_constant(X_train)).fit()
print(ols.summary())

# multicollinearity check
from statsmodels.stats.outliers_influence import variance_inflation_factor
Xc = sm.add_constant(X_train)
print({c: round(variance_inflation_factor(Xc.values, i), 1) for i, c in enumerate(Xc.columns) if c != "const"})
```

:::say
"Linear regression models the target as a weighted sum of features plus an intercept and chooses the weights that minimise the sum of squared errors, which has a closed-form solution, or can be found by gradient descent on big data. Each coefficient is the change in the target for a one-unit change in that feature, holding the others fixed. For valid inference it assumes linearity, independent errors, constant error variance and normally distributed errors, and coefficients become unstable with multicollinearity, which I check with VIF and handle with Ridge. I report R² alongside MAE or RMSE in business units."
:::
