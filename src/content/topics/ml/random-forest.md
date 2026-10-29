---
title: Random Forest
short: Random Forest
subject: ml
group: Supervised models
order: 4
summary: Many decision trees, each trained on a slightly different version of the data, voting together. One of the most asked algorithms in DS interviews.
minutes: 25
---

If you tell an interviewer you've used Random Forest, expect follow-ups: why is it better than one decision tree, how does Out-of-Bag (OOB) error work, what does each hyperparameter do, how are predictions combined, and can it still overfit? This page builds the answers from the ground up, in plain language.

## 1. What is Random Forest?

Random Forest is an **ensemble** model: it builds many **decision trees** and combines their answers into one final prediction.

The name tells you the idea:

- **Forest**: instead of trusting one decision tree, we build many (often 100 to 1,000).
- **Random**: each tree is trained with some deliberate randomness, so the trees are not copies of each other.
- **Ensemble**: a group of models working together. The group's answer is usually more reliable than any single member's.

:::analogy
You want to know whether a customer will default on a loan. Instead of asking one loan officer, you ask 500 officers. Each one has seen a slightly different set of past customers and tends to focus on different details. Any single officer can be badly wrong, but if their mistakes are different, the majority vote is rarely wrong.
:::

It works for both kinds of problems:

| Problem | Example | How trees are combined |
|---|---|---|
| Classification (predict a category) | Will this customer churn: yes or no? | Average the trees' class probabilities and pick the highest (similar to a majority vote) |
| Regression (predict a number) | What will this customer spend next year? | Average the trees' numbers |

## 2. Why do we need it? The problem with one decision tree

A decision tree learns rules like:

- If website visits > 5, go left.
- If income > ₹80,000, go right.
- If previous purchases > 2, predict "Buy".

Trees are great because they learn non-linear patterns and interactions automatically, need no feature scaling and are easy to read. But they have one big weakness: **they are unstable**.

Change a few rows of training data and the first split might change. Since every split below depends on the one above, the whole tree can come out completely different. A model whose predictions swing a lot when the training data changes slightly is said to have **high variance**.

:::why
High variance means the model memorises the quirks of the particular training sample (overfitting). It scores very well on training data and noticeably worse on new data.
:::

Random Forest attacks exactly this problem. If many trees each make *different* mistakes, averaging them cancels a lot of those mistakes out, while keeping the trees' ability to learn complex patterns.

| Model | Typical behaviour |
|---|---|
| One deep decision tree | Low bias, high variance: fits training data very closely, unstable |
| One shallow decision tree | Higher bias: too simple, may underfit |
| Random Forest of deep trees | Low bias kept, variance strongly reduced: usually much better on new data |

:::remember
Random Forest mainly reduces **variance**. It does not fix a model that is too simple (high bias), and it is not guaranteed to win on every dataset.
:::

## 3. The two sources of randomness

This is one of the most asked parts. Random Forest makes trees different in two ways: which **rows** each tree sees, and which **columns** each split may use.

### A. Bootstrap sampling: randomness in rows

Say the training data has $N = 1{,}000$ rows. For each tree, we draw 1,000 rows **with replacement** from those 1,000.

"With replacement" means after a row is picked, it is put back, so it can be picked again. As a result:

- Some rows appear two or three times in a tree's sample.
- Some rows don't appear at all.
- Every tree gets a slightly different sample.

This is called **bootstrapping**, and training many models on bootstrap samples and combining them is called **bagging** (short for **b**ootstrap **agg**regat**ing**).

:::worked
10 rows, numbered 1 to 10. One bootstrap draw might give: 1, 1, 3, 4, 4, 6, 7, 8, 9, 9.

- Rows 1, 4 and 9 appear twice.
- Rows 2, 5 and 10 never appear. They are this tree's **out-of-bag** rows (more on these in section 6).
:::

How many different rows does a tree actually see? On average about **63.2%**. The other **36.8%** are left out. Section 6 shows where these numbers come from.

