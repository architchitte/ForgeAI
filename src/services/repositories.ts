import { supabase } from '../../lib/supabase';
import { Repository, CreateRepositoryInput } from '../types/repository';

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

