---
title: Optimisers and learning-rate schedules
short: Optimisers (SGD, Adam)
subject: dl
group: Training
order: 1
summary: How gradients turn into weight updates. SGD, momentum, RMSProp, Adam and AdamW explained step by step, plus warmup, cosine schedules and batch size.
minutes: 16
---

Interviewers ask you to explain Adam, the difference between Adam and AdamW, why transformers use warmup, and how batch size relates to learning rate. Each optimiser below adds one idea to the previous one.

## 1. Plain SGD

$$
w_{t+1} = w_t - \eta\,g_t
$$

:::symbols
- $w_t$ = the weights at step $t$.
- $g_t$ = the gradient at step $t$ (computed on a mini-batch).
- $\eta$ ("eta") = learning rate.
:::

Simple and, with a good schedule, generalises very well (still common for CNNs). Weakness: in a long, narrow valley it **zig-zags** across the steep direction while crawling along the gentle one.

::viz{name="opt-race"}

## 2. Momentum: remember where you were going

$$
v_t = \beta\,v_{t-1} + g_t, \qquad w_{t+1} = w_t - \eta\,v_t
$$

:::symbols
- $v_t$ = the "velocity": a running sum of recent gradients.
- $\beta$ ("beta", typically 0.9) = how much of the old velocity to keep.
:::

:::analogy
A heavy ball rolling downhill. Pushes in a consistent direction build up speed; side-to-side pushes cancel out. With $\beta = 0.9$, a steady gradient eventually produces steps about $1/(1-0.9) = 10$ times larger than plain SGD.
:::

**Nesterov momentum** computes the gradient at the point you're about to reach ($w - \eta\beta v$), so it corrects course a little earlier.

## 3. Adaptive learning rates: AdaGrad and RMSProp

Idea: give each weight its **own** step size. Weights that keep getting large gradients get smaller steps; rarely-updated weights get larger ones.

$$
s_t = \rho\,s_{t-1} + (1-\rho)\,g_t^2, \qquad w_{t+1} = w_t - \frac{\eta}{\sqrt{s_t} + \epsilon}\,g_t
$$

:::symbols
- $g_t^2$ = the gradient squared, element by element.
- $s_t$ = a running average of squared gradients for each weight (how "big" its gradients usually are).
- $\rho$ ("rho", ~0.9) = how much history to keep.
- $\epsilon$ ("epsilon", ~$10^{-8}$) = a tiny number to avoid dividing by zero.
:::

That's **RMSProp**. **AdaGrad** adds up squared gradients forever instead of averaging, so its effective learning rate keeps shrinking toward zero, which can stop training too early.

## 4. Adam = momentum + RMSProp + bias correction

$$
m_t = \beta_1 m_{t-1} + (1-\beta_1)\,g_t \qquad v_t = \beta_2 v_{t-1} + (1-\beta_2)\,g_t^2
$$

$$
\hat m_t = \frac{m_t}{1-\beta_1^t}, \qquad \hat v_t = \frac{v_t}{1-\beta_2^t}, \qquad w_{t+1} = w_t - \eta\,\frac{\hat m_t}{\sqrt{\hat v_t} + \epsilon}
$$

:::symbols
- $m_t$ = running average of gradients (the momentum part, the "first moment").
- $v_t$ = running average of squared gradients (the RMSProp part, the "second moment").
- $\beta_1 = 0.9$, $\beta_2 = 0.999$ = how much history each keeps (defaults).
- $\hat m_t$, $\hat v_t$ = **bias-corrected** versions; $\beta^t$ means $\beta$ to the power of the step number $t$.
- Default $\eta = 0.001$.
:::

:::worked
**Why bias correction?** $m$ starts at 0. After the first step, $m_1 = 0.9 \times 0 + 0.1\,g_1 = 0.1\,g_1$, only 10% of the true gradient. Dividing by $1 - 0.9^1 = 0.1$ restores it to $g_1$. As $t$ grows, $\beta^t \to 0$ and the correction fades away.
:::

