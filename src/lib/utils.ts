import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Room type and heading: every letter capital. */
export function toAllCaps(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

/** Other free-text fields: first letter of each word capital. */
export function toTitleCase(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => {
      if (!word) return word;
      return word[0]!.toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}
