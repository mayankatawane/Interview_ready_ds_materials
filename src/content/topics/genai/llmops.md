---
title: LLMs in production (LLMOps)
short: LLMOps, cost & guardrails
subject: genai
group: Agents and production
order: 2
summary: Shipping and running LLM apps. Model choice, cost and latency maths, caching and routing, guardrails and safety, hallucination reduction, monitoring, and a system-design answer template.
minutes: 17
---

Senior GenAI interviews end with production: "how would you reduce cost by 50%?", "how do you handle hallucinations?", "what do you monitor?", "how do you deploy a prompt change safely?" and an open "design a RAG assistant for X".

## 1. Choosing a model

| Factor | Questions to ask |
|---|---|
| Quality | Does it pass our evaluation set? |
| Cost | Price per million input and output tokens; volume |
| Latency | Time to first token and tokens per second at our prompt size |
| Context window | Fits our documents and conversation? |
| Data privacy and compliance | Can data leave our cloud? Self-host (LLaMA, Mistral, Qwen) vs API (OpenAI, Anthropic, Google), or a cloud-hosted API (Azure OpenAI, Bedrock, Vertex) |
| Features | Tool calling, structured output, vision, fine-tuning |

## 2. Cost maths

$$
\text{Monthly cost} = \text{requests} \times \Big(\frac{\text{input tokens}}{10^6}\times P_{\text{in}} + \frac{\text{output tokens}}{10^6}\times P_{\text{out}}\Big)
$$

:::symbols
- requests = number of LLM calls per month (an agent may make several per user question).
- $P_{\text{in}}$, $P_{\text{out}}$ = price per million input / output tokens (output is usually several times more expensive).
:::

:::worked
100,000 questions a month. Each: 4,000 input tokens (system prompt + 5 chunks + question) and 300 output tokens. Prices (illustrative): \$2.50 per million input, \$10 per million output.

- Input: $100{,}000 \times 4{,}000 = 400$ million tokens → $400 \times 2.50 = $ \$1,000
- Output: $100{,}000 \times 300 = 30$ million tokens → $30 \times 10 = $ \$300
- **Total ≈ \$1,300/month.** Input dominates, so trimming context (fewer, better chunks) and caching the system prompt give the biggest savings.
:::

::viz{name="cost-calc"}

### Ways to cut cost and latency

- **Shorter prompts**: fewer, reranked chunks; concise system prompt.
- **Prompt caching**: reuse the fixed prefix (system prompt, shared documents).
- **Semantic caching**: return a stored answer when a new question is very similar to a past one (careful with personalised or time-sensitive answers).
- **Model routing / cascades**: a small, cheap model for easy or classification steps; escalate to a large model only when needed.
- **Limit output**: max tokens; ask for concise answers.
- **Batch** offline jobs (batch APIs are often ~50% cheaper).
- **Self-host** a smaller fine-tuned or distilled model at high volume, with quantisation and vLLM.
- **Stream** responses: same cost, much better perceived latency.

## 3. Reducing hallucinations

- Ground answers with **RAG**; instruct "answer only from the context; otherwise say you don't know".
- Require **citations** and check that cited passages support the claims.
- Lower temperature for factual tasks; structured outputs.
- Use **tools** for facts and calculation (SQL, calculators, APIs) instead of the model's memory.
- **Verification step**: a second pass or judge checks faithfulness; flag low-confidence answers for human review.
- Measure it: faithfulness on the golden set and sampled production traffic.

## 4. Guardrails and safety

| Layer | Examples |
|---|---|
| Input | Prompt-injection and jailbreak detection, PII detection/redaction, topic filters, rate limits |
| Retrieval | Permission filters per user; trusted sources only |
| Output | Schema validation, toxicity/safety classifiers, PII filters, citation checks, refusing out-of-scope questions, medical/legal disclaimers |
| Actions | Least privilege, allow-lists, human approval for side effects, audit logs |

Tools: NeMo Guardrails, Guardrails AI, Llama Guard, provider moderation endpoints, plus your own rules.

## 5. Monitoring and observability

- **Tracing** every request: prompt version, model, retrieved IDs, tool calls, tokens, latency, cost (LangSmith, Langfuse, Arize Phoenix, OpenTelemetry).
- **Quality**: user feedback, escalation rate, "no answer" rate, sampled LLM-judge scores (faithfulness, relevance).
- **Operational**: p50/p95 latency, time to first token, error and timeout rates, rate-limit hits, cost per request and per user.
- **Drift**: new kinds of questions (cluster query embeddings), retrieval score shifts, provider model updates.

## 6. Shipping changes safely

1. Prompts, models, chunking and index versions are all **versioned config**.
2. Every change runs the **offline evaluation suite** in CI; block if key metrics regress.
3. **Shadow** or **canary** release to a small share of traffic; then **A/B test** on online metrics.
4. Keep a fast **rollback**; pin model versions (providers update models).

## 7. System design answer template

For "Design a RAG/agent assistant for X":

1. **Clarify**: users, questions, data sources and size, freshness, latency and cost targets, accuracy needs, compliance and permissions.
2. **Data and indexing**: parsing, chunking, metadata, embeddings, hybrid index, update pipeline.
3. **Query path**: rewriting, routing, retrieval with permission filters, reranking, prompt, generation with citations, tools.
4. **Safety**: guardrails, injection handling, human-in-the-loop for actions.
5. **Evaluation**: golden set, retrieval and generation metrics, judge validation, CI gates.
6. **Serving and monitoring**: model choice, caching, routing, scaling, tracing, dashboards, feedback loop.
7. **Trade-offs and iterations**: what you'd start with, what you'd add after seeing data.

:::say
"For production I pick the model on our eval set plus cost, latency and data-residency requirements. Cost is mostly input tokens, so I trim context with reranking, cache prompts, route easy steps to smaller models and stream responses. For hallucinations I ground with RAG, require citations, use tools for facts and check faithfulness. Guardrails sit at input, retrieval, output and action layers. Everything is traced: prompt version, retrieved chunks, tool calls, tokens, latency and cost. Changes are versioned, gated by the offline eval suite, released by canary or A/B test, and every production failure becomes a new test case."
:::
