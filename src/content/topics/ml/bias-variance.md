---
title: Bias, variance, overfitting and regularisation
short: Bias–variance & regularisation
subject: ml
group: Foundations
order: 1
summary: Why models fail on new data, how to tell underfitting from overfitting, and how L1 and L2 regularisation pull a model back toward simple.
minutes: 18
---

"What's the difference between overfitting and underfitting, and how do you handle each?" comes up in almost every DS interview. This page gives you the intuition, the formula, how to diagnose it, and how regularisation fixes it.

## 1. The goal: do well on data you haven't seen

A model is only useful if it works on **new** data. Training error tells you how well it fits the past; what you care about is the error on future rows, called the **generalisation error** (estimated with a validation or test set).

There are two ways to fail:

| | Underfitting | Overfitting |
|---|---|---|
| What happens | Model is too simple to capture the real pattern | Model learns the real pattern **and** the noise in this particular sample |
| Training error | High | Very low |
| Validation error | High, close to training | Much higher than training |
| Technical name | High **bias** | High **variance** |
| Example | A straight line through curved data | A wiggly curve that passes through every training point |

:::analogy
Preparing for an exam. Underfitting: you only read the chapter titles, so you fail the practice paper and the real exam. Overfitting: you memorised last year's answer key word for word, so you ace the practice paper and fail as soon as the questions change. A good fit: you understood the concepts.
:::

::viz{name="bv-poly"}

## 2. Bias and variance in plain words

- **Bias** is error from wrong assumptions. The model is systematically off, whatever data you give it, because it's too simple (a straight line can't follow a curve).
- **Variance** is error from being too sensitive to the particular training sample. Train on a slightly different sample and you get a very different model.

Imagine retraining the same kind of model on many different training samples drawn from the same population:

