import katex from 'katex';
import { sharedKatexOptions } from '../editor/extensions/math';

function hasDomSupport(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export function renderMathHtml(html: string): string {
  if (!html || !hasDomSupport()) {
    return html;
  }

  const container = document.createElement('div');
  container.innerHTML = html;

  const mathNodes = container.querySelectorAll<HTMLElement>('[data-type="inlineMath"]');

  mathNodes.forEach((element) => {
    const latex = element.getAttribute('data-latex') ?? '';
    if (!latex) {
      return;
    }

    const displayMode = element.getAttribute('data-display') === 'yes';

    try {
      element.innerHTML = katex.renderToString(latex, {
        ...sharedKatexOptions,
        displayMode,
      });
    } catch (error) {
      console.warn('Failed to render math preview', error);
      element.textContent = latex;
    }
  });

  return container.innerHTML;
}
