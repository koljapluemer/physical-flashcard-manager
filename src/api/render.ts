import type { Collection, Flashcard } from '../types';

interface RenderRequest {
  pages: string[];
  headHtml: string;
  pageSize?: [number, number]; // [width, height] in millimeters
}

function buildCardPageHtml(card: Flashcard, side: 'front' | 'back'): string {
  const content = side === 'front' ? card.front : card.back;

  return `
    <div class="flashcard-preview-content">
      ${content}
    </div>
  `;
}

function buildHeadHtml(): string {
  // Exact CSS from cardPreview.css
  const cardPreviewStyles = `
.flashcard-preview-content {
  padding: 1rem;
  overflow: hidden;
  font-family: "Helvetica Neue", Arial, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: #222;
}

.flashcard-preview-content p {
  margin: 0 0 0.75em 0;
}

.flashcard-preview-content p:last-child {
  margin-bottom: 0;
}

.flashcard-preview-content h1,
.flashcard-preview-content h2,
.flashcard-preview-content h3,
.flashcard-preview-content h4 {
  margin: 0 0 0.5em 0;
  font-weight: 600;
  line-height: 1.3;
}

.flashcard-preview-content h1 { font-size: 1.75em; }
.flashcard-preview-content h2 { font-size: 1.5em; }
.flashcard-preview-content h3 { font-size: 1.25em; }
.flashcard-preview-content h4 { font-size: 1.1em; }

.flashcard-preview-content ul,
.flashcard-preview-content ol {
  margin: 0 0 0.75em 0;
  padding-left: 1.5em;
}

.flashcard-preview-content li {
  margin-bottom: 0.25em;
}

.flashcard-preview-content strong {
  font-weight: 600;
}

.flashcard-preview-content em {
  font-style: italic;
}

.flashcard-preview-content img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0.5em 0;
}

.flashcard-preview-content .math-inline {
  font-size: 1.05em;
}

.flashcard-preview-content .math-block {
  display: block;
  margin: 1em 0;
  text-align: center;
}
`;

  return `
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" />
    <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
    <style>
      body { margin: 0; padding: 0; }
      ${cardPreviewStyles}
    </style>
  `;
}

export async function exportCollectionToPdf(
  _collection: Collection,
  flashcards: Flashcard[],
  cardWidthMm: number,
  cardHeightMm: number
): Promise<Blob> {
  const renderApiUrl = import.meta.env.VITE_RENDER_API_URL;

  if (!renderApiUrl) {
    throw new Error('VITE_RENDER_API_URL is not configured');
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
