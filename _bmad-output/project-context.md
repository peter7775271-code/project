---
project_name: 'User Authentication Web App'
user_name: 'Peter'
date: '2026-02-09'
sections_completed: ['technology_stack', 'implementation_rules']
existing_patterns_found: 0
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- **Framework**: Next.js 16.1.4 (App Router, `src/app`)
- **Runtime**: React 19.2.3 with React Compiler enabled (`reactCompiler: true` in `next.config.ts`)
- **Language**: TypeScript 5+ (`strict: true`, `jsx: react-jsx`, bundler module resolution)
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/postcss` and `postcss.config.mjs`)
- **Database**: SQLite via `better-sqlite3` for local persistence
- **Auth & Security**:
  - `bcryptjs` for password hashing
  - `jsonwebtoken` for JWT-based authentication
  - `dotenv` for environment configuration
- **Email & Notifications**: `nodemailer` for transactional emails (e.g. verification, password reset)
- **External Services**:
  - `@supabase/supabase-js` for Supabase-backed features
  - `openai` for AI features (e.g. chat, question generation, nutrition analysis)
- **Content & Scraping**:
  - `axios` and `cheerio` for HTTP and HTML scraping
  - `pdf-parse` and `pdfjs-dist` for PDF ingestion
  - `puppeteer` for headless browser automation and TikZ rendering
- **Graphics & Math**:
  - `mafs`, `lazy-brush`, and `perfect-freehand` for interactive math/drawing UIs
- **Build & Tooling**:
  - ESLint 9 with `eslint-config-next` (core web vitals + TypeScript)
  - Path alias `@/* -> ./src/*` configured in `tsconfig.json`

## Critical Implementation Rules

### General Architecture

- **App Router**: All pages and API routes live under `src/app`; new routes should follow existing folder-based routing (e.g. `src/app/login/page.tsx`, `src/app/api/auth/login/route.ts`).
- **TypeScript strictness**: The project uses `strict: true`; AI agents must avoid `any` where possible, respect proper types, and keep functions typed.
- **Path aliases**: Use `@/` imports (e.g. `@/lib/db`) instead of long relative paths to keep imports consistent.

### Authentication & Authorization

- **Password storage**: Always hash passwords with `bcryptjs` before persisting to SQLite; never store or log plain-text passwords.
- **JWT handling**:
  - Use `jsonwebtoken` for signing and verifying tokens.
  - Keep JWT secrets exclusively in `.env.local` (never hard-code).
  - Attach only the minimal required claims to tokens (e.g. user id, role), not sensitive data.
- **Protected routes**: Dashboard and other authenticated pages must validate the current user session/JWT and redirect unauthenticated users to `login`.

### Database & Persistence

- **SQLite via better-sqlite3**:
  - Reuse the shared DB helper in `src/lib/db.ts` instead of opening ad-hoc connections.
  - Keep schema changes documented (see existing `*_DATABASE_SETUP.md` files) and avoid silent breaking changes.
- **Migrations / schema safety**: When changing tables used by auth or HSC/nutrition features, update both the schema docs and any helper functions in `src/lib`.

### API Routes & Side Effects

- **Next.js API conventions**:
  - Use `route.ts` handlers in `src/app/api/**` and follow existing patterns for `POST`/`GET`.
  - Perform validation on request bodies (especially for auth, PDF ingest, and nutrition scraping).
- **Long-running / heavy work**:
  - Use `puppeteer` only in server-side API routes, never in client components.
  - For PDF or TikZ operations, avoid blocking the UI; keep that logic inside `app/api/**` endpoints.

### Frontend Patterns

- **Components**:
  - Place reusable UI in `src/components` and keep them typed with React.FC or explicit props interfaces.
  - Follow existing naming: `PascalCase` for components, `camelCase` for functions and variables.
- **Styling**:
  - Prefer Tailwind utility classes over ad-hoc inline styles; match the existing design system in `globals.css`.
  - Ensure new pages remain responsive (mobile-first) using the same breakpoint conventions as current pages.

### Testing, Linting, and Quality

- **ESLint**:
  - New code must pass `npm run lint` without disabling core rules from `eslint-config-next`.
  - Avoid `// eslint-disable` unless there is a documented, strong justification.
- **Error handling**:
  - For API routes, return appropriate HTTP status codes and JSON error messages; don’t throw raw errors to the client.
  - Log server-side failures only on the server (never leak stack traces to the client).

### Environment & Secrets

- **Environment variables**:
  - Store API keys (OpenAI, Supabase, email credentials, JWT secret) exclusively in `.env.local`.
  - Do not commit `.env.local` or any secrets; follow `.gitignore` conventions.
- **Configuration**:
  - When adding new environment variables, also update any relevant setup docs (`SUPABASE_SETUP.md`, `URL_SCRAPING_*`, etc.) so future agents understand the contract.
