import { apiRequest } from './client';
import type { Collection } from '../types';

export async function getCollections(): Promise<Collection[]> {
  return apiRequest<Collection[]>('/collections/');
}

export async function getCollection(id: number): Promise<Collection> {
  return apiRequest<Collection>(`/collections/${id}/`);
}

export async function createCollection(data: {
  title: string;
  description?: string;
  width_mm?: string;
  height_mm?: string;
  font_family?: string;
  header_color?: string;
  background_color?: string;
  font_color?: string;
  header_font_color?: string;
  header_text_left?: string;
}): Promise<Collection> {
  return apiRequest<Collection>('/collections/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCollection(
  id: number,
  data: Partial<{
    title: string;
    description?: string;
    width_mm?: string;
    height_mm?: string;
    font_family?: string;
    header_color?: string;
    background_color?: string;
    font_color?: string;
    header_font_color?: string;
    header_text_left?: string;
  }>
): Promise<Collection> {
  return apiRequest<Collection>(`/collections/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteCollection(id: number): Promise<void> {
  return apiRequest<void>(`/collections/${id}/`, {
    method: 'DELETE',
  });
}
