---
title: Loss functions
short: Loss functions
subject: dl
group: Training
order: 3
summary: The single number a network minimises. Regression losses, cross-entropy for classification, focal loss, contrastive losses for embeddings, KL divergence and perplexity.
minutes: 14
---

The loss turns "how wrong is the model?" into one number. It must fit the task and the output layer, and it decides what a prediction means (a mean, a median, a probability). Expect questions on cross-entropy, why not MSE for classification, focal loss, and contrastive loss for embeddings.

## 1. Regression losses

$$
\text{MSE} = \frac{1}{n}\sum_{i}(y_i - \hat y_i)^2 \qquad \text{MAE} = \frac{1}{n}\sum_i|y_i - \hat y_i|
$$

$$
\text{Huber}_\delta(r) = \begin{cases}\frac{1}{2}r^2 & \text{if } |r| \le \delta\\ \delta\big(|r| - \frac{1}{2}\delta\big) & \text{if } |r| > \delta\end{cases}
$$

:::symbols
- $y_i$ = true value; $\hat y_i$ = prediction; $n$ = number of rows.
- $r = y - \hat y$ = the residual (error).
- $\delta$ ("delta") = where Huber switches from squared to linear.
:::

| Loss | Predicts | Outliers | Note |
|---|---|---|---|
| MSE | The mean | Very sensitive | Smooth, the default |
| MAE | The median | Robust | Gradient doesn't shrink near the answer, so it can jitter |
| Huber | In between | Robust | Squared for small errors, linear for big ones |
| Quantile (pinball) | A chosen percentile | Robust | For prediction intervals (P10, P90) |

## 2. Classification losses

### Binary cross-entropy (BCE)

$$
\text{BCE} = -\frac{1}{n}\sum_i\Big[y_i\log p_i + (1 - y_i)\log(1 - p_i)\Big]
$$

### Categorical cross-entropy (CE)

$$
\text{CE} = -\frac{1}{n}\sum_i\sum_{k=1}^{K}y_{ik}\log p_{ik}
$$

:::symbols
- $p_i$ = predicted probability that row $i$ is positive (after sigmoid).
- $K$ = number of classes; $p_{ik}$ = predicted probability of class $k$ for row $i$ (after softmax).
- $y_{ik}$ = 1 if class $k$ is the true class of row $i$, else 0. So only the true class's probability counts.
:::

:::worked
Logits $[2.0, 1.0, 0.1]$ → softmax $[0.659, 0.242, 0.099]$. True class is 0.

Loss $= -\ln 0.659 = $ **0.417**. If the true class were 2: $-\ln 0.099 = 2.31$.

Useful fact: the gradient with respect to the logits is simply $p - y = [0.659 - 1,\ 0.242,\ 0.099] = [-0.341,\ 0.242,\ 0.099]$. Push the true class up, the others down.
:::

:::trap
**Why not MSE for classification with a sigmoid?** With a sigmoid output, MSE is non-convex in the weights, and its gradient contains $p(1-p)$, which is nearly 0 exactly when the model is confidently wrong, so it barely learns from its worst mistakes. Cross-entropy is the maximum-likelihood loss, convex for logistic regression, and its gradient is the clean $p - y$.
:::

### Other classification losses

| Loss | Formula / idea | Use when |
|---|---|---|
| Weighted cross-entropy | Multiply each class's loss by a weight | Class imbalance |
| Focal loss | $-\alpha_t(1 - p_t)^\gamma\log p_t$: shrinks the loss of easy, confident examples | Extreme imbalance with many easy negatives (object detection, fraud) |
| Label-smoothed CE | Targets 0.9 / 0.1 instead of 1 / 0 | Prevent over-confidence, better calibration |
| Hinge | $\max(0, 1 - y f(x))$ | Max-margin classifiers (SVM) |

In focal loss, $p_t$ = the predicted probability of the true class, $\gamma$ (usually 2) = how strongly to down-weight easy examples, $\alpha_t$ = class weight.

## 3. Losses for embeddings and distributions

| Loss | Idea | Where you see it |
|---|---|---|
| Contrastive / InfoNCE | Pull matching pairs together, push non-matching ones apart | Training embedding models (sentence-transformers, CLIP) for search and RAG |
| Triplet | Anchor closer to a positive than to a negative by a margin $m$: $\max(0, d(a,p) - d(a,n) + m)$ | Face recognition, metric learning |
| KL divergence | Distance between two probability distributions: $\sum_k P_k\log\frac{P_k}{Q_k}$ | VAEs, knowledge distillation, the RLHF penalty |
| Next-token cross-entropy | Cross-entropy over the vocabulary at every position | LLM pretraining |

### InfoNCE in plain words

$$
\mathcal{L} = -\log\frac{e^{\,s(q, k^+)/\tau}}{\sum_{j}e^{\,s(q, k_j)/\tau}}
$$

:::symbols
- $q$ = a query (e.g. a question); $k^+$ = its matching item (the passage that answers it).
- $k_j$ = all candidates, the match plus many non-matches (often the other items in the batch).
- $s(\cdot,\cdot)$ = similarity (usually cosine); $\tau$ ("tau") = temperature.
:::

It's just a softmax classification: "pick the right partner out of the batch". Training this way makes questions and their answers end up close in embedding space, which is what makes semantic search work.

### Perplexity

$$
\text{Perplexity} = e^{\text{average next-token cross-entropy}}
$$

A perplexity of 10 means the model is, on average, as unsure as if it were choosing uniformly between 10 tokens. Lower is better; only comparable between models that use the same tokenizer.

## 4. Matching output layer and loss (PyTorch)

| Task | Output | PyTorch loss |
|---|---|---|
| Regression | Linear | `nn.MSELoss`, `nn.L1Loss`, `nn.HuberLoss` |
| Binary | 1 logit | `nn.BCEWithLogitsLoss` (applies sigmoid inside) |
| Multiclass | K logits | `nn.CrossEntropyLoss` (applies log-softmax inside) |
| Multi-label | K logits | `nn.BCEWithLogitsLoss` |

:::say
"I pick the loss from the task and what I want the prediction to mean: MSE for a mean, MAE or Huber when outliers matter, quantile loss for intervals. For classification, cross-entropy, with raw logits passed straight in for numerical stability, plus class weights or focal loss for heavy imbalance. Embedding models are trained with contrastive InfoNCE loss, and LLMs with next-token cross-entropy, reported as perplexity."
:::
