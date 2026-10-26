// Shown instantly while a dashboard page loads, so every tap gets a response.
export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="mb-6 flex items-center gap-3">
        <div className="h-14 w-14 rounded-2xl bg-surface-alt" />
        <div className="flex flex-col gap-2">
          <div className="h-7 w-48 rounded-full bg-surface-alt" />
          <div className="h-4 w-72 max-w-[60vw] rounded-full bg-surface-alt" />
        </div>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-surface-alt" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-2xl bg-surface-alt" />
        ))}
      </div>
    </div>
  );
}
