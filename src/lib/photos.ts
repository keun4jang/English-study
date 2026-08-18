import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { DiaryPhoto } from '@/domain/types';
import { newId } from './id';

/**
 * 사진 선택 + 압축.
 * - 압축/리사이즈 후 저장 (긴 변 1280px, JPEG 70%)
 * - expo-image-manipulator 재저장 과정에서 EXIF(위치 정보 포함)가 제거된다.
 * - exif: false로 선택 단계에서도 위치 정보를 읽지 않는다.
 */
export async function pickAndCompressPhotos(maxCount: number): Promise<DiaryPhoto[] | 'denied'> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return 'denied';

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: maxCount,
    exif: false,
    quality: 1,
  });
  if (result.canceled) return [];

  const photos: DiaryPhoto[] = [];
  for (const asset of result.assets.slice(0, maxCount)) {
    try {
      const context = ImageManipulator.ImageManipulator.manipulate(asset.uri);
      const width = asset.width ?? 1280;
      if (width > 1280) {
        context.resize({ width: 1280 });
      }
      const image = await context.renderAsync();
      const saved = await image.saveAsync({
        compress: 0.7,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      photos.push({
        id: newId(),
        uri: saved.uri,
        isCover: photos.length === 0,
        createdAt: new Date().toISOString(),
      });
    } catch {
      // 개별 사진 실패는 건너뛴다 (본문 작성을 막지 않는다)
    }
  }
  return photos;
}