### B. Random feature selection: randomness in columns

Say there are 100 features. At **each split** (each yes/no question in the tree), the tree is not allowed to look at all 100. It gets a random handful, for example 10, and picks the best split among only those 10. At the next split it gets a fresh random handful.

Why bother? Imagine one feature, say "number of missed payments", is extremely predictive. If every tree could always use it, almost every tree would put it at the top, and all the trees would look alike. Hiding it from some splits forces trees to find other useful signals, so they become more different from each other.

:::remember
Bootstrap sampling makes trees different through the **rows** they learn from. Random feature selection makes them different through the **questions** they're allowed to ask. Both reduce how similar (correlated) the trees are.
:::

### Why "different trees" is the whole point

Averaging only helps if the trees make different mistakes. If 500 trees all make the same mistake, the average makes it too. There is a neat formula for this:

$$
\text{Var}\Big(\frac{1}{B}\sum_{b=1}^{B} T_b\Big) = \rho\,\sigma^2 + \frac{1-\rho}{B}\,\sigma^2
$$

:::symbols
- $T_b$ = the prediction of tree number $b$.
- $B$ = number of trees in the forest.
- $\frac{1}{B}\sum T_b$ = the forest's prediction (the average over all trees).
- $\text{Var}$ = variance: how much a prediction would swing if we retrained on a different sample.
- $\sigma^2$ ("sigma squared") = the variance of a single tree.
- $\rho$ ("rho") = the correlation between trees: 0 means their errors are unrelated, 1 means they make identical errors.
:::

Read it in two parts:

1. The second part, $\frac{1-\rho}{B}\sigma^2$, shrinks as you add trees ($B$ gets bigger). This is why more trees help, up to a point.
2. The first part, $\rho\sigma^2$, does **not** shrink with more trees. Only making the trees less correlated (smaller $\rho$) reduces it. That's exactly what bootstrap sampling and random features do.

:::worked
Suppose one tree has variance $\sigma^2 = 1$ and the trees have correlation $\rho = 0.3$.

- With $B = 10$ trees: $0.3 + 0.7/10 = 0.37$.
- With $B = 500$ trees: $0.3 + 0.7/500 = 0.3014$.
- If random features lowered the correlation to $\rho = 0.1$: $0.1 + 0.9/500 \approx 0.102$.

Going from 10 to 500 trees helped a bit; making trees less similar helped a lot more.
:::

## 4. How Random Forest trains, step by step

Take a dataset of 10,000 customers, 30 features, and a target `default` that is 0 or 1.

1. **Make a bootstrap sample for tree 1**: draw 10,000 rows with replacement. Do the same, independently, for every other tree.
2. **Start growing tree 1**: at the root, pick a random subset of features, e.g. 5 of the 30.
3. **Find the best split among those 5**: for each feature, try possible thresholds (e.g. "income < ₹40,000?") and keep the one that makes the two child groups most "pure" (explained below).
4. **Repeat in each child node**: pick a fresh random 5 features, find the best split, and keep going until a stopping rule is hit (the node is pure, too small, or the maximum depth is reached).
5. **Repeat for all trees**: each tree is grown independently, so they can be trained in parallel on different CPU cores.
6. **Store the forest**: the model keeps every tree's split rules and leaf values. Nothing else is needed for prediction.

:::note
Randomness only decides *which features are candidates* at a split. Among the candidates, the tree still picks the **best** split. It doesn't pick a random split (that variant exists, it's called Extra Trees).
:::

### How does a tree decide which split is "best"?

For classification, it measures how mixed a node is, using **Gini impurity** (default) or **entropy**.

$$
\text{Gini} = 1 - \sum_{k=1}^{K} p_k^2
$$

:::symbols
- $K$ = number of classes (2 for yes/no).
- $p_k$ = the share of rows in this node that belong to class $k$.
- $\sum_{k=1}^{K}$ = add up over all classes.
:::

