"use client";

import { FixedSizeList as List } from "react-window";
import { useMemo } from "react";
import type { ResultItem } from "@/lib/types";
import ResultCard from "@/components/ResultCard";

export default function VirtualizedResults({
  items,
  onRerollUrl,
  onCopy,
}: {
  items: ResultItem[];
  onRerollUrl: (url: string) => void;
  onCopy?: (text: string, url?: string) => void;
}) {
  const rowHeight = 240;
  const height = useMemo(() => {
    // Cap height so it works on mobile + desktop.
    if (typeof window === "undefined") return 640;
    return Math.max(420, Math.min(720, window.innerHeight - 260));
  }, []);

  return (
    <div className="rounded-[var(--ct-radius)] border border-[color:var(--ct-border)] bg-[color:var(--ct-panel)] backdrop-blur-xl">
      <List
        height={height}
        itemCount={items.length}
        itemSize={rowHeight}
        width={"100%"}
        overscanCount={3}
      >
        {({ index, style }) => {
          const it = items[index];
          return (
            <div style={style} className="px-3 py-3">
              <ResultCard
                item={it}
                index={index}
                onRerollUrl={onRerollUrl}
                onCopy={onCopy}
              />
            </div>
          );
        }}
      </List>
    </div>
  );
}
