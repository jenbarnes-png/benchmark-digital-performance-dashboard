import { getHexLayout, hexPoints } from "@/lib/hexmap";
import type { ConstituencyAdStatus } from "@/lib/hexmapData";

const COLOR_NOT_TRACKED = "#e5e7eb"; // grey — not one of our tracked seats yet
const COLOR_STALE = "#ef4444"; // red — tracked, no activity within 2 months (or ever)
const COLOR_RECENT = "#f59e0b"; // amber — not active now, but ran within the last 2 months
const COLOR_ACTIVE = "#22c55e"; // green — running right now

function fillFor(status: ConstituencyAdStatus | undefined): string {
  if (!status || status.status === "no_advertiser") return COLOR_NOT_TRACKED;
  if (status.status === "active") return COLOR_ACTIVE;
  if (status.status === "recent") return COLOR_RECENT;
  return COLOR_STALE;
}

function statusSuffix(status: ConstituencyAdStatus | undefined): string {
  if (!status) return " — not yet tracked";
  switch (status.status) {
    case "no_advertiser":
      return " — not yet tracked";
    case "active":
      return ` — ${status.activeAdCount} active ad${status.activeAdCount === 1 ? "" : "s"}`;
    case "recent":
      return " — no ads running now, active within the last 2 months";
    case "stale":
      return " — no ad activity in the last 2 months";
  }
}

export default function HexMap({
  statuses,
}: {
  statuses: Map<string, ConstituencyAdStatus>;
}) {
  const { positions, hexSize, viewBox } = getHexLayout();

  return (
    <div>
      <svg viewBox={viewBox} className="w-full" style={{ maxHeight: 640 }}>
        {positions.map((pos) => {
          const status = statuses.get(pos.name);
          const fill = fillFor(status);
          const points = hexPoints(pos.x, pos.y, hexSize * 0.94);
          const content = (
            <polygon points={points} fill={fill} stroke="#ffffff" strokeWidth={0.6} />
          );
          const titleText = `${pos.name}${statusSuffix(status)}`;

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
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: COLOR_ACTIVE }} />
          Running ads now
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: COLOR_RECENT }} />
          Active in the last 2 months
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: COLOR_STALE }} />
          No activity in 2+ months
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: COLOR_NOT_TRACKED }} />
          Not yet tracked
        </span>
      </div>
    </div>
  );
}