- High bias: all the models make similar mistakes (they're consistently wrong).
- High variance: the models disagree wildly with each other.

### The bias–variance decomposition

For squared error, the expected error on a new point splits into three parts:

$$
\mathbb{E}\big[(y-\hat f(x))^2\big] = \underbrace{\text{Bias}[\hat f(x)]^2}_{\text{too simple}} + \underbrace{\text{Var}[\hat f(x)]}_{\text{too sensitive}} + \underbrace{\sigma^2}_{\text{noise}}
$$

:::symbols
- $x$ = the input features of a new row; $y$ = its true target.
- $\hat f(x)$ = the model's prediction (the hat means "estimated").
- $\mathbb{E}[\cdot]$ = expected value: the average over many possible training samples and noise.
- $\text{Bias}[\hat f(x)]$ = how far the *average* prediction is from the truth. Squared, so it's always positive.
- $\text{Var}[\hat f(x)]$ = how much predictions spread around their own average across training samples.
- $\sigma^2$ = irreducible noise: randomness in $y$ that no model can predict (measurement error, missing information).
:::

The key idea: making a model more flexible usually lowers bias and raises variance. The best model sits at the sweet spot where the **sum** is smallest. And no model can go below $\sigma^2$.

## 3. How to diagnose which one you have

**Step 1: compare training and validation scores.**

| Training error | Validation error | Diagnosis |
|---|---|---|
| High | High (similar) | Underfitting / high bias |
| Low | Much higher | Overfitting / high variance |
| Low | Slightly higher | Good fit |

**Step 2: draw a learning curve.** Plot training and validation scores as you train on more and more data.

- If both curves have flattened at a poor level and are close together, more data won't help: you need a more powerful model or better features (bias problem).
- If there's a big gap that's still shrinking, more data will help (variance problem).

:::trap
**Training accuracy 99%, validation 70%: is it always overfitting?** Usually, but check two other causes first: **data leakage** (a feature that secretly contains the answer, often cleaner in training) and a **distribution difference** between your training and validation data (different months, regions or customers). A time-based split and adversarial validation help tell these apart.
:::

## 4. How to fix each

| Fix underfitting (high bias) | Fix overfitting (high variance) |
|---|---|
| Add better features (ratios, interactions, domain features) | Get more training data |
| Use a more flexible model (trees, boosting, neural nets) | Use a simpler model or fewer features |
| Reduce regularisation | Add or increase regularisation (L1, L2, dropout) |
| Train longer (neural nets, boosting) | Early stopping |
| Grow deeper trees | Limit tree depth, raise min samples per leaf |
| | Average many models (bagging, Random Forest) |
| | Data augmentation (images, text) |

## 5. Regularisation: paying a price for complexity

Regularisation adds a **penalty for large weights** to the loss the model minimises. The model may still use big weights, but only if they reduce the error by more than they cost. Big weights usually mean the model is chasing noise, so penalising them makes it simpler and more stable.

### L2 regularisation (Ridge)

$$
\min_{w}\;\underbrace{\frac{1}{n}\sum_{i=1}^{n}(y_i - x_i^\top w)^2}_{\text{fit the data}} \;+\; \underbrace{\lambda\sum_{j=1}^{p} w_j^2}_{\text{penalty}}
$$

### L1 regularisation (Lasso)

$$
\min_{w}\;\frac{1}{n}\sum_{i=1}^{n}(y_i - x_i^\top w)^2 \;+\; \lambda\sum_{j=1}^{p} |w_j|
$$

:::symbols
- $w$ = the model's weights (coefficients), one per feature; $w_j$ = weight of feature $j$.
- $\min_w$ = "find the weights that make this as small as possible".
- $n$ = number of training rows; $p$ = number of features.
- $x_i^\top w$ = the model's prediction for row $i$ (each feature times its weight, added up).
- $\lambda$ ("lambda") = regularisation strength. $\lambda = 0$ means no penalty; larger $\lambda$ means simpler models.
- $w_j^2$ = squared weight (L2); $|w_j|$ = absolute value of the weight (L1).
:::

### Elastic Net: a mix of both

$$
\lambda\Big(\alpha\sum_j |w_j| + \frac{1-\alpha}{2}\sum_j w_j^2\Big)
$$

Here $\alpha$ (between 0 and 1) sets the mix: 1 = pure Lasso, 0 = pure Ridge.

:::trap
**In scikit-learn's LogisticRegression and SVM, does a bigger C mean more regularisation?** No, less. They use $C = 1/\lambda$, so **small C = strong regularisation**. Ridge and Lasso use `alpha`, where bigger means stronger.
:::

## 6. Why L1 sets weights to exactly zero and L2 doesn't

This is a favourite "explain the intuition" question. Two ways to see it:

**Geometry.** Think of regularisation as forcing the weights to stay inside a region. For two weights, the L1 region $|w_1| + |w_2| \le t$ is a **diamond** with corners on the axes. The L2 region $w_1^2 + w_2^2 \le t$ is a **circle**. The best weights are where the loss contours (ellipses around the unregularised solution) first touch the region. With a diamond, that first touch is very often a corner, where one weight is exactly 0. A circle has no corners, so the touching point usually has both weights non-zero.

::viz{name="reg-path"}

**Calculus.** The L2 penalty's slope is $2\lambda w_j$, which gets smaller as $w_j$ gets smaller, so it pushes gently and never quite reaches zero. The L1 penalty's slope is a constant $\pm\lambda$ no matter how small the weight is, so it keeps pushing until the weight hits exactly zero.

| | L2 / Ridge | L1 / Lasso |
|---|---|---|
| Effect on weights | Shrinks all of them smoothly | Sets many to exactly 0 |
| Feature selection | No | Yes |
| Correlated features | Shares weight across the group (stable) | Picks one, somewhat at random (unstable) |
| Closed-form solution | Yes: $(X^\top X + \lambda I)^{-1}X^\top y$ | No (solved with coordinate descent) |
| Use when | Many small, useful features; multicollinearity | You expect only a few features matter |

### Always scale features before regularising

The penalty looks at the raw size of each weight. A feature measured in rupees gets a tiny weight; the same information measured in lakhs gets a big one and is punished more. Standardise features (mean 0, standard deviation 1) so the penalty treats them fairly.

## 7. Regularisation in other models

The same idea has many names:

- Trees: `max_depth`, `min_samples_leaf`, pruning (`ccp_alpha`).
- XGBoost: `lambda` (L2 on leaf values), `alpha` (L1), `gamma` (penalty per leaf).
- Neural nets: weight decay (L2), dropout, early stopping, data augmentation.
- Ensembles: bagging averages away variance.

## 8. Code

```python
from sklearn.linear_model import Ridge, Lasso, ElasticNet
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import cross_val_score, learning_curve

scaler = StandardScaler().fit(X_train)            # fit on training data only
Xtr, Xte = scaler.transform(X_train), scaler.transform(X_test)

for model in [Ridge(alpha=1.0), Lasso(alpha=0.05), ElasticNet(alpha=0.05, l1_ratio=0.5)]:
    model.fit(Xtr, y_train)
    zeros = (model.coef_ == 0).sum()
    print(type(model).__name__, "R2 test:", round(model.score(Xte, y_test), 3), "zero weights:", zeros)

# learning curve: does more data help?
sizes, tr, va = learning_curve(Ridge(alpha=1.0), Xtr, y_train, cv=5, train_sizes=[0.1, 0.3, 0.5, 0.7, 1.0])
print(tr.mean(axis=1), va.mean(axis=1))
```

:::say
"Overfitting is low bias and high variance: training error is low but validation error is much higher, because the model learned noise. Underfitting is high bias: both errors are high. Expected error splits into bias squared, variance and irreducible noise, so I look for the complexity where the sum is lowest. I diagnose with train versus validation scores and learning curves. To fix overfitting I add data, regularise, simplify or use early stopping; to fix underfitting I add features or a more flexible model. L2 shrinks all weights and handles correlated features; L1 drives some to exactly zero, so it also selects features."
:::
