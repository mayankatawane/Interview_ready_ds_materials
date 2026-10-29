---
title: Retrieval, hybrid search and reranking
short: Hybrid search & reranking
subject: genai
group: RAG
order: 4
summary: Sparse (BM25) versus dense retrieval, combining them with Reciprocal Rank Fusion, two-stage retrieve-then-rerank, query rewriting, and how to pick k.
minutes: 16
---

Top questions: "dense vs sparse retrieval?", "when does BM25 beat embeddings?", "how do you combine them?", "why rerank?" and "how do you choose k?".

## 1. Sparse retrieval: BM25

**Sparse** = each document is represented by the words it contains (a vector as long as the vocabulary, mostly zeros). **BM25** scores a document for a query by adding up, for each query word:

$$
\text{BM25}(q, d) = \sum_{w \in q} \text{IDF}(w)\cdot\frac{f(w, d)\,(k_1 + 1)}{f(w, d) + k_1\big(1 - b + b\,\frac{|d|}{\text{avgdl}}\big)}
$$

:::symbols
- $w$ = a word in the query $q$; $d$ = a document.
- $f(w, d)$ = how many times $w$ appears in $d$.
- IDF($w$) = inverse document frequency: big for rare words (e.g. "pembrolizumab"), small for common ones ("the").
- $|d|$ = the document's length; avgdl = average document length.
- $k_1$ (≈1.2–2) limits how much repeated words help (**saturation**); $b$ (≈0.75) adjusts for long documents.
:::

In words: documents score high when they contain the query's **rare** words, a few times, without being very long.

## 2. Dense vs sparse

| | Sparse (BM25) | Dense (embeddings) |
|---|---|---|
| Matches | Exact words | Meaning |
| "heart attack" vs "myocardial infarction" | Misses | Finds |
| IDs, codes, drug names, error numbers ("ERR-4012", "NCT04567") | **Strong** | Often weak |
| New jargon not seen in training | OK | Weak |
| Needs training / GPU | No | Embedding model |
| Explainable | Yes (matching words) | Less so |

:::trap
**"Dense retrieval is always better than BM25."** No. For exact identifiers, rare names, short keyword queries and domains the embedding model never saw, BM25 often wins. That's why production systems use **hybrid** search.
:::

## 3. Hybrid search with Reciprocal Rank Fusion (RRF)

BM25 scores and cosine similarities are on different scales, so we combine **ranks** instead:

$$
\text{RRF}(d) = \sum_{r \in \text{rankers}} \frac{1}{k + \text{rank}_r(d)}
$$

:::symbols
- rank$_r(d)$ = position of document $d$ in ranker $r$'s list (1 = top).
- $k$ = a constant, usually 60, that stops the very top positions dominating.
- If a ranker didn't return $d$, it adds nothing.
:::

:::worked
BM25 ranks doc A 1st and doc B 3rd. Dense ranks B 1st and A 5th. With $k = 60$:

- A: $1/61 + 1/65 = 0.01639 + 0.01538 = $ **0.03178**
- B: $1/63 + 1/61 = 0.01587 + 0.01639 = $ **0.03227**

B edges ahead: it's near the top of **both** lists.
:::

::viz{name="rrf-calc"}

Alternative: a **weighted sum** of normalised scores ($\alpha \cdot \text{dense} + (1-\alpha)\cdot \text{sparse}$), with $\alpha$ tuned on the evaluation set. Learned sparse models (**SPLADE**) are another option: sparse vectors that also expand to related words.

## 4. Two-stage retrieval: retrieve then rerank

1. **Retrieve** 20–100 candidates quickly (hybrid). Goal: **high recall**, so the right chunk is somewhere in the list.
2. **Rerank** them with a **cross-encoder** (e.g. Cohere Rerank, bge-reranker, ms-marco MiniLM) that reads query and chunk together. Goal: **high precision** at the top.
3. Send the top 3–8 to the LLM.

:::why
Bi-encoders compress each text into one vector before seeing the query, so fine details are lost. A cross-encoder lets every query word attend to every chunk word, which is much more accurate but too slow to run on millions of chunks. Two stages give both speed and accuracy.
:::

Other rerankers: an LLM asked to score or order chunks (accurate but costly), or **ColBERT**-style late interaction (stores one vector per token, compares token-by-token; between bi- and cross-encoders in speed and accuracy).

## 5. Choosing k

- **Retrieval k** (candidates for the reranker): large enough for high recall@k on your golden set; check where the recall curve flattens (often 20–50).
- **Final k** (chunks in the prompt): small enough to keep precision, cost and latency down and avoid distracting the LLM; typically 3–8.
- Optionally drop chunks below a reranker score threshold, so easy questions use fewer chunks.

:::worked
On a golden set: recall@5 = 0.62, recall@20 = 0.85, recall@50 = 0.88. Retrieve 20–30 (most of the gain, little extra cost), rerank, keep the top 5. Then check that recall@5 **after** reranking is close to 0.85.
:::

## 6. Query-side improvements

- **Rewrite with chat history** so follow-ups are standalone.
- **Multi-query**: generate 3–5 paraphrases, retrieve for each, fuse with RRF.
- **HyDE**: embed a hypothetical answer instead of the question.
- **Decomposition**: split a multi-part question into sub-questions.
- **Metadata filters** extracted from the question (date, product, region).
- **Routing**: send the question to the right index or tool (documents vs SQL vs knowledge graph).

```python
from rank_bm25 import BM25Okapi
from sentence_transformers import CrossEncoder

def rrf(ranked_lists, k=60):
    scores = {}
    for ranked in ranked_lists:
        for rank, doc_id in enumerate(ranked, start=1):
            scores[doc_id] = scores.get(doc_id, 0) + 1 / (k + rank)
    return sorted(scores, key=scores.get, reverse=True)

bm25 = BM25Okapi([c.lower().split() for c in chunks])
sparse_ids = bm25.get_scores(query.lower().split()).argsort()[::-1][:30].tolist()
dense_ids = dense_search(query, k=30)                    # your vector search
candidates = rrf([sparse_ids, dense_ids])[:30]

reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
scores = reranker.predict([(query, chunks[i]) for i in candidates])
top = [candidates[i] for i in scores.argsort()[::-1][:5]]
```

:::say
"I use hybrid retrieval: BM25 catches exact terms like drug names, trial IDs and codes, dense embeddings catch paraphrases, and I fuse them with reciprocal rank fusion because their scores aren't comparable. That first stage is tuned for recall, pulling 20 to 50 candidates, then a cross-encoder reranker reads query and chunk together and I keep the top five or so for the prompt. I choose both k values from the recall-at-k curve on a golden set, and add query rewriting with chat history and metadata filters for conversational and scoped questions."
:::
