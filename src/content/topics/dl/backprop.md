---
title: Backpropagation and gradient descent
short: Backpropagation
subject: dl
group: Foundations
order: 2
summary: How a network figures out which weights to change and by how much. The chain rule, worked through with real numbers, and the gradient descent loop that uses it.
minutes: 18
---

"Explain backpropagation" is a classic. A strong answer has three parts: gradient descent (the goal), the chain rule (the tool), and one small example you can do with numbers.

## 1. Gradient descent: the goal

Picture the loss as a hilly landscape where every direction is one weight. We want the lowest valley. The **gradient** is a list of slopes, one per weight, pointing uphill. So we step the other way:

$$
w \leftarrow w - \eta\,\nabla_w L
$$

:::symbols
- $w$ = all the weights; $\leftarrow$ = "update to".
- $L$ = the loss (how wrong the model is).
- $\nabla_w L$ ("gradient of L with respect to w") = for each weight, how much the loss would change if that weight increased slightly.
- $\eta$ ("eta") = the learning rate: step size.
:::

- Learning rate too small: painfully slow.
- Too large: you overshoot the valley; the loss bounces or explodes.

| Variant | Gradient computed on | Pros / cons |
|---|---|---|
| Batch gradient descent | The whole dataset | Exact; one step per pass; impossible for big data |
| Stochastic gradient descent (SGD) | One example | Cheap, very noisy steps |
| Mini-batch gradient descent | 32 to 1,024 examples | The standard: GPU-friendly, reasonably stable; the noise even helps escape bad spots |

## 2. The chain rule: the tool

If the loss $L$ depends on $a$, which depends on $z$, which depends on a weight $w$, then

$$
\frac{\partial L}{\partial w} = \frac{\partial L}{\partial a}\cdot\frac{\partial a}{\partial z}\cdot\frac{\partial z}{\partial w}
$$

:::symbols
- $\frac{\partial L}{\partial w}$ = "how much does $L$ change when $w$ changes a tiny bit?" (a partial derivative).
- The chain rule says: multiply the local sensitivities along the path from $w$ to $L$.
:::

A network is a long chain of such steps. **Backpropagation** computes these products starting from the loss and moving backwards, layer by layer, **reusing** each intermediate result. That's why getting gradients for millions of weights costs only about as much as one or two forward passes.

## 3. A complete example with numbers

:::worked
One neuron, sigmoid output, binary cross-entropy loss.

Input $x = 2$, weight $w = 0.5$, bias $b = 0$, true label $y = 1$, learning rate $\eta = 0.1$.

**Forward pass**

- $z = w x + b = 0.5 \times 2 + 0 = 1$
- $p = \sigma(1) = 1/(1 + e^{-1}) = 0.731$
- Loss $L = -\ln(0.731) = 0.313$

**Backward pass (chain rule)**

- $\frac{\partial L}{\partial p} = -\frac{y}{p} = -\frac{1}{0.731} = -1.368$
- $\frac{\partial p}{\partial z} = p(1 - p) = 0.731 \times 0.269 = 0.197$ (the sigmoid's slope)
- So $\frac{\partial L}{\partial z} = -1.368 \times 0.197 = -0.269$. Shortcut: for sigmoid + cross-entropy it's always $p - y = 0.731 - 1 = -0.269$.
- $\frac{\partial z}{\partial w} = x = 2$, so $\frac{\partial L}{\partial w} = -0.269 \times 2 = -0.538$
- $\frac{\partial z}{\partial b} = 1$, so $\frac{\partial L}{\partial b} = -0.269$

**Update**

- $w = 0.5 - 0.1 \times (-0.538) = 0.554$
- $b = 0 - 0.1 \times (-0.269) = 0.027$

**Check**: new $z = 0.554 \times 2 + 0.027 = 1.135$, new $p = 0.757$, new loss $= 0.278$. The prediction moved toward the true label and the loss went down.
:::

::viz{name="backprop-calc"}

## 4. Backprop through a whole network

For layer $l$, write the pre-activation $z^l = W^l a^{l-1} + b^l$ and output $a^l = f(z^l)$. Define the **error signal** $\delta^l = \frac{\partial L}{\partial z^l}$. Then:

$$
\delta^{L} = \nabla_a L \odot f'(z^{L}), \qquad \delta^{l} = \big((W^{l+1})^\top\delta^{l+1}\big)\odot f'(z^{l})
$$

$$
\frac{\partial L}{\partial W^l} = \delta^l\,(a^{l-1})^\top, \qquad \frac{\partial L}{\partial b^l} = \delta^l
$$

:::symbols
- $l$ = layer number; $L$ (as a superscript) = the last layer.
- $W^l$, $b^l$ = weights and biases of layer $l$; $a^{l-1}$ = outputs of the previous layer.
- $\delta^l$ ("delta") = how much the loss changes with each neuron's pre-activation in layer $l$.
- $f'(z)$ = the derivative (slope) of the activation function.
- $\odot$ = element-by-element multiplication.
- $(W^{l+1})^\top$ = the next layer's weights, transposed: the error flows **backwards** along the same connections.
:::

In words: each layer's error = (next layer's error sent back through the weights) × (this layer's activation slope). The weight gradient = this layer's error × the inputs it received.

:::why
That repeated multiplication by $f'(z)$ is the root of the **vanishing gradient** problem. Sigmoid's slope is at most 0.25, so after 10 layers the signal can shrink to $0.25^{10} \approx 0.000001$. This is why ReLU, good initialisation, normalisation and residual connections matter (see the next pages).
:::

## 5. What frameworks do for you

PyTorch and TensorFlow record every operation during the forward pass as a **computational graph**. `loss.backward()` walks that graph in reverse (**reverse-mode automatic differentiation**). You never write derivatives yourself, but understanding them is how you debug.

```python
for xb, yb in loader:
    optimizer.zero_grad()          # clear old gradients (PyTorch adds them up by default)
    pred = model(xb)               # forward pass
    loss = loss_fn(pred, yb)       # compute loss
    loss.backward()                # backprop: fills .grad for every parameter
    optimizer.step()               # update weights using the gradients
```

:::trap
**What happens if you forget `optimizer.zero_grad()`?** PyTorch adds each new gradient to the old ones, so every step uses the sum of all previous gradients and training becomes unstable. (That accumulation is used on purpose for **gradient accumulation** when a big batch doesn't fit in GPU memory.)
:::

## 6. Local minima, saddle points, and why it still works

- A neural network's loss is **non-convex**: there's no guarantee of finding the global minimum.
- In very high dimensions most "stuck" points are **saddle points** (downhill in some directions, uphill in others), not bad local minima. Momentum and mini-batch noise help get past them.
- Large networks have many local minima with similar, good loss. **Flat** minima tend to generalise better than sharp ones.

:::say
"Backpropagation is the chain rule applied from the loss back through each layer. Each layer's error signal equals the next layer's error sent back through the transposed weights, times the local activation slope; the weight gradient is that error times the layer's inputs. Reusing intermediate results makes all gradients cost about one extra forward pass. Gradient descent then moves each weight by minus learning rate times its gradient, usually with mini-batches and Adam. Because those slopes multiply across layers, gradients can vanish or explode, which is why we use ReLU, good initialisation, normalisation and residual connections."
:::
