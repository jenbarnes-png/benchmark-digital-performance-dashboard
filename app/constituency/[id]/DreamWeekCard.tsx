import type { DreamWeekItem, DreamWeekTier } from "@/lib/dreamWeek";

const TIER_STYLE: Record<DreamWeekTier, { border: string; dot: string }> = {
  green: { border: "border-emerald-200 dark:border-emerald-900", dot: "bg-emerald-500" },
  amber: { border: "border-amber-200 dark:border-amber-900", dot: "bg-amber-500" },
  red: { border: "border-red-200 dark:border-red-900", dot: "bg-red-500" },
  unknown: { border: "border-black/10 dark:border-white/15", dot: "bg-black/20 dark:bg-white/20" },
};

export default function DreamWeekCard({ item }: { item: DreamWeekItem }) {
  const style = TIER_STYLE[item.tier];
  return (
    <div className={`rounded-lg border p-4 ${style.border}`}>
      <div className="flex items-start gap-2">
        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} aria-hidden />
        <div>
          <p className="text-sm font-medium">{item.title}</p>
          <p className="text-xs text-black/50 dark:text-white/50">{item.target}</p>
        </div>
      </div>
      {item.tier === "unknown" ? (
        <p className="mt-2 text-sm text-black/40 dark:text-white/40">{item.detail}</p>
      ) : (
        <p className="mt-2 text-sm text-black/70 dark:text-white/70">
          {item.detail} <span className="text-black/40 dark:text-white/40">— {item.points} / 2 points</span>
        </p>
      )}
    </div>
  );
}
