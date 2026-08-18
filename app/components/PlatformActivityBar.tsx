import { platformColor } from "./platformColors";

export type PlatformSegment = { platform: string; postCount: number; hasData: boolean };

export default function PlatformActivityBar({
  byPlatform,
  maxTotal,
}: {
  byPlatform: PlatformSegment[];
  maxTotal: number;
}) {
  const total = byPlatform.reduce((sum, p) => (p.hasData ? sum + p.postCount : sum), 0);
  const anyData = byPlatform.some((p) => p.hasData);

  if (!anyData) {
    return <span className="text-xs text-black/40 dark:text-white/40">No data</span>;
  }

  const scale = maxTotal > 0 ? Math.max(total / maxTotal, total > 0 ? 0.04 : 0) : 0;

  return (
    <div className="flex items-center gap-2">
      <div className="h-2.5 w-28 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
        <div className="flex h-full" style={{ width: `${scale * 100}%` }}>
          {byPlatform
            .filter((p) => p.hasData && p.postCount > 0)
            .map((p) => (
              <div
                key={p.platform}
                title={`${p.platform}: ${p.postCount} posts`}
                style={{
                  backgroundColor: platformColor(p.platform),
                  width: `${(p.postCount / (total || 1)) * 100}%`,
                }}
              />
            ))}
        </div>
      </div>
      <span className="text-xs tabular-nums text-black/60 dark:text-white/60">{total}</span>
    </div>
  );
}
