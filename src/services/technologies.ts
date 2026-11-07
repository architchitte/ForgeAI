import { supabase } from '../../lib/supabase';
import { RepositoryResponse } from './repositories';
import { SelectedTechnology } from '../constants/technologies';

/**
 * public.project_technologies — the AI technologies a project uses (one row
 * per selection). Same { data, error } never-throw contract as the other
 * services; ownership is enforced by RLS (email-based, via
 * is_repository_owner), the client never decides it.
 */

/** Row shape of public.project_technologies. */
export interface ProjectTechnology {
  id: string;
  repository_id: string;
  technology_id: string;
  technology_name: string;
  category: string;
  is_custom: boolean;
  created_at: string;
}

const COLUMNS = 'id, repository_id, technology_id, technology_name, category, is_custom, created_at';
const ID_CHUNK_SIZE = 100;
const PAGE_SIZE = 1000;

const toFriendlyError = (err: { code?: string; message?: string } | null, fallback: string) => {
  const message = err?.message || '';
  if (err?.code === 'PGRST301' || /jwt|token.*expired|not authenticated/i.test(message)) {
    return 'Your session has expired. Please sign in again.';
  }
  if (err?.code === '42501' || /row-level security/i.test(message)) {
    return 'You can only change the technologies of your own projects.';
  }
  if (err?.code === '23505') return 'A technology was listed twice. Please review your selection.';
  if (err?.code === 'PGRST205') return 'Technology storage is not set up yet.';
  return message || fallback;
};

/** Rows → form selections (keeps the order they were added). */
export const rowsToSelection = (rows: ProjectTechnology[]): SelectedTechnology[] =>
  rows.map((r) => ({
    id: r.technology_id,
    name: r.technology_name,
    category: r.category,
    isCustom: r.is_custom,
  }));

/**
 * Technologies for many repositories in as few requests as possible
 * (one per 100 ids, paginated past 1000 rows) — no per-card queries.
 */
export const fetchTechnologiesForRepositories = async (
  repositoryIds: string[]
): Promise<RepositoryResponse<Record<string, ProjectTechnology[]>>> => {
  const byRepo: Record<string, ProjectTechnology[]> = {};
  if (repositoryIds.length === 0) return { data: byRepo, error: null };
  try {
    for (let i = 0; i < repositoryIds.length; i += ID_CHUNK_SIZE) {
      const chunk = repositoryIds.slice(i, i + ID_CHUNK_SIZE);
      for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await supabase
          .from('project_technologies')
          .select(COLUMNS)
          .in('repository_id', chunk)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, from + PAGE_SIZE - 1);
        if (error) {
          console.warn('[TechnologiesService] batch fetch error:', error.message);
          return { data: null, error: toFriendlyError(error, 'Failed to load technologies.') };
        }
        const rows = (data || []) as ProjectTechnology[];
        for (const row of rows) (byRepo[row.repository_id] ||= []).push(row);
        if (rows.length < PAGE_SIZE) break;
      }
    }
    return { data: byRepo, error: null };
  } catch (err: any) {
    console.warn('[TechnologiesService] Unexpected batch fetch error:', err);
    return { data: null, error: err?.message || 'Failed to load technologies.' };
  }
};

export const fetchProjectTechnologies = async (
  repositoryId: string
): Promise<RepositoryResponse<ProjectTechnology[]>> => {
  try {
    const { data, error } = await supabase
      .from('project_technologies')
      .select(COLUMNS)
      .eq('repository_id', repositoryId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true });
    if (error) {
      console.warn('[TechnologiesService] fetch error:', error.message);
      return { data: null, error: toFriendlyError(error, 'Failed to load technologies.') };
    }
    return { data: (data || []) as ProjectTechnology[], error: null };
  } catch (err: any) {
    console.warn('[TechnologiesService] Unexpected fetch error:', err);
    return { data: null, error: err?.message || 'Failed to load technologies.' };
  }
};

/**
 * Makes the project's stored technologies equal `selected`, touching only
 * what changed: removes deselected rows, inserts new ones (existing rows are
 * kept, so their order is preserved). Duplicates in `selected` are ignored.
 */
export const replaceProjectTechnologies = async (
  repositoryId: string,
  selected: SelectedTechnology[]
): Promise<RepositoryResponse<ProjectTechnology[]>> => {
  try {
    const current = await fetchProjectTechnologies(repositoryId);
    if (current.error || !current.data) return { data: null, error: current.error };

    const wanted = new Map<string, SelectedTechnology>();
    for (const s of selected) if (!wanted.has(s.id)) wanted.set(s.id, s);

    const toDelete = current.data.filter((r) => !wanted.has(r.technology_id)).map((r) => r.id);
    const existingIds = new Set(current.data.map((r) => r.technology_id));
    const toInsert = Array.from(wanted.values())
      .filter((s) => !existingIds.has(s.id))
      .map((s) => ({
        repository_id: repositoryId,
        technology_id: s.id,
        technology_name: s.name,
        category: s.category,
        is_custom: s.isCustom,
      }));

    if (toDelete.length > 0) {
      const { data, error } = await supabase
        .from('project_technologies')
        .delete()
        .in('id', toDelete)
        .select('id');
      if (error) {
        console.warn('[TechnologiesService] delete error:', error.message);
        return { data: null, error: toFriendlyError(error, 'Failed to update technologies.') };
      }
      if ((data || []).length !== toDelete.length) {
        return { data: null, error: 'You can only change the technologies of your own projects.' };
      }
    }

    if (toInsert.length > 0) {
      const { error } = await supabase.from('project_technologies').insert(toInsert);
      if (error) {
        console.warn('[TechnologiesService] insert error:', error.message);
        return { data: null, error: toFriendlyError(error, 'Failed to save technologies.') };
      }
    }

    return fetchProjectTechnologies(repositoryId);
  } catch (err: any) {
    console.error('[TechnologiesService] Unexpected save error:', err);
    return { data: null, error: err?.message || 'Failed to save technologies.' };
  }
};
