import cardContentCss from '../styles/cardContent.css?raw';
import { renderMathHtml } from '../utils/math';
import type { Collection, Flashcard } from '../types';

interface RenderRequest {
  pages: string[];
  headHtml: string;
  pageSize?: [number, number]; // [width, height] in millimeters
}

function buildCardPageHtml(card: Flashcard, side: 'front' | 'back'): string {
  const content = side === 'front' ? card.front : card.back;
  const renderedContent = renderMathHtml(content);

  return `
    <div class="flashcard-preview-content">
      ${renderedContent}
    </div>
  `;
}

function buildHeadHtml(): string {
  return `
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" />
    <style>
      :root {
        color-scheme: light;
      }

      body {
        margin: 0;
        padding: 0;
        font-family: "Helvetica Neue", Arial, sans-serif;
        background: #fff;
      }

${cardContentCss}
    </style>
  `;
}

export async function exportCollectionToPdf(
  _collection: Collection,
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
    pages.push(buildCardPageHtml(card, 'front'));
    pages.push(buildCardPageHtml(card, 'back'));
  }

  const requestBody: RenderRequest = {
    pages,
    headHtml: buildHeadHtml(),
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
