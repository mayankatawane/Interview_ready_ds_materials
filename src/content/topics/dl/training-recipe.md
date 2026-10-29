---
title: Training recipe and debugging
short: Training recipe & debugging
subject: dl
group: Training
order: 4
summary: A practical checklist for getting a network to train, a symptom-to-cause table for when it doesn't, and the efficiency tricks (mixed precision, gradient accumulation, checkpointing).
minutes: 12
---

"Your loss is NaN. What do you do?" and "Training loss falls but validation loss rises. Why?" are typical practical questions. This page gives you a recipe and a debugging table.

## 1. A reliable recipe

1. **Baseline first**: a simple model (logistic regression, a small network, or a pretrained model with a new head), so you know what "good" looks like.
2. **Look at the data pipeline**: print a batch, check shapes, labels and normalisation. Most bugs live here.
3. **Overfit one small batch**: on 10 to 50 examples, training loss should drop to almost 0. If it can't, something is broken (wrong labels, wrong loss, frozen layers, learning rate far off).
4. **Find a learning rate**: run an LR range test (raise the LR exponentially over a few hundred steps, plot loss, pick a value somewhat below where the loss falls fastest). Starting points: Adam 1e-3 from scratch; AdamW 2e-5 to 1e-4 when fine-tuning transformers.
5. **Scale up with regularisation**: augmentation, dropout, weight decay, early stopping.
6. **Monitor**: training and validation loss and metrics, gradient norms, learning rate, and a few actual predictions.
7. **Tune**: learning rate first, then batch size, model size, regularisation.

## 2. Symptom → likely cause

| Symptom | Likely causes | What to try |
|---|---|---|
| Loss becomes NaN or infinite | Learning rate too high; exploding gradients; log(0) or division by zero; bad input values | Lower the LR; gradient clipping; use logit-based losses; check data for NaN/inf; loss scaling with FP16 (or use BF16) |
| Loss doesn't go down at all | LR too low or too high; label bug; frozen weights; forgot `zero_grad`; wrong loss | Overfit one batch; LR range test; check `requires_grad` |
| Training loss falls, validation loss rises | Overfitting | More data or augmentation; dropout; weight decay; early stopping; smaller model |
| Both losses high and flat | Underfitting; too much regularisation; model too small | Bigger model; train longer; less regularisation; better inputs |
| Validation better than training | Dropout/augmentation only active in training; easier validation set; leakage | Usually fine; double-check the split |
| Loss oscillates wildly | LR too high; batch too small | Lower LR; bigger batch; schedule |
| Great validation, poor in production | Distribution shift; leakage; different preprocessing at serving time | Check train/serve consistency; time-based validation |

:::trap
**Validation loss is lower than training loss. Is something wrong?** Not necessarily. Dropout and augmentation make training harder than evaluation, and training loss is averaged over an epoch while the model is still improving. But check the validation set isn't easier and doesn't overlap with training.
:::

## 3. Efficiency tricks

- **Mixed precision** (FP16 or BF16): about 2× faster and half the memory on modern GPUs. FP16 needs loss scaling so tiny gradients don't round to zero; BF16 has the same range as FP32, so usually it doesn't.
- **Gradient accumulation**: effective batch = micro-batch × number of accumulation steps. Lets you train with a big effective batch on a small GPU.
- **Gradient checkpointing**: don't store all intermediate activations; recompute them during the backward pass. Saves a lot of memory for about 30% more compute.
- **Data loading**: several worker processes, pinned memory, prefetching, so the GPU never waits.
- **Distributed training**: data parallel (DDP) puts a full copy of the model on each GPU; FSDP or DeepSpeed ZeRO **shard** parameters, gradients and optimiser state across GPUs for very large models.

## 4. Code skeleton

```python
import torch

scaler = torch.cuda.amp.GradScaler()                     # for FP16 mixed precision
accum = 4                                                # gradient accumulation steps
best, patience, bad = float("inf"), 5, 0

for epoch in range(100):
    model.train()
    for i, (xb, yb) in enumerate(train_loader):
        with torch.autocast("cuda", dtype=torch.float16):
            loss = loss_fn(model(xb), yb) / accum
        scaler.scale(loss).backward()
        if (i + 1) % accum == 0:
            scaler.unscale_(opt)
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            scaler.step(opt); scaler.update(); opt.zero_grad()

    model.eval()
    with torch.no_grad():
        val = sum(loss_fn(model(x), y).item() for x, y in val_loader) / len(val_loader)
    if val < best: best, bad = val, 0; torch.save(model.state_dict(), "best.pt")
    else:
        bad += 1
        if bad >= patience: break                        # early stopping
```

:::say
"If the loss goes NaN I first lower the learning rate and add gradient clipping, then check the data for NaNs and make sure I'm using logit-based losses. My general recipe is: inspect a batch, overfit a single small batch to prove the pipeline works, run a learning-rate range test, then scale up with regularisation and early stopping while tracking training and validation curves. For memory I use mixed precision, gradient accumulation and checkpointing."
:::
