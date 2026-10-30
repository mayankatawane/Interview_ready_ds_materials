---
title: Scaling a GenAI app to thousands of users
short: Scaling to 5,000+ users
subject: sysdesign
group: GenAI system design
order: 2
summary: Turning "5,000–6,000 users" into tokens per minute, concurrent streams and GPUs. API quotas vs self-hosting with vLLM, autoscaling on the right signal, queues, rate limits, fallbacks and load testing.
minutes: 17
---

"Your RAG/agent app works for a pilot of 50 people. How do you scale it to 6,000 users?" The trap is thinking like a web app (CPU, requests per second). For GenAI the limits are **tokens, GPU memory and provider quotas**.

## 1. Translate users into load

::viz{name="genai-capacity"}

:::worked
**6,000 users, internal copilot.** 20% use it in the busiest hour = 1,200 people × 4 questions = 4,800 questions/hour = **1.33 questions/s**. Each question makes 3 LLM calls (rewrite, answer, check), so 4 calls/s.

- Input: 4 × 2,500 tokens × 60 = **600,000 input tokens/minute**.
- Output: 4 × 300 × 60 = **72,000 output tokens/minute** (1,200 tokens/s).
- In flight: 1.33/s × 8 s ≈ **11 questions** generating at once (and 11 open streams).

The web tier for this is trivial (a few pods). The LLM side needs a quota of ~600k+ input TPM with headroom, or GPU capacity for ~1,200 output tokens/s plus prefill.
:::

## 2. Two ways to get model capacity

| | Hosted API (Azure OpenAI, Bedrock, Vertex, Anthropic, OpenAI) | Self-hosted open model (vLLM/TGI on your GPUs) |
|---|---|---|
| Capacity unit | Tokens per minute (TPM) and requests per minute (RPM) quota per deployment/region; provisioned throughput options | GPUs × tokens/s each GPU sustains for your model and prompt sizes |
| Scaling | Request quota increases; spread across regions/deployments; provisioned throughput for guaranteed capacity | Add GPU replicas (autoscale on queue/TTFT); bigger GPUs; quantisation |
| Best when | You want top quality, fast start, variable traffic | Strict data residency, very high steady volume, a smaller fine-tuned model is good enough |
| Watch out | 429 rate-limit errors at peak; per-token cost at high volume; model version changes | GPU cost when idle; slow cold starts; you run the ops |

### How vLLM serves many users on one GPU

- **Continuous batching**: new requests join the running batch at every generation step, so the GPU is always busy.
- **PagedAttention**: KV cache stored in pages, so memory isn't wasted and more requests fit.
- **Prefix caching**: shared system prompts are computed once.
- **Tensor parallelism**: a 70B model split across 2–8 GPUs; an 8B model fits on one.

So one GPU serves **many concurrent requests**, and throughput rises with concurrency until memory or latency targets are hit. Measure it: run vLLM's benchmark or a k6/Locust test with your real prompt lengths and pick the concurrency where p95 time-to-first-token is still acceptable.

:::trap
**"How many GPUs for 6,000 users?"** Never answer from users directly. Go users → peak questions/s → LLM calls → input and output tokens/s → measured tokens/s per GPU at your latency target → GPUs × headroom (×1.5) → minimum 2 for redundancy. Say the per-GPU number must come from a load test.
:::

## 3. Scale every layer on the right signal

| Layer | Scales by | Autoscale signal |
|---|---|---|
| API / orchestrator (async Python) | More pods | CPU or concurrent requests per pod |
| Ingestion workers | More workers | Queue depth (KEDA) |
| Embedding / reranker on GPU | More GPU pods; batching | Queue depth or latency |
| vLLM | More GPU replicas | Requests waiting, GPU KV-cache usage, time to first token |
| Vector DB | Replicas (reads), shards (size) | Query latency, memory |
| Postgres | Read replicas, connection pooling | Connections, CPU |
| Redis | Cluster mode | Memory, ops/s |

:::why
**Why not autoscale LLM servers on CPU?** The GPU does the work; the CPU can look idle while requests queue. Scale on what users feel: queue length and time to first token.
:::

## 4. Protect the system at peak

- **Rate limits per user and per team** at the gateway (e.g. 20 questions/minute) so one script can't drain the quota.
- **Token budgets** per request: cap retrieved context and output length.
- **Queue + back-pressure**: when model capacity is full, hold requests briefly in a queue with a "busy" message rather than failing.
- **Retries with exponential back-off and jitter** for 429/5xx; respect `retry-after`.
- **Fallbacks** in the LLM gateway: another region/deployment → a smaller model → a cached or "try again" answer.
- **Model routing**: easy questions to a small, cheap model; hard ones to the large model. Often 50–70% of traffic can use the small one.
- **Long agent runs as background jobs** with progress streaming, not long-held HTTP requests (see Deploying agents).
- **Async everywhere**: one blocking call in an async server stalls every request on that pod.

## 5. Load test before launch

1. Build realistic test traffic: real question lengths, chat history, the mix of simple and complex questions.
2. Ramp up (k6, Locust) to 1.5–2× expected peak.
3. Watch p50/p95 time to first token, total latency, error/429 rate, GPU memory, cost per question.
4. Find the first bottleneck (usually quota, DB connections, or the reranker), fix it, repeat.
5. Roll out to users gradually: 1 team → 1 business unit → everyone, watching the same dashboards.

## 6. Multi-tenancy and many teams

If several business units share the platform: separate quotas and cost tracking per tenant (via the LLM gateway), index-level or metadata-level isolation of documents, per-tenant configuration (prompts, models), and noisy-neighbour protection with per-tenant rate limits.

:::say
"For 6,000 users I'd first convert to load: peak questions per second, LLM calls per question, then input and output tokens per minute and concurrent streams. For an internal copilot that's typically one to two questions a second but hundreds of thousands of tokens per minute, so the bottleneck is model capacity, not the web tier. With a hosted API I'd size TPM quota for peak with headroom across two regions behind an LLM gateway with fallbacks; self-hosted, I'd measure tokens per second per GPU on vLLM with a load test and autoscale replicas on queue depth and time-to-first-token. Around that: stateless async services, per-user rate limits, token budgets, model routing for easy questions, caching, and gradual rollout."
:::
