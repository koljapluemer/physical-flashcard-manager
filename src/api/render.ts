import html2pdf from 'html2pdf.js';
import cardContentCss from '../styles/cardContent.css?raw';
import { markdownToHtml } from '../utils/markdownToHtml';
import { hexToRgba, normalizeHexColor } from '../utils/color';
import { getFontCSSValue, isSystemFont, loadGoogleFont } from '../utils/fonts';
import type { Collection, Flashcard } from '../types';

async function buildCardPageHtml(card: Flashcard, side: 'front' | 'back', collection: Collection): Promise<string> {
  const markdownContent = side === 'front' ? card.front : card.back;
  const renderedContent = await markdownToHtml(markdownContent);

  const headerColor = normalizeHexColor(collection.header_color);
  const boxBgColor = hexToRgba(headerColor, 0.08);
  const boxBorderColor = hexToRgba(headerColor, 0.16);
  const backgroundColor = collection.background_color ?? '#f0f0f0';
  const fontColor = collection.font_color ?? '#171717';
  const headerFontColor = collection.header_font_color ?? '#ffffff';
  const fontFamily = getFontCSSValue(collection.font_family ?? 'Arial');
  const headerTextLeft = collection.header_text_left ?? '';
  const headerTextRight = side === 'front' ? (card.header_right ?? '') : '';

  const showHeader = headerTextLeft || headerTextRight;

  return `
    <div
      class="pdf-flashcard"
      style="
        background-color: ${backgroundColor};
        --header-color: ${headerColor};
        --background-color: ${backgroundColor};
        --font-color: ${fontColor};
        --header-font-color: ${headerFontColor};
        --font-family: ${fontFamily};
        --box-bg-color: ${boxBgColor};
        --box-border-color: ${boxBorderColor};
      "
    >
      ${showHeader ? `
        <div class="pdf-flashcard-header" style="background-color: ${headerColor}; color: ${headerFontColor};">
          ${headerTextLeft ? `<span class="pdf-flashcard-header-left">${headerTextLeft}</span>` : ''}
          ${headerTextRight ? `<span class="pdf-flashcard-header-right">${headerTextRight}</span>` : ''}
        </div>
      ` : ''}
      <div class="flashcard-preview-content pdf-flashcard-content" style="color: ${fontColor};">
        ${renderedContent}
      </div>
    </div>
  `;
}

function buildRenderStyles(cardWidthMm: number, cardHeightMm: number): string {
  return `
    .pdf-root {
      width: ${cardWidthMm}mm;
      margin: 0;
      padding: 0;
      background: #fff;
    }

    .pdf-page {
      width: ${cardWidthMm}mm;
      height: ${cardHeightMm}mm;
      page-break-after: always;
      break-after: page;
      overflow: hidden;
      box-sizing: border-box;
    }

    .pdf-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }

    .pdf-flashcard {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
    }

    .pdf-flashcard-header {
      padding: 0.5rem 1rem;
      font-weight: 600;
      font-size: 0.875rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }

    .pdf-flashcard-header-left {
      flex-shrink: 0;
    }

    .pdf-flashcard-header-right {
      flex-shrink: 0;
      margin-left: auto;
    }

    .pdf-flashcard-content {
      width: 100%;
      height: 100%;
      padding: 1rem;
      overflow: hidden;
      font-family: var(--font-family, Arial, sans-serif);
      font-size: 14px;
      line-height: 1.6;
      text-align: left;
      box-sizing: border-box;
      color: var(--font-color, #171717);
      flex: 1;
    }

    ${cardContentCss}
  `;
}

function buildHeadHtml(fontFamily?: string): string {
  const fontLink = fontFamily && !isSystemFont(fontFamily)
    ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, '+')}:wght@400;600;700&display=swap" />`
    : '';

  return `
    <meta charset="utf-8" />
    ${fontLink}
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" />
  `;
}

type SuspendedStyleEntry = {
  node: HTMLStyleElement | HTMLLinkElement;
  disabled: boolean;
};

function suspendGlobalStyles(): () => void {
  const entries: SuspendedStyleEntry[] = [];
  const styles = document.querySelectorAll('style, link[rel="stylesheet"]');

  styles.forEach((node) => {
    if (node instanceof HTMLStyleElement || node instanceof HTMLLinkElement) {
      entries.push({
        node,
        disabled: node.disabled,
      });
      node.disabled = true;
    }
  });

  return () => {
    entries.forEach(({ node, disabled }) => {
      node.disabled = disabled;
    });
  };
}

export async function exportCollectionToPdf(
  collection: Collection,
  flashcards: Flashcard[],
  cardWidthMm: number,
  cardHeightMm: number
): Promise<Blob> {
  if (!flashcards.length) {
    throw new Error('No flashcards selected for export.');
  }

  loadGoogleFont(collection.font_family ?? 'Arial');

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = `${Math.max(1200, cardWidthMm * 6)}px`;
  iframe.style.height = `${Math.max(1600, cardHeightMm * 6)}px`;
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  try {
    const renderDocument = iframe.contentDocument;
    if (!renderDocument) {
      throw new Error('Failed to initialize PDF render document.');
    }

    renderDocument.open();
    renderDocument.write(`
      <!doctype html>
      <html>
        <head>
          ${buildHeadHtml(collection.font_family)}
          <style>${buildRenderStyles(cardWidthMm, cardHeightMm)}</style>
        </head>
        <body style="margin:0;padding:0;background:#fff;">
          <div class="pdf-root"></div>
        </body>
      </html>
    `);
    renderDocument.close();

    const root = renderDocument.querySelector('.pdf-root');
    if (!root) {
      throw new Error('Failed to initialize PDF render root.');
    }

    for (const card of flashcards) {
      const frontHtml = await buildCardPageHtml(card, 'front', collection);
      const frontPage = renderDocument.createElement('div');
      frontPage.className = 'pdf-page';
      frontPage.innerHTML = frontHtml;
      root.appendChild(frontPage);

      const backHtml = await buildCardPageHtml(card, 'back', collection);
      const backPage = renderDocument.createElement('div');
      backPage.className = 'pdf-page';
      backPage.innerHTML = backHtml;
      root.appendChild(backPage);
    }

    if (renderDocument.fonts && renderDocument.fonts.ready) {
      await renderDocument.fonts.ready;
    }

    const orientation = cardWidthMm > cardHeightMm ? 'landscape' : 'portrait';
    const restoreStyles = suspendGlobalStyles();

    let blob: Blob;
    try {
      blob = await html2pdf()
        .set({
          margin: 0,
          pagebreak: { mode: ['css', 'legacy'] },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
          },
          jsPDF: {
            unit: 'mm',
            format: [cardWidthMm, cardHeightMm],
            orientation,
            compress: true,
          },
        })
        .from(root)
        .outputPdf('blob') as Blob;
    } finally {
      restoreStyles();
    }

    return blob;
  } catch (error) {
    throw error instanceof Error ? error : new Error('Failed to generate PDF');
  } finally {
    document.body.removeChild(iframe);
  }
}
