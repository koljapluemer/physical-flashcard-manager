import cardContentCss from '../styles/cardContent.css?raw';
import cardLayoutCss from '../styles/cardLayout.css?raw';
import logoDataUrl from '../../public/logo.png?inline';
import { markdownToHtml } from '../utils/markdownToHtml';
import { hexToRgba, normalizeHexColor } from '../utils/color';
import { getFontCSSValue, isSystemFont } from '../utils/fonts';
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

  if (layout === '2-columns') {
    return `<div class="card-layout-2col">
      <div class="card-col">${rendered.left ?? ''}</div>
      <div class="card-col card-col-right">${rendered.right ?? ''}</div>
    </div>`;
  }

  if (layout === '3-columns') {
    return `<div class="card-layout-3col">
      <div class="card-col">${rendered.left ?? ''}</div>
      <div class="card-col card-col-center">${rendered.center ?? ''}</div>
      <div class="card-col card-col-right">${rendered.right ?? ''}</div>
    </div>`;
  }

  if (layout === 'top-row-2-columns') {
    return `<div class="card-layout-top2col">
      <div class="card-top-row">${rendered.top ?? ''}</div>
      <div class="card-2col-row">
        <div class="card-col">${rendered.left ?? ''}</div>
        <div class="card-col card-col-right">${rendered.right ?? ''}</div>
      </div>
    </div>`;
  }

  if (layout === 'bottom-row-2-columns') {
    return `<div class="card-layout-bottom2col">
      <div class="card-2col-row">
        <div class="card-col">${rendered.left ?? ''}</div>
        <div class="card-col card-col-right">${rendered.right ?? ''}</div>
      </div>
      <div class="card-bottom-row">${rendered.bottom ?? ''}</div>
    </div>`;
  }

  return '';
}

async function buildCardHtml(card: Flashcard, side: 'front' | 'back', collection: Collection): Promise<string> {
  const rawContent = side === 'front' ? card.front : card.back;
  const sideData = parseCardSide(rawContent);

  const headerColor = normalizeHexColor(collection.header_color);
  const boxBgColor = hexToRgba(headerColor, 0.08);
  const boxBorderColor = hexToRgba(headerColor, 0.16);
  const backgroundColor = collection.background_color ?? '#f0f0f0';
  const fontColor = collection.font_color ?? '#171717';
  const headerFontColor = collection.header_font_color ?? '#ffffff';
  // Replace double quotes with single quotes — fontFamily goes inside style="..."
  // HTML attributes, and double-quoted font names like "Open Sans" would break
  // the attribute boundary.
  const fontFamily = getFontCSSValue(collection.font_family ?? 'Arial').replace(/"/g, "'");
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
      <div class="flashcard-preview-content pdf-flashcard-content" style="color: ${fontColor}; font-family: ${fontFamily};">
        ${layoutHtml}
      </div>
      <div class="pdf-watermark"></div>
    </div>
  `;
}

function buildHeadHtml(collection: Collection, cardWidthMm: number, cardHeightMm: number): string {
  const fontFamily = collection.font_family ?? 'Arial';
  const fontLink = !isSystemFont(fontFamily)
    ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, '+')}:wght@400;600;700&display=swap" />`
    : '';

  return `
    ${fontLink}
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }

      :root { --base-font-size: ${parseFloat(collection.font_size ?? '14')}px; }

      .pdf-page {
        width: ${cardWidthMm}mm;
        height: ${cardHeightMm}mm;
        overflow: hidden;
      }

      .pdf-flashcard {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        position: relative;
        background: var(--background-color, #fff);
      }

      .pdf-watermark {
        position: absolute;
        bottom: 6px;
        right: 6px;
        height: 40px;
        width: 160px;
        background-image: url(${logoDataUrl});
        background-size: auto 100%;
        background-repeat: no-repeat;
        background-position: right bottom;
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

      ${cardContentCss}
      ${cardLayoutCss}
    </style>
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

  const pages = await Promise.all(
    flashcards.flatMap((card) =>
      (['front', 'back'] as const).map((side) => buildCardHtml(card, side, collection))
    )
  );

  const headHtml = buildHeadHtml(collection, cardWidthMm, cardHeightMm);
  const rendererUrl = import.meta.env.VITE_RENDERER_URL;
  console.log('[PDF] VITE_RENDERER_URL =', rendererUrl);

  console.log('[PDF] Sending render request to', `${rendererUrl}/render`, {
    pageCount: pages.length,
    pageSize: [cardWidthMm, cardHeightMm],
  });

  const response = await fetch(`${rendererUrl}/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pages, headHtml, pageSize: [cardWidthMm, cardHeightMm] }),
  });

  console.log('[PDF] Renderer response:', response.status, response.statusText);

  if (!response.ok) {
    const rawText = await response.text().catch(() => '(could not read response body)');
    console.error('[PDF] Renderer error response body:', rawText);
    let errMsg = 'Failed to generate PDF';
    try {
      const err = JSON.parse(rawText);
      errMsg = err.error ?? errMsg;
    } catch {
      if (rawText && rawText !== '(could not read response body)') errMsg = rawText;
    }
    throw new Error(errMsg);
  }

  return response.blob();
}
