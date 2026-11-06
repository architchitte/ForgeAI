import type { User } from '@supabase/supabase-js';

export type TutorialTab = 'discover' | 'submit' | 'account';

export interface TutorialStep {
  id: string;
  /** Tab shown behind the overlay while this step is visible. */
  tab: TutorialTab;
  eyebrow: string;
  title: string;
  body: string;
  bullets?: string[];
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    tab: 'discover',
    eyebrow: 'Welcome',
    title: 'Welcome to ForgeAI',
    body: 'A repository of AI agents built by students. Here is a quick tour of the three tabs at the bottom of the screen.',
  },
  {
    id: 'discover',
    tab: 'discover',
    eyebrow: 'Discover tab',
    title: 'Browse projects',
    body: 'The Discover feed lists every published agent blueprint, newest first.',
    bullets: [
      'Search by app name, creator or university',
      'Filter by orchestration framework',
      'Pull down to refresh the feed',
    ],
  },
  {
    id: 'detail',
    tab: 'discover',
    eyebrow: 'Project details',
    title: 'Open any project',
    body: 'Tap a project card to see how the agent is built.',
    bullets: [
      'Read the complete system prompt',
      'See the framework and the creator',
      'Tap Launch Agent to open the live deployment',
    ],
  },
  {
    id: 'submit',
    tab: 'submit',
    eyebrow: 'Submit tab',
    title: 'Publish your blueprint',
    body: 'Share your own agent with the community by filling in five fields:',
    bullets: [
      'App name and a one-liner (up to 140 characters)',
      'Orchestration framework',
      'Full system prompt',
      'Deployment URL (http or https)',
    ],
  },
  {
    id: 'account',
    tab: 'account',
    eyebrow: 'Profile tab',
    title: 'Manage your profile',
    body: 'Tap the pencil next to your name to edit your profile.',
    bullets: [
      'Add your name and university so they show on your projects',
      'Edit, view or delete the projects you have published',
      'Read the privacy policy or sign out',
    ],
  },
  {
    id: 'done',
    tab: 'discover',
    eyebrow: 'All set',
    title: "You're ready to build",
    body: 'Explore what others have shipped, then publish your first blueprint.',
  },
];

/**
 * Accounts created before the tutorial shipped never see it, so only
 * genuinely new sign-ups (email or Google) get the walkthrough.
 */
export const TUTORIAL_RELEASE_DATE = '2026-11-06T00:00:00Z';

/**
 * TEMPORARY testing switch. When true, the tutorial shows for every account
 * (including existing ones) each time the app opens, ignoring both the
 * release-date cutoff and the saved `tutorial_completed` flag.
 * Set back to false before shipping so only new sign-ups see it.
 */
export const TUTORIAL_FORCE_SHOW = false;

export const shouldShowTutorial = (user: User | null): boolean => {
  if (!user) return false;
  if (TUTORIAL_FORCE_SHOW) return true;
  if (user.user_metadata?.tutorial_completed === true) return false;
  const createdAt = Date.parse(user.created_at);
  if (Number.isNaN(createdAt)) return false;
  return createdAt >= Date.parse(TUTORIAL_RELEASE_DATE);
};
