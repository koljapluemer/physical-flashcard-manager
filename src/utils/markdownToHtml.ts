import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import remarkDirective from 'remark-directive';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';

function remarkBoxPlugin() {
  return (tree: Root) => {
    visit(tree, 'containerDirective', (node: any) => {
      if (node.name === 'box') {
        node.data = node.data || {};
        node.data.hName = 'aside';
        node.data.hProperties = { class: 'flashcard-box' };
      }
    });
  };
}

const processor = unified()
  .use(remarkParse)
  .use(remarkMath)
  .use(remarkDirective)
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
