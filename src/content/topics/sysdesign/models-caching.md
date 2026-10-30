---
title: Choosing models, vector stores and caches
short: Models, vector DB & caching
subject: sysdesign
group: GenAI system design
order: 3
summary: Which LLM, embedding model and reranker to use and how to decide, model routing, picking a vector store, and the six caching layers of a GenAI app with their risks.
minutes: 15
---

"Which model would you use, and why?" and "Where would you cache?" are standard follow-ups. Interviewers don't want a brand name; they want a **decision process** and trade-offs.

## 1. Choosing the LLM

Decide with your **evaluation set**, under your constraints, not from leaderboards.

| Factor | Questions |
|---|---|
| Quality on your tasks | Pass rate on your golden set (SQL accuracy, faithfulness, format) |
| Latency | Time to first token and tokens/s at your prompt sizes |
| Cost | Price per million input/output tokens × your volume |
| Context window | Fits your prompt + retrieved chunks + history? |
| Data and compliance | Region, no-training guarantees, self-hosting needs |
| Features | Tool calling, structured output, streaming, vision, fine-tuning |
| Operations | Rate limits, availability SLA, version pinning |

### Model routing: don't use one model for everything

| Task | Typical choice |
|---|---|
| Classify / route the question, extract entities, rewrite queries | Small, fast, cheap model (or a fine-tuned small model) |
| Final answer with reasoning over retrieved context | Large, high-quality model |
| Text-to-SQL | Strong coding model, low temperature, schema + examples in prompt |
| Bulk offline jobs (summarising 100k notes) | Smaller model and batch APIs (cheaper) |
| Very sensitive data | Self-hosted open model (Llama, Mistral, Qwen) in your VPC |

:::worked
**Routing saves money.** 10,000 questions/day. All on the large model at $0.012/question = $120/day. Route 60% (simple lookups) to a small model at $0.001 and 40% to the large one: $6 + $48 = **$54/day**, a 55% saving, if quality holds on the eval set for the routed questions.
:::

## 2. Embedding model and reranker

- **Embedding model**: test retrieval recall@k on your own questions (MTEB is a starting point, not the answer). Consider domain (biomedical, legal, code), languages (Hindi/regional), max input length, vector size (storage and speed), API vs self-host. Changing it later means **re-embedding everything**: version the index.
- **Reranker**: a cross-encoder (Cohere Rerank, bge-reranker, ms-marco MiniLM) on the top 20–50 candidates usually gives the biggest quality jump per millisecond. Self-hosted rerankers run well on a small GPU or even CPU for small k.

## 3. Choosing a vector store

| If… | Consider |
|---|---|
| You already run Postgres and have < ~10M chunks | **pgvector**: one less system; SQL joins with metadata |
| You need strong hybrid (BM25 + vector) search and filters | **OpenSearch / Elasticsearch** |
| You're on Databricks | **Databricks Vector Search** synced from Delta tables |
| Large scale, managed, low ops | **Pinecone**, Qdrant Cloud, Weaviate Cloud, Milvus/Zilliz |
| Prototyping | Chroma, FAISS in memory |

Check: metadata filtering during search (not after), hybrid search, updates and deletes, multi-tenancy and access control, backups, latency at your size, cost.

## 4. The six caching layers

::viz{name="cache-layers"}

| Layer | Caches | Saves | Main risk |
|---|---|---|---|
| 1. **Exact answer cache** | Answer for an identical (normalised) question + context scope | Whole pipeline | Serving stale answers after documents change |
| 2. **Semantic cache** | Answer for a *very similar* past question (embedding similarity above a high threshold) | Whole pipeline | Similar wording, different meaning ("Brand A sales **this** month" vs "**last** month"): use a strict threshold and exclude time-sensitive/personal questions |
| 3. **Retrieval cache** | Retrieved chunk IDs for a query | Embedding + search + rerank | Stale after re-indexing |
| 4. **Embedding cache** | Vectors for repeated texts | Embedding calls | Low risk |
| 5. **Provider prompt caching** | Processing of a long, fixed prompt prefix (system prompt, tool definitions, shared documents) | Input cost and time to first token | Only helps if the prefix is identical; put static parts first |
| 6. **KV cache** (inside the model server) | Attention keys/values during generation; vLLM can reuse it across requests with the same prefix | GPU compute | Managed by vLLM; needs GPU memory |

:::trap
**Caching with permissions.** If a manager's answer (with region-wide data) is cached and served to a rep with only territory access, you've leaked data. Always include the user's **permission scope** (role, territory, tenant) in the cache key, and invalidate by document/data version.
:::

### Cache design details

- **Store**: Redis (with vector search for the semantic cache), or GPTCache-style libraries.
- **TTL** by content type: product documents (days, invalidated on update), sales numbers (until the next data load), personal questions (don't cache).
- **Invalidation**: include a data/index version in the key; bump it when ingestion or the nightly data load finishes.
- **Measure** hit rate and correctness of cached answers (sample and review).

:::say
"I pick models per task using our golden set plus latency, cost and compliance: a small fast model for routing, extraction and query rewriting, a strong model for final answers, and self-hosted open models where data can't leave our network. I choose embeddings by recall at k on our own questions and add a cross-encoder reranker. For the vector store I prefer what fits the stack, pgvector or OpenSearch for hybrid search, Databricks Vector Search on Databricks. Caching happens in layers: exact and semantic answer caches, retrieval and embedding caches, provider prompt caching for static prefixes, and the KV cache inside vLLM, always keyed by the user's permission scope and invalidated by data version."
:::
