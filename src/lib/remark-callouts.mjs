// Turns ":::trap ... :::" style blocks into coloured callout boxes,
// and "::viz{name="rf-oob"}" into a placeholder that public/viz.js brings to life.
import { visit, SKIP } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';

const LABELS = {
  analogy: 'Think of it like',
  trap: 'Interview trap',
  remember: 'Remember this',
  say: 'Say it in the interview',
  worked: 'Worked example',
  why: 'Why this matters',
  symbols: 'What each symbol means',
  note: 'Note',
  mistake: 'Common mistake',
};

export default function remarkCallouts() {
  return (tree) => {
    visit(tree, (node, index, parent) => {
      if (node.type === 'containerDirective') {
        const kind = node.name;
        let label = LABELS[kind] || kind;
        const first = node.children[0];
        if (first && first.data && first.data.directiveLabel) {
          label = toString(first);
          node.children.shift();
        }
        node.data = { hName: 'div', hProperties: { className: ['callout', `callout-${kind}`] } };
        node.children.unshift({
          type: 'paragraph',
          data: { hName: 'div', hProperties: { className: ['callout-label'] } },
          children: [{ type: 'text', value: label }],
        });
        return;
      }
      if (node.type === 'leafDirective' && node.name === 'viz') {
        node.data = { hName: 'div', hProperties: { className: ['viz'], dataViz: (node.attributes || {}).name } };
        node.children = [];
        return;
      }
      // Anything else that looks like a directive (e.g. "ratio 1:b") is put back as plain text.
      if ((node.type === 'textDirective' || node.type === 'leafDirective') && parent) {
        const prefix = node.type === 'textDirective' ? ':' : '::';
        const text = prefix + node.name + (node.children.length ? '[' + toString(node) + ']' : '');
        parent.children.splice(index, 1, { type: 'text', value: text });
        return [SKIP, index];
      }
    });
  };
}
