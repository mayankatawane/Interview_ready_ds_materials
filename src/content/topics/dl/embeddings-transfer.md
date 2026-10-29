---
title: Embeddings and transfer learning
short: Embeddings & transfer learning
subject: dl
group: Architectures
order: 3
summary: Turn words, products or IDs into vectors where similar things sit close together, and reuse what big pretrained models already learned for your smaller problem.
minutes: 14
---

These two ideas power most of modern AI, including RAG. Expect questions on one-hot vs embeddings, cosine similarity, Word2Vec, static vs contextual embeddings, and how much of a pretrained model to fine-tune.

## 1. What is an embedding?

An **embedding** is a list of numbers (a vector) that represents a discrete thing (a word, a product, a doctor ID) so that **similar things get similar vectors**.

### Why not one-hot encoding?

With a 50,000-word vocabulary, one-hot gives each word a 50,000-long vector with a single 1. Problems:

- Huge and almost all zeros.
- Every word is equally far from every other: "king" is as different from "queen" as from "banana". No notion of similarity.

An **embedding layer** is a lookup table $E$ with one row per item, e.g. 50,000 × 300. Row $i$ is the vector for item $i$. The numbers are learned during training so that items used in similar contexts end up close.

## 2. Measuring similarity: cosine

$$
\cos(a, b) = \frac{a \cdot b}{\|a\|\,\|b\|} = \frac{\sum_j a_jb_j}{\sqrt{\sum_j a_j^2}\,\sqrt{\sum_j b_j^2}}
$$

:::symbols
- $a$, $b$ = two vectors; $a_j$ = number $j$ in vector $a$.
- $a \cdot b$ = dot product: multiply matching numbers and add up.
- $\|a\|$ = length of $a$.
- Result ranges from −1 (opposite) through 0 (unrelated) to 1 (same direction).
:::

:::worked
$a = [1, 2]$, $b = [2, 3]$. Dot product $= 1\times2 + 2\times3 = 8$. Lengths: $\sqrt{5} = 2.236$ and $\sqrt{13} = 3.606$. Cosine $= 8 / 8.062 = $ **0.992**: almost the same direction.

$a = [1, 0]$, $b = [0, 1]$: cosine = 0, unrelated.
:::

Cosine ignores length and looks only at direction, which suits text: a long and a short document about the same topic still score as similar.

## 3. Word2Vec in one minute

- **Skip-gram**: given a word, predict the words around it. **CBOW**: given the surrounding words, predict the middle one.
- **Negative sampling**: instead of a softmax over all 50,000 words (expensive), train a simple yes/no classifier to tell real (word, neighbour) pairs from random fake pairs.
- Famous result: vector("king") − vector("man") + vector("woman") lands near vector("queen"). (Real embeddings show this only roughly.)
- **GloVe** learns from overall word co-occurrence counts; **fastText** adds sub-word pieces, so it can build vectors for unseen words.

## 4. Static vs contextual embeddings

| | Static (Word2Vec, GloVe) | Contextual (BERT, LLM hidden states) |
|---|---|---|
| "bank" in "river bank" vs "bank loan" | Same vector | Different vectors |
| How you get it | Table lookup | Run a Transformer over the whole sentence |
| Use | Lightweight features | Modern NLP; sentence embeddings for search and RAG |

**Sentence embedding models** (sentence-transformers, OpenAI text-embedding, BGE, E5) produce one vector per sentence or passage. They're trained with **contrastive loss** so that a question and the passage that answers it end up close. These are the embeddings used in RAG.

## 5. Entity embeddings for tabular data

A high-cardinality categorical (pincode, merchant, doctor ID) can enter a neural network through an embedding layer instead of one-hot. A common rule of thumb for the vector size: $\min(50, \lceil\text{number of categories}/2\rceil)$. The learned vectors can then be reused as features in other models (e.g. gradient boosting).

## 6. Transfer learning: reuse a pretrained model

Big models trained on huge datasets learn general features (edges and shapes for images; grammar and meaning for text). **Transfer learning** reuses them for your task, which needs far less data and compute.

| | Your data similar to the pretraining data | Your data quite different |
|---|---|---|
| **Small dataset** | Freeze the pretrained model; train only a new head (**feature extraction**) | Freeze early layers; carefully fine-tune later layers; strong regularisation |
| **Large dataset** | Fine-tune the whole model with a small learning rate | Fine-tune everything (or train from scratch if very different) |

Good practices:

- **Smaller learning rate for pretrained layers** than for the new head (e.g. 1e-5 vs 1e-3), called discriminative learning rates.
- **Gradual unfreezing**: train the head first, then unfreeze blocks from the top down.
- Watch for **catastrophic forgetting**: aggressive fine-tuning can erase general knowledge. Low learning rate, few epochs, or parameter-efficient methods like **LoRA** reduce it.

## 7. Code

```python
import torch.nn as nn
from sentence_transformers import SentenceTransformer, util

emb = nn.Embedding(num_embeddings=5000, embedding_dim=32)      # e.g. 5,000 doctor IDs → 32-d vectors

model = SentenceTransformer("all-MiniLM-L6-v2")
q = model.encode("What is the reimbursement limit for hotels?", normalize_embeddings=True)
docs = model.encode(["Hotel stays are reimbursed up to ₹8,000 per night.", "Alcohol is not reimbursed."],
                    normalize_embeddings=True)
print(util.cos_sim(q, docs))                                   # higher = more similar
```

:::say
"Embeddings map discrete items to dense vectors so that similarity becomes geometry, measured with cosine similarity. Word2Vec learns static vectors from context with negative sampling; transformers produce contextual ones, and sentence-embedding models trained with contrastive loss power semantic search and RAG. For transfer learning, with little data I freeze the pretrained backbone and train a head; with more data I fine-tune more layers with a low learning rate, or use LoRA to limit catastrophic forgetting."
:::
