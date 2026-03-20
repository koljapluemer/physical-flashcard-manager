import { createClient } from '@supabase/supabase-js';

export type Database = {
  public: {
    Tables: {
      collections: {
        Row: {
          id: number;
          user_id: string;
          title: string;
          description: string | null;
          width_mm: string;
          height_mm: string;
          font_family: string;
          font_size: string | null;
          header_color: string;
          background_color: string;
          font_color: string;
          header_font_color: string;
          header_text_left: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          user_id?: string;
          title: string;
          description?: string | null;
          width_mm?: string;
          height_mm?: string;
          font_family?: string;
          font_size?: string | null;
          header_color?: string;
          background_color?: string;
          font_color?: string;
          header_font_color?: string;
          header_text_left?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          title?: string;
          description?: string | null;
          width_mm?: string;
          height_mm?: string;
          font_family?: string;
          font_size?: string | null;
          header_color?: string;
          background_color?: string;
          font_color?: string;
          header_font_color?: string;
          header_text_left?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      flashcards: {
        Row: {
          id: number;
          user_id: string;
          collection_id: number;
          front: string;
          back: string;
          header_right: string | null;
          is_info_card: boolean;
          is_favorite: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          user_id?: string;
          collection_id: number;
          front: string;
          back: string;
          header_right?: string | null;
          is_info_card?: boolean;
          is_favorite?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          collection_id?: number;
          front?: string;
          back?: string;
          header_right?: string | null;
          is_info_card?: boolean;
          is_favorite?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'flashcards_collection_id_fkey';
            columns: ['collection_id'];
            isOneToOne: false;
            referencedRelation: 'collections';
            referencedColumns: ['id'];
          },
        ];
      };
      materials: {
        Row: {
          id: string;
          user_id: string;
          collection_id: number;
          internal_name: string;
          original_filename: string;
          storage_path: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          collection_id: number;
          internal_name: string;
          original_filename: string;
          storage_path: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          collection_id?: number;
          internal_name?: string;
          original_filename?: string;
          storage_path?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'materials_collection_id_fkey';
            columns: ['collection_id'];
            isOneToOne: false;
            referencedRelation: 'collections';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
