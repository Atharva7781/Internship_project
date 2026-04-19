export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto animate-pulse">
      <header className="mb-8">
        <div className="h-9 w-48 rounded bg-slate-200 mb-2" />
        <div className="h-4 w-[520px] max-w-full rounded bg-slate-200" />
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="h-4 w-28 rounded bg-slate-200" />
            <div className="h-9 w-20 rounded bg-slate-200 mt-3" />
            <div className="h-3 w-40 rounded bg-slate-200 mt-3" />
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-2">
              <div className="h-6 w-40 rounded bg-slate-200" />
              <div className="h-4 w-64 rounded bg-slate-200" />
            </div>
            <div className="h-4 w-16 rounded bg-slate-200" />
          </div>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 flex gap-6">
              <div className="h-4 w-40 rounded bg-slate-200" />
              <div className="h-4 w-24 rounded bg-slate-200" />
              <div className="h-4 w-24 rounded bg-slate-200" />
              <div className="h-4 w-20 rounded bg-slate-200" />
              <div className="h-4 w-24 rounded bg-slate-200 ml-auto" />
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-6 py-4 border-t border-slate-200 flex items-center gap-6">
                <div className="h-4 w-56 rounded bg-slate-200" />
                <div className="h-4 w-24 rounded bg-slate-200" />
                <div className="h-6 w-14 rounded-full bg-slate-200" />
                <div className="h-6 w-20 rounded-full bg-slate-200" />
                <div className="h-8 w-20 rounded bg-slate-200 ml-auto" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="h-6 w-40 rounded bg-slate-200" />
          <div className="h-4 w-56 rounded bg-slate-200 mt-2" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl border border-slate-200 bg-slate-50" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
