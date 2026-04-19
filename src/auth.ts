import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Resend from "next-auth/providers/resend";
import { UpstashRedisAdapter } from "@auth/upstash-redis-adapter";
import { redis } from "@/lib/redis";

const allowedEmails = (process.env.ALLOWED_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isEmailAllowed(email: string): boolean {
  if (allowedEmails.length === 0) return true;
  return allowedEmails.includes(email.trim().toLowerCase());
}

export const { handlers, auth, signIn, signOut } = NextAuth({
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
      return allowedEmails.includes(email.toLowerCase());
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
