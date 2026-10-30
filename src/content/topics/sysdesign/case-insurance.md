---
title: "Case study: insurance claims fraud"
short: "Case: insurance fraud"
subject: sysdesign
group: ML system design
order: 4
summary: A full worked answer to "Design a fraud detection system for motor insurance claims", from requirements and labels to the XGBoost model, scoring at claim time, investigator triage, feedback loops and governance.
minutes: 16
---

**The question:** "You built an XGBoost model that predicts fraudulent motor insurance claims. How would it be deployed and used in production?" Here's a complete answer following the 7-step structure.

## 1. Clarify

- **Who uses it?** Claims handlers and the Special Investigation Unit (SIU). The model **prioritises** claims for investigation; it doesn't reject anyone automatically.
- **When?** At claim submission (First Notice of Loss, FNOL), and again as documents arrive (repair estimate, photos, police report).
- **Scale?** Say 2,000 claims/day, 1–2% fraud, SIU can review about 150 claims/week.
- **Costs?** Missing fraud costs the payout (₹50,000–₹5 lakh); a false alarm costs investigator time (~₹3,000) and delays an honest customer (complaints, regulator attention).
- **Constraints?** Explainable flags, fairness, an audit trail, data stays in India.

## 2. Success metrics

| Level | Metric |
|---|---|
| Business | Fraud amount prevented per month; SIU hit rate (share of investigated claims confirmed as fraud); fast-track rate for genuine claims; claim settlement time |
| Model | PR-AUC; precision and recall **in the top 150 per week** (capacity-based); calibration |
| System | Score available within 1 minute of claim creation; nightly re-score complete by 7 am |

:::why
Fraud is rare (1–2%), so accuracy is meaningless (99% by predicting "no fraud"). What matters is how many real frauds are in the **top of the list** investigators can actually review: precision@k and recall@k, where k = investigator capacity.
:::

## 3. Scale estimate

2,000 claims/day ≈ 0.02 claims/second. Tiny traffic: **no need for streaming or heavy autoscaling.** A small API with 2 replicas for redundancy, plus a nightly batch re-score of all open claims (maybe 30,000 rows) in minutes on Spark. Good to say explicitly: it shows you don't over-engineer.

## 4. High-level design

::viz{name="arch-insurance"}

1. **Event**: the claims system publishes "claim created/updated".
2. **Features**: historical aggregates from the nightly feature pipeline (claimant's past claims, garage's fraud history, policy age) + fresh claim fields.
3. **Score**: API returns probability + top 3 SHAP reasons + model version.
4. **Decide**: rules + score → fast-track / normal / SIU queue; threshold set by capacity.
5. **Investigate**: SIU sees reasons, decides; outcome recorded.
6. **Learn**: outcomes feed monitoring and quarterly retraining.

## 5. Deep dive: features and labels

**Strong fraud signals** (domain knowledge matters more than the algorithm):

- **Timing**: claim soon after policy start or after increasing cover; accident late at night with no witnesses.
- **History**: number of prior claims, claims across insurers (industry databases), changes of address or bank account just before the claim.
- **Network**: garage, hospital, lawyer or surveyor linked to many past claims; claimants sharing phone numbers or addresses (graph features).
- **Amount**: claim close to the policy limit; repair estimate far above the typical cost for that car model and damage.
- **Text**: claim description similarity to known fraud cases (embeddings), inconsistent statements.

**Labels**: confirmed fraud from SIU outcomes. Problems: they arrive weeks to months later; only investigated claims get a label; "not proven" isn't the same as "genuine". Use investigated claims plus a random audit sample, and consider PU-learning or treating un-investigated claims carefully.

**Model**: XGBoost/LightGBM with `scale_pos_weight` or class weights, monotonic constraints where business logic demands it, time-based validation (train on 2023–24, validate on 2025), calibration so scores are meaningful probabilities.

:::worked
**Choosing the threshold from capacity, not F1.** 2,000 claims/day × 7 = 14,000 claims/week. SIU capacity = 150. So flag the top 150/14,000 = **top ~1.1%** by score. If precision there is 40%, that's 60 confirmed frauds a week. Compare with random selection: 1.5% base rate × 150 = about 2 frauds. The model makes investigators roughly 25× more productive (60 vs about 2). That's the sentence business leaders remember.
:::

## 6. Failure modes and safety

| Risk | Mitigation |
|---|---|
| Fraudsters adapt (concept drift) | Monthly performance by cohort; quarterly retraining; investigators can add new red-flag rules quickly |
| Feedback loop (only flagged claims labelled) | Random audit of ~1–2% of unflagged claims |
| Alert fatigue | Capacity-based threshold; show reasons; track investigator overrides |
| Unfair targeting | Exclude protected attributes and audit proxies (pincode, language); compare flag and confirmation rates by region and segment |
| API down | Claims proceed through normal handling (fail open); nightly batch catches up |
| Wrong data from upstream | Data-quality checks before scoring; PSI alerts on top features |

## 7. Trade-offs and phases

1. **MVP (6–8 weeks)**: nightly batch score of open claims → ranked list in the SIU's tool with reasons. Measure hit rate vs the old rules.
2. **Phase 2**: real-time score at FNOL to fast-track low-risk claims (customer experience win).
3. **Phase 3**: network/graph features, text features, image checks on damage photos.

:::say
"I'd frame it as prioritising investigator time, not auto-rejecting claims. Claims are scored at submission via a small API and re-scored nightly as documents arrive, using historical features from a feature store plus fresh claim fields. The XGBoost model is trained with class weights on time-split data and calibrated, and the threshold is set by SIU capacity, so the key metric is precision and recall in the top k per week. Every flag carries SHAP reason codes. Outcomes feed back as labels, with a random audit of unflagged claims to avoid a feedback loop, and I'd monitor drift, hit rate and fairness by segment, retraining quarterly through champion–challenger."
:::
