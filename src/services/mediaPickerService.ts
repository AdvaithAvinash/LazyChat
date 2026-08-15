import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import type { PickedFile } from './storageService';

function guessName(uri: string, fallback: string): string {
  const parts = uri.split('/');
  return parts[parts.length - 1] || fallback;
}

export async function pickImageFromLibrary(): Promise<PickedFile | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Photo library permission denied');

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
  });

  if (result.canceled || result.assets.length === 0) return null;
  const asset = result.assets[0];

  return {
    uri: asset.uri,
    name: guessName(asset.uri, 'photo.jpg'),
    mimeType: asset.mimeType ?? 'image/jpeg',
  };
}

export async function captureImageWithCamera(): Promise<PickedFile | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new Error('Camera permission denied');

  const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
  if (result.canceled || result.assets.length === 0) return null;
  const asset = result.assets[0];

  return {
    uri: asset.uri,
    name: guessName(asset.uri, 'photo.jpg'),
    mimeType: asset.mimeType ?? 'image/jpeg',
  };
}

export async function pickDocument(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (result.canceled || result.assets.length === 0) return null;
  const asset = result.assets[0];

  return {
    uri: asset.uri,
    name: asset.name,
    mimeType: asset.mimeType ?? 'application/octet-stream',
  };
}
