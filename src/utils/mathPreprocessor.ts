/**
 * Pre-processes HTML to convert $...$ patterns into proper math nodes
 * before inserting into TipTap editor.
 *
 * This ensures AI-generated content with inline math works correctly.
 */
export function preprocessMathInHtml(html: string): string {
  if (!html || typeof window === 'undefined' || typeof document === 'undefined') {
    return html;
  }

  const container = document.createElement('div');
  container.innerHTML = html;

  // Step 1: Strip extra $ around already-rendered math nodes
  // AI sometimes generates: <span data-type="inlineMath" ...>$E=mc^2$</span>
  const existingMathNodes = container.querySelectorAll<HTMLElement>('[data-type="inlineMath"]');
  existingMathNodes.forEach((node) => {
    const text = node.textContent || '';
    // Remove wrapping $ or $$
    const cleaned = text.replace(/^\$\$?(.+?)\$\$?$/, '$1');
    if (cleaned !== text) {
      node.textContent = cleaned;
    }
  });

  // Step 2: Convert raw $...$ patterns to proper math nodes
  // Use a recursive tree walker to handle text nodes
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);

  const textNodesToReplace: Array<{ node: Text; replacements: Node[] }> = [];

  let currentNode = walker.nextNode();
  while (currentNode) {
    const textNode = currentNode as Text;

    // Skip if parent is already a math node
    const parent = textNode.parentElement;
    if (parent && parent.getAttribute('data-type') === 'inlineMath') {
      currentNode = walker.nextNode();
      continue;
    }

    const text = textNode.textContent || '';

    // Match $...$ but not $$...$$ (block math not supported in this implementation)
    // Regex: $...$ where ... doesn't contain $
    const mathRegex = /\$([^$]+?)\$/g;
    const matches = [...text.matchAll(mathRegex)];

    if (matches.length > 0) {
      const fragments: Node[] = [];
      let lastIndex = 0;

      matches.forEach((match) => {
        const fullMatch = match[0];
        const latex = match[1] || '';
        const startIndex = match.index ?? 0;

        // Add text before match
        if (startIndex > lastIndex) {
          fragments.push(document.createTextNode(text.slice(lastIndex, startIndex)));
        }

        // Create math span node
        const mathSpan = document.createElement('span');
        mathSpan.setAttribute('data-type', 'inlineMath');
        mathSpan.setAttribute('data-latex', latex);
        mathSpan.setAttribute('data-evaluate', 'no');
        mathSpan.setAttribute('data-display', 'no');
        mathSpan.textContent = fullMatch; // Keep $...$ as text content for TipTap
        fragments.push(mathSpan);

        lastIndex = startIndex + fullMatch.length;
      });

      // Add remaining text after last match
      if (lastIndex < text.length) {
        fragments.push(document.createTextNode(text.slice(lastIndex)));
      }

      textNodesToReplace.push({ node: textNode, replacements: fragments });
    }

    currentNode = walker.nextNode();
  }

  // Replace text nodes with fragments (done after walking to avoid iterator issues)
  textNodesToReplace.forEach(({ node, replacements }) => {
    const parent = node.parentNode;
    if (parent) {
      replacements.forEach((replacement) => {
        parent.insertBefore(replacement, node);
      });
      parent.removeChild(node);
    }
  });

  return container.innerHTML;
}
