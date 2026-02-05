"use client";

import { useEffect, useMemo, useRef } from "react";
import { VariableSizeList as List, type ListChildComponentProps } from "react-window";
import type { ResultItem } from "@/lib/types";
import ResultCard from "@/components/ResultCard";
import { cn } from "@/lib/utils";

type Props = {
  items: ResultItem[];
  onRerollUrl: (url: string) => void;
  onCopy?: (text: string, url?: string) => void;
};

export default function VirtualizedResults({ items, onRerollUrl, onCopy }: Props) {
  const listRef = useRef<List>(null);
  const sizeMap = useRef<Record<number, number>>({});

  const getSize = (index: number) => sizeMap.current[index] ?? 220;

  const setSize = (index: number, size: number) => {
    if (sizeMap.current[index] === size) return;
    sizeMap.current = { ...sizeMap.current, [index]: size };
    listRef.current?.resetAfterIndex(index);
  };

  const height = useMemo(() => {
    if (typeof window === "undefined") return 600;
    return Math.max(320, Math.round(window.innerHeight * 0.7));
  }, []);

  useEffect(() => {
    sizeMap.current = {};
    listRef.current?.resetAfterIndex(0, true);
  }, [items.length]);

  return (
    <div className="rounded-[var(--ct-radius)] border border-[color:var(--ct-border)] bg-[color:var(--ct-panel)]/35 backdrop-blur-xl">
      <List
        ref={listRef}
        height={height}
        itemCount={items.length}
        itemSize={getSize}
        width={"100%"}
        itemData={{ items, setSize, onRerollUrl, onCopy }}
        overscanCount={6}
      >
        {Row}
      </List>
    </div>
  );
}

function Row({ index, style, data }: ListChildComponentProps) {
  const { items, setSize, onRerollUrl, onCopy } = data as any;
  const item: ResultItem = items[index];
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setSize(index, Math.ceil(rect.height) + 16);
    });
    ro.observe(el);
    const rect = el.getBoundingClientRect();
    setSize(index, Math.ceil(rect.height) + 16);

    return () => ro.disconnect();
  }, [index, setSize]);

  return (
    <div style={style} className="px-3 py-2">
      <div ref={ref} className={cn("will-change-transform")}>
        <ResultCard item={item} onReroll={() => onRerollUrl(item.url)} onCopy={onCopy} />
      </div>
    </div>
  );
}
