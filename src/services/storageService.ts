import { cloudinaryConfig, cloudinaryUploadUrl } from '@/config/cloudinary';

export type PickedFile = {
  uri: string;
  name: string;
  mimeType: string;
};

export type UploadResult = {
  url: string;
  mimeType: string;
  fileName: string;
  bytes: number;
  resourceType: 'image' | 'video' | 'raw';
};

function resourceTypeFor(mimeType: string): 'image' | 'video' | 'raw' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/') || mimeType.startsWith('audio/')) return 'video';
  return 'raw';
}

/**
 * Uploads directly from the device to Cloudinary using an unsigned upload
 * preset (see README for how to create one) — no backend round trip needed.
 */
export async function uploadToCloudinary(file: PickedFile, onProgress?: (pct: number) => void): Promise<UploadResult> {
  if (!cloudinaryConfig.cloudName || !cloudinaryConfig.uploadPreset) {
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET.');
  }

  const resourceType = resourceTypeFor(file.mimeType);

  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
  } as unknown as Blob);
  formData.append('upload_preset', cloudinaryConfig.uploadPreset);

  const response = await uploadWithProgress(cloudinaryUploadUrl(resourceType), formData, onProgress);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Cloudinary upload failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as { secure_url: string; bytes: number };

  return {
    url: data.secure_url,
    mimeType: file.mimeType,
    fileName: file.name,
    bytes: data.bytes,
    resourceType,
  };
}

function uploadWithProgress(
  url: string,
  formData: FormData,
  onProgress?: (pct: number) => void
): Promise<Response> {
  if (!onProgress) return fetch(url, { method: 'POST', body: formData });

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      resolve(
        new Response(xhr.responseText, {
          status: xhr.status,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
}
