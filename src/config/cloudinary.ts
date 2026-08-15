import { env } from './env';

export const cloudinaryConfig = {
  cloudName: env.cloudinaryCloudName,
  uploadPreset: env.cloudinaryUploadPreset,
  apiBase: env.cloudinaryApiBase,
};

export function cloudinaryUploadUrl(resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto') {
  return `${cloudinaryConfig.apiBase}/${cloudinaryConfig.cloudName}/${resourceType}/upload`;
}
