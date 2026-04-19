import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 bg-background p-8 text-foreground">
      <h1 className="font-mono text-5xl font-bold text-zinc-600">404</h1>
      <h2 className="text-lg font-semibold text-zinc-200">Page not found</h2>
      <p className="max-w-md text-center text-sm text-zinc-500">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-black transition-all hover:bg-emerald-400 active:scale-[0.98]"
      >
        Back to editor
      </Link>
    </div>
  );
}