**Adam step by step:**

1. Compute the gradient $g$.
2. Update the running average of gradients ($m$) and of squared gradients ($v$).
3. Correct both for starting at zero.
4. Step each weight by $\eta \times$ (average direction) ÷ (typical size).

Result: a well-scaled step for every weight, with momentum. That's why Adam works with little tuning.

## 5. AdamW: fixing weight decay

Weight decay (L2 regularisation) shrinks weights toward 0. In plain Adam, if you add L2 to the loss, the penalty's gradient also gets divided by $\sqrt{\hat v}$, so weights with large gradient history get **less** regularisation, which isn't what you wanted.

**AdamW** applies decay directly to the weights, separately from the adaptive step:

$$
w_{t+1} = w_t - \eta\Big(\frac{\hat m_t}{\sqrt{\hat v_t} + \epsilon} + \lambda\,w_t\Big)
$$

where $\lambda$ = weight decay (typically 0.01 to 0.1). AdamW is the default for transformers and LLM fine-tuning.

## 6. Learning-rate schedules

| Schedule | How | Used for |
|---|---|---|
| Step decay | Divide the LR by 10 every N epochs | Classic CNN training |
| Cosine annealing | LR follows a half cosine curve from max down to min | Modern default |
| Linear warmup + decay | LR rises linearly for the first ~1 to 5% of steps, then decays | Transformers and LLMs |
| One-cycle | Up, then down, within one run | Fast convergence |
| Reduce on plateau | Cut LR when validation stops improving | Simple and robust |

$$
\text{Cosine: } \eta_t = \eta_{\min} + \tfrac{1}{2}(\eta_{\max} - \eta_{\min})\Big(1 + \cos\frac{\pi t}{T}\Big)
$$

where $t$ is the current step and $T$ the total number of steps: it starts at $\eta_{\max}$ and glides down to $\eta_{\min}$.

:::why
**Why warmup for transformers?** In the first steps Adam's estimates of $v$ come from very few gradients and are unreliable, and the network is badly scaled, so a full learning rate can cause huge, destabilising updates. Ramping up over the first few hundred or thousand steps avoids early divergence.
:::

## 7. Batch size and learning rate

- Bigger batch = less noisy gradient, better GPU use, fewer updates per epoch; very large batches can generalise slightly worse (they tend to find sharper minima).
- **Linear scaling rule**: multiply the batch size by $k$ → multiply the learning rate by about $k$ (with warmup).
- Not enough GPU memory? **Gradient accumulation**: run several small batches, add up their gradients, then take one optimiser step.

:::trap
**Adam converges faster, so is it always better than SGD?** Not always. Adam trains faster and needs less tuning, but well-tuned SGD with momentum often generalises slightly better on vision tasks. For transformers, AdamW is the standard.
:::

## 8. Code

```python
import torch
opt = torch.optim.AdamW(model.parameters(), lr=3e-4, weight_decay=0.01)
total, warm = 10_000, 500
sched = torch.optim.lr_scheduler.LambdaLR(
    opt, lambda s: (s + 1) / warm if s < warm else 0.5 * (1 + torch.cos(torch.tensor(3.1416 * (s - warm) / (total - warm)))).item())

for step, (xb, yb) in enumerate(loader):
    opt.zero_grad()
    loss_fn(model(xb), yb).backward()
    torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
    opt.step(); sched.step()
```

:::say
"SGD steps against the gradient. Momentum keeps a running average of gradients, which speeds up consistent directions and cancels zig-zags. RMSProp scales each weight's step by the root of its recent squared gradients. Adam combines both, with bias correction because the averages start at zero. AdamW decouples weight decay from the adaptive scaling so regularisation is applied evenly, and that's what I use for transformers, with linear warmup and cosine decay. If I increase the batch size, I scale the learning rate up roughly in proportion."
:::
