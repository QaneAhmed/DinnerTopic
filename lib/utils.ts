import crypto from "crypto";

export function formatList(items: string[] = []): string {
  return items.join(", ");
}

export function hashString(value: string): string {
  return crypto.createHash("sha1").update(value).digest("hex");
}

export function normalizeQuery(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

export function splitCommaList(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function dedupe<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

export function sample<T>(items: T[], fallback?: T): T {
  if (!items.length) {
    if (fallback !== undefined) return fallback;
    throw new Error("Cannot sample from an empty array");
  }
  const index = Math.floor(Math.random() * items.length);
  return items[index];
}
