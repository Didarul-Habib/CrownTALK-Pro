import type { ResultItem } from "@/lib/types";
import ResultCard from "./ResultCard";

export default function Results({
  items,
  onRerollUrl,
}: {
  items: ResultItem[];
  onRerollUrl: (url: string) => void;
}) {
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 text-sm text-neutral-400">
        Results will appear here.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((it) => (
        <ResultCard key={it.url} item={it} onReroll={() => onRerollUrl(it.url)} />
      ))}
    </div>
  );
}
