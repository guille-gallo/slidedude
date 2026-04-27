"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [oauthError, setOauthError] = useState("");

  async function handleOAuth(provider: "google" | "github") {
    setOauthError("");
    try {
      await signIn(provider, { callbackUrl: "/" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign-in failed";
      setOauthError(
        `${message}. If you have a content blocker or strict privacy extension, try disabling it for this site or clearing cookies and reloading.`,
      );
      console.error("[signIn] failed", err);
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setEmailError("");

    try {
      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const { allowed } = await res.json();
      if (!allowed) {
        setEmailError("This email is not authorized.");
        setSending(false);
        return;
      }
      await signIn("resend", { email: email.trim(), callbackUrl: "/" });
      setMagicLinkSent(true);
    } catch {
      setEmailError("Something went wrong. Try again.");
    }
    setSending(false);
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-10 bg-background text-foreground">
      {/* Subtle radial glow behind the logo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="h-[400px] w-[400px] rounded-full bg-emerald-500/[0.04] blur-3xl" />
      </div>
      <div className="relative flex flex-col items-center gap-3">
        <h1 className="font-mono text-4xl font-semibold tracking-wide text-white">slidedude<span className="text-emerald-400">_</span></h1>
        <p className="text-sm text-zinc-500">
          Animated code presentations for developers
        </p>
      </div>

      <div className="relative flex w-72 flex-col gap-3">
        {/* Google */}
        <button
          onClick={() => handleOAuth("google")}
          className="flex w-full items-center gap-3 rounded-xl border border-[--border-bright] bg-white/[0.03] px-6 py-3 text-sm font-medium text-zinc-200 shadow-lg shadow-black/30 backdrop-blur-sm transition-all hover:bg-white/[0.06] hover:shadow-xl active:scale-[0.98]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Sign in with Google
        </button>

        {/* GitHub */}
        <button
          onClick={() => handleOAuth("github")}
          className="flex w-full items-center gap-3 rounded-xl border border-[--border-bright] bg-white/[0.03] px-6 py-3 text-sm font-medium text-zinc-200 shadow-lg shadow-black/30 backdrop-blur-sm transition-all hover:bg-white/[0.06] hover:shadow-xl active:scale-[0.98]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          Sign in with GitHub
        </button>

        {oauthError && (
          <p className="text-center text-sm text-red-400">{oauthError}</p>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-zinc-800" />
          <span className="text-xs text-zinc-600">or</span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        {/* Magic link */}
        {magicLinkSent ? (
          <p className="text-center text-sm text-emerald-400">
            Check your email for the login link.
          </p>
        ) : (
          <form onSubmit={handleMagicLink} className="flex flex-col gap-2">
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-[--border-bright] bg-white/[0.03] px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
            />
            <button
              type="submit"
              disabled={sending}
              className="w-full rounded-xl border border-[--border-bright] bg-white/[0.03] px-6 py-3 text-sm font-medium text-zinc-200 shadow-lg shadow-black/30 backdrop-blur-sm transition-all hover:bg-white/[0.06] hover:shadow-xl active:scale-[0.98] disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send magic link"}
            </button>
            {emailError && (
              <p className="text-center text-sm text-red-400">{emailError}</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
