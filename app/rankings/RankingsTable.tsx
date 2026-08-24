"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ScoreBar from "@/app/components/ScoreBar";
import ChangeIndicator from "@/app/components/ChangeIndicator";
import type { RankingRow } from "@/lib/rankings";

type SortKey =
  | "rank"
  | "constituency"
  | "mp"
  | "region"
  | "score"
  | "adLive"
  | "tiktokRecent"
  | "tiktokReach"
  | "channelReel"
  | "channelPosted"
  | "change";
type SortDir = "asc" | "desc";

const DEFAULT_DIR: Record<SortKey, SortDir> = {
  rank: "asc",
  constituency: "asc",
  mp: "asc",
  region: "asc",
  score: "desc",
  adLive: "desc",
  tiktokRecent: "desc",
  tiktokReach: "desc",
  channelReel: "desc",
  channelPosted: "desc",
  change: "desc",
};

function formatCount(n: number | null): string {
  if (n === null) return "—";
  return n.toLocaleString();
}

function Header({
  label,
  sortKeyName,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  sortKeyName: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const active = sortKey === sortKeyName;
  return (
    <th className="px-4 py-3 font-medium">
      <button
        onClick={() => onSort(sortKeyName)}
        className="inline-flex items-center gap-1 hover:text-black dark:hover:text-white"
      >
        {label}
        <span className={`text-xs ${active ? "opacity-100" : "opacity-0"}`}>
          {sortDir === "asc" ? "▲" : "▼"}
        </span>
      </button>
    </th>
  );
}

export default function RankingsTable({ rows }: { rows: RankingRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(DEFAULT_DIR[key]);
    }
  }

  const sorted = useMemo(() => {
    const withKeys = rows.map((r) => ({
      row: r,
      rank: r.rank,
      constituency: r.constituency.name,
      mp: r.constituency.mp_or_candidate_name ?? "",
      region: r.constituency.region,
      score: r.score ?? -1,
      adLive: r.adLive ? 1 : 0,
      tiktokRecent: r.tiktok.hasData ? (r.tiktok.postedInLast30Days ? 1 : 0) : -1,
      tiktokReach: r.tiktok.hasData ? r.tiktok.reach : -1,
      channelReel: r.channel.hasData ? (r.channel.reelIn7Days ? 1 : 0) : -1,
      channelPosted: r.channel.hasData ? (r.channel.postedIn7Days ? 1 : 0) : -1,
      change: r.change.delta ?? Number.NEGATIVE_INFINITY,
    }));
    withKeys.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return withKeys.map((k) => k.row);
  }, [rows, sortKey, sortDir]);

  return (
    <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-black/10 bg-black/[.02] dark:border-white/15 dark:bg-white/[.04]">
          <tr>
            {(
              [
                ["Rank", "rank"],
                ["Constituency", "constituency"],
                ["MP / Candidate", "mp"],
                ["Region", "region"],
                ["Overall score", "score"],
                ["Ads live", "adLive"],
                ["Posted TikTok (last 30 days)", "tiktokRecent"],
                ["TikTok reach (last 30 days)", "tiktokReach"],
                ["Reel (last 7 days)", "channelReel"],
                ["Posted FB/IG (last 7 days)", "channelPosted"],
                ["Change", "change"],
              ] as [string, SortKey][]
            ).map(([label, key]) => (
              <Header
                key={key}
                label={label}
                sortKeyName={key}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
              />
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
                <span
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    r.rank === 1
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                      : r.rank === 2
                        ? "bg-slate-200 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200"
                        : r.rank === 3
                          ? "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300"
                          : "bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60"
                  }`}
                >
                  {r.rank}
                </span>
              </td>
              <td className="px-4 py-3 font-medium">
                <Link href={`/constituency/${r.constituency.id}`} className="hover:underline">
                  {r.constituency.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-black/70 dark:text-white/70">
                {r.constituency.mp_or_candidate_name || "—"}
              </td>
              <td className="px-4 py-3 text-black/70 dark:text-white/70">{r.constituency.region}</td>
              <td className="px-4 py-3">
                <ScoreBar points={r.score} maxPoints={r.scoreMaxPoints} />
              </td>
              <td className="px-4 py-3">
                {r.adLive ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                    Yes
                  </span>
                ) : (
                  <span className="text-black/50 dark:text-white/50">No</span>
                )}
              </td>
              <td className="px-4 py-3">
                {!r.tiktok.hasData ? (
                  <span className="text-black/40 dark:text-white/40">—</span>
                ) : r.tiktok.postedInLast30Days ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                    Yes
                  </span>
                ) : (
                  <span className="text-black/50 dark:text-white/50">No</span>
                )}
              </td>
              <td className="px-4 py-3 tabular-nums text-black/70 dark:text-white/70">
                {r.tiktok.hasData ? formatCount(r.tiktok.reach) : "—"}
              </td>
              <td className="px-4 py-3">
                {!r.channel.hasData ? (
                  <span className="text-black/40 dark:text-white/40">—</span>
                ) : r.channel.reelIn7Days ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                    Yes
                  </span>
                ) : (
                  <span className="text-black/50 dark:text-white/50">No</span>
                )}
              </td>
              <td className="px-4 py-3">
                {!r.channel.hasData ? (
                  <span className="text-black/40 dark:text-white/40">—</span>
                ) : r.channel.postedIn7Days ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                    Yes
                  </span>
                ) : (
                  <span className="text-black/50 dark:text-white/50">No</span>
                )}
              </td>
              <td className="px-4 py-3">
                <ChangeIndicator delta={r.change.delta} direction={r.change.direction} />
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={11} className="px-4 py-8 text-center text-black/50 dark:text-white/50">
                No constituencies match these filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
