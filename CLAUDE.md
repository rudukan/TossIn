@AGENTS.md

# toss

Quick note capture + review app. "Toss it. Review it. Keep it."

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 (`@import "tailwindcss"` + `@theme inline`)
- Supabase (Postgres + Auth + Edge Functions)
- Hosting: Vercel

## Project Structure

Uses `src/` directory. All app code lives under `src/`.

```
src/
  app/           # Next.js App Router pages & layouts
  components/    # Shared UI components
  lib/           # Supabase client, types, hooks
```

## Conventions

- Turkish UI text (user-facing strings)
- `@/*` import alias maps to `src/*`
- Server Components by default; add `'use client'` only when needed (state, events, browser APIs)
- Tailwind v4: use `@theme inline` for custom tokens, no `tailwind.config.ts` needed for basic theming
- React Compiler enabled (`reactCompiler: true` in next.config.ts)

## Data Model

Notes have 4 types: `inbox`, `actionable`, `reference`, `done`
Sources: `web`, `telegram`, `voice`

## Key Rules

- Keep it simple. No over-engineering.
- No social features, no markdown editor, no folder hierarchy.
- Read Next.js docs from `node_modules/next/dist/docs/` before using unfamiliar APIs.
