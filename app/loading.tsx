export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="ct-card p-6">
        <div className="h-4 w-32 rounded-full bg-white/10" />
        <div className="mt-2 h-3 w-60 rounded-full bg-white/10" />

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="ct-skeleton rounded-[var(--ct-radius)] p-4">
            <div className="h-3 w-40 rounded-full bg-white/10" />
            <div className="mt-3 h-24 rounded-2xl bg-white/10" />
            <div className="mt-3 h-8 w-40 rounded-full bg-white/10" />
          </div>
          <div className="ct-skeleton rounded-[var(--ct-radius)] p-4">
            <div className="h-3 w-40 rounded-full bg-white/10" />
            <div className="mt-3 h-24 rounded-2xl bg-white/10" />
            <div className="mt-3 h-8 w-40 rounded-full bg-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
}
