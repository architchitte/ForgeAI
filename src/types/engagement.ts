/** Row shape of public.project_likes. */
export interface ProjectLike {
  id: string;
  repository_id: string;
  user_id: string;
  created_at: string;
}

/** Row shape of public.project_comments. */
export interface ProjectComment {
  id: string;
  repository_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

/** Aggregated like state for one repository, from the current user's view. */
export interface LikeSummary {
  count: number;
  likedByMe: boolean;
}

/** Comment length limits (mirrors the database CHECK constraint). */
export const COMMENT_MIN_LENGTH = 1;
export const COMMENT_MAX_LENGTH = 2000;
