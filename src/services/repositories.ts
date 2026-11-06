import { supabase } from '../../lib/supabase';
import { Repository, CreateRepositoryInput, UpdateRepositoryInput } from '../types/repository';

export interface RepositoryResponse<T> {
  data: T | null;
  error: string | null;
}

/**
 * Retrieve all blueprint repositories from Supabase, sorted by created_at descending.
 */
export const fetchRepositories = async (): Promise<
  RepositoryResponse<Repository[]>
> => {
  try {
    const { data, error } = await supabase
      .from('repositories')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[RepositoriesService] fetchRepositories error:', error.message);
      return { data: null, error: error.message };
    }

    return { data: (data as Repository[]) || [], error: null };
  } catch (err: any) {
    console.error('[RepositoriesService] Unexpected fetch error:', err);
    return {
      data: null,
      error: err?.message || 'Failed to fetch repositories due to an unexpected error.',
    };
  }
};

/**
 * Retrieve blueprint repositories submitted by a specific student email.
 */
export const fetchUserRepositories = async (
  email: string
): Promise<RepositoryResponse<Repository[]>> => {
  try {
    const { data, error } = await supabase
      .from('repositories')
      .select('*')
      .eq('student_email', email)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[RepositoriesService] fetchUserRepositories error:', error.message);
      return { data: null, error: error.message };
    }

    return { data: (data as Repository[]) || [], error: null };
  } catch (err: any) {
    console.error('[RepositoriesService] Unexpected fetch error for user repos:', err);
    return {
      data: null,
      error: err?.message || 'Failed to fetch your projects.',
    };
  }
};

/**
 * Insert a new application blueprint into public.repositories.
 */
export const createRepository = async (
  input: CreateRepositoryInput
): Promise<RepositoryResponse<Repository>> => {
  try {
    const { data, error } = await supabase
      .from('repositories')
      .insert([
        {
          app_name: input.app_name,
          one_liner: input.one_liner,
          framework: input.framework,
          system_prompt: input.system_prompt,
          agent_execution_url: input.agent_execution_url,
          student_email: input.student_email,
          student_name: input.student_name ?? null,
          university: input.university ?? null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('[RepositoriesService] createRepository error:', error.message);
      return { data: null, error: error.message };
    }

    return { data: data as Repository, error: null };
  } catch (err: any) {
    console.error('[RepositoriesService] Unexpected insert error:', err);
    return {
      data: null,
      error: err?.message || 'Failed to publish blueprint due to an unexpected error.',
    };
  }
};

/**
 * Update an existing application blueprint in public.repositories.
 */
export const updateRepository = async (
  id: string,
  input: UpdateRepositoryInput
): Promise<RepositoryResponse<Repository>> => {
  try {
    const { data, error } = await supabase
      .from('repositories')
      .update({
        ...(input.app_name !== undefined ? { app_name: input.app_name } : {}),
        ...(input.one_liner !== undefined ? { one_liner: input.one_liner } : {}),
        ...(input.framework !== undefined ? { framework: input.framework } : {}),
        ...(input.system_prompt !== undefined ? { system_prompt: input.system_prompt } : {}),
        ...(input.agent_execution_url !== undefined ? { agent_execution_url: input.agent_execution_url } : {}),
        ...(input.student_name !== undefined ? { student_name: input.student_name } : {}),
        ...(input.university !== undefined ? { university: input.university } : {}),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[RepositoriesService] updateRepository error:', error.message);
      return { data: null, error: error.message };
    }

    return { data: data as Repository, error: null };
  } catch (err: any) {
    console.error('[RepositoriesService] Unexpected update error:', err);
    return {
      data: null,
      error: err?.message || 'Failed to update blueprint due to an unexpected error.',
    };
  }
};

/**
 * Delete an existing application blueprint from public.repositories.
 */
export const deleteRepository = async (
  id: string
): Promise<RepositoryResponse<boolean>> => {
  try {
    const { error } = await supabase
      .from('repositories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[RepositoriesService] deleteRepository error:', error.message);
      return { data: false, error: error.message };
    }

    return { data: true, error: null };
  } catch (err: any) {
    console.error('[RepositoriesService] Unexpected delete error:', err);
    return {
      data: false,
      error: err?.message || 'Failed to delete blueprint due to an unexpected error.',
    };
  }
};
