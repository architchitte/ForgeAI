import { supabase } from '../../lib/supabase';
import { RepositoryResponse } from './repositories';
import { extensionForMime } from './screenshotFiles';
import {
  PickedScreenshot,
  ProjectScreenshot,
  SCREENSHOT_BUCKET,
  ScreenshotType,
} from '../types/screenshot';

/**
 * Project screenshots: metadata in public.project_screenshots (one row per
 * repository, UNIQUE in the DB) + the image in the `project-screenshots`
 * Storage bucket at <uid>/<repository_id>/<unique file>.
 *
 * Same { data, error } never-throw contract as the other services.
 * Ownership is enforced by RLS + Storage policies; the client checks are UX.
 */

const COLUMNS =
  'id, repository_id, storage_path, screenshot_type, width, height, uploaded_at, updated_at';
const ID_CHUNK_SIZE = 100;
const UNIQUE_VIOLATION = '23505';

interface DbError {
  code?: string;
  message?: string;
  statusCode?: string | number;
  status?: number;
}

const toFriendlyError = (err: DbError | null | undefined, fallback: string): string => {
  const message = err?.message || '';
  const status = String(err?.statusCode ?? err?.status ?? '');
  if (status === '401' || /jwt|token.*expired|not authenticated/i.test(message)) {
    return 'Your session has expired. Please sign in again.';
  }
  if (err?.code === '42501' || status === '403' || /row-level security|unauthorized/i.test(message)) {
    return 'You can only manage the screenshot of your own projects.';
  }
  if (status === '413' || /payload too large|exceeded the maximum/i.test(message)) {
    return 'The image is larger than the 5 MB limit.';
  }
  if (status === '415' || /mime type/i.test(message)) {
    return 'Unsupported file type. Please use a JPG, PNG, or WebP image.';
  }
  if (/bucket not found/i.test(message) || err?.code === 'PGRST205') {
    return 'Screenshot storage is not set up yet.';
  }
  return message || fallback;
};

