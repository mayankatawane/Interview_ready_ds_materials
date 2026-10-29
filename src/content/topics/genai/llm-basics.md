---
title: What an LLM actually is
short: LLMs & tokenization
subject: genai
group: LLM foundations
order: 1
summary: A Large Language Model is a Transformer trained to predict the next token. The journey from text to answer, tokenization and BPE, and why tokens drive cost, context and chunking.
minutes: 18
---

Start here for GenAI. We'll go from the core idea (next-token prediction) through the full journey from text to answer, then look closely at tokenization, which quietly controls context length, cost and RAG chunking.

## 1. Next-token prediction

An LLM (Large Language Model) is a neural network trained on huge amounts of text to do one thing: **given the tokens so far, predict a probability for every possible next token.**

Input: *"The capital of France is"*

| Candidate next token | Illustrative probability |
|---|---|
| Paris | 94% |
| Lyon | 1% |
| France | 0.5% |
| All others | 4.5% |

(Illustrative numbers, not real model output.)

A **decoding strategy** picks one token, it's appended to the input, and the model predicts again. Token by token, left to right. This is called **autoregressive generation**:

`The → capital → of → France → is → Paris → . → <end>`

The model doesn't look facts up in a database. Its billions of parameters store statistical patterns from training. That's why it can be fluent and still confidently wrong (**hallucination**), and why we add retrieval (RAG) for facts that must be correct.

## 2. An LLM is not the whole application

A production GenAI system usually includes:

- An **LLM** to generate answers.
- An **embedding model** to turn text into vectors for search.
- A **vector database** (and often a keyword index) for retrieval.
- A **reranker** to reorder search results.
- **Prompt templates** and a context builder.
- **Tools and APIs** (SQL, knowledge graph, calculators) and an **orchestrator** (e.g. LangGraph).
- **Guardrails**, logging, tracing and **evaluation**.

:::remember
In interviews, show you know the difference: "the model" is one component; most of the engineering is around it.
:::

## 3. The journey from text to answer

1. **Input text**: system prompt + retrieved context + the user's question.
2. **Tokenization**: text becomes a list of integer token IDs.
3. **Embeddings + position**: each ID becomes a vector; information about position is added (or applied inside attention, as with RoPE).
4. **Transformer layers**: dozens of blocks of self-attention and feed-forward networks refine every token's vector using its context.
5. **Output logits**: the last position's final vector is turned into one score per vocabulary token.
6. **Decoding**: softmax turns scores into probabilities; a strategy (greedy, temperature, top-p) picks a token; append it and repeat.

## 4. Tokenization: how text becomes numbers

Neural networks work with numbers. A **tokenizer** splits text into **tokens** from a fixed vocabulary (typically 32,000 to 200,000 entries) and maps each to an integer ID.

`"I love machine learning"` → `[40, 3021, 5780, 6975]` (illustrative IDs; they depend on the tokenizer).

A token can be a whole word, part of a word, punctuation, a space plus a word, or a special token like "end of sequence".

### Why not one ID per word?

- The vocabulary would be enormous.
- Rare words would get poor representations.
- Any new word (a drug name, a typo, a variable name) would be "unknown".

**Sub-word** tokenization builds any word from familiar pieces: `pembrolizumab` might become `pem + bro + liz + umab` (illustrative split).

### Byte-Pair Encoding (BPE), the common algorithm

1. Start with individual characters (or bytes) as the vocabulary.
2. Count every pair of neighbouring symbols across the training text.
3. Merge the most frequent pair into a new symbol and add it to the vocabulary.
4. Repeat until the vocabulary reaches the target size.
5. At inference, apply the learned merges in the same order to split new text.

::viz{name="bpe-demo"}

**Variants**: WordPiece (BERT) merges the pair that most increases the likelihood of the training data; SentencePiece / Unigram (T5, LLaMA) works on raw text including spaces and suits any language; byte-level BPE (GPT models) starts from bytes, so no character is ever unknown.

### Why a data scientist should care

- **Context length** is counted in tokens. English averages about 0.75 words per token (about 4 characters), but code, numbers, Hindi or Marathi text and drug names often need many more tokens per word.
- **Cost**: APIs charge per input and output token.
- **Chunking**: RAG chunk sizes should be measured in the embedding model's tokens.
- **Odd failures**: counting letters in a word or doing digit-by-digit arithmetic is hard because the model sees tokens, not characters.

:::trap
**Is a token the same as a word?** No. A token can be a word, part of a word, punctuation or whitespace. Never assume a fixed words-per-token ratio; measure with the model's own tokenizer (e.g. `tiktoken` or the Hugging Face tokenizer).
:::

## 5. Model families you should be able to name

| Type | Examples | Good at |
|---|---|---|
| Encoder-only | BERT, RoBERTa, DeBERTa | Classification, named entities, embeddings, reranking (reads the whole text both ways) |
| Decoder-only | GPT, Claude, LLaMA, Mistral, Gemma | Generation, chat, reasoning, tool use |
| Encoder–decoder | T5, BART | Input-to-output tasks: translation, summarisation |
| Embedding models | text-embedding-3, BGE, E5, Cohere embed | Vectors for search and RAG |

## 6. Context window

The **context window** is the maximum number of tokens the model can process at once (prompt + answer). Longer windows let you include more documents, but cost more (attention grows with length), can be slower, and models may miss information buried in the middle of a very long prompt ("lost in the middle"). Retrieval that picks the right few passages usually beats stuffing everything in.

```python
import tiktoken
enc = tiktoken.get_encoding("cl100k_base")
ids = enc.encode("Pembrolizumab dosing in renal impairment")
print(len(ids), [enc.decode([i]) for i in ids])     # how the text is split into tokens
```

:::say
"An LLM is a decoder-only Transformer trained to predict the next token. Text is split into sub-word tokens, embedded, processed by stacked attention and feed-forward layers, and the final vector is turned into probabilities over the vocabulary; a decoding strategy picks the next token and the loop repeats. Tokens matter in practice because context limits, cost and RAG chunk sizes are all measured in them. And the LLM is one component: in my oncology copilot at MSD, most of the engineering was retrieval, tools, LangGraph orchestration and evaluation around the model."
:::
