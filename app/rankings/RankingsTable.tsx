"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ScoreBar from "@/app/components/ScoreBar";
import ChangeIndicator from "@/app/components/ChangeIndicator";
import PlatformActivityBar from "@/app/components/PlatformActivityBar";
import type { RankingRow } from "@/lib/rankings";

type SortKey = "rank" | "constituency" | "mp" | "region" | "score" | "platform" | "change";
type SortDir = "asc" | "desc";

const DEFAULT_DIR: Record<SortKey, SortDir> = {
  rank: "asc",
  constituency: "asc",
  mp: "asc",
  region: "asc",
  score: "desc",
  platform: "desc",
  change: "desc",
};

function platformTotal(row: RankingRow): number {
  return row.organicByPlatform.reduce((sum, p) => (p.hasData ? sum + p.postCount : sum), 0);
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

  const maxPlatformTotal = useMemo(
    () => Math.max(1, ...rows.map((r) => platformTotal(r))),
    [rows]
  );

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
      platform: platformTotal(r),
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
                ["Platform activity", "platform"],
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
                <ScoreBar score={r.score} />
              </td>
              <td className="px-4 py-3">
                <PlatformActivityBar byPlatform={r.organicByPlatform} maxTotal={maxPlatformTotal} />
              </td>
              <td className="px-4 py-3">
                <ChangeIndicator delta={r.change.delta} direction={r.change.direction} />
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-black/50 dark:text-white/50">
                No constituencies match these filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
