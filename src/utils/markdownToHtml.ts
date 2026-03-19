import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
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

// Supports Obsidian-style image sizing: ![alt|W](url), ![alt|xH](url), ![alt|WxH](url)
function remarkImageSize() {
  return (tree: Root) => {
    visit(tree, 'image', (node: any) => {
      const match = (node.alt ?? '').match(/^(.*?)\|(?:(\d+)x(\d+)|(\d+)|x(\d+))$/);
      if (!match) return;
      const [, alt, bw, bh, w, h] = match;
      const width = bw ?? w;
      const height = bh ?? h;
      const parts: string[] = ['max-width:100%'];
      if (width) parts.push(`width:${width}px`);
      if (height) parts.push(`height:${height}px`);
      node.alt = alt;
      node.data = node.data || {};
      node.data.hProperties = { ...node.data.hProperties, style: parts.join(';') };
    });
  };
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkDirective)
  .use(remarkBoxPlugin)
  .use(remarkImageSize)
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
