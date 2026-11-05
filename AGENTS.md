
# ForgeAI — Project Instructions

## Project Overview
ForgeAI is an Android application for discovering and sharing
student-built AI applications.

The implementation must strictly follow the approved
2-Week MVP Technical Specification.

## Technology Stack
- React Native
- Expo
- TypeScript
- Supabase
- PostgreSQL
- Supabase Authentication

## Required MVP Features
1. Google OAuth and Email authentication.
2. Application Blueprint submission form.
3. Repository feed to browse submitted applications.
4. Project detail sheet displaying project information
   and the complete system prompt.
5. Launch Agent button that opens the external deployment URL.
6. Supabase database integration.
7. Android application build.

## Blueprint Form Fields
- App Name
- One-Liner (maximum 140 characters)
- Orchestration Framework
- Complete System Prompt
- Active Deployment Runtime URL

## Database
Use the repositories table specified in the
technical specification.

Do not introduce additional tables or features
without first explaining why they are necessary.

## Strictly Excluded from MVP
- Native Chat Sandbox
- Vector Store Integrations
- Semantic Search
- Automated Change Tracking
- GitHub Integration
- Automated AI Project Validation
- SheerID Integration
- API Marketplace

## Development Rules
1. Follow the supplied technical specification.
2. Do not independently introduce new product features.
3. Do not replace the approved technology stack.
4. Use TypeScript.
5. Write modular, reusable components.
6. Keep authentication and database operations organized.
7. Validate forms and handle errors.
8. Never expose secret keys in frontend code.
9. Use Supabase Row Level Security for database access.
10. Explain important changes before implementing them.

## Coding Workflow
Before changing files:
- Explain what will be implemented.
- Identify the files that need modification.
- Keep changes limited to the requested task.

After implementation:
- Explain the code.
- List modified files.
- Provide commands to test the implementation.
- Report any unfinished work.
