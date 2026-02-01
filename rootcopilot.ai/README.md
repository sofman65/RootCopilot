# RootCopilot Demo (DemoBranch)

Minimal Next.js + Convex + Clerk walkthrough for the blog post. The branch keeps only what’s needed to show a seeded workspace and an AI issue thread.

## What’s included
- Landing page `/` with CTA to the demo workspace
- Workspace `/workspace` showing a single tenant/client/project/env and 3–5 seeded issues
- Issue thread `/issues/[id]/thread` with AI assistant, quick actions, and doc-aware “Ask with docs”
- Clerk + Convex wiring preserved; demo mode fakes an org so no auth wall

## What’s not
- Admin/import/integration screens
- Insights/search/docs/other exploratory routes

## Running locally
```bash
pnpm install
pnpm dev
```

Environment (already defaults for this branch):
```
NEXT_PUBLIC_CONVEX_URL=<your Convex deploy url>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<your Clerk key>
NEXT_PUBLIC_DEMO_MODE=true   # default; turn off to use real orgs
```

## Demo data
- `convex/seed.ts` seeds 1 tenant with issues; the “Reset demo data” button in `/workspace` reruns it.

## Folder map
- `app/page.tsx` – landing
- `app/workspace/page.tsx` – read-only demo workspace
- `app/issues/[issueId]/thread/page.tsx` – issue + AI thread + doc ask
- `components/` – shared UI (Brand, Sidebar, chat)
- `convex/` – backend functions (unchanged from main; only UI trimmed)

This branch is intentionally small to keep the tutorial focused.***
