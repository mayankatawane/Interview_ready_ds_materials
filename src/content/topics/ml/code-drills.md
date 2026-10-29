---
title: Code drills
short: Code drills
subject: ml
group: Practice
order: 1
summary: Code you may be asked to write live, from a simple Random Forest end to end to SQL window functions. Type them from memory and explain each line out loud.
minutes: 20
---

These have been asked in live rounds. Write each one from memory, explaining every line as you type. Unfinished code with clear reasoning scores better than silent, complete code.

## 1. Random Forest end to end (no pipeline)

The version most interviewers expect you to type from memory: load, split, fill gaps, encode, train, predict, evaluate. Each step is a separate line so you can explain it.

```python
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (accuracy_score, precision_score, recall_score, f1_score,
                             roc_auc_score, confusion_matrix, classification_report)

# 1. Load data
df = pd.read_csv("churn.csv")
X = df.drop(columns=["customer_id", "churn"])   # features (drop ID and target)
y = df["churn"]                                  # target: 1 = churned, 0 = stayed

# 2. Split BEFORE any preprocessing (avoids leakage)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42)   # stratify keeps the churn rate equal
X_train, X_test = X_train.copy(), X_test.copy()        # avoid SettingWithCopyWarning below

# 3. Missing values: learn the fill values on TRAIN only, apply to both
num_cols = X_train.select_dtypes(include="number").columns
cat_cols = X_train.select_dtypes(exclude="number").columns
medians = X_train[num_cols].median()
X_train[num_cols] = X_train[num_cols].fillna(medians)
X_test[num_cols] = X_test[num_cols].fillna(medians)
X_train[cat_cols] = X_train[cat_cols].fillna("Missing")
X_test[cat_cols] = X_test[cat_cols].fillna("Missing")

# 4. Encode categoricals (one-hot), then align test columns to train columns
X_train = pd.get_dummies(X_train, columns=cat_cols)
X_test = pd.get_dummies(X_test, columns=cat_cols)
X_test = X_test.reindex(columns=X_train.columns, fill_value=0)
# No scaling: trees only care about the order of values

# 5. Create and train the model
rf = RandomForestClassifier(
    n_estimators=300,        # number of trees
    max_depth=None,          # grow fully; control overfit with min_samples_leaf
    min_samples_leaf=5,
    max_features="sqrt",     # random feature subset per split
    class_weight="balanced", # handles class imbalance
    oob_score=True,          # free validation estimate
    n_jobs=-1, random_state=42)
rf.fit(X_train, y_train)
print("OOB accuracy:", round(rf.oob_score_, 3))

# 6. Predict
y_pred = rf.predict(X_test)                  # class labels using a 0.5 threshold
y_proba = rf.predict_proba(X_test)[:, 1]     # probability of class 1

# 7. Evaluate
print("Accuracy :", accuracy_score(y_test, y_pred))
print("Precision:", precision_score(y_test, y_pred))
print("Recall   :", recall_score(y_test, y_pred))
print("F1       :", f1_score(y_test, y_pred))
print("ROC-AUC  :", roc_auc_score(y_test, y_proba))   # uses probabilities, not labels
print(confusion_matrix(y_test, y_pred))
print(classification_report(y_test, y_pred))

# 8. Feature importance
imp = pd.Series(rf.feature_importances_, index=X_train.columns).sort_values(ascending=False)
print(imp.head(10))

# 9. Custom threshold (e.g. to raise recall)
y_pred_03 = (y_proba >= 0.3).astype(int)
print("Recall at 0.3:", recall_score(y_test, y_pred_03))
```

:::say[Things to say while typing]
- "I split first, then compute medians on train only, so the test set never influences training."
- "`predict` gives labels at threshold 0.5; ROC-AUC needs `predict_proba`."
- "`reindex` makes sure test has exactly the same dummy columns as train; categories seen only in test become all-zero."
- "Impurity importance is biased toward high-cardinality features; I'd confirm with permutation importance or SHAP."
:::

## 2. Regression version (Random Forest regressor)

```python
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import numpy as np

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
reg = RandomForestRegressor(n_estimators=300, min_samples_leaf=3, n_jobs=-1, random_state=42)
reg.fit(X_train, y_train)
pred = reg.predict(X_test)
print("MAE :", mean_absolute_error(y_test, pred))
print("RMSE:", np.sqrt(mean_squared_error(y_test, pred)))
print("R2  :", r2_score(y_test, pred))
```

## 3. Simple hyperparameter tuning (GridSearchCV, no pipeline)

