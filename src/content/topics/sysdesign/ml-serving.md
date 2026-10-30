---
title: Serving models — batch, real-time, streaming
short: Serving & safe releases
subject: sysdesign
group: ML system design
order: 2
summary: How predictions reach users. Choosing batch vs real-time vs streaming, what a real-time scoring path looks like, latency budgets, model formats, and releasing new models with shadow, canary, blue–green and A/B tests.
minutes: 15
---

"How will predictions be served?" is the first fork in every ML design. The answer depends on **when the decision is made**, not on the model.

## 1. Three ways to serve

| | Batch | Real-time (online) | Streaming |
|---|---|---|---|
| How | A scheduled job scores many rows and writes results to a table | An API scores one request when asked | Scores events as they flow through a stream |
| Latency | Hours (results ready by morning) | Milliseconds to a second | Sub-second, continuous |
| Example | Monthly churn list for the retention team; nightly HCP prioritisation for field reps; lapse-risk scores for insurance renewals | Loan application decision; claim triage at submission; product recommendations on a page | Card fraud on every transaction; sensor anomaly detection |
| Infra | Spark/Databricks job → table | Containerised API + online feature store + load balancer | Kafka/Kinesis + Flink/Spark Structured Streaming + online store |
| Cost & complexity | Lowest | Medium | Highest |

:::remember
**Use the simplest one the decision allows.** If the business acts once a day, batch is enough, even if the model is fancy. Interviewers like hearing: "I'd start with batch scoring and move to real-time only for the decisions that need it."
:::

Hybrid is common: **precompute** heavy features in batch (customer history aggregates) and compute only **fresh** features at request time (this transaction's amount and location).

## 2. A real-time scoring path

1. Request arrives with an ID and fresh inputs (e.g. claim amount, garage ID).
2. **Fetch features** by key from the online feature store (customer history, garage risk), 2–10 ms.
3. **Compute fresh features** in the request (ratios, time since policy start).
4. **Predict** with the model already loaded in memory, ~1–5 ms for gradient boosting.
5. **Explain** (optional): top SHAP reasons, a few ms with TreeSHAP.
6. **Return** score, reasons, model version; **log** inputs and outputs asynchronously for monitoring.

:::worked
**Latency budget for a 200 ms target (p99):** gateway + auth 15 ms, feature lookups 20 ms, feature computation 5 ms, model 5 ms, SHAP 10 ms, logging async 0 ms, network 20 ms = **75 ms**, leaving headroom for slow tails. The usual bottleneck is a slow feature lookup or an external API (credit bureau), not the model. Add timeouts and fallbacks for those.
:::

### Model formats

- **joblib/pickle**: simplest for scikit-learn/XGBoost in Python; must use the same library versions.
- **Native formats** (XGBoost JSON/UBJ, LightGBM text): version-stable, fast.
- **ONNX**: a portable format; fast inference with ONNX Runtime, usable from Java/C# services (banks often run Java). Check that ONNX predictions match the original within a tiny tolerance.
- **MLflow model**: wraps any of these with its environment, deployable to many targets.

## 3. Releasing a new model safely

A new model can be worse in production even if it was better offline (skew, drift, a bug). Release strategies limit the damage.

::viz{name="deploy-strategies"}

| Strategy | In one line |
|---|---|
| **Shadow** | New model scores every request in parallel, but its output is only logged |
| **Canary** | Send 1% → 5% → 25% → 100% of traffic to the new model, watching metrics at each step |
| **Blue–green** | Two full environments; switch all traffic at once; switch back instantly if needed |
| **A/B test** | Random split for weeks; compare a business metric with a statistical test |
| **Champion–challenger** | Banking term: the challenger runs in shadow or on a small share until it proves better, then becomes champion |

Rollback should take seconds: keep the old version deployed and switch traffic back at the router or registry alias.

:::trap
**"Why not just A/B test everything?"** A/B tests take weeks and expose real users to a possibly worse model. For a pure bug-risk check, shadow + canary is faster. A/B is for measuring business impact (did approval rate or fraud losses change?). And in regulated decisions (credit), random assignment itself may need approval.
:::

## 4. Batch scoring done well

- Score **all** entities, write to a table with `score_date`, `model_version`, and the top reasons.
- Make the job **idempotent**: re-running it for a date overwrites that date's scores instead of duplicating them.
- Validate before publishing: row counts, score distribution vs last run (PSI), null checks. If checks fail, keep yesterday's scores and alert.
- Downstream systems (CRM, claims system) read the table or receive a file/API push.

```python
# Databricks/PySpark: nightly batch scoring with an MLflow model
import mlflow
score = mlflow.pyfunc.spark_udf(spark, "models:/claims_fraud@champion")     # registry alias
feats = spark.table("features.claims_daily").where("snapshot_date = current_date()")
out = feats.withColumn("fraud_score", score(*feature_cols)) \
           .withColumn("model_version", lit(version)).withColumn("score_date", current_date())
out.write.mode("overwrite").option("replaceWhere", "score_date = current_date()") \
   .saveAsTable("scores.claims_fraud")
```

:::say
"I choose the serving mode from when the decision is made: batch for daily or weekly decisions like churn lists, a real-time API when the decision happens during a user action like a loan application, and streaming for per-event decisions like card fraud. A real-time path fetches precomputed features from an online store, computes fresh ones, scores a model held in memory and logs asynchronously, within a latency budget where external lookups are usually the bottleneck. New models go out in shadow first, then as a canary with automatic rollback; A/B tests are for measuring business impact."
:::
