import { remove, listByCollection, create as createStored, get as getStored, update as updateStored } from '../services/materialsStore';
import type { Material } from '../types';

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

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

export async function getMaterials(collectionId: number): Promise<Material[]> {
  return listByCollection(collectionId);
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

  const now = new Date().toISOString();
  const pageCount = params.pageRangeEnd - params.pageRangeStart + 1;

  const material: Material = {
    id: crypto.randomUUID(),
    collectionId: params.collectionId,
    internalName: buildInternalName(params.file, params.internalName),
    originalFilename: params.file.name,
    pageRangeStart: params.pageRangeStart,
    pageRangeEnd: params.pageRangeEnd,
    pageCount,
    file: params.file,
    createdAt: now,
    updatedAt: now,
  };

  return createStored(material);
}

export async function renameMaterial(id: string, internalName: string): Promise<Material> {
  const existing = await getStored(id);
  if (!existing) {
    throw new Error('Material not found.');
  }
  const trimmed = internalName.trim();
  if (!trimmed) {
    throw new Error('Internal name cannot be empty.');
  }
  const updated: Material = {
    ...existing,
    internalName: trimmed,
    updatedAt: new Date().toISOString(),
  };
  return updateStored(updated);
}

export async function replaceMaterial(
  id: string,
  params: {
    file?: File;
    internalName?: string;
    pageRangeStart?: number;
    pageRangeEnd?: number;
  }
): Promise<Material> {
  const existing = await getStored(id);
  if (!existing) {
    throw new Error('Material not found.');
  }

  const file = params.file ?? (existing.file as File | Blob);
  if (!(file instanceof Blob)) {
    throw new Error('Missing file for material.');
  }

  ensurePdf(file as File);

  const start = params.pageRangeStart ?? existing.pageRangeStart;
  const end = params.pageRangeEnd ?? existing.pageRangeEnd;
  validateRange(start, end);

  const updated: Material = {
    ...existing,
    file,
    originalFilename: file instanceof File ? file.name : existing.originalFilename,
    internalName: params.internalName ? params.internalName.trim() || existing.internalName : existing.internalName,
    pageRangeStart: start,
    pageRangeEnd: end,
    pageCount: end - start + 1,
    updatedAt: new Date().toISOString(),
  };

  return updateStored(updated);
}

export async function deleteMaterial(id: string): Promise<void> {
  await remove(id);
}
