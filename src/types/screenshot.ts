export type ScreenshotType = 'desktop' | 'mobile';

/** Row shape of public.project_screenshots. */
export interface ProjectScreenshot {
  id: string;
  repository_id: string;
  storage_path: string;
  screenshot_type: ScreenshotType;
  width: number;
  height: number;
  uploaded_at: string;
  updated_at: string;
}

/** A locally picked image that passed validation, ready to upload. */
export interface PickedScreenshot {
  uri: string;
  width: number;
  height: number;
  mimeType: AllowedScreenshotMime;
  /** Exact bytes to upload (also used for size + signature checks). */
  data: ArrayBuffer;
  sizeBytes: number;
}

export type AllowedScreenshotMime = 'image/jpeg' | 'image/png' | 'image/webp';

export interface ScreenshotTypeSpec {
  type: ScreenshotType;
  label: string;
  previewLabel: string;
  width: number;
  height: number;
  aspectLabel: string;
  orientation: 'Landscape' | 'Portrait';
  description: string;
}

export const SCREENSHOT_SPECS: Record<ScreenshotType, ScreenshotTypeSpec> = {
  desktop: {
    type: 'desktop',
    label: 'Desktop Screenshot',
    previewLabel: 'Desktop Preview',
    width: 1280,
    height: 720,
    aspectLabel: '16:9',
    orientation: 'Landscape',
    description: 'Best for websites, dashboards, web applications, and desktop interfaces.',
  },
  mobile: {
    type: 'mobile',
    label: 'Mobile Screenshot',
    previewLabel: 'Mobile Preview',
    width: 1080,
    height: 1920,
    aspectLabel: '9:16',
    orientation: 'Portrait',
    description:
      'Best for Android apps, iOS apps, mobile-first websites, and responsive mobile interfaces.',
  },
};

export const SCREENSHOT_BUCKET = 'project-screenshots';
export const SCREENSHOT_MAX_BYTES = 5 * 1024 * 1024;
export const SCREENSHOT_ALLOWED_MIME: AllowedScreenshotMime[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
];