- All rows in one class: Gini $= 1 - 1^2 = 0$ (perfectly pure).
- Half and half: Gini $= 1 - (0.5^2 + 0.5^2) = 0.5$ (as mixed as two classes can be).

$$
\text{Entropy} = -\sum_{k=1}^{K} p_k \log_2 p_k
$$

Entropy is also 0 for a pure node and 1 for a 50/50 node. In practice Gini and entropy pick very similar splits; Gini is slightly faster because it has no logarithm.

The tree picks the split that makes the **weighted average impurity of the two children** as low as possible compared with the parent. That drop is called the **information gain** (or impurity decrease).

:::worked
A node has 10 loans: 5 defaults, 5 good. Gini = 0.5.

Candidate split "missed payments > 2": left gets 4 rows (all defaults, Gini 0), right gets 6 rows (1 default, 5 good).

Right Gini $= 1 - (1/6)^2 - (5/6)^2 = 0.278$.

Weighted children Gini $= \frac{4}{10}\times 0 + \frac{6}{10}\times 0.278 = 0.167$. Gain $= 0.5 - 0.167 = 0.333$.

The tree compares this gain with every other candidate split and keeps the largest.
:::

For **regression**, the tree measures how spread out the target values are (variance, i.e. mean squared error) and picks the split that reduces it the most.

## 5. How Random Forest makes predictions

Training and prediction are different steps, and interviewers like to check you know the difference. Prediction never changes the trees.

### What happens to a new row

1. Send the new customer's 30 feature values down tree 1, answering each yes/no question until you reach a leaf.
2. Read that leaf's prediction.
3. Do the same for every tree.
4. Combine the answers.

### Classification

Five trees predict default or not:

| Tree | Prediction |
|---|---|
| Tree 1 | Default |
| Tree 2 | No default |
| Tree 3 | Default |
| Tree 4 | Default |
| Tree 5 | No default |

Majority vote: **Default** (3 out of 5).

scikit-learn actually averages each tree's **class probabilities** rather than counting hard votes. Each leaf stores the share of training rows of each class that landed in it, so a tree might say "70% default".

$$
\hat P(y=k \mid x) = \frac{1}{T}\sum_{t=1}^{T}\hat P_t(y=k \mid x)
$$

:::symbols
- $x$ = the new row's features.
- $y = k$ = "the answer is class $k$" (e.g. default).
- $\hat P_t(y=k\mid x)$ = tree $t$'s estimated probability of class $k$ for this row. The hat ( $\hat{}$ ) means "estimated".
- $T$ = number of trees.
- $\hat P(y=k\mid x)$ = the forest's probability: the average over all trees.
:::

If the averages come out as "no default 0.42, default 0.58", the forest predicts **default**, and `predict_proba` returns 0.58.

### Regression

Five trees predict next year's spend: ₹42,000, ₹45,000, ₹40,000, ₹47,000, ₹46,000.

$$
\hat y = \frac{1}{T}\sum_{t=1}^{T}\hat y_t = \frac{42{,}000 + 45{,}000 + 40{,}000 + 47{,}000 + 46{,}000}{5} = ₹44{,}000
$$

Here $\hat y_t$ is tree $t$'s predicted number and $\hat y$ is the forest's prediction.

:::trap
**Can a Random Forest regressor predict a value higher than anything in the training data?** No. Each leaf predicts an average of training targets, and the forest averages those. If the most expensive house in training was ₹2 crore, the forest will never predict ₹5 crore. Random Forest **cannot extrapolate** trends beyond the training range.
:::

## 6. Out-of-Bag (OOB) error, explained properly

OOB connects bootstrap sampling, validation and evaluation, which is why interviewers love it.

### What is an OOB row?

Each tree is trained on a bootstrap sample, so some original rows were never drawn for that tree. For that tree, those rows are **out-of-bag**: the tree has never seen them, so they can act like a small test set *for that tree*.

