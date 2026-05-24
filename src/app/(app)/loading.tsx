// Skeleton rendered immediately when any (app) route segment is loading.
// The sidebar lives at the layout level so it stays put — only the right
// pane swaps. Keep this page-agnostic: it should work for dashboard,
// access console, models, prices, and detail pages without implying the
// user is always waiting for KPI charts.

export default function AppLoading() {
  return (
    <main className="flex-1 px-6 py-6" aria-busy="true" aria-label="Loading page">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-col gap-4 border-b border-border-subtle pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="tu-shimmer h-3 w-24 rounded" />
            <div className="tu-shimmer h-8 w-56 rounded-lg" />
            <div className="tu-shimmer h-3 w-80 max-w-[80vw] rounded" />
          </div>
          <div className="grid w-full gap-2 sm:w-96 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="tu-shimmer h-14 rounded-lg ring-1 ring-foreground/10"
                style={{ animationDelay: `${i * 70}ms` }}
              />
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="tu-shimmer h-7 w-24 rounded-full"
              style={{ animationDelay: `${180 + i * 50}ms` }}
            />
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <section className="rounded-xl bg-bg-panel p-4 ring-1 ring-foreground/10">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="tu-shimmer h-4 w-36 rounded" />
                <div className="tu-shimmer h-3 w-52 rounded" />
              </div>
              <div className="tu-shimmer h-8 w-24 rounded-md" />
            </div>
            <div className="space-y-2">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1.5fr_1fr_1fr_auto] gap-3 rounded-lg border border-border-subtle/70 p-3"
                  style={{ animationDelay: `${i * 45}ms` }}
                >
                  <div className="tu-shimmer h-4 rounded" />
                  <div className="tu-shimmer h-4 rounded" />
                  <div className="tu-shimmer h-4 rounded" />
                  <div className="tu-shimmer h-4 w-16 rounded" />
                </div>
              ))}
            </div>
          </section>

          <aside className="rounded-xl bg-bg-panel p-4 ring-1 ring-foreground/10">
            <div className="tu-shimmer mb-4 h-4 w-32 rounded" />
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="tu-shimmer h-9 w-9 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="tu-shimmer h-3 w-3/4 rounded" />
                    <div className="tu-shimmer h-2 w-1/2 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
