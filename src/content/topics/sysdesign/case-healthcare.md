---
title: "Case study: healthcare and pharma"
short: "Case: hospital & pharma"
subject: sysdesign
group: ML system design
order: 6
summary: A hospital readmission-risk model embedded in the clinical workflow (EHR integration, silent mode, alert fatigue, PHI security, equity), and a pharma field-force model (next best HCP to visit) as a batch design.
minutes: 15
---

Healthcare designs are graded heavily on **workflow fit, safety and privacy**. A model with excellent AUC that clinicians ignore, or that leaks patient data, has failed.

## Part A: 30-day readmission risk in a hospital

**The question:** "Deploy a model that predicts which inpatients will be readmitted within 30 days of discharge."

### 1. Clarify

- **Users**: care managers and discharge nurses, who can arrange follow-up calls, medication reviews and early appointments.
- **Timing**: during the stay, ideally from day 1, updated as labs and notes arrive; decisions are made over days → **scoring every few hours is enough**, no real-time API needed.
- **Capacity**: the care-management team can follow up with ~15% of discharges.
- **Constraints**: patient data (PHI) security, clinical validation, fairness across patient groups, integration into the existing EHR (Epic, Cerner/Oracle Health).

### 2. Design

::viz{name="arch-health"}

1. **Data**: diagnoses, labs, vitals, medications, prior admissions from the EHR's reporting database or FHIR APIs, inside the hospital's secure network or a compliant cloud.
2. **Pipeline**: maps clinical codes (ICD-10, LOINC), builds features (admissions in the last 6 months, abnormal lab counts, number of medications, length of stay so far, comorbidity index).
3. **Scoring job** every 4–6 hours for all current inpatients; scores written back into the EHR.
4. **Display**: a risk column (high/medium/low) in the patient list the team already uses, with top contributing factors.
5. **Action**: high-risk patients enter the care manager's work queue with a checklist of interventions.
6. **Monitoring**: calibration, positive predictive value (PPV) at the threshold, intervention rates, readmission rates, and equity across groups, reviewed by a clinical AI governance committee.

### 3. What makes healthcare different

| Topic | What to say |
|---|---|
| **Silent mode** | Run for weeks with scores stored but not shown; compare predictions with real outcomes and tune thresholds with clinicians before go-live |
| **Alert fatigue** | Clinicians already get dozens of alerts per shift. Flag only as many patients as the team can act on, show reasons, avoid pop-ups for low-value alerts |
| **Calibration** | "30% risk" must mean about 30%; check per site and per group |
| **Leakage** | Diagnosis codes are often finalised after discharge. Train only on data available at the prediction time, or the live model will underperform |
| **Equity** | Compare sensitivity and PPV by age, sex, ethnicity, insurance type. Using past healthcare **cost** as a proxy for need is a famous source of bias |
| **Privacy** | HIPAA (US) or India's DPDP Act: access control, encryption, audit logs, minimum necessary data, agreements with any vendor; no PHI to external APIs without them |
| **Intervention effect** | If care managers prevent readmissions for flagged patients, those patients look like "false positives" later. Record interventions and account for them when evaluating |

:::worked
**PPV at the threshold.** 1,000 discharges a month, 15% readmitted (150 patients). The team can follow up 150 patients, so flag the top 150 by score. If 60 of those 150 are actually readmitted (without intervention): PPV $= 60/150 = $ **40%** and sensitivity $= 60/150 = $ **40%** of all readmissions caught. Versus random selection: 15% PPV. The care team now spends its time on patients 2.7× more likely to need it.
:::

## Part B: Pharma field force — which doctors to visit next

**The question (close to your own pharma work):** "Build and deploy a model that tells sales reps which healthcare professionals (HCPs) to prioritise next week."

- **Decision cadence**: weekly territory planning → **batch** scoring every weekend is ideal.
- **Data**: prescription data (from IQVIA-type syndicated sources), call/visit history, email engagement, events, HCP specialty and segment, patient potential.
- **Model**: predict uplift in prescriptions (or probability of a new prescriber) per HCP; optionally a next-best-action model choosing channel (visit, email, webinar).
- **Delivery**: scores and top reasons pushed into the CRM (Veeva/Salesforce) as a ranked call list per rep; respect call-frequency limits and compliance rules.
- **Measurement**: A/B or matched-territory test on prescription growth; rep adoption (did they follow suggestions?).
- **Compliance**: no patient-level identifiable data; promotional rules; explainable suggestions for reps.

:::trap
**"Real-time is better."** For both cases, the decision is made on a schedule (a discharge plan, a weekly call plan). Batch scoring is simpler, cheaper and easier to validate. Choosing batch here is a sign of seniority, not a shortcut.
:::

:::say
"For readmission risk, I'd score all inpatients every few hours from EHR data in the hospital's secure environment and write the score and top factors back into the patient list care managers already use. The threshold follows the care team's capacity, measured by PPV and sensitivity at that cut-off. Before go-live it runs silently for weeks so clinicians can validate it. I'd watch calibration and equity across patient groups, guard against leakage from codes finalised after discharge, protect PHI with access control and audit logs, and record interventions so evaluation isn't distorted by the model's own success."
:::
