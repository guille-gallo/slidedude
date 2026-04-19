"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 bg-background p-8 text-foreground">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
        <svg
          width="24"
          height="24"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-zinc-200">Something went wrong</h2>
      <p className="max-w-md text-center text-sm text-zinc-500">
        {error.message || "An unexpected error occurred."}
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-black transition-all hover:bg-emerald-400 active:scale-[0.98]"
        >
          Try again
        </button>
        <button
          onClick={() => (window.location.href = "/")}
          className="rounded-lg border border-[--border-bright] bg-white/[0.02] px-4 py-2 text-sm text-zinc-400 transition-all hover:bg-white/[0.06]"
        >
          Go home
        </button>
      </div>
    </div>
  );
}