### How is the OOB prediction made?

Take training row 2:

- Tree 1 left row 2 out → tree 1 may vote on row 2.
- Tree 2 used row 2 in training → tree 2 is **not** allowed to vote on row 2.
- Tree 3 left row 2 out → tree 3 may vote.

Combine only the trees that never saw row 2. That gives row 2 an honest prediction. Do the same for every training row, compare those predictions with the true labels, and you get the **OOB error** (or the OOB score = OOB accuracy for classification, OOB $R^2$ for regression in scikit-learn).

:::worked
10 rows, 3 trees.

- Tree 1's OOB rows: {2, 5, 10}
- Tree 2's OOB rows: {1, 5, 8}
- Tree 3's OOB rows: {2, 3, 5, 6}

Row 5 was left out by all three trees, so all three vote on it: default, default, no default → OOB prediction "default".
Row 2 is scored by trees 1 and 3 only. Row 4 was used by every tree, so it gets no OOB prediction (with hundreds of trees this almost never happens).

If 8 of the rows that got an OOB prediction are predicted correctly out of 9, OOB accuracy = 8/9 = 0.89.
:::

::viz{name="rf-oob"}

### Where does 36.8% come from?

When drawing one row out of $N$, the chance a particular row is **not** picked is $1 - \frac{1}{N}$. We draw $N$ times independently, so the chance it is never picked is:

$$
P(\text{row is OOB}) = \Big(1 - \frac{1}{N}\Big)^N \;\longrightarrow\; e^{-1} \approx 0.368 \text{ as } N \text{ grows}
$$

:::symbols
- $N$ = number of training rows (and number of draws).
- $\frac{1}{N}$ = chance a specific row is picked in one draw.
- $e \approx 2.718$ = Euler's number. $e^{-1} = 1/e \approx 0.368$.
:::

Check with real numbers: $N = 10$ gives $0.9^{10} = 0.349$; $N = 100$ gives $0.99^{100} = 0.366$; $N = 10{,}000$ gives about $0.368$.

So each tree leaves out about 36.8% of rows and sees about $1 - 0.368 = 63.2\%$ of the distinct rows.

:::mistake
36.8% is the share left out of **one** tree's sample, not the share of rows the whole forest never uses. With 300 trees, each row is out-of-bag for roughly 110 of them and in-bag for the rest.
:::

### Why OOB is useful

- **Validation without a separate split**: an estimate of how the model does on unseen data, using only the training set.
- **Quick tuning**: compare settings (e.g. `max_features`) by OOB score.
- **OOB permutation importance**: shuffle one feature in the OOB rows and see how much the OOB score drops.

### OOB limitations to mention

- It's an estimate, not a replacement for a final held-out test set.
- It only works with `bootstrap=True` (and `oob_score=True` in scikit-learn).
- It doesn't respect time order or groups, so for time series or many rows per customer, you still need a proper split.
- It cannot detect data leakage already baked into your features.
- It isn't completely free: computing it needs extra prediction passes.

## 7. Every important hyperparameter

Using scikit-learn's `RandomForestClassifier` (the regressor is almost identical). The easiest way to remember them is by what they control:

| Group | Parameters |
|---|---|
| How many trees | `n_estimators` |
| How different the trees are | `max_features`, `bootstrap`, `max_samples` |
| How big each tree can grow | `max_depth`, `min_samples_split`, `min_samples_leaf`, `max_leaf_nodes`, `min_impurity_decrease`, `ccp_alpha` |
| How classes are weighted | `class_weight` |
| Training and evaluation | `criterion`, `oob_score`, `n_jobs`, `random_state` |

::viz{name="rf-forest"}

### `n_estimators`: number of trees

- **What it does**: how many trees to build. Default 100.
- **More trees**: predictions get more stable; accuracy improves and then flattens out (play with the slider above). Training and prediction get slower and the model gets bigger.
- **Fewer trees**: faster, but predictions can wobble from run to run.
- **Typical**: 200 to 1,000. Pick the point where the OOB or validation score stops improving.

