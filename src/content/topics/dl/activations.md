---
title: Activation functions
short: Activation functions
subject: dl
group: Foundations
order: 3
summary: The non-linear function applied after each weighted sum. Sigmoid, tanh, ReLU and its variants, GELU, SiLU and softmax, and which to use where.
minutes: 14
---

Activation questions: why ReLU beats sigmoid in hidden layers, what "dying ReLU" means, which activation the output layer needs, how softmax works, and what transformers use.

## 1. What an activation does

After a neuron computes $z = w^\top x + b$, the activation $f(z)$ bends the result. Without it, the whole network would be one linear model (see Neural networks). The activation's **slope** $f'(z)$ also multiplies the gradient at every layer during backprop, so the choice affects whether training works at all.

::viz{name="act-plot"}

## 2. The main activations

| Name | Formula | Slope (derivative) | Output range | Where used |
|---|---|---|---|---|
| Sigmoid | $\sigma(z) = \frac{1}{1 + e^{-z}}$ | $\sigma(z)(1 - \sigma(z))$, at most 0.25 | (0, 1) | Binary output layer; gates inside LSTMs |
| Tanh | $\frac{e^z - e^{-z}}{e^z + e^{-z}}$ | $1 - \tanh^2(z)$, at most 1 | (−1, 1) | RNN hidden states; zero-centred |
| ReLU | $\max(0, z)$ | 1 if $z > 0$, else 0 | [0, ∞) | Default for hidden layers in CNNs and MLPs |
| Leaky ReLU | $\max(\alpha z, z)$, $\alpha \approx 0.01$ | 1 or $\alpha$ | (−∞, ∞) | Avoids dead neurons |
| ELU | $z$ if $z > 0$, else $\alpha(e^z - 1)$ | smooth | (−α, ∞) | Smooth alternative to ReLU |
| GELU | $z\,\Phi(z)$ | smooth | ≈(−0.17, ∞) | Transformers (BERT, GPT) |
| SiLU / Swish | $z\,\sigma(z)$ | smooth | ≈(−0.28, ∞) | Modern CNNs; SwiGLU in LLaMA-style LLMs |
| Softmax | $\frac{e^{z_k}}{\sum_j e^{z_j}}$ | — | each (0, 1), sum to 1 | Multiclass output layer |

:::symbols
- $z$ = the neuron's pre-activation value.
- $e \approx 2.718$.
- $\Phi(z)$ ("phi") = the standard normal cumulative distribution: the probability a standard normal value is below $z$. GELU = "keep $z$ in proportion to how likely it is to be large".
- $\alpha$ = a small constant chosen by you.
:::

## 3. Why sigmoid and tanh fell out of favour for hidden layers

**Saturation.** For large positive or negative $z$, sigmoid flattens out, and its slope approaches 0. A neuron in that region passes almost no gradient back.

:::worked
Backprop multiplies one activation slope per layer. Even in sigmoid's best case (slope 0.25 at $z = 0$):

10 layers: $0.25^{10} \approx 0.00000095$.

The first layers receive about a millionth of the gradient signal of the last layer, so they barely learn: the **vanishing gradient** problem. ReLU's slope is exactly 1 for positive inputs, so the product doesn't shrink along active paths.
:::

**Not zero-centred.** Sigmoid outputs are always positive, so the gradients for all weights feeding the next neuron share the same sign, causing zig-zag updates. Tanh is centred at 0 but still saturates.

## 4. ReLU and "dying ReLU"

ReLU is cheap (a comparison), doesn't saturate for positive inputs, and makes many outputs exactly 0 (sparse activations), which often helps.

**The catch**: if a neuron's weights shift so that $z < 0$ for **every** input, its output is always 0 and its slope is always 0, so it never gets updated again. It's **dead**. A too-large learning rate or a big negative bias can kill a big share of neurons.

**Fixes**: Leaky ReLU, PReLU (learn $\alpha$), ELU or GELU; He initialisation; a lower learning rate.

## 5. Softmax in detail

$$
\text{softmax}(z)_k = \frac{e^{z_k}}{\sum_{j=1}^{K}e^{z_j}}
$$

:::symbols
- $z_k$ = the raw score (logit) for class $k$; $K$ = number of classes.
- Exponentials make every score positive; dividing by the total makes them sum to 1.
:::

:::worked
Logits $[2.0, 1.0, 0.1]$. Exponentials: $e^2 = 7.389$, $e^1 = 2.718$, $e^{0.1} = 1.105$; total = 11.212.

Softmax = $[0.659, 0.242, 0.099]$. The biggest logit gets most of the probability, but every class gets some.
:::

- **Numerical stability**: adding the same number to every logit doesn't change softmax, so implementations subtract the largest logit first to avoid overflow ($e^{1000}$ = infinity).
- **Temperature**: $\text{softmax}(z / T)$. $T < 1$ sharpens the distribution, $T > 1$ flattens it. Same "temperature" you set when sampling from an LLM.

## 6. Which output activation for which task

| Task | Output activation | Loss |
|---|---|---|
| Regression | None (linear) | MSE / MAE / Huber |
| Binary classification | Sigmoid (1 unit) | Binary cross-entropy |
| Multiclass, one correct label | Softmax (K units) | Categorical cross-entropy |
| Multi-label (several can be true) | Sigmoid on each unit | Binary cross-entropy per label |
| Positive counts | Softplus or exp | Poisson |

:::trap
**In PyTorch, should you add a softmax layer before `nn.CrossEntropyLoss`?** No. It expects raw logits and applies log-softmax internally, which is more numerically stable. Adding softmax yourself applies it twice and hurts training. Same with `BCEWithLogitsLoss`: pass logits, not sigmoid outputs.
:::

:::say
"Activations add the non-linearity that lets layers stack meaningfully. Sigmoid and tanh saturate, and sigmoid's slope is at most 0.25, so gradients vanish in deep networks. ReLU has slope 1 for positive inputs, which keeps gradients flowing and is cheap, but neurons can die if they only ever see negative inputs, so Leaky ReLU or GELU are alternatives; transformers use GELU or SwiGLU. The output activation follows the task: none for regression, sigmoid for binary or multi-label, softmax for multiclass."
:::
