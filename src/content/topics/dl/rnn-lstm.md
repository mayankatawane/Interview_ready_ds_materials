---
title: RNNs, LSTMs and GRUs
short: RNN, LSTM, GRU
subject: dl
group: Architectures
order: 2
summary: Networks that read a sequence one step at a time and carry a memory forward. Why plain RNNs forget, how LSTM and GRU gates fix it, and why Transformers took over.
minutes: 16
---

RNN questions centre on: how the hidden state works, backpropagation through time, why vanilla RNNs suffer vanishing gradients, what each LSTM gate does, LSTM vs GRU, and why Transformers replaced them.

## 1. What is a recurrent neural network?

An RNN reads a sequence (words, daily sales, sensor readings) **one step at a time**. At each step it combines the new input with a **hidden state**, a running summary of everything it has seen so far, and passes the updated summary to the next step.

:::analogy
Reading a sentence word by word while keeping a mental note of what it's about so far. Each new word updates your note.
:::

$$
h_t = \tanh\big(W_{hh}\,h_{t-1} + W_{xh}\,x_t + b\big), \qquad \hat y_t = W_{hy}\,h_t
$$

:::symbols
- $t$ = the time step (word position, day number).
- $x_t$ = the input at step $t$; $h_t$ = the hidden state (memory) after step $t$; $h_{t-1}$ = the previous one.
- $W_{hh}$ = weights from the old memory to the new one; $W_{xh}$ = weights from the input; $W_{hy}$ = weights to the output.
- The **same** weights are used at every time step.
- $\tanh$ squashes values to between −1 and 1.
:::

## 2. Training: backpropagation through time (BPTT)

"Unroll" the RNN across the sequence, as if it were a very deep network with one layer per time step (sharing weights), and run normal backprop through it. The gradient from step $t$ back to step 1 passes through every step in between, being multiplied by roughly $W_{hh}^\top \times \tanh'$ each time.

:::worked
**Why long sequences break vanilla RNNs.** If each step scales the gradient by 0.9: after 50 steps, $0.9^{50} = 0.005$. The model effectively can't learn that word 1 matters for word 50 (vanishing). If each step scales by 1.1: $1.1^{50} \approx 117$, and training blows up (exploding; fix with gradient clipping).
:::

::viz{name="rnn-decay"}

## 3. LSTM: a protected memory lane

An **LSTM** (Long Short-Term Memory) adds a separate **cell state** $c_t$, a memory that's updated mostly by **adding**, with three **gates** that decide what to forget, what to write and what to show. Each gate is a sigmoid, so it outputs numbers between 0 (closed) and 1 (open).

$$
f_t = \sigma\big(W_f[h_{t-1}, x_t] + b_f\big) \qquad \text{forget gate: how much old memory to keep}
$$

$$
i_t = \sigma\big(W_i[h_{t-1}, x_t] + b_i\big), \qquad \tilde c_t = \tanh\big(W_c[h_{t-1}, x_t] + b_c\big) \qquad \text{input gate and candidate memory}
$$

$$
c_t = f_t \odot c_{t-1} + i_t \odot \tilde c_t \qquad \text{update the cell}
$$

$$
o_t = \sigma\big(W_o[h_{t-1}, x_t] + b_o\big), \qquad h_t = o_t \odot \tanh(c_t) \qquad \text{output gate}
$$

:::symbols
- $[h_{t-1}, x_t]$ = the previous hidden state and current input joined into one vector.
- $\sigma$ = sigmoid (0 to 1); $\odot$ = element-by-element multiplication.
- $f_t$ = forget gate; $i_t$ = input gate; $o_t$ = output gate.
- $\tilde c_t$ = the candidate new information.
- $c_t$ = cell state (long-term memory); $h_t$ = hidden state (what this step outputs).
:::

In plain words, at every step the LSTM:

1. **Forgets** part of its old memory ($f_t$ close to 0 = forget, close to 1 = keep).
2. **Writes** some new information ($i_t$ decides how much of $\tilde c_t$ to add).
3. **Shows** part of its memory as the output ($o_t$).

:::why
Because $c_t = f_t \odot c_{t-1} + \dots$, the gradient along the cell state is multiplied only by the forget gate at each step. When the network wants to remember something, it learns $f \approx 1$, and the gradient flows back through many steps almost unchanged. It's the same idea as a residual connection, but across time.
:::

## 4. GRU: a lighter LSTM

$$
z_t = \sigma(W_z[h_{t-1}, x_t]), \quad r_t = \sigma(W_r[h_{t-1}, x_t]), \quad \tilde h_t = \tanh(W[r_t \odot h_{t-1}, x_t]), \quad h_t = (1 - z_t)\odot h_{t-1} + z_t \odot \tilde h_t
$$

:::symbols
- $z_t$ = update gate: how much to replace the old state with the new candidate.
- $r_t$ = reset gate: how much of the old state to use when creating the candidate.
- $\tilde h_t$ = candidate new state.
:::

Two gates, no separate cell state, about 25% fewer parameters than an LSTM, often similar accuracy and faster.

**Parameter count of an LSTM layer**: $4\,\big(h(h + x) + h\big)$ for hidden size $h$ and input size $x$ (four gate blocks, each with weights for $[h_{t-1}, x_t]$ plus biases). Hidden 128, input 100: $4 \times (128 \times 228 + 128) = 117{,}248$.

## 5. Sequence patterns

| Pattern | Example |
|---|---|
| Many-to-one | Sentiment of a review; churn from a sequence of events |
| One-to-many | Image captioning |
| Many-to-many (aligned) | Tagging each word (named entities) |
| Many-to-many (seq2seq) | Translation, summarisation |

- **Bidirectional RNN**: one RNN reads left-to-right, another right-to-left; outputs are joined. Great for tagging and classification; impossible for generating text (the future isn't known yet).
- **Seq2seq**: an encoder RNN compresses the input into one vector; a decoder generates the output from it. That single vector was a bottleneck, which led to **attention** (2014): let the decoder look back at all encoder states.

## 6. Why Transformers replaced RNNs

| | RNN / LSTM | Transformer |
|---|---|---|
| Processing | Sequential: step $t$ waits for step $t-1$ | All positions at once during training |
| Long-range links | Information passes through every step in between | Any two positions connect directly through attention |
| Cost vs sequence length $n$ | $O(n)$ steps, small memory | $O(n^2)$ attention memory |
| Still useful for | Streaming, small devices, some time series | Almost all NLP and much more |

:::say
"An RNN updates a hidden state at each step using the same weights, and it's trained with backpropagation through time. Because the gradient is multiplied at every step, vanilla RNNs suffer vanishing or exploding gradients on long sequences. LSTMs add a cell state updated by addition and controlled by forget, input and output gates, so gradients can flow across many steps when the forget gate is near one; GRUs simplify this to two gates. Transformers replaced them because attention connects all positions directly and trains in parallel."
:::
