export interface Collection {
  id: number;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Flashcard {
  id: number;
  collection: number;
  front: string;
  back: string;
  created_at: string;
  updated_at: string;
}
