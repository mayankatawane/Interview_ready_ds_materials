---
title: Self-attention, step by step
short: Self-attention (Q, K, V)
subject: genai
group: LLM foundations
order: 2
summary: How each token builds a context-aware representation by mixing in information from other tokens. Queries, keys and values, the formula worked with numbers, masking, multi-head, MQA and GQA.
minutes: 20
---

"Explain self-attention" is the single most common LLM interview question, often followed by "why divide by √d_k?" and "why is it O(n²)?". This page builds it from intuition to formula to a hand-worked example.

## 1. Why we need it

*"The animal didn't cross the road because **it** was tired."* To understand "it", the model needs information from "animal".

*"The **bank** approved the loan."* The representation of "bank" should be shaped by "approved" and "loan" (finance, not a river bank).

Self-attention lets each token look at the other tokens in the same sequence and pull in the information it needs. It's not human-like reasoning; it's a learned, weighted average.

## 2. Query, Key, Value: the library analogy

:::analogy
You walk into a library with a question (**query**). Every book has a label on its spine (**key**). You compare your question with each label to decide how relevant each book is, then read the books' contents (**values**), paying most attention to the most relevant ones.
:::

- **Query (Q)**: what this token is looking for.
- **Key (K)**: what each token offers to be matched on.
- **Value (V)**: the information each token actually hands over.

Each token's vector is projected three ways with learned weight matrices:

$$
Q = XW_Q, \qquad K = XW_K, \qquad V = XW_V
$$

:::symbols
- $X$ = the input matrix: one row per token, each row a vector of size $d$ (e.g. 768).
- $W_Q$, $W_K$, $W_V$ = learned weight matrices (trained parameters).
- $Q$, $K$, $V$ = matrices with one query, key and value vector per token.
:::

## 3. The formula, in four operations

$$
\text{Attention}(Q, K, V) = \text{softmax}\Big(\frac{QK^\top}{\sqrt{d_k}} + M\Big)V
$$

:::symbols
- $QK^\top$ = every query dotted with every key: an $n \times n$ table of scores ($n$ = number of tokens).
- $d_k$ = the length of each key/query vector (e.g. 64 or 128).
- $M$ = the mask: 0 where attention is allowed, −∞ where it isn't.
- softmax (applied to each row) turns scores into weights that are positive and sum to 1.
- Multiplying by $V$ gives each token a weighted average of the value vectors.
:::

1. **Scores**: $S = QK^\top$. Entry $(i, j)$ = how well token $i$'s query matches token $j$'s key.
2. **Scale**: divide by $\sqrt{d_k}$.
3. **Mask and softmax**: add the mask, then softmax each row into attention weights.
4. **Mix**: $O = AV$. Each output row is a weighted sum of value vectors.

:::worked
Query $q = [1, 0]$. Keys $k_1 = [1, 0]$, $k_2 = [0, 1]$. Values $v_1 = [10, 0]$, $v_2 = [0, 10]$. $d_k = 2$.

1. Scores: $q\cdot k_1 = 1$, $q\cdot k_2 = 0$.
2. Scaled: $[1/\sqrt2,\ 0] = [0.707,\ 0]$.
3. Softmax: $e^{0.707} = 2.028$ and $e^{0} = 1$; total 3.028; weights $= [0.67,\ 0.33]$.
4. Output: $0.67 \times [10, 0] + 0.33 \times [0, 10] = [6.7,\ 3.3]$.

The token's new representation is mostly token 1's information, with some of token 2's.
:::

::viz{name="attn-heatmap"}

## 4. Why divide by √d_k?

If the numbers in $q$ and $k$ are independent with mean 0 and variance 1, their dot product (a sum of $d_k$ products) has variance $d_k$. With $d_k = 64$, raw scores have a standard deviation of 8. Softmax of numbers that far apart is nearly one-hot: one weight ≈ 1, the rest ≈ 0. The gradients through the others then vanish and training stalls.

