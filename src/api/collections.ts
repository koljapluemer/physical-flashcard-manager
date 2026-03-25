import { supabase } from './supabase';
import type { Collection } from '../types';
import type { Database } from './supabase';

type CollectionRow = Database['public']['Tables']['collections']['Row'];
type CollectionInsert = Database['public']['Tables']['collections']['Insert'];
type CollectionUpdate = Database['public']['Tables']['collections']['Update'];

function mapCollection(row: CollectionRow): Collection {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    width_mm: row.width_mm,
    height_mm: row.height_mm,
    font_family: row.font_family,
    font_size: row.font_size ?? undefined,
    header_color: row.header_color,
    background_color: row.background_color,
    font_color: row.font_color,
    header_font_color: row.header_font_color,
    header_text_left: row.header_text_left ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getCollections(): Promise<Collection[]> {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data as CollectionRow[] | null) ?? []).map(mapCollection);
}

export async function getCollection(id: number): Promise<Collection> {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Collection not found');
  }

  return mapCollection(data as CollectionRow);
}

export async function createCollection(data: {
  title: string;
  description?: string;
  width_mm?: string;
  height_mm?: string;
  font_family?: string;
  font_size?: string;
  header_color?: string;
  background_color?: string;
  font_color?: string;
  header_font_color?: string;
  header_text_left?: string;
}): Promise<Collection> {
  const payload = {
    title: data.title,
    description: data.description ?? null,
    width_mm: data.width_mm,
    height_mm: data.height_mm,
    font_family: data.font_family,
    font_size: data.font_size ?? null,
    header_color: data.header_color,
    background_color: data.background_color,
    font_color: data.font_color,
    header_font_color: data.header_font_color,
    header_text_left: data.header_text_left ?? null,
  } as CollectionInsert;

  const { data: inserted, error } = await supabase
    .from('collections')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapCollection(inserted as CollectionRow);
}

export async function updateCollection(
  id: number,
  data: Partial<{
    title: string;
    description?: string;
    width_mm?: string;
    height_mm?: string;
    font_family?: string;
    font_size?: string;
    header_color?: string;
    background_color?: string;
    font_color?: string;
    header_font_color?: string;
    header_text_left?: string;
  }>
): Promise<Collection> {
  const payload = {
    title: data.title,
    description: data.description ?? null,
    width_mm: data.width_mm,
    height_mm: data.height_mm,
    font_family: data.font_family,
    font_size: data.font_size ?? null,
    header_color: data.header_color,
    background_color: data.background_color,
    font_color: data.font_color,
    header_font_color: data.header_font_color,
    header_text_left: data.header_text_left ?? null,
  } as CollectionUpdate;

  const { data: updated, error } = await supabase
    .from('collections')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapCollection(updated as CollectionRow);
}

export async function deleteCollection(id: number): Promise<void> {
  const { error } = await supabase.from('collections').delete().eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function duplicateCollection(id: number): Promise<Collection> {
  const original = await getCollection(id);

  const newCollection = await createCollection({
    title: `Copy of ${original.title}`,
    description: original.description,
    width_mm: original.width_mm ?? undefined,
    height_mm: original.height_mm ?? undefined,
    font_family: original.font_family ?? undefined,
    font_size: original.font_size,
    header_color: original.header_color ?? undefined,
    background_color: original.background_color ?? undefined,
    font_color: original.font_color ?? undefined,
    header_font_color: original.header_font_color ?? undefined,
    header_text_left: original.header_text_left,
  });

  const { data: flashcards, error: flashcardsError } = await supabase
    .from('flashcards')
    .select('*')
    .eq('collection_id', id)
    .order('sort_order', { ascending: true });

  if (flashcardsError) {
    throw new Error(flashcardsError.message);
  }

  type FlashcardRow = Database['public']['Tables']['flashcards']['Row'];

  if (flashcards && flashcards.length > 0) {
    const insertPayload = (flashcards as FlashcardRow[]).map((card) => ({
      collection_id: newCollection.id,
      front: card.front,
      back: card.back,
      header_right: card.header_right ?? null,
      is_info_card: card.is_info_card,
      is_favorite: card.is_favorite,
      sort_order: card.sort_order,
    }));

    const { error: insertError } = await supabase.from('flashcards').insert(insertPayload);

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  return newCollection;
}
