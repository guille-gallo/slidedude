# slidedude

An animated code presentation tool for creating polished technical talks. Write code, add content slides, and present with smooth syntax-highlighted animations powered by Shiki Magic Move.

**Live at [slidedude.io](https://slidedude.io)**

## Features

- **Animated code transitions** — Shiki Magic Move for smooth token-level code morphing between slides
- **Syntax highlighting** — TypeScript, JavaScript, HTML, CSS, JSON, Python, Markdown, JSX, TSX
- **Content slides** — Rich text with image support (paste from clipboard or upload, auto-compressed to WebP)
- **Mermaid diagrams** — Live-preview diagram slides (flowcharts, sequence, class, state, etc.) with transparent backgrounds
- **Section markers** — Tag slides with sections; presentation mode shows a segmented progress bar and presenter view shows "X of Y in section"
- **Overview grid** — Press `G` during presentation for a thumbnail grid; click any slide to jump
- **PDF export** — One-click print view (`?print=1`) waits for Shiki + Mermaid to render before opening the print dialog
- **Drag & drop** — Reorder slides with keyboard-accessible drag and drop (@dnd-kit)
- **Cloud sync** — Auto-saves to Upstash Redis (debounced 4s) with localStorage fallback
- **Multi-provider auth** — Google OAuth, GitHub OAuth, and email magic link (Resend)
- **Email allowlist** — Restrict access to approved emails via `ALLOWED_EMAILS` env var
- **Export / Import** — Back up presentations as `.slidedude.json` files (IDs regenerated on import)
- **Presenter mode** — Separate presenter window with notes, next slide preview, section context, and elapsed timer
- **Multi-window sync** — BroadcastChannel API keeps editor, presentation, and presenter windows in sync
- **Error boundaries** — Graceful recovery from runtime errors

## Keyboard shortcuts

### Editor

| Shortcut | Action |
|----------|--------|
| **F5** | Start presentation |
| **Shift + N** | New code slide |
| **Shift + M** | New Mermaid diagram slide |
| **Ctrl/Cmd + D** | Duplicate slide |
| **Delete** | Remove slide |

### Presentation mode

| Shortcut | Action |
|----------|--------|
| **→** / **Space** | Next slide |
| **←** | Previous slide |
| **G** | Toggle overview grid |
| **F** | Toggle fullscreen |
| **Esc** / **F5** | Exit fullscreen |

## Architecture

### Project structure

```
src/
├── auth.ts                          # NextAuth config (Google, GitHub, Resend providers)
├── proxy.ts                         # Middleware — gates all routes behind auth
├── types/index.ts                   # Domain types: Slide (code|content|mermaid), Presentation
├── lib/
│   ├── redis.ts                     # Upstash Redis singleton client
│   ├── data.ts                      # Server-only persistence (get/save presentations)
│   ├── sections.ts                  # Section grouping helpers
│   └── validation.ts                # Presentation/slide schema validation
├── store/
│   └── presentation-store.ts        # Zustand store — state, localStorage, cloud sync
├── hooks/
│   └── use-highlighter.ts           # Lazy-loads Shiki highlighter (singleton)
├── utils/
│   ├── id.ts                        # UUID generation
│   ├── compress-image.ts            # Image → WebP data URL compression
│   └── export-import.ts             # .slidedude.json export/import
├── components/
│   ├── code-slide-editor.tsx         # Code editor (textarea + syntax overlay) + section input
│   ├── content-slide-editor.tsx      # Content editor with image upload + section input
│   ├── mermaid-slide-editor.tsx      # Split-pane Mermaid source/preview editor
│   ├── mermaid-diagram.tsx           # Lazy-loaded Mermaid SVG renderer
│   ├── slide-list.tsx                # Sidebar with drag-and-drop reordering + section badges
│   ├── shiki-code-block.tsx          # Syntax-highlighted code renderer
│   ├── user-menu.tsx                 # User profile + sign-out
│   └── error-boundary.tsx            # React error boundary
└── app/
    ├── layout.tsx                    # Root layout with SessionProvider
    ├── page.tsx                      # Editor home page
    ├── globals.css                   # Tailwind v4 theme + custom styles
    ├── login/page.tsx                # Login page (3 auth methods)
    ├── present/page.tsx              # Fullscreen presentation + overview/PDF print view
    ├── presenter/page.tsx            # Presenter notes window with section context
    └── api/
        ├── auth/[...nextauth]/route.ts   # NextAuth route handler
        ├── auth/check-email/route.ts     # Email allowlist validation
        └── presentations/route.ts        # GET/PUT cloud sync endpoints
```

### Request flow

```
Browser request
    │
    ▼
proxy.ts (middleware)
    │
    ├─ Public paths (/api/auth/*, /login, /_next, /favicon) → pass through
    │
    └─ Protected paths (everything else)
           │
           ▼
       auth() → check JWT session
           │
           ├─ No session → redirect to /login
           └─ Valid session → NextResponse.next()
```

### Auth flow

```
/login
    │
    ├─ Google OAuth ──────────────┐
    ├─ GitHub OAuth ──────────────┤
    └─ Email magic link           │
         │                        │
         ▼                        │
    POST /api/auth/check-email    │
         │                        │
         ├─ Not on allowlist      │
         │     → error message    │
         │                        │
         └─ Allowed ──────────────┤
                                  ▼
                     NextAuth callback
                          │
                          ▼
                 signIn callback checks email
                 against ALLOWED_EMAILS
                          │
                          ▼
                   JWT token issued
                   (httpOnly cookie)
                          │
                          ▼
                  Redirect to / (editor)
```

All three providers share data by email — Redis key is `presentations:{email}`. OAuth providers use `allowDangerousEmailAccountLinking` to merge accounts with the same email.

### Data flow: edit → save → sync

```
User edits slide
    │
    ▼
store.updateSlide(index, patch)
    │
    ├─ 1. State updated in memory (instant)
    ├─ 2. localStorage persisted (Zustand persist middleware, instant)
    └─ 3. scheduleSave() (debounced 4s)
              │
              ▼
         saveToServer()
              │
              ▼
         PUT /api/presentations
              │
              ▼
         auth() → get session.user.email
              │
              ▼
         redis.set(`presentations:${email}`, data)
```

### Data flow: load on startup

```
App mounts
    │
    ▼
Zustand rehydrates from localStorage
    │
    ▼
useHydration() signals ready
    │
    ▼
store.loadFromServer()
    │
    ▼
GET /api/presentations
    │
    ▼
Server data wins (if non-empty)
    │
    ▼
Store updated, UI renders
```

### Presentation mode flow

```
User clicks "Present"
    │
    ▼
window.open("/present")
    │
    ▼
/present hydrates Zustand from localStorage
    │
    ├─ Requests fullscreen (Fullscreen API)
    ├─ Creates BroadcastChannel("slidedude-control")  ← listens for go-to-slide from editor
    └─ Creates BroadcastChannel("slidedude-presenter") → broadcasts slide index to presenter
    │
    ▼
Keyboard/click navigation
    │
    ├─ Code slides → ShikiMagicMove (token-level animation)
    └─ Content slides → title + body + image

/presenter (optional second window)
    │
    ├─ Listens to BroadcastChannel("slidedude-presenter")
    ├─ Shows current slide notes
    ├─ Shows next slide preview
    └─ Displays elapsed timer
```

### State management

```
┌──────────────────────────────────────┐
│         usePresentationStore         │
│              (Zustand)               │
├──────────────────────────────────────┤
│ Persisted (localStorage):            │
│   • presentations: Presentation[]    │
│   • activePresentationId: string     │
├──────────────────────────────────────┤
│ Transient (RAM):                     │
│   • isPresentationMode: boolean      │
│   • syncStatus: idle|saving|saved|err│
│   • storageWarning: boolean          │
├──────────────────────────────────────┤
│ Persistence layers (priority order): │
│   1. localStorage  (instant, local)  │
│   2. Upstash Redis (debounced, cloud)│
│   3. .slidedude.json (manual export) │
└──────────────────────────────────────┘
```

### API endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth | Handles OAuth and magic link flows |
| `/api/auth/check-email` | POST | None | Validates email against allowlist |
| `/api/presentations` | GET | Required | Load presentations from Redis |
| `/api/presentations` | PUT | Required | Save presentations to Redis |

## Getting started

### Prerequisites

- Node.js 18+
- An [Upstash Redis](https://upstash.com/) database
- At least one auth provider configured:
  - [Google OAuth](https://console.cloud.google.com/apis/credentials) app
  - [GitHub OAuth](https://github.com/settings/applications/new) app
  - [Resend](https://resend.com/) API key (for email magic link)

### Setup

```bash
git clone https://github.com/guille-gallo/slidedude.git
cd slidedude
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

```env
AUTH_SECRET=              # openssl rand -base64 32
AUTH_URL=http://localhost:3000

# Redis (required)
KV_REST_API_URL=          # Upstash Redis REST URL
KV_REST_API_TOKEN=        # Upstash Redis REST token

# Auth providers (configure at least one)
AUTH_GOOGLE_ID=           # Google OAuth client ID
AUTH_GOOGLE_SECRET=       # Google OAuth client secret
AUTH_GITHUB_ID=           # GitHub OAuth client ID
AUTH_GITHUB_SECRET=       # GitHub OAuth client secret
AUTH_RESEND_KEY=          # Resend API key for magic link
AUTH_EMAIL_FROM=          # Sender address (e.g. noreply@yourdomain.com)

# Access control
ALLOWED_EMAILS=           # Comma-separated emails (leave empty to allow any)
```

OAuth redirect URIs (for each provider):

- `http://localhost:3000/api/auth/callback/google`
- `http://localhost:3000/api/auth/callback/github`
- `https://your-domain.com/api/auth/callback/google`
- `https://your-domain.com/api/auth/callback/github`

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy

Deploy to [Vercel](https://vercel.com) and set the environment variables in Settings → Environment Variables. Set `AUTH_URL` to your production domain (e.g. `https://slidedude.io`). The app auto-deploys on push to `main`.

## Security

- **Authentication** — Auth.js v5 with Google, GitHub, and Resend providers
- **Email allowlist** — `ALLOWED_EMAILS` restricts who can sign in (checked in `signIn` callback and pre-send for magic link)
- **Route protection** — `proxy.ts` middleware redirects unauthenticated users to `/login`
- **API auth** — All data endpoints verify the session server-side before accessing Redis
- **Server-only secrets** — No `NEXT_PUBLIC_` env vars; all secrets stay on the server
- **Data validation** — Server validates presentation data before persisting
- **Security headers** — `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`
- **`.env*` gitignored** — Secrets never committed to the repository

## Tech stack

- **[Next.js 16](https://nextjs.org/)** — App Router, React 19, Turbopack
- **[Zustand](https://zustand.docs.pmnd.rs/)** — State management with localStorage persistence
- **[Shiki](https://shiki.style/) + [Shiki Magic Move](https://github.com/shikijs/shiki-magic-move)** — Syntax highlighting and animated code transitions
- **[Auth.js v5](https://authjs.dev/)** — Multi-provider auth with JWT sessions
- **[Upstash Redis](https://upstash.com/)** — Cloud persistence (with `@auth/upstash-redis-adapter` for magic link tokens)
- **[Tailwind CSS 4](https://tailwindcss.com/)** — Styling
- **[Framer Motion](https://motion.dev/)** — UI animations
- **[@dnd-kit](https://dndkit.com/)** — Drag and drop
- **[Resend](https://resend.com/)** — Email delivery for magic link auth
- **[Mermaid](https://mermaid.js.org/)** — Diagram-as-code rendering (lazy-loaded)
- **[Lucide](https://lucide.dev/)** — Icons
