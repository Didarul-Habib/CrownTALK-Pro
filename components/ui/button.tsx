"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-[calc(var(--ct-radius)-6px)]",
    "font-medium",
    "transition-[transform,box-shadow,background,color,border,opacity] duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ct-accent)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ct-bg)]",
    "disabled:pointer-events-none disabled:opacity-50",
    "relative overflow-hidden",
    "before:pointer-events-none before:absolute before:inset-0 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-200",
    "before:bg-[radial-gradient(1200px_circle_at_30%_-20%,rgba(255,255,255,.22),transparent_40%)]",
    "active:scale-[0.99]",
  ],
  {
    variants: {
      variant: {
        primary: [
          "text-[color:var(--ct-on-accent)]",
          "bg-[color:var(--ct-accent)]",
          "shadow-[0_14px_40px_rgba(0,0,0,.22)]",
          "hover:shadow-[0_18px_58px_rgba(0,0,0,.28)]",
        ],
        secondary: [
          "text-[color:var(--ct-text)]",
          "bg-[color:var(--ct-panel)]",
          "border border-[color:var(--ct-border)]",
          "shadow-[0_10px_30px_rgba(0,0,0,.18)]",
          "hover:shadow-[0_16px_44px_rgba(0,0,0,.24)]",
        ],
        ghost: [
          "text-[color:var(--ct-text)]",
          "bg-transparent",
          "hover:bg-white/5",
          "border border-transparent hover:border-[color:var(--ct-border)]",
        ],
        danger: [
          "text-white",
          "bg-red-500/90 hover:bg-red-500",
          "shadow-[0_14px_40px_rgba(239,68,68,.18)]",
        ],
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-11 px-5 text-sm",
        icon: "h-10 w-10 p-0",
      },
      glow: {
        true: "hover:shadow-[0_0_0_1px_rgba(255,255,255,.08),0_18px_70px_rgba(124,58,237,.22)]",
        false: "",
      },
    },
    defaultVariants: { variant: "secondary", size: "md", glow: false },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, glow, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, glow }), className)} {...props} />
  )
);
Button.displayName = "Button";
