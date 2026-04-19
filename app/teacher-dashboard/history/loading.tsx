export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto animate-pulse">
      <header className="mb-8">
        <div className="h-4 w-64 rounded bg-slate-200 dark:bg-slate-800 mb-3" />
        <div className="h-9 w-72 rounded bg-slate-200 dark:bg-slate-800 mb-2" />
        <div className="h-4 w-96 rounded bg-slate-200 dark:bg-slate-800" />
      </header>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="h-10 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-10 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-10 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-10 rounded bg-slate-200 dark:bg-slate-800" />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex gap-6">
              <div className="h-4 w-64 rounded bg-slate-200/80 dark:bg-slate-700/60" />
              <div className="h-4 w-32 rounded bg-slate-200/80 dark:bg-slate-700/60" />
              <div className="h-4 w-20 rounded bg-slate-200/80 dark:bg-slate-700/60" />
              <div className="h-4 w-24 rounded bg-slate-200/80 dark:bg-slate-700/60 ml-auto" />
            </div>
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-6"
              >
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-80 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-3 w-64 rounded bg-slate-200 dark:bg-slate-800" />
                </div>
                <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-6 w-20 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="h-6 w-12 rounded-full bg-slate-200 dark:bg-slate-800 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
