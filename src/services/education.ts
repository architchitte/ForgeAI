import { supabase } from '../../lib/supabase';
import { RepositoryResponse } from './repositories';
import { Education, EducationInput } from '../types/profile';

/**
 * public.profile_education — the signed-in user's education history
 * (owner-only RLS). Same { data, error } never-throw contract.
 */

const COLUMNS =
  'id, user_id, degree, custom_degree, specialization, institution_name, start_year, graduation_year, status, created_at, updated_at';

const friendly = (err: { code?: string; message?: string } | null, fallback: string) => {
  const message = err?.message || '';
  if (err?.code === 'PGRST301' || /jwt|token.*expired|not authenticated/i.test(message)) {
    return 'Your session has expired. Please sign in again.';
  }
  if (err?.code === '42501' || /row-level security/i.test(message)) {
    return 'You can only change your own education records.';
  }
  if (err?.code === '23505') return 'This qualification is already on your profile.';
  if (err?.code === '23514') return 'Please check the years and fields and try again.';
  if (err?.code === 'PGRST205') return 'Education storage is not set up yet.';
  return message || fallback;
};

export const fetchEducation = async (
  userId: string
): Promise<RepositoryResponse<Education[]>> => {
  try {
    const { data, error } = await supabase
      .from('profile_education')
      .select(COLUMNS)
      .eq('user_id', userId);
    if (error) {
      console.warn('[EducationService] fetch error:', error.message);
      return { data: null, error: friendly(error, 'Failed to load education.') };
    }
    return { data: (data || []) as Education[], error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to load education.' };
  }
};

export const createEducation = async (
  userId: string,
  input: EducationInput
): Promise<RepositoryResponse<Education>> => {
  try {
    const { data, error } = await supabase
      .from('profile_education')
      .insert({ user_id: userId, ...input })
      .select(COLUMNS)
      .single();
    if (error) {
      console.warn('[EducationService] create error:', error.message);
      return { data: null, error: friendly(error, 'Failed to add qualification.') };
    }
    return { data: data as Education, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to add qualification.' };
  }
};

/** Updates an existing record in place (never creates a duplicate). */
export const updateEducation = async (
  userId: string,
  id: string,
  input: EducationInput
): Promise<RepositoryResponse<Education>> => {
  try {
    const { data, error } = await supabase
      .from('profile_education')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select(COLUMNS);
    if (error) {
      console.warn('[EducationService] update error:', error.message);
      return { data: null, error: friendly(error, 'Failed to update qualification.') };
    }
    const row = (data as Education[] | null)?.[0];
    if (!row) return { data: null, error: 'Qualification not found. Please refresh.' };
    return { data: row, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to update qualification.' };
  }
};

export const deleteEducation = async (
  userId: string,
  id: string
): Promise<RepositoryResponse<boolean>> => {
  try {
    const { data, error } = await supabase
      .from('profile_education')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id');
    if (error) {
      console.warn('[EducationService] delete error:', error.message);
      return { data: null, error: friendly(error, 'Failed to delete qualification.') };
    }
    if (!data || data.length === 0) {
      return { data: null, error: 'Qualification not found. Please refresh.' };
    }
    return { data: true, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to delete qualification.' };
  }
};
