---
title: Vanishing and exploding gradients, and initialisation
short: Vanishing gradients & init
subject: dl
group: Foundations
order: 4
summary: Why signals shrink or blow up in deep networks, and the fixes. Xavier and He initialisation, residual connections, normalisation and gradient clipping.
minutes: 14
---

This topic links activations, initialisation, normalisation and architecture. Interviewers ask what vanishing and exploding gradients are, how to spot them, and why He initialisation or residual connections help.

## 1. Why it happens

In a deep network, backprop multiplies one factor per layer. Roughly:

$$
\Big\|\frac{\partial L}{\partial h_1}\Big\| \approx \prod_{l=2}^{L}\|W_l\|\cdot|f'(z_l)|
$$

:::symbols
- $\frac{\partial L}{\partial h_1}$ = the gradient reaching the first layer.
- $\prod$ = multiply together, over layers 2 to $L$.
- $\|W_l\|$ = a measure of how much layer $l$'s weights stretch signals.
- $f'(z_l)$ = the activation slope in layer $l$.
:::

If each factor is a bit below 1, the product shrinks fast; if a bit above 1, it grows fast.

:::worked
- Factor 0.9 per layer, 50 layers: $0.9^{50} \approx 0.005$ → **vanishing**.
- Factor 1.1 per layer, 50 layers: $1.1^{50} \approx 117$ → **exploding**.
:::

| | Vanishing | Exploding |
|---|---|---|
| Symptom | Early layers barely change; loss plateaus early | Loss becomes NaN or jumps wildly; huge weight updates |
| Common causes | Sigmoid/tanh saturation; too-small initial weights; long RNN sequences | Too-large initial weights; high learning rate; long RNN sequences |
| Fixes | ReLU-family activations; Xavier/He init; BatchNorm/LayerNorm; residual connections; LSTM/GRU | Gradient clipping; proper init; lower learning rate; normalisation |

## 2. Initialisation: keep the signal size steady

Idea: choose how big the random starting weights are so that the **variance** (spread) of activations stays about the same from layer to layer, going forward and backward.

$$
\text{Xavier / Glorot: } \text{Var}(w) = \frac{2}{n_{in} + n_{out}} \qquad \text{He / Kaiming: } \text{Var}(w) = \frac{2}{n_{in}}
$$

:::symbols
- $\text{Var}(w)$ = variance of the random starting weights.
- $n_{in}$ = number of inputs to the layer (fan-in); $n_{out}$ = number of outputs (fan-out).
:::

- **Xavier** suits tanh and sigmoid (symmetric around 0).
- **He** suits ReLU: ReLU zeroes about half its inputs, so it needs twice the variance to keep the signal the same size.

:::worked
**Why divide by $n$?** A neuron computes $z = \sum_{j=1}^{n} w_jx_j$. If the terms are independent with mean 0, $\text{Var}(z) = n\cdot\text{Var}(w)\cdot\text{Var}(x)$. To keep $\text{Var}(z) = \text{Var}(x)$, we need $\text{Var}(w) = 1/n$.

With 512 inputs: Xavier-style standard deviation $\sqrt{1/512} \approx 0.044$; He with ReLU $\sqrt{2/512} = 0.0625$.
:::

::viz{name="init-sim"}

:::trap
**Why not start all weights at zero?** Every neuron in a layer would compute the same output and receive the same gradient, so they'd stay identical forever. The symmetry is never broken and the layer behaves like a single neuron. Biases can start at 0; weights must be random.
:::

## 3. Other fixes

- **Residual (skip) connections**: $y = x + F(x)$. The derivative is $1 + F'(x)$, so there's always a path where the gradient passes through unchanged. That's how ResNets train 100+ layers, and why every Transformer block has them.
- **Normalisation** (BatchNorm, LayerNorm): re-centres and re-scales activations at every layer.
- **Gradient clipping**: if the gradient's overall size $\|g\|$ exceeds a limit $c$, rescale it: $g \leftarrow c \cdot g / \|g\|$. Standard in RNNs and LLM training ($c \approx 1$).
- **LSTM / GRU gates**: an additive memory path through time (see RNN, LSTM, GRU).
- **Learning-rate warmup**: start with a tiny learning rate for the first steps, so early, badly-scaled gradients can't blow things up.

## 4. How to spot it in practice

- Log the **gradient norm** per layer: near-zero in early layers → vanishing; huge or NaN → exploding.
- Watch the loss: flat from the start (vanishing, or learning rate too low) vs spiking to NaN (exploding).
- Check activation statistics per layer: all zeros (dead ReLUs) or saturated near ±1 (tanh).

```python
import torch
for name, p in model.named_parameters():
    if p.grad is not None:
        print(name, p.grad.norm().item())          # per-layer gradient size

torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)    # before optimizer.step()
torch.nn.init.kaiming_normal_(layer.weight, nonlinearity="relu")    # He init
```

:::say
"Gradients are products of per-layer factors, so in deep networks they can shrink or grow exponentially. Vanishing shows up as early layers not learning; exploding as NaN losses. I use He initialisation with ReLU or Xavier with tanh, so the variance per layer stays stable, plus normalisation layers, residual connections so the gradient has an identity path, and gradient clipping for RNNs and transformers. Weights must start random, otherwise neurons in a layer stay identical."
:::
