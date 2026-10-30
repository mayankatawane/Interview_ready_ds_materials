---
title: From notebook to production
short: The ML production lifecycle
subject: sysdesign
group: ML system design
order: 1
summary: What happens after you train a good XGBoost model. The pieces of a production ML system (pipelines, feature store, tracking, registry, CI/CD, serving, monitoring), training–serving skew, and the MLOps maturity levels.
minutes: 15
---

You trained a Random Forest or XGBoost model with great validation AUC. Interviewers now ask: **"How would this actually be used in production?"** The honest answer: the model is a small part. Google's well-known paper *Hidden Technical Debt in ML Systems* drew the ML code as a tiny box surrounded by data collection, feature extraction, serving, monitoring and configuration.

## 1. The pieces

::viz{name="ml-arch"}

In words, the life of a model:

1. **Data pipelines** pull from source systems (policy admin, claims, core banking, EHR), clean and join, on a schedule.
2. **Features** are computed once in shared code and stored with timestamps in a **feature store**: an offline copy for training, an online copy for live lookups.
3. A **training pipeline** (a job, not a notebook) builds a dataset as of a cutoff date, trains, tunes and evaluates on a time-based holdout.
4. **Experiment tracking** (MLflow) logs data version, parameters, metrics and the model file for every run.
5. The best model is registered in a **model registry**, reviewed and approved (in regulated industries, by an independent validator).
6. **CI/CD** tests the code, checks the model beats the current champion, builds a container and deploys it.
7. **Serving**: batch scores written to a table, or a real-time API.
8. The **business application** turns scores into decisions (rules, thresholds, human review).
9. **Monitoring** watches the service, the data and the model; **outcomes** come back as labels; **retraining** closes the loop.

## 2. Training–serving skew: the silent killer

**Skew** = the model sees features in production that are computed differently from training. Accuracy drops with no error message.

| Cause | Example | Prevention |
|---|---|---|
| Two code paths | Training uses a Spark SQL version of `days_since_last_claim`; the API reimplements it in Python with a different date rule | One shared feature library, or a feature store used by both |
| Time travel (leakage) | Training joins the customer's **current** risk segment, which was assigned after the claim | Point-in-time joins: only use values known at prediction time |
| Missing-value handling | Training filled NaN with the median; the API sends 0 | Ship preprocessing inside the model artefact (sklearn Pipeline / saved transformers) |
| Different library versions | XGBoost 1.7 in training, 2.1 in serving | Pin versions; build the serving image from the training environment |

:::trap
**"My offline AUC was 0.92, production performance is much worse."** Before blaming drift, check for leakage in training and training–serving skew: log the live features and compare them with what the offline pipeline would compute for the same entity and time.
:::

## 3. Reproducibility: can you rebuild it?

For any production model you should be able to answer: which **code commit**, which **data snapshot**, which **parameters**, which **library versions**, who **approved** it and when. Tools: Git, Delta Lake time travel / DVC for data, MLflow for runs and models, Docker images for environments. In banking and insurance, regulators and auditors ask exactly these questions.

## 4. What tools do what

| Need | Databricks world | AWS world | Open source |
|---|---|---|---|
| Pipelines & scheduling | Workflows, Delta Live Tables | Glue, Step Functions, MWAA (Airflow) | Airflow, Prefect, dbt |
| Feature store | Databricks Feature Store (Unity Catalog) | SageMaker Feature Store | Feast |
| Tracking & registry | MLflow (managed) | SageMaker Experiments & Model Registry | MLflow |
| Serving | Model Serving, batch jobs | SageMaker endpoints / batch transform, EKS | FastAPI, BentoML, KServe, Seldon |
| Monitoring | Lakehouse Monitoring | SageMaker Model Monitor, CloudWatch | Evidently, Prometheus + Grafana |

## 5. MLOps maturity (a nice way to frame answers)

| Level | What it looks like |
|---|---|
| 0 · Manual | Notebook → model.pkl emailed to engineering; manual deployment; no monitoring |
| 1 · Pipeline automation | Training is a scheduled pipeline; models registered; batch or API serving; basic monitoring |
| 2 · CI/CD for ML | Code, data and model tests run automatically; automated deployment with approval gates; drift-triggered retraining; champion–challenger |

:::remember
In interviews, say where you'd start (level 1 for a first model, quickly) and what you'd add as it proves value. Over-engineering a first model is as much a red flag as a notebook in production.
:::

:::say
"Productionising a model means turning the notebook into pipelines: scheduled data and feature pipelines with point-in-time correctness, ideally a feature store shared by training and serving to avoid skew; a training job logged in MLflow; a model registry with approval; CI/CD that tests code and data and only promotes a model that beats the champion; batch or real-time serving in a container; and monitoring of service health, data drift and performance once labels arrive, which triggers retraining. I'd always make sure I can reproduce any production model from code, data snapshot and environment."
:::
