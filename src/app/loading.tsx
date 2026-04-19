export default function Loading() {
  return (
    <div className="flex h-full">
      {/* Sidebar skeleton */}
      <div className="w-64 shrink-0 border-r border-border bg-sidebar p-4">
        <div className="mb-4 h-8 w-32 animate-pulse rounded bg-surface-bright" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg bg-surface"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>
      {/* Editor skeleton */}
      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-border px-6 py-3">
          <div className="h-6 w-48 animate-pulse rounded bg-surface-bright" />
          <div className="ml-auto flex gap-2">
            <div className="h-8 w-8 animate-pulse rounded bg-surface" />
            <div className="h-8 w-8 animate-pulse rounded bg-surface" />
            <div className="h-8 w-8 animate-pulse rounded bg-surface" />
          </div>
        </div>
        <div className="flex-1 p-6">
          <div className="h-full animate-pulse rounded-lg bg-surface" />
        </div>
      </div>
    </div>
  );
}
