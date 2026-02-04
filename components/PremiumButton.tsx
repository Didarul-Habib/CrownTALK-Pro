"use client";

import clsx from "clsx";
import { motion } from "framer-motion";
import { MOTION } from "@/lib/motion";

export default function PremiumButton({
  className,
  disabled,
  children,
  type,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <motion.button
      {...props}
      type={type ?? "button"}
      disabled={disabled}
      whileHover={
        disabled
          ? undefined
          : {
              y: -1,
              scale: 1.01,
              boxShadow:
                "0 18px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.10), 0 0 24px color-mix(in srgb, var(--ct-accent) 26%, transparent)",
            }
      }
      whileTap={disabled ? undefined : { y: 0, scale: 0.985 }}
      transition={{ duration: MOTION.dur.base, ease: MOTION.ease }}
      className={clsx("ct-btn ct-btn3d", className)}
    >
      {children}
    </motion.button>
  );
}
