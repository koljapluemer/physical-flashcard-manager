import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import cardContentCss from '../styles/cardContent.css?raw';
import { markdownToHtml } from '../utils/markdownToHtml';
import { hexToRgba, normalizeHexColor } from '../utils/color';
import { getFontCSSValue, isSystemFont, loadGoogleFont } from '../utils/fonts';
import { parseCardSide } from '../utils/cardSide';
import type { Collection, Flashcard } from '../types';

async function buildLayoutContentHtml(sideData: ReturnType<typeof parseCardSide>): Promise<string> {
  const { layout, sections } = sideData;

  const rendered: Record<string, string> = {};
  await Promise.all(
    Object.entries(sections).map(async ([key, content]) => {
      rendered[key] = content.trim() ? await markdownToHtml(content) : '';
    })
  );

  if (layout === 'default') {
    return rendered.main ?? '';
  }

  const colSep = `padding-left:8px;min-width:0;overflow:hidden;`;
  const colBase = `min-width:0;overflow:hidden;`;
  const rowSep = `padding-bottom:6px;margin-bottom:6px;`;
  const rowSepTop = `padding-top:6px;margin-top:6px;`;

  if (layout === '2-columns') {
    return `<div style="display:grid;grid-template-columns:1fr 1fr;">
      <div style="${colBase}">${rendered.left ?? ''}</div>
      <div style="${colSep}">${rendered.right ?? ''}</div>
    </div>`;
  }

  if (layout === 'top-row-2-columns') {
    return `<div>
      <div style="${rowSep}">${rendered.top ?? ''}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;">
        <div style="${colBase}">${rendered.left ?? ''}</div>
        <div style="${colSep}">${rendered.right ?? ''}</div>
      </div>
    </div>`;
  }

  if (layout === 'bottom-row-2-columns') {
    return `<div>
      <div style="display:grid;grid-template-columns:1fr 1fr;">
        <div style="${colBase}">${rendered.left ?? ''}</div>
        <div style="${colSep}">${rendered.right ?? ''}</div>
      </div>
      <div style="${rowSepTop}">${rendered.bottom ?? ''}</div>
    </div>`;
  }

  return '';
}

async function buildCardPageHtml(card: Flashcard, side: 'front' | 'back', collection: Collection): Promise<string> {
  const rawContent = side === 'front' ? card.front : card.back;
  const sideData = parseCardSide(rawContent);

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
  const layoutHtml = await buildLayoutContentHtml(sideData);

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
        ${layoutHtml}
      </div>
    </div>
  `;
}

function buildRenderStyles(cardWidthMm: number, cardHeightMm: number): string {
  const pxPerMm = 96 / 25.4;
  const cardWidthPx = Math.round(cardWidthMm * pxPerMm);
  const cardHeightPx = Math.round(cardHeightMm * pxPerMm);

  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      margin: 0;
      padding: 0;
      background: #fff;
    }

    .pdf-page {
      width: ${cardWidthPx}px;
      height: ${cardHeightPx}px;
      overflow: hidden;
      background: var(--background-color, #fff);
    }

    .pdf-flashcard {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--background-color, #fff);
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
      padding: 1rem;
      overflow: hidden;
      font-family: var(--font-family, Arial, sans-serif);
      font-size: 14px;
      line-height: 1.6;
      text-align: left;
      color: var(--font-color, #171717);
      flex: 1 1 0;
      min-height: 0;
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

  const pxPerMm = 96 / 25.4;
  const cardWidthPx = Math.round(cardWidthMm * pxPerMm);
  const cardHeightPx = Math.round(cardHeightMm * pxPerMm);

  // Render into an isolated iframe so its styles don't pollute the app
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = `position:fixed;left:-10000px;top:0;width:${cardWidthPx}px;height:${cardHeightPx}px;opacity:0;pointer-events:none;border:0;`;
  document.body.appendChild(iframe);

  try {
    const renderDocument = iframe.contentDocument!;

    renderDocument.open();
    renderDocument.write(`<!doctype html><html><head>
      ${buildHeadHtml(collection.font_family)}
      <style>${buildRenderStyles(cardWidthMm, cardHeightMm)}</style>
    </head><body></body></html>`);
    renderDocument.close();

    if (renderDocument.fonts?.ready) {
      await renderDocument.fonts.ready;
    }

    const orientation = cardWidthMm > cardHeightMm ? 'landscape' : 'portrait';
    const pdf = new jsPDF({ unit: 'mm', format: [cardWidthMm, cardHeightMm], orientation, compress: true });

    let firstPage = true;
    for (const card of flashcards) {
      for (const side of ['front', 'back'] as const) {
        const html = await buildCardPageHtml(card, side, collection);

        // Reuse the single iframe body — render one page at a time
        renderDocument.body.innerHTML = html;
        renderDocument.body.className = 'pdf-page';

        // Small delay to let the browser apply styles
        await new Promise(r => setTimeout(r, 30));

        const canvas = await html2canvas(renderDocument.body, {
          scale: 2,
          useCORS: true,
          backgroundColor: collection.background_color ?? '#f0f0f0',
          width: cardWidthPx,
          height: cardHeightPx,
          windowWidth: cardWidthPx,
          windowHeight: cardHeightPx,
        });

        if (!firstPage) pdf.addPage();
        firstPage = false;

        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, cardWidthMm, cardHeightMm);
      }
    }

    return pdf.output('blob');
  } catch (error) {
    throw error instanceof Error ? error : new Error('Failed to generate PDF');
  } finally {
    document.body.removeChild(iframe);
  }
}
