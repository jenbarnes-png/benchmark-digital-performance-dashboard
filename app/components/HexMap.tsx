import { getHexLayout, hexPoints } from "@/lib/hexmap";
import type { ConstituencyAdStatus } from "@/lib/hexmapData";

const COLOR_NOT_TRACKED = "#e5e7eb"; // grey — not one of our tracked seats yet
const COLOR_NO_ADS = "#94a3b8"; // slate — tracked, nothing active right now
const COLOR_ACTIVE = "#4f46e5"; // indigo — currently running ads

function fillFor(status: ConstituencyAdStatus | undefined): { fill: string; opacity: number } {
  if (!status) return { fill: COLOR_NOT_TRACKED, opacity: 1 };
  if (status.status === "no_advertiser") return { fill: COLOR_NOT_TRACKED, opacity: 1 };
  if (status.status === "no_active_ads") return { fill: COLOR_NO_ADS, opacity: 1 };
  const intensity = 0.4 + 0.6 * Math.min(status.activeAdCount / 5, 1);
  return { fill: COLOR_ACTIVE, opacity: intensity };
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
          const { fill, opacity } = fillFor(status);
          const points = hexPoints(pos.x, pos.y, hexSize * 0.94);
          const content = (
            <polygon
              points={points}
              fill={fill}
              fillOpacity={opacity}
              stroke="#ffffff"
              strokeWidth={0.6}
            />
          );
          const suffix =
            status?.status === "active"
              ? ` — ${status.activeAdCount} active ad${status.activeAdCount === 1 ? "" : "s"}`
              : status?.status === "no_active_ads"
                ? " — tracked, no active ads"
                : status
                  ? ""
                  : " — not yet tracked";
          const titleText = `${pos.name}${suffix}`;

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
          Running ads now (darker = more ads)
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: COLOR_NO_ADS }} />
          Tracked, no active ads
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: COLOR_NOT_TRACKED }} />
          Not yet tracked
        </span>
      </div>
    </div>
  );
}
