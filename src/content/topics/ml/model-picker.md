---
title: Which model when
short: Which model when
subject: ml
group: Start here
order: 2
summary: A defensible answer to "why did you choose this algorithm?" for common situations, with a model picker, use-case table and cheat sheet.
minutes: 10
---

"Why did you pick that model?" comes up in almost every interview. A good answer mentions the **data** (size, type, missing values, categories), the **constraint** (explainability, latency) and the **metric**, and always includes a simple **baseline** for comparison.

## 1. Model picker

::viz{name="picker"}

## 2. Common use cases and the usual choice

| Use case | Usual first choice | Why | Metric to quote |
|---|---|---|---|
| Credit default (PD) in a regulated bank | Logistic regression scorecard (WOE bins); XGBoost as challenger | Regulators want explainable, monotonic, stable models; boosting often adds a few Gini points | Gini, KS, PSI, calibration |
| Fraud detection | LightGBM / XGBoost, plus Isolation Forest for new patterns | Very imbalanced, many features, fast scoring needed | PR-AUC, recall at fixed precision, precision@k |
| Churn prediction | XGBoost / LightGBM with a logistic baseline | Tabular, non-linear interactions (tenure × usage) | PR-AUC, lift in top decile |
| HCP / customer targeting (pharma marketing) | Gradient-boosting propensity model with SHAP | Ranks who to contact; reps can only reach the top few hundred | Precision@k, recall@k, lift; uplift if there's a test/control |
| Demand / sales forecasting | LightGBM with lag and rolling features; ARIMA/ETS/Prophet for a few series | One global model handles thousands of series and promotions | WAPE, MAE, bias |
| House price / claim amount | Gradient boosting (Tweedie for claims), Ridge baseline | Non-linear, skewed target | RMSE, MAE, RMSLE |
| Customer segmentation | K-means on scaled features; GMM or DBSCAN for odd shapes | No labels; business needs a few clear groups | Silhouette, stability, business sense |
| Short text, little data | TF-IDF + logistic regression / linear SVM / Naive Bayes | Sparse, high-dimensional: linear models do very well | Macro F1 |
| Text with lots of data or meaning | Fine-tuned transformer, or embeddings + logistic regression | Captures meaning, not just words | Macro F1 |
| Images, audio | Pretrained deep networks (fine-tuned) | Trees and linear models can't learn from raw pixels | Accuracy, F1, mAP |
| Recommendations / search ranking | Two-tower retrieval + gradient-boosted ranker (LambdaMART) | Must rank items per user | Precision@k, recall@k, NDCG@k |
| Medical screening | Calibrated logistic regression or boosting | Clinicians need trustworthy probabilities and explanations | Recall (sensitivity), specificity, calibration |
| Anomaly detection without labels | Isolation Forest, one-class SVM, autoencoder | Learn "normal", flag what's different | Precision@k after manual review |
| Many features, few rows (genomics) | Lasso / Elastic Net, linear SVM | Strong regularisation and feature selection | AUC with nested CV |

## 3. Model cheat sheet

| Model | Needs scaling | Handles missing values | Non-linear | Interpretable | Big data | Robust to outliers |
|---|---|---|---|---|---|---|
| Linear / logistic | Yes (for regularisation) | No | Only with engineered features | High | Yes | No |
| Decision tree | No | Library-dependent | Yes | High if shallow | Yes | Yes (in features) |
| Random Forest | No | Newer scikit-learn: yes | Yes | Medium | Medium (memory) | Yes |
| XGBoost / LightGBM | No | Yes, natively | Yes | Medium (SHAP) | Yes | Features yes, target no |
| SVM | Yes | No | Yes (kernels) | Low | No (slow above ~100k) | Medium |
| KNN | Yes | No | Yes | Medium | No (slow prediction) | No |
| Naive Bayes | No | Partly | Limited | Medium | Yes | Medium |
| Neural networks | Yes | No | Yes | Low | Yes | No |

:::say
"The data was tabular with about 200 mixed features, non-linear effects and missing values. I started with a logistic regression baseline for a reference point and interpretability, then tried Random Forest and XGBoost. XGBoost gave the best out-of-time PR-AUC, handled missing values natively, and with SHAP I could still explain the drivers to the business. I kept the logistic model as a stability check."
:::
