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

/** Class 1…9, then 10 A / 10 B, then 11 A / 11 B — not 1, 10, 11, 2. */
export function compareRoomNames(a: string, b: string): number {
  const keyA = roomNameSortKey(a);
  const keyB = roomNameSortKey(b);
  if (keyA.grade !== keyB.grade) return keyA.grade - keyB.grade;
  if (keyA.section !== keyB.section) return keyA.section.localeCompare(keyB.section);
  return keyA.normalized.localeCompare(keyB.normalized, undefined, { numeric: true, sensitivity: "base" });
}

function roomNameSortKey(name: string) {
  const normalized = name.trim().toUpperCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  const parts = [...normalized.matchAll(/(\d+)\s*([A-Z])?/g)];
  const last = parts[parts.length - 1];
  return {
    grade: last ? Number(last[1]) : Number.MAX_SAFE_INTEGER,
    section: last?.[2] ?? "",
    normalized,
  };
}
