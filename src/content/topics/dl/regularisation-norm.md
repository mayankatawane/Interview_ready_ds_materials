---
title: Regularisation and normalisation in deep learning
short: Dropout, BatchNorm, LayerNorm
subject: dl
group: Training
order: 2
summary: Dropout, weight decay, early stopping and augmentation fight overfitting. BatchNorm and LayerNorm keep activations well-scaled so training is stable and fast.
minutes: 16
---

Common questions: how dropout works and why we scale by 1/(1−p), what changes between training and inference, BatchNorm vs LayerNorm, and why transformers use LayerNorm.

## 1. Why deep nets need regularisation

A network with millions of parameters can memorise its training set. Regularisation makes memorising harder so the network learns patterns that generalise.

## 2. Dropout

During **training**, each neuron's output is set to 0 with probability $p$ (e.g. 0.5 for dense layers, 0.1 in transformers), freshly at random for every batch. At **inference**, dropout is switched off.

Why it helps:

- The network can't rely on any single neuron, so it learns redundant, robust features.
- It's like training a huge number of thinned networks that share weights, then averaging them at test time.

:::worked
**Why scale by $1/(1-p)$? ("inverted dropout")**

A neuron outputs 10. With $p = 0.5$, during training it outputs 0 half the time and 10 half the time: on average 5. At test time dropout is off and it outputs 10, so the next layer would suddenly see inputs twice as large as during training.

Fix: during training, divide the kept outputs by $1 - p = 0.5$, so 10 becomes 20. Average during training $= 0.5 \times 20 = 10$, which matches test time. PyTorch and Keras do this automatically.
:::

:::trap
**What happens if you forget `model.eval()` before inference in PyTorch?** Dropout stays on, so predictions are random and usually worse, and BatchNorm uses the current batch's statistics instead of its stored averages, so a prediction depends on what else is in the batch. Also wrap inference in `torch.no_grad()` to save memory.
:::

## 3. Other regularisers

- **Weight decay** (L2): shrink weights a little every step. Use AdamW so Adam's scaling doesn't distort it.
- **Early stopping**: stop when validation loss hasn't improved for N epochs; restore the best checkpoint.
- **Data augmentation**: flips, crops, colour jitter (images); noise, time-stretch (audio); back-translation (text). New plausible examples for free.
- **Label smoothing**: train toward 0.9 for the true class and spread 0.1 over the others, so the network isn't pushed toward infinite confidence. Improves calibration.
- **Mixup / CutMix**: blend pairs of training examples and their labels.
- **Smaller model, fewer epochs, more data, transfer learning** from a pretrained model.

## 4. BatchNorm

For each feature (or channel), normalise using the mean and variance **across the batch**, then let the network rescale with two learned numbers:

$$
\mu_B = \frac{1}{m}\sum_{i=1}^{m}x_i, \quad \sigma_B^2 = \frac{1}{m}\sum_{i=1}^{m}(x_i - \mu_B)^2, \quad \hat x_i = \frac{x_i - \mu_B}{\sqrt{\sigma_B^2 + \epsilon}}, \quad y_i = \gamma\,\hat x_i + \beta
$$

:::symbols
- $m$ = batch size; $x_i$ = this feature's value for example $i$ in the batch.
- $\mu_B$ ("mu B") = batch mean; $\sigma_B^2$ = batch variance.
- $\hat x_i$ = the normalised value (mean 0, variance 1 within the batch).
- $\epsilon$ = tiny number to avoid dividing by zero.
- $\gamma$ ("gamma") and $\beta$ ("beta") = learned scale and shift, so the layer can undo the normalisation if that's best. No expressive power is lost.
:::

**Training vs inference**: during training it uses the current batch's mean and variance and keeps **running averages** of them. At inference it uses those stored running averages, so a single example gets a fixed, repeatable output.

**Benefits**: allows higher learning rates, less sensitive to initialisation, a mild regularising effect from batch noise.

**Problems**: depends on batch size (poor with batches of 2 to 8); awkward for variable-length sequences and RNNs; behaves differently in training and evaluation mode.

## 5. LayerNorm

Normalise across the **features of a single example** (e.g. the 768 numbers representing one token), not across the batch.

$$
\mu = \frac{1}{d}\sum_{i=1}^{d}x_i, \quad \sigma^2 = \frac{1}{d}\sum_{i=1}^{d}(x_i - \mu)^2, \quad y = \gamma\odot\frac{x - \mu}{\sqrt{\sigma^2 + \epsilon}} + \beta
$$

:::symbols
- $d$ = number of features in one example (the hidden size).
- $x_i$ = feature $i$ of this one example.
- $\odot$ = element-by-element multiplication; $\gamma$, $\beta$ are learned vectors of length $d$.
:::

::viz{name="norm-axes"}

| | BatchNorm | LayerNorm |
|---|---|---|
| Statistics computed over | The batch, per feature/channel | The features, per example/token |
| Depends on batch size | Yes | No |
| Training vs inference | Different (running averages) | Identical |
| Typical home | CNNs | Transformers, RNNs, LLMs |
| Variants | GroupNorm, InstanceNorm (small batches, style transfer) | RMSNorm (no mean subtraction; LLaMA-style LLMs) |

**RMSNorm** simply divides by the root-mean-square of the features ($\sqrt{\text{mean}(x^2) + \epsilon}$) and multiplies by $\gamma$. Cheaper, works as well, so many recent LLMs use it.

:::trap
**Why do transformers use LayerNorm rather than BatchNorm?** Sequences have different lengths and batches are often small, so per-feature batch statistics are noisy and awkward. LayerNorm normalises each token's vector on its own, so it doesn't depend on the batch and behaves identically in training and inference.
:::

## 6. Code

```python
import torch.nn as nn

cnn_block = nn.Sequential(nn.Conv2d(64, 128, 3, padding=1), nn.BatchNorm2d(128), nn.ReLU())
mlp = nn.Sequential(nn.Linear(512, 256), nn.LayerNorm(256), nn.GELU(), nn.Dropout(0.1), nn.Linear(256, 10))
loss_fn = nn.CrossEntropyLoss(label_smoothing=0.1)

model.train()   # dropout on, BatchNorm uses batch stats
model.eval()    # dropout off, BatchNorm uses running averages
```

:::say
"Dropout randomly zeroes activations during training and scales the rest by one over one minus p so the expected values match inference, which makes it act like an ensemble. I combine it with AdamW weight decay, early stopping and augmentation. BatchNorm normalises each feature across the batch and uses running statistics at inference, which works well in CNNs but depends on batch size. LayerNorm normalises across the features of each example, so it's batch-independent and is the standard in transformers, often as RMSNorm in recent LLMs."
:::
