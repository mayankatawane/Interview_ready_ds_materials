# DS Interview Kit

A mobile-friendly study app for data science interviews: classical ML, deep learning, GenAI/RAG, and (coming) statistics, SQL, Python, ML system design, MLOps and behavioural prep.

**Live site:** https://mayankatawane.github.io/Interview_ready_ds_materials/

Open it on your phone and use "Add to Home Screen" to install it like an app. It works offline after the first visit.

## How the content is organised

| What | Where | Format |
|---|---|---|
| Topic pages | `src/content/topics/<subject>/<topic>.md` | Markdown |
| Interview questions | `src/data/questions/<topic>.json` | JSON list of `{ q, a, gotcha }` |
| Quiz | `src/data/quiz.json` | JSON |
| Subjects (sections of the app) | `src/data/subjects.ts` | TypeScript list |
| Interactive visuals | `public/viz.js` | JavaScript, one function per visual |

### Writing a topic page

Each page starts with a small header:

```yaml
---
title: Random Forest
short: Random Forest          # name used in menus
subject: ml                   # ml, dl, genai, stats, sql, ...
group: Supervised models      # section inside the subject
order: 6                      # position inside the group
summary: One or two sentences shown under the title.
minutes: 25
---
```

Then normal Markdown. Extras:

- Maths: `$inline$` and `$$display$$` (KaTeX).
- Coloured boxes:

  ```
  :::analogy
  Text...
  :::
  ```

  Types: `analogy`, `trap` (interview trap), `mistake`, `remember`, `say` (spoken answer, blurred in Recall mode), `why`, `worked` (worked example), `symbols` (explain every symbol), `note`.
- Interactive visual: `::viz{name="rf-oob"}` (names are the keys of `VIZ` in `public/viz.js`).

### Question format

```json
[{ "q": "Can adding more trees overfit?", "a": "<p>No ...</p>", "gotcha": true }]
```

Use `\\( ... \\)` for maths inside answers.

## Running locally

```bash
npm install
npm run dev      # http://localhost:4321/Interview_ready_ds_materials/
npm run build    # builds the site and the search index into dist/
```

Every push to `main` rebuilds and deploys the site through GitHub Actions.
