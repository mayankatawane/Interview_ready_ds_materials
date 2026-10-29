---
title: Ranking metrics — precision@k, recall@k, MAP, MRR, NDCG
short: Precision@k, recall@k, NDCG
subject: ml
group: Evaluation
order: 3
summary: When people only look at the top of a ranked list (top 10 results, top 200 doctors, top 5 RAG chunks), measure quality at the top.
minutes: 16
---

Ranking metrics come up in recommendation, search, targeting and RAG interviews. They all answer one question in different ways: **are the good items near the top of the list?**

## 1. When you need ranking metrics

Many models produce a **ranked list** and people only act on the top part:

- A search engine shows 10 results.
- A sales team can visit only the top 200 doctors this month.
- A fraud team can review 50 alerts a day.
- A RAG system passes only the top 5 chunks to the LLM.

Accuracy or AUC over the whole list doesn't capture "how good is the top?". Ranking metrics do.

:::analogy
A sales team can make 100 calls this week. **Precision@100**: how many of those 100 calls were worth making? **Recall@100**: what share of all the good leads in the city made it into those 100?
:::

## 2. Precision@k and recall@k

$$
\text{Precision@}k = \frac{\#\text{relevant items in the top }k}{k} \qquad \text{Recall@}k = \frac{\#\text{relevant items in the top }k}{\#\text{relevant items in total}}
$$

:::symbols
- $k$ = how many top results you look at.
- "Relevant" = an item that is actually good for this query or user (clicked, bought, correct chunk, doctor who prescribed).
- "Relevant in total" = all good items that exist, including ones the list missed.
:::

:::worked
Search "sweet pastry". Top 4 results: donut ✓, bagel ✗, muffin ✓, croissant ✗. There are 3 relevant items in total (donut, muffin, scone).

- Precision@4 = 2 / 4 = **0.50**
- Recall@4 = 2 / 3 = **0.67**
:::

As $k$ grows, recall can only rise; precision usually falls. They trade off like precision and recall at a threshold.

## 3. Hit rate and MRR: "how soon is the first good one?"

$$
\text{Hit@}k = \begin{cases}1 & \text{if at least one relevant item is in the top }k\\ 0 & \text{otherwise}\end{cases} \qquad \text{RR} = \frac{1}{\text{rank of the first relevant item}}
$$

**MRR** (mean reciprocal rank) = the average RR over many queries.

:::worked
Query A: first relevant result at rank 1 → RR = 1. Query B: at rank 3 → RR = 0.33. Query C: at rank 2 → RR = 0.5. MRR = (1 + 0.33 + 0.5) / 3 = **0.61**.
:::

Use when one correct answer is enough: question answering, navigation search, RAG with a single gold chunk.

## 4. MAP: rewarding every relevant item near the top

**Average precision at k** averages the precision at each position where a relevant item appears:

$$
\text{AP@}k = \frac{1}{\min(k, R)}\sum_{i=1}^{k}\text{P@}i \times \text{rel}_i
$$

:::symbols
- $\text{P@}i$ = precision at position $i$.
- $\text{rel}_i$ = 1 if the item at position $i$ is relevant, else 0 (so only relevant positions count).
- $R$ = total number of relevant items. (Some libraries divide by $R$; others by the number of relevant items retrieved. Say which you use.)
:::

**MAP@k** = the average of AP@k over all queries or users.

:::worked
Pastry example, $k = 4$, $R = 3$. Relevant at positions 1 and 3. P@1 = 1/1 = 1; P@3 = 2/3 = 0.667.

AP@4 = (1 + 0.667) / min(4, 3) = 1.667 / 3 = **0.556**.
:::

## 5. NDCG: graded relevance and position discount

Sometimes items are "very relevant", "somewhat relevant" or "not relevant", and a great item at rank 1 is worth more than at rank 8.

$$
\text{DCG@}k = \sum_{i=1}^{k}\frac{2^{\text{rel}_i} - 1}{\log_2(i + 1)} \qquad \text{NDCG@}k = \frac{\text{DCG@}k}{\text{IDCG@}k}
$$

:::symbols
- $\text{rel}_i$ = relevance grade of the item at position $i$ (e.g. 0, 1, 2).
- $2^{\text{rel}_i} - 1$ = the gain: grade 2 gives 3, grade 1 gives 1, grade 0 gives 0.
- $\log_2(i + 1)$ = the position discount: 1 at position 1, 1.58 at position 2, 2 at position 3…
- IDCG = the DCG of the **ideal** ordering (best items first). Dividing by it puts NDCG between 0 and 1.
:::

:::worked
Top 3 grades: [1, 2, 0].

DCG = 1/1 + 3/1.585 + 0 = 1 + 1.893 = 2.893. Ideal order [2, 1, 0]: IDCG = 3/1 + 1/1.585 = 3.631. NDCG@3 = 2.893 / 3.631 = **0.80**. The best item was at rank 2 instead of 1, so we lose 20%.
:::

::viz{name="rank-calc"}

## 6. Which ranking metric when

| Metric | Answers | Use when |
|---|---|---|
| Precision@k | How clean is the top k? | Fixed capacity: rep visits, alerts per day, top-5 recommendations |
| Recall@k | How much of the good stuff did we surface? | Candidate retrieval; RAG retrieval (is the right chunk in?) |
| Hit rate@k | Did we get at least one? | One right answer per query |
| MRR | How high is the first good result? | Q&A, navigation search |
| MAP | Precision across all relevant positions | Binary relevance, many relevant items |
| NDCG@k | Order quality with grades and position discount | Search and recommendations with relevance levels |

## 7. Traps

:::trap
**Two rankings have the same precision@5. Can one still be better?** Yes. Precision@k ignores order inside the top k. Relevant items at ranks 1–2 beat relevant items at ranks 4–5 for users. MAP, MRR and NDCG reward putting good items first.
:::

:::trap
**A user has only 2 relevant items. What's the best possible precision@10?** 2/10 = 0.2. Precision@k is capped when there are fewer than k relevant items, so averages across users can mislead. Use recall@k, R-precision (precision at $k = R$) or NDCG.
:::

- **Offline vs online**: offline metrics use historical data biased by what was shown before. Confirm gains with an A/B test on click-through, conversion or revenue.
- **Link to lift**: precision in the top decile ÷ overall positive rate = lift.

## 8. Code

```python
import numpy as np
from sklearn.metrics import ndcg_score

def precision_recall_at_k(y_true, scores, k):
    order = np.argsort(-np.asarray(scores))[:k]          # indices of the top-k scores
    hits = np.asarray(y_true)[order].sum()
    return hits / k, hits / max(np.sum(y_true), 1)

def reciprocal_rank(y_true, scores):
    order = np.argsort(-np.asarray(scores))
    ranks = np.where(np.asarray(y_true)[order] == 1)[0]
    return 1 / (ranks[0] + 1) if len(ranks) else 0.0

print(precision_recall_at_k([1, 0, 1, 0, 1], [0.9, 0.8, 0.7, 0.2, 0.1], k=3))   # (0.667, 0.667)
print(ndcg_score([[1, 2, 0]], [[0.9, 0.8, 0.1]], k=3))                          # graded relevance
```

:::say
"For ranking problems I measure the top of the list. Precision@k is the share of the top k that's relevant, which fits fixed capacity, like reps visiting the top 200 doctors. Recall@k is the share of all relevant items that make it into the top k, which I use for retrieval, for example whether the right chunk is in the top 5 for RAG. MRR measures how high the first correct result is, and NDCG handles graded relevance with a discount for lower positions. Offline gains get confirmed with an online test."
:::
