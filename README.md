# slidedude

An animated code presentation tool for creating polished technical talks. Write code, add content slides, and present with smooth syntax-highlighted animations.

## Features

- **Animated code transitions** — Shiki Magic Move for smooth code morphing between slides
- **Syntax highlighting** — TypeScript, JavaScript, HTML, CSS, JSON, Python, Markdown, JSX, TSX
- **Content slides** — Rich text with image support (paste from clipboard or upload)
- **Drag & drop** — Reorder slides with keyboard-accessible drag and drop
- **Cloud sync** — Auto-saves to Upstash Redis with local storage fallback
- **Google OAuth** — Restrict access with an email allowlist
- **Export / Import** — Back up presentations as `.slidedude.json` files
- **Fullscreen presentation** — Browser Fullscreen API with keyboard navigation
- **Error boundaries** — Graceful recovery from runtime errors

## Keyboard shortcuts

### Editor

| Shortcut | Action |
|----------|--------|
| **F5** | Start presentation |
| **Shift + N** | New code slide |
| **Ctrl/Cmd + D** | Duplicate slide |
| **Delete** | Remove slide |

### Presentation mode

| Shortcut | Action |
|----------|--------|
| **→** / **Space** | Next slide |
| **←** | Previous slide |
| **Esc** / **F5** | Exit |

## Getting started

### Prerequisites

- Node.js 18+
- A [Google OAuth](https://console.cloud.google.com/apis/credentials) app
- An [Upstash Redis](https://upstash.com/) database (or Vercel KV)

### Setup

```bash
git clone https://github.com/guille-gallo/slidedude.git
cd slidedude
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

```env
AUTH_SECRET=          # openssl rand -base64 32
AUTH_GOOGLE_ID=       # Google OAuth client ID
AUTH_GOOGLE_SECRET=   # Google OAuth client secret
KV_REST_API_URL=      # Upstash Redis REST URL
KV_REST_API_TOKEN=    # Upstash Redis REST token
ALLOWED_EMAILS=       # Comma-separated emails (leave empty to allow any)
```

Google OAuth redirect URIs:

- `http://localhost:3000/api/auth/callback/google`
- `https://your-domain.vercel.app/api/auth/callback/google`

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy

Deploy to [Vercel](https://vercel.com) and add the environment variables above in Settings → Environment Variables. The app auto-deploys on push to `main`.

## Security

- **Authentication** — Google OAuth via Auth.js v5 with email allowlist
- **Route protection** — `proxy.ts` redirects unauthenticated users to `/login`
- **API auth** — All API routes verify the session server-side
- **Server-only secrets** — No `NEXT_PUBLIC_` env vars; all secrets stay on the server
- **Data validation** — Server validates presentation data before persisting
- **Security headers** — `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`
- **`.env*` gitignored** — Secrets never committed to the repository

## Tech stack

- **Next.js 16** (App Router, React 19)
- **Zustand** — State management with localStorage persistence
- **Shiki + Shiki Magic Move** — Syntax highlighting and code animations
- **Auth.js v5** — Google OAuth with JWT sessions
- **Upstash Redis** — Cloud persistence
- **Tailwind CSS 4** — Styling
- **Framer Motion** — UI animations
- **@dnd-kit** — Drag and drop
