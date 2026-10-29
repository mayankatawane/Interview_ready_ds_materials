---
title: Explainability — SHAP and friends
short: Explainability (SHAP)
subject: ml
group: Evaluation
order: 6
summary: Explain which features pushed a prediction up or down, for one customer or for the whole model. SHAP, permutation importance, partial dependence, LIME and monotonic constraints.
minutes: 15
---

In regulated or business-facing work (pharma, banking), "how do you explain the model?" is guaranteed. Know SHAP well, know the traps of feature importance, and have a story for regulators.

## 1. Two kinds of explanation

| | Global | Local |
|---|---|---|
| Question | Which features matter most overall? How does each one affect predictions? | Why did **this** customer get a score of 0.31? |
| Tools | Permutation importance, SHAP summary (beeswarm), partial dependence | SHAP waterfall, LIME, reason codes |
| Audience | Data scientists, model reviewers | Business users, customers, regulators |

## 2. SHAP: fair credit for each feature

SHAP (SHapley Additive exPlanations) comes from game theory. Think of the features as players in a team and the prediction as the team's payout. Each feature's **SHAP value** is its fair share of "prediction minus average prediction".

:::analogy
Friends ordered together and want to split the bill fairly. You consider every possible order in which they could have joined the table, see how much each person's arrival added to the bill each time, and average. That average is each person's Shapley value.
:::

$$
\phi_j = \sum_{S \subseteq F\setminus\{j\}}\frac{|S|!\,(|F| - |S| - 1)!}{|F|!}\Big[f(S\cup\{j\}) - f(S)\Big]
$$

:::symbols
- $\phi_j$ ("phi j") = the SHAP value of feature $j$ for this prediction.
- $F$ = the set of all features; $S$ = a subset that doesn't contain $j$.
- $f(S)$ = the model's prediction using only the features in $S$ (the others are "averaged out").
- $f(S \cup \{j\}) - f(S)$ = how much adding feature $j$ changes the prediction: its **marginal contribution**.
- The fraction with factorials = the share of all possible orderings in which exactly the features in $S$ come before $j$. It makes this a fair average over every ordering.
:::

The key property, **additivity**:

$$
f(x) = \phi_0 + \sum_{j=1}^{p}\phi_j
$$

The prediction equals the baseline $\phi_0$ (the average prediction) plus all the SHAP values. Nothing is left unexplained.

::viz{name="shap-wf"}

### How it's computed in practice

- **TreeSHAP**: exact and fast for tree models (XGBoost, LightGBM, Random Forest).
- **KernelSHAP**: works for any model but is slow (approximates by sampling subsets).
- **DeepSHAP / GradientSHAP**: for neural networks.

### SHAP plots to know

| Plot | Shows |
|---|---|
| Waterfall (one row) | How each feature moved this prediction from the baseline |
| Beeswarm / summary | For each feature, all rows' SHAP values coloured by feature value: importance and direction together |
| Bar | Mean of absolute SHAP values per feature: global importance |
| Dependence | SHAP value vs feature value: shape of the effect and interactions |

## 3. Permutation importance

1. Score the model on validation data.
2. Shuffle one feature's column, which breaks its link with the target.
3. Score again. The drop is that feature's importance.
4. Repeat for every feature (several shuffles each, to average out noise).

Works for any model and is measured on held-out data. **Trap**: with correlated features, shuffling one leaves its twin carrying the same information, so both look unimportant.

## 4. Built-in importance and its traps

- **Linear models**: coefficients, comparable only after scaling features.
- **Trees (impurity / MDI)**: total impurity reduction per feature. Free, but **biased toward high-cardinality and continuous features** and computed on training data.
- **XGBoost** "weight", "gain", "cover": can rank features differently. Prefer gain or SHAP.

## 5. Partial dependence (PDP), ICE and ALE

- **PDP**: set one feature to each value in turn for every row and average the predictions. Shows the overall shape of its effect (linear, threshold, U-shape).
- **ICE**: the same, but one line per row, which reveals interactions (lines with different shapes).
- **Trap**: with correlated features, PDP evaluates impossible combinations (e.g. a 22-year-old with 30 years of work experience). **ALE** (accumulated local effects) avoids this.

## 6. LIME

LIME (Local Interpretable Model-agnostic Explanations) explains one prediction by creating small perturbations of that row, getting the model's predictions on them, and fitting a simple weighted linear model locally. Model-agnostic and intuitive, but results can change between runs and depend on how perturbations are generated. SHAP is usually preferred for consistency.

## 7. For regulators and business users

- Use an inherently interpretable model when possible (WOE logistic scorecard).
- For boosting, add **monotonic constraints** (e.g. "more missed payments can never lower risk"); supported in XGBoost and LightGBM.
- Give **reason codes**: the top 3 to 4 features with the largest positive SHAP values for each decision.
- Document features, stability (PSI) and fairness checks across groups; keep a simpler challenger model for comparison.

## 8. Code

```python
import shap

explainer = shap.TreeExplainer(model)            # XGBoost / LightGBM / RandomForest
sv = explainer(X_test)

shap.plots.beeswarm(sv)                          # global: importance + direction
shap.plots.bar(sv)                               # global importance
shap.plots.waterfall(sv[0])                      # one prediction explained

from sklearn.inspection import permutation_importance, PartialDependenceDisplay
pi = permutation_importance(model, X_val, y_val, n_repeats=10, scoring="roc_auc", random_state=42)
PartialDependenceDisplay.from_estimator(model, X_val, ["utilisation", "income"])
```

:::say
"For tree models I use TreeSHAP. Each feature's SHAP value is its average marginal contribution across all possible orderings of features, and the values add up exactly to the prediction minus the baseline. So I can show a waterfall for one customer and a beeswarm plot for global drivers. I cross-check with permutation importance on validation data, keeping in mind that correlated features share or hide importance. For regulated use I add monotonic constraints and generate reason codes from the top SHAP contributors."
:::
