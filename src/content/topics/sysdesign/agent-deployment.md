---
title: Deploying AI agents at scale
short: Deploying agents at scale
subject: sysdesign
group: GenAI system design
order: 4
summary: Why agents are harder to run than RAG, and the production pattern that works. Run IDs and queues, stateless workers with checkpoints, streaming progress, tool services and MCP, timeouts and idempotency, human approval, cost limits and evaluation.
minutes: 16
---

A RAG answer takes ~5 seconds and one LLM call. An agent may take 30 seconds to several minutes, call 10 tools, wait for a human's approval, and must not repeat a payment or an email if something crashes. That needs a different deployment shape.

## 1. Why agents are different

| | RAG chat | Agent |
|---|---|---|
| Duration | Seconds | Seconds to minutes (or hours with approvals) |
| LLM calls | 1–3 | 5–50 |
| State | Chat history | Graph state, tool results, plans, pending approvals |
| Side effects | None (read-only) | Can write: update CRM, send email, create tickets |
| Failure impact | Retry the question | Half-done work; duplicated actions |

## 2. The production pattern

::viz{name="journey-agent"}

1. **API service** (stateless, FastAPI): authenticates, creates a `run_id` and `thread_id`, stores the request, **enqueues** the job, returns immediately.
2. **Queue** (SQS, Redis/Celery, Kafka, or the agent platform's built-in queue).
3. **Worker pods** pick up runs and execute the **graph** (LangGraph). Workers are stateless: everything they need is in the checkpoint store.
4. **Checkpointer** (Postgres) saves the graph state after each step, so a crashed run resumes on another worker, and a run paused for human approval can resume hours later.
5. **Streaming**: workers publish progress and tokens to Redis pub/sub; the API relays them to the browser over SSE/WebSocket. If the connection drops, the client reconnects with `run_id` and fetches the current state.
6. **Tools** run as separate services (or MCP servers) with their own permissions, timeouts and logs.
7. **Autoscaling**: API pods on CPU/connections; workers on **queue depth** (KEDA); LLM capacity via the LLM gateway (quota) or vLLM replicas.

:::analogy
A passport office. You submit your form at the counter and get a token (run ID); you don't stand at the counter while it's processed. Clerks (workers) take files from the pile (queue), and after each step they note progress in the file (checkpoint). If a clerk goes home, another picks up the file where it was. A screen shows your token's status (streaming). Some steps need a supervisor's stamp (human approval).
:::

:::remember
In my MSD oncology copilot, this is what the stack looks like: LangGraph orchestrating a Memgraph knowledge graph, a fine-tuned entity-extraction model and Databricks Genie for text-to-SQL, deployed on AWS EKS. Mapping your own project onto this pattern is the strongest interview answer.
:::

## 3. Tools: safe by design

- **Least privilege**: read-only database roles for SQL tools; row-level security by user; scoped API tokens.
- **Validate arguments** against a schema before executing; reject and explain errors back to the model.
- **Timeouts** on every tool (e.g. SQL 10 s); summarise large results before they enter the prompt.
- **Idempotency keys** for anything with side effects (send email, create ticket): derived from run ID + step, so a retry doesn't do it twice.
- **Human approval** before irreversible actions: the graph pauses (interrupt), the checkpoint is saved, a notification goes to the approver, and the run resumes after approval.
- **Sandboxes** for code execution (isolated containers, no network, CPU/time limits).
- **MCP (Model Context Protocol)** servers to expose tools in a standard way, so several agents and apps reuse the same governed tools.

## 4. Keeping cost and loops under control

| Control | Example |
|---|---|
| Step limit | Max 10–15 graph steps (`recursion_limit`) |
| Token / cost budget per run | Stop and summarise at $0.50 or 100k tokens |
| Wall-clock timeout | Fail gracefully after 3 minutes, return partial results |
| Loop detection | Same tool + same arguments twice → stop and ask the user |
| Model routing | Small model for planning/routing, large model for the final answer |
| Result caching | Cache deterministic tool results (same SQL within 15 minutes) |

## 5. Releasing new versions of an agent

An agent "version" = graph code + prompts + tool definitions + model versions. Treat all of them as versioned config.

- Run the **offline evaluation suite** (task success, tool-call correctness, steps, cost, safety) on every change in CI.
- **Pin** the graph version to a run: a run started on v12 finishes on v12, even if v13 is deployed mid-run (important for long or paused runs).
- **Canary** the new version for a share of new runs; compare success rate, cost per run, user feedback.

## 6. Observability

Trace every run (LangSmith, Langfuse, Phoenix, OpenTelemetry): each node, prompt, tool call with arguments and result, tokens, cost, latency, errors. Dashboards: runs per minute, success rate, p95 duration, steps per run, cost per run, tool error rates, queue wait time, human-approval wait time. Alert on queue backlog and worker failures: "requests accepted but never processed" is the classic silent failure.

:::say
"Agents run longer, call many tools and can have side effects, so I don't hold an HTTP request open. The API creates a run, enqueues it and returns a run ID; stateless workers execute the LangGraph graph and checkpoint state to Postgres after every step, so runs survive pod crashes and can pause for human approval. Progress streams to the user via Redis pub/sub and SSE. Tools are separate least-privilege services or MCP servers with timeouts, schema validation and idempotency keys. Workers autoscale on queue depth with KEDA on EKS, and every run has step, token and time budgets, full tracing, and pinned versions so changes ship through evals and canaries."
:::
