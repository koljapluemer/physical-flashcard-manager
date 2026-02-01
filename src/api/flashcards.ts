import { apiRequest } from './client';
import type { Flashcard } from '../types';

export async function getFlashcards(collectionId?: number): Promise<Flashcard[]> {
  const url = collectionId ? `/flashcards/?collection=${collectionId}` : '/flashcards/';
  return apiRequest<Flashcard[]>(url);
}

export async function getFlashcard(id: number): Promise<Flashcard> {
  return apiRequest<Flashcard>(`/flashcards/${id}/`);
}

export async function createFlashcard(data: {
  collection: number;
  front: string;
  back: string;
  header_right?: string;
  is_info_card?: boolean;
}): Promise<Flashcard> {
  return apiRequest<Flashcard>('/flashcards/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateFlashcard(
  id: number,
  data: Partial<{ front: string; back: string; header_right?: string; is_info_card?: boolean }>
): Promise<Flashcard> {
  return apiRequest<Flashcard>(`/flashcards/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteFlashcard(id: number): Promise<void> {
  return apiRequest<void>(`/flashcards/${id}/`, {
    method: 'DELETE',
  });
}
