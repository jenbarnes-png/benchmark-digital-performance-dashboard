"use client";

import { useMemo, useState } from "react";
import HexMap, { type HexLegendItem } from "./HexMap";
import type { ConstituencyHexStatus } from "@/lib/hexTypes";
import type { HexPosition } from "@/lib/hexGeometry";

type Mode = "overall" | "ads" | "tiktok" | "facebook" | "instagram" | "groups" | "email";

const MODE_LABEL: Record<Mode, string> = {
  overall: "Overall score",
  ads: "Ads",
  tiktok: "TikTok",
  facebook: "Facebook",
  instagram: "Instagram",
  groups: "Groups",
  email: "Email",
};

const LEGEND: Record<Mode, HexLegendItem[]> = {
  overall: [
    { tier: "active", label: "Scoring well (70%+ of points)" },
    { tier: "recent", label: "Some points (40–70%)" },
    { tier: "stale", label: "Few or no points" },
    { tier: "not_tracked", label: "No data yet" },
  ],
  ads: [
    { tier: "active", label: "Running an ad right now" },
    { tier: "stale", label: "No ad running right now" },
    { tier: "not_tracked", label: "Not yet tracked" },
  ],
  tiktok: [
    { tier: "active", label: "Posted in the last 7 days" },
    { tier: "recent", label: "Posted in the last 30 days" },
    { tier: "stale", label: "No recent activity" },
    { tier: "not_tracked", label: "Not yet tracked" },
  ],
  facebook: [
    { tier: "active", label: "Posted in the last 7 days" },
    { tier: "recent", label: "Posted in the last 30 days" },
    { tier: "stale", label: "Tracked, nothing recent" },
    { tier: "not_tracked", label: "Not yet tracked" },
  ],
  instagram: [
    { tier: "active", label: "Posted in the last 7 days" },
    { tier: "recent", label: "Posted in the last 30 days" },
    { tier: "stale", label: "Tracked, nothing recent" },
    { tier: "not_tracked", label: "Not yet tracked" },
  ],
  groups: [
    { tier: "active", label: "Posted this week" },
    { tier: "stale", label: "Reported, but 0 this week" },
    { tier: "not_tracked", label: "Not yet reported" },
  ],
  email: [
    { tier: "active", label: "Sent since the 1st of this month" },
    { tier: "stale", label: "None sent this month" },
    { tier: "not_tracked", label: "Not yet tracked" },
  ],
};

export default function HexMapToggle({
  positions,
  hexSize,
  viewBox,
  overall,
  ads,
  tiktok,
  facebook,
  instagram,
  groups,
  email,
}: {
  positions: HexPosition[];
  hexSize: number;
  viewBox: string;
  overall: [string, ConstituencyHexStatus][];
  ads: [string, ConstituencyHexStatus][];
  tiktok: [string, ConstituencyHexStatus][];
  facebook: [string, ConstituencyHexStatus][];
  instagram: [string, ConstituencyHexStatus][];
  groups: [string, ConstituencyHexStatus][];
  email: [string, ConstituencyHexStatus][];
}) {
  const [mode, setMode] = useState<Mode>("overall");

  const mapsByMode = useMemo(
    () => ({
      overall: new Map(overall),
      ads: new Map(ads),
      tiktok: new Map(tiktok),
      facebook: new Map(facebook),
      instagram: new Map(instagram),
      groups: new Map(groups),
      email: new Map(email),
    }),
    [overall, ads, tiktok, facebook, instagram, groups, email]
  );

  return (
    <div>
      <div className="mb-4 inline-flex flex-wrap gap-1 rounded-lg border border-black/10 p-1 dark:border-white/15">
        {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === m
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
            }`}
          >
            {MODE_LABEL[m]}
          </button>
        ))}
      </div>
      <HexMap
        positions={positions}
        hexSize={hexSize}
        viewBox={viewBox}
        statuses={mapsByMode[mode]}
        legend={LEGEND[mode]}
      />
    </div>
  );
}
