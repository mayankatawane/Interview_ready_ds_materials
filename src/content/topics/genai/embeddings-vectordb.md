---
title: Embeddings and vector databases
short: Embeddings & vector DBs
subject: genai
group: RAG
order: 3
summary: How text becomes vectors for search, similarity measures, how embedding models are trained, approximate nearest-neighbour indexes like HNSW and IVF, and choosing a vector store.
minutes: 16
---

Interviewers ask: "how are embedding models trained?", "cosine vs dot product?", "how does HNSW work?", "how would you choose an embedding model?" and "what's a bi-encoder vs cross-encoder?".

## 1. Text embeddings for search

An **embedding model** turns a passage into a fixed-length vector (e.g. 384, 768, 1,536 or 3,072 numbers) so that texts with similar meaning have vectors that point in similar directions. A question and the passage that answers it should end up close, even with different words:

- "Can I claim a hotel stay?" ↔ "Accommodation expenses are reimbursable up to ₹8,000 per night."

## 2. Similarity measures

| Measure | Formula | Notes |
|---|---|---|
| Cosine similarity | $\dfrac{a \cdot b}{\|a\|\,\|b\|}$ | Direction only; −1 to 1 |
| Dot product | $a \cdot b = \sum_j a_jb_j$ | Direction and length; fastest |
| Euclidean (L2) distance | $\sqrt{\sum_j (a_j - b_j)^2}$ | Smaller = more similar |

:::symbols
- $a$, $b$ = two vectors; $a_j$ = the $j$-th number in $a$.
- $\|a\|$ = the length of $a$: $\sqrt{\sum_j a_j^2}$.
:::

:::remember
If vectors are **normalised** to length 1, cosine similarity = dot product, and ranking by L2 distance gives the same order ($\|a-b\|^2 = 2 - 2\cos$). So normalise and use the measure the embedding model was trained with.
:::

:::worked
Query $q = [0.6, 0.8]$ (length 1). Chunk A $= [0.8, 0.6]$, chunk B $= [0, 1]$, both length 1.

- $q \cdot A = 0.48 + 0.48 = $ **0.96**
- $q \cdot B = 0 + 0.8 = $ **0.80**

A ranks first.
:::

## 3. How embedding models are trained

Start from a pretrained Transformer encoder, pool its token vectors into one (mean pooling or a special token), then fine-tune with **contrastive learning** on pairs like (question, correct passage):

- Pull each question's vector towards its correct passage.
- Push it away from the other passages in the batch (**in-batch negatives**) and from **hard negatives** (passages that look relevant but aren't).

$$
\mathcal{L} = -\log \frac{e^{\text{sim}(q, p^+)/\tau}}{\sum_{j} e^{\text{sim}(q, p_j)/\tau}}
$$

:::symbols
- $q$ = the query vector; $p^+$ = its correct passage; $p_j$ = all passages in the batch (the correct one plus negatives).
- sim = cosine similarity; $\tau$ = temperature, a small number such as 0.05 that sharpens the contrast.
- It's a softmax classification: "pick the right passage out of the batch".
:::

## 4. Bi-encoder vs cross-encoder

| | Bi-encoder (embedding model) | Cross-encoder (reranker) |
|---|---|---|
| Input | Query and passage encoded **separately** | Query and passage read **together** in one pass |
| Output | Two vectors, compared by cosine | One relevance score |
| Speed | Passage vectors precomputed; search millions in milliseconds | Must run once per (query, passage) pair: slow |
| Accuracy | Good | Better (sees word-level interactions) |
| Role | First-stage retrieval | Reranking the top 20–100 |

## 5. Choosing an embedding model

- Check the **MTEB** leaderboard (retrieval tasks), then **test on your own data**: leaderboard rank doesn't guarantee your domain.
- Domain fit (biomedical, legal, code), languages, max input length, vector size (storage and speed), cost and whether it can be self-hosted (data privacy).
- Some models need prefixes (e.g. `"query: "` and `"passage: "` for E5). Use them consistently.

:::trap
**Can you change the embedding model without re-indexing?** No. Vectors from different models live in different spaces and aren't comparable. Changing the model means re-embedding every chunk; store the model name and version with the index.
:::

## 6. Vector indexes: finding nearest neighbours fast

Exact search compares the query with every vector: $O(N \cdot d)$. Fine for tens of thousands of vectors, too slow for hundreds of millions. **Approximate nearest neighbour (ANN)** indexes trade a little recall for big speed-ups.

| Index | Idea | Trade-offs |
|---|---|---|
| **Flat** | Brute force | Exact; slow at scale |
| **IVF** (inverted file) | Cluster vectors with k-means; search only the `nprobe` closest clusters | Fast; recall depends on `nprobe`; needs training |
| **HNSW** | Multi-layer "small-world" graph: start in a sparse top layer, greedily hop to closer neighbours, drop down layers | Very fast and high recall; uses more memory; most popular |
| **PQ** (product quantisation) | Compress vectors into short codes | Huge memory savings; some accuracy loss; often combined (IVF-PQ) |

::viz{name="vec-search"}

:::analogy
**HNSW** is like finding a house: take a flight to the right city (top layer, few long links), then a bus to the neighbourhood, then walk the street (bottom layer, all points, short links).
:::

Key knobs: HNSW `M` (links per node) and `ef_search` (how many candidates to explore; higher = better recall, slower); IVF `nlist` (clusters) and `nprobe` (clusters searched).

## 7. Vector databases

| Option | Type | Good for |
|---|---|---|
| FAISS | Library | Fast local/in-memory search, research |
| Chroma | Lightweight DB | Prototypes |
| pgvector | Postgres extension | You already use Postgres; joins with relational data |
| Elasticsearch / OpenSearch | Search engine with vectors | Hybrid BM25 + vector in one place |
| Pinecone, Weaviate, Qdrant, Milvus | Dedicated vector DBs | Scale, metadata filtering, managed service |

What to compare: metadata filtering (and whether it's applied before or after the vector search), hybrid search support, scale, latency, updates and deletes, multi-tenancy and access control, cost, and managed vs self-hosted.

```python
from sentence_transformers import SentenceTransformer
import faiss, numpy as np

model = SentenceTransformer("BAAI/bge-small-en-v1.5")
vecs = model.encode(chunks, normalize_embeddings=True).astype("float32")
index = faiss.IndexHNSWFlat(vecs.shape[1], 32, faiss.METRIC_INNER_PRODUCT)  # M = 32
index.add(vecs)

q = model.encode(["dose change for renal impairment"], normalize_embeddings=True).astype("float32")
scores, ids = index.search(q, 5)                       # top-5 most similar chunks
```

:::say
"Embedding models are Transformer encoders fine-tuned with contrastive loss so questions land near their answering passages; I normalise vectors so cosine equals dot product. They're bi-encoders, fast because passages are pre-embedded, and I add a cross-encoder reranker for precision. I pick the model by testing recall at k on our own golden set, not just MTEB. For scale I use an approximate index, typically HNSW, tuning ef_search for the recall–latency trade-off, and the store choice depends on metadata filtering, hybrid search and what we already run, for example pgvector or OpenSearch."
:::
