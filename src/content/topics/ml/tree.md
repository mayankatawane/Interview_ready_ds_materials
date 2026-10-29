---
title: Decision trees
short: Decision trees
subject: ml
group: Supervised models
order: 3
summary: A model that learns a flowchart of yes/no questions about your features. The building block of Random Forest, XGBoost and LightGBM.
minutes: 20
---

Decision trees matter far beyond themselves: Random Forest, XGBoost, LightGBM and CatBoost are all built from them. If you understand how one tree picks its questions, every tree-based model becomes easier to explain.

## 1. What is a decision tree?

A decision tree predicts by asking a series of yes/no questions about the features, one after another, until it reaches an answer.

```text
Is missed_payments > 2?
├── Yes → Is income < ₹40,000?
│         ├── Yes → Predict: Default (85% of training rows here defaulted)
│         └── No  → Predict: No default
└── No  → Predict: No default (4% defaulted)
```

Vocabulary you'll be expected to use:

| Term | Meaning |
|---|---|
| Root node | The first question, which all rows pass through |
| Internal node | Any question in the middle |
| Split | A question that sends rows left or right, like "income < 40,000?" |
| Leaf (terminal node) | The end of a path, where a prediction is made |
| Depth | Number of questions from the root to a leaf |
| Pure node | A node whose rows all belong to one class |

:::analogy
The game "20 questions". A good first question ("Is it alive?") splits the possibilities roughly in half. A tree does the same thing with your data: at each step it asks the question that best separates the classes.
:::

Trees work for both:

- **Classification** (predict a category): the leaf predicts the majority class, and its class shares give a probability.
- **Regression** (predict a number): the leaf predicts the average target of the training rows that ended up there.

## 2. How a tree learns, step by step

The standard algorithm (CART, Classification And Regression Trees, used by scikit-learn) works like this:

1. Put all training rows in the root node.
2. For **every feature** and **every possible threshold** on it, imagine splitting the node into left and right.
3. Score each candidate split by how "pure" the two children would be.
4. Keep the best split.
5. Repeat steps 2 to 4 separately inside each child.
6. Stop when a node is pure, too small, the tree reaches its maximum depth, or no split improves things.
7. Each final node becomes a leaf that stores its prediction.

### How are thresholds chosen for a number feature?

Sort the values and try the midpoint between each pair of neighbours. For ages 22, 25, 31, 40, the candidate thresholds are 23.5, 28 and 35.5. (Libraries like XGBoost and LightGBM bucket values into bins to save time.)

:::remember
The algorithm is **greedy**: at each node it takes the best split right now, without looking ahead to whether a worse split now would allow better splits later. That makes it fast, but not guaranteed to find the best possible tree.
:::

## 3. Measuring purity: Gini, entropy and variance

### Gini impurity

$$
\text{Gini} = 1 - \sum_{k=1}^{K} p_k^2
$$

:::symbols
- $K$ = number of classes (2 for yes/no).
- $p_k$ = share of the node's rows that belong to class $k$ (a number between 0 and 1).
- $\sum_{k=1}^{K}$ = add up over all classes.
:::

Meaning: if you picked a random row from the node and labelled it randomly according to the node's class mix, Gini is the chance you'd get it wrong.

- All one class ($p = 1$): Gini $= 1 - 1 = 0$. Pure.
- 50/50: Gini $= 1 - (0.25 + 0.25) = 0.5$. As mixed as possible for two classes.
- 90/10: Gini $= 1 - (0.81 + 0.01) = 0.18$.

### Entropy

$$
\text{Entropy} = -\sum_{k=1}^{K} p_k \log_2 p_k
$$

:::symbols
- $\log_2$ = logarithm base 2. $\log_2 0.5 = -1$, $\log_2 1 = 0$.
- The minus sign makes the result positive (logs of numbers below 1 are negative).
:::

- Pure node: 0. 50/50: $-(0.5 \times -1 + 0.5 \times -1) = 1$.

Entropy measures "surprise" or uncertainty, from information theory. Gini and entropy choose almost the same splits; Gini is a little faster (no logarithm) and is scikit-learn's default.

### Information gain: scoring a split

$$
\text{Gain} = I(\text{parent}) - \frac{n_L}{n}\,I(L) - \frac{n_R}{n}\,I(R)
$$

:::symbols
- $I(\cdot)$ = impurity (Gini or entropy) of a node.
- $L$, $R$ = the left and right child.
- $n$ = rows in the parent; $n_L$, $n_R$ = rows going left and right.
- $\frac{n_L}{n}$ = share of rows going left. Children are weighted by size, so a tiny pure child doesn't count as much as a big one.
:::

::viz{name="tree-2d"}

:::worked
A node has 10 loan applicants: 5 defaulted, 5 didn't. Gini = 0.5.

**Split A: "missed payments > 2"**
- Left: 4 rows, all default → Gini 0.
- Right: 6 rows, 1 default and 5 good → Gini $= 1 - (1/6)^2 - (5/6)^2 = 1 - 0.028 - 0.694 = 0.278$.
- Weighted: $\frac{4}{10}\times0 + \frac{6}{10}\times0.278 = 0.167$. **Gain = 0.5 − 0.167 = 0.333.**

**Split B: "age < 30"**
- Left: 5 rows, 3 default → Gini $= 1 - 0.36 - 0.16 = 0.48$.
- Right: 5 rows, 2 default → Gini $= 0.48$.
- Weighted: 0.48. **Gain = 0.02.**

Split A wins easily: it creates a pure group.
:::

### Regression trees: variance reduction

For a number target, impurity is the **mean squared error** around the node's average:

$$
\text{MSE}(\text{node}) = \frac{1}{n}\sum_{i=1}^{n}(y_i - \bar y)^2
$$

