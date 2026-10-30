---
title: The building blocks, explained with a restaurant
short: Building blocks
subject: sysdesign
group: Foundations
order: 2
summary: Load balancers, API gateways, stateless services, caches, queues, databases and object storage, explained with one restaurant analogy. Monolith vs microservices, and sync vs async.
minutes: 14
---

Every system design answer uses the same dozen building blocks. Learn what each one is **for**, and you can assemble any design. We'll use one restaurant as the analogy throughout.

## 1. Follow one request

::viz{name="journey-basic"}

## 2. The blocks

| Block | Restaurant analogy | Job | Typical tech |
|---|---|---|---|
| **Client** | The customer | Sends requests | Web app, mobile app, another service |
| **CDN** | Menu stand at the entrance | Serves static files from near the user | CloudFront, Akamai, Azure Front Door |
| **Load balancer** | Host at the door | Spreads requests across identical servers; skips unhealthy ones | AWS ALB, NGINX, Kubernetes Service |
| **API gateway** | Manager checking reservations | Authentication, rate limits, routing, logging | Kong, AWS API Gateway, Azure APIM |
| **Service** | Waiters and cooks | Your business logic / model | FastAPI in Docker |
| **Cache** | Ready-made dishes on the counter | Fast answers for repeated requests | Redis, Memcached |
| **Queue / stream** | Order tickets on a rail | Hand work to someone else without waiting | Kafka, SQS, RabbitMQ, Pub/Sub |
| **Worker** | Kitchen staff working through tickets | Processes queued jobs in the background | Celery, Kubernetes jobs, Lambda |
| **Relational database** | The accounts ledger | Durable, consistent records with joins | PostgreSQL, MySQL, SQL Server |
| **NoSQL / key-value** | Coat-check tags | Very fast lookups by key, flexible shape | DynamoDB, Cassandra, MongoDB, Redis |
| **Object storage** | The warehouse | Cheap storage for files: documents, models, raw data | S3, ADLS, GCS |
| **Vector database** | A librarian who finds books "like this one" | Similarity search over embeddings | OpenSearch, pgvector, Qdrant, Pinecone |
| **Data warehouse / lakehouse** | The back-office analytics room | Large-scale analytics and training data | Databricks, Snowflake, BigQuery |

## 3. Stateless services: the key to scaling

A service is **stateless** if it keeps nothing between requests: user sessions, chat history and agent state live in Redis or a database. Then:

- Any copy can answer any request, so a load balancer can spread traffic freely.
- To handle more traffic, **add copies** (horizontal scaling).
- If a copy crashes, nothing is lost.

:::analogy
If the order is written on a ticket (database), any waiter can bring the food. If it's only in one waiter's head (in-memory state), that waiter must serve that table forever, and if they go home the order is lost.
:::

## 4. Synchronous vs asynchronous

| | Synchronous (request–response) | Asynchronous (queue) |
|---|---|---|
| How | Caller waits for the answer | Caller drops a job on a queue and gets a ticket number; a worker processes it later |
| Good for | Fast operations the user is waiting for (< a few seconds): a fraud score, a search | Slow or bursty work: indexing documents, batch scoring, long agent runs, sending emails |
| Risk | One slow dependency makes everything slow | More moving parts; results arrive later |

Queues also **absorb spikes**: if 10,000 documents are uploaded at once, they wait in the queue while workers process them at a steady pace, instead of crashing the service.

## 5. Monolith vs microservices

| | Monolith | Microservices |
|---|---|---|
| What | One deployable application containing all features | Several small services, each deployed and scaled separately, talking over the network |
| Pros | Simple to build, test, deploy and debug; no network calls between parts | Scale parts independently (GPU embedding service vs CPU API); teams deploy independently; isolate failures |
| Cons | Everything scales together; one bad change can take down all of it | Network latency, more infrastructure, harder debugging, needs good observability |
| Best when | Small team, early product, MVP | Parts have very different scaling or hardware needs, or several teams own parts |

:::remember
**A good default answer: start with a "modular monolith"** (one service, cleanly separated modules) and split out a part into its own service when it has a clear reason: different hardware (GPU), very different scaling, or a separate team. For GenAI apps, the usual first splits are: the **LLM serving** (GPU), **embedding/rerank** (GPU), and **ingestion workers** (batch), while the API and orchestration stay together.
:::

## 6. Consistency, availability and failure

- **Replication**: keep copies of data on several machines so one failure doesn't lose it.
- **Health checks and retries**: the load balancer stops routing to failing copies; clients retry with exponential back-off (wait 1 s, 2 s, 4 s…), only for idempotent operations.
- **Timeouts everywhere**: never wait forever on a dependency.
- **Circuit breaker**: if a dependency keeps failing, stop calling it for a while and use a fallback (cached answer, simpler model, "try again later").
- **Graceful degradation**: if the reranker is down, serve un-reranked results rather than an error.

:::say
"I build designs from standard blocks: a gateway for auth and rate limiting, stateless services behind a load balancer so I can scale horizontally, Redis for caching and sessions, a queue with workers for slow or bursty work, Postgres for durable records, object storage for files, and a vector index for retrieval. I'd start as a modular monolith and split out components with different scaling or hardware needs, typically GPU model serving and ingestion workers. Every external call gets a timeout, retries with back-off and a fallback."
:::
