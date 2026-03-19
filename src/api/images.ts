import { supabase } from './supabase';
import { generateImageName } from '../utils/imageNames';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const IMAGES_BUCKET = 'images';

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

function ensureImage(file: File): void {
  if (!MIME_TO_EXT[file.type]) {
    throw new Error('Only image files are supported (JPEG, PNG, GIF, WebP).');
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('Image is too large. Please pick an image under 10 MB.');
  }
}

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw new Error(error.message);
  }
  if (!data.user) {
    throw new Error('You need to be signed in to upload images.');
  }
  return data.user.id;
}

export async function uploadImage(file: File, collectionId: string): Promise<string> {
  ensureImage(file);

  const userId = await getCurrentUserId();
  const ext = MIME_TO_EXT[file.type];
  const storagePath = `${userId}/${collectionId}/${generateImageName()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(IMAGES_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from(IMAGES_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function deleteImage(storagePath: string): Promise<void> {
  const { error } = await supabase.storage.from(IMAGES_BUCKET).remove([storagePath]);
  if (error) {
    throw new Error(error.message);
  }
}
