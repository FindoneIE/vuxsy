import { formatDistanceToNow } from "date-fns";

export function titleCase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatListingLocation(parts: Array<string | null | undefined>): string {
  const cleaned = parts
    .map((part) => (part || "").trim())
    .filter(Boolean)
    .map(titleCase);

  const deduped = cleaned.filter(
    (part, index) => cleaned.findIndex((p) => p.toLowerCase() === part.toLowerCase()) === index
  );

  return deduped.join(", ");
}

export function formatRelativeTime(value: unknown): string | null {
  if (!value) return null;
  if (!(value instanceof Date) && typeof value !== "string" && typeof value !== "number") {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return formatDistanceToNow(date, { addSuffix: true });
}

export function formatViewsCount(value?: number | null): string | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  const count = Math.max(0, Math.floor(value));
  return `${count} view${count === 1 ? "" : "s"}`;
}