:::trap
**Can adding more trees make a Random Forest overfit?** No. Each extra tree is just another vote; more votes make the average more stable, not more complex. Overfitting in a Random Forest comes from each tree being too complex (too deep, leaves too small) or from noisy or leaky data. Contrast with boosting, where more rounds *can* overfit.
:::

### `max_features`: features tried at each split

Probably the most important Random Forest-specific setting.

- **What it does**: how many randomly chosen features each split may consider. Options: a number (`10`), a fraction (`0.3` = 30% of features), `"sqrt"` ($\sqrt{p}$, where $p$ = number of features), `"log2"`, or `None`/`1.0` (all features).
- **Defaults**: `"sqrt"` for classification, `1.0` (all features) for regression in current scikit-learn.
- **Lower**: trees are more different from each other (lower correlation $\rho$), but each tree is weaker.
- **Higher**: each tree is stronger but the trees look more alike. With all features you get plain bagging.

:::worked
100 features, `max_features="sqrt"` → each split looks at 10 random features. With `max_features=0.5` → 50 features per split.
:::

### `max_depth`: how deep each tree can grow

- **What it does**: the maximum number of questions from the root to a leaf. Default `None` = grow until other rules stop it.
- **Deeper**: learns more detailed patterns; each tree overfits more, but averaging controls it.
- **Shallower**: simpler, faster, smaller model; can underfit.

:::trap
**If deep trees overfit, why does Random Forest use them?** Because a deep tree has low bias but high variance, and averaging many different deep trees removes much of the variance while keeping the low bias. Limiting depth is still useful to save memory, speed up prediction, or when data is noisy.
:::

### `min_samples_split`: rows needed to try a split

- **What it does**: a node is only split if it has at least this many rows. Default 2.
- **Higher**: fewer, broader rules; less overfitting.
- It does **not** guarantee the children are big. That's `min_samples_leaf`.

### `min_samples_leaf`: smallest allowed leaf

- **What it does**: every leaf must contain at least this many training rows. Default 1.
- **Why it matters**: with 1, a tree can create a leaf for a single unusual customer and learn a rule just for them. With 20, every rule must be backed by at least 20 customers, which smooths predictions.
- Often the single most useful knob for reducing overfitting in a forest. Try 1, 3, 5, 10, 20.

| Parameter | What it restricts |
|---|---|
| `min_samples_split` | Whether a node may be split at all |
| `min_samples_leaf` | How small each resulting leaf may be |

### `max_leaf_nodes`, `min_impurity_decrease`, `ccp_alpha`

- `max_leaf_nodes`: cap on the number of leaves per tree; grows the best splits first.
- `min_impurity_decrease`: only split if it reduces impurity by at least this much.
- `ccp_alpha`: cost-complexity pruning. After growing, prune branches that don't reduce error enough. It minimises $R(T) + \alpha|T|$, where $R(T)$ is the tree's training error, $|T|$ the number of leaves, and $\alpha$ the penalty per leaf.

### `bootstrap` and `max_samples`

- `bootstrap=True` (default): each tree gets a bootstrap sample. Set to `False` and every tree sees all rows (only feature randomness remains, and OOB is not available).
- `max_samples`: size of each bootstrap sample, e.g. `0.5` = half the rows. Smaller = faster training, more diverse trees, each tree slightly weaker.

### `class_weight`: for imbalanced data

- `"balanced"`: weights each class by $\frac{n}{K\,n_c}$, where $n$ = total rows, $K$ = number of classes, $n_c$ = rows in class $c$. Rare classes count more.
- `"balanced_subsample"`: the same, but computed inside each tree's bootstrap sample.

