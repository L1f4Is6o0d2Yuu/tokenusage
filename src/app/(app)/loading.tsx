// Skeleton rendered immediately when any (app) route segment is loading.
// The sidebar lives at the layout level so it stays put — only the right
// pane swaps. This is the MPA-with-SPA-feel pattern: separate URL per
// page, but every transition shows instant local state instead of a
// blank flash. Next's <Link> prefetches the real page in the background
// and the framework swaps the loading file out as soon as it's ready.

export default function AppLoading() {
  return (
    <>
      {/* Top progress bar — sits exactly where the sticky header would.
          Animated stripe gives an immediate "something is happening". */}
      <div className="sticky top-0 z-10 flex h-[57px] items-center border-b border-border-subtle bg-bg-app/85 px-6 backdrop-blur">
        <div className="flex w-full max-w-xs flex-col gap-2">
          <div className="h-3 w-32 animate-pulse rounded bg-bg-panel-2" />
          <div className="h-2 w-48 animate-pulse rounded bg-bg-panel-2" />
        </div>
        <div className="ml-auto h-7 w-72 animate-pulse rounded-md bg-bg-panel-2" />
      </div>

      <div className="flex-1 px-6 py-5">
        {/* Source banner placeholder */}
        <div className="h-9 w-full animate-pulse rounded-md bg-bg-panel-2" />

        {/* KPI grid */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-bg-panel ring-1 ring-foreground/10"
              style={{ animationDelay: `${i * 40}ms` }}
            />
          ))}
        </div>

        {/* Two-up: chart + ranked list */}
        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          <div className="h-72 animate-pulse rounded-xl bg-bg-panel ring-1 ring-foreground/10 lg:col-span-2" />
          <div className="h-72 animate-pulse rounded-xl bg-bg-panel ring-1 ring-foreground/10" />
        </div>

        {/* Full-width breakdown */}
        <div className="mt-6 h-80 animate-pulse rounded-xl bg-bg-panel ring-1 ring-foreground/10" />
      </div>
    </>
  );
}
