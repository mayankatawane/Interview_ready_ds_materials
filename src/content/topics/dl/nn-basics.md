---
title: Neural networks from first principles
short: Neurons, layers, MLP
subject: dl
group: Foundations
order: 1
summary: What a neuron computes, how neurons stack into layers, why non-linear activations are essential, and how a network is trained, with numbers at every step.
minutes: 18
---

Every deep learning question builds on this page: what one neuron does, how layers work as matrix maths, how many parameters a network has, why it needs non-linear activations, and how training loops work.

## 1. What is a neuron?

A neuron (or unit) takes several numbers in, multiplies each by a weight, adds them up with a bias, and passes the result through an **activation function**.

$$
z = w_1x_1 + w_2x_2 + \dots + w_nx_n + b = w^\top x + b, \qquad a = f(z)
$$

:::symbols
- $x_1, \dots, x_n$ = the inputs (features, or outputs of the previous layer).
- $w_1, \dots, w_n$ = the weights: how much each input matters. Learned.
- $b$ = the bias: shifts the result up or down. Learned.
- $w^\top x$ = the same weighted sum written as a vector dot product.
- $z$ = the "pre-activation": a plain number.
- $f$ = the activation function (ReLU, sigmoid, …); $a$ = the neuron's output.
:::

:::worked
Inputs $x = [2, 3]$, weights $w = [0.5, -1]$, bias $b = 1$.

$z = 0.5 \times 2 + (-1) \times 3 + 1 = 1 - 3 + 1 = -1$.

- With **ReLU** ($\max(0, z)$): $a = 0$.
- With **sigmoid** ($1/(1 + e^{-z})$): $a = 1/(1 + e^{1}) \approx 0.269$.

Same $z$, very different outputs. The activation decides what gets passed on.
:::

:::remember
One neuron with a sigmoid activation, trained with log loss, **is logistic regression**. A neural network is many such units wired together in layers.
:::

## 2. From neurons to layers

A **layer** is many neurons that all read the same inputs. Writing them together as one matrix operation:

$$
h = f(Wx + b)
$$

:::symbols
- $x$ = input vector with $n$ numbers.
- $W$ = weight matrix with $m$ rows (one per neuron) and $n$ columns. Row $i$ holds neuron $i$'s weights.
- $b$ = vector of $m$ biases.
- $h$ = the layer's output: $m$ numbers, one per neuron.
- $f$ is applied to each number separately.
:::

A **multi-layer perceptron (MLP)**, also called a fully connected or dense network, chains layers:

$$
h_1 = f(W_1x + b_1), \quad h_2 = f(W_2h_1 + b_2), \quad \hat y = g(W_3h_2 + b_3)
$$

- **Input layer**: the raw features.
- **Hidden layers**: everything in between. They learn useful intermediate features.
- **Output layer**: produces the prediction. Its activation $g$ depends on the task: none for regression, sigmoid for yes/no, softmax for several classes.

## 3. Counting parameters (a very common question)

A dense layer from $n$ inputs to $m$ outputs has $n \times m$ weights plus $m$ biases.

:::worked
MNIST digit classifier: 784 pixels → 128 hidden → 64 hidden → 10 classes.

- Layer 1: $784 \times 128 + 128 = 100{,}480$
- Layer 2: $128 \times 64 + 64 = 8{,}256$
- Layer 3: $64 \times 10 + 10 = 650$

Total = **109,386 parameters**. Almost all are in the first layer, which is why dense layers on raw images get huge, and why CNNs were invented.
:::

## 4. Why we need non-linear activations

Remove the activations and stack two linear layers:

$$
W_2(W_1x + b_1) + b_2 = \underbrace{(W_2W_1)}_{W'}x + \underbrace{(W_2b_1 + b_2)}_{b'}
$$

That's just **one** linear layer with weights $W'$ and bias $b'$. A 100-layer network without activations can still only draw straight boundaries, exactly like logistic regression. The non-linearity is what lets each layer bend the space so the next layer can separate things that weren't separable before.

:::trap
**Is a deep network with no activation functions more powerful than one layer?** No. Any stack of linear layers equals a single linear layer. Depth only adds power when there's a non-linearity between layers.
:::

::viz{name="nn-playground"}

## 5. The universal approximation theorem

A network with **one hidden layer**, a non-linear activation and **enough neurons** can approximate any continuous function on a bounded range as closely as you want.

What it does **not** say:

- How many neurons you need (it can be astronomically many).
- That training will find those weights.
- That the network will generalise to new data.

In practice, **deep** networks represent complex functions with far fewer parameters than wide shallow ones, because each layer reuses and combines features from the layer below (edges → textures → parts → objects in images).

## 6. How a network trains

1. **Forward pass**: push a batch of inputs through the layers to get predictions.
2. **Loss**: compare predictions with the true values (mean squared error for numbers, cross-entropy for classes).
3. **Backward pass**: **backpropagation** computes how much each weight contributed to the loss (its gradient).
4. **Update**: an **optimiser** (SGD, Adam) moves every weight a small step in the direction that lowers the loss.
5. Repeat for many batches.

| Term | Meaning | Example |
|---|---|---|
| Batch size | Rows used for one weight update | 32, 64, 256 |
| Iteration / step | One forward + backward + update on one batch | 10,000 rows ÷ batch 100 = 100 steps per epoch |
| Epoch | One full pass over the training data | 20 epochs = 2,000 steps |
| Learning rate | Size of each update step | 0.001 is a common start with Adam |

## 7. How it predicts

Just the forward pass: multiply, add, activate, layer by layer, using the learned weights. For classification, the output layer's sigmoid or softmax gives probabilities.

## 8. Neural networks vs gradient boosting on tabular data

| | Neural networks | XGBoost / LightGBM |
|---|---|---|
| Images, audio, text | Clearly best | Poor on raw inputs |
| Typical tabular data | Usually a little worse, more tuning | Usually the default winner |
| Feature scaling | Required | Not needed |
| Missing values, categories | Manual handling, embeddings | Native support |
| Data needed | Lots | Works with less |
| Strengths | Learns its own features, handles mixed data types, end-to-end | Fast, robust, explainable with SHAP |

## 9. Code (PyTorch)

```python
import torch
from torch import nn

model = nn.Sequential(
    nn.Linear(784, 128), nn.ReLU(),
    nn.Linear(128, 64), nn.ReLU(),
    nn.Linear(64, 10))                      # raw scores (logits) for 10 classes
print(sum(p.numel() for p in model.parameters()))   # 109,386

loss_fn = nn.CrossEntropyLoss()             # applies softmax internally
opt = torch.optim.Adam(model.parameters(), lr=1e-3)

for epoch in range(10):
    for xb, yb in train_loader:
        opt.zero_grad()                     # clear old gradients
        loss = loss_fn(model(xb), yb)       # forward pass + loss
        loss.backward()                     # backpropagation
        opt.step()                          # update weights
```

:::say
"A neural network is layers of units that each compute a weighted sum plus a bias and apply a non-linear activation. Without the non-linearity, stacked layers collapse into one linear model. It's trained by a forward pass, a loss, backpropagation to get gradients, and an optimiser step, repeated over mini-batches. A dense layer from n to m units has n times m plus m parameters. For images and text it's the clear choice; for typical tabular data I still start with gradient boosting because it needs less data and tuning."
:::
