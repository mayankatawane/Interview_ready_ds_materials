---
title: "Case study: an enterprise GenAI copilot for 5,000 users"
short: "Case: GenAI copilot at scale"
subject: sysdesign
group: GenAI system design
order: 5
summary: A complete worked answer to "Design a GenAI assistant for 5,000 employees" using a pharma field-force copilot, with requirements, numbers, architecture, model and cache choices, security, evaluation, rollout and cost.
minutes: 18
---

**The question:** "Design a GenAI copilot for a pharma company's 5,000 sales reps and managers. They should ask questions about sales performance, doctors (HCPs) and product information in plain English." This is close to real work, so it's a great story to tell. Same structure as any design round.

## 1. Clarify

| Question | Assumed answer |
|---|---|
| Users | 5,000 reps and managers across India; mobile + laptop; English (some Hindi) |
| Question types | ~50% numbers ("my territory's Brand A growth vs last quarter"), ~35% documents ("approved dosing message for elderly patients"), ~15% both ("which of my top doctors dropped and what did my last visit notes say?") |
| Data | Sales and prescription tables in the warehouse (Databricks), CRM call notes, approved product documents and FAQs |
| Permissions | A rep only sees their territory; managers their region; only approved promotional content |
| Latency | First words within ~2 s; full answer within ~10 s for most questions |
| Accuracy | Numbers must be exact (no estimates); every claim cited; compliance-safe wording |
| Constraints | Data stays in-region; enterprise LLM agreement; audit trail |

## 2. Success metrics

- **Business**: weekly active users, questions per rep, time saved vs building reports, adoption of suggested actions.
- **Quality**: answer correctness on a golden set (SQL result accuracy, faithfulness of document answers), citation accuracy, refusal when unsure, compliance violations = 0.
- **System**: p95 time to first token < 2 s, success rate > 99%, cost per question.

## 3. Estimate

5,000 users, 30% in the peak hour (Monday mornings), 3 questions each = 4,500 questions/hour = **1.25/s**. ~3 LLM calls per question (route, generate SQL or answer, summarise) ≈ 3.75 calls/s; ~3,000 input tokens each ≈ **675,000 input tokens/minute**, ~350 output tokens each ≈ **79,000 output tokens/minute**. ~10 questions in flight.

Data: warehouse tables (billions of rows, queried via SQL, not embedded); ~20,000 documents → ~400,000 chunks (small for a vector index).

## 4. Architecture

1. **Clients**: web app + mobile, SSO (Azure AD/Okta), streaming via SSE.
2. **API gateway**: auth, per-user rate limits (e.g. 30 questions/10 min).
3. **Agent service (LangGraph)** on EKS, async; queue + workers for long analytical runs:
   - **Router** (small LLM): numbers, documents, or both?
   - **Text-to-SQL tool**: generates SQL against a curated semantic layer (approved tables, metric definitions) with row-level security by territory; read-only; validated before execution; results summarised. (Databricks Genie or a custom text-to-SQL chain.)
   - **Document RAG tool**: hybrid search over approved content with metadata filters (product, approval status, date), rerank, cited answers.
   - **Knowledge graph tool** (optional): HCP–account–territory relationships for questions like "doctors affiliated with this hospital" (e.g. Memgraph/Neo4j).
   - **Entity extraction**: brand, HCP, territory and time-period names normalised to IDs (a fine-tuned small model or LLM with a lookup).
4. **LLM gateway**: large model for final answers, small model for routing and extraction, fallback region, token accounting per business unit.
5. **Stores**: Postgres (threads, checkpoints, feedback, audit), Redis (cache, sessions, pub/sub), vector index (OpenSearch or Databricks Vector Search), S3 (documents).
6. **Ingestion**: nightly sync of approved documents and CRM notes → parse, chunk, embed, upsert; deleted or expired content removed.
7. **Guardrails**: compliance filter (no off-label claims), PII checks, citation validation, "I don't know" when data is missing.
8. **Observability and evaluation**: tracing, dashboards, golden-set evaluation in CI, weekly review of thumbs-down answers.

## 5. Deep dives interviewers pick

### Getting numbers right

- Never let the LLM do arithmetic from memory: **SQL computes, the LLM explains**.
- A **semantic layer** (named metrics like `trx_growth_qoq` with fixed SQL definitions) dramatically improves text-to-SQL accuracy vs raw tables.
- Validate generated SQL: allowed tables only, LIMIT, no writes, cost check (EXPLAIN); show the SQL or the metric definition behind each number.
- Golden set of 200+ question → expected result pairs, run on every change.

### Permissions

The user's territory and role come from SSO and are applied **in the data layer** (row-level security in SQL, metadata filters in retrieval), never by asking the LLM to hide data.

### Latency

Route with a small model (~0.4 s), run SQL and retrieval **in parallel** for "both" questions, stream the answer, cache frequent manager questions (e.g. weekly region summary, refreshed when data loads).

## 6. Failure handling

| Failure | Response |
|---|---|
| SQL generation fails validation | Retry once with the error message; then ask a clarifying question |
| Warehouse slow | Timeout at 10 s, tell the user, offer to send results when ready (background run) |
| LLM provider 429/outage | Fallback region/model via gateway; degrade to search results only |
| No relevant documents | Say so; don't answer from model memory for product claims |

## 7. Rollout and cost

1. **Pilot**: 50 users in one region, heavy feedback collection, eval set grows from real questions.
2. **Expand**: one business unit (500) → load test at 2× expected peak → all 5,000.
3. **Cost (illustrative)**: 4,500 peak-hour questions → maybe 25,000/day × ~$0.01 ≈ $250/day ≈ $7,500/month on LLM tokens; routing, prompt caching and caching can cut this substantially. Compare with time saved: 5,000 users × 15 minutes/week saved is ~1,250 hours/week.

:::say
"I'd clarify user types, question mix, permissions and latency first. For 5,000 users the peak is about one to two questions a second but hundreds of thousands of tokens per minute, so capacity planning is about LLM quota. The design is a LangGraph agent on EKS behind SSO and a gateway: a small model routes to a text-to-SQL tool over a governed semantic layer with row-level security for numbers, and a hybrid RAG tool over approved content for documents, run in parallel when both are needed, with answers streamed and cited. An LLM gateway handles model routing, fallbacks and cost tracking; Postgres holds checkpoints and audit; Redis caches. Quality is enforced with a golden set in CI, guardrails for compliance, and a staged rollout from a 50-user pilot."
:::
