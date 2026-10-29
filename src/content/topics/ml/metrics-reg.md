---
title: Regression metrics
short: Regression metrics
subject: ml
group: Evaluation
order: 2
summary: MAE, RMSE, MAPE, WAPE, RMSLE and R², what each one rewards, and which loss gives a mean, a median or a percentile.
minutes: 12
---

Regression metric questions are short but tricky: MAE vs RMSE, why MAPE breaks, whether R² can be negative, and which loss predicts the median. One running example makes them easy.

## 1. The metrics

$$
\text{MAE} = \frac{1}{n}\sum_{i=1}^{n}|y_i - \hat y_i| \qquad \text{RMSE} = \sqrt{\frac{1}{n}\sum_{i=1}^{n}(y_i - \hat y_i)^2}
$$

$$
\text{MAPE} = \frac{100\%}{n}\sum_{i=1}^{n}\Big|\frac{y_i - \hat y_i}{y_i}\Big| \qquad \text{WAPE} = \frac{\sum_i|y_i - \hat y_i|}{\sum_i|y_i|}
$$

$$
\text{RMSLE} = \sqrt{\frac{1}{n}\sum_{i=1}^{n}\big(\log(1+\hat y_i) - \log(1+y_i)\big)^2} \qquad R^2 = 1 - \frac{\sum_i(y_i - \hat y_i)^2}{\sum_i(y_i - \bar y)^2}
$$

:::symbols
- $y_i$ = true value of row $i$; $\hat y_i$ = predicted value; $n$ = number of rows.
- $|\cdot|$ = absolute value (drop the minus sign).
- $\bar y$ = average of the true values.
- MAE = mean absolute error; RMSE = root mean squared error; MAPE = mean absolute percentage error; WAPE = weighted absolute percentage error; RMSLE = root mean squared log error.
:::

:::worked
Actual sales: 100, 200, 300. Predicted: 110, 190, 240. Errors: −10, +10, +60.

- MAE $= (10 + 10 + 60)/3 = 26.7$
- RMSE $= \sqrt{(100 + 100 + 3600)/3} = \sqrt{1266.7} = 35.6$ (the 60 dominates because it's squared)
- MAPE $= (10\% + 5\% + 20\%)/3 = 11.7\%$
- WAPE $= 80 / 600 = 13.3\%$
:::

::viz{name="reg-err"}

## 2. What each one is good for

| Metric | Good for | Watch out |
|---|---|---|
| MAE | "Typical miss" in real units (₹, units sold); robust to outliers | Minimised by predicting the **median** |
| RMSE | When big misses are much worse than small ones | One outlier dominates; minimised by the **mean** |
| MAPE | Business-friendly percentage | Explodes when actuals are near 0; punishes over-forecasts more than under-forecasts (an under-forecast can't exceed 100% error) |
| WAPE | Forecasts across many products | Dominated by high-volume items |
| RMSLE | Targets spanning orders of magnitude; relative errors; penalises under-prediction a bit more | Needs non-negative values |
| R² | Share of variance explained | Can be **negative** on test data; always rises with more features in training (use adjusted R²) |

RMSE is always ≥ MAE. A big gap between them means a few large errors.

## 3. Which loss predicts what

| Loss you train with | The best constant prediction is… |
|---|---|
| Squared error (MSE) | the **mean** |
| Absolute error (MAE) | the **median** |
| Quantile (pinball) loss with $\tau$ | the $\tau$-th **percentile** (e.g. $\tau = 0.9$ → P90) |
| Huber | in between: mean-like for small errors, median-like for large |

So pick the training loss to match what the business needs: average demand (MSE), typical demand robust to spikes (MAE), or a safety-stock level (quantile 0.9).

## 4. R² in plain words

R² compares your model with the dumbest possible model: always predict the average.

- $R^2 = 0.75$: the model removes 75% of the squared error the average would make.
- $R^2 = 0$: no better than the average.
- $R^2 < 0$ (possible on test data): **worse** than predicting the average.

R² doesn't tell you whether errors are acceptable in business terms; report it alongside MAE or RMSE in real units.

## 5. Forecasting extras

- **Bias** (mean error, with sign): are you systematically over- or under-forecasting?
- **MASE**: error relative to a naive forecast (e.g. "same as last week"); below 1 means you beat the naive method.
- **sMAPE**: a symmetric version of MAPE that behaves better near zero.

## 6. Code

```python
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, mean_absolute_percentage_error

mae = mean_absolute_error(y_test, pred)
rmse = np.sqrt(mean_squared_error(y_test, pred))
mape = mean_absolute_percentage_error(y_test, pred)
wape = np.abs(y_test - pred).sum() / np.abs(y_test).sum()
r2 = r2_score(y_test, pred)
print(f"MAE {mae:.1f}  RMSE {rmse:.1f}  MAPE {mape:.1%}  WAPE {wape:.1%}  R2 {r2:.3f}")
```

:::say
"MAE tells me the typical miss in rupees and is robust to outliers; RMSE squares errors, so it's right when big misses are especially costly. MSE-trained models predict the mean, MAE-trained ones the median, and quantile loss gives percentiles for safety stock. For forecasting across many products I prefer WAPE over MAPE, which breaks when actuals are near zero. R² is the share of variance explained versus predicting the average, and on test data it can be negative."
:::
