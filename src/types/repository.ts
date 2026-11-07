export interface Repository {
  id: string;
  app_name: string;
  one_liner: string;
  framework: string;
  system_prompt: string;
  agent_execution_url: string;
  student_email: string;
  student_name: string | null;
  university: string | null;
  created_at: string;
  user_id?: string | null;
}

/**
 * Lightweight list shape (feed, search, profiles): everything except the
 * multi-line system_prompt (project description), which is loaded on demand
 * when a project page opens. A full Repository is also a valid summary.
 */
export type RepositorySummary = Omit<Repository, 'system_prompt'> & {
  system_prompt?: string;
};

export interface CreateRepositoryInput {
  app_name: string;
  one_liner: string;
  framework: string;
  system_prompt: string;
  agent_execution_url: string;
  student_email: string;
  student_name?: string | null;
  university?: string | null;
}

export interface UpdateRepositoryInput {
  app_name?: string;
  one_liner?: string;
  framework?: string;
  system_prompt?: string;
  agent_execution_url?: string;
  student_name?: string | null;
  university?: string | null;
}