```python
from sklearn.model_selection import GridSearchCV

param_grid = {
    "n_estimators": [200, 500],
    "max_depth": [None, 10, 20],
    "min_samples_leaf": [1, 5, 10],
    "max_features": ["sqrt", 0.5],
}
grid = GridSearchCV(RandomForestClassifier(random_state=42, n_jobs=-1),
                    param_grid, cv=5, scoring="roc_auc", n_jobs=-1)
grid.fit(X_train, y_train)            # CV happens inside the training data only
print(grid.best_params_, round(grid.best_score_, 3))
best_rf = grid.best_estimator_         # already refit on all of X_train
print("Test ROC-AUC:", roc_auc_score(y_test, best_rf.predict_proba(X_test)[:, 1]))
```

## 4. Same thing with XGBoost and early stopping

```python
from xgboost import XGBClassifier

# carve a validation set out of train for early stopping (never use test for this)
X_tr, X_val, y_tr, y_val = train_test_split(X_train, y_train, test_size=0.2,
                                            stratify=y_train, random_state=42)
xgb = XGBClassifier(n_estimators=2000, learning_rate=0.05, max_depth=5,
                    subsample=0.8, colsample_bytree=0.8,
                    scale_pos_weight=(y_tr == 0).sum() / (y_tr == 1).sum(),
                    eval_metric="aucpr", early_stopping_rounds=100)
xgb.fit(X_tr, y_tr, eval_set=[(X_val, y_val)], verbose=False)
print("Best iteration:", xgb.best_iteration)
print("Test ROC-AUC:", roc_auc_score(y_test, xgb.predict_proba(X_test)[:, 1]))
```

## 5. Best threshold for F1

```python
from sklearn.metrics import precision_recall_curve
p, r, t = precision_recall_curve(y_val, proba_val)
f1 = 2 * p * r / (p + r + 1e-12)
best_t = t[f1[:-1].argmax()]   # the last (p, r) pair has no threshold
```

## 6. Precision@k and recall@k

```python
import numpy as np
def precision_recall_at_k(y_true, scores, k):
    order = np.argsort(-np.asarray(scores))[:k]
    hits = np.asarray(y_true)[order].sum()
    return hits / k, hits / max(np.sum(y_true), 1)
```

## 7. Out-of-fold target encoding

```python
from sklearn.model_selection import KFold
def target_encode(train, col, target, m=20, k=5):
    prior = train[target].mean()
    out = pd.Series(index=train.index, dtype=float)
    for tr_idx, va_idx in KFold(k, shuffle=True, random_state=0).split(train):
        stats = train.iloc[tr_idx].groupby(col)[target].agg(["mean", "count"])
        smooth = (stats["mean"] * stats["count"] + prior * m) / (stats["count"] + m)
        out.iloc[va_idx] = train.iloc[va_idx][col].map(smooth).fillna(prior).values
    return out
```

## 8. Logistic regression from scratch (gradient descent)

```python
def fit_logreg(X, y, lr=0.1, epochs=1000):
    w, b = np.zeros(X.shape[1]), 0.0
    for _ in range(epochs):
        p = 1 / (1 + np.exp(-(X @ w + b)))
        w -= lr * X.T @ (p - y) / len(y)
        b -= lr * np.mean(p - y)
    return w, b
```

## 9. K-means from scratch

```python
def kmeans(X, k, iters=100, seed=0):
    rng = np.random.default_rng(seed)
    C = X[rng.choice(len(X), k, replace=False)]
    for _ in range(iters):
        labels = ((X[:, None, :] - C[None]) ** 2).sum(-1).argmin(1)
        newC = np.array([X[labels == j].mean(0) if (labels == j).any() else C[j] for j in range(k)])
        if np.allclose(newC, C): break
        C = newC
    return labels, C
```

## 10. Basics they test (the 4/10 candidate failed the first)

```python
# second largest without built-ins
def second_max(nums):
    first = second = float("-inf")
    for x in nums:
        if x > first:
            second, first = first, x
        elif first > x > second:
            second = x
    return None if second == float("-inf") else second

# median-impute numeric columns only
cols = df.select_dtypes(include="number").columns
df[cols] = df[cols].fillna(df[cols].median())

# timing decorator
import time, functools
def timed(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = fn(*args, **kwargs)
        print(f"{fn.__name__} took {time.perf_counter() - start:.3f}s")
        return result
    return wrapper
```

## 11. SQL: latest transaction above the customer's own average

```sql
WITH t AS (
  SELECT customer_id, amount,
         ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY txn_date DESC) AS rn,
         AVG(amount)  OVER (PARTITION BY customer_id) AS avg_amt
  FROM transactions)
SELECT customer_id, amount
FROM t
WHERE rn = 1 AND amount > avg_amt;
```
