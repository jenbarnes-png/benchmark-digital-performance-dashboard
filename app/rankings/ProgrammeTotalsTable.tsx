"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ScoreBar from "@/app/components/ScoreBar";
import type { ProgrammeTotalRow } from "@/lib/rankings";

type SortKey =
  | "rank"
  | "constituency"
  | "mp"
  | "region"
  | "points"
  | "average"
  | "tiktokVideos"
  | "tiktokViews"
  | "weeksPostedFbIg"
  | "weeksWithReel"
  | "groupPosts"
  | "amplifierPoints"
  | "listSize";
type SortDir = "asc" | "desc";

const TEXT_KEYS: SortKey[] = ["constituency", "mp", "region"];

const COLUMNS: [string, SortKey][] = [
  ["Rank", "rank"],
  ["Constituency", "constituency"],
  ["MP / Candidate", "mp"],
  ["Region", "region"],
  ["Total points (all weeks)", "points"],
  ["Average per week", "average"],
  ["TikTok videos", "tiktokVideos"],
  ["TikTok views", "tiktokViews"],
  ["Weeks posted FB/IG", "weeksPostedFbIg"],
  ["Weeks with a Reel", "weeksWithReel"],
  ["Facebook group posts (manual)", "groupPosts"],
  ["Amplifier group points", "amplifierPoints"],
  ["Email list size (latest)", "listSize"],
];

function sortValue(r: ProgrammeTotalRow, key: SortKey): string | number {
  switch (key) {
    case "rank":
      return r.rank;
    case "constituency":
      return r.constituency.name;
    case "mp":
      return r.constituency.mp_or_candidate_name ?? "";
    case "region":
      return r.constituency.region;
    case "points":
      return r.totalPoints ?? -1;
    case "average":
      return r.averagePerWeek ?? -1;
    case "tiktokVideos":
      return r.tiktokVideos;
    case "tiktokViews":
      return r.tiktokViews;
    case "weeksPostedFbIg":
      return r.weeksPostedFbIg;
    case "weeksWithReel":
      return r.weeksWithReel;
    case "groupPosts":
      return r.groupPosts;
    case "amplifierPoints":
      return r.amplifierPoints;
    case "listSize":
      return r.listSize ?? -1;
  }
}

export default function ProgrammeTotalsTable({ rows, weekCount }: { rows: ProgrammeTotalRow[]; weekCount: number }) {
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "rank" || TEXT_KEYS.includes(key) ? "asc" : "desc");
    }
  }

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : av - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir]);

  // Whole-programme headline numbers across the MPs shown.
  const totals = useMemo(
    () => ({
      views: rows.reduce((s, r) => s + r.tiktokViews, 0),
      videos: rows.reduce((s, r) => s + r.tiktokVideos, 0),
      tiktokMps: rows.filter((r) => r.tiktokVideos > 0).length,
      groupPosts: rows.reduce((s, r) => s + r.groupPosts, 0),
      points: rows.reduce((s, r) => s + (r.totalPoints ?? 0), 0),
    }),
    [rows]
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Weeks tracked", weekCount.toLocaleString()],
          ["TikTok views", totals.views.toLocaleString()],
          ["TikTok videos", `${totals.videos.toLocaleString()} by ${totals.tiktokMps} MPs`],
          ["Facebook group posts", totals.groupPosts.toLocaleString()],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-black/10 px-4 py-3 dark:border-white/15">
            <div className="text-xs text-black/50 dark:text-white/50">{label}</div>
            <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 bg-black/[.02] dark:border-white/15 dark:bg-white/[.04]">
            <tr>
              {COLUMNS.map(([label, key]) => (
                <th key={key} className="px-4 py-3 font-medium">
                  <button onClick={() => toggleSort(key)} className="inline-flex items-center gap-1 hover:text-black dark:hover:text-white">
                    {label}
                    <span className={`text-xs ${sortKey === key ? "opacity-100" : "opacity-0"}`}>{sortDir === "asc" ? "▲" : "▼"}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr
                key={r.constituency.id}
                className="border-b border-black/5 last:border-0 hover:bg-black/[.015] dark:border-white/10 dark:hover:bg-white/[.03]"
              >
                <td className="px-4 py-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/5 text-xs font-bold text-black/60 dark:bg-white/10 dark:text-white/60">
                    {r.rank}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium">
                  <Link href={`/constituency/${r.constituency.id}`} className="hover:underline">
                    {r.constituency.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-black/70 dark:text-white/70">{r.constituency.mp_or_candidate_name || "—"}</td>
                <td className="px-4 py-3 text-black/70 dark:text-white/70">{r.constituency.region}</td>
                <td className="px-4 py-3">
                  <ScoreBar points={r.totalPoints} maxPoints={r.maxPoints} />
                  {r.totalPoints !== null && (
                    <span className="mt-0.5 block text-xs text-black/50 dark:text-white/50">
                      of {r.maxPoints} over {r.weeksScored} week{r.weeksScored === 1 ? "" : "s"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 tabular-nums text-black/70 dark:text-white/70">{r.averagePerWeek ?? "—"}</td>
                <td className="px-4 py-3 tabular-nums text-black/70 dark:text-white/70">{r.tiktokVideos.toLocaleString()}</td>
                <td className="px-4 py-3 tabular-nums text-black/70 dark:text-white/70">{r.tiktokViews.toLocaleString()}</td>
                <td className="px-4 py-3 tabular-nums text-black/70 dark:text-white/70">{r.weeksPostedFbIg}</td>
                <td className="px-4 py-3 tabular-nums text-black/70 dark:text-white/70">{r.weeksWithReel}</td>
                <td className="px-4 py-3 tabular-nums text-black/70 dark:text-white/70">{r.groupPosts.toLocaleString()}</td>
                <td className="px-4 py-3 tabular-nums text-black/70 dark:text-white/70">{r.amplifierPoints}</td>
                <td className="px-4 py-3 tabular-nums text-black/70 dark:text-white/70">{r.listSize === null ? "—" : r.listSize.toLocaleString()}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="px-4 py-8 text-center text-black/50 dark:text-white/50">
                  No constituencies match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