const uniqueFileName = (ext: string): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}${Math.random()
    .toString(36)
    .slice(2, 10)}.${ext}`;

/** Public URL for a stored screenshot (no network request). */
export const getScreenshotUrl = (storagePath: string): string =>
  supabase.storage.from(SCREENSHOT_BUCKET).getPublicUrl(storagePath).data.publicUrl;

/** Screenshots for many repositories, batched (one request per 100 ids). */
export const fetchScreenshotsForRepositories = async (
  repositoryIds: string[]
): Promise<RepositoryResponse<Record<string, ProjectScreenshot>>> => {
  const byRepo: Record<string, ProjectScreenshot> = {};
  if (repositoryIds.length === 0) return { data: byRepo, error: null };
  try {
    for (let i = 0; i < repositoryIds.length; i += ID_CHUNK_SIZE) {
      const { data, error } = await supabase
        .from('project_screenshots')
        .select(COLUMNS)
        .in('repository_id', repositoryIds.slice(i, i + ID_CHUNK_SIZE));
      if (error) {
        console.warn('[ScreenshotsService] fetchScreenshotsForRepositories error:', error.message);
        return { data: null, error: toFriendlyError(error, 'Failed to load screenshots.') };
      }
      for (const row of (data || []) as ProjectScreenshot[]) byRepo[row.repository_id] = row;
    }
    return { data: byRepo, error: null };
  } catch (err: any) {
    console.warn('[ScreenshotsService] Unexpected batch fetch error:', err);
    return { data: null, error: err?.message || 'Failed to load screenshots.' };
  }
};

/** The screenshot for one repository, or null when it has none. */
export const fetchScreenshot = async (
  repositoryId: string
): Promise<RepositoryResponse<ProjectScreenshot | null>> => {
  try {
    const { data, error } = await supabase
      .from('project_screenshots')
      .select(COLUMNS)
      .eq('repository_id', repositoryId)
      .maybeSingle();
    if (error) {
      console.warn('[ScreenshotsService] fetchScreenshot error:', error.message);
      return { data: null, error: toFriendlyError(error, 'Failed to load screenshot.') };
    }
    return { data: (data as ProjectScreenshot | null) ?? null, error: null };
  } catch (err: any) {
    console.warn('[ScreenshotsService] Unexpected fetch error:', err);
    return { data: null, error: err?.message || 'Failed to load screenshot.' };
  }
};

/** Removes Storage objects, retrying once. Returns true when removed. */
const removeObjects = async (paths: string[]): Promise<boolean> => {
  for (let attempt = 0; attempt < 2; attempt++) {
    const { error } = await supabase.storage.from(SCREENSHOT_BUCKET).remove(paths);
    if (!error) return true;
    console.warn('[ScreenshotsService] Storage remove failed:', error.message);
  }
  return false;
};

export interface SaveScreenshotInput {
  repositoryId: string;
  userId: string;
  picked: PickedScreenshot;
  type: ScreenshotType;
  /** The repository's current screenshot, when replacing. */
  existing: ProjectScreenshot | null;
}

export interface SaveScreenshotResult {
  screenshot: ProjectScreenshot;
  /** Set when the new screenshot is live but the old file couldn't be deleted. */
  cleanupWarning: string | null;
}

/**
 * Upload or replace a repository's screenshot, safely ordered:
 *   1. upload the new file under a new unique name (old file untouched);
 *   2. write metadata (insert, or update the existing row);
 *      on failure → delete the just-uploaded file (no orphan);
 *   3. only then delete the old file (best effort, retried once).
 */
export const saveScreenshot = async ({
  repositoryId,
  userId,
  picked,
  type,
  existing,
}: SaveScreenshotInput): Promise<RepositoryResponse<SaveScreenshotResult>> => {
  if (!userId) return { data: null, error: 'You need to be signed in to do that.' };
  const path = `${userId}/${repositoryId}/${uniqueFileName(extensionForMime(picked.mimeType))}`;

  try {
    // 1. Upload
    const upload = await supabase.storage.from(SCREENSHOT_BUCKET).upload(path, picked.data, {
      contentType: picked.mimeType,
      upsert: false,
      cacheControl: '31536000', // paths are never reused, so cache for a year
    });
    if (upload.error) {
      console.warn('[ScreenshotsService] upload error:', upload.error.message);
      return { data: null, error: toFriendlyError(upload.error, 'Failed to upload screenshot.') };
    }

    // 2. Metadata
    const now = new Date().toISOString();
    const fields = {
      storage_path: path,
      screenshot_type: type,
      width: Math.round(picked.width),
      height: Math.round(picked.height),
      updated_at: now,
    };
    const write = existing
      ? await supabase
          .from('project_screenshots')
          .update(fields)
          .eq('id', existing.id)
          .eq('repository_id', repositoryId)
          .select(COLUMNS)
      : await supabase
          .from('project_screenshots')
          .insert({ repository_id: repositoryId, uploaded_at: now, ...fields })
          .select(COLUMNS);

    const row = (write.data as ProjectScreenshot[] | null)?.[0];
    if (write.error || !row) {
      await removeObjects([path]); // don't leave the new file orphaned
      if (write.error?.code === UNIQUE_VIOLATION) {
        return {
          data: null,
          error: 'This project already has a screenshot. Refresh and use Replace instead.',
        };
      }
      if (write.error) console.warn('[ScreenshotsService] metadata error:', write.error.message);
      return {
        data: null,
        error: write.error
          ? toFriendlyError(write.error, 'Failed to save screenshot.')
          : 'The screenshot changed or was removed elsewhere. Please refresh and try again.',
      };
    }

    // 3. Old file
    let cleanupWarning: string | null = null;
    if (existing && existing.storage_path !== path) {
      const removed = await removeObjects([existing.storage_path]);
      if (!removed) {
        cleanupWarning = 'Your new screenshot is live, but the previous file could not be deleted.';
      }
    }

    return { data: { screenshot: row, cleanupWarning }, error: null };
  } catch (err: any) {
    console.error('[ScreenshotsService] Unexpected save error:', err);
    await removeObjects([path]).catch(() => false);
    return { data: null, error: err?.message || 'Failed to save screenshot.' };
  }
};

/**
 * Removes a screenshot: metadata first (so the app never shows a broken
 * image), then the file (retried once). A file that still can't be deleted
 * is invisible to users and reported as a warning.
 */
export const removeScreenshot = async (
  screenshot: ProjectScreenshot
): Promise<RepositoryResponse<{ cleanupWarning: string | null }>> => {
  try {
    const { data, error } = await supabase
      .from('project_screenshots')
      .delete()
      .eq('id', screenshot.id)
      .select('id');
    if (error) {
      console.warn('[ScreenshotsService] remove metadata error:', error.message);
      return { data: null, error: toFriendlyError(error, 'Failed to remove screenshot.') };
    }
    if (!data || data.length === 0) {
      return {
        data: null,
        error: 'Screenshot not found, or you can only remove screenshots from your own projects.',
      };
    }

    const removed = await removeObjects([screenshot.storage_path]);
    return {
      data: {
        cleanupWarning: removed
          ? null
          : 'The screenshot was removed, but its file could not be deleted from storage.',
      },
      error: null,
    };
  } catch (err: any) {
    console.error('[ScreenshotsService] Unexpected remove error:', err);
    return { data: null, error: err?.message || 'Failed to remove screenshot.' };
  }
};

/**
 * Client-side ownership check, mirroring the RLS rule (email match, case-
 * insensitive). Only decides whether to show owner controls — the database
 * and Storage policies are what actually enforce ownership.
 */
export const isRepositoryOwner = (
  repository: { student_email: string | null | undefined },
  userEmail: string | null | undefined
): boolean =>
  !!repository.student_email &&
  !!userEmail &&
  repository.student_email.trim().toLowerCase() === userEmail.trim().toLowerCase();
