import { hexPoints, type HexPosition } from "@/lib/hexGeometry";
import type { ConstituencyHexStatus, HexTier } from "@/lib/hexTypes";

const TIER_COLOR: Record<HexTier, string> = {
  not_tracked: "#e5e7eb", // grey
  stale: "#ef4444", // red
  recent: "#f59e0b", // amber
  active: "#22c55e", // green
};

export type HexLegendItem = { tier: HexTier; label: string };

export default function HexMap({
  positions,
  hexSize,
  viewBox,
  statuses,
  legend,
}: {
  positions: HexPosition[];
  hexSize: number;
  viewBox: string;
  statuses: Map<string, ConstituencyHexStatus>;
  legend: HexLegendItem[];
}) {
  return (
    <div>
      <svg viewBox={viewBox} className="w-full" style={{ maxHeight: 640 }}>
        {positions.map((pos) => {
          const status = statuses.get(pos.name);
          const fill = TIER_COLOR[status?.tier ?? "not_tracked"];
          const points = hexPoints(pos.x, pos.y, hexSize * 0.94);
          const content = (
            <polygon points={points} fill={fill} stroke="#ffffff" strokeWidth={0.6} />
          );
          const titleText = `${pos.name} — ${status?.detail ?? "Not yet tracked"}`;

          return status ? (
            <a key={pos.code} href={`/constituency/${status.constituencyId}`}>
              <title>{titleText}</title>
              {content}
            </a>
          ) : (
            <g key={pos.code}>
              <title>{titleText}</title>
              {content}
            </g>
          );
        })}
      </svg>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-black/60 dark:text-white/60">
        {legend.map((item) => (
          <span key={item.tier} className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: TIER_COLOR[item.tier] }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
