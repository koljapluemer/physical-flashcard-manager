import cardContentCss from '../styles/cardContent.css?raw';
import { renderMathHtml } from '../utils/math';
import { hexToRgba, normalizeHexColor } from '../utils/color';
import { getFontCSSValue, isSystemFont } from '../utils/fonts';
import type { Collection, Flashcard } from '../types';

interface RenderRequest {
  pages: string[];
  headHtml: string;
  pageSize?: [number, number]; // [width, height] in millimeters
}

function buildCardPageHtml(card: Flashcard, side: 'front' | 'back', collection: Collection): string {
  const content = side === 'front' ? card.front : card.back;
  const renderedContent = renderMathHtml(content);

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
      class="flashcard-page"
      style="
        background-color: ${backgroundColor};
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
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
        <div class="flashcard-header" style="background-color: ${headerColor}; color: ${headerFontColor}; padding: 0.5rem 1rem; font-weight: 600; font-size: 0.875rem; display: flex; justify-content: space-between; align-items: center;">
          ${headerTextLeft ? `<span style="flex-shrink: 0;">${headerTextLeft}</span>` : ''}
          ${headerTextRight ? `<span style="flex-shrink: 0; margin-left: auto;">${headerTextRight}</span>` : ''}
        </div>
      ` : ''}
      <div class="flashcard-preview-content" style="color: ${fontColor}; flex: 1;">
        ${renderedContent}
      </div>
    </div>
  `;
}

function buildHeadHtml(fontFamily?: string): string {
  const fontLink = fontFamily && !isSystemFont(fontFamily)
    ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, '+')}:wght@400;600;700&display=swap" />`
    : '';

  const fontCss = getFontCSSValue(fontFamily ?? 'Arial');

  return `
    ${fontLink}
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" />
    <style>
      :root {
        color-scheme: light;
      }

      html, body {
        margin: 0;
        padding: 0;
        font-family: ${fontCss};
        background: #fff;
        height: 100%;
      }

      .pdf-page {
        height: 100%;
        page-break-after: always;
        page-break-inside: avoid;
      }

      .pdf-page:last-child {
        page-break-after: auto;
      }

      .flashcard-page {
        height: 100%;
        box-sizing: border-box;
      }

${cardContentCss}
    </style>
  `;
}

export async function exportCollectionToPdf(
  collection: Collection,
  flashcards: Flashcard[],
  cardWidthMm: number,
  cardHeightMm: number
): Promise<Blob> {
  const renderApiUrl = import.meta.env.VITE_BACKEND_RENDER_URL;

  if (!renderApiUrl) {
    throw new Error('VITE_BACKEND_RENDER_URL is not configured');
  }

  // Build pages array: 2 pages per card (front, then back)
  const pages: string[] = [];
  for (const card of flashcards) {
    pages.push(buildCardPageHtml(card, 'front', collection));
    pages.push(buildCardPageHtml(card, 'back', collection));
  }

  const requestBody: RenderRequest = {
    pages,
    headHtml: buildHeadHtml(collection.font_family),
    pageSize: [cardWidthMm, cardHeightMm],
  };

  const response = await fetch(`${renderApiUrl}/render`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    let errorMessage = `Failed to generate PDF (status ${response.status})`;
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // Ignore JSON parse errors
    }
    throw new Error(errorMessage);
  }

  return response.blob();
}
