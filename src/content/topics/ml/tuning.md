---
title: Hyperparameter tuning
short: Hyperparameter tuning
subject: ml
group: Evaluation
order: 5
summary: Settings you choose before training (depth, learning rate, C). Grid search, random search, Bayesian optimisation with Optuna, early stopping, and a practical tuning order for boosting.
minutes: 14
---

Common questions: parameters vs hyperparameters, grid vs random vs Bayesian search, why random search usually wins, and how you'd actually tune XGBoost or LightGBM.

## 1. Parameters vs hyperparameters

| | Parameters | Hyperparameters |
|---|---|---|
| What | Learned from data during training | Set by you before training |
| Examples | Regression weights, tree split thresholds, leaf values, neural-net weights | Learning rate, max_depth, number of trees, C, k in KNN, regularisation strength |
| How chosen | By the training algorithm | By search using validation scores |

## 2. The search methods

### Grid search

Try every combination of a list of values.

- 3 values for each of 4 hyperparameters = $3^4 = 81$ models (× 5 folds = 405 fits).
- Exhaustive and simple, but the cost explodes, and it wastes many trials on hyperparameters that don't matter.

### Random search

Sample combinations at random from ranges (or distributions).

- Same budget, but every trial tries a **new value of every hyperparameter**.
- Since usually only a few hyperparameters really matter, random search explores them much more thoroughly (Bergstra and Bengio, 2012).

::viz{name="tune-search"}

:::trap
**Why does random search beat grid search with the same number of trials?** With a 3 × 3 grid you only ever test 3 values of the important hyperparameter. Nine random trials test 9 different values of it. Look at the tick marks under the two panels above.
:::

### Bayesian optimisation (Optuna, Hyperopt)

Use the results so far to choose the next trial smartly.

1. Try a few random settings.
2. Fit a cheap **surrogate model** of "settings → score" (a Gaussian process, or Optuna's default TPE, Tree-structured Parzen Estimator).
3. Pick the next setting where the surrogate expects improvement, balancing **exploration** (uncertain areas) and **exploitation** (areas that look good).
4. Run it, update the surrogate, repeat.

A common rule for step 3 is **expected improvement**:

$$
\text{EI}(x) = \mathbb{E}\big[\max(0,\; f(x) - f(x^{+}))\big]
$$

:::symbols
- $x$ = a candidate hyperparameter setting.
- $f(x)$ = its (unknown) score; the surrogate gives a guess and an uncertainty.
- $f(x^{+})$ = the best score found so far.
- $\max(0, \cdot)$ = only improvements count; $\mathbb{E}$ = expected value under the surrogate's uncertainty.
:::

Usually needs far fewer trials than random search. Trials run mostly one after another, though.

### Early stopping and pruning

- **Early stopping** (boosting, neural nets): stop training when the validation score hasn't improved for N rounds. It chooses the number of trees or epochs for you.
- **Pruning** (Optuna, Hyperband, successive halving): give many settings a small budget, drop the bad ones early, give the survivors more. Saves a lot of compute.

## 3. Practical tuning order for XGBoost / LightGBM

1. Fix learning rate at about 0.1; use early stopping to find the number of trees.
2. Tree complexity: `max_depth` / `num_leaves`, then `min_child_weight` / `min_data_in_leaf`.
3. Sampling: `subsample` / `bagging_fraction`, `colsample_bytree` / `feature_fraction`.
4. Regularisation: `lambda`, `alpha`, `gamma` / `min_gain_to_split`.
5. Lower the learning rate (0.01 to 0.05), raise the tree limit, early-stop again.

For Random Forest: `max_features` and `min_samples_leaf` matter most; then raise `n_estimators` until scores flatten.

## 4. Good habits

- Tune on validation folds; evaluate **once** on the test set.
- Use the **business metric** as the scoring function (e.g. PR-AUC for rare positives).
- Search on a **log scale** for things like learning rate and C (0.001, 0.01, 0.1, 1).
- Keep the search space sensible; most gains come from a few hyperparameters.
- Fix random seeds for reproducibility; log every trial (MLflow, Optuna dashboard).
- Don't over-tune on a small validation set: you'll fit its noise.

## 5. Code

```python
import optuna
from lightgbm import LGBMClassifier
from sklearn.model_selection import cross_val_score, StratifiedKFold, RandomizedSearchCV
from scipy.stats import randint, uniform

# Random search
rs = RandomizedSearchCV(
    LGBMClassifier(n_estimators=500, verbose=-1),
    {"num_leaves": randint(15, 255), "min_child_samples": randint(10, 200),
     "learning_rate": uniform(0.01, 0.1), "colsample_bytree": uniform(0.5, 0.5)},
    n_iter=40, scoring="average_precision", cv=5, random_state=42, n_jobs=-1)
rs.fit(X_train, y_train)

# Bayesian optimisation with Optuna
def objective(trial):
    params = {
        "num_leaves": trial.suggest_int("num_leaves", 15, 255, log=True),
        "min_child_samples": trial.suggest_int("min_child_samples", 10, 200),
        "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.2, log=True),
        "colsample_bytree": trial.suggest_float("colsample_bytree", 0.5, 1.0),
        "subsample": trial.suggest_float("subsample", 0.5, 1.0), "subsample_freq": 1,
    }
    model = LGBMClassifier(n_estimators=500, verbose=-1, **params)
    cv = StratifiedKFold(5, shuffle=True, random_state=42)
    return cross_val_score(model, X_train, y_train, cv=cv, scoring="average_precision").mean()

study = optuna.create_study(direction="maximize")
study.optimize(objective, n_trials=50)
print(study.best_params, study.best_value)
```

:::say
"Hyperparameters are set before training, unlike the parameters the model learns. I start from sensible defaults with early stopping, then use Optuna's TPE sampler with stratified cross-validation over depth or num_leaves, minimum leaf size, subsampling and regularisation, with pruning to drop poor trials early. Random search beats grid search for the same budget because only a few hyperparameters really matter. I finish by lowering the learning rate, and evaluate once on the held-out or out-of-time test set."
:::
