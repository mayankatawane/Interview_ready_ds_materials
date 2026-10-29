---
title: Decoding and inference settings
short: Decoding & temperature
subject: genai
group: LLM foundations
order: 5
summary: How a model turns probabilities into text. Greedy, beam search, temperature, top-k and top-p explained with numbers, plus how to make generation faster and cheaper.
minutes: 15
---

The model outputs a probability for every token; **decoding** is how we pick one. Interviewers ask "what does temperature do?" (with the formula), "top-k vs top-p?", "why is temperature 0 not fully deterministic?", and "how would you make inference faster?".

## 1. From logits to probabilities

The last layer gives one raw score per vocabulary token, called a **logit**. Softmax turns them into probabilities:

$$
p_i = \frac{e^{z_i / T}}{\sum_j e^{z_j / T}}
$$

:::symbols
- $z_i$ = the logit (raw score) for token $i$.
- $T$ = temperature (default 1).
- $e^{z}$ makes every score positive; dividing by the sum makes them add to 1.
- $p_i$ = the probability of picking token $i$.
:::

## 2. Temperature

- $T < 1$: divides logits by a small number, **stretching** the gaps, so the top token becomes even more likely. More focused, repeatable output.
- $T > 1$: **shrinks** the gaps, flattening the distribution. More varied and creative, more likely to go off track.
- $T \to 0$: becomes greedy (always the top token).

:::worked
Logits for three tokens: $[2.0,\ 1.0,\ 0.1]$.

- $T = 1$: $e^{2} = 7.39$, $e^{1} = 2.72$, $e^{0.1} = 1.11$; total 11.22 → **[0.66, 0.24, 0.10]**.
- $T = 0.5$: logits become $[4, 2, 0.2]$ → $54.6,\ 7.39,\ 1.22$; total 63.2 → **[0.86, 0.12, 0.02]**. Sharper.
- $T = 2$: logits become $[1, 0.5, 0.05]$ → $2.72,\ 1.65,\ 1.05$; total 5.42 → **[0.50, 0.30, 0.19]**. Flatter.
:::

::viz{name="decode-demo"}

## 3. Strategies

| Strategy | How it picks | Good for | Watch out |
|---|---|---|---|
| **Greedy** | Always the single most likely token | Short factual answers, extraction | Repetitive loops; can miss a better overall sentence |
| **Beam search** | Keeps the $B$ best partial sequences, extends each, keeps the best $B$ again | Translation, summarisation with a "correct" output | Bland, generic, repetitive for open-ended chat; slower |
| **Top-k sampling** | Keep the $k$ most likely tokens, renormalise, sample | Creative text | A fixed $k$ is too many when the model is confident and too few when it's unsure |
| **Top-p (nucleus)** | Keep the smallest set of tokens whose probabilities add up to at least $p$, renormalise, sample | General chat (common: $T$ 0.7, $p$ 0.9) | Combine sensibly with temperature |
| **Min-p** | Keep tokens with probability at least (min-p × top probability) | Creative text at higher temperature | Newer, less universal |

:::worked
**Top-p with p = 0.9.** Sorted probabilities: A 0.50, B 0.25, C 0.15, D 0.06, E 0.04.

Running total: 0.50 → 0.75 → **0.90** (reached with C). Keep {A, B, C}, renormalise: $0.50/0.90 = 0.56$, $0.25/0.90 = 0.28$, $0.15/0.90 = 0.17$. Sample from these.

If the model were very confident (A = 0.95), top-p would keep only A, while top-k = 3 would still allow two unlikely tokens. That adaptivity is why top-p is popular.
:::

### Other controls

- **Max tokens**: hard limit on answer length (and cost).
- **Stop sequences**: strings that end generation (e.g. `"\nUser:"`).
- **Repetition / frequency / presence penalties**: lower the logits of tokens already used, to reduce loops.
- **Structured output / constrained decoding**: only allow tokens that keep the output valid JSON or match a schema. Very useful for tool calls and extraction.

:::trap
**Is temperature 0 fully deterministic?** Not guaranteed. Ties, floating-point differences from batching on GPUs, and provider-side changes can still produce different outputs. For reproducibility, log the model version, prompt and settings, and evaluate on multiple runs.
:::

## 4. Settings by use case

| Use case | Typical settings |
|---|---|
| RAG answers, extraction, classification, SQL generation | Temperature 0 to 0.2; structured output where possible |
| General assistant | Temperature ~0.7, top-p ~0.9 |
| Brainstorming, creative writing | Temperature 0.8 to 1.0+ |
| Generating several candidates to pick from (self-consistency) | Higher temperature, then vote or rerank |

## 5. Making inference faster and cheaper

| Technique | Idea | Benefit |
|---|---|---|
| **KV cache** | Store past keys and values instead of recomputing | Standard; big speed-up |
| **Quantisation** | Store weights in 8-bit or 4-bit instead of 16-bit (INT8, GPTQ, AWQ) | 2–4× less memory; often faster with small quality loss |
| **Continuous batching** | New requests join a running batch as others finish (vLLM, TGI) | Much higher throughput |
| **PagedAttention** | Manage the KV cache in fixed-size pages like OS memory | Less memory waste, more concurrent users |
| **Speculative decoding** | A small draft model proposes several tokens; the large model checks them all in one pass and keeps the accepted ones | 2–3× faster with identical output distribution |
| **FlashAttention** | Exact attention computed in tiles, avoiding the full $n \times n$ matrix in slow memory | Faster, less memory for long contexts |
| **Prompt caching** | Reuse computation for a repeated prompt prefix (system prompt, documents) | Lower cost and latency |
| **Smaller / distilled model** | Use a smaller model trained to imitate a bigger one, or route easy queries to it | Cost |

Two latency numbers to know: **time to first token (TTFT)**, driven by prefill and prompt length; and **time per output token (TPOT)**, driven by decode speed. Users feel TTFT most, so streaming helps.

```python
from openai import OpenAI
client = OpenAI()
resp = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Summarise this trial result in 2 lines: ..."}],
    temperature=0.2, top_p=1.0, max_tokens=150,
)
print(resp.choices[0].message.content)
```

:::say
"The model outputs logits; softmax with temperature turns them into probabilities. Lower temperature sharpens the distribution, higher flattens it. Greedy takes the top token, beam search keeps several candidate sequences and suits translation, and sampling with top-k or top-p adds controlled variety; top-p adapts to the model's confidence by keeping the smallest set covering probability p. For RAG and extraction I use low temperature and structured outputs. To speed up inference I'd use the KV cache, quantisation, continuous batching, speculative decoding and prompt caching, and track time to first token and tokens per second."
:::
