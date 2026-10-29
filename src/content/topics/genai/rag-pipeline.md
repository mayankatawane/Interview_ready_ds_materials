---
title: RAG end to end
short: RAG pipeline
subject: genai
group: RAG
order: 1
summary: Retrieval-Augmented Generation from first principles. Why it exists, the offline indexing and online query pipelines step by step, failure modes, and advanced patterns like hybrid search, query rewriting and agentic RAG.
minutes: 22
---

RAG is the most-asked GenAI topic for data scientists. You should be able to draw the whole pipeline from memory, say what can go wrong at each step, and know how you'd fix and measure it. The following pages zoom into chunking, embeddings, retrieval and evaluation.

## 1. What problem does RAG solve?

An LLM on its own:

- Only knows what was in its training data, which has a **cutoff date**.
- Has never seen your **private** documents (SOPs, trial protocols, policies).
- May **hallucinate**: fluent but invented answers.
- Can't **cite** where an answer came from.

**Retrieval-Augmented Generation** = before answering, **retrieve** the most relevant passages from your own knowledge base and put them in the prompt, so the model answers **grounded** in that evidence.

:::analogy
An open-book exam. The student (LLM) is smart but doesn't know your company's rulebook. RAG hands them the right few pages before they answer, and asks them to quote the page.
:::

## 2. The two pipelines

::viz{name="rag-flow"}

### Offline: indexing (run when documents change)

1. **Load** documents: PDFs, HTML, wiki pages, database rows, tickets.
2. **Parse and clean**: extract text, keep tables and headings, remove headers/footers and boilerplate.
3. **Chunk**: split into passages of a few hundred tokens with some overlap (see Chunking).
4. **Add metadata**: source, title, section, date, version, owner, access rights.
5. **Embed** each chunk with an embedding model → one vector per chunk.
6. **Index**: store vectors (and text and metadata) in a vector database; usually also build a keyword (BM25) index for hybrid search.

### Online: answering a question

1. **Query understanding**: clean up, rewrite or expand the question; use chat history to make follow-ups self-contained ("what about its side effects?" → "what are the side effects of drug X?").
2. **Retrieve**: embed the query and find the top-k most similar chunks (k = 20–50), apply metadata filters (product, date, user permissions), often combined with keyword search.
3. **Rerank**: a more accurate cross-encoder model reorders the candidates; keep the top 3–8.
4. **Build the context**: order chunks, remove near-duplicates, fit the token budget, label each with its source ID.
5. **Generate**: prompt the LLM to answer **only** from the context, cite source IDs, and say "I don't know" if the context doesn't contain the answer.
6. **Post-process and check**: validate citations, run guardrails, log everything for evaluation.

:::worked
**A sample grounded prompt**

```
You are a medical-information assistant. Answer using ONLY the context below.
Cite sources as [S1], [S2]. If the context does not contain the answer, say
"I couldn't find this in the provided documents."

<context>
[S1] (Label v3.2, Section 2.3) Recommended dose: 200 mg every 3 weeks...
[S2] (FAQ 2024-05) No dose adjustment is needed for mild renal impairment...
</context>

Question: Is a dose change needed for a patient with mild renal impairment?
```
:::

## 3. Where RAG fails, and the fix

Always diagnose **retrieval first**: if the right chunk isn't in the context, the LLM can't use it.

| Symptom | Likely cause | Fix |
|---|---|---|
| Right document exists but is never retrieved | Poor chunking; query wording differs from document wording; weak embedding model; exact codes/IDs missed by dense search | Better chunking; **hybrid search** (add BM25); query rewriting; domain-tuned embeddings |
| Retrieved but ranked too low to be used | Bi-encoder similarity is coarse | **Reranker**; larger candidate pool |
| Chunk retrieved but missing the key sentence | Answer split across chunks | Overlap; parent-document retrieval; structure-aware chunking |
| Correct context but wrong answer | LLM ignores or misreads context; "lost in the middle" | Better prompt; fewer, better-ordered chunks; stronger model |
| Answer adds facts not in the context | Hallucination / not grounded | Strict grounding instructions; citation check; faithfulness evaluation |
| Outdated or conflicting answers | Old versions indexed; no date metadata | Versioning, date filters, prefer latest; surface conflicts |
| Leaks documents a user shouldn't see | No access control at retrieval | Filter by permissions **before** retrieval |
| Slow | Too many chunks; big reranker; long prompt | Smaller k; cache; smaller reranker; stream |

