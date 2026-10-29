---
title: Chunking strategies
short: Chunking
subject: genai
group: RAG
order: 2
summary: How to split documents into retrievable pieces. Fixed, recursive, structure-aware and semantic chunking, choosing size and overlap, and parent-document retrieval.
minutes: 13
---

Chunking is the most underrated RAG decision. Too big and the embedding blurs many topics together; too small and the answer is split across pieces. Expect: "how do you choose chunk size and overlap?" and "how would you chunk PDFs with tables?".

## 1. Why chunk at all?

- Embedding models have input limits (often 512 to 8,192 tokens) and represent a long text with one vector, so a long text's vector becomes an average of many topics and matches nothing well.
- The LLM's context window and cost limit how much text we can pass.
- Smaller units let retrieval point to the exact passage and cite it.

:::analogy
Indexing a textbook. One entry per whole chapter is too vague; one per sentence loses the meaning. One per section or paragraph is about right.
:::

## 2. Strategies

| Strategy | How it splits | Pros | Cons |
|---|---|---|---|
| **Fixed-size** | Every N tokens, with overlap | Simple, predictable | Cuts mid-sentence or mid-table |
| **Recursive** | Try paragraph breaks, then lines, then sentences, then words until pieces fit the size | Good default; respects natural boundaries | Ignores document structure beyond text breaks |
| **Structure-aware** | Use headings, sections, list items, table boundaries (Markdown, HTML, PDF layout) | Chunks match how authors organised content; great metadata | Needs good parsing |
| **Semantic** | Embed sentences; start a new chunk where similarity between neighbours drops | Topic-coherent chunks | Slower; sizes vary; gains often small |
| **Sentence-window** | Index single sentences; at retrieval return a window of neighbours | Very precise matching | More vectors |
| **Parent-document (small-to-big)** | Index small child chunks; return their larger parent section | Precise search + full context | More storage and logic |
| **Late chunking / contextual** | Add a short LLM-written summary of the document to each chunk before embedding | Chunks stay meaningful on their own | Extra cost at indexing |

::viz{name="chunker"}

## 3. Choosing size and overlap

Typical starting points:

- **Chunk size**: 256–1,024 tokens. Short factual answers (FAQs, definitions) → smaller; explanations and procedures → larger.
- **Overlap**: 10–20% of the chunk size, so a sentence near a boundary appears in both neighbours.

:::worked
**Storage and overlap arithmetic.** A 10,000-token document, chunk size 500, overlap 100. Each new chunk starts $500 - 100 = 400$ tokens after the previous one.

Number of chunks ≈ $\lceil (10{,}000 - 100) / 400 \rceil = \lceil 24.75 \rceil = $ **25**. Without overlap it would be 20, so overlap adds 25% more vectors to store and search.
:::

:::remember
Don't guess: **tune chunk size on your evaluation set**. Try e.g. 256 / 512 / 1,024 and compare recall@k and answer quality. Measure size in the embedding model's tokens, not characters.
:::

## 4. Hard cases

- **Tables**: keep each table whole (or row groups with the header repeated); convert to Markdown; optionally also store an LLM-written summary of the table for retrieval.
- **PDFs**: use a layout-aware parser; drop page headers/footers and page numbers; reconnect text broken across pages.
- **Code**: split by function or class.
- **Very short documents** (FAQ entries, tickets): one chunk per item.
- **Context loss**: a chunk saying "It should not be used in patients with…" doesn't say what "it" is. Fix by adding the document title and section heading to each chunk's text (and metadata) before embedding.

:::trap
**Is more overlap always safer?** No. It increases storage and indexing cost, and returns near-duplicate chunks that waste context space. Overlap a sentence or two worth, and de-duplicate retrieved results.
:::

```python
from langchain_text_splitters import RecursiveCharacterTextSplitter, MarkdownHeaderTextSplitter

md_splitter = MarkdownHeaderTextSplitter([("#", "h1"), ("##", "h2")])     # structure first
sections = md_splitter.split_text(markdown_text)                          # keeps headings as metadata

splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(chunk_size=500, chunk_overlap=75)
chunks = splitter.split_documents(sections)                              # then size limit, in tokens
```

:::say
"I chunk structure-first: split by headings and sections, keep tables whole, then apply a recursive token-based splitter with 10 to 20 percent overlap, starting around 500 tokens. I prepend the document title and section to each chunk so it makes sense on its own and store them as metadata for filtering. For long documents I like parent-document retrieval: search small chunks, return the parent section. And I choose the size by comparing recall at k on a golden question set rather than guessing."
:::
