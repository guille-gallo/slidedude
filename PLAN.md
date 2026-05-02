# Production Hardening Plan

Elevate slidedude from working prototype to production-grade across 6 phases, ordered by impact. Each phase is independently verifiable.

## Phase 1: Testing Foundation

_Zero tests exist. `vitest.config.ts` referenced in structure but doesn't exist. No test files in `src/__tests__/`._

**Steps:**

1. Set up Vitest + React Testing Library (devDeps: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`)
2. Unit tests for pure functions — `generateId()`, `exportPresentation()`/`importPresentation()` round-trip, `isEmailAllowed()` edge cases
3. Unit tests for validation — `isValidPresentations()`, `isValidSlide()` with malformed data
4. API route tests — GET/PUT `/api/presentations` with valid/invalid/missing session; `/api/auth/check-email` allowed/denied
5. Store tests — `addSlide`, `updateSlide`, `removeSlide`, `duplicateSlide`, `reorderSlides`
6. Add `"test": "vitest"` script to `package.json`

**Verification:** `npm test` passes, >80% coverage on utils/lib/api

## Phase 2: Error Handling & Resilience

_Errors are silently swallowed. No `error.tsx`, `not-found.tsx`, or `loading.tsx`. No retry logic. No user-facing error notifications._

**Steps:**

1. Create `src/app/error.tsx` — App Router error boundary for uncaught route errors
2. Create `src/app/global-error.tsx` — root error boundary
3. Create `src/app/not-found.tsx` — custom 404
4. Add try/catch to image compression in `content-slide-editor.tsx`
5. Wrap Redis calls in API route with try/catch, return structured errors
6. Add retry with exponential backoff to `saveToServer()` (max 3 retries: 1s/2s/4s)
7. Add `navigator.onLine` listener for background sync on network recovery
8. Add toast/notification UI for user-facing errors (replace silent failures)

**Verification:** Kill Redis → retry fires → user sees toast. Navigate to `/nonexistent` → custom 404. Throw in component → `error.tsx` renders with recovery button.

## Phase 3: Accessibility (WCAG 2.1 AA)

_25+ WCAG violations found. No ARIA labels, no semantic HTML, no focus management, sync status is visual-only._

**Steps:**

1. Add `eslint-plugin-jsx-a11y` to ESLint config
2. Semantic HTML — `<nav>` for sidebar, `<main>` for editor, `<aside>` where applicable
3. ARIA labels on all interactive elements — textarea, selects, drag handles, delete/duplicate buttons, export/import/present buttons
4. `role="status"` + `aria-live="polite"` on sync status indicator
5. Focus management — focus new slides, trap focus in presentation mode, focus error messages
6. Visible focus indicators — `focus-visible:ring-2` on all interactive elements
7. Skip-to-content link in `layout.tsx`

**Verification:** `eslint .` → zero a11y warnings. Tab through entire app → every element reachable. Screen reader announces slide changes and sync status.

## Phase 4: Security Hardening

_No CSP, no HSTS, no rate limiting, no payload size validation, no input sanitization._

**Steps:**

1. Add Content-Security-Policy in `next.config.ts` — `default-src 'self'`, `img-src 'self' data:`, `style-src 'self' 'unsafe-inline'`
2. Add `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
3. Rate limiting on `/api/presentations` using `@upstash/ratelimit` — 20 req/min per user
4. Strengthen validation — max payload size (5MB), strict slide types, bounds checking, HTML stripping
5. Create `src/lib/env.ts` — validate required env vars at startup
6. Remove `framer-motion` (unused dependency)
7. Add `poweredByHeader: false` to `next.config.ts`

**Verification:** Response headers include CSP + HSTS + no X-Powered-By. 25 requests in 1 min → 429. Malicious payloads rejected.

## Phase 5: Code Quality & DRY

_Validation duplicated across files. Magic numbers. Inconsistent email normalization._

**Steps:**

1. Deduplicate `isValidPresentations()` + `isValidSlide()` into shared `src/lib/validation.ts`
2. Create `normalizeEmail()` helper — use consistently across auth and API files
3. Extract magic numbers: `SAVE_DEBOUNCE_MS`, `MAX_IMAGE_WIDTH`, `COMPRESSION_QUALITY`

**Verification:** `grep -r "isValidPresentations" src/` → only `validation.ts` defines it.

## Phase 6: Next.js Production Best Practices

_No OG tags, no robots.txt, no loading states, no dynamic metadata._

**Steps:**

1. Add Open Graph + Twitter Card metadata to `layout.tsx`
2. Create `src/app/opengraph-image.tsx` — dynamic OG image
3. Create `src/app/robots.ts` — disallow crawling (behind auth)
4. Create `src/app/loading.tsx` — skeleton loading state
5. Run Lighthouse audit → fix any <90 scores

**Verification:** OG preview on social. `robots.txt` returns disallow. Lighthouse >90.

## Scope Decisions

- **Rate limiting**: `@upstash/ratelimit` (same Redis, no new infra)
- **CSP allows `data:`** for img-src (required for inline image data URLs)
- **`allowDangerousEmailAccountLinking` kept** — intentional for multi-provider
- **`framer-motion` removal safe** — zero imports in codebase
- **No i18n** — English only, ~10 users

## Excluded

- PWA / service worker (overkill for 10 users)
- Database migration from Redis
- Multi-user collaboration / sharing
- ShikiMagicMove performance (separate task)

## Phase 7 (done): E2E with Playwright

Chromium only, single dev server on port 3100, auth bypassed via `E2E_BYPASS=1` in `src/auth.ts`, `/api/presentations` stubbed via Playwright's `page.route()`. 15 specs across smoke / editor / persistence / export-import / present-mode / errors. Runs on every PR via `.github/workflows/e2e.yml`.
