export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto animate-pulse">
      <header className="mb-8">
        <div className="h-4 w-80 rounded bg-slate-200 dark:bg-slate-800 mb-3" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-9 w-96 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-[520px] max-w-full rounded bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-36 rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="h-10 w-32 rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="h-10 w-44 rounded-lg bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm"
          >
            <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-9 w-24 rounded bg-slate-200 dark:bg-slate-800 mt-2" />
          </div>
        ))}
      </div>

      <section className="mb-6">
        <div className="mb-4 px-1 space-y-2">
          <div className="h-6 w-40 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-80 rounded bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 space-y-4">
            <div className="h-10 w-full rounded bg-slate-200 dark:bg-slate-800" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 w-full rounded bg-slate-200 dark:bg-slate-800" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