Dividing by $\sqrt{d_k} = 8$ brings the variance back to about 1, so softmax stays "soft" and trainable. Untick the scaling box in the heatmap above to see the collapse.

## 5. Masking

| Mask | Purpose | Used in |
|---|---|---|
| Causal (look-ahead) | Token $i$ may only attend to positions up to $i$, so the model can't peek at the answer during next-token training | Decoder-only LLMs (GPT, LLaMA, Claude) |
| Padding | Ignore padding tokens added to make sequences in a batch the same length | Anywhere with batching |
| None (bidirectional) | Every token sees every other | Encoders like BERT |

Implementation: set forbidden scores to a very large negative number before softmax, so their weights become 0.

:::trap
**Does every Transformer use a causal mask?** No. BERT-style encoders use bidirectional attention (trained by hiding random words instead). Decoders use causal masks. In encoder–decoder models, the decoder's cross-attention to the encoder output isn't causally masked.
:::

## 6. Multi-head attention

Instead of one attention with full-size vectors, split into $h$ **heads**, each with its own smaller projections. Each head can learn a different kind of relationship (nearby words, which noun a pronoun refers to, syntax; illustrative, not guaranteed roles).

$$
\text{head}_i = \text{Attention}(XW_Q^{i}, XW_K^{i}, XW_V^{i}), \qquad \text{MHA}(X) = \text{Concat}(\text{head}_1, \dots, \text{head}_h)\,W_O
$$

:::symbols
- $W_Q^{i}$ etc. = head $i$'s own projection matrices.
- Concat = place the heads' outputs side by side.
- $W_O$ = a final learned matrix that mixes the heads back together.
:::

Example: hidden size 768 with 12 heads → each head works in 64 dimensions; the 12 outputs are concatenated back to 768. The total cost is about the same as one big head.

### MHA vs MQA vs GQA

| | Query heads | Key/value heads | Why |
|---|---|---|---|
| Multi-head (MHA) | $h$ | $h$ | Original design, most expressive |
| Multi-query (MQA) | $h$ | 1 shared | Tiny KV cache, faster generation, some quality loss |
| Grouped-query (GQA) | $h$ | $g$ groups (e.g. 8) | Middle ground; used in LLaMA-2-70B, LLaMA-3, Mistral |

Fewer key/value heads means a smaller **KV cache** (see Transformer architecture), which is the main memory cost when serving long contexts.

## 7. The cost of attention

The score table is $n \times n$, so time and memory grow as $O(n^2 \cdot d)$ with sequence length $n$. Doubling the context roughly **quadruples** attention cost.

Fixes: **FlashAttention** (computes exact attention in tiles without storing the full $n \times n$ table), sliding-window or sparse attention, and the KV cache at inference.

## 8. Self-attention vs cross-attention

- **Self-attention**: queries, keys and values all come from the same sequence.
- **Cross-attention**: queries from one sequence (e.g. the decoder), keys and values from another (the encoder's output, or image features). Used in encoder–decoder and multimodal models.

```python
import torch, math
def attention(Q, K, V, causal=False):
    scores = Q @ K.transpose(-2, -1) / math.sqrt(Q.size(-1))     # (n, n) scaled scores
    if causal:
        n = scores.size(-1)
        scores = scores.masked_fill(torch.triu(torch.ones(n, n), 1).bool(), float("-inf"))
    weights = scores.softmax(dim=-1)                              # each row sums to 1
    return weights @ V
```

:::say
"Self-attention projects each token into a query, key and value. Scores are query–key dot products divided by the square root of d_k, softmaxed into weights, and used to take a weighted sum of the values, so each token's new representation mixes in relevant context. The scaling stops softmax from saturating as dimensions grow. Decoders use a causal mask so tokens can't see the future. Multi-head attention runs several smaller attentions in parallel to capture different relationships, and grouped-query attention shares key/value heads to shrink the KV cache. Cost is quadratic in sequence length."
:::
