import type { Period } from "./rankings";

export function formatPeriodLabel(period: Period): string {
  const start = new Date(period.start);
  const end = new Date(period.end);
  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${fmt(start)} – ${fmt(end)} ${end.getFullYear()}`;
}

export function formatMonthLabel(monthStart: string): string {
  return new Date(`${monthStart}T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
