---
title: Inside the Transformer
short: Transformer architecture
subject: genai
group: LLM foundations
order: 3
summary: Embeddings, positional encodings (sinusoidal, RoPE), the Transformer block (attention, feed-forward, residuals, LayerNorm), encoder vs decoder, and inference with the KV cache.
minutes: 18
---

After attention, interviewers move to the rest of the block: positional information, the feed-forward network, residual connections, pre-LN vs post-LN, encoder vs decoder, and the KV cache.

## 1. Embeddings

Every token ID selects a row from an **embedding matrix**. With a vocabulary of 50,000 and hidden size 768, that matrix is $50{,}000 \times 768$; a 20-token input becomes a $20 \times 768$ matrix. The 768 numbers are learned features without simple human meanings.

| Token embeddings inside an LLM | Embeddings used for RAG |
|---|---|
| Learned as part of the language model | Produced by a dedicated embedding model |
| Represent single tokens for internal computation | Represent whole chunks or questions for similarity search |
| Feed the Transformer layers | Feed a vector index |

## 2. Positional information

Attention on its own treats the input as a **set**: "dog bites man" and "man bites dog" would look identical. Position must be added somehow.

| Method | How | Used in |
|---|---|---|
| Sinusoidal | Add fixed sine and cosine waves of different frequencies to each embedding | Original Transformer (2017) |
| Learned absolute | Add a trainable vector for each position | BERT, GPT-2; can't go beyond the trained length |
| **RoPE** (rotary) | Rotate query and key vectors by an angle that depends on position, so their dot product depends on the **distance** between tokens | LLaMA, Mistral, most modern LLMs |
| ALiBi | Subtract a penalty from attention scores that grows with distance | Some long-context models |

$$
PE_{(pos,\,2i)} = \sin\Big(\frac{pos}{10000^{2i/d}}\Big), \qquad PE_{(pos,\,2i+1)} = \cos\Big(\frac{pos}{10000^{2i/d}}\Big)
$$

:::symbols
- $pos$ = the token's position (0, 1, 2, …).
- $i$ = which pair of dimensions; $d$ = hidden size.
- Each pair of dimensions is a wave with a different frequency, so every position gets a unique pattern.
:::

:::trap
**Do all Transformers add a learned positional embedding to the token embedding?** No. That's one approach. Modern LLMs mostly use RoPE, applied to queries and keys inside attention rather than added to the input.
:::

## 3. One Transformer block

1. **Input**: $n$ token vectors of size $d$.
2. **Self-attention**: mix information across allowed positions.
3. **Residual + normalisation**: $x \leftarrow x + \text{Attention}(\text{Norm}(x))$.
4. **Feed-forward network**: transform each position's vector on its own.
5. **Residual + normalisation**: $x \leftarrow x + \text{FFN}(\text{Norm}(x))$.
6. **Output** to the next block. LLaMA-2-7B stacks 32 blocks; GPT-3 has 96.

### Feed-forward network (FFN / MLP)

$$
\text{FFN}(x) = W_2\,\sigma(W_1x + b_1) + b_2
$$

:::symbols
- $W_1$ expands the vector (e.g. 768 → 3,072, a 4× expansion); $W_2$ brings it back to 768.
- $\sigma$ = activation: GELU classically, or a gated version like SwiGLU in modern LLMs.
:::

Mental model: **attention decides which information to gather from other tokens; the FFN decides what to do with it.** About two-thirds of a Transformer's parameters live in the FFNs, and they're thought to hold much of the model's stored knowledge.

### Residual connections and LayerNorm

- **Residual**: $y = x + F(x)$. Gives gradients a direct path through dozens of blocks and lets each block learn a small *change* rather than a whole new representation.
- **LayerNorm / RMSNorm**: normalise each token's vector across its features, keeping numbers in a stable range.
- **Post-LN** (original): normalise after adding the residual; harder to train deep stacks, needs warmup.
- **Pre-LN** (most modern LLMs): normalise the input of each sub-layer; more stable.

## 4. Encoder-only, decoder-only, encoder–decoder

| | Encoder-only (BERT) | Decoder-only (GPT, LLaMA, Claude) | Encoder–decoder (T5, BART) |
|---|---|---|---|
| Attention | Bidirectional | Causal | Encoder bidirectional; decoder causal + cross-attention |
| Pretraining task | Masked language modelling (predict ~15% hidden words) | Next-token prediction | Fill in corrupted spans |
| Best for | Classification, named entities, embeddings, reranking | Generation, chat, in-context learning, agents | Translation, summarisation |

**Why did decoder-only win for general LLMs?** One simple objective that uses any text and scales smoothly, natural generation, strong in-context learning, and one model can still classify by generating the label.

## 5. Inference: prefill, decode and the KV cache

Generation has two phases:

- **Prefill**: process the whole prompt in parallel. Limited by compute.
- **Decode**: produce one token at a time. Limited by memory bandwidth (reading weights and cache).

Without a cache, generating token 500 would recompute keys and values for all 499 earlier tokens at every layer. The **KV cache** stores each layer's keys and values for past tokens, so each new step only computes the new token's query, key and value.

$$
\text{KV cache bytes} = 2 \times \text{layers} \times \text{KV heads} \times \text{head dim} \times \text{tokens} \times \text{bytes per number}
$$

:::worked
LLaMA-2-7B: 32 layers, 32 KV heads × 128 dims, FP16 (2 bytes).

Per token: $2 \times 32 \times 32 \times 128 \times 2 = 524{,}288$ bytes ≈ **0.5 MB per token**. A 4,096-token context ≈ **2 GB per sequence**. That's why GQA (fewer KV heads), PagedAttention (vLLM) and cache quantisation matter for serving cost.
:::

## 6. Rough parameter count

Per block ≈ $12d^2$ ($4d^2$ for the attention projections + $8d^2$ for a 4× FFN). For $d = 4096$ and 32 layers: $12 \times 4096^2 \times 32 \approx 6.4$ billion, plus embeddings ≈ 0.26 billion → about **7B**, matching LLaMA-2-7B.

:::say
"Tokens are embedded and given position information, these days usually RoPE applied to queries and keys. Each block has multi-head self-attention and a feed-forward network, each wrapped in a residual connection with pre-layer normalisation. Decoder-only LLMs use causal attention and next-token prediction; encoders like BERT are bidirectional and better for classification and embeddings. At inference the KV cache avoids recomputing past keys and values, which makes decoding memory-bound, so grouped-query attention and paged attention are used to shrink and manage the cache."
:::
