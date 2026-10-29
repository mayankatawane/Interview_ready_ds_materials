// Wraps every <table> in a scrollable box so wide tables never stretch the page on phones.
import { visit } from 'unist-util-visit';
export default function rehypeTables() {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'table' || !parent || (parent.properties && (parent.properties.className || []).includes('tablewrap'))) return;
      parent.children[index] = { type: 'element', tagName: 'div', properties: { className: ['tablewrap'] }, children: [node] };
    });
  };
}
