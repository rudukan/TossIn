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

## Telegram Bot (Edge Function)

- Single Edge Function: `supabase/functions/telegram-webhook/index.ts`
- Runtime: Deno. Imports via `https://esm.sh/` URLs.
- Deploy: `npx supabase functions deploy telegram-webhook --no-verify-jwt`
- Secrets stored in Supabase (not in code): TELEGRAM_BOT_TOKEN, ANTHROPIC_API_KEY, GROQ_API_KEY
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-available in Edge Functions
- Claude API may return JSON wrapped in markdown code fences — always strip before parsing
- Bot: @tossinBot, single-user (TELEGRAM_OWNER_CHAT_ID)

## Conventions

- Turkish UI text (user-facing strings)
- `@/*` import alias maps to `src/*`
- Server Components by default; add `'use client'` only when needed (state, events, browser APIs)
- Tailwind v4: use `@theme inline` for custom tokens, no `tailwind.config.ts` needed for basic theming
- React Compiler enabled (`reactCompiler: true` in next.config.ts)

## Data Model

Notes have 4 types: `inbox`, `in_progress`, `waiting`, `done`
Sources: `web`, `telegram`, `voice`

## Auth & RLS

- Email + password login (Supabase Auth)
- RLS enabled on `notes`; policies bind rows to `auth.uid() = user_id`
- Telegram webhook writes notes with `user_id` from `TELEGRAM_OWNER_USER_ID` env (single-user setup; mimari multi-user-ready)

## Key Rules

- Keep it simple. No over-engineering.
- No social features, no markdown editor, no folder hierarchy.
- Read Next.js docs from `node_modules/next/dist/docs/` before using unfamiliar APIs.
- GitHub repo: rudukan/TossIn. `gh` CLI at `/c/Program Files/GitHub CLI`.
- Supabase project: `fuctxjzkddlmwdqtzoiz` (eu-west-1)
