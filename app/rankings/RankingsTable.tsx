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
  | "tiktokRecent7"
  | "tiktokRecent"
  | "tiktokReach"
  | "channelReel"
  | "channelPosted"
  | "newsletterSent"
  | "newsletterMonth"
  | "groupPosts"
  | "subscriberGrowth"
  | "change";
type SortDir = "asc" | "desc";

const DEFAULT_DIR: Record<SortKey, SortDir> = {
  rank: "asc",
  constituency: "asc",
  mp: "asc",
  region: "asc",
  score: "desc",
  adLive: "desc",
  tiktokRecent7: "desc",
  tiktokRecent: "desc",
  tiktokReach: "desc",
  channelReel: "desc",
  channelPosted: "desc",
  newsletterSent: "desc",
  newsletterMonth: "desc",
  groupPosts: "desc",
  subscriberGrowth: "desc",
  change: "desc",
};

function formatCount(n: number | null): string {
  if (n === null) return "—";
  return n.toLocaleString();
}

function YesNoCell({ hasData, value }: { hasData: boolean; value: boolean }) {
  if (!hasData) return <span className="text-black/40 dark:text-white/40">—</span>;
  return value ? (
    <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
      <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
      Yes
    </span>
  ) : (
    <span className="text-black/50 dark:text-white/50">No</span>
  );
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
      tiktokRecent7: r.tiktok.hasData ? (r.tiktok.postedInLast7Days ? 1 : 0) : -1,
      tiktokRecent: r.tiktok.hasData ? (r.tiktok.postedInLast30Days ? 1 : 0) : -1,
      tiktokReach: r.tiktok.hasData ? r.tiktok.reach : -1,
      channelReel: r.channel.hasData ? (r.channel.reelIn7Days ? 1 : 0) : -1,
      channelPosted: r.channel.hasData ? (r.channel.postedIn7Days ? 1 : 0) : -1,
      newsletterSent: r.newsletterActivity.hasData ? (r.newsletterActivity.sentInLast30Days ? 1 : 0) : -1,
      newsletterMonth: r.newsletterActivity.hasData ? (r.newsletterActivity.sentThisCalendarMonth ? 1 : 0) : -1,
      groupPosts: r.group.hasData ? r.group.postCount : -1,
      subscriberGrowth: r.subscriberGrowth.hasData ? (r.subscriberGrowth.grewByAtLeastTarget ? 1 : 0) : -1,
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
                ["Posted TikTok (last 7 days)", "tiktokRecent7"],
                ["Posted TikTok (last 30 days)", "tiktokRecent"],
                ["TikTok reach (last 30 days)", "tiktokReach"],
                ["Reel (last 7 days)", "channelReel"],
                ["Posted FB/IG (last 7 days)", "channelPosted"],
                ["Newsletter (last 30 days)", "newsletterSent"],
                ["Newsletter sent this month", "newsletterMonth"],
                ["Facebook group posts (manual)", "groupPosts"],
                ["Subscribers +20 this month", "subscriberGrowth"],
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
                <span className="inline-flex items-center gap-1.5">
                  {r.constituency.mp_or_candidate_name || "—"}
                  {r.tiktok.isBestPostWinner && (
                    <span
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-base ring-1 ring-amber-300 dark:bg-amber-900/50 dark:ring-amber-700"
                      title="Best performing TikTok of the week"
                      aria-label="Best performing TikTok of the week"
                    >
                      🏅
                    </span>
                  )}
                </span>
              </td>
              <td className="px-4 py-3 text-black/70 dark:text-white/70">{r.constituency.region}</td>
              <td className="px-4 py-3">
                <ScoreBar points={r.score} maxPoints={r.scoreMaxPoints} />
              </td>
              <td className="px-4 py-3">
                <YesNoCell hasData={true} value={r.adLive} />
              </td>
              <td className="px-4 py-3">
                <YesNoCell hasData={r.tiktok.hasData} value={r.tiktok.postedInLast7Days} />
              </td>
              <td className="px-4 py-3">
                <YesNoCell hasData={r.tiktok.hasData} value={r.tiktok.postedInLast30Days} />
              </td>
              <td className="px-4 py-3 tabular-nums text-black/70 dark:text-white/70">
                {r.tiktok.hasData ? formatCount(r.tiktok.reach) : "—"}
              </td>
              <td className="px-4 py-3">
                <YesNoCell hasData={r.channel.hasData} value={r.channel.reelIn7Days} />
              </td>
              <td className="px-4 py-3">
                <YesNoCell hasData={r.channel.hasData} value={r.channel.postedIn7Days} />
              </td>
              <td className="px-4 py-3">
                <YesNoCell hasData={r.newsletterActivity.hasData} value={r.newsletterActivity.sentInLast30Days} />
              </td>
              <td className="px-4 py-3">
                <YesNoCell
                  hasData={r.newsletterActivity.hasData}
                  value={r.newsletterActivity.sentThisCalendarMonth}
                />
              </td>
              <td className="px-4 py-3 tabular-nums text-black/70 dark:text-white/70">
                {r.group.hasData ? formatCount(r.group.postCount) : "—"}
              </td>
              <td className="px-4 py-3">
                <YesNoCell hasData={r.subscriberGrowth.hasData} value={r.subscriberGrowth.grewByAtLeastTarget} />
              </td>
              <td className="px-4 py-3">
                <ChangeIndicator delta={r.change.delta} direction={r.change.direction} />
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={15} className="px-4 py-8 text-center text-black/50 dark:text-white/50">
                No constituencies match these filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
