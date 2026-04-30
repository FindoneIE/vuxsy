export default function AdminModerationLoading() {
  return (
  <div className="w-full bg-white">
      <div className="w-full space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-56 animate-pulse rounded-full bg-slate-200" />
          <div className="h-4 w-72 animate-pulse rounded-full bg-slate-200" />
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`card-${index}`}
              className="h-24 animate-pulse rounded-2xl border border-slate-200/70 bg-white"
            />
          ))}
        </div>
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={`section-${index}`}
            className="space-y-3 rounded-2xl border border-slate-200/70 bg-white p-4"
          >
            <div className="h-5 w-32 animate-pulse rounded-full bg-slate-200" />
            <div className="grid gap-2 md:grid-cols-4">
              {Array.from({ length: 4 }).map((__, filterIndex) => (
                <div
                  key={`filter-${index}-${filterIndex}`}
                  className="h-10 animate-pulse rounded-lg bg-slate-100"
                />
              ))}
            </div>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((__, rowIndex) => (
                <div
                  key={`row-${index}-${rowIndex}`}
                  className="h-10 animate-pulse rounded-lg bg-slate-100"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
