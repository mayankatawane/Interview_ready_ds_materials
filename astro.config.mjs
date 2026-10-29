import { defineConfig } from 'astro/config';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkDirective from 'remark-directive';
import remarkCallouts from './src/lib/remark-callouts.mjs';
import rehypeTables from './src/lib/rehype-tables.mjs';

// GitHub Pages serves the site from /<repo-name>/
export default defineConfig({
  site: 'https://mayankatawane.github.io',
  base: '/Interview_ready_ds_materials',
  trailingSlash: 'always',
  markdown: {
    remarkPlugins: [remarkMath, remarkDirective, remarkCallouts],
    rehypePlugins: [[rehypeKatex, { strict: false }], rehypeTables],
    shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' } },
  },
});
