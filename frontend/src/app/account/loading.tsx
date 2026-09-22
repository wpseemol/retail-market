/** Instant soft shell while the server account page streams (rare). */
export default function AccountLoading() {
  return (
    <main className="flex-1 bg-bg-base" aria-busy="true" aria-label="Loading account">
      <div className="border-b border-border-default bg-bg-subtle/60">
        <div className="container mx-auto px-4 sm:px-6 py-3">
          <div className="h-4 w-40 rounded bg-bg-subtle animate-pulse" />
        </div>
      </div>
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-10 lg:py-12">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="rounded-2xl border border-border-default bg-bg-surface p-5 sm:p-8">
            <div className="flex items-center gap-4">
              <div className="size-16 sm:size-20 shrink-0 rounded-full bg-bg-subtle animate-pulse" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3 w-24 rounded bg-bg-subtle animate-pulse" />
                <div className="h-7 w-48 max-w-full rounded bg-bg-subtle animate-pulse" />
                <div className="h-4 w-56 max-w-full rounded bg-bg-subtle animate-pulse" />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border-default bg-bg-surface p-5 sm:p-8 space-y-4">
            <div className="h-6 w-40 rounded bg-bg-subtle animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="h-11 rounded bg-bg-subtle animate-pulse" />
              <div className="h-11 rounded bg-bg-subtle animate-pulse" />
            </div>
            <div className="h-11 rounded bg-bg-subtle animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="h-11 rounded bg-bg-subtle animate-pulse" />
              <div className="h-11 rounded bg-bg-subtle animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
