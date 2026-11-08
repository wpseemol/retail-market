/** Instant soft shell while the server account page streams (rare). */
export default function AccountLoading() {
  return (
    <main className="min-w-0 flex-1" aria-busy="true" aria-label="Loading account">
      <div className="space-y-6">
        <div className="overflow-hidden rounded-2xl border border-border-default bg-bg-surface shadow-sm">
          <div className="h-28 animate-pulse bg-brand-primary/25" />
          <div className="space-y-3 p-5 sm:p-8">
            <div className="h-4 w-48 rounded bg-bg-subtle animate-pulse" />
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="size-10 rounded-full bg-bg-subtle animate-pulse"
                />
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border-default bg-bg-surface p-5 sm:p-8 space-y-4 shadow-sm">
          <div className="h-6 w-40 rounded bg-bg-subtle animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="h-11 rounded bg-bg-subtle animate-pulse" />
            <div className="h-11 rounded bg-bg-subtle animate-pulse" />
          </div>
          <div className="h-11 rounded bg-bg-subtle animate-pulse" />
        </div>
      </div>
    </main>
  );
}
