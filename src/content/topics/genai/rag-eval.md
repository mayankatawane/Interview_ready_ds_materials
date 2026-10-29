---
title: Evaluating RAG and LLM apps
short: RAG evaluation
subject: genai
group: RAG
order: 5
summary: Measure retrieval and generation separately. Recall@k, MRR and nDCG for retrieval; faithfulness, answer relevance and context metrics for generation; golden sets, LLM-as-judge and online monitoring.
minutes: 18
---

"How would you evaluate your RAG system?" is guaranteed. A strong answer separates **retrieval** from **generation**, names concrete metrics, explains how the test set was built, and how an LLM judge is validated.

## 1. The golden rule: evaluate the stages separately

If an answer is wrong, the cause is one of:

1. **Retrieval**: the right chunk never reached the prompt.
2. **Generation**: the right chunk was there, but the LLM ignored it, misread it or added things.

An end-to-end "answer correct?" score alone can't tell you which to fix.

:::worked
**Diagnosing.** For 100 failed questions, check whether the gold chunk was in the retrieved context.

- Gold chunk present in 30 → 30 generation failures (prompt, model, context ordering).
- Missing in 70 → 70 retrieval failures (chunking, hybrid search, reranker, query rewriting).

Fix retrieval first: it's the bigger bucket and generation can't recover what isn't there.
:::

## 2. Building the evaluation set ("golden set")

- **Real user questions** (from logs or pilot users) are the most valuable.
- **Synthetic questions**: ask an LLM to write questions answerable from each chunk; this automatically gives you the gold chunk. Have experts review a sample and remove trivial or ambiguous ones.
- Include **hard cases**: multi-hop questions, questions with no answer in the corpus (the system should say "I don't know"), ambiguous questions, exact-ID questions, outdated-vs-current versions.
- Typical size: 100–500 to start; grow it with every production failure you find.
- **Freeze and version it**, so changes are compared on the same test.

## 3. Retrieval metrics

You need, for each question, the IDs of the relevant chunks.

| Metric | Question it answers | Formula / idea |
|---|---|---|
| **Recall@k** (hit rate) | Did we find the relevant chunk(s) in the top k? | relevant found in top k ÷ total relevant |
| **Precision@k** | How much of the top k is relevant? | relevant in top k ÷ k |
| **MRR** | How high is the first relevant result? | average of 1 / rank of the first relevant hit |
| **nDCG@k** | Are the most relevant results near the top (graded relevance)? | discounted gain ÷ ideal discounted gain |

:::worked
Three questions; rank of the first relevant chunk: 1, 3, not in the top 5.

- Hit rate@5 $= 2/3 = 0.67$
- MRR $= (1/1 + 1/3 + 0)/3 = 1.333/3 = $ **0.44**
:::

:::remember
For RAG, **recall matters more than precision at the retrieval stage**: a missed chunk is unrecoverable, while an extra irrelevant chunk is filtered by the reranker or ignored by the LLM. Precision matters more for the final few chunks in the prompt. (See ML → Ranking metrics for nDCG with numbers.)
:::

## 4. Generation metrics

| Metric | Question | How it's measured |
|---|---|---|
| **Faithfulness / groundedness** | Is every claim in the answer supported by the retrieved context? | Split the answer into claims; an LLM judge checks each against the context; score = supported ÷ total |
| **Answer relevance** | Does the answer address the question? | LLM judge, or generate questions from the answer and compare with the original |
| **Context precision** | Are the relevant chunks ranked high in the context? | Judge or labels |
| **Context recall** | Does the context contain everything needed for the reference answer? | Compare the reference answer's claims with the context |
| **Answer correctness** | Does it match the reference answer? | Judge with a rubric, or semantic similarity; exact match for short factual answers |
| **Citation accuracy** | Do the cited sources actually support the sentence? | Judge or rules |
| **Refusal behaviour** | Says "I don't know" when the answer isn't in the corpus? | Unanswerable questions in the set |

:::worked
The answer makes 5 claims; the judge finds 4 supported by the context. **Faithfulness = 4/5 = 0.8.** The unsupported claim is a hallucination even if it happens to be true.
:::

:::trap
**High faithfulness but users still complain?** Faithfulness only says "the answer sticks to the context". If the context itself is wrong, outdated or incomplete, the answer is faithfully wrong. Check **context recall/relevance** and freshness of the index.
:::

Frameworks: **RAGAS**, DeepEval, TruLens, LangSmith, Arize Phoenix. They implement these metrics, mostly with LLM judges.

## 5. LLM-as-a-judge, done properly

An LLM grades answers using a clear rubric. Cheap and scalable, but it has biases:

- **Position bias**: prefers the first (or second) answer in a pairwise comparison → swap the order and average.
- **Verbosity bias**: prefers longer answers → rubric says length doesn't matter; control for length.
- **Self-preference**: favours its own model family → use a different, strong model as judge.
- **Inconsistency** → temperature 0, ask for reasoning then a score, use simple scales (pass/fail or 1–5 with definitions).

**Validate the judge**: have experts label 100–200 examples and measure agreement with the judge (e.g. accuracy or Cohen's kappa). Only trust the judge where agreement is high, and recheck periodically.

## 6. Offline vs online evaluation

| Offline (before release) | Online (in production) |
|---|---|
| Golden set; all metrics above; regression tests in CI for every prompt, model, chunking or index change | User feedback (thumbs, edits, copy rate), escalation to humans, follow-up rephrasing as a failure signal |
| Compare variants side by side | Sampled LLM-judge scoring of live traffic; A/B tests |
| Latency and cost per query | Latency (p50/p95), cost, error rates, retrieval score drift, "no answer" rate |

Every production failure becomes a new golden-set example.

```python
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy, context_precision, context_recall
from datasets import Dataset

data = Dataset.from_dict({
    "question": questions,
    "answer": generated_answers,
    "contexts": retrieved_contexts,        # list of lists of chunk texts
    "ground_truth": reference_answers,
})
print(evaluate(data, metrics=[faithfulness, answer_relevancy, context_precision, context_recall]))
```

:::say
"I evaluate retrieval and generation separately. I build a frozen golden set from real questions plus reviewed synthetic ones, including multi-hop and unanswerable cases, with gold chunk IDs. Retrieval gets recall at k, MRR and nDCG; recall matters most there since a missed chunk can't be recovered. Generation gets faithfulness, answer relevance, correctness against references and citation accuracy, scored by an LLM judge that I validate against expert labels and de-bias by swapping order and using a different model family. Every change runs against this set in CI, and online I track feedback, escalations, latency, cost and sampled judge scores, feeding failures back into the set."
:::
