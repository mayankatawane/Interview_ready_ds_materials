// The sections of the app. Set live: true once a subject has topics.
export type Subject = { id: string; name: string; blurb: string; color: string; live: boolean; groups: string[] };

export const SUBJECTS: Subject[] = [
  { id: 'ml', name: 'Classical ML', blurb: 'Algorithms, features, metrics, validation, tuning', color: 'var(--sub-ml)', live: true,
    groups: ['Start here', 'Foundations', 'Supervised models', 'Unsupervised', 'Data and features', 'Evaluation', 'Practice'] },
  { id: 'dl', name: 'Deep learning', blurb: 'Neural nets, training, CNNs, RNNs, embeddings', color: 'var(--sub-dl)', live: true,
    groups: ['Foundations', 'Training', 'Architectures'] },
  { id: 'genai', name: 'GenAI, RAG and agents', blurb: 'LLMs, attention, fine-tuning, RAG, agents, LLMOps', color: 'var(--sub-genai)', live: true,
    groups: ['LLM foundations', 'Adapting LLMs', 'RAG', 'Agents and production'] },
  { id: 'stats', name: 'Statistics and A/B testing', blurb: 'Probability, tests, p-values, experiments', color: 'var(--sub-stats)', live: false, groups: [] },
  { id: 'sql', name: 'SQL', blurb: 'Joins, window functions, LeetCode-style problems you can run', color: 'var(--sub-sql)', live: true,
    groups: ['Foundations', 'Window functions', 'Interview patterns'] },
  { id: 'python', name: 'Python and pandas', blurb: 'Coding rounds, data wrangling', color: 'var(--sub-python)', live: false, groups: [] },
  { id: 'sysdesign', name: 'System design: ML and GenAI', blurb: 'Deploying models, RAG and agents at scale; case studies', color: 'var(--sub-sys)', live: true,
    groups: ['Foundations', 'ML system design', 'GenAI system design'] },
  { id: 'mlops', name: 'MLOps and deployment', blurb: 'Docker, Kubernetes, CI/CD, monitoring', color: 'var(--sub-ops)', live: false, groups: [] },
  { id: 'behavioural', name: 'Projects and behavioural', blurb: 'STAR stories from your work', color: 'var(--sub-beh)', live: false, groups: [] },
];

export const subjectById = Object.fromEntries(SUBJECTS.map((s) => [s.id, s]));
