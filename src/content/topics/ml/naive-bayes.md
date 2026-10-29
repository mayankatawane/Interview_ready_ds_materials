---
title: Naive Bayes
short: Naive Bayes
subject: ml
group: Supervised models
order: 10
summary: Use Bayes' theorem with the simplifying assumption that features are independent within each class. Extremely fast and a strong baseline for text.
minutes: 14
---

Naive Bayes questions focus on Bayes' theorem, why it's "naive", why it still works, the zero-frequency problem and smoothing, and generative vs discriminative models.

## 1. What is Naive Bayes?

A classifier that computes, for each class, how likely it is **given the features**, using Bayes' theorem, and picks the most likely class. It's "naive" because it assumes all features are **independent of each other once you know the class**.

:::analogy
A spam filter keeps a scorecard for each word: "free" appears in 60% of spam but only 5% of normal email. For a new email it combines the evidence from every word as if each word were a separate, unrelated clue.
:::

## 2. Bayes' theorem in plain words

$$
P(y \mid x) = \frac{P(x \mid y)\,P(y)}{P(x)}
$$

:::symbols
- $y$ = the class (e.g. spam or not); $x$ = the features (e.g. the words in the email).
- $P(y \mid x)$ = **posterior**: probability of the class *given* these features. What we want.
- $P(x \mid y)$ = **likelihood**: how probable these features are *within* that class.
- $P(y)$ = **prior**: how common the class is overall (e.g. 40% of emails are spam).
- $P(x)$ = **evidence**: how probable these features are overall. It's the same for every class, so we can ignore it when comparing classes.
- The vertical bar $\mid$ reads "given".
:::

Read it as: **posterior ∝ likelihood × prior**. Start with how common each class is, then update with the evidence.

## 3. The "naive" step

$P(x \mid y)$ for many features at once is impossible to estimate directly (you'd need data on every combination of words). The naive assumption splits it into a product of one-feature probabilities:

$$
P(y \mid x) \;\propto\; P(y)\prod_{j=1}^{p} P(x_j \mid y)
$$

:::symbols
- $\propto$ = "proportional to" (we dropped $P(x)$).
- $\prod_{j=1}^{p}$ = multiply over all $p$ features.
- $P(x_j \mid y)$ = probability of feature $j$'s value within class $y$, easy to count from data.
:::

## 4. How it trains and predicts

**Training** = counting:

1. Prior for each class: share of training rows in that class.
2. For each feature and class, estimate $P(x_j \mid y)$: word frequencies (text), or a mean and variance (numeric features, Gaussian NB).

**Prediction**:

1. For each class, multiply the prior by every feature's likelihood.
2. In practice, **add logarithms** instead of multiplying (multiplying hundreds of small probabilities underflows to 0 on a computer).
3. Pick the class with the highest score; normalise the scores to get probabilities.

:::worked
40 spam and 60 normal emails. "free" appears in 24 spam and 3 normal; "meeting" in 2 spam and 30 normal.

New email contains "free" but not "meeting" (Bernoulli NB, which also counts absent words):

- Spam: $0.4 \times \frac{24}{40} \times (1 - \frac{2}{40}) = 0.4 \times 0.6 \times 0.95 = 0.228$
- Normal: $0.6 \times \frac{3}{60} \times (1 - \frac{30}{60}) = 0.6 \times 0.05 \times 0.5 = 0.015$

$P(\text{spam} \mid \text{email}) = 0.228 / (0.228 + 0.015) = 0.94$.
:::

::viz{name="nb-calc"}

## 5. The zero-frequency problem and Laplace smoothing

If a word never appeared in normal emails during training, $P(\text{word} \mid \text{normal}) = 0$, and multiplying by 0 wipes out all other evidence: the email can never be classed as normal. Turn smoothing off in the calculator above and tick "lottery" to see it.

**Laplace (add-α) smoothing** adds a small count to everything:

$$
P(w \mid y) = \frac{\text{count}(w, y) + \alpha}{\text{count}(y) + \alpha\,|V|}
$$

:::symbols
- $\text{count}(w, y)$ = how often word $w$ appears in class $y$.
- $\text{count}(y)$ = total words in class $y$.
- $|V|$ = vocabulary size (number of distinct words).
- $\alpha$ = smoothing amount, usually 1.
:::

## 6. Variants

| Variant | Features | Typical use |
|---|---|---|
| Multinomial NB | Word counts | Text classification (the classic) |
| Bernoulli NB | Present / absent (absent words also count) | Short texts, binary features |
| Gaussian NB | Continuous, assumed normal within each class | Numeric baseline |
| Complement NB | Counts, uses statistics of the *other* classes | Imbalanced text |

## 7. Why does it work if the assumption is wrong?

Words are obviously not independent ("New" and "York"). But to classify correctly, the model only needs the **right class to get the highest score**, not accurate probabilities. Dependencies often inflate all classes' scores similarly, so the ranking survives. It also has very few parameters, so it has low variance and does well with little data.

The price: its **probabilities are poorly calibrated**, usually pushed toward 0 or 1, because correlated evidence gets counted several times.

## 8. Generative vs discriminative

| | Generative (Naive Bayes, GMM, LDA) | Discriminative (logistic regression, SVM, trees) |
|---|---|---|
| Learns | How the data is produced: $P(x \mid y)$ and $P(y)$ | The boundary or $P(y \mid x)$ directly |
| Data needed | Less | More |
| Accuracy with lots of data | Usually lower | Usually higher |
| Missing features | Easy to handle | Harder |

## 9. Strengths, weaknesses, when to use

**Strengths**: extremely fast to train and predict; works with very little data; handles thousands of features; simple and robust baseline.

**Weaknesses**: independence assumption rarely true; poorly calibrated probabilities; can't learn feature interactions; zero-frequency problem without smoothing.

| Good fit | Not a good fit |
|---|---|
| Spam filtering, sentiment, topic tagging | When features interact strongly |
| Very small datasets, real-time training | When you need trustworthy probabilities |
| Baseline for any text problem | Complex tabular problems |

## 10. Code

```python
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.naive_bayes import MultinomialNB, GaussianNB

vec = CountVectorizer(stop_words="english")
Xtr = vec.fit_transform(train_texts)          # word counts
Xte = vec.transform(test_texts)

nb = MultinomialNB(alpha=1.0)                 # alpha = Laplace smoothing
nb.fit(Xtr, y_train)
print(nb.score(Xte, y_test))

gnb = GaussianNB().fit(X_train_numeric, y_train)   # numeric features
```

:::say
"Naive Bayes applies Bayes' theorem: posterior is proportional to prior times likelihood, and it assumes features are conditionally independent given the class, so the likelihood becomes a product of per-feature probabilities. It's a generative model, trained by counting, very fast and strong for text. I use Laplace smoothing so an unseen word doesn't zero out a class, and I work in log-probabilities to avoid underflow. The class ranking is often good even though the independence assumption is wrong, but the probabilities themselves are poorly calibrated."
:::
