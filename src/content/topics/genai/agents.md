---
title: LLM agents and tool use
short: Agents & tool calling
subject: genai
group: Agents and production
order: 1
summary: What makes an LLM an agent, function calling, the ReAct loop, memory, planning, multi-agent patterns, orchestration with LangGraph and MCP, and how to keep agents reliable and safe.
minutes: 18
---

Agent questions: "what is an agent vs a chain?", "how does tool calling work?", "explain ReAct", "how do you stop an agent looping?", "how do you evaluate agents?" and "single vs multi-agent?". Ground every answer in a system you built.

## 1. Workflow vs agent

| | Workflow (chain) | Agent |
|---|---|---|
| Who decides the steps | You, in code: fixed path | The LLM, at run time, in a loop |
| Predictability | High; easy to test | Lower; more flexible |
| Cost and latency | Lower | Higher (several LLM calls) |
| Use when | The steps are known (extract → classify → summarise) | The path depends on the question, needs several tools or retries |

:::remember
Start with the simplest thing that works: a single prompt, then a fixed workflow, and only then an agent. Many "agent" problems are better solved with a well-designed workflow plus one or two routing decisions.
:::

An **agent** = an LLM + **tools** + a **loop** (+ memory): it decides an action, a tool runs, the result comes back, and it decides again until it can answer.

## 2. Tool (function) calling

1. You describe each tool to the model: name, what it does, and a JSON schema for its inputs.
2. The model replies either with text, or with a structured **tool call**: `{"name": "query_trials", "arguments": {"drug": "pembrolizumab", "phase": 3}}`.
3. **Your code** runs the tool (the model never executes anything itself) and sends the result back as a message.
4. The model continues: another tool call, or the final answer.

:::trap
**"The LLM runs the SQL query."** No. The model only produces the call; your application validates and executes it. That's where you enforce permissions, read-only access, timeouts and input validation.
:::

Good tool design: clear names and descriptions (the model chooses from these), few tools with distinct purposes, strict input schemas, concise and informative outputs (including helpful error messages so the model can recover), and idempotent, least-privilege actions.

## 3. The ReAct loop (Reason + Act)

The model alternates **Thought** (reasoning about what to do), **Action** (a tool call) and **Observation** (the tool's result), until it gives a final answer.

::viz{name="react-trace"}

:::worked
**Question:** "Which phase 3 oncology trials of drug X started after 2022, and what was their primary endpoint?"

1. **Thought:** I need trials filtered by drug, phase and date → use the SQL tool.
2. **Action:** `sql_query("SELECT trial_id, start_date FROM trials WHERE drug='X' AND phase=3 AND start_date > '2022-12-31'")`
3. **Observation:** 3 trials: T1, T2, T3.
4. **Thought:** Endpoints are in the protocol documents → search them.
5. **Action:** `search_docs("primary endpoint T1 T2 T3")`
6. **Observation:** T1: overall survival; T2: progression-free survival; T3: objective response rate.
7. **Final answer** with the three trials, endpoints and citations.
:::

## 4. Building blocks

- **Planning**: plan-then-execute (write a step list first, then run it, re-plan on failure) or step-by-step ReAct. Reflection: the agent critiques and revises its own output.
- **Memory**:
  - *Short-term*: the conversation and tool results in the context window (summarise or trim as it grows).
  - *Long-term*: facts and preferences saved to a store and retrieved later (often a vector store).
  - *State*: structured data the workflow carries between steps (e.g. LangGraph state).
- **Routing**: a classifier or LLM call that sends a request to the right tool, sub-agent or pipeline.
- **Human in the loop**: pause for approval before risky actions (sending, writing, deleting, spending).

## 5. Multi-agent patterns

| Pattern | How | When |
|---|---|---|
| **Supervisor / orchestrator–workers** | A coordinator agent delegates sub-tasks to specialist agents and merges results | Distinct skills (SQL agent, document agent, graph agent) |
| **Sequential pipeline** | Agents hand off in a fixed order | Clear stages (research → write → review) |
| **Parallel + aggregate** | Several agents work on parts at once; results combined | Independent sub-questions |
| **Debate / critic** | One agent drafts, another critiques | Quality-critical output |

Multi-agent adds cost, latency and new failure points (lost context in hand-offs). Use it when specialisation clearly helps, not by default.

## 6. Orchestration frameworks and protocols

- **LangGraph**: agents as a **graph** of nodes (LLM calls, tools) and edges (including conditional ones), with explicit shared state, loops, checkpoints and human-in-the-loop interrupts. Good for controllable production agents.
- **LangChain, LlamaIndex**: building blocks for chains and RAG. **CrewAI, AutoGen**: multi-agent conversations.
- **MCP (Model Context Protocol)**: an open standard for exposing tools and data sources to any compatible LLM application through a common interface ("USB-C for tools"), so a tool server is written once and reused.

## 7. Making agents reliable

| Problem | Fix |
|---|---|
| Infinite loops, runaway cost | Max iterations, token/cost budgets, timeouts; detect repeated identical calls |
| Wrong tool or bad arguments | Better tool descriptions; fewer tools; schema validation with error messages; few-shot examples |
| Error compounding over many steps | Shorter paths; checkpoints; validate intermediate results; plan-then-execute |
| Tool failures | Retries with back-off; fallbacks; clear errors returned to the model |
| Context overflow | Summarise history; return concise tool outputs; store details outside the prompt |
| Prompt injection via tool results or documents | Treat tool output as data; least privilege; human approval for side effects |
| Hard to debug | Trace every step (LangSmith, Langfuse, Phoenix): inputs, outputs, tool calls, tokens, latency |

### Evaluating agents

- **Final outcome**: task success rate on a test set of realistic tasks (with a judge or programmatic checks).
- **Trajectory**: did it call the right tools with valid arguments, in a sensible order, without unnecessary steps?
- **Efficiency**: steps, tokens, cost and latency per task.
- **Safety**: no forbidden actions; correct refusals and escalations.

```python
from langgraph.prebuilt import create_react_agent
from langchain_core.tools import tool

@tool
def query_trials(drug: str, phase: int) -> str:
    """Return trial IDs and start dates for a drug and phase from the trials database."""
    return run_readonly_sql(drug, phase)          # your validated, read-only implementation

@tool
def search_docs(query: str) -> str:
    """Search trial protocol documents and return the top passages with source IDs."""
    return hybrid_search(query, k=5)

agent = create_react_agent("openai:gpt-4o", tools=[query_trials, search_docs])
result = agent.invoke({"messages": [("user", "Phase 3 trials of drug X after 2022 and their endpoints?")]},
                      config={"recursion_limit": 10})          # cap the number of steps
```

:::say
"An agent is an LLM in a loop with tools: it decides on an action, my code executes the tool, and the observation goes back until it can answer, which is the ReAct pattern. I prefer fixed workflows when the steps are known and use agents only where the path depends on the question. In the MSD oncology copilot I built a LangGraph agent that routed between a knowledge graph, SQL over trial data and document RAG, with typed tool schemas, read-only access, step and cost limits, and full tracing. I evaluate agents on task success, tool-call correctness, steps and cost per task, and safety, using a fixed set of realistic tasks."
:::
