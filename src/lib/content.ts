import { getCollection, type CollectionEntry } from 'astro:content';
import katex from 'katex';
import { SUBJECTS, subjectById } from '../data/subjects';

export type Topic = CollectionEntry<'topics'>;
export type Question = { q: string; a: string; gotcha?: boolean };

export const slugOf = (t: Topic) => t.id.split('/').pop() as string;
export const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
export const url = (p = '') => base + p.replace(/^\//, '');
export const topicUrl = (t: Topic) => url(`${t.data.subject}/${slugOf(t)}/`);

export async function allTopics(): Promise<Topic[]> {
  const list = await getCollection('topics');
  return list.sort((a, b) => {
    if (a.data.subject !== b.data.subject) {
      return SUBJECTS.findIndex((s) => s.id === a.data.subject) - SUBJECTS.findIndex((s) => s.id === b.data.subject);
    }
    const groups = subjectById[a.data.subject]?.groups || [];
    const ga = groups.indexOf(a.data.group), gb = groups.indexOf(b.data.group);
    if (ga !== gb) return ga - gb;
    return a.data.order - b.data.order;
  });
}

export async function subjectTopics(subject: string) {
  return (await allTopics()).filter((t) => t.data.subject === subject);
}

// Question bank: src/data/questions/<topic-slug>.json
const qfiles = import.meta.glob('../data/questions/*.json', { eager: true }) as Record<string, { default: Question[] }>;
export const QUESTIONS: Record<string, Question[]> = Object.fromEntries(
  Object.entries(qfiles).map(([p, m]) => [p.split('/').pop()!.replace('.json', ''), m.default])
);
export const questionsFor = (slug: string) => QUESTIONS[slug] || [];

// Render \( inline \) and \[ display \] maths inside question answers at build time.
export function renderMath(html: string) {
  return html
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, tex) => katex.renderToString(tex, { displayMode: true, throwOnError: false }))
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, tex) => katex.renderToString(tex, { throwOnError: false }));
}
