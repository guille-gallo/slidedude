import "@/lib/env";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Resend from "next-auth/providers/resend";
import { UpstashRedisAdapter } from "@auth/upstash-redis-adapter";
import { redis } from "@/lib/redis";
import { normalizeEmail } from "@/lib/email";

const allowedEmails = (process.env.ALLOWED_EMAILS ?? "")
  .split(",")
  .map((e) => normalizeEmail(e))
  .filter(Boolean);

export function isEmailAllowed(email: string): boolean {
  if (allowedEmails.length === 0) return true;
  return allowedEmails.includes(normalizeEmail(email));
}

export const { handlers, auth: nextAuthAuth, signIn, signOut } = NextAuth({
  adapter: UpstashRedisAdapter(redis),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID?.trim(),
      clientSecret: process.env.AUTH_GOOGLE_SECRET?.trim(),
      allowDangerousEmailAccountLinking: true,
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID?.trim(),
      clientSecret: process.env.AUTH_GITHUB_SECRET?.trim(),
      allowDangerousEmailAccountLinking: true,
    }),
    Resend({
      from: process.env.AUTH_EMAIL_FROM ?? "slidedude <noreply@slidedude.io>",
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    signIn({ user, profile }) {
      const email = profile?.email ?? user?.email;
      if (!email) return false;
      if (allowedEmails.length === 0) return true;
      return allowedEmails.includes(normalizeEmail(email));
    },
    jwt({ token, profile, user }) {
      if (profile) {
        token.email = profile.email;
        token.name = profile.name;
        token.picture = profile.picture as string | undefined;
      } else if (user) {
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image ?? undefined;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.email = token.email ?? "";
        session.user.name = token.name ?? "";
        session.user.image = token.picture as string | undefined;
      }
      return session;
    },
  },
});

/**
 * E2E auth bypass.
 *
 * When `E2E_BYPASS="1"` AND we are NOT in production, `auth()` returns a
 * synthetic session for `e2e@test.local`. This lets Playwright drive the app
 * without going through Google/GitHub/Resend.
 *
 * Hard-guarded so a misconfigured prod deploy can't accidentally bypass auth:
 *   - The flag is opt-in (must equal the literal string "1").
 *   - `NODE_ENV` must be exactly "development" or "test" (allow-list, not
 *     just `!== "production"`, so an unset/unknown value can't enable it).
 *   - Refuses to activate on any Vercel deployment (`VERCEL` is set in every
 *     build/runtime env on Vercel, including preview and production).
 */
const NODE_ENV = process.env.NODE_ENV;
const E2E_BYPASS_ENABLED =
  process.env.E2E_BYPASS === "1" &&
  (NODE_ENV === "development" || NODE_ENV === "test") &&
  !process.env.VERCEL &&
  !process.env.VERCEL_ENV;

const E2E_FAKE_SESSION = {
  user: {
    email: "e2e@test.local",
    name: "E2E Test User",
    image: undefined,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

export const auth: typeof nextAuthAuth = ((...args: unknown[]) => {
  if (E2E_BYPASS_ENABLED) {
    // The real `auth()` has overloads (callable handler vs direct call).
    // Playwright only invokes the no-arg form via proxy/route handlers, so
    // returning a resolved fake session is sufficient.
    return Promise.resolve(E2E_FAKE_SESSION);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (nextAuthAuth as any)(...args);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any;
