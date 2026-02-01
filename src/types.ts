export interface Collection {
  id: number;
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
  created_at: string;
  updated_at: string;
}

export interface Flashcard {
  id: number;
  collection: number;
  front: string;
  back: string;
  header_right?: string;
  is_info_card?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Material {
  id: string;
  collectionId: number;
  internalName: string;
  originalFilename: string;
  pageRangeStart: number;
  pageRangeEnd: number;
  pageCount: number;
  file: Blob;
  createdAt: string;
  updatedAt: string;
}
