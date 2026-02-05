"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ResultItem } from "@/lib/types";
import ResultCard from "@/components/ResultCard";

export default function VirtualResultList({
  items,
  onRerollUrl,
  onCopy,
}: {
  items: ResultItem[];
  onRerollUrl: (url: string) => void;
  onCopy?: (text: string, url?: string) => void;
}) {
  const parentRef = useRef<HTMLDivElement | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 180,
    overscan: 8,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  return (
    <div
      ref={parentRef}
      className="rounded-[var(--ct-radius)] border border-[color:var(--ct-border)] bg-[color:var(--ct-panel)] backdrop-blur-xl"
      style={{ maxHeight: "70vh", overflow: "auto" }}
    >
      <div style={{ height: totalSize, width: "100%", position: "relative" }}>
        {virtualItems.map((v) => {
          const it = items[v.index];
          return (
            <div
              key={v.key}
              ref={rowVirtualizer.measureElement}
              data-index={v.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${v.start}px)`,
                padding: "12px",
              }}
            >
              <ResultCard item={it} onReroll={() => onRerollUrl(it.url)} onCopy={onCopy} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