:::worked
1,000 rows, 50 defaults, 950 good. Weight for default $= \frac{1000}{2 \times 50} = 10$; weight for good $= \frac{1000}{2\times950} \approx 0.53$. A misclassified default now costs about 19 times more than a misclassified good customer.
:::

### `criterion`, `oob_score`, `n_jobs`, `random_state`

- `criterion`: `"gini"` (default), `"entropy"` or `"log_loss"` for classification; `"squared_error"`, `"absolute_error"`, `"poisson"` for regression.
- `oob_score=True`: compute the OOB score; read it from `model.oob_score_`.
- `n_jobs=-1`: use all CPU cores (trees train in parallel).
- `random_state`: fixes the randomness so results are reproducible.

### A sensible tuning order

1. Start with defaults, `n_estimators=500`, `oob_score=True`, `n_jobs=-1`.
2. Tune `max_features` (e.g. `"sqrt"`, 0.2, 0.33, 0.5).
3. Tune `min_samples_leaf` (1, 3, 5, 10) and, if needed, `max_depth`.
4. Set `class_weight` if classes are imbalanced.
5. Raise `n_estimators` until the score stops improving.

## 8. Feature importance, and its traps

### Impurity-based importance (MDI): `feature_importances_`

Every time a feature is used to split, the impurity drops by some amount. Add up those drops for each feature across all trees (weighted by how many rows reached that node), average over trees, and normalise so all importances sum to 1. That's **Mean Decrease in Impurity**.

- **Pro**: free, computed during training.
- **Con 1**: biased toward features with **many unique values** (continuous features, IDs), because they offer more possible split points. A random ID column can look important.
- **Con 2**: computed on training data, so it can reward features the model overfits on.

### Permutation importance

Take a validation set (or OOB rows), shuffle one column so its link to the target is broken, and measure how much the score drops. Big drop = the model relies on that feature.

- **Pro**: measured on held-out data, not biased by cardinality, works for any model.
- **Con**: slower; misleading with **correlated features**, because shuffling one leaves its twin still carrying the information, so both can look unimportant.

:::trap
**Two features are highly correlated. What happens to their importance?** The forest's predictions are fine, because feature sampling lets different trees use either one. But importance gets **split** between them in MDI, and permutation importance can show **both** as unimportant. Group correlated features or use SHAP when explaining.
:::

For explaining individual predictions to a business audience, use **SHAP** values (TreeSHAP is fast for forests): they show how much each feature pushed this customer's prediction up or down.

## 9. Random Forest compared with its relatives

| | Decision tree | Bagging | Random Forest | Extra Trees | Gradient boosting (XGBoost, LightGBM) |
|---|---|---|---|---|---|
| Trees | 1 | Many, on bootstrap samples | Many, bootstrap + random features | Many, random thresholds, usually no bootstrap | Many shallow trees, built one after another |
| Main effect | – | Reduces variance | Reduces variance more (less correlated trees) | Even more randomness, faster | Reduces bias |
| More trees can overfit? | – | No | No | No | **Yes** (use early stopping) |
| Training | Fast | Parallel | Parallel | Parallel, fastest | Sequential |
| Tuning effort | Low | Low | Low | Low | Higher |
| Typical accuracy on tabular data | Lowest | Good | Very good | Very good | Usually best when tuned |

:::say
"Random Forest is bagging of decision trees with one extra trick: at every split each tree only considers a random subset of features. Bootstrap samples make the trees see different rows; random features make them ask different questions. Because the trees make different mistakes, averaging them reduces variance a lot without adding bias. Each tree leaves out about 37% of rows, so I get an out-of-bag estimate of test error for free. It needs little tuning, mainly max_features and min_samples_leaf, but it's heavier at prediction time than a boosted model and usually a little less accurate than well-tuned XGBoost."
:::

## 10. Strengths, weaknesses and when to use it

**Strengths**

- Strong accuracy with almost no tuning: a great first model.
- Hard to overfit by adding trees.
- Handles non-linear patterns and interactions; no feature scaling needed.
- Robust to outliers in features and fairly robust to noisy labels (more than boosting).
- OOB gives a built-in validation estimate.
- Trees train in parallel.

