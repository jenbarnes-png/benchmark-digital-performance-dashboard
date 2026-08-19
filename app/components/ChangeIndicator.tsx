import type { ChangeDirection } from "@/lib/scoring";

export default function ChangeIndicator({
  delta,
  direction,
}: {
  delta: number | null;
  direction: ChangeDirection;
}) {
  if (direction === "unknown") {
    return <span className="text-xs text-black/40 dark:text-white/40">No prior data</span>;
  }
  if (direction === "flat") {
    return <span className="text-sm font-medium text-black/50 dark:text-white/50">— 0 pts</span>;
  }
  const isUp = direction === "up";
  const abs = Math.abs(delta ?? 0);
  return (
    <span
      className={`inline-flex items-center gap-1 text-sm font-semibold tabular-nums ${
        isUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
      }`}
    >
      <span aria-hidden>{isUp ? "▲" : "▼"}</span>
      {abs} {abs === 1 ? "pt" : "pts"}
    </span>
  );
}
