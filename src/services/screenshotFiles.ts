import { Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import {
  AllowedScreenshotMime,
  PickedScreenshot,
  SCREENSHOT_ALLOWED_MIME,
  SCREENSHOT_MAX_BYTES,
  ScreenshotType,
} from '../types/screenshot';

/**
 * Local image selection + validation for project screenshots (no network).
 * Type is decided from the file's actual bytes (magic numbers), not its
 * name; size is checked against the exact bytes that will be uploaded.
 * The bucket's own MIME / size limits enforce the same rules server-side.
 */

export type Orientation = 'landscape' | 'portrait' | 'square';

export interface PickResult {
  data: PickedScreenshot | null;
  error: string | null;
  canceled: boolean;
}

const formatMb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

/** Detects JPEG / PNG / WebP from the first bytes of the file. */
const sniffMime = (data: ArrayBuffer): AllowedScreenshotMime | null => {
  const b = new Uint8Array(data.slice(0, 12));
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (
    b.length >= 8 &&
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    b.length >= 12 &&
    String.fromCharCode(b[0], b[1], b[2], b[3]) === 'RIFF' &&
    String.fromCharCode(b[8], b[9], b[10], b[11]) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
};

const getImageSize = (uri: string): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) =>
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject)
  );

export const getOrientation = (width: number, height: number): Orientation => {
  // Within 2% counts as square.
  if (Math.abs(width - height) / Math.max(width, height) < 0.02) return 'square';
  return width > height ? 'landscape' : 'portrait';
};

/** Warning text when the image doesn't suit the selected type, else null. */
export const getOrientationMismatch = (
  type: ScreenshotType,
  width: number,
  height: number
): string | null => {
  const o = getOrientation(width, height);
  if (type === 'desktop' && o === 'portrait') {
    return 'This image is portrait, but Desktop Screenshot expects a landscape (16:9) image. It looks like a mobile screenshot.';
  }
  if (type === 'mobile' && o === 'landscape') {
    return 'This image is landscape, but Mobile Screenshot expects a portrait (9:16) image. It looks like a desktop screenshot.';
  }
  return null;
};

export const extensionForMime = (mime: AllowedScreenshotMime): string =>
  mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';

export interface PickImageOptions {
  /**
   * Show the system crop / reposition step with a fixed aspect ratio
   * (e.g. [1, 1] for avatars). Omit to keep the image's own framing.
   */
  cropAspect?: [number, number];
  /**
   * Downscale so the long edge ≤ maxLongEdge and the short edge ≤
   * maxShortEdge (aspect ratio kept). Defaults: 1920 × 1080 — a 4K desktop
   * capture becomes 1920×1080, a 1080×1920 phone capture is untouched.
   */
  maxLongEdge?: number;
  maxShortEdge?: number;
}

/** JPEG quality for re-encoded images (picker + downscale). */
const IMAGE_QUALITY = 0.8;
/** Re-encode even without resizing when the file is bigger than this. */
const REENCODE_ABOVE_BYTES = 1024 * 1024;
/** Refuse to process absurdly large originals (memory safety). */
const ORIGINAL_MAX_BYTES = 40 * 1024 * 1024;

/**
 * Opens the system photo picker (gallery only — no camera permission),
 * validates the original (JPG / PNG / WebP by its bytes), then downscales
 * and re-encodes large images to JPEG at 0.8 quality before upload — typically
 * cutting multi-MB screenshots to a few hundred KB and keeping GPU texture
 * memory small. The final file must still be ≤ 5 MB.
 */
export const pickValidatedImage = async (options: PickImageOptions = {}): Promise<PickResult> => {
  const maxLong = options.maxLongEdge ?? 1920;
  const maxShort = options.maxShortEdge ?? 1080;
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: !!options.cropAspect,
      aspect: options.cropAspect,
      allowsMultipleSelection: false,
      quality: IMAGE_QUALITY,
      exif: false,
      base64: false,
    });
    if (result.canceled || !result.assets?.length) {
      return { data: null, error: null, canceled: true };
    }

    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > ORIGINAL_MAX_BYTES) {
      return {
        data: null,
        error: `This image is ${formatMb(asset.fileSize)} — too large to process. Please choose a smaller image.`,
        canceled: false,
      };
    }

    // 1. Validate the original's real type.
    const original = await fetch(asset.uri).then((res) => res.arrayBuffer());
    if (original.byteLength === 0) {
      return { data: null, error: 'The selected image could not be read.', canceled: false };
    }
    const originalMime = sniffMime(original);
    if (!originalMime || !SCREENSHOT_ALLOWED_MIME.includes(originalMime)) {
      return {
        data: null,
        error: 'Unsupported file type. Please choose a JPG, PNG, or WebP image.',
        canceled: false,
      };
    }

    let { width, height } = asset;
    if (!width || !height) ({ width, height } = await getImageSize(asset.uri));
    if (!width || !height) {
      return { data: null, error: 'Could not read the image dimensions.', canceled: false };
    }

    // 2. Downscale / re-encode when it's big (dimensions or bytes).
    const long = Math.max(width, height);
    const short = Math.min(width, height);
    const scale = Math.min(1, maxLong / long, maxShort / short);
    let uri = asset.uri;
    let data = original;
    let mimeType: AllowedScreenshotMime = originalMime;
    if (scale < 1 || original.byteLength > REENCODE_ABOVE_BYTES) {
      const targetW = Math.max(1, Math.round(width * scale));
      const targetH = Math.max(1, Math.round(height * scale));
      const base = ImageManipulator.manipulate(asset.uri);
      const ctx = scale < 1 ? base.resize({ width: targetW, height: targetH }) : base;
      const rendered = await ctx.renderAsync();
      const saved = await rendered.saveAsync({ compress: IMAGE_QUALITY, format: SaveFormat.JPEG });
      // Free the native bitmaps right away instead of waiting for GC.
      rendered.release();
      ctx.release();
      if (ctx !== base) base.release();
      uri = saved.uri;
      width = saved.width;
      height = saved.height;
      data = await fetch(saved.uri).then((res) => res.arrayBuffer());
      mimeType = 'image/jpeg';
    }

    // 3. Final checks on the exact bytes that will be uploaded.
    if (data.byteLength > SCREENSHOT_MAX_BYTES) {
      return {
        data: null,
        error: `This image is still ${formatMb(data.byteLength)} after compression. The maximum size is 5 MB.`,
        canceled: false,
      };
    }
    if (sniffMime(data) !== mimeType) {
      return { data: null, error: 'The image could not be processed. Please try another one.', canceled: false };
    }

    return {
      data: { uri, width, height, mimeType, data, sizeBytes: data.byteLength },
      error: null,
      canceled: false,
    };
  } catch (err: any) {
    console.warn('[ScreenshotFiles] Pick failed:', err?.message || err);
    return {
      data: null,
      error: err?.message || 'Could not open the selected image.',
      canceled: false,
    };
  }
};

/** Screenshots are never cropped or altered. */
export const pickScreenshotImage = (): Promise<PickResult> => pickValidatedImage();
