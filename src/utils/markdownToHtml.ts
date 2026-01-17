import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import type { Root, Code, Html, Parent } from 'mdast';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function remarkBoxPlugin() {
  return (tree: Root) => {
    visit(tree, 'code', (node: Code, index: number | undefined, parent: Parent | undefined) => {
      if (node.lang === 'box' && parent && typeof index === 'number') {
        // Convert content to paragraphs, escaping HTML
        const content = node.value
          .split('\n\n')
          .map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br>')}</p>`)
          .join('');

        const htmlNode: Html = {
          type: 'html',
          value: `<aside class="flashcard-box">${content}</aside>`,
        };

        parent.children[index] = htmlNode;
      }
    });
  };
}

const processor = unified()
  .use(remarkParse)
  .use(remarkMath)
  .use(remarkBoxPlugin)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeKatex)
  .use(rehypeStringify, { allowDangerousHtml: true });

export async function markdownToHtml(markdown: string): Promise<string> {
  if (!markdown) {
    return '';
  }
  const result = await processor.process(markdown);
  return String(result);
}
