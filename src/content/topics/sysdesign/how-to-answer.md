---
title: How to answer a system design question
short: The answer framework & quick maths
subject: sysdesign
group: Foundations
order: 1
summary: Start here. The 7-step structure that works for ML and GenAI design rounds, the questions to ask first, the numbers to estimate, and the vocabulary (latency, throughput, p95, SLA) in plain words.
minutes: 14
---

System design rounds feel scary because they're open-ended: "Design a fraud detection system", "How would you deploy your RAG app for 5,000 users?". There's no single right answer. Interviewers grade **how you think**: do you clarify, estimate, choose sensible components, explain trade-offs and plan for failure?

## 1. The 7-step structure

| Step | What you do | Time (45 min round) |
|---|---|---|
| 1. **Clarify** | Who uses it, for what decision, how fast, how many, what data, what constraints | 5 min |
| 2. **Define success** | Business metric + ML/LLM metric + system targets (latency, uptime, cost) | 3 min |
| 3. **Estimate scale** | Users → requests per second → data size → compute | 4 min |
| 4. **High-level design** | Boxes and arrows: data → features → model → serving → app → monitoring | 10 min |
| 5. **Deep dive** | The 1–2 hardest parts (features and labels, retrieval, latency, scaling the LLM) | 12 min |
| 6. **Failure and safety** | What breaks, fallbacks, monitoring, rollback, security, compliance | 6 min |
| 7. **Trade-offs and next steps** | What you'd do first (MVP) vs later; what you'd measure | 5 min |

:::analogy
An architect designing a house doesn't start by choosing tiles. First: how many people live here, what's the budget, which city (rules)? Then rooms and plumbing. Tiles last. In ML design, the model choice is the tiles.
:::

## 2. Clarifying questions worth asking

- **Users and decision**: who sees the output, and what do they do with it? (An investigator's queue? An automatic loan decline? A chat answer?)
- **Latency**: does the answer need to be instant (card payment, < 100 ms), interactive (chat, a few seconds), or can it be daily (marketing list)?
- **Scale**: how many users, requests per day, items to score, documents to index?
- **Data**: where is it, how fresh, are labels available and how late do they arrive?
- **Constraints**: regulation (banking, insurance, healthcare), data must stay in-country or on-prem, explainability, budget.
- **Failure cost**: what's worse, a false positive or a false negative? What happens if the system is down?

:::trap
**Jumping straight to "I'd use XGBoost / GPT-4 / Kubernetes".** Interviewers mark this down. Spend the first minutes on requirements; it changes the design (batch vs real-time is decided by the business, not by you).
:::

## 3. Vocabulary in plain words

| Term | Plain meaning | Example |
|---|---|---|
| **Latency** | Time for one request, start to finish | 120 ms to score a claim |
| **p50 / p95 / p99 latency** | The time that 50% / 95% / 99% of requests finish within | p95 = 300 ms means 1 in 20 requests is slower than 300 ms |
| **Throughput / QPS / RPS** | Requests handled per second | 50 requests per second at peak |
| **Concurrency** | Requests being worked on at the same moment | 200 chats generating at once |
| **SLA / SLO** | A promise / internal target for availability or latency | 99.9% uptime ≈ 43 minutes of downtime a month |
| **Horizontal scaling** | Add more copies of a service | 2 → 10 pods |
| **Vertical scaling** | Use a bigger machine | 8 GB → 64 GB RAM |
| **Stateless** | The service remembers nothing between requests (state is in a database) | Any copy can serve any user, so you can add copies freely |
| **Idempotent** | Doing it twice has the same effect as once | Safe to retry |

:::why
Why p95/p99 instead of the average? Averages hide the slow tail. If one request in 100 takes 10 seconds, the average still looks fine, but a user making 20 requests per session will probably hit it. Tail latency is what users feel.
:::

## 4. Back-of-envelope estimates

Two formulas cover most interviews:

$$
\text{peak RPS} = \frac{\text{daily requests} \times \text{share in the busiest hour}}{3600}
$$

$$
\text{concurrency} = \text{arrival rate} \times \text{time per request} \quad \text{(Little's law)}
$$

:::symbols
- daily requests = users × share active per day × requests per active user.
- share in the busiest hour: often 10–20% of the day's traffic for office apps.
- 3,600 = seconds in an hour.
- Little's law: if 2 requests arrive per second and each takes 5 seconds, about 10 are in progress at any moment.
:::

::viz{name="qps-calc"}

:::worked
**6,000 users of an internal GenAI assistant.** 40% use it on a given day = 2,400 users × 10 questions = 24,000 questions/day. 20% arrive in the busiest hour = 4,800 per hour = **1.33 per second**. Each answer takes 4 s → about **6 in flight** at once.

That's small for web traffic but large for LLM tokens: 1.33 questions/s × 3 LLM calls × 2,500 input tokens ≈ 600,000 input tokens per minute. Quotas, not CPU, become the bottleneck.
:::

### Numbers worth remembering (order of magnitude)

| Operation | Rough time |
|---|---|
| Read from memory / Redis cache | < 1 ms |
| Indexed database lookup | 1–10 ms |
| XGBoost prediction for one row | ~1 ms |
| Network call within a data centre | 1–5 ms |
| Vector search over millions (HNSW) | 10–50 ms |
| Cross-encoder rerank of 30 chunks | 50–300 ms |
| LLM time to first token | 0.3–2 s |
| LLM generating 400 tokens | 3–10 s |

:::say
"I'd structure it in seven steps: clarify users, decisions and constraints; define business, model and system metrics; estimate scale; sketch the high-level design; deep-dive the hardest part; cover failures, monitoring and security; and finish with trade-offs and an MVP-first plan. For estimates I convert users to peak requests per second, use Little's law for concurrency, and for GenAI also convert to tokens per minute, because model quota or GPU capacity is usually the real bottleneck."
:::