:::symbols
- $y_i$ = the target value of row $i$ in the node.
- $\bar y$ ("y bar") = the average target in the node, which is also the node's prediction.
:::

The tree picks the split that reduces the weighted MSE the most. A good split puts similar values together, e.g. cheap flats on one side and expensive ones on the other.

## 4. How a tree predicts

1. Take the new row and start at the root.
2. Answer the question (e.g. is income < 40,000?) and follow the branch.
3. Repeat until you reach a leaf.
4. Classification: return the leaf's majority class, or its class shares as probabilities. Regression: return the leaf's average.

Prediction costs only as many comparisons as the tree's depth, so it's very fast.

:::trap
**Can a regression tree predict a value outside the training range?** No. A leaf predicts an average of training targets, so the tree can never predict above the largest or below the smallest value it saw. Trees cannot extrapolate trends.
:::

## 5. Overfitting and how to control it

Let a tree grow until every leaf is pure and it will usually memorise the training data, including its noise. Training accuracy becomes 100%, test accuracy drops. Try it in the visual above: raise max_depth and watch training accuracy climb while test accuracy peaks and falls.

Two ways to stop it:

**Pre-pruning** (stop early while growing):

| Parameter | What it does | Raise it to… |
|---|---|---|
| `max_depth` | Maximum number of questions from root to leaf | allow more complex trees |
| `min_samples_split` | A node needs at least this many rows to be split | make trees simpler |
| `min_samples_leaf` | Every leaf must keep at least this many rows | make trees simpler, smoother |
| `max_leaf_nodes` | Cap on number of leaves (best splits grown first) | allow more complex trees |
| `min_impurity_decrease` | Only split if impurity drops at least this much | make trees simpler |
| `max_features` | Number of features tried at each split | try more options per split |

**Post-pruning** (grow fully, then cut back): cost-complexity pruning, `ccp_alpha` in scikit-learn. It chooses the subtree that minimises

$$
R_\alpha(T) = R(T) + \alpha\,|T|
$$

:::symbols
- $T$ = a candidate (pruned) tree.
- $R(T)$ = its error on the training data.
- $|T|$ = its number of leaves.
- $\alpha$ ("alpha") = the price you pay per leaf. Bigger $\alpha$ → smaller trees. Choose it by cross-validation.
:::

## 6. Why one tree has high variance

Because splits are hierarchical, a small change in the data can change the root split, and then every split below it changes too. Two trees trained on slightly different samples can look completely different. That instability is called **high variance**, and it's exactly what ensembles fix:

- **Random Forest** averages many trees grown on different bootstrap samples (reduces variance).
- **Gradient boosting** adds many small trees, each correcting the previous ones (reduces bias).

## 7. Strengths, weaknesses and when to use

**Strengths**

- Easy to explain: you can print the rules and a business user can follow them.
- No feature scaling needed: only the order of values matters.
- Handles numbers and categories, non-linear patterns and interactions automatically.
- Robust to outliers in the features (an extreme income just goes to one side of a threshold).
- Very fast predictions.

**Weaknesses**

- High variance, overfits easily if not pruned.
- Boundaries are made of straight, axis-aligned steps; a diagonal boundary like "x > y" needs many steps.
- Can't extrapolate.
- Greedy, so not globally optimal.
- Usually less accurate alone than Random Forest or boosting.

| Good fit | Not a good fit |
|---|---|
| Rules a business must read and approve (eligibility, triage) | You need the best possible accuracy |
| Quick segment discovery ("which customers churn?") | Smooth, linear relationships or trend extrapolation |
| As the base model inside ensembles | Very high-dimensional sparse data (text) |

## 8. Other details interviewers ask

- **ID3 vs C4.5 vs CART**: ID3 uses entropy and categorical features with multi-way splits. C4.5 adds numeric features, missing values, pruning and **gain ratio** (gain divided by how many ways the split divides the data, which stops many-valued features like IDs looking great). CART, used by scikit-learn, makes binary splits only and uses Gini or MSE.
- **Missing values**: CART can use surrogate splits (a backup feature that mimics the main split). scikit-learn ≥ 1.3 can route missing values in trees; otherwise impute.
- **Feature importance**: total impurity decrease contributed by each feature, normalised. Biased toward features with many unique values.
- **Training cost**: roughly $O(p \cdot n \log n)$ per level, where $p$ = number of features and $n$ = number of rows, mainly from sorting values.

## 9. Code

```python
from sklearn.tree import DecisionTreeClassifier, export_text, plot_tree
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.metrics import accuracy_score

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

tree = DecisionTreeClassifier(max_depth=4, min_samples_leaf=20, random_state=42)
tree.fit(X_train, y_train)
print("Train:", accuracy_score(y_train, tree.predict(X_train)))
print("Test :", accuracy_score(y_test, tree.predict(X_test)))
print(export_text(tree, feature_names=list(X.columns)))   # readable rules

# choose the pruning strength by cross-validation
path = tree.cost_complexity_pruning_path(X_train, y_train)
grid = GridSearchCV(DecisionTreeClassifier(random_state=42),
                    {"ccp_alpha": path.ccp_alphas[::5]}, cv=5)
grid.fit(X_train, y_train)
print(grid.best_params_)
```

:::say
"A decision tree learns a hierarchy of yes/no splits. At each node it tries every feature and threshold and greedily keeps the one that most reduces impurity, Gini or entropy for classification and variance for regression. Leaves predict the majority class or the average. It's interpretable and needs no scaling, but a single tree overfits and has high variance, so I control depth and leaf size or prune with ccp_alpha, and in practice I use trees inside Random Forest or gradient boosting."
:::
