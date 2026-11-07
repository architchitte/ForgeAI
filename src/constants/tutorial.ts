import type { User } from '@supabase/supabase-js';

export type TutorialTab = 'discover' | 'search' | 'submit' | 'activity' | 'account';

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
    title: 'Welcome to Forge',
    body: 'A repository of AI agents built by students. Here is a quick tour of the tabs at the bottom of the screen.',
  },
  {
    id: 'discover',
    tab: 'discover',
    eyebrow: 'Discover tab',
    title: 'Browse projects',
    body: 'The Discover feed showcases every published project, newest first.',
    bullets: [
      'Tap the heart to like a project, hold it to see who liked it',
      'Pull down to refresh the feed',
    ],
  },
  {
    id: 'search',
    tab: 'search',
    eyebrow: 'Search tab',
    title: 'Find anything',
    body: 'Search projects, founders, institutes and technologies in one place.',
    bullets: [
      'Tap an institute or technology to see its projects',
      'Tap a founder to open their profile',
    ],
  },
  {
    id: 'detail',
    tab: 'discover',
    eyebrow: 'Project details',
    title: 'Open any project',
    body: 'Tap a project card to see how the agent is built.',
    bullets: [
      'Read the project description and technologies',
      'Meet the founder and join the comments',
      'Tap Launch App to open the live deployment',
    ],
  },
  {
    id: 'submit',
    tab: 'submit',
    eyebrow: 'Submit tab',
    title: 'Publish your blueprint',
    body: 'Share your own project with the community:',
    bullets: [
      'App name and a one-liner (up to 140 characters)',
      'AI technologies & frameworks you used',
      'Project description and deployment URL',
      'An optional desktop or mobile screenshot',
    ],
  },
  {
    id: 'activity',
    tab: 'activity',
    eyebrow: 'Activity tab',
    title: 'See who engaged',
    body: 'Likes and comments on your projects appear here, newest first.',
  },
  {
    id: 'account',
    tab: 'account',
    eyebrow: 'Profile tab',
    title: 'Manage your profile',
    body: 'Your profile shows your picture, current education and projects.',
    bullets: [
      'Tap ☰ for settings: personal info, education, security and log out',
      'Edit, view or delete the projects you have published',
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