## 4. Advanced patterns

| Pattern | What it does | When |
|---|---|---|
| **Hybrid search** | Combine dense (meaning) and sparse/BM25 (exact words) results, e.g. with Reciprocal Rank Fusion | Almost always in production; essential for IDs, drug names, error codes |
| **Query rewriting / multi-query** | LLM rewrites the question or generates several variants; retrieve for each, merge | Vague or conversational questions |
| **HyDE** | LLM writes a hypothetical answer; embed that to search (answers look like documents) | Short queries vs long documents |
| **Parent-document / small-to-big** | Search over small chunks for precision; return the larger parent section for context | Long structured documents |
| **Metadata filtering / self-query** | Extract filters from the question ("2024", "oncology") | Large, heterogeneous corpora |
| **GraphRAG / knowledge graph** | Retrieve entities and relations, not just text | Multi-hop questions across documents |
| **Agentic RAG** | An agent decides whether, where and how many times to retrieve, uses tools, checks its own answer | Complex multi-step questions |
| **Corrective / self-RAG** | Grade retrieved chunks; if poor, rewrite query or fall back to another source | When retrieval quality varies |

:::trap
**"Long-context models make RAG obsolete."** Not really. Stuffing a million tokens per question is slow and expensive, models still miss facts in the middle of long prompts, you lose citations and access control, and your corpus may be far bigger than any context window. Long context helps RAG (more and bigger chunks); it doesn't replace it.
:::

:::trap
**"Agentic RAG is always better."** No. It adds latency, cost and unpredictability. For simple lookup questions a fixed pipeline is faster and easier to test. Use agents when questions genuinely need multiple steps or tools.
:::

## 5. Production concerns

- **Freshness**: incremental indexing when documents change; delete stale chunks; store versions and dates.
- **Security**: document-level permissions applied as retrieval filters; PII redaction; prompt-injection hygiene for retrieved text.
- **Latency budget**: retrieval ~50–200 ms, rerank ~100–300 ms, generation the rest; stream the answer.
- **Cost**: smaller k after reranking, prompt caching, a cheaper model for query rewriting.
- **Observability**: log query, retrieved IDs and scores, final context, answer, citations, latency and user feedback for every request.
- **Evaluation**: a golden set measured separately for retrieval and generation (see RAG evaluation).

```python
# Minimal RAG (illustrative, LangChain-style)
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter

chunks = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100).split_documents(docs)
store = FAISS.from_documents(chunks, OpenAIEmbeddings(model="text-embedding-3-small"))

question = "Is a dose change needed for mild renal impairment?"
hits = store.similarity_search(question, k=5)
context = "\n\n".join(f"[S{i+1}] {d.page_content}" for i, d in enumerate(hits))
prompt = f"Answer only from the context and cite [S#]. If not found, say so.\n\n{context}\n\nQ: {question}"
print(ChatOpenAI(model="gpt-4o-mini", temperature=0).invoke(prompt).content)
```

:::say
"RAG grounds an LLM in our own documents. Offline, we parse, chunk with overlap, attach metadata, embed and index chunks, usually in both a vector index and BM25. Online, we rewrite the query using chat history, run hybrid retrieval with permission filters, rerank with a cross-encoder, assemble a cited context within the token budget, and prompt the model to answer only from it or say it doesn't know. When it fails I check retrieval first, recall at k on a golden set, then faithfulness of the answer. In the MSD oncology copilot I combined this with a knowledge graph and SQL tools through LangGraph, so the agent picked the right source per question."
:::
