---
title: How LLMs are trained
short: Pretraining, SFT, RLHF
subject: genai
group: LLM foundations
order: 4
summary: The three stages that turn random weights into a helpful assistant. The next-token loss and perplexity, scaling laws, instruction tuning, and preference tuning with RLHF and DPO.
minutes: 16
---

"How is ChatGPT/Claude trained?" is a classic opener. The expected answer is a three-stage story: **pretraining → supervised fine-tuning → preference tuning**, with the maths of the loss and a clear idea of what each stage adds.

## 1. The three stages at a glance

| Stage | Data | What the model learns | Result |
|---|---|---|---|
| 1. Pretraining | Trillions of tokens of web, books, code | Language, facts, reasoning patterns | A **base model**: completes text, doesn't follow instructions well |
| 2. Supervised fine-tuning (SFT) | Tens of thousands to millions of (instruction, good answer) pairs written or checked by people | The format of being an assistant | An **instruction-tuned** model |
| 3. Preference tuning (RLHF / DPO) | Pairs of answers where people (or an AI judge) chose the better one | Which answers people prefer: helpful, honest, safe | A **chat/assistant** model |

:::analogy
Pretraining = reading the whole library. SFT = an apprenticeship where a mentor shows model answers. Preference tuning = feedback from customers on which of two answers they liked more.
:::

## 2. Pretraining: next-token prediction

For every position in every training text, the model predicts the next token, and we penalise it for giving the true next token low probability. This is **cross-entropy loss**, the same loss as multi-class classification, where the "classes" are the vocabulary tokens.

$$
\mathcal{L} = -\frac{1}{N}\sum_{t=1}^{N} \log p_\theta(x_t \mid x_1, \dots, x_{t-1})
$$

:::symbols
- $x_t$ = the true token at position $t$; $x_1, \dots, x_{t-1}$ = the tokens before it.
- $p_\theta(\cdot)$ = the probability the model with parameters $\theta$ gives to that true token.
- $\log$ = natural log. A confident correct prediction ($p \approx 1$) costs ≈ 0; a low probability costs a lot.
- $N$ = number of predicted positions; we average.
:::

No labels are needed: the text itself provides the answers. This is called **self-supervised** learning, and it's why pretraining can use the whole internet.

### Perplexity

$$
\text{Perplexity} = e^{\mathcal{L}}
$$

:::symbols
- $e$ = 2.718…; $\mathcal{L}$ = the average cross-entropy loss above.
- Read it as "how many tokens the model is effectively choosing between at each step". Lower is better.
:::

:::worked
The true next token gets probability 0.25 at every position. Loss $= -\ln 0.25 = 1.386$. Perplexity $= e^{1.386} = $ **4**: the model is as uncertain as a fair choice among 4 tokens.

If it improved to 0.5 everywhere: loss $= 0.693$, perplexity $= 2$.
:::

:::trap
**Can you compare perplexity across two models?** Only if they use the same tokenizer and the same test text. Different tokenizers split text differently, so per-token numbers aren't comparable. And low perplexity doesn't guarantee helpful, truthful answers.
:::

### Scaling laws (the Chinchilla result)

Loss falls smoothly and predictably as you increase model size, data and compute. The 2022 **Chinchilla** paper found that for a fixed compute budget, many models were too big and under-trained: a good rule of thumb is roughly **20 training tokens per parameter**.

:::worked
A 7B-parameter model → about $7 \times 10^9 \times 20 = 140$ billion tokens to be "compute-optimal". In practice, modern models train far beyond this (LLaMA-3-8B used about 15 trillion tokens) because a smaller model trained longer is cheaper to **serve**.
:::

**Training compute** ≈ $6 \times N \times D$ floating-point operations, where $N$ = parameters and $D$ = training tokens (2 for the forward pass, 4 for the backward pass, per parameter per token).

## 3. Supervised fine-tuning (SFT)

Same next-token loss, but on curated (prompt, ideal response) examples, usually formatted with a **chat template** (system / user / assistant turns). The loss is usually computed **only on the response tokens**, not the prompt, so the model learns to answer, not to repeat questions.

SFT teaches format and style: follow instructions, answer concisely, refuse clearly harmful requests, use tools in a certain format. It needs far less data than pretraining; quality beats quantity.

## 4. Preference tuning

### RLHF (reinforcement learning from human feedback)

1. **Collect comparisons**: for each prompt, generate two or more answers; people pick the better one.
2. **Train a reward model**: a network that scores an answer, trained so the preferred answer scores higher.
3. **Optimise the LLM** with reinforcement learning (usually PPO) to produce answers the reward model scores highly, with a **KL penalty** that stops it drifting too far from the SFT model.

$$
\mathcal{L}_{\text{RM}} = -\log \sigma\big(r(x, y_w) - r(x, y_l)\big)
$$

:::symbols
- $x$ = the prompt; $y_w$ = the preferred ("winning") answer; $y_l$ = the rejected ("losing") one.
- $r(x, y)$ = the reward model's score for answer $y$.
- $\sigma$ = sigmoid; the loss is small when the winner's score is well above the loser's.
:::

:::why
**Why the KL penalty?** Without it, the LLM learns to exploit weaknesses in the reward model (**reward hacking**): e.g. very long, flattering answers that score high but aren't better. KL (Kullback–Leibler divergence) measures how far the new model's token probabilities have moved from the SFT model's; penalising it keeps answers natural.
:::

### DPO (direct preference optimisation)

DPO skips the separate reward model and the RL loop. It trains the LLM directly on preference pairs with a classification-style loss that raises the probability of the preferred answer relative to the rejected one (both measured against a frozen reference model). Simpler, more stable and cheaper; widely used for open models.

| | RLHF (PPO) | DPO |
|---|---|---|
| Reward model | Separate, trained first | Not needed |
| Training | RL loop: generate, score, update | Supervised-style loss on fixed pairs |
| Complexity | High; several models in memory | Low |
| Flexibility | Can learn from fresh samples during training | Limited to the collected pairs (offline) |

Related ideas: **RLAIF / Constitutional AI** use an AI judge guided by written principles instead of (or alongside) people; **RL with verifiable rewards** (e.g. maths answers checked automatically, code checked by tests) is how many recent "reasoning" models are trained.

## 5. Base vs instruct model: when to use which

- **Instruct/chat model**: almost every application (RAG, agents, chat).
- **Base model**: as a starting point for your own domain pretraining or fine-tuning, or for pure text completion.

:::say
"LLMs are trained in three stages. Pretraining uses self-supervised next-token prediction with cross-entropy loss over trillions of tokens; perplexity is the exponential of that loss, and scaling laws say loss falls predictably with model size, data and compute. Supervised fine-tuning on instruction–response pairs teaches the assistant format, with loss only on the response tokens. Preference tuning then aligns outputs with what people prefer: RLHF trains a reward model from comparisons and optimises the LLM with PPO under a KL penalty to prevent reward hacking, while DPO gets a similar effect directly from preference pairs without a reward model or RL loop."
:::
