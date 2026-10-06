import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

/**
 * Capture a photo using Capacitor Camera or fallback to file picker
 * returns a File object ready for upload
 */
export async function takePhoto(docName = 'document') {
  try {
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Prompt,
    });

    if (photo.webPath) {
      const response = await fetch(photo.webPath);
      const blob = await response.blob();
      const file = new File(
        [blob],
        `${docName}_${Date.now()}.${photo.format || 'jpg'}`,
        { type: `image/${photo.format || 'jpeg'}` }
      );
      return { file, webPath: photo.webPath };
    }
  } catch (error) {
    console.warn('Native camera error or cancelled:', error);
    // User cancelled or camera not available, return null
  }
  return null;
}
