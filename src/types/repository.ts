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

