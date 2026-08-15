import 'dotenv/config';

import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'LazyChat',
  slug: 'lazychat',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0B1220',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.lazychat.app',
    googleServicesFile: './GoogleService-Info.plist',
    infoPlist: {
      NSCameraUsageDescription: 'LazyChat needs camera access to take photos and make video calls.',
      NSMicrophoneUsageDescription: 'LazyChat needs microphone access for voice and video calls.',
      NSPhotoLibraryUsageDescription: 'LazyChat needs photo library access to send images.',
      NSContactsUsageDescription: 'LazyChat needs contacts access to help you find friends.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0B1220',
    },
    package: 'com.lazychat.app',
    googleServicesFile: './google-services.json',
    permissions: [
      'CAMERA',
      'RECORD_AUDIO',
      'READ_CONTACTS',
      'POST_NOTIFICATIONS',
      'INTERNET',
      'ACCESS_NETWORK_STATE',
    ],
  },
  plugins: [
    '@react-native-firebase/app',
    'expo-dev-client',
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#5B8DEF',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'LazyChat needs photo library access to send images.',
      },
    ],
    [
      'react-native-webrtc',
      {
        cameraPermissionText: 'LazyChat needs camera access for video calls.',
        microphonePermissionText: 'LazyChat needs microphone access for voice and video calls.',
      },
    ],
  ],
  extra: {
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    cloudinaryUploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET ?? '',
    cloudinaryApiBase: process.env.CLOUDINARY_API_BASE ?? 'https://api.cloudinary.com/v1_1',
    firebaseDatabaseUrl: process.env.FIREBASE_DATABASE_URL ?? '',
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? 'REPLACE_WITH_EAS_PROJECT_ID',
    },
  },
};

export default config;
