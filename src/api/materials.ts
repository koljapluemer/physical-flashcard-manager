import { supabase } from './supabase';
import type { Material } from '../types';
import type { Database } from './supabase';

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
const MATERIALS_BUCKET = import.meta.env.VITE_SUPABASE_MATERIALS_BUCKET ?? 'materials';

type MaterialRow = Database['public']['Tables']['materials']['Row'];
type MaterialInsert = Database['public']['Tables']['materials']['Insert'];

function mapMaterial(row: MaterialRow): Material {
  return {
    id: row.id,
    collectionId: row.collection_id,
    internalName: row.internal_name,
    originalFilename: row.original_filename,
    pageRangeStart: row.page_range_start,
    pageRangeEnd: row.page_range_end,
    pageCount: row.page_count,
    storagePath: row.storage_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function ensurePdf(file: File) {
  const isPdfType = file.type === 'application/pdf' || file.type === 'application/x-pdf';
  const hasPdfExtension = file.name.toLowerCase().endsWith('.pdf');
  if (!isPdfType && !hasPdfExtension) {
    throw new Error('Only PDF files are supported.');
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('File is too large. Please pick a PDF under 15 MB.');
  }
}

function validateRange(start: number, end: number) {
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new Error('Page range must be numbers.');
  }
  if (start < 1) {
    throw new Error('Page start must be at least 1.');
  }
  if (end < start) {
    throw new Error('Page end must be greater than or equal to start.');
  }
}

function buildInternalName(file: File, internalName?: string): string {
  if (internalName && internalName.trim()) {
    return internalName.trim();
  }
  const nameWithoutExt = file.name.replace(/\.pdf$/i, '').trim();
  return nameWithoutExt || 'Material';
}

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw new Error(error.message);
  }
  if (!data.user) {
    throw new Error('You need to be signed in to manage materials.');
  }
  return data.user.id;
}

export async function getMaterials(collectionId: number): Promise<Material[]> {
  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .eq('collection_id', collectionId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data as MaterialRow[] | null) ?? []).map(mapMaterial);
}

export async function createMaterial(params: {
  collectionId: number;
  file: File;
  internalName?: string;
  pageRangeStart: number;
  pageRangeEnd: number;
}): Promise<Material> {
  ensurePdf(params.file);
  validateRange(params.pageRangeStart, params.pageRangeEnd);

  const userId = await getCurrentUserId();
  const now = new Date().toISOString();
  const pageCount = params.pageRangeEnd - params.pageRangeStart + 1;
  const sanitizedFilename = sanitizeFilename(params.file.name) || `${crypto.randomUUID()}.pdf`;
  const storagePath = `${userId}/${params.collectionId}/${crypto.randomUUID()}-${sanitizedFilename}`;

  const { error: uploadError } = await supabase.storage
    .from(MATERIALS_BUCKET)
    .upload(storagePath, params.file, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const payload: MaterialInsert = {
    collection_id: params.collectionId,
    internal_name: buildInternalName(params.file, params.internalName),
    original_filename: params.file.name,
    page_range_start: params.pageRangeStart,
    page_range_end: params.pageRangeEnd,
    page_count: pageCount,
    storage_path: storagePath,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from('materials')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    await supabase.storage.from(MATERIALS_BUCKET).remove([storagePath]);
    throw new Error(error.message);
  }

  return mapMaterial(data as MaterialRow);
}

export async function deleteMaterial(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('materials')
    .select('id, storage_path')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Material not found.');
  }

  const { error: deleteRowError } = await supabase.from('materials').delete().eq('id', id);
  if (deleteRowError) {
    throw new Error(deleteRowError.message);
  }

  const row = data as { id: string; storage_path: string | null };

  if (row.storage_path) {
    const { error: removeFileError } = await supabase.storage
      .from(MATERIALS_BUCKET)
      .remove([row.storage_path]);

    if (removeFileError) {
      console.warn('Material file could not be deleted from storage:', removeFileError.message);
    }
  }
}
