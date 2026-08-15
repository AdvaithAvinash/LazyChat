import Constants from 'expo-constants';

type Extra = {
  cloudinaryCloudName?: string;
  cloudinaryUploadPreset?: string;
  cloudinaryApiBase?: string;
  firebaseDatabaseUrl?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

export const env = {
  cloudinaryCloudName: extra.cloudinaryCloudName ?? process.env.CLOUDINARY_CLOUD_NAME ?? '',
  cloudinaryUploadPreset: extra.cloudinaryUploadPreset ?? process.env.CLOUDINARY_UPLOAD_PRESET ?? '',
  cloudinaryApiBase:
    extra.cloudinaryApiBase ?? process.env.CLOUDINARY_API_BASE ?? 'https://api.cloudinary.com/v1_1',
  firebaseDatabaseUrl: extra.firebaseDatabaseUrl ?? process.env.FIREBASE_DATABASE_URL ?? '',
};
