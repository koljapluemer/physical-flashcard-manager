import { supabase } from './supabase';
import type { Flashcard } from '../types';
import type { Database } from './supabase';

type FlashcardRow = Database['public']['Tables']['flashcards']['Row'];
type FlashcardInsert = Database['public']['Tables']['flashcards']['Insert'];
type FlashcardUpdate = Database['public']['Tables']['flashcards']['Update'];

function mapFlashcard(row: FlashcardRow): Flashcard {
  return {
    id: row.id,
    collection: row.collection_id,
    front: row.front,
    back: row.back,
    header_right: row.header_right ?? undefined,
    is_info_card: row.is_info_card,
    is_favorite: row.is_favorite,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getFlashcards(collectionId?: number): Promise<Flashcard[]> {
  let query = supabase.from('flashcards').select('*').order('sort_order', { ascending: true });

  if (collectionId) {
    query = query.eq('collection_id', collectionId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return ((data as FlashcardRow[] | null) ?? []).map(mapFlashcard);
}

export async function getFlashcard(id: number): Promise<Flashcard> {
  const { data, error } = await supabase
    .from('flashcards')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Flashcard not found');
  }

  return mapFlashcard(data as FlashcardRow);
}

export async function createFlashcard(data: {
  collection: number;
  front: string;
  back: string;
  header_right?: string;
  is_info_card?: boolean;
}): Promise<Flashcard> {
  const payload: FlashcardInsert = {
    collection_id: data.collection,
    front: data.front,
    back: data.back,
    header_right: data.header_right ?? null,
    is_info_card: data.is_info_card ?? false,
  };

  const { data: inserted, error } = await supabase
    .from('flashcards')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const insertedRow = inserted as FlashcardRow;

  // Set sort_order = max(sort_order) + 1 for this collection so new cards appear at the end
  const { data: maxData } = await supabase
    .from('flashcards')
    .select('sort_order')
    .eq('collection_id', data.collection)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSortOrder = maxData ? (maxData.sort_order ?? 0) + 1 : 1;

  const { data: updated, error: updateError } = await supabase
    .from('flashcards')
    .update({ sort_order: nextSortOrder })
    .eq('id', insertedRow.id)
    .select('*')
    .single();

  if (updateError) {
    throw new Error(updateError.message);
  }

  return mapFlashcard(updated as FlashcardRow);
}

export async function updateFlashcard(
  id: number,
  data: Partial<{ front: string; back: string; header_right?: string; is_info_card?: boolean; is_favorite?: boolean; sort_order?: number }>
): Promise<Flashcard> {
  const payload: FlashcardUpdate = {
    front: data.front,
    back: data.back,
    header_right: data.header_right ?? null,
    is_info_card: data.is_info_card,
    is_favorite: data.is_favorite,
    sort_order: data.sort_order,
  };

  const { data: updated, error } = await supabase
    .from('flashcards')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapFlashcard(updated as FlashcardRow);
}

export async function deleteFlashcard(id: number): Promise<void> {
  const { error } = await supabase.from('flashcards').delete().eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
}
