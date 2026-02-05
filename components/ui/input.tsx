"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-10 w-full rounded-[calc(var(--ct-radius)-8px)] border border-[color:var(--ct-border)] bg-[color:var(--ct-panel)]/40",
      "px-3 text-sm text-[color:var(--ct-text)] placeholder:text-white/40",
      "shadow-inner shadow-black/20",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ct-accent)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ct-bg)]",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";
