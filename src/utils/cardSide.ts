import type { CardLayout, CardSideData } from '../types';

export const LAYOUT_SECTIONS: Record<CardLayout, string[]> = {
  'default': ['main'],
  '2-columns': ['left', 'right'],
  '3-columns': ['left', 'center', 'right'],
  'top-row-2-columns': ['top', 'left', 'right'],
  'bottom-row-2-columns': ['left', 'right', 'bottom'],
};

export const LAYOUT_LABELS: Record<CardLayout, string> = {
  'default': 'Default (single column)',
  '2-columns': '2 Columns',
  '3-columns': '3 Columns',
  'top-row-2-columns': 'Row on top, 2 columns below',
  'bottom-row-2-columns': '2 columns, row on bottom',
};

export function emptyCardSide(layout: CardLayout): CardSideData {
  const sections: Record<string, string> = {};
  for (const key of LAYOUT_SECTIONS[layout]) {
    sections[key] = '';
  }
  return { layout, sections };
}

export function parseCardSide(str: string): CardSideData {
  if (!str.trim()) {
    return emptyCardSide('default');
  }
  try {
    const parsed = JSON.parse(str);
    if (parsed && typeof parsed === 'object' && typeof parsed.layout === 'string' && typeof parsed.sections === 'object') {
      return parsed as CardSideData;
    }
  } catch {
    // not JSON, treat as plain markdown in default layout
  }
  return { layout: 'default', sections: { main: str } };
}

export function serializeCardSide(data: CardSideData): string {
  return JSON.stringify(data);
}
