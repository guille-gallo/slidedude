# Project Instructions

These rules apply to every change in this repository. Add new requirements below as they come up.

## Stack notes

- Next.js 16 (App Router). This is **not** the Next.js most training data describes — read `node_modules/next/dist/docs/` before introducing new APIs and respect deprecation notices (see `AGENTS.md`).
- React 19, TypeScript strict, Tailwind v4, NextAuth v5 beta, Upstash Redis, Vitest + React Testing Library + jsdom.

## Workflow

- **Never** run `git push`, `vercel`, or `vercel --prod` without explicit confirmation.
- Pushing to `main` auto-deploys via the Vercel GitHub integration — do not also run `vercel --prod`.
- Run `npm test` and `npm run lint` after changes that could affect them; fix failures before declaring done.
- Do not create markdown summaries of changes unless asked.

## Code style

- Follow existing patterns; do not refactor or "improve" code that wasn't part of the request.
- No new dependencies without asking.
- Keep validation centralized in `src/lib/validation.ts`. Keep email normalization in `src/lib/email.ts`. Keep magic numbers in `src/lib/constants.ts`.
- Prefer editing existing files over creating new ones.

## Testing

- Every new pure function or store action ships with a Vitest test under `src/__tests__/` mirroring the source path.
- Tests must run in jsdom, no real network — mock `fetch` and Redis.
- Do not weaken or delete existing assertions to make a change pass.

## Security

- Do not log secrets, tokens, session contents, or full presentation payloads.
- Validate all data crossing API boundaries through `src/lib/validation.ts`.
- Respect rate limits and CSP headers configured in `next.config.ts`.

## Custom rules

<!-- Add project-specific instructions here. They will be picked up automatically. -->
