# ForgeAI

ForgeAI is an Android application for discovering and sharing student-built AI applications. Students publish an **Application Blueprint** describing their agent: what it does, the orchestration framework it uses, its complete system prompt, and where it runs. Other students can then browse the repository feed, inspect the full blueprint, and launch the live agent.

Built with React Native, Expo and Supabase.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Supabase Setup](#supabase-setup)
- [Development](#development)
- [Building for Android](#building-for-android)
- [Design System](#design-system)
- [MVP Scope](#mvp-scope)
- [Privacy Policy](#privacy-policy)
- [License](#license)

---

## Features

- **Authentication** with email/password and Google OAuth via Supabase Auth, with persistent sessions.
- **Blueprint submission:** a validated form for publishing an AI application.
  - App Name
  - One-Liner (maximum 140 characters)
  - Orchestration Framework (with quick picks for LangGraph, CrewAI, DSPy and AutoGen)
  - Complete System Prompt
  - Active Deployment Runtime URL (HTTP or HTTPS)
- **Repository feed:**
  - Browse every published blueprint, newest first.
  - Filter by text across names, descriptions, frameworks, schools and authors, and by framework.
  - Pull to refresh.
- **Project detail view:**
  - Project metadata and the complete system prompt, shown line by line.
  - Copy the deployment URL to the clipboard.
- **Launch Agent:** opens the project's external deployment URL after validating it.
- **Account management:** view, edit and delete your own blueprints, and update your display name.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | React Native 0.88, React 19 |
| Platform | Expo SDK 58 (development client and EAS Build) |
| Language | TypeScript (strict mode) |
| Backend | Supabase (PostgreSQL, Auth, Row Level Security) |
| Authentication | Supabase Auth: email/password and Google OAuth (PKCE) |
| Animation | React Native Reanimated 4 |
| Typography | Geist and Geist Mono via `expo-font` |
| Session storage | `expo-sqlite` (localStorage-compatible storage for the Supabase client) |

## Architecture

The application is intentionally lightweight. There is no navigation library and no global state library.

### Navigation

Navigation is driven by component state in `App.tsx`:

- **Root:** an auth gate shows Login or Sign Up until a session exists, then the authenticated shell.
- **Authenticated shell:** three tabs (Discover, Submit, Account), switched with a custom animated bottom segment control (`RubberSegment`).
- **Project selection:** selecting a project shows the detail view in place of the current tab. The Android hardware back button returns to the previous screen.
- **Mounting:** the Discover feed stays mounted while hidden, so it keeps its scroll position and filters and refreshes in the background when shown again.

### Data and services

```
Screens  ->  useAuth() / services  ->  lib/supabase.ts  ->  Supabase
```

- **`lib/supabase.ts`:** the single Supabase client.
  - It reads public configuration from environment variables.
  - If configuration is missing it logs a warning and falls back to a placeholder client instead of crashing.
- **`src/context/AuthContext.tsx`:** exposes session state and the auth actions through the `useAuth()` hook. It also handles OAuth deep-link callbacks.
- **`src/services/repositories.ts`:** performs all reads and writes to the `repositories` table.
  - Every function returns `{ data, error }` and never throws.

### Authentication flow (Google OAuth)

1. Supabase generates the provider URL with `skipBrowserRedirect` enabled.
2. The URL opens in an in-app auth session (`expo-web-browser`).
3. The provider redirects back to `forgeai://login-callback`, or an `exp://` URI under Expo Go.
4. The callback is exchanged for a session. Both the PKCE `code` and the token-pair formats are supported.

### Startup

The native splash screen stays visible until the Geist fonts are loaded and any stored session has been restored. It then fades directly into the first screen.

## Project Structure

```
ForgeAI/
├── App.tsx                     Root component: auth gate, tabs, startup
├── index.ts                    Entry point
├── app.json                    Expo configuration
├── eas.json                    EAS Build profiles
├── lib/
│   └── supabase.ts             Supabase client
├── assets/                     App icon, adaptive icon and splash images
├── docs/                       Static privacy policy (GitHub Pages)
├── DESIGN.md                   Design system specification
└── src/
    ├── components/
    │   ├── animation/          Shared motion primitives
    │   ├── common/             Button, Input, icons
    │   ├── detail/             Project detail view
    │   └── navigation/         Bottom segment control and icons
    ├── constants/              Theme colours, typography, privacy URL
    ├── context/                AuthContext
    ├── screens/
    │   ├── auth/               Login, Sign Up, Account
    │   ├── blueprint/          Blueprint submission
    │   └── feed/               Repository feed
    ├── services/               Auth and repository data access
    └── types/                  Shared TypeScript types
```

## Getting Started

### Prerequisites

- Node.js (LTS) and npm
- An Android device or emulator
- A Supabase project
- The EAS CLI, for building the development client: `npm install -g eas-cli`

### Installation

```bash
git clone https://github.com/architchitte/ForgeAI.git
cd ForgeAI
npm install
```

### Environment variables

Copy the example file and fill in your Supabase project details:

```bash
cp .env.example .env
```

| Variable | Description |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Your Supabase publishable (anon) key |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Fallback, used if the publishable key is not set |

Only the public publishable/anon key belongs in the app. Never place a service-role key in client code. Data access is enforced by Row Level Security.

After changing `.env`, restart Metro with a cleared cache:

```bash
npx expo start -c
```

## Supabase Setup

### Database

ForgeAI uses a single table, `public.repositories`. The application expects the following columns:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `app_name` | text | Required |
| `one_liner` | text | Required, maximum 140 characters |
| `framework` | text | Orchestration framework |
| `system_prompt` | text | Complete system prompt |
| `agent_execution_url` | text | HTTP or HTTPS deployment URL |
| `student_email` | text | Submitter's account email |
| `student_name` | text | Nullable |
| `university` | text | Nullable |
| `user_id` | uuid | Nullable; not set by the client |
| `created_at` | timestamptz | Used to order the feed |

The schema and Row Level Security policies are not versioned in this repository. They are defined by the project's technical specification.

### Row Level Security

Enable RLS on `repositories` and configure policies so that:

- Authenticated users can read all rows (the repository feed).
- Users can insert rows for themselves.
- Users can update and delete only their own rows.

The client identifies a user's own projects by `student_email`, and it does not send `user_id` on insert. Ownership policies must therefore either match on the authenticated email (`auth.jwt() ->> 'email'`), or rely on a server-side default of `auth.uid()` for `user_id`.

### Authentication

1. Enable the **Email** provider.
2. Enable the **Google** provider and add your Google OAuth client credentials.
3. Add these redirect URLs under Authentication > URL Configuration:
   - `forgeai://login-callback` (development and release builds)
   - Your `exp://.../--/login-callback` URI if you test with Expo Go. The exact URI is logged to the console when Google sign-in starts.

## Development

| Command | Description |
| --- | --- |
| `npm start` | Start the Metro development server |
| `npm run android` | Start Metro and open the app on Android |
| `npx expo start -c` | Start Metro with a cleared cache |
| `npx tsc --noEmit` | Type-check the project |
| `npx expo-doctor` | Check project configuration and dependency health |
| `npx expo install --check` | Verify native dependencies match the Expo SDK |

The project uses native modules (Reanimated, Worklets, splash screen, clipboard), so day-to-day development uses a **development build** rather than Expo Go:

```bash
eas build -p android --profile development
npx expo start --dev-client
```

Rebuild the development client whenever a native dependency is added or upgraded.

## Building for Android

EAS Build profiles are defined in `eas.json`:

| Profile | Purpose | Output |
| --- | --- | --- |
| `development` | Development client, internal distribution | APK |
| `preview` | Internal testing build | Internal distribution |
| `production` | Store release | Default (AAB) |

```bash
eas build -p android --profile preview
```

Android package name: `com.forgeai.app`

## Design System

ForgeAI follows a strictly monochrome, dark-only design language modelled on Vercel's Geist. It has no colour hues: every surface, border and control is black, white or a neutral grey.

- **Colour tokens:** `src/constants/theme.ts`
- **Typography:**
  - Geist for interface text and Geist Mono for code and system prompts, defined in `src/constants/typography.ts`.
  - Maximum weight is SemiBold (600).
- **Motion:**
  - Subtle spring-based press feedback, fades and focus transitions built on shared primitives in `src/components/animation/`.
  - Animations respect the system reduce-motion setting.

The full specification is in [`DESIGN.md`](DESIGN.md).

## MVP Scope

ForgeAI is built against a fixed MVP specification. The following are explicitly out of scope:

- Native chat sandbox
- Vector store integrations
- Semantic search
- Automated change tracking
- GitHub integration
- Automated AI project validation
- SheerID integration
- API marketplace

Contributors should read [`AGENTS.md`](AGENTS.md) before proposing changes.

## Privacy Policy

The privacy policy is published at:

https://architchitte.github.io/ForgeAI/privacy-policy.html

The source is in [`docs/privacy-policy.html`](docs/privacy-policy.html).

## License

See [`LICENSE`](LICENSE) for license terms.
