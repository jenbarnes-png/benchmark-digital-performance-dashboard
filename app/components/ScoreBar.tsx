function tierColor(score: number): string {
  if (score >= 70) return "#10b981"; // emerald
  if (score >= 40) return "#f59e0b"; // amber
  return "#ef4444"; // red
}

export default function ScoreBar({
  score,
  size = "md",
}: {
  score: number | null;
  size?: "sm" | "md";
}) {
  const height = size === "sm" ? "h-1.5" : "h-2";
  if (score === null) {
    return (
      <div className="flex items-center gap-2">
        <div className={`w-24 ${height} rounded-full bg-black/10 dark:bg-white/10`} />
        <span className="text-xs text-black/40 dark:text-white/40">No data</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <div className={`w-24 ${height} overflow-hidden rounded-full bg-black/10 dark:bg-white/10`}>
        <div
          className={`${height} rounded-full transition-all`}
          style={{ width: `${score}%`, backgroundColor: tierColor(score) }}
        />
      </div>
      <span className="text-sm font-semibold tabular-nums">{score}</span>
    </div>
  );
}
