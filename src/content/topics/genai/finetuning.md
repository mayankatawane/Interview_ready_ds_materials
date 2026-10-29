---
title: Fine-tuning, LoRA and QLoRA
short: Fine-tuning & LoRA
subject: genai
group: Adapting LLMs
order: 2
summary: When to fine-tune versus prompt or use RAG, full fine-tuning versus parameter-efficient methods, how LoRA works with the maths and parameter counts, and QLoRA.
minutes: 16
---

The two big questions here: **"RAG or fine-tuning?"** (asked in nearly every GenAI interview) and **"explain LoRA"** (with the low-rank maths and why it saves memory).

## 1. Prompting vs RAG vs fine-tuning

| Need | Best first tool | Why |
|---|---|---|
| Model lacks **knowledge** (your documents, fresh or private facts) | **RAG** | Update by re-indexing; citations; access control per document |
| Model needs a consistent **behaviour**: format, tone, style, a domain's way of writing, a narrow task | **Fine-tuning** | Bakes the pattern into the weights; shorter prompts |
| Task is clear and the model already mostly does it | **Prompting** | Fastest and cheapest |
| Need a smaller, cheaper model to match a big one on one task | **Fine-tune (distil)** a small model on the big model's outputs | Cost and latency |

:::trap
**"Fine-tune the model on our documents so it knows them."** Usually the wrong call. Fine-tuning is unreliable at adding facts (the model may still hallucinate details), can't cite sources, needs retraining whenever documents change, and can't respect per-user permissions. Use RAG for knowledge; fine-tune for behaviour. They combine well: fine-tune a model to use retrieved context better, then do RAG.
:::

The usual order: **prompt → add RAG → fine-tune**, moving on only when evaluation shows the cheaper step isn't enough.

## 2. Full fine-tuning vs parameter-efficient fine-tuning (PEFT)

**Full fine-tuning** updates every weight. For a 7B model in 16-bit with the Adam optimiser you need roughly 16 bytes per parameter (weights, gradients, two optimiser states, a full-precision copy) ≈ **112 GB** of GPU memory before activations. And you store a full 14 GB copy per task.

**PEFT** freezes the original weights and trains a small number of new ones. The main methods:

- **LoRA** (most popular): add small low-rank matrices.
- **Adapters**: small layers inserted inside blocks.
- **Prefix / prompt tuning**: learn "virtual tokens" prepended to the input.

## 3. How LoRA works

The idea: the *change* a task needs in a big weight matrix is "simple" (low-rank), so represent it as the product of two thin matrices.

$$
W' = W_0 + \Delta W = W_0 + \frac{\alpha}{r}\,BA
$$

:::symbols
- $W_0$ = the original pretrained weight matrix, size $d \times k$ (e.g. 4096 × 4096). **Frozen.**
- $B$ = a $d \times r$ matrix and $A$ = an $r \times k$ matrix. These are the only things trained.
- $r$ = the **rank**, small (4 to 64). Their product $BA$ has the same shape as $W_0$.
- $\alpha$ = a scaling constant; $\alpha / r$ controls how strongly the update is applied.
- $B$ starts at zero, so at the start $W' = W_0$ exactly and training begins from the original model.
:::

:::worked
One 4096 × 4096 attention matrix:

- Full fine-tuning trains $4096 \times 4096 = 16{,}777{,}216$ numbers.
- LoRA with $r = 8$ trains $4096 \times 8 + 8 \times 4096 = 65{,}536$ numbers: **0.39%** of the original.

Apply LoRA to the query and value matrices in all 32 layers of a 7B model: $2 \times 32 \times 65{,}536 \approx 4.2$ million trainable parameters, about **0.06%** of the model.
:::

::viz{name="lora-calc"}

### Why it's useful

- Much less GPU memory (no gradients or optimiser states for the frozen weights).
- Tiny files per task (megabytes), so you can keep many adapters and swap them on one base model.
- **Merge** for deployment: compute $W_0 + \frac{\alpha}{r}BA$ once, so there's no extra inference latency.
- Less **catastrophic forgetting**, since the base weights stay frozen.

### Key LoRA settings

| Setting | Typical | Notes |
|---|---|---|
| Rank $r$ | 8–16 (up to 64) | Higher = more capacity, more memory; diminishing returns |
| $\alpha$ | Often $r$ or $2r$ | Scales the update |
| Target modules | Query/value, or all linear layers | All linear layers usually works best |
| Learning rate | ~1e-4 to 2e-4 | Higher than full fine-tuning |
| Dropout | 0.05–0.1 | On the LoRA path |

## 4. QLoRA

**QLoRA** = load the frozen base model in **4-bit** (NF4 format) and train LoRA adapters on top in 16-bit. It also uses double quantisation and paged optimisers to save memory. Result: fine-tune a 65B model on a single 48 GB GPU, or a 7B model on a consumer GPU, with quality close to 16-bit LoRA.

## 5. The fine-tuning workflow

1. **Define the task and metric** and build a held-out evaluation set first.
2. **Prepare data**: hundreds to a few thousand **high-quality** examples in the model's chat template. Quality and diversity beat volume. Remove duplicates and anything overlapping the eval set.
3. **Train** (LoRA/QLoRA), 1–3 epochs; watch validation loss for overfitting.
4. **Evaluate** on the task metric *and* on general abilities to catch forgetting; compare with the prompted/RAG baseline.
5. **Deploy** (merge adapters or serve several with one base), monitor, retrain as data grows.

```python
from peft import LoraConfig, get_peft_model
from transformers import AutoModelForCausalLM, BitsAndBytesConfig
import torch

bnb = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4",
                         bnb_4bit_compute_dtype=torch.bfloat16)          # QLoRA: 4-bit base
model = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-3.1-8B-Instruct", quantization_config=bnb)

config = LoraConfig(r=16, lora_alpha=32, lora_dropout=0.05,
                    target_modules=["q_proj", "k_proj", "v_proj", "o_proj"], task_type="CAUSAL_LM")
model = get_peft_model(model, config)
model.print_trainable_parameters()      # a tiny fraction of the total
# then train with transformers Trainer / TRL SFTTrainer on your formatted examples
```

:::say
"I use RAG for knowledge and fine-tuning for behaviour: format, style, a narrow task, or distilling a big model into a cheaper one. I'd only fine-tune after prompting and RAG plateau on the eval set. For the method, LoRA freezes the base weights and learns a low-rank update BA, so with rank 8 a 4096 by 4096 matrix needs about 65 thousand trainable numbers instead of 16.7 million; adapters are small, swappable and can be merged for zero extra latency. QLoRA does the same on a 4-bit base model, so large models fit on a single GPU. The key success factor is a few thousand high-quality examples and evaluating both the task and general ability."
:::
