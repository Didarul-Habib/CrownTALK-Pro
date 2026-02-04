import type { ResultItem } from "@/lib/types";

function copy(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

export default function ResultCard({
  item,
  onReroll,
}: {
  item: ResultItem;
  onReroll: () => void;
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-neutral-200 underline underline-offset-4 break-all"
        >
          {item.url}
        </a>
        <button
          type="button"
          className="text-xs rounded-lg border border-neutral-800 px-2 py-1 hover:bg-neutral-900"
          onClick={onReroll}
        >
          Reroll
        </button>
      </div>

      {item.status !== "ok" ? (
        <div className="text-sm text-neutral-300">
          <span className="inline-flex items-center rounded-full bg-neutral-900 border border-neutral-800 px-2 py-1 text-xs mr-2">
            {item.status.toUpperCase()}
          </span>
          {item.reason || "No details"}
        </div>
      ) : null}

      {item.comments?.map((c, idx) => (
        <div key={idx} className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 space-y-2">
          <div className="text-sm leading-6 whitespace-pre-wrap">{c.text}</div>
          <div className="flex items-center justify-between">
            <div className="text-xs text-neutral-400">{c.provider ? `via ${c.provider}` : ""}</div>
            <button
              type="button"
              className="text-xs rounded-lg border border-neutral-700 px-2 py-1 hover:bg-neutral-800"
              onClick={() => copy(c.text)}
            >
              Copy
            </button>
          </div>
          {c.alternates && c.alternates.length ? (
            <details className="text-sm">
              <summary className="cursor-pointer text-xs text-neutral-300">Alternates</summary>
              <div className="mt-2 space-y-2">
                {c.alternates.map((a, j) => (
                  <div key={j} className="rounded-lg border border-neutral-800 bg-neutral-950 p-2">
                    <div className="whitespace-pre-wrap text-sm">{a}</div>
                    <div className="mt-2">
                      <button
                        type="button"
                        className="text-xs rounded-lg border border-neutral-800 px-2 py-1 hover:bg-neutral-900"
                        onClick={() => copy(a)}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </div>
      ))}
    </div>
  );
}
