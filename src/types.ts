export interface Collection {
  id: number;
  title: string;
  description?: string;
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
  created_at: string;
  updated_at: string;
}
