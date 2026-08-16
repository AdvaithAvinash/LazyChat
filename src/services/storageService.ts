import { supabase } from '@/config/supabase';

export type PickedFile = {
  uri: string;
  name: string;
  mimeType: string;
};

export type UploadResult = {
  url: string;
  mimeType: string;
  fileName: string;
  resourceType: 'image' | 'video' | 'raw';
};

const BUCKET = 'chat-media';

function resourceTypeFor(mimeType: string): 'image' | 'video' | 'raw' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/') || mimeType.startsWith('audio/')) return 'video';
  return 'raw';
}

function extensionFor(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1] : 'bin';
}

/**
 * Uploads a locally-picked file into the `chat-media` bucket under the
 * current user's own folder (storage RLS requires the first path segment to
 * match auth.uid(), see supabase/migrations/0002_storage.sql) and returns
 * its public URL.
 */
export async function uploadToStorage(uid: string, file: PickedFile): Promise<UploadResult> {
  const arrayBuffer = await fetch(file.uri).then((res) => res.arrayBuffer());
  const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extensionFor(file.name)}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, arrayBuffer, {
    contentType: file.mimeType,
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return {
    url: data.publicUrl,
    mimeType: file.mimeType,
    fileName: file.name,
    resourceType: resourceTypeFor(file.mimeType),
  };
}
