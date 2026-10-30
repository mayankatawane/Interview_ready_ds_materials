---
title: Production RAG architecture
short: RAG architecture & services
subject: sysdesign
group: GenAI system design
order: 1
summary: How a RAG application is actually deployed. The services and stores, the online and ingestion paths, monolith vs microservices for GenAI, where the latency goes, streaming, and security.
minutes: 17
---

The GenAI pages explain **how RAG works**. This page is about **how it's deployed**: which services exist, what talks to what, where the seconds go, and how it stays secure. Expect: "Walk me through the architecture of your RAG system in production."

## 1. The big picture

::viz{name="rag-arch"}

Two paths share the same stores:

**Online (answering), per question:**

1. **UI** → **API gateway** (SSO, rate limit) → **orchestrator**.
2. Orchestrator loads chat history (Postgres/Redis), checks the **answer cache**, rewrites the question.
3. **Retrieval service**: embed query → hybrid search with permission filters → rerank.
4. Orchestrator builds the prompt → **LLM gateway** → model (API or self-hosted vLLM), **streaming** tokens back.
5. **Guardrails** check output; trace + feedback logged.

**Offline (ingestion), when documents change:**

1. New/updated file in S3 or SharePoint → event → **queue**.
2. **Ingestion workers** parse, chunk, embed (batch, often GPU), upsert into the index with metadata and access groups; deletions propagate.

## 2. Monolith or microservices for RAG?

:::analogy
A food truck vs a restaurant chain. A food truck (monolith) is one vehicle doing everything: fast to start, easy to run, but it can only grow so much. A chain (microservices) has a central kitchen, separate delivery, separate billing: each part grows on its own, but you need coordination and managers.
:::

| Component | Keep together at first? | Split out when… |
|---|---|---|
| API + orchestrator + prompt logic | Yes (one Python service) | Rarely needed |
| Ingestion pipeline | Separate from day one (batch, bursty, different failure mode) | Always separate |
| Embedding + reranker models | Call a managed API or one shared service | You self-host on GPUs, or several apps reuse them |
| LLM serving | Use an API, or a separate vLLM deployment | Always separate if self-hosted (GPU, slow start, own scaling) |
| LLM gateway | A library at first | Several apps/teams share models and budgets |

:::remember
**Interview answer:** "A modular monolith for the API and orchestration, plus separately deployed ingestion workers, and separate GPU services for any self-hosted models. Each part that needs different hardware or scaling becomes its own deployment." That's the pattern most real teams use.
:::

## 3. Where the seconds go

::viz{name="latency-budget"}

Rules of thumb:

- **Generation dominates**: hundreds of output tokens at 30–100 tokens/s takes several seconds. Streaming makes the wait feel short: users see words after ~1 s.
- **Every extra LLM call adds ~0.3–1 s**: query rewriting, routing, self-checks. Use a small fast model for these, run independent steps in parallel, skip them when not needed.
- **Retrieval is usually 100–400 ms** with reranking; cache it for repeated questions.
- **Time to first token (TTFT)** grows with prompt length: fewer, better chunks help latency and cost.

## 4. Streaming the answer

- **Server-Sent Events (SSE)**: a one-way stream from server to browser over normal HTTP; simplest for chat.
- **WebSockets**: two-way, for interactive agents (user can interrupt, approve steps).
- The orchestrator must be **async** (Python `asyncio`, FastAPI `StreamingResponse`) so one pod can hold hundreds of open streams while waiting on the LLM.
- Load balancers and gateways need longer idle timeouts (e.g. 60–300 s) for streams.

```python
# FastAPI: stream tokens to the browser with Server-Sent Events
from fastapi import FastAPI
from fastapi.responses import StreamingResponse

app = FastAPI()

@app.post("/chat")
async def chat(q: Question, user=Depends(current_user)):
    chunks = await retrieval.search(q.text, user_groups=user.groups, k=5)   # permission-filtered
    prompt = build_prompt(q.text, chunks, history=await history.load(q.thread_id))
    async def events():
        async for token in llm_gateway.stream(prompt, model="answer-large"):
            yield f"data: {token}\n\n"
        yield f"data: [SOURCES] {cite(chunks)}\n\n"
    return StreamingResponse(events(), media_type="text/event-stream")
```

## 5. Security and compliance

| Risk | Control |
|---|---|
| Users seeing documents they shouldn't | Store access groups as chunk metadata; filter **inside** the retrieval query using the user's identity from SSO; never rely on the LLM to hide content |
| PII or confidential data going to an external LLM | Enterprise agreements (no training on your data, regional hosting), PII redaction, or self-hosted models for the most sensitive data |
| Prompt injection via documents | Treat retrieved text as data; least-privilege tools; output validation |
| Secrets in code or images | Secrets manager (AWS Secrets Manager, Key Vault); workload identity |
| Network exposure | Private endpoints/VPC for the vector DB, Postgres and model endpoints; only the gateway is public |
| Audit | Log who asked what, which documents were used, which model version answered |

## 6. Deploying it (a typical AWS shape)

- **EKS** cluster with: a CPU node group for API/orchestrator pods, a GPU node group for embeddings/reranker/vLLM (if self-hosted), and ingestion workers as Jobs or a separate deployment.
- **Managed stores**: RDS/Aurora Postgres, ElastiCache Redis, OpenSearch (hybrid search) or a managed vector DB, S3 for documents.
- **LLM**: Bedrock / Azure OpenAI with provisioned or regional quota, or vLLM on GPUs.
- **Infra as code**: Terraform; **CI/CD**: GitHub Actions builds images → ECR → Argo CD/Helm deploys to staging then production; offline evaluation suite as a gate.
- **Observability**: LangSmith/Langfuse for LLM traces; Prometheus/Grafana or CloudWatch/Datadog for service metrics; alerts on latency, error rate, 429s and cost.

:::say
"In production, RAG is a few services around shared stores: a gateway for SSO and rate limits, an async orchestrator that streams answers over SSE, a retrieval service doing permission-filtered hybrid search and reranking, an LLM gateway for routing, fallbacks and cost tracking, and separately deployed ingestion workers fed by a queue. Postgres holds conversations and audit, Redis holds caches and sessions, and the vector index holds chunks with access metadata. I keep API and orchestration as a modular monolith and split out anything needing GPUs or different scaling. Most latency is generation, so I stream, keep prompts lean and use small models for auxiliary calls."
:::
