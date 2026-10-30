---
title: Docker and Kubernetes for data scientists
short: Docker, Kubernetes & autoscaling
subject: sysdesign
group: Foundations
order: 3
summary: Containers and orchestration without the jargon. What an image and a container are, a Dockerfile for a model API, Kubernetes pods, deployments, services and autoscaling, and GPUs on Kubernetes.
minutes: 16
---

You don't need to be a DevOps engineer, but every ML and GenAI design answer ends with "containerise it and run it on Kubernetes". Interviewers then ask: what's in the image, how does it scale, how do you roll out a new version? This page gives you enough to answer confidently.

## 1. Why containers?

"It works on my laptop" fails in production because the server has a different Python version, different library versions, missing system packages.

A **container** packages your code **together with everything it needs** (Python, libraries, model file, settings) so it runs the same everywhere.

:::analogy
**Shipping containers.** Before them, every ship, truck and crane handled cargo differently. A standard steel box made it irrelevant what's inside: any port can move it. A Docker container is that box for software: any server with Docker (or Kubernetes) can run it.
:::

| Term | Meaning |
|---|---|
| **Dockerfile** | The recipe: start from a base, install packages, copy code, define the start command |
| **Image** | The built, read-only package produced from the Dockerfile (like a frozen meal) |
| **Container** | A running instance of an image (the meal heated and served). Many containers can run from one image |
| **Registry** | Where images are stored and versioned: Docker Hub, AWS ECR, Azure ACR |
| **Tag** | Version label on an image: `fraud-api:1.4.2` |

Containers vs virtual machines: a VM includes a whole operating system (heavy, minutes to start); containers share the host's OS kernel (light, seconds to start).

## 2. A model API and its Dockerfile

```python
# app.py: serve an XGBoost model with FastAPI
from fastapi import FastAPI
from pydantic import BaseModel
import joblib, pandas as pd

app = FastAPI()
model = joblib.load("model.joblib")          # load ONCE at start-up, not per request

class Claim(BaseModel):
    claim_amount: float
    policy_age_days: int
    prior_claims: int

@app.get("/health")
def health():
    return {"status": "ok"}                   # used by the load balancer / Kubernetes

@app.post("/predict")
def predict(c: Claim):
    X = pd.DataFrame([c.model_dump()])
    return {"fraud_probability": float(model.predict_proba(X)[0, 1]), "model_version": "1.4.2"}
```

```dockerfile
FROM python:3.11-slim                         # small base image
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt   # pinned versions (same as training!)
COPY app.py model.joblib ./
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

```bash
docker build -t fraud-api:1.4.2 .
docker run -p 8000:8000 fraud-api:1.4.2       # test locally
docker push <account>.dkr.ecr.ap-south-1.amazonaws.com/fraud-api:1.4.2
```

:::trap
**Common container mistakes.** Loading the model inside the request function (slow every call); library versions different from training (silent prediction changes; pin them); secrets baked into the image (use a secrets manager or environment variables); huge images with training data inside; running as root.
:::

## 3. Kubernetes in plain words

Running one container is easy. Running 30 copies across 10 machines, restarting crashed ones, rolling out new versions with no downtime and adding copies when traffic rises is what **Kubernetes** (K8s) does.

:::analogy
Kubernetes is a **restaurant manager**. You say "I always want 4 waiters on the floor, each with this uniform (image)". If a waiter leaves, the manager hires a replacement. At lunch rush, the manager calls in more. You describe **what you want**; Kubernetes keeps making it true.
:::

| Object | Meaning |
|---|---|
| **Cluster** | The whole set of machines Kubernetes manages |
| **Node** | One machine (VM) in the cluster; GPU nodes have GPUs |
| **Pod** | The smallest unit: one (or a few tightly linked) containers running together |
| **Deployment** | "Keep N identical pods of this image running"; handles rolling updates |
| **Service** | A stable internal address and load balancer in front of a deployment's pods |
| **Ingress** | Routes outside HTTP traffic to services (with TLS) |
| **ConfigMap / Secret** | Settings and passwords given to pods |
| **HPA** (Horizontal Pod Autoscaler) | Adds or removes pods based on a metric (CPU, requests per second, queue length) |
| **Namespace** | A folder to separate teams or environments (dev, staging, prod) |

Managed Kubernetes: **AWS EKS**, Azure AKS, Google GKE. Alternatives with less to manage: SageMaker endpoints, Databricks Model Serving, Azure ML endpoints, Cloud Run, ECS/Fargate.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: fraud-api }
spec:
  replicas: 3
  selector: { matchLabels: { app: fraud-api } }
  template:
    metadata: { labels: { app: fraud-api } }
    spec:
      containers:
        - name: api
          image: <account>.dkr.ecr.ap-south-1.amazonaws.com/fraud-api:1.4.2
          ports: [{ containerPort: 8000 }]
          resources:
            requests: { cpu: "500m", memory: "1Gi" }   # guaranteed share
            limits:   { cpu: "1",    memory: "2Gi" }   # maximum
          readinessProbe: { httpGet: { path: /health, port: 8000 } }   # only send traffic when ready
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: fraud-api }
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: fraud-api }
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource: { name: cpu, target: { type: Utilization, averageUtilization: 60 } }
```

## 4. Autoscaling: the trade-off

::viz{name="autoscale-sim"}

- **Target utilisation**: scale out when average CPU (or another metric) passes, say, 60%. Lower target = more headroom for spikes = more cost.
- **Min replicas**: at least 2 for availability (one can die).
- **Scale-up lag**: new pods need time (pulling the image, loading the model: seconds for XGBoost, minutes for a large LLM). Spiky traffic needs headroom or pre-scaling before known peaks (e.g. 9 am).
- **Pick the right metric**: CPU works for CPU-bound models. For LLM services and queue workers, scale on **queue length, requests in flight or time to first token** using **KEDA** (event-driven autoscaling), because a GPU server can be overloaded while its CPU looks idle.
- **Cluster autoscaler / Karpenter** adds whole nodes (machines) when pods can't fit.

## 5. GPUs on Kubernetes

- GPU node pool with NVIDIA drivers and the device plugin; pods request `nvidia.com/gpu: 1`.
- GPU nodes are expensive: use **taints** so only GPU workloads land there, and scale the pool down at night if traffic allows.
- Model loading is slow (tens of GB for a 70B model): keep minimum replicas warm, cache weights on fast local disk or a shared volume.
- Serve LLMs with **vLLM / TGI / NVIDIA Triton**, which batch requests from many users onto one GPU.

## 6. Releasing a new version

A Deployment does a **rolling update** by default: start a new pod, wait until its readiness check passes, remove an old one, repeat. No downtime, and `kubectl rollout undo` rolls back. For models, you'll often want more control (shadow, canary): see Serving models.

:::say
"I package the model API with FastAPI in a Docker image with pinned library versions and the model loaded once at start-up, push it to ECR, and run it on Kubernetes, EKS in my case, as a Deployment with at least two replicas, health checks, resource requests and an HPA. CPU-bound models scale on CPU; LLM and queue workers scale on queue depth or time-to-first-token with KEDA, with GPU nodes in a separate pool. Rolling updates give zero-downtime releases, and I use canaries for risky model changes."
:::
