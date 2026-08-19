function tierColor(fraction: number): string {
  if (fraction >= 0.7) return "#10b981"; // emerald
  if (fraction >= 0.4) return "#f59e0b"; // amber
  return "#ef4444"; // red
}

export default function ScoreBar({
  points,
  maxPoints,
  size = "md",
}: {
  points: number | null;
  maxPoints: number;
  size?: "sm" | "md";
}) {
  const height = size === "sm" ? "h-1.5" : "h-2";
  if (points === null || maxPoints <= 0) {
    return (
      <div className="flex items-center gap-2">
        <div className={`w-24 ${height} rounded-full bg-black/10 dark:bg-white/10`} />
        <span className="text-xs text-black/40 dark:text-white/40">No data</span>
      </div>
    );
  }
  const fraction = Math.max(0, Math.min(1, points / maxPoints));
  return (
    <div className="flex items-center gap-2">
      <div className={`w-24 ${height} overflow-hidden rounded-full bg-black/10 dark:bg-white/10`}>
        <div
          className={`${height} rounded-full transition-all`}
          style={{ width: `${fraction * 100}%`, backgroundColor: tierColor(fraction) }}
        />
      </div>
      <span className="text-sm font-semibold tabular-nums">
        {points}
        <span className="font-normal text-black/40 dark:text-white/40"> / {maxPoints}</span>
      </span>
    </div>
  );
}
