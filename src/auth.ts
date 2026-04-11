import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const allowedEmails = (process.env.ALLOWED_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    signIn({ profile }) {
      if (!profile?.email) return false;
      if (allowedEmails.length === 0) return true;
      return allowedEmails.includes(profile.email.toLowerCase());
    },
    jwt({ token, profile }) {
      if (profile) {
        token.email = profile.email;
        token.name = profile.name;
        token.picture = profile.picture as string | undefined;
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
