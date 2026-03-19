import JSZip from 'jszip';
import type { Flashcard } from '../types';
import type { CardSideData } from '../types';

export interface CardExportData {
  id?: number;
  front: CardSideData;
  back: CardSideData;
  header_right?: string;
  is_info_card?: boolean;
  is_favorite?: boolean;
  sort_order?: number;
}

export async function exportCardsToZip(cards: Flashcard[]): Promise<Blob> {
  const zip = new JSZip();

  for (const card of cards) {
    let front: CardSideData;
    let back: CardSideData;
    try {
      front = JSON.parse(card.front) as CardSideData;
    } catch {
      front = { layout: 'default', sections: { main: card.front } };
    }
    try {
      back = JSON.parse(card.back) as CardSideData;
    } catch {
      back = { layout: 'default', sections: { main: card.back } };
    }

    const data: CardExportData = {
      id: card.id,
      front,
      back,
      header_right: card.header_right,
      is_info_card: card.is_info_card,
      is_favorite: card.is_favorite,
      sort_order: card.sort_order,
    };

    const filename = `${String(card.sort_order).padStart(4, '0')}_${card.id}.json`;
    zip.file(filename, JSON.stringify(data, null, 2));
  }

  return zip.generateAsync({ type: 'blob' });
}

export async function importCardsFromZip(file: File): Promise<CardExportData[]> {
  const zip = await JSZip.loadAsync(file);
  const results: CardExportData[] = [];

  const jsonFiles = Object.values(zip.files).filter(
    (f) => !f.dir && f.name.endsWith('.json')
  );

  for (const zipEntry of jsonFiles) {
    const text = await zipEntry.async('text');
    try {
      const parsed = JSON.parse(text) as CardExportData;
      results.push(parsed);
    } catch {
      // skip malformed files
    }
  }

  return results;
}
