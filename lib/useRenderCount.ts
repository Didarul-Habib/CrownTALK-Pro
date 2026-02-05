"use client";

import { useEffect } from "react";
import { bumpRender } from "@/lib/renderRegistry";

export function useRenderCount(name: string) {
  // Called on each render
  bumpRender(name);
  useEffect(() => {
    // mark mount
    bumpRender(name + ":mount");
    return () => bumpRender(name + ":unmount");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
