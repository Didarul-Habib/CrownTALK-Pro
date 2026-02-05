import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Tailwind-friendly className combiner.
 *
 * Usage: cn('a', condition && 'b')
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