**Weaknesses**

- Large models and slower predictions than a single tree or a compact boosted model: a concern for low-latency APIs.
- Harder to explain than one tree (use SHAP).
- Cannot extrapolate beyond the training range.
- Probabilities tend to be **under-confident** (pulled toward the middle, because trees rarely all agree). Calibrate with `CalibratedClassifierCV` if you need true probabilities.
- Usually beaten by tuned gradient boosting on tabular data.
- Not great for very sparse, high-dimensional data like raw text (linear models do better).

| Good fit | Not a good fit |
|---|---|
| Quick, strong baseline on any tabular problem | Forecasting a trend beyond past values |
| Churn, credit risk, fraud screening with medium data | Ultra-low-latency scoring with tight memory |
| Noisy labels, small to medium datasets | Raw images, audio, text |
| Feature screening with permutation importance | When a single readable rule set is required |

## 11. Practical details interviewers probe

**Missing values**: classic implementations needed imputation (fill with median and add a "was missing" flag). Recent scikit-learn versions (1.4+) can handle missing values directly in Random Forest. Always say which library and version you'd check.

**Categorical features**: scikit-learn needs numbers, so use one-hot (few categories), ordinal (ordered categories) or out-of-fold target encoding (many categories). Avoid one-hot on very high-cardinality columns: it creates many weak, sparse features.

**Imbalanced classes**: `class_weight="balanced_subsample"`, tune the decision threshold on validation, judge with PR-AUC or recall at a fixed precision, not accuracy.

**Scaling**: not needed. Trees only care about the order of values.

**Proximity**: how often two rows land in the same leaf across trees. A learned similarity measure, used for clustering, outlier detection and imputation.

**Speed in production**: limit `max_depth` or `max_leaf_nodes`, fewer trees if the score plateaus, compile with tools like `treelite`, or switch to LightGBM if latency matters.

## 12. Code: train, predict, evaluate

```python
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, roc_auc_score

df = pd.read_csv("churn.csv")
X = df.drop(columns=["customer_id", "churn"])
y = df["churn"]

# 1. Split first, so the test set never influences training
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42)
X_train, X_test = X_train.copy(), X_test.copy()

# 2. Fill gaps using training medians only; one-hot encode categoricals
num = X_train.select_dtypes("number").columns
med = X_train[num].median()
X_train[num] = X_train[num].fillna(med)
X_test[num] = X_test[num].fillna(med)
X_train = pd.get_dummies(X_train)
X_test = pd.get_dummies(X_test).reindex(columns=X_train.columns, fill_value=0)

# 3. Build and train the forest
rf = RandomForestClassifier(
    n_estimators=500, max_features="sqrt", min_samples_leaf=5,
    class_weight="balanced_subsample", oob_score=True,
    n_jobs=-1, random_state=42)
rf.fit(X_train, y_train)
print("OOB accuracy:", round(rf.oob_score_, 3))

# 4. Predict and evaluate
proba = rf.predict_proba(X_test)[:, 1]      # probability of churn
pred = (proba >= 0.5).astype(int)            # labels at a 0.5 threshold
print("ROC-AUC:", round(roc_auc_score(y_test, proba), 3))
print(classification_report(y_test, pred))

# 5. Top features
imp = pd.Series(rf.feature_importances_, index=X_train.columns)
print(imp.sort_values(ascending=False).head(10))
```

:::say
Short version, 30 seconds: "Random Forest trains many deep decision trees on bootstrap samples, and at each split each tree only looks at a random subset of features. That makes the trees different, so averaging their votes or probabilities cuts variance. It needs little tuning, gives a free out-of-bag error estimate, and is a strong tabular baseline. Its downsides are model size, slower prediction, no extrapolation and slightly worse accuracy than tuned boosting."
:::
