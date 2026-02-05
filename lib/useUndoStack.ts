"use client";

import { useCallback, useMemo, useRef, useState } from "react";

// Simple undo/redo stack for string state (URL input).
// Uses explicit buttons (not keyboard-first) but keyboard will still work via browser.

export function useUndoStack(initial: string, max = 60) {
  const [value, setValue] = useState(initial);
  const [cursor, setCursor] = useState(0);
  const stack = useRef<string[]>([initial]);
  const idx = useRef(0);

  const set = useCallback(
    (next: string) => {
      setValue(next);
      // If same as current, ignore.
      if (stack.current[idx.current] === next) return;
      // Truncate redo branch
      stack.current = stack.current.slice(0, idx.current + 1);
      stack.current.push(next);
      if (stack.current.length > max) {
        stack.current.shift();
      } else {
        idx.current += 1;
      }
      setCursor(idx.current);
    },
    [max]
  );

  const undo = useCallback(() => {
    if (idx.current <= 0) return;
    idx.current -= 1;
    setCursor(idx.current);
    const v = stack.current[idx.current] ?? "";
    setValue(v);
  }, []);

  const redo = useCallback(() => {
    if (idx.current >= stack.current.length - 1) return;
    idx.current += 1;
    setCursor(idx.current);
    const v = stack.current[idx.current] ?? "";
    setValue(v);
  }, []);

  const api = useMemo(
    () => ({
      value,
      set,
      undo,
      redo,
      canUndo: cursor > 0,
      canRedo: cursor < stack.current.length - 1,
    }),
    // value changes triggers memo rebuild
    [value, set, undo, redo, cursor]
  );

  return api;
}
